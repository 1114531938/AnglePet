import time
import httpx
from .config import settings


class LLMProvider:
    async def chat(self, messages: list[dict], model: str, temperature: float) -> dict:
        raise NotImplementedError


class OpenAICompatibleProvider(LLMProvider):
    async def chat(self, messages, model, temperature):
        if not settings.llm_api_key:
            last = messages[-1]["content"]
            text = f"我在听。你说“{last[:80]}”的时候，我能感觉到这件事对你很重要。愿意再和我多说一点吗？"
            return {"content": text, "input_tokens": len(str(messages))//4, "output_tokens": len(text)//2, "latency_ms": 80, "model": "mock-companion"}
        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(f"{settings.llm_base_url.rstrip('/')}/chat/completions", headers={"Authorization": f"Bearer {settings.llm_api_key}"}, json={"model": model, "messages": messages, "temperature": temperature})
            response.raise_for_status()
            data = response.json()
        usage = data.get("usage", {})
        return {"content": data["choices"][0]["message"]["content"], "input_tokens": usage.get("prompt_tokens", 0), "output_tokens": usage.get("completion_tokens", 0), "latency_ms": int((time.perf_counter()-started)*1000), "model": data.get("model", model)}

