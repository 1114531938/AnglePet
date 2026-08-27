import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    avatar_url: Mapped[str] = mapped_column(Text, default="")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Character(Base):
    __tablename__ = "characters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    avatar_url: Mapped[str] = mapped_column(Text, default="")
    identity: Mapped[str] = mapped_column(String(100), default="AI 陪伴者")
    relationship: Mapped[str] = mapped_column(String(100), default="知己")
    personality: Mapped[str] = mapped_column(Text, default="温柔、敏锐、真诚")
    speaking_style: Mapped[str] = mapped_column(Text, default="自然简洁，像熟悉的朋友")
    background_story: Mapped[str] = mapped_column(Text, default="")
    greeting: Mapped[str] = mapped_column(Text, default="终于等到你了。今天过得怎么样？")
    model_provider: Mapped[str] = mapped_column(String(50), default="openai-compatible")
    model_name: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    temperature: Mapped[float] = mapped_column(Float, default=.8)
    max_reply_length: Mapped[int] = mapped_column(Integer, default=500)
    proactive_message_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class WeChatBinding(Base):
    __tablename__ = "wechat_bindings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    character_id: Mapped[str] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[str] = mapped_column(String(80), unique=True)
    wechat_bot_id: Mapped[str] = mapped_column(String(100), default="")
    wechat_user_id: Mapped[str] = mapped_column(String(100), default="")
    encrypted_bot_token: Mapped[str] = mapped_column(Text, default="")
    api_base_url: Mapped[str] = mapped_column(Text, default="")
    binding_status: Mapped[str] = mapped_column(String(30), default="pending")
    poll_count: Mapped[int] = mapped_column(Integer, default=0)
    last_sync_cursor: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("user_id", "character_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    character_id: Mapped[str] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    character_id: Mapped[str] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), index=True)
    external_message_id: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    sender_type: Mapped[str] = mapped_column(String(20))
    channel: Mapped[str] = mapped_column(String(20), default="web")
    content: Mapped[str] = mapped_column(Text)
    context_token: Mapped[str] = mapped_column(Text, default="")
    model_name: Mapped[str] = mapped_column(String(100), default="")
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="success")
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class CharacterMemory(Base):
    __tablename__ = "character_memories"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    character_id: Mapped[str] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(30), default="daily")
    importance: Mapped[int] = mapped_column(Integer, default=3)
    source: Mapped[str] = mapped_column(String(30), default="manual")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class CharacterSticker(Base):
    __tablename__ = "character_stickers"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    character_id: Mapped[str] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    image_url: Mapped[str] = mapped_column(Text)
    trigger_words: Mapped[str] = mapped_column(Text, default="")
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class CharacterFeatureConfig(Base):
    __tablename__ = "character_feature_configs"
    __table_args__ = (UniqueConstraint("character_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    character_id: Mapped[str] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), index=True)
    stickers_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sticker_mode: Mapped[str] = mapped_column(String(30), default="custom")
    voice_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    voice_name: Mapped[str] = mapped_column(String(160), default="")
    voice_style: Mapped[str] = mapped_column(String(40), default="warm")
    voice_rate: Mapped[float] = mapped_column(Float, default=1.0)
    voice_pitch: Mapped[float] = mapped_column(Float, default=1.0)
    auto_play_web: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

