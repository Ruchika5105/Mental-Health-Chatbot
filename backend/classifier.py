from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from huggingface_hub import login
import os

# ── Login (use environment variable securely) ─────────────────────────────
hf_token = os.getenv("HF_TOKEN")
if hf_token:
    login(hf_token)

# ── Load MentalBERT ───────────────────────────────────────────────────────
MODEL_NAME = "mental/mental-bert-base-uncased"

print("Loading MentalBERT... (first run downloads ~500MB, please wait)")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()

LABELS = model.config.id2label

print(f"MentalBERT loaded. Labels: {list(LABELS.values())}")

# ── Crisis keywords ───────────────────────────────────────────────────────
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die",
    "self harm", "cut myself", "no reason to live",
    "better off dead", "can't go on", "end it all",
    "don't want to live", "hurt myself"
]

# ── Distortion patterns ───────────────────────────────────────────────────
DISTORTION_PATTERNS = {
    "catastrophizing": [
        "everything is ruined", "worst ever", "disaster",
        "never get better", "hopeless", "all is lost"
    ],
    "all_or_nothing": [
        "always fail", "never succeed", "everyone hates",
        "nothing works", "complete failure", "i never"
    ],
    "mind_reading": [
        "they hate me", "they think i", "everyone knows",
        "judging me", "they must think"
    ],
    "overgeneralization": [
        "always happens", "never works out",
        "every time", "nothing ever goes right"
    ]
}

# ── Label → Emotion mapping ───────────────────────────────────────────────
LABEL_TO_EMOTION = {
    "depression": "sadness",
    "anxiety": "anxiety",
    "anger": "anger",
    "stress": "exhaustion",
    "normal": "neutral",
    "suicide": "sadness",
    "self-harm": "sadness",
    "LABEL_0": "neutral",
    "LABEL_1": "sadness",
}

# ── Helper functions ──────────────────────────────────────────────────────
def _keyword_crisis(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in CRISIS_KEYWORDS)

def _detect_distortion(text: str):
    lower = text.lower()
    for dtype, keywords in DISTORTION_PATTERNS.items():
        if any(kw in lower for kw in keywords):
            return dtype
    return None

# ── Main analysis function ────────────────────────────────────────────────
def analyze(text: str) -> dict:
    # Step 1: Model inference
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True
    )

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)[0]

    scores = {LABELS[i]: float(probs[i]) for i in range(len(probs))}
    top_label = max(scores, key=scores.get)
    top_score = scores[top_label]

    # Step 2: Crisis score
    crisis_labels = [
        l for l in scores
        if any(w in l.lower() for w in ["suicide", "self", "crisis", "harm"])
    ]

    mentalbert_crisis = max((scores[l] for l in crisis_labels), default=0.0)

    keyword_hit = _keyword_crisis(text)
    crisis_score = max(mentalbert_crisis, 0.9 if keyword_hit else 0.0)

    # Step 3: Emotion
    emotion = LABEL_TO_EMOTION.get(top_label, "neutral")
    if crisis_score >= 0.7:
        emotion = "sadness"

    # Step 4: Distortion
    distortion = _detect_distortion(text)

    return {
        "emotion": emotion,
        "crisis_score": round(crisis_score, 3),
        "distortion": distortion,
        "raw_label": top_label,
        "raw_score": round(top_score, 3)
    }