import uuid
import httpx
from abc import ABC, abstractmethod
from .config import settings


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
        return {"session_id": sid, "qrcode_url": f"https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=theone-mock%3A%2F%2F{sid}", "expires_in": 300}

    async def check_login_status(self, session_id, poll_count=0):
        if poll_count >= 2:
            return {"status": "connected", "wechat_bot_id": "mock-bot", "wechat_user_id": "wx-demo-user", "bot_token": f"demo-{session_id}"}
        return {"status": "scanned" if poll_count >= 1 else "pending"}

    async def send_text_message(self, binding, receiver_id, text, context_token=""):
        return {"ok": True, "message_id": f"mock_msg_{uuid.uuid4().hex}"}


class OpenClawWeChatAdapter(WeChatAdapter):
    """腾讯官方 openclaw-weixin HTTP 桥接层；路径可随官方插件部署版本调整。"""
    def __init__(self):
        self.base = settings.openclaw_base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {settings.openclaw_token}"}

    async def _request(self, method, path, **kwargs):
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(method, f"{self.base}{path}", headers=self.headers, **kwargs)
            response.raise_for_status()
            return response.json()

    async def create_login_qrcode(self): return await self._request("POST", "/api/auth/qrcode")
    async def check_login_status(self, session_id, poll_count=0): return await self._request("GET", f"/api/auth/sessions/{session_id}")
    async def send_text_message(self, binding, receiver_id, text, context_token=""):
        return await self._request("POST", "/api/messages/text", json={"receiver_id": receiver_id, "text": text, "context_token": context_token})


def get_wechat_adapter():
    return OpenClawWeChatAdapter() if settings.wechat_adapter == "openclaw" else MockWeChatAdapter()

