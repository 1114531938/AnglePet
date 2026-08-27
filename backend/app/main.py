import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from .adapters import get_wechat_adapter
from .config import settings
from .database import Base, SessionLocal, engine, get_db
from .llm import OpenAICompatibleProvider
from .models import (
    Character,
    CharacterFeatureConfig,
    CharacterMemory,
    CharacterSticker,
    Conversation,
    Message,
    User,
    WeChatBinding,
)
from .prompt import build_system_prompt
from .schemas import (
    AccountOut,
    AccountUpdate,
    AdminConfigIn,
    AdminPasswordReset,
    AdminUserUpdate,
    AuthIn,
    CharacterIn,
    CharacterOut,
    ChatIn,
    DeleteAccountIn,
    FeatureConfigIn,
    FeatureConfigOut,
    MemoryIn,
    MemoryOut,
    PasswordUpdate,
    StickerOut,
)
from .security import create_token, current_user, encrypt_secret, hash_password, verify_password
from .wechat_openclaw import ensure_wechat_worker, mark_binding_connected

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("theone")
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
AVATAR_DIR = UPLOAD_DIR / "avatars"
STICKER_DIR = UPLOAD_DIR / "stickers"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
STICKER_DIR.mkdir(parents=True, exist_ok=True)
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
app = FastAPI(title="TheOne Companion API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url, "http://127.0.0.1:3100"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

def default_avatar(username: str) -> str:
    colors = ["#225849", "#2f4960", "#df7b55", "#6f8f72", "#8a6f4d", "#b56b5d"]
    color = colors[sum(ord(ch) for ch in username) % len(colors)]
    initial = (username[:1] or "A").upper()
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
<rect width="240" height="240" rx="56" fill="{color}"/>
<circle cx="84" cy="92" r="23" fill="#fff4ec"/>
<circle cx="156" cy="92" r="23" fill="#fff4ec"/>
<circle cx="78" cy="88" r="6" fill="#16201c"/>
<circle cx="150" cy="88" r="6" fill="#16201c"/>
<path d="M95 135c15 18 35 18 50 0" fill="none" stroke="#fff4ec" stroke-width="12" stroke-linecap="round"/>
<path d="M63 61 38 28c-6-8 4-18 13-12l36 25M177 61l25-33c6-8-4-18-13-12l-36 25" fill="#f1b99e"/>
<text x="120" y="192" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#fff4ec">{initial}</text>
</svg>"""
    return "data:image/svg+xml;utf8," + quote(svg)

def require_admin(user: User = Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(403, "需要管理员权限")
    return user

def upsert_env(values: dict[str, str]) -> None:
    current: dict[str, str] = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                current[key] = value
    current.update(values)
    order = [
        "DATABASE_URL",
        "JWT_SECRET",
        "TOKEN_ENCRYPTION_KEY",
        "LLM_BASE_URL",
        "LLM_API_KEY",
        "LLM_DEFAULT_MODEL",
        "WECHAT_ADAPTER",
        "OPENCLAW_BASE_URL",
        "OPENCLAW_TOKEN",
        "FRONTEND_URL",
        "OPENCLAW_HOME",
        "WECHAT_POLL_ENABLED",
    ]
    keys = order + sorted(key for key in current if key not in order)
    ENV_FILE.write_text("\n".join(f"{key}={current.get(key, '')}" for key in keys) + "\n", encoding="utf-8")

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(engine)
    if settings.database_url.startswith("sqlite"):
        with engine.begin() as conn:
            columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()]
            if "avatar_url" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''"))
            if "is_admin" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.username == "admin"))
        if not admin:
            admin = User(
                username="admin",
                avatar_url=default_avatar("admin"),
                is_admin=True,
                password_hash=hash_password("admin"),
            )
            db.add(admin)
        else:
            admin.is_admin = True
            if not admin.avatar_url:
                admin.avatar_url = default_avatar("admin")
        db.commit()
    ensure_wechat_worker()

@app.get("/api/health")
def health(): return {"status": "ok", "wechat_adapter": settings.wechat_adapter, "llm_configured": bool(settings.llm_api_key)}

@app.post("/api/auth/register")
def register(body: AuthIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == body.username)): raise HTTPException(409, "用户名已存在")
    user = User(username=body.username, avatar_url=default_avatar(body.username), password_hash=hash_password(body.password)); db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_token(user.id), "token_type": "bearer", "username": user.username}

@app.post("/api/auth/login")
def login(body: AuthIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if not user or not verify_password(body.password, user.password_hash): raise HTTPException(401, "用户名或密码错误")
    return {"access_token": create_token(user.id), "token_type": "bearer", "username": user.username}

@app.get("/api/me", response_model=AccountOut)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.avatar_url:
        user.avatar_url = default_avatar(user.username)
        db.commit(); db.refresh(user)
    return user

@app.get("/api/admin/config")
def admin_config(_: User = Depends(require_admin)):
    return {
        "llm_base_url": settings.llm_base_url,
        "llm_api_key_set": bool(settings.llm_api_key),
        "llm_default_model": settings.llm_default_model,
        "openclaw_base_url": settings.openclaw_base_url,
        "openclaw_token_set": bool(settings.openclaw_token),
        "wechat_adapter": settings.wechat_adapter,
        "wechat_poll_enabled": settings.wechat_poll_enabled,
        "frontend_url": settings.frontend_url,
    }

@app.put("/api/admin/config")
def update_admin_config(body: AdminConfigIn, _: User = Depends(require_admin)):
    updates: dict[str, str] = {}
    mapping = {
        "llm_base_url": "LLM_BASE_URL",
        "llm_default_model": "LLM_DEFAULT_MODEL",
        "openclaw_base_url": "OPENCLAW_BASE_URL",
        "wechat_adapter": "WECHAT_ADAPTER",
        "frontend_url": "FRONTEND_URL",
    }
    for attr, env_key in mapping.items():
        value = getattr(body, attr).strip()
        if value:
            setattr(settings, attr, value)
            updates[env_key] = value
    if body.llm_api_key.strip():
        settings.llm_api_key = body.llm_api_key.strip()
        updates["LLM_API_KEY"] = settings.llm_api_key
    if body.openclaw_token.strip():
        settings.openclaw_token = body.openclaw_token.strip()
        updates["OPENCLAW_TOKEN"] = settings.openclaw_token
    if body.wechat_poll_enabled is not None:
        settings.wechat_poll_enabled = body.wechat_poll_enabled
        updates["WECHAT_POLL_ENABLED"] = "true" if body.wechat_poll_enabled else "false"
    if updates:
        upsert_env(updates)
    return admin_config()

@app.get("/api/admin/overview")
def admin_overview(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = list(db.scalars(select(User).order_by(User.created_at.desc())))
    messages = list(db.scalars(select(Message)))
    bindings = list(db.scalars(select(WeChatBinding)))
    total_input = sum(item.input_tokens or 0 for item in messages)
    total_output = sum(item.output_tokens or 0 for item in messages)
    return {
        "totals": {
            "users": len(users),
            "characters": db.query(Character).count(),
            "messages": len(messages),
            "wechat_connected": sum(1 for item in bindings if item.binding_status == "connected"),
            "input_tokens": total_input,
            "output_tokens": total_output,
            "llm_configured": bool(settings.llm_api_key),
        },
        "recent_messages": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "character_id": item.character_id,
                "sender_type": item.sender_type,
                "channel": item.channel,
                "model_name": item.model_name,
                "input_tokens": item.input_tokens,
                "output_tokens": item.output_tokens,
                "latency_ms": item.latency_ms,
                "status": item.status,
                "created_at": item.created_at,
            }
            for item in db.scalars(select(Message).order_by(Message.created_at.desc()).limit(20))
        ],
    }

@app.get("/api/admin/users")
def admin_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    result = []
    for user in db.scalars(select(User).order_by(User.created_at.desc())):
        user_messages = list(db.scalars(select(Message).where(Message.user_id == user.id)))
        last_message = max((item.created_at for item in user_messages), default=None)
        result.append({
            "id": user.id,
            "username": user.username,
            "avatar_url": user.avatar_url,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "characters": db.query(Character).filter(Character.user_id == user.id).count(),
            "messages": len(user_messages),
            "input_tokens": sum(item.input_tokens or 0 for item in user_messages),
            "output_tokens": sum(item.output_tokens or 0 for item in user_messages),
            "last_message_at": last_message,
        })
    return result

@app.put("/api/admin/users/{uid}", response_model=AccountOut)
def update_admin_user(uid: str, body: AdminUserUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, uid)
    if not user:
        raise HTTPException(404, "用户不存在")
    exists = db.scalar(select(User).where(User.username == body.username, User.id != uid))
    if exists:
        raise HTTPException(409, "用户名已存在")
    user.username = body.username
    user.is_admin = body.is_admin
    if user.id == admin.id:
        user.is_admin = True
    db.commit(); db.refresh(user)
    return user

@app.put("/api/admin/users/{uid}/password")
def reset_admin_user_password(uid: str, body: AdminPasswordReset, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, uid)
    if not user:
        raise HTTPException(404, "用户不存在")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}

@app.delete("/api/admin/users/{uid}")
def delete_admin_user(uid: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if uid == admin.id:
        raise HTTPException(400, "不能删除当前管理员账号")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(404, "用户不存在")
    db.query(Message).filter(Message.user_id == user.id).delete(synchronize_session=False)
    db.query(Conversation).filter(Conversation.user_id == user.id).delete(synchronize_session=False)
    db.query(WeChatBinding).filter(WeChatBinding.user_id == user.id).delete(synchronize_session=False)
    db.query(CharacterFeatureConfig).filter(CharacterFeatureConfig.user_id == user.id).delete(synchronize_session=False)
    db.query(CharacterSticker).filter(CharacterSticker.user_id == user.id).delete(synchronize_session=False)
    db.query(CharacterMemory).filter(CharacterMemory.user_id == user.id).delete(synchronize_session=False)
    db.query(Character).filter(Character.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"ok": True}

@app.put("/api/me", response_model=AccountOut)
def update_me(body: AccountUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    exists = db.scalar(select(User).where(User.username == body.username, User.id != user.id))
    if exists: raise HTTPException(409, "用户名已存在")
    user.username = body.username
    user.avatar_url = body.avatar_url
    db.commit(); db.refresh(user)
    return user

@app.post("/api/me/avatar", response_model=AccountOut)
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    suffix = Path(file.filename or "").suffix.lower()
    allowed = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".pdf": "application/pdf",
    }
    if suffix not in allowed:
        raise HTTPException(400, "只支持 JPG、JPEG 或 PDF 文件")
    if file.content_type and file.content_type not in set(allowed.values()):
        raise HTTPException(400, "文件类型不正确")
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(400, "头像文件不能超过 8MB")
    filename = f"{user.id}-{uuid4().hex}{suffix}"
    (AVATAR_DIR / filename).write_bytes(content)
    user.avatar_url = f"http://127.0.0.1:8000/uploads/avatars/{filename}"
    db.commit(); db.refresh(user)
    return user

@app.put("/api/me/password")
def update_password(body: PasswordUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash): raise HTTPException(401, "当前密码错误")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}

@app.delete("/api/me")
def delete_me(body: DeleteAccountIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.password, user.password_hash): raise HTTPException(401, "密码错误")
    db.query(Message).filter(Message.user_id == user.id).delete(synchronize_session=False)
    db.query(Conversation).filter(Conversation.user_id == user.id).delete(synchronize_session=False)
    db.query(WeChatBinding).filter(WeChatBinding.user_id == user.id).delete(synchronize_session=False)
    db.query(CharacterFeatureConfig).filter(CharacterFeatureConfig.user_id == user.id).delete(synchronize_session=False)
    db.query(CharacterSticker).filter(CharacterSticker.user_id == user.id).delete(synchronize_session=False)
    db.query(CharacterMemory).filter(CharacterMemory.user_id == user.id).delete(synchronize_session=False)
    db.query(Character).filter(Character.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"ok": True}

def owned_character(cid: str, user: User, db: Session):
    c = db.scalar(select(Character).where(Character.id == cid, Character.user_id == user.id))
    if not c: raise HTTPException(404, "角色不存在")
    return c

def feature_config_for(c: Character, user: User, db: Session) -> CharacterFeatureConfig:
    config = db.scalar(select(CharacterFeatureConfig).where(
        CharacterFeatureConfig.character_id == c.id,
        CharacterFeatureConfig.user_id == user.id,
    ))
    if not config:
        config = CharacterFeatureConfig(user_id=user.id, character_id=c.id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def memories_for(cid: str, user_id: str, db: Session, limit: int = 12) -> list[CharacterMemory]:
    return list(db.scalars(
        select(CharacterMemory)
        .where(CharacterMemory.character_id == cid, CharacterMemory.user_id == user_id)
        .order_by(CharacterMemory.is_pinned.desc(), CharacterMemory.importance.desc(), CharacterMemory.updated_at.desc())
        .limit(limit)
    ))

def delete_character_data(cid: str, db: Session) -> None:
    db.query(Message).filter(Message.character_id == cid).delete(synchronize_session=False)
    db.query(Conversation).filter(Conversation.character_id == cid).delete(synchronize_session=False)
    db.query(WeChatBinding).filter(WeChatBinding.character_id == cid).delete(synchronize_session=False)
    db.query(CharacterFeatureConfig).filter(CharacterFeatureConfig.character_id == cid).delete(synchronize_session=False)
    db.query(CharacterSticker).filter(CharacterSticker.character_id == cid).delete(synchronize_session=False)
    db.query(CharacterMemory).filter(CharacterMemory.character_id == cid).delete(synchronize_session=False)

@app.get("/api/characters", response_model=list[CharacterOut])
def characters(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Character).where(Character.user_id == user.id).order_by(Character.created_at.desc())))

@app.post("/api/characters", response_model=CharacterOut)
def create_character(body: CharacterIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = Character(user_id=user.id, **body.model_dump()); db.add(c); db.commit(); db.refresh(c); return c

@app.get("/api/characters/{cid}", response_model=CharacterOut)
def character(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)): return owned_character(cid, user, db)

@app.put("/api/characters/{cid}", response_model=CharacterOut)
def update_character(cid: str, body: CharacterIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    for k,v in body.model_dump().items(): setattr(c,k,v)
    db.commit(); db.refresh(c); return c

@app.delete("/api/characters/{cid}")
def delete_character(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    delete_character_data(cid, db)
    db.delete(c)
    db.commit()
    return {"ok": True}

@app.get("/api/characters/{cid}/analytics")
def character_analytics(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    items = list(db.scalars(
        select(Message)
        .where(Message.character_id == cid, Message.user_id == user.id)
        .order_by(Message.created_at)
    ))
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=13)
    daily = {start + timedelta(days=offset): 0 for offset in range(14)}
    for item in items:
        day = item.created_at.date()
        if day in daily:
            daily[day] += 1
    assistant = [item for item in items if item.sender_type == "assistant"]
    successful = [item for item in assistant if item.status == "success"]
    latencies = [item.latency_ms for item in successful if item.latency_ms > 0]
    feature = feature_config_for(c, user, db)
    return {
        "created_days": max(1, (today - c.created_at.date()).days + 1),
        "total_messages": len(items),
        "sent_messages": sum(item.sender_type == "user" for item in items),
        "reply_messages": len(assistant),
        "web_messages": sum(item.channel == "web" for item in items),
        "wechat_messages": sum(item.channel == "wechat" for item in items),
        "success_rate": round(len(successful) / len(assistant) * 100, 1) if assistant else 100,
        "average_latency_ms": round(sum(latencies) / len(latencies)) if latencies else 0,
        "total_tokens": sum(item.input_tokens + item.output_tokens for item in items),
        "last_message_at": items[-1].created_at.isoformat() if items else None,
        "daily_average": round(len(items) / max(1, (today - max(start, c.created_at.date())).days + 1), 1),
        "memory_count": db.query(CharacterMemory).filter(CharacterMemory.character_id == cid).count(),
        "sticker_count": db.query(CharacterSticker).filter(CharacterSticker.character_id == cid).count(),
        "voice_enabled": feature.voice_enabled,
        "daily": [{"date": day.isoformat(), "count": count} for day, count in daily.items()],
    }

@app.get("/api/characters/{cid}/memories", response_model=list[MemoryOut])
def character_memories(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid, user, db)
    return memories_for(cid, user.id, db, 100)

@app.post("/api/characters/{cid}/memories", response_model=MemoryOut)
def create_memory(cid: str, body: MemoryIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid, user, db)
    item = CharacterMemory(user_id=user.id, character_id=cid, source="manual", **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.put("/api/characters/{cid}/memories/{mid}", response_model=MemoryOut)
def update_memory(cid: str, mid: str, body: MemoryIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid, user, db)
    item = db.scalar(select(CharacterMemory).where(
        CharacterMemory.id == mid,
        CharacterMemory.character_id == cid,
        CharacterMemory.user_id == user.id,
    ))
    if not item:
        raise HTTPException(404, "记忆不存在")
    for key, value in body.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/characters/{cid}/memories/{mid}")
def delete_memory(cid: str, mid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid, user, db)
    item = db.scalar(select(CharacterMemory).where(
        CharacterMemory.id == mid,
        CharacterMemory.character_id == cid,
        CharacterMemory.user_id == user.id,
    ))
    if not item:
        raise HTTPException(404, "记忆不存在")
    db.delete(item)
    db.commit()
    return {"ok": True}

@app.post("/api/characters/{cid}/memories/extract", response_model=MemoryOut)
async def extract_memory(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    recent = list(db.scalars(
        select(Message)
        .where(Message.character_id == cid, Message.user_id == user.id, Message.sender_type == "user")
        .order_by(Message.created_at.desc())
        .limit(20)
    ))[::-1]
    if not recent:
        raise HTTPException(400, "还没有可整理的对话")
    transcript = "\n".join(f"- {item.content}" for item in recent)
    prompt = [
        {"role": "system", "content": "从用户最近的话中提取一条值得宠物长期记住的稳定信息。只输出“标题|内容”，标题不超过12字，内容不超过100字；不要猜测。"},
        {"role": "user", "content": transcript},
    ]
    out = await OpenAICompatibleProvider().chat(prompt, c.model_name, 0.2)
    raw = out["content"].strip().replace("\n", " ")
    title, separator, content = raw.partition("|")
    if not separator:
        title, content = "最近的你", raw
    item = CharacterMemory(
        user_id=user.id,
        character_id=cid,
        title=title.strip()[:120] or "最近的你",
        content=content.strip()[:3000],
        category="daily",
        importance=3,
        source="conversation",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/api/characters/{cid}/features", response_model=FeatureConfigOut)
def get_character_features(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    return feature_config_for(c, user, db)

@app.put("/api/characters/{cid}/features", response_model=FeatureConfigOut)
def update_character_features(cid: str, body: FeatureConfigIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    config = feature_config_for(c, user, db)
    for key, value in body.model_dump().items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config

@app.get("/api/characters/{cid}/stickers", response_model=list[StickerOut])
def character_stickers(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid, user, db)
    return list(db.scalars(
        select(CharacterSticker)
        .where(CharacterSticker.character_id == cid, CharacterSticker.user_id == user.id)
        .order_by(CharacterSticker.created_at.desc())
    ))

@app.post("/api/characters/{cid}/stickers", response_model=StickerOut)
async def upload_sticker(
    cid: str,
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    trigger_words: str = Form(""),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_character(cid, user, db)
    suffix = Path(file.filename or "").suffix.lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if suffix not in allowed:
        raise HTTPException(400, "表情只支持 JPG、PNG、WEBP 或 GIF")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "表情图片不能超过 5MB")
    filename = f"{cid}-{uuid4().hex}{suffix}"
    (STICKER_DIR / filename).write_bytes(content)
    image_url = f"{str(request.base_url).rstrip('/')}/uploads/stickers/{filename}"
    item = CharacterSticker(
        user_id=user.id,
        character_id=cid,
        name=name.strip()[:80] or "宠物表情",
        image_url=image_url,
        trigger_words=trigger_words.strip()[:500],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/characters/{cid}/stickers/{sid}")
def delete_sticker(cid: str, sid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid, user, db)
    item = db.scalar(select(CharacterSticker).where(
        CharacterSticker.id == sid,
        CharacterSticker.character_id == cid,
        CharacterSticker.user_id == user.id,
    ))
    if not item:
        raise HTTPException(404, "表情不存在")
    db.delete(item)
    db.commit()
    return {"ok": True}

@app.post("/api/characters/{cid}/stickers/{sid}/send")
def send_sticker_to_web_chat(cid: str, sid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid, user, db)
    item = db.scalar(select(CharacterSticker).where(
        CharacterSticker.id == sid,
        CharacterSticker.character_id == cid,
        CharacterSticker.user_id == user.id,
    ))
    if not item:
        raise HTTPException(404, "表情不存在")
    conv = db.scalar(select(Conversation).where(Conversation.character_id == cid, Conversation.user_id == user.id))
    if not conv:
        conv = Conversation(user_id=user.id, character_id=cid)
        db.add(conv)
        db.flush()
    message = Message(
        conversation_id=conv.id,
        user_id=user.id,
        character_id=cid,
        sender_type="assistant",
        channel="web",
        content=f"__ANGLEPET_STICKER__:{item.image_url}",
    )
    item.usage_count += 1
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

@app.post("/api/characters/{cid}/activate")
async def activate(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    for other in db.scalars(select(Character).where(Character.user_id == user.id)): other.status = "inactive"
    connected_binding = db.scalar(
        select(WeChatBinding)
        .where(
            WeChatBinding.user_id == user.id,
            WeChatBinding.binding_status == "connected",
        )
        .order_by(WeChatBinding.updated_at.desc())
    )
    if connected_binding:
        connected_binding.character_id = c.id
    c.status = "active"
    db.commit()
    wechat_identity_confirmed = False
    if connected_binding and connected_binding.wechat_user_id:
        latest_incoming = db.scalar(
            select(Message)
            .where(
                Message.user_id == user.id,
                Message.channel == "wechat",
                Message.sender_type == "user",
            )
            .order_by(Message.created_at.desc())
        )
        try:
            await get_wechat_adapter().send_text_message(
                connected_binding,
                connected_binding.wechat_user_id,
                f"【{c.name}】\n{c.greeting}",
                latest_incoming.context_token if latest_incoming else "",
            )
            wechat_identity_confirmed = True
        except Exception:
            log.exception("Failed to send WeChat character switch confirmation")
    return {
        "status": c.status,
        "wechat_switched": bool(connected_binding),
        "wechat_identity_confirmed": wechat_identity_confirmed,
        "character_id": c.id,
        "character_name": c.name,
    }

@app.post("/api/characters/{cid}/wechat/activate")
async def wechat_activate(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db); result = await get_wechat_adapter().create_login_qrcode()
    binding = WeChatBinding(user_id=user.id, character_id=c.id, session_id=result["session_id"], api_base_url=settings.openclaw_base_url)
    db.add(binding); db.commit(); return result

@app.get("/api/wechat/activation/{sid}/status")
async def activation_status(sid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    b = db.scalar(select(WeChatBinding).where(WeChatBinding.session_id == sid, WeChatBinding.user_id == user.id))
    if not b: raise HTTPException(404, "绑定会话不存在")
    if b.binding_status == "connected":
        return {"session_id": sid, "status": "connected"}
    result = await get_wechat_adapter().check_login_status(sid, b.poll_count); b.poll_count += 1; b.binding_status = result["status"]
    if result["status"] == "connected" and (result.get("bot_token") or result.get("wechat_bot_id")):
        mark_binding_connected(db, b, result)
        c = owned_character(b.character_id, user, db)
        for other in db.scalars(select(Character).where(Character.user_id == user.id)): other.status="inactive"
        c.status="active"
        ensure_wechat_worker()
    elif result["status"] == "connected":
        b.binding_status = "failed"
        db.commit()
        return {"session_id": sid, "status": "failed", "message": result.get("message", "WeChat connected without bot token; please scan again")}
    db.commit(); return {"session_id": sid, "status": b.binding_status, "message": result.get("message", "")}

@app.post("/api/characters/{cid}/wechat/deactivate")
def wechat_deactivate(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c=owned_character(cid,user,db)
    for b in db.scalars(select(WeChatBinding).where(WeChatBinding.character_id==cid, WeChatBinding.user_id==user.id)): b.binding_status="disconnected"
    c.status="inactive"; db.commit(); return {"status":"disconnected"}

@app.get("/api/characters/{cid}/wechat/status")
def wechat_status(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid,user,db); b=db.scalar(select(WeChatBinding).where(WeChatBinding.character_id==cid, WeChatBinding.user_id==user.id).order_by(WeChatBinding.created_at.desc()))
    return {"status": b.binding_status if b else "unbound"}

@app.get("/api/characters/{cid}/messages")
def messages(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_character(cid,user,db); return list(db.scalars(select(Message).where(Message.character_id==cid, Message.user_id==user.id).order_by(Message.created_at)))

@app.post("/api/characters/{cid}/chat")
async def chat(cid: str, body: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c=owned_character(cid,user,db); conv=db.scalar(select(Conversation).where(Conversation.character_id==cid, Conversation.user_id==user.id))
    if not conv: conv=Conversation(user_id=user.id,character_id=cid); db.add(conv); db.flush()
    user_msg=Message(conversation_id=conv.id,user_id=user.id,character_id=cid,sender_type="user",content=body.content); db.add(user_msg); db.flush()
    recent=list(db.scalars(select(Message).where(Message.conversation_id==conv.id).order_by(Message.created_at.desc()).limit(12)))[::-1]
    memory_items = memories_for(cid, user.id, db)
    prompt=[{"role":"system","content":build_system_prompt(c, memory_items)}]+[{"role":"assistant" if m.sender_type=="assistant" else "user","content":m.content} for m in recent if not m.content.startswith("__ANGLEPET_STICKER__:")]
    try:
        out=await OpenAICompatibleProvider().chat(prompt,c.model_name,c.temperature)
        reply=Message(conversation_id=conv.id,user_id=user.id,character_id=cid,sender_type="assistant",content=out["content"],model_name=out["model"],input_tokens=out["input_tokens"],output_tokens=out["output_tokens"],latency_ms=out["latency_ms"]); db.add(reply); db.commit(); db.refresh(reply); return reply
    except Exception as exc:
        log.exception("LLM request failed"); db.add(Message(conversation_id=conv.id,user_id=user.id,character_id=cid,sender_type="assistant",content="暂时没能回复，请稍后再试。",status="failed",error=str(exc)[:500])); db.commit(); raise HTTPException(502,"模型暂时不可用")
