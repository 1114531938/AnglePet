from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./pet.db"
    jwt_secret: str = "dev-only-secret"
    token_encryption_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_default_model: str = "gpt-4o-mini"
    wechat_adapter: str = "mock"
    openclaw_base_url: str = "http://openclaw-weixin:8080"
    openclaw_token: str = ""
    openclaw_home: str = "D:\\OpenClawRuntime\\home"
    wechat_poll_enabled: bool = True
    frontend_url: str = "http://localhost:3100"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
