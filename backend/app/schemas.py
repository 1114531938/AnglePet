from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AuthIn(BaseModel):
    username: str = Field(min_length=3, max_length=80)
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

