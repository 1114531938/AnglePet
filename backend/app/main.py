import logging
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session
from .adapters import get_wechat_adapter
from .config import settings
from .database import Base, engine, get_db
from .llm import OpenAICompatibleProvider
from .models import Character, Conversation, Message, User, WeChatBinding
from .prompt import build_system_prompt
from .schemas import AuthIn, CharacterIn, CharacterOut, ChatIn
from .security import create_token, current_user, encrypt_secret, hash_password, verify_password

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("theone")
app = FastAPI(title="TheOne Companion API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url, "http://127.0.0.1:3100"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup(): Base.metadata.create_all(engine)

@app.get("/api/health")
def health(): return {"status": "ok", "wechat_adapter": settings.wechat_adapter, "llm_configured": bool(settings.llm_api_key)}

@app.post("/api/auth/register")
def register(body: AuthIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == body.username)): raise HTTPException(409, "用户名已存在")
    user = User(username=body.username, password_hash=hash_password(body.password)); db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_token(user.id), "token_type": "bearer", "username": user.username}

@app.post("/api/auth/login")
def login(body: AuthIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if not user or not verify_password(body.password, user.password_hash): raise HTTPException(401, "用户名或密码错误")
    return {"access_token": create_token(user.id), "token_type": "bearer", "username": user.username}

def owned_character(cid: str, user: User, db: Session):
    c = db.scalar(select(Character).where(Character.id == cid, Character.user_id == user.id))
    if not c: raise HTTPException(404, "角色不存在")
    return c

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
    c = owned_character(cid, user, db); db.delete(c); db.commit(); return {"ok": True}

@app.post("/api/characters/{cid}/activate")
def activate(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db)
    for other in db.scalars(select(Character).where(Character.user_id == user.id)): other.status = "inactive"
    c.status = "active"; db.commit(); return {"status": c.status}

@app.post("/api/characters/{cid}/wechat/activate")
async def wechat_activate(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = owned_character(cid, user, db); result = await get_wechat_adapter().create_login_qrcode()
    binding = WeChatBinding(user_id=user.id, character_id=c.id, session_id=result["session_id"], api_base_url=settings.openclaw_base_url)
    db.add(binding); db.commit(); return result

@app.get("/api/wechat/activation/{sid}/status")
async def activation_status(sid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    b = db.scalar(select(WeChatBinding).where(WeChatBinding.session_id == sid, WeChatBinding.user_id == user.id))
    if not b: raise HTTPException(404, "绑定会话不存在")
    result = await get_wechat_adapter().check_login_status(sid, b.poll_count); b.poll_count += 1; b.binding_status = result["status"]
    if result["status"] == "connected":
        b.wechat_bot_id=result.get("wechat_bot_id",""); b.wechat_user_id=result.get("wechat_user_id",""); b.encrypted_bot_token=encrypt_secret(result.get("bot_token",""))
        c = owned_character(b.character_id, user, db)
        for other in db.scalars(select(Character).where(Character.user_id == user.id)): other.status="inactive"
        c.status="active"
    db.commit(); return {"session_id": sid, "status": b.binding_status}

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
    prompt=[{"role":"system","content":build_system_prompt(c)}]+[{"role":"assistant" if m.sender_type=="assistant" else "user","content":m.content} for m in recent]
    try:
        out=await OpenAICompatibleProvider().chat(prompt,c.model_name,c.temperature)
        reply=Message(conversation_id=conv.id,user_id=user.id,character_id=cid,sender_type="assistant",content=out["content"],model_name=out["model"],input_tokens=out["input_tokens"],output_tokens=out["output_tokens"],latency_ms=out["latency_ms"]); db.add(reply); db.commit(); db.refresh(reply); return reply
    except Exception as exc:
        log.exception("LLM request failed"); db.add(Message(conversation_id=conv.id,user_id=user.id,character_id=cid,sender_type="assistant",content="暂时没能回复，请稍后再试。",status="failed",error=str(exc)[:500])); db.commit(); raise HTTPException(502,"模型暂时不可用")
