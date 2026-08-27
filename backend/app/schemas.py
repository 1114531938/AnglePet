from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AuthIn(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=3, max_length=128)

class AccountOut(BaseModel):
    id: str
    username: str
    avatar_url: str = ""
    is_admin: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AccountUpdate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    avatar_url: str = Field(default="", max_length=5000)

class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)

class DeleteAccountIn(BaseModel):
    password: str = Field(min_length=6, max_length=128)

class CharacterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    avatar_url: str = ""
    identity: str = "AI 陪伴者"
    relationship: str = "知己"
    personality: str = "温柔、敏锐、真诚"
    speaking_style: str = "自然简洁，像熟悉的朋友"
    background_story: str = ""
    greeting: str = "终于等到你了。今天过得怎么样？"
    model_provider: str = "openai-compatible"
    model_name: str = "gpt-4o-mini"
    temperature: float = Field(default=.8, ge=0, le=2)
    max_reply_length: int = Field(default=500, ge=50, le=4000)
    proactive_message_enabled: bool = True

class CharacterOut(CharacterIn):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatIn(BaseModel):
    content: str = Field(min_length=1, max_length=4000)

class MemoryIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=3000)
    category: str = Field(default="daily", max_length=30)
    importance: int = Field(default=3, ge=1, le=5)
    is_pinned: bool = False

class MemoryOut(MemoryIn):
    id: str
    source: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StickerOut(BaseModel):
    id: str
    name: str
    image_url: str
    trigger_words: str
    usage_count: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FeatureConfigIn(BaseModel):
    stickers_enabled: bool = True
    sticker_mode: str = Field(default="custom", max_length=30)
    voice_enabled: bool = False
    voice_name: str = Field(default="", max_length=160)
    voice_style: str = Field(default="warm", max_length=40)
    voice_rate: float = Field(default=1.0, ge=0.6, le=1.6)
    voice_pitch: float = Field(default=1.0, ge=0.5, le=1.8)
    auto_play_web: bool = False

class FeatureConfigOut(FeatureConfigIn):
    id: str
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AdminConfigIn(BaseModel):
    llm_base_url: str = Field(default="", max_length=500)
    llm_api_key: str = Field(default="", max_length=5000)
    llm_default_model: str = Field(default="", max_length=120)
    openclaw_base_url: str = Field(default="", max_length=500)
    openclaw_token: str = Field(default="", max_length=5000)
    wechat_adapter: str = Field(default="", max_length=40)
    wechat_poll_enabled: bool | None = None
    frontend_url: str = Field(default="", max_length=500)

class AdminUserUpdate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    is_admin: bool = False

class AdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)

