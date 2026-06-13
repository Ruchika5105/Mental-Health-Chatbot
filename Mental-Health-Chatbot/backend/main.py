# backend/main.py

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from collections import defaultdict
import os
from dotenv import load_dotenv

from database import get_db, User, MoodLog, JournalEntry, AlertLog, ChatMessage
from classifier import analyze
from llm import call_llm, confirm_crisis
from prompts import build_prompt
from notifier import notify
from auth import hash_password, verify_password, create_token, decode_token

load_dotenv()

app = FastAPI(title="Maia Mental Health API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── Request models ────────────────────────────────────────────────────────────

class OnboardingData(BaseModel):
    name:           str
    guardian_phone: Optional[str] = ""
    guardian_email: Optional[str] = ""
    consent_given:  bool = False

class ChatRequest(BaseModel):
    user_id:                 int
    message:                 str
    history:                 list = []
    mood_score:              Optional[int] = None
    alert_sent_this_session: bool = False

class MoodRequest(BaseModel):
    user_id:    int
    mood_score: int

class JournalRequest(BaseModel):
    user_id: int
    content: str
    prompt:  Optional[str] = ""

class RegisterRequest(BaseModel):
    name:           str
    email:          str
    password:       str
    guardian_phone: Optional[str] = ""
    guardian_email: Optional[str] = ""
    consent_given:  bool = False

class LoginRequest(BaseModel):
    email:    str
    password: str

class SaveMessageRequest(BaseModel):
    user_id: int
    role:    str
    content: str
    mode:    Optional[str] = "general"

class UpdateUserRequest(BaseModel):
    guardian_phone: Optional[str] = ""
    guardian_email: Optional[str] = ""
    consent_given:  Optional[bool] = True


# ── Helpers ───────────────────────────────────────────────────────────────────

PST_TRIGGERS = [
    "don't know what to do", "what should i do", "help me decide",
    "stuck on", "can't figure out", "problem with", "issue with",
    "don't know how to", "struggling with", "advice on"
]

def select_mode(analysis: dict, message: str = "") -> str:
    if analysis["crisis_score"] >= 0.9:
        return "crisis"
    if analysis["distortion"]:
        return "cbt"
    msg_lower = message.lower()
    if any(t in msg_lower for t in PST_TRIGGERS):
        return "pst"
    if analysis["emotion"] in ["anxiety", "exhaustion"]:
        return "stress_relief"
    if analysis["emotion"] in ["sadness", "anger"]:
        return "vent"
    return "general"

# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name          = req.name,
        email         = req.email,
        password_hash = hash_password(req.password),
        guardian_phone = req.guardian_phone,
        guardian_email = req.guardian_email,
        consent_given  = req.consent_given
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.email)
    return {
        "token":   token,
        "user_id": user.id,
        "name":    user.name,
        "email":   user.email
    }


@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user.id, user.email)
    return {
        "token":          token,
        "user_id":        user.id,
        "name":           user.name,
        "email":          user.email,
        "guardian_phone": user.guardian_phone,
        "guardian_email": user.guardian_email,
        "consent_given":  user.consent_given
    }


@app.get("/me")
def get_me(token: str, db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id":        user.id,
        "name":           user.name,
        "email":          user.email,
        "guardian_phone": user.guardian_phone,
        "guardian_email": user.guardian_email,
        "consent_given":  user.consent_given
    }

# ── Onboarding ────────────────────────────────────────────────────────────────

@app.post("/onboard")
def onboard(data: OnboardingData, db: Session = Depends(get_db)):
    user = User(
        name           = data.name,
        guardian_phone = data.guardian_phone,
        guardian_email = data.guardian_email,
        consent_given  = data.consent_given
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id, "name": user.name}

# ── Chat ──────────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Classify message
    analysis = analyze(req.message)
    mode     = select_mode(analysis, req.message)

    # 2. SOS check — two layer
    sos_triggered = False
    if (
        analysis["crisis_score"] >= 0.9
        and user.consent_given
        and not req.alert_sent_this_session
    ):
        llm_score = confirm_crisis(req.message)
        if llm_score >= 0.75:
            result = notify(user.name, user.guardian_phone, user.guardian_email)
            sos_triggered = result["success"]
            db.add(AlertLog(
                user_id    = req.user_id,
                sms_sent   = result["sms_sent"],
                email_sent = result["email_sent"]
            ))

    # 3. Build dynamic prompt and call LLM
    system_prompt = build_prompt(mode, analysis["emotion"], analysis["crisis_score"])
    messages      = req.history + [{"role": "user", "content": req.message}]
    reply         = call_llm(system_prompt, messages)

    # 4. Save mood log
    db.add(MoodLog(
        user_id       = req.user_id,
        mood_score    = req.mood_score or 3,
        emotion_label = analysis["emotion"],
        crisis_score  = analysis["crisis_score"],
        mode_activated = mode
    ))

    # 5. Save both chat messages to database
    db.add(ChatMessage(
        user_id = req.user_id,
        role    = "user",
        content = req.message,
        mode    = mode
    ))
    db.add(ChatMessage(
        user_id = req.user_id,
        role    = "assistant",
        content = reply,
        mode    = mode
    ))

    db.commit()

    return {
        "reply":         reply,
        "mode":          mode,
        "analysis":      analysis,
        "sos_triggered": sos_triggered
    }

# ── Mood ──────────────────────────────────────────────────────────────────────

@app.post("/mood")
def log_mood(req: MoodRequest, db: Session = Depends(get_db)):
    db.add(MoodLog(
        user_id        = req.user_id,
        mood_score     = req.mood_score,
        emotion_label  = "check-in",
        crisis_score   = 0.0,
        mode_activated = "checkin"
    ))
    db.commit()
    return {"status": "logged"}


@app.get("/mood/{user_id}")
def get_moods(user_id: int, db: Session = Depends(get_db)):
    logs = db.query(MoodLog)\
             .filter(MoodLog.user_id == user_id)\
             .order_by(MoodLog.timestamp.desc())\
             .limit(30).all()
    return [
        {
            "mood_score": l.mood_score,
            "emotion":    l.emotion_label,
            "mode":       l.mode_activated,
            "timestamp":  l.timestamp
        }
        for l in logs
    ]

# ── Journal ───────────────────────────────────────────────────────────────────

@app.post("/journal")
def save_journal(req: JournalRequest, db: Session = Depends(get_db)):
    db.add(JournalEntry(
        user_id = req.user_id,
        content = req.content,
        prompt  = req.prompt
    ))
    db.commit()
    return {"status": "saved"}


@app.get("/journal/{user_id}")
def get_journal(user_id: int, db: Session = Depends(get_db)):
    entries = db.query(JournalEntry)\
                .filter(JournalEntry.user_id == user_id)\
                .order_by(JournalEntry.timestamp.desc())\
                .limit(20).all()
    return [
        {
            "content":   e.content,
            "prompt":    e.prompt,
            "timestamp": e.timestamp
        }
        for e in entries
    ]

# ── Chat messages / sessions ──────────────────────────────────────────────────

@app.post("/messages")
def save_message(req: SaveMessageRequest, db: Session = Depends(get_db)):
    db.add(ChatMessage(
        user_id = req.user_id,
        role    = req.role,
        content = req.content,
        mode    = req.mode
    ))
    db.commit()
    return {"status": "saved"}


@app.get("/messages/{user_id}")
def get_messages(user_id: int, limit: int = 100, db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage)\
             .filter(ChatMessage.user_id == user_id)\
             .order_by(ChatMessage.timestamp.asc())\
             .limit(limit).all()
    return [
        {
            "id":        m.id,
            "role":      m.role,
            "content":   m.content,
            "mode":      m.mode,
            "timestamp": m.timestamp
        }
        for m in msgs
    ]


@app.get("/sessions/{user_id}")
def get_sessions(user_id: int, db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage)\
             .filter(
                 ChatMessage.user_id == user_id,
                 ChatMessage.role    == "user"
             )\
             .order_by(ChatMessage.timestamp.desc())\
             .all()

    sessions = defaultdict(list)
    for m in msgs:
        date_key = m.timestamp.strftime("%d %b %Y")
        if len(sessions[date_key]) < 3:
            sessions[date_key].append({
                "id":      m.id,
                "preview": m.content[:60] + "..." if len(m.content) > 60 else m.content,
                "mode":    m.mode,
                "time":    m.timestamp.strftime("%I:%M %p")
            })

    return [
        {"date": date, "messages": msgs}
        for date, msgs in sessions.items()
    ]


@app.delete("/messages/{user_id}")
def clear_chat(user_id: int, db: Session = Depends(get_db)):
    db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
    db.commit()
    return {"status": "cleared"}

# ── User delete ───────────────────────────────────────────────────────────────

@app.delete("/user/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
    db.query(MoodLog).filter(MoodLog.user_id == user_id).delete()
    db.query(JournalEntry).filter(JournalEntry.user_id == user_id).delete()
    db.query(AlertLog).filter(AlertLog.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"status": "deleted"}

@app.put("/user/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.guardian_phone = req.guardian_phone
    user.guardian_email = req.guardian_email
    user.consent_given  = req.consent_given
    db.commit()
    db.refresh(user)

    print(f"DEBUG: Updated user {user_id} — phone={user.guardian_phone}, email={user.guardian_email}")

    return {
        "status":         "updated",
        "guardian_phone": user.guardian_phone,
        "guardian_email": user.guardian_email,
        "consent_given":  user.consent_given
    }

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "llama-3.3-70b-versatile"}