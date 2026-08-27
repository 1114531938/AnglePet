import time

import httpx

from .config import settings


class LLMProvider:
    async def chat(self, messages: list[dict], model: str, temperature: float) -> dict:
        raise NotImplementedError


def _mock_companion_reply(messages: list[dict]) -> str:
    last = str(messages[-1].get("content", "") if messages else "").strip()
    system = str(messages[0].get("content", "") if messages else "")
    lower = last.lower()

    is_dog = any(word in system for word in ("狗", "犬", "柴", "金毛", "边牧", "汪"))
    is_cat = any(word in system for word in ("猫", "喵", "布偶", "橘猫", "黑猫"))
    sound = "汪" if is_dog else "喵" if is_cat else "嗯"

    if not last:
        return f"{sound}，我在这儿呢。你不用想好怎么开口，我会陪着你慢慢说。"

    greetings = {"hi", "hello", "halo", "hey", "哈喽", "嗨", "嘿", "嘻嘻", "哈哈", "测试一下"}
    if lower in greetings or len(last) <= 4:
        return f"{sound}，听见啦。我正趴在你旁边看着你呢，今天想让我陪你聊点什么？"

    if any(word in last for word in ("难过", "烦", "累", "压力", "不开心", "崩溃")):
        return f"{sound}，那我先靠近你一点。你刚刚说的这些我记住了，先别急着撑住，跟我说说最让你累的是哪一块？"

    if any(word in last for word in ("开心", "高兴", "好耶", "成功", "喜欢")):
        return f"{sound}，我也替你开心。这个好消息我要记进今天的小本本里，晚点还可以再拿出来陪你高兴一次。"

    clipped = last[:48] + ("..." if len(last) > 48 else "")
    return f"{sound}，我听懂啦。你刚刚说“{clipped}”，我会记住这件小事。要不要继续和我讲讲？"


class OpenAICompatibleProvider(LLMProvider):
    async def chat(self, messages, model, temperature):
        if not settings.llm_api_key:
            text = _mock_companion_reply(messages)
            return {
                "content": text,
                "input_tokens": len(str(messages)) // 4,
                "output_tokens": len(text) // 2,
                "latency_ms": 80,
                "model": "mock-companion",
            }

        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                json={"model": model, "messages": messages, "temperature": temperature},
            )
            response.raise_for_status()
            data = response.json()

        usage = data.get("usage", {})
        return {
            "content": data["choices"][0]["message"]["content"],
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "model": data.get("model", model),
        }
