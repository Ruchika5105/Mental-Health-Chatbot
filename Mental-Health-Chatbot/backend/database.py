import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./maia.db")

# Fix common Supabase URL issues
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Choose engine based on database type
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # checks connection is alive before using it
        pool_size=5,             # number of connections to keep open
        max_overflow=10          # extra connections allowed under load
    )

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String)
    email          = Column(String, unique=True, index=True)
    password_hash  = Column(String)
    guardian_phone = Column(String, default="")
    guardian_email = Column(String, default="")
    consent_given  = Column(Boolean, default=False)
    created_at     = Column(DateTime, default=datetime.utcnow)

class MoodLog(Base):
    __tablename__ = "mood_logs"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer)
    mood_score     = Column(Integer)
    emotion_label  = Column(String)
    crisis_score   = Column(Float)
    mode_activated = Column(String)
    timestamp      = Column(DateTime, default=datetime.utcnow)

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer)
    content   = Column(Text)
    prompt    = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AlertLog(Base):
    __tablename__ = "alert_logs"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer)
    sms_sent   = Column(Boolean)
    email_sent = Column(Boolean)
    timestamp  = Column(DateTime, default=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, index=True)
    role       = Column(String)      # "user" or "assistant"
    content    = Column(Text)
    mode       = Column(String, default="general")
    timestamp  = Column(DateTime, default=datetime.utcnow)

# Creates all tables automatically on first run
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()