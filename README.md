# 有一 · AI 微信陪伴 MVP

参考 TheOne 陪伴体验实现的全栈 MVP。包含账号登录、角色管理、唯一角色激活、OpenAI-compatible 对话、聊天记录、微信扫码绑定 Mock 演示，以及独立的 OpenClaw 微信 Adapter。

## 本地运行（推荐）

需要 Node.js 22 与 Python 3.11+。

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

另开终端：

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev -- --port 3100
```

访问 http://localhost:3100。API 文档位于 http://localhost:8000/docs。

也可以在项目根目录执行 `docker compose up --build`。

## 真实服务配置

- 模型：配置 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_DEFAULT_MODEL`。
- 微信：默认 `WECHAT_ADAPTER=mock`。部署腾讯官方 `openclaw-weixin` 插件后，设置为 `openclaw`，并配置 `OPENCLAW_BASE_URL` 与 `OPENCLAW_TOKEN`。真实 Adapter 位于 `backend/app/adapters.py`，业务层不依赖插件实现。
- 生产环境务必更换 `JWT_SECRET`，并设置固定的 Fernet `TOKEN_ENCRYPTION_KEY`。微信令牌只加密入库，不写日志。

本项目不使用微信 Hook、PC 自动化或非官方机器人框架。
