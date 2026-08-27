"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, PawPrint, ShieldCheck } from "lucide-react";
import { request, saveAuth } from "@/lib/api";

const authVideo =
  "https://videos.pexels.com/video-files/8489216/8489216-hd_1920_1080_30fps.mp4";

export default function Login() {
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await request(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      saveAuth(data.access_token, data.username);
      router.push("/console");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <video className="auth-video" src={authVideo} autoPlay muted loop playsInline />
      <div className="auth-shade" />
      <Link href="/" className="brand auth-brand">
        <span className="brand-mark"><PawPrint size={19} /></span>
        <span>AnglePet</span>
      </Link>

      <section className="auth-card-new compact">
        <form onSubmit={submit} className="auth-panel">
          <p className="kicker"><ShieldCheck size={15} /> Secure access</p>
          <h2>{register ? "创建宠物屋账号" : "欢迎回来"}</h2>
          <p>{register ? "创建账号后即可领养宠物并连接微信。" : "登录后继续陪伴你的 AnglePet。"}</p>
          <label>
            用户名
            <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required />
          </label>
          <label>
            密码
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={3} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn full" disabled={loading}>
            {loading ? "处理中..." : register ? "注册并进入宠物屋" : "进入宠物屋"} <ArrowRight size={18} />
          </button>
          <button type="button" className="text-switch" onClick={() => { setRegister(!register); setError(""); }}>
            {register ? "已有账号，去登录" : "第一次使用，创建账号"}
          </button>
        </form>
        <div className="auth-points">
          <span><CheckCircle2 size={16} /> 真实微信扫码</span>
          <span><CheckCircle2 size={16} /> 宠物记忆保存</span>
          <span><CheckCircle2 size={16} /> 微信持续陪聊</span>
        </div>
      </section>
    </main>
  );
}
