import asyncio
import base64
import json
import logging
import random
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal
from .llm import OpenAICompatibleProvider
from .models import Character, Conversation, Message, WeChatBinding
from .prompt import build_system_prompt
from .security import encrypt_secret

log = logging.getLogger("theone.wechat")

ILINK_BASE_URL = "https://ilinkai.weixin.qq.com"
BOT_TYPE = "3"
CHANNEL_VERSION = "2.4.6"
ILINK_APP_ID = "bot"
ILINK_APP_CLIENT_VERSION = str((2 << 16) | (4 << 8) | 6)
LOGIN_TTL_SECONDS = 5 * 60

_active_logins: dict[str, dict[str, Any]] = {}
_worker_task: asyncio.Task | None = None


def _headers(token: str = "") -> dict[str, str]:
    value = str(random.getrandbits(32)).encode()
    headers = {
        "Content-Type": "application/json",
        "AuthorizationType": "ilink_bot_token",
        "X-WECHAT-UIN": base64.b64encode(value).decode(),
        "iLink-App-Id": ILINK_APP_ID,
        "iLink-App-ClientVersion": ILINK_APP_CLIENT_VERSION,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _base_info() -> dict[str, str]:
    return {"channel_version": CHANNEL_VERSION, "bot_agent": "AnglePet/0.1.0"}


async def _post_json(base_url: str, endpoint: str, body: dict[str, Any], token: str = "", timeout: float = 20) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(f"{base_url.rstrip('/')}/{endpoint}", headers=_headers(token), json=body)
        response.raise_for_status()
        return response.json()


async def _get_json(base_url: str, endpoint: str, timeout: float = 20) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(f"{base_url.rstrip('/')}/{endpoint}", headers={
            "iLink-App-Id": ILINK_APP_ID,
            "iLink-App-ClientVersion": ILINK_APP_CLIENT_VERSION,
        })
        response.raise_for_status()
        return response.json()


def _accounts_dir() -> Path:
    return Path(settings.openclaw_home) / ".openclaw" / "openclaw-weixin" / "accounts"


def _index_path() -> Path:
    return Path(settings.openclaw_home) / ".openclaw" / "openclaw-weixin" / "accounts.json"


def _save_openclaw_account(account_id: str, token: str, base_url: str, user_id: str = "") -> None:
    accounts_dir = _accounts_dir()
    accounts_dir.mkdir(parents=True, exist_ok=True)
    account_file = accounts_dir / f"{account_id}.json"
    account_file.write_text(json.dumps({
        "token": token,
        "savedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "baseUrl": base_url or ILINK_BASE_URL,
        **({"userId": user_id} if user_id else {}),
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    index_path = _index_path()
    try:
        account_ids = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else []
    except json.JSONDecodeError:
        account_ids = []
    if account_id not in account_ids:
        account_ids.append(account_id)
    index_path.write_text(json.dumps(account_ids, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_token(account_id: str) -> tuple[str, str]:
    path = _accounts_dir() / f"{account_id}.json"
    if not path.exists():
        return "", ILINK_BASE_URL
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("token", ""), data.get("baseUrl") or ILINK_BASE_URL


async def create_real_login_qrcode() -> dict[str, Any]:
    session_id = str(uuid.uuid4())
    local_token_list: list[str] = []
    try:
        account_ids = json.loads(_index_path().read_text(encoding="utf-8")) if _index_path().exists() else []
        for account_id in reversed(account_ids[-10:]):
            token, _ = _load_token(account_id)
            if token:
                local_token_list.append(token)
    except Exception:
        log.exception("Failed to read local Weixin token list")

    result = await _post_json(
        ILINK_BASE_URL,
        f"ilink/bot/get_bot_qrcode?bot_type={BOT_TYPE}",
        {"local_token_list": local_token_list},
        timeout=20,
    )
    qrcode = result["qrcode"]
    qrcode_url = result["qrcode_img_content"]
    qrcode_image_url = "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" + quote(qrcode_url, safe="")
    _active_logins[session_id] = {
        "qrcode": qrcode,
        "base_url": ILINK_BASE_URL,
        "started_at": time.time(),
    }
    return {
        "session_id": session_id,
        "qrcode_url": qrcode_image_url,
        "qrcode_content": qrcode_url,
        "expires_in": LOGIN_TTL_SECONDS,
    }


async def check_real_login_status(session_id: str, verify_code: str = "") -> dict[str, Any]:
    login = _active_logins.get(session_id)
    if not login:
        return {"status": "expired"}
    if time.time() - login["started_at"] > LOGIN_TTL_SECONDS:
        _active_logins.pop(session_id, None)
        return {"status": "expired"}

    endpoint = f"ilink/bot/get_qrcode_status?qrcode={quote(login['qrcode'], safe='')}"
    if verify_code:
        endpoint += f"&verify_code={quote(verify_code, safe='')}"
    try:
        result = await _get_json(login.get("base_url") or ILINK_BASE_URL, endpoint, timeout=8)
    except Exception as exc:
        log.warning("QR status poll failed: %s", exc)
        return {"status": "pending"}

    status = result.get("status")
    if status == "wait":
        return {"status": "pending"}
    if status == "scaned":
        return {"status": "scanned"}
    if status == "scaned_but_redirect" and result.get("redirect_host"):
        login["base_url"] = f"https://{result['redirect_host']}"
        return {"status": "scanned"}
    if status == "need_verifycode":
        return {"status": "need_verifycode"}
    if status in {"expired", "verify_code_blocked"}:
        _active_logins.pop(session_id, None)
        return {"status": "expired"}
    if status == "binded_redirect":
        _active_logins.pop(session_id, None)
        return {"status": "connected", "already_connected": True}
    if status == "confirmed":
        _active_logins.pop(session_id, None)
        token = result.get("bot_token", "")
        account_id = result.get("ilink_bot_id", "")
        base_url = result.get("baseurl") or login.get("base_url") or ILINK_BASE_URL
        user_id = result.get("ilink_user_id", "")
        if not token or not account_id:
            return {"status": "failed", "message": "WeChat login confirmed without token or bot id"}
        _save_openclaw_account(account_id, token, base_url, user_id)
        return {
            "status": "connected",
            "wechat_bot_id": account_id,
            "wechat_user_id": user_id,
            "bot_token": token,
            "api_base_url": base_url,
        }
    return {"status": "pending"}


async def send_text_message(binding: WeChatBinding, receiver_id: str, text: str, context_token: str = "") -> dict[str, Any]:
    token, base_url = _load_token(binding.wechat_bot_id)
    if not token:
        raise RuntimeError("No WeChat token found for binding")
    payload = {
        "msg": {
            "to_user_id": receiver_id,
            "context_token": context_token,
            "item_list": [{"type": 1, "text_item": {"text": text}}],
        },
        "base_info": _base_info(),
    }
    result = await _post_json(base_url, "ilink/bot/sendmessage", payload, token=token, timeout=15)
    if result.get("ret") not in (None, 0):
        raise RuntimeError(f"sendmessage ret={result.get('ret')} errmsg={result.get('errmsg')}")
    return {"ok": True}


async def _reply_to_wechat_message(db: Session, binding: WeChatBinding, character: Character, msg: dict[str, Any], text: str) -> None:
    conv = db.scalar(select(Conversation).where(
        Conversation.character_id == character.id,
        Conversation.user_id == binding.user_id,
    ))
    if not conv:
        conv = Conversation(user_id=binding.user_id, character_id=character.id)
        db.add(conv)
        db.flush()

    external_id = str(msg.get("message_id") or msg.get("seq") or uuid.uuid4())
    user_msg = Message(
        conversation_id=conv.id,
        user_id=binding.user_id,
        character_id=character.id,
        external_message_id=external_id,
        sender_type="user",
        channel="wechat",
        content=text,
        context_token=msg.get("context_token") or "",
    )
    db.add(user_msg)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return

    recent = list(db.scalars(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).limit(12)
    ))[::-1]
    prompt = [{"role": "system", "content": build_system_prompt(character)}] + [
        {"role": "assistant" if item.sender_type == "assistant" else "user", "content": item.content}
        for item in recent
    ]
    try:
        out = await OpenAICompatibleProvider().chat(prompt, character.model_name, character.temperature)
        reply = Message(
            conversation_id=conv.id,
            user_id=binding.user_id,
            character_id=character.id,
            sender_type="assistant",
            channel="wechat",
            content=out["content"],
            context_token=msg.get("context_token") or "",
            model_name=out["model"],
            input_tokens=out["input_tokens"],
            output_tokens=out["output_tokens"],
            latency_ms=out["latency_ms"],
        )
        db.add(reply)
        await send_text_message(binding, msg.get("from_user_id", ""), out["content"], msg.get("context_token") or "")
        db.commit()
    except Exception as exc:
        log.exception("Failed to reply to WeChat message")
        db.add(Message(
            conversation_id=conv.id,
            user_id=binding.user_id,
            character_id=character.id,
            sender_type="assistant",
            channel="wechat",
            content="暂时没能回复，请稍后再试。",
            status="failed",
            error=str(exc)[:500],
        ))
        db.commit()


def _extract_text(msg: dict[str, Any]) -> str:
    parts: list[str] = []
    for item in msg.get("item_list") or []:
        if item.get("type") == 1 and item.get("text_item", {}).get("text"):
            parts.append(item["text_item"]["text"])
    return "\n".join(parts).strip()


async def _poll_binding(binding_id: str) -> None:
    db = SessionLocal()
    try:
        binding = db.get(WeChatBinding, binding_id)
        if not binding or binding.binding_status != "connected":
            return
        token, base_url = _load_token(binding.wechat_bot_id)
        if not token:
            return
        result = await _post_json(base_url, "ilink/bot/getupdates", {
            "get_updates_buf": binding.last_sync_cursor or "",
            "base_info": _base_info(),
        }, token=token, timeout=40)
        if result.get("ret") not in (None, 0):
            log.warning("getupdates returned ret=%s errmsg=%s", result.get("ret"), result.get("errmsg"))
            return
        log.info("getupdates binding=%s msgs=%s", binding.id, len(result.get("msgs") or []))
        binding.last_sync_cursor = result.get("get_updates_buf") or binding.last_sync_cursor
        character = db.get(Character, binding.character_id)
        if not character:
            db.commit()
            return
        for msg in result.get("msgs") or []:
            if msg.get("message_type") == 2:
                continue
            text = _extract_text(msg)
            if text and msg.get("from_user_id"):
                log.info("wechat inbound from=%s text_len=%s", msg.get("from_user_id"), len(text))
                await _reply_to_wechat_message(db, binding, character, msg, text)
        db.commit()
    finally:
        db.close()


async def _worker_loop() -> None:
    while settings.wechat_poll_enabled:
        db = SessionLocal()
        try:
            ids = list(db.scalars(select(WeChatBinding.id).where(WeChatBinding.binding_status == "connected")))
        finally:
            db.close()
        for binding_id in ids:
            try:
                await _poll_binding(binding_id)
            except Exception:
                log.exception("WeChat binding poll failed")
        await asyncio.sleep(1)


def ensure_wechat_worker() -> None:
    global _worker_task
    if not settings.wechat_poll_enabled:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    if _worker_task is None or _worker_task.done():
        _worker_task = loop.create_task(_worker_loop())


def mark_binding_connected(db: Session, binding: WeChatBinding, result: dict[str, Any]) -> None:
    binding.binding_status = "connected"
    binding.wechat_bot_id = result.get("wechat_bot_id") or binding.wechat_bot_id
    binding.wechat_user_id = result.get("wechat_user_id") or binding.wechat_user_id
    binding.api_base_url = result.get("api_base_url") or ILINK_BASE_URL
    if result.get("bot_token"):
        binding.encrypted_bot_token = encrypt_secret(result["bot_token"])
