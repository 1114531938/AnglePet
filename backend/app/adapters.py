import uuid
from abc import ABC, abstractmethod

from .config import settings
from .wechat_openclaw import (
    check_real_login_status,
    create_real_login_qrcode,
    send_text_message as send_real_text_message,
)


class WeChatAdapter(ABC):
    @abstractmethod
    async def create_login_qrcode(self) -> dict: ...

    @abstractmethod
    async def check_login_status(self, session_id: str, poll_count: int = 0) -> dict: ...

    @abstractmethod
    async def send_text_message(self, binding, receiver_id: str, text: str, context_token: str = "") -> dict: ...


class MockWeChatAdapter(WeChatAdapter):
    async def create_login_qrcode(self):
        sid = f"mock_{uuid.uuid4().hex}"
        return {
            "session_id": sid,
            "qrcode_url": f"https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=theone-mock%3A%2F%2F{sid}",
            "expires_in": 300,
        }

    async def check_login_status(self, session_id, poll_count=0):
        if poll_count >= 2:
            return {
                "status": "connected",
                "wechat_bot_id": "mock-bot",
                "wechat_user_id": "wx-demo-user",
                "bot_token": f"demo-{session_id}",
            }
        return {"status": "scanned" if poll_count >= 1 else "pending"}

    async def send_text_message(self, binding, receiver_id, text, context_token=""):
        return {"ok": True, "message_id": f"mock_msg_{uuid.uuid4().hex}"}


class OpenClawWeChatAdapter(WeChatAdapter):
    async def create_login_qrcode(self):
        return await create_real_login_qrcode()

    async def check_login_status(self, session_id, poll_count=0):
        return await check_real_login_status(session_id)

    async def send_text_message(self, binding, receiver_id, text, context_token=""):
        return await send_real_text_message(binding, receiver_id, text, context_token)


def get_wechat_adapter():
    return OpenClawWeChatAdapter() if settings.wechat_adapter == "openclaw" else MockWeChatAdapter()
