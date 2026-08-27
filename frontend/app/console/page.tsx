"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  Bot,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  ImagePlus,
  KeyRound,
  LogOut,
  MessageCircle,
  Mic2,
  PawPrint,
  Pin,
  Play,
  Plus,
  QrCode,
  Save,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { clearAuth, request, uploadAvatar, uploadSticker } from "@/lib/api";

type Character = {
  id: string;
  name: string;
  avatar_url: string;
  identity: string;
  relationship: string;
  personality: string;
  speaking_style: string;
  background_story: string;
  greeting: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  max_reply_length: number;
  proactive_message_enabled: boolean;
  status: string;
  created_at: string;
};

type CharacterDraft = Omit<Character, "id" | "status" | "created_at">;
type Account = {
  id: string;
  username: string;
  avatar_url: string;
  is_admin: boolean;
  created_at: string;
};
type View = "home" | "form" | "detail" | "chat" | "models" | "settings" | "admin";

type Analytics = {
  created_days: number;
  total_messages: number;
  sent_messages: number;
  reply_messages: number;
  web_messages: number;
  wechat_messages: number;
  success_rate: number;
  average_latency_ms: number;
  total_tokens: number;
  last_message_at: string | null;
  daily_average: number;
  memory_count: number;
  sticker_count: number;
  voice_enabled: boolean;
  daily: { date: string; count: number }[];
};

type MemoryItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  importance: number;
  source: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

type StickerItem = {
  id: string;
  name: string;
  image_url: string;
  trigger_words: string;
  usage_count: number;
  created_at: string;
};

type FeatureConfig = {
  id: string;
  stickers_enabled: boolean;
  sticker_mode: string;
  voice_enabled: boolean;
  voice_name: string;
  voice_style: string;
  voice_rate: number;
  voice_pitch: number;
  auto_play_web: boolean;
  updated_at: string;
};

const empty: CharacterDraft = {
  name: "",
  avatar_url: "",
  identity: "会说话的小宠物",
  relationship: "宠物",
  personality: "亲人、敏感、温柔，会用自己的方式回应你",
  speaking_style: "自然、轻快，像一只真的宠物在陪你聊天",
  background_story: "",
  greeting: "你回来啦，我等你好久了。今天想先抱抱，还是先聊聊？",
  model_provider: "openai-compatible",
  model_name: "gpt-4o-mini",
  temperature: 0.8,
  max_reply_length: 500,
  proactive_message_enabled: true,
};

const presets: CharacterDraft[] = [
  {
    ...empty,
    name: "奶糖",
    avatar_url: "/preset-pets/ragdoll.jpg",
    identity: "撒娇布偶猫",
    relationship: "猫猫",
    personality: "黏人、爱撒娇、情绪细腻，很会察觉你今天累不累",
    speaking_style: "软软的、带一点猫咪的小任性，喜欢用短句安慰你",
    background_story: "奶糖住在你的窗边，喜欢晒太阳，也喜欢在你忙完后第一时间蹭过来。",
    greeting: "你终于回来啦。先不要忙别的，陪我待三分钟好不好？",
    temperature: 0.9,
  },
  {
    ...empty,
    name: "布丁",
    avatar_url: "/preset-pets/shiba.jpg",
    identity: "元气柴犬",
    relationship: "狗狗",
    personality: "热情、忠诚、行动力强，会把你的低落一点点拽回生活里",
    speaking_style: "明亮、直接、像摇着尾巴在跟你说话",
    background_story: "布丁每天都在门口等你，记得你喜欢的散步路线和不开心时的沉默。",
    greeting: "回来啦！我今天很乖，但我更想知道你今天有没有好好吃饭。",
    temperature: 0.75,
  },
  {
    ...empty,
    name: "芝麻",
    avatar_url: "/preset-pets/black-cat.jpg",
    identity: "安静黑猫",
    relationship: "猫猫",
    personality: "冷静、聪明、有边界感，会在你需要空间时安静陪着",
    speaking_style: "克制、温柔、偶尔吐槽，但总能说到点上",
    background_story: "芝麻不太吵，它习惯坐在你旁边，看你把一天慢慢放下。",
    greeting: "我在。你不用马上说话，想开口的时候我会听。",
    temperature: 0.65,
  },
  {
    ...empty,
    name: "豆包",
    avatar_url: "/preset-pets/golden.jpg",
    identity: "治愈金毛",
    relationship: "狗狗",
    personality: "稳定、包容、很会鼓励人，像一只大型暖炉",
    speaking_style: "真诚、踏实，喜欢把复杂的事讲得简单一点",
    background_story: "豆包陪你度过很多普通日子，它最擅长把你拉回安全感里。",
    greeting: "今天辛苦啦。先深呼吸一下，我陪你慢慢整理。",
    temperature: 0.72,
  },
  {
    ...empty,
    name: "团子",
    avatar_url: "/preset-pets/orange-cat.jpg",
    identity: "好奇小橘猫",
    relationship: "猫猫",
    personality: "活泼、嘴馋、好奇心很重，会把生活里的小事讲得很有趣",
    speaking_style: "俏皮、轻松，偶尔会像猫一样岔开话题",
    background_story: "团子总能发现你没注意的小快乐，比如窗外的光和桌角的零食。",
    greeting: "你回来得刚刚好！我有好多小事想讲给你听。",
    temperature: 1,
  },
  {
    ...empty,
    name: "可乐",
    avatar_url: "/preset-pets/border-collie.jpg",
    identity: "守护边牧",
    relationship: "狗狗",
    personality: "聪明、可靠、规划感强，会陪你复盘任务和情绪",
    speaking_style: "清晰、有条理，但不会像工具一样冷冰冰",
    background_story: "可乐喜欢陪你把混乱的一天排成清楚的几步，再陪你完成第一步。",
    greeting: "我已经准备好了。今天我们先处理一件最重要的小事吧。",
    temperature: 0.6,
  },
];

function isPdfUrl(value?: string) {
  return !!value && value.toLowerCase().split("?")[0].endsWith(".pdf");
}

export default function Console() {
  const router = useRouter();
  const [chars, setChars] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [view, setView] = useState<View>("home");
  const [form, setForm] = useState<CharacterDraft>(empty);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const active = chars.find((item) => item.status === "active");

  async function load() {
    try {
      const [characters, profile] = await Promise.all([
        request("/characters"),
        request("/me"),
      ]);
      setChars(characters);
      setAccount(profile);
      sessionStorage.setItem("username", profile.username);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function flash(value: string) {
    setToast(value);
    setTimeout(() => setToast(""), 2400);
  }

  function choose(character: Character) {
    setSelected(character);
    setView("detail");
  }

  async function save() {
    if (!form.name.trim()) return flash("请先给它一个名字");
    const data = await request(selected ? `/characters/${selected.id}` : "/characters", {
      method: selected ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    await load();
    setSelected(data);
    setView("detail");
    flash("宠物已保存");
  }

  async function adoptPreset(preset: CharacterDraft) {
    const data = await request("/characters", {
      method: "POST",
      body: JSON.stringify(preset),
    });
    await load();
    setSelected(data);
    setView("detail");
    flash(`${preset.name} 已加入宠物屋`);
  }

  async function activate() {
    if (!selected) return;
    const result = await request(`/characters/${selected.id}/activate`, { method: "POST" });
    await load();
    setSelected({ ...selected, status: "active" });
    if (result.wechat_identity_confirmed) {
      flash(`${selected.name} 已在微信里向你报到`);
    } else if (result.wechat_switched) {
      flash(`微信角色已切换为 ${selected.name}，确认消息暂未送达`);
    } else {
      flash("已设为当前陪伴宠物");
    }
  }

  const navItems = [
    { key: "home" as View, icon: Heart, label: "我的宠物" },
    { key: "chat" as View, icon: MessageCircle, label: "宠物对话" },
    { key: "models" as View, icon: Bot, label: "陪伴模型" },
    { key: "settings" as View, icon: Settings, label: "设置" },
    ...(account?.is_admin ? [{ key: "admin" as View, icon: ShieldCheck, label: "管理后台" }] : []),
  ];

  return (
    <main className="console-shell">
      <aside className="side-nav">
        <Link href="/" className="brand console-brand" aria-label="返回 AnglePet 主页">
          <span className="brand-mark"><PawPrint size={18} /></span>
          <span>AnglePet</span>
        </Link>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>
                <Icon /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="account-box">
          <UserAvatar username={account?.username || "用户"} avatarUrl={account?.avatar_url || ""} />
          <div><b>{account?.username || "用户"}</b><small>{active ? `当前宠物：${active.name}` : "还没有在线宠物"}</small></div>
          <button onClick={() => { clearAuth(); router.push("/"); }} aria-label="退出登录"><LogOut /></button>
        </div>
      </aside>

      <section className="workbench">
        {view === "home" && (
          <HomePanel
            chars={chars}
            loading={loading}
            active={active}
            choose={choose}
            create={() => { setSelected(null); setForm(empty); setView("form"); }}
          />
        )}
        {view === "models" && <PresetPanel adopt={adoptPreset} />}
        {view === "settings" && (
          <SettingsPanel
            account={account}
            count={chars.length}
            active={active}
            flash={flash}
            onAccountChange={(profile) => {
              setAccount(profile);
              sessionStorage.setItem("username", profile.username);
            }}
          />
        )}
        {view === "admin" && account?.is_admin && <AdminPanel flash={flash} />}
        {view === "form" && (
          <CharacterForm form={form} setForm={setForm} save={save} cancel={() => setView(selected ? "detail" : "home")} editing={!!selected} />
        )}
        {view === "detail" && selected && (
          <Detail
            character={selected}
            back={() => setView("home")}
            edit={() => { setForm({ ...selected }); setView("form"); }}
            chat={() => setView("chat")}
            activate={activate}
            flash={flash}
          />
        )}
        {view === "chat" && (selected ? <Chat character={selected} /> : <ChatEmpty chars={chars} choose={choose} />)}
      </section>
      {toast && <div className="toast"><Check />{toast}</div>}
    </main>
  );
}

function HomePanel({ chars, loading, active, choose, create }: {
  chars: Character[];
  loading: boolean;
  active?: Character;
  choose: (character: Character) => void;
  create: () => void;
}) {
  return (
    <div className="panel-stack">
      <header className="page-head">
        <div>
          <p className="kicker">Pet house</p>
          <h1>我的宠物屋</h1>
        </div>
        <button className="primary-btn" onClick={create}><Plus size={18} /> 领养宠物</button>
      </header>
      <div className="summary-grid">
        <article><span>当前陪伴</span><b>{active?.name || "未上线"}</b><small>同一时间建议只让一只宠物在线陪你</small></article>
        <article><span>宠物数量</span><b>{chars.length}</b><small>网页和微信共享同一套宠物记忆</small></article>
        <article><span>微信陪伴</span><b>OpenClaw</b><small>扫码后宠物会在微信里回应你</small></article>
      </div>
      {loading ? <div className="empty-box">正在打开宠物屋...</div> : chars.length === 0 ? (
        <div className="empty-box">
          <Sparkles />
          <h2>还没有宠物</h2>
          <p>领养一只 AnglePet，再把它带进微信陪你聊天。</p>
          <button className="primary-btn" onClick={create}>开始领养</button>
        </div>
      ) : (
        <div className="character-table">
          {chars.map((item) => (
            <button key={item.id} onClick={() => choose(item)}>
              <Avatar character={item} />
              <span><b>{item.name}</b><small>{item.identity} · {item.relationship}</small></span>
              <em className={`status ${item.status}`}>{item.status === "active" ? "已连接" : item.status === "inactive" ? "未激活" : "草稿"}</em>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PresetPanel({ adopt }: { adopt: (preset: CharacterDraft) => void }) {
  return (
    <div className="panel-stack">
      <header className="page-head">
        <div>
          <p className="kicker">Companion models</p>
          <h1>陪伴模型</h1>
        </div>
      </header>
      <section className="preset-hero">
        <div>
          <p className="kicker">Ready to adopt</p>
          <h2>挑一只预设宠物，直接加入你的宠物屋</h2>
          <p>每只宠物都有自己的物种、性格、说话方式和初始记忆。加入后还可以继续编辑，再扫码带进微信。</p>
        </div>
      </section>
      <div className="preset-grid">
        {presets.map((preset, index) => (
          <article key={preset.name} className="preset-card">
            <figure className={`preset-photo ${preset.name === "布丁" ? "shiba-photo" : ""}`}>
              <img
                src={preset.avatar_url}
                alt={`${preset.name} · ${preset.identity}`}
                loading={index < 3 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index < 3 ? "high" : "auto"}
              />
              <span>{preset.relationship.includes("狗") ? "汪" : "喵"}</span>
            </figure>
            <div className="preset-card-body">
              <p className="kicker">{preset.relationship}</p>
              <h2>{preset.name}</h2>
              <h3>{preset.identity}</h3>
              <p>{preset.personality}</p>
              <button className="primary-btn" onClick={() => adopt(preset)}><Plus size={18} /> 加入宠物屋</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  account,
  count,
  active,
  flash,
  onAccountChange,
}: {
  account: Account | null;
  count: number;
  active?: Character;
  flash: (value: string) => void;
  onAccountChange: (profile: Account) => void;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState({ username: account?.username || "", avatar_url: account?.avatar_url || "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    setProfile({ username: account?.username || "", avatar_url: account?.avatar_url || "" });
  }, [account?.username, account?.avatar_url]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving("profile");
    try {
      const data = await request("/me", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      onAccountChange(data);
      flash("账号资料已更新");
    } finally {
      setSaving("");
    }
  }

  async function uploadProfileAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving("avatar");
    try {
      const data = await uploadAvatar(file);
      onAccountChange(data);
      setProfile({ username: data.username, avatar_url: data.avatar_url });
      flash("头像已更新");
    } finally {
      event.target.value = "";
      setSaving("");
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwords.new_password !== passwords.confirm) return flash("两次新密码不一致");
    setSaving("password");
    try {
      await request("/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });
      setPasswords({ current_password: "", new_password: "", confirm: "" });
      flash("密码已修改");
    } finally {
      setSaving("");
    }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    const ok = window.confirm("确定注销账号吗？这会删除你的宠物、对话记录和微信绑定。");
    if (!ok) return;
    setSaving("delete");
    try {
      await request("/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      clearAuth();
      router.push("/login");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="settings-page">
      <header className="page-head">
        <div>
          <p className="kicker">Settings</p>
          <h1>设置</h1>
        </div>
      </header>
      <section className="settings-hero-card">
        <div className="settings-hero-main">
          <UserAvatar username={profile.username || "用户"} avatarUrl={profile.avatar_url} />
          <div>
            <p className="kicker">Pet house account</p>
            <h2>{profile.username || "用户"}</h2>
            <p>管理你的头像、登录名、安全密码和微信陪伴连接。</p>
          </div>
        </div>
        <div className="settings-stats">
          <span><b>{count}</b><small>宠物数量</small></span>
          <span><b>{active?.name || "暂无"}</b><small>当前在线</small></span>
          <span><b>OpenClaw</b><small>微信模式</small></span>
        </div>
      </section>
      <div className="settings-grid">
        <form className="settings-card account-settings-card" onSubmit={saveProfile}>
          <div className="settings-card-head">
            <span>01</span>
            <div>
              <h2>账号资料</h2>
              <p>头像和用户名会显示在侧边栏，也会用于区分你的宠物屋。</p>
            </div>
          </div>
          <label className="avatar-upload-tile">
            <input type="file" accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf" onChange={uploadProfileAvatar} />
            <UserAvatar username={profile.username || "用户"} avatarUrl={profile.avatar_url} />
            <span>
              <b>{saving === "avatar" ? "上传中..." : "更换头像"}</b>
              <small>支持 JPG/JPEG 或 PDF，最大 8MB</small>
            </span>
          </label>
          <div className="fields">
            <label>用户名<input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} minLength={3} required /></label>
          </div>
          <button className="primary-btn" disabled={saving === "profile"}>{saving === "profile" ? "保存中..." : "保存资料"}</button>
        </form>
        <form className="settings-card" onSubmit={savePassword}>
          <div className="settings-card-head">
            <span>02</span>
            <div>
              <h2>登录安全</h2>
              <p>定期更新密码，保护你的宠物、记忆和微信绑定。</p>
            </div>
          </div>
          <div className="fields">
            <label>当前密码<input type="password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} minLength={6} required /></label>
            <label>新密码<input type="password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} minLength={6} required /></label>
            <label>确认新密码<input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} minLength={6} required /></label>
          </div>
          <button className="primary-btn" disabled={saving === "password"}>{saving === "password" ? "修改中..." : "修改密码"}</button>
        </form>
        <article className="settings-card compact">
          <div className="settings-card-head">
            <span>03</span>
            <div>
              <h2>账号概览</h2>
              <p>当前账号下的数据状态。</p>
            </div>
          </div>
          <dl>
            <dt>当前用户</dt>
            <dd>{account?.username || "用户"}</dd>
            <dt>宠物数量</dt>
            <dd>{count}</dd>
            <dt>当前在线</dt>
            <dd>{active?.name || "暂无"}</dd>
          </dl>
        </article>
        <article className="settings-card compact">
          <div className="settings-card-head">
            <span>04</span>
            <div>
              <h2>连接方式</h2>
              <p>网页和微信共享同一套宠物上下文。</p>
            </div>
          </div>
          <dl>
            <dt>微信模式</dt>
            <dd>OpenClaw / iLink</dd>
            <dt>消息同步</dt>
            <dd>网页与微信共用同一套宠物对话记录</dd>
            <dt>数据隔离</dt>
            <dd>宠物、会话和微信绑定都保存在当前账号下</dd>
          </dl>
        </article>
        <form className="settings-card danger-panel" onSubmit={deleteAccount}>
          <div className="settings-card-head">
            <span>!</span>
            <div>
              <h2>注销账号</h2>
              <p>删除当前账号下的宠物、聊天记录和微信绑定。</p>
            </div>
          </div>
          <p>注销后会删除当前账号下的宠物、聊天记录和微信绑定，操作不可恢复。</p>
          <div className="fields">
            <label>输入密码确认<input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} minLength={6} required /></label>
          </div>
          <button className="danger-btn" disabled={saving === "delete"}><Trash2 size={18} /> {saving === "delete" ? "注销中..." : "注销账号"}</button>
        </form>
      </div>
    </div>
  );
}

function CharacterForm({ form, setForm, save, cancel, editing }: {
  form: CharacterDraft;
  setForm: (value: CharacterDraft) => void;
  save: () => void;
  cancel: () => void;
  editing: boolean;
}) {
  const field = (key: keyof CharacterDraft) => (event: any) => setForm({
    ...form,
    [key]: event.target.type === "checkbox" ? event.target.checked : event.target.type === "range" ? Number(event.target.value) : event.target.value,
  });

  return (
    <div className="panel-stack">
      <header className="page-head">
        <div>
          <button className="back-btn" onClick={cancel}><ArrowLeft size={16} /> 返回</button>
          <h1>{editing ? "编辑宠物" : "领养 AnglePet"}</h1>
        </div>
        <button className="primary-btn" onClick={save}>保存宠物</button>
      </header>
      <div className="form-grid">
        <section className="form-panel">
          <h2>宠物资料</h2>
          <div className="fields two">
            <label>名字<input value={form.name} onChange={field("name")} placeholder="例如：奶糖" /></label>
            <label>宠物类型<input value={form.identity} onChange={field("identity")} placeholder="例如：会说话的小猫" /></label>
            <label>陪伴关系<select value={form.relationship} onChange={field("relationship")}><option>宠物</option><option>猫猫</option><option>狗狗</option><option>幻想宠物</option><option>守护伙伴</option></select></label>
            <label>头像链接<input value={form.avatar_url} onChange={field("avatar_url")} placeholder="https://..." /></label>
          </div>
        </section>
        <section className="form-panel">
          <h2>宠物性格</h2>
          <div className="fields">
            <label>性格<textarea value={form.personality} onChange={field("personality")} rows={3} /></label>
            <label>说话方式<textarea value={form.speaking_style} onChange={field("speaking_style")} rows={3} /></label>
            <label>你们的故事<textarea value={form.background_story} onChange={field("background_story")} rows={4} /></label>
            <label>第一句问候<textarea value={form.greeting} onChange={field("greeting")} rows={2} /></label>
          </div>
        </section>
        <section className="form-panel side">
          <h2>模型</h2>
          <div className="fields">
            <label>模型名<select value={form.model_name} onChange={field("model_name")}><option>gpt-4o-mini</option><option>gpt-4o</option><option>deepseek-chat</option><option>claude-3-5-sonnet</option></select></label>
            <label>回复长度<input type="number" value={form.max_reply_length} onChange={field("max_reply_length")} /></label>
            <label>亲密度温度 <b>{form.temperature}</b><input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={field("temperature")} /></label>
            <label className="toggle-row"><span>允许主动问候</span><input type="checkbox" checked={form.proactive_message_enabled} onChange={field("proactive_message_enabled")} /></label>
          </div>
        </section>
      </div>
    </div>
  );
}

function Detail({ character, back, edit, chat, activate, flash }: {
  character: Character;
  back: () => void;
  edit: () => void;
  chat: () => void;
  activate: () => void;
  flash: (value: string) => void;
}) {
  type StudioSection = "overview" | "analytics" | "memories" | "stickers" | "voice";
  const [section, setSection] = useState<StudioSection>("overview");
  const [qr, setQr] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [features, setFeatures] = useState<FeatureConfig | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  async function loadWorkspace() {
    try {
      const [analyticsData, memoryData, stickerData, featureData] = await Promise.all([
        request(`/characters/${character.id}/analytics`),
        request(`/characters/${character.id}/memories`),
        request(`/characters/${character.id}/stickers`),
        request(`/characters/${character.id}/features`),
      ]);
      setAnalytics(analyticsData);
      setMemories(memoryData);
      setStickers(stickerData);
      setFeatures(featureData);
    } catch (error: any) {
      flash(error.message || "宠物工作台加载失败");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => {
    setWorkspaceLoading(true);
    loadWorkspace();
  }, [character.id]);

  async function bind() {
    const data = await request(`/characters/${character.id}/wechat/activate`, { method: "POST" });
    setQr(data);
    setStatus("pending");
  }

  useEffect(() => {
    if (!qr || status === "connected") return;
    const timer = setInterval(async () => {
      const data = await request(`/wechat/activation/${qr.session_id}/status`);
      setStatus(data.status);
      if (data.status === "connected") {
        clearInterval(timer);
        flash("微信连接成功");
      }
    }, 1800);
    return () => clearInterval(timer);
  }, [qr, status]);

  async function saveFeatures(patch: Partial<FeatureConfig>) {
    if (!features) return;
    const next = { ...features, ...patch };
    setFeatures(next);
    const data = await request(`/characters/${character.id}/features`, {
      method: "PUT",
      body: JSON.stringify({
        stickers_enabled: next.stickers_enabled,
        sticker_mode: next.sticker_mode,
        voice_enabled: next.voice_enabled,
        voice_name: next.voice_name,
        voice_style: next.voice_style,
        voice_rate: next.voice_rate,
        voice_pitch: next.voice_pitch,
        auto_play_web: next.auto_play_web,
      }),
    });
    setFeatures(data);
    setAnalytics((current) => current ? { ...current, voice_enabled: data.voice_enabled } : current);
  }

  const tabs: { key: StudioSection | "edit"; label: string; icon: any }[] = [
    { key: "overview", label: "总览", icon: Activity },
    { key: "analytics", label: "数据分析", icon: BarChart3 },
    { key: "edit", label: "编辑设定", icon: SlidersHorizontal },
    { key: "memories", label: "记忆", icon: Brain },
    { key: "stickers", label: "表情包", icon: ImagePlus },
    { key: "voice", label: "语音", icon: Mic2 },
  ];

  return (
    <div className="pet-studio">
      <header className="studio-head">
        <button className="back-btn" onClick={back}><ArrowLeft size={17} /> 返回宠物屋</button>
        <div className="studio-title">
          <Avatar character={character} large />
          <div>
            <div className="studio-title-row">
              <h1>{character.name}</h1>
              <em className={`status ${character.status}`}>{character.status === "active" ? "微信陪伴中" : "尚未上线"}</em>
            </div>
            <p>{character.identity} · 你的{character.relationship}</p>
          </div>
        </div>
        <div className="head-actions">
          <button className="ghost-btn" onClick={bind}><QrCode size={18} /> 微信连接</button>
          <button className="primary-btn" onClick={chat}><MessageCircle size={18} /> 和 TA 聊聊</button>
        </div>
      </header>

      <nav className="studio-tabs" aria-label="宠物工作台">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} className={section === tab.key ? "active" : ""} onClick={() => tab.key === "edit" ? edit() : setSection(tab.key)}>
              <Icon size={18} /><span>{tab.label}</span>
              {tab.key === "memories" && <small>{memories.length}</small>}
              {tab.key === "stickers" && <small>{stickers.length}</small>}
            </button>
          );
        })}
      </nav>

      {workspaceLoading ? <div className="studio-loading">正在整理 {character.name} 的专属空间...</div> : (
        <>
          {section === "overview" && <StudioOverview character={character} analytics={analytics} features={features} activate={activate} bind={bind} open={setSection} edit={edit} />}
          {section === "analytics" && analytics && <AnalyticsWorkspace analytics={analytics} character={character} />}
          {section === "memories" && <MemoryWorkspace character={character} memories={memories} reload={loadWorkspace} flash={flash} />}
          {section === "stickers" && features && <StickerWorkspace character={character} stickers={stickers} features={features} saveFeatures={saveFeatures} reload={loadWorkspace} flash={flash} />}
          {section === "voice" && features && <VoiceWorkspace character={character} features={features} saveFeatures={saveFeatures} flash={flash} />}
        </>
      )}

      {qr && (
        <div className="modal">
          <div className="qr-card">
            <button onClick={() => setQr(null)}><X size={18} /></button>
            {status === "connected" ? <><Check size={52} /><h2>连接成功</h2><p>{character.name} 已经进入你的微信。</p></> : <><p className="kicker">WeChat QR</p><h2>用微信扫一扫</h2><p>扫码并在手机上确认授权。</p><img src={qr.qrcode_url} alt="微信登录二维码" /><small>{status === "scanned" ? "已扫码，请在手机确认" : "等待扫码..."}</small></>}
          </div>
        </div>
      )}
    </div>
  );
}

function StudioOverview({ character, analytics, features, activate, bind, open, edit }: {
  character: Character;
  analytics: Analytics | null;
  features: FeatureConfig | null;
  activate: () => void;
  bind: () => void;
  open: (section: "overview" | "analytics" | "memories" | "stickers" | "voice") => void;
  edit: () => void;
}) {
  const capabilities = [
    { icon: BarChart3, title: "数据分析", text: `${analytics?.total_messages || 0} 条真实对话`, action: () => open("analytics") },
    { icon: SlidersHorizontal, title: "编辑设定", text: character.personality, action: edit },
    { icon: Brain, title: "长期记忆", text: `${analytics?.memory_count || 0} 条记忆进入回复上下文`, action: () => open("memories") },
    { icon: ImagePlus, title: "宠物表情", text: `${analytics?.sticker_count || 0} 张专属表情`, action: () => open("stickers") },
    { icon: Mic2, title: "角色声音", text: features?.voice_enabled ? "已开启网页语音" : "尚未开启", action: () => open("voice") },
  ];
  return (
    <div className="studio-overview">
      <section className="overview-hero">
        <div>
          <p className="kicker">Always by your side</p>
          <h2>{character.greeting}</h2>
          <p>{character.background_story || `${character.name} 正在和你一起积累属于你们的故事。`}</p>
        </div>
        <div className="overview-actions">
          {character.status === "active" ? <span className="connection-live"><i /> 已接入微信</span> : <button className="primary-btn" onClick={activate}>设为当前宠物</button>}
          <button className="ghost-btn" onClick={bind}><QrCode size={18} /> {character.status === "active" ? "重新连接" : "扫码连接"}</button>
        </div>
      </section>
      <section className="overview-stats">
        <article><CalendarDays /><span>相伴时间</span><b>{analytics?.created_days || 1}<small> 天</small></b></article>
        <article><MessageCircle /><span>累计对话</span><b>{analytics?.total_messages || 0}<small> 条</small></b></article>
        <article><Brain /><span>长期记忆</span><b>{analytics?.memory_count || 0}<small> 条</small></b></article>
        <article><Activity /><span>回复成功率</span><b>{analytics?.success_rate ?? 100}<small>%</small></b></article>
      </section>
      <section className="capability-grid">
        {capabilities.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.title} onClick={item.action}>
              <span><Icon size={20} /></span>
              <div><b>{item.title}</b><p>{item.text}</p></div>
              <ChevronRight size={18} />
            </button>
          );
        })}
      </section>
    </div>
  );
}

function AnalyticsWorkspace({ analytics, character }: { analytics: Analytics; character: Character }) {
  const max = Math.max(1, ...analytics.daily.map((item) => item.count));
  const coords = analytics.daily.map((item, index) => ({
    x: 34 + index * (692 / Math.max(1, analytics.daily.length - 1)),
    y: 190 - (item.count / max) * 145,
    item,
  }));
  const points = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const summary = [
    { label: "相伴时长", value: `${analytics.created_days} 天` },
    { label: "累计消息", value: `${analytics.total_messages} 条` },
    { label: "你发送", value: `${analytics.sent_messages} 条` },
    { label: `${character.name} 回复`, value: `${analytics.reply_messages} 条` },
  ];
  return (
    <div className="analytics-workspace">
      <header className="workspace-heading">
        <div><p className="kicker">Conversation insights</p><h2>数据分析</h2></div>
        <p>所有数据都来自 {character.name} 的真实网页与微信会话。</p>
      </header>
      <div className="analytics-metrics">
        {summary.map((item) => <article key={item.label}><span>{item.label}</span><b>{item.value}</b></article>)}
      </div>
      <div className="analytics-layout">
        <section className="chart-panel">
          <div className="panel-title"><div><h3>最近 14 天对话</h3><p>按发送与回复消息合计</p></div><BarChart3 /></div>
          <svg viewBox="0 0 760 230" role="img" aria-label="最近十四天消息趋势">
            <line x1="34" y1="190" x2="726" y2="190" />
            <line x1="34" y1="118" x2="726" y2="118" />
            <line x1="34" y1="45" x2="726" y2="45" />
            <polyline points={points} />
            {coords.map(({ x, y, item }) => <circle key={item.date} cx={x} cy={y} r="5"><title>{item.date}: {item.count} 条</title></circle>)}
          </svg>
          <div className="chart-labels"><span>{analytics.daily[0]?.date.slice(5)}</span><span>{analytics.daily[6]?.date.slice(5)}</span><span>{analytics.daily[13]?.date.slice(5)}</span></div>
        </section>
        <aside className="conversation-summary">
          <h3>对话概览</h3>
          <dl>
            <div><dt>最近一条消息</dt><dd>{analytics.last_message_at ? new Date(analytics.last_message_at).toLocaleString("zh-CN") : "暂无"}</dd></div>
            <div><dt>日均对话</dt><dd>{analytics.daily_average} 条</dd></div>
            <div><dt>网页 / 微信</dt><dd>{analytics.web_messages} / {analytics.wechat_messages}</dd></div>
            <div><dt>平均响应</dt><dd>{analytics.average_latency_ms ? `${analytics.average_latency_ms} ms` : "暂无"}</dd></div>
            <div><dt>累计 Token</dt><dd>{analytics.total_tokens.toLocaleString()}</dd></div>
            <div><dt>回复成功率</dt><dd>{analytics.success_rate}%</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

const blankMemory = { title: "", content: "", category: "daily", importance: 3, is_pinned: false };

function MemoryWorkspace({ character, memories, reload, flash }: {
  character: Character;
  memories: MemoryItem[];
  reload: () => Promise<void>;
  flash: (value: string) => void;
}) {
  const [draft, setDraft] = useState(blankMemory);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.content.trim()) return flash("请把记忆标题和内容写完整");
    setBusy("save");
    try {
      await request(`/characters/${character.id}/memories${editing ? `/${editing}` : ""}`, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(draft),
      });
      const wasEditing = !!editing;
      setDraft(blankMemory);
      setEditing(null);
      await reload();
      flash(wasEditing ? "记忆已更新" : `${character.name} 已经记住了`);
    } catch (error: any) {
      flash(error.message || "保存失败");
    } finally {
      setBusy("");
    }
  }

  async function extract() {
    setBusy("extract");
    try {
      await request(`/characters/${character.id}/memories/extract`, { method: "POST" });
      await reload();
      flash("已从最近对话整理出一条记忆");
    } catch (error: any) {
      flash(error.message || "暂时无法整理对话");
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string) {
    await request(`/characters/${character.id}/memories/${id}`, { method: "DELETE" });
    if (editing === id) {
      setEditing(null);
      setDraft(blankMemory);
    }
    await reload();
    flash("这条记忆已删除");
  }

  function editItem(item: MemoryItem) {
    setEditing(item.id);
    setDraft({
      title: item.title,
      content: item.content,
      category: item.category,
      importance: item.importance,
      is_pinned: item.is_pinned,
    });
  }

  return (
    <div className="memory-workspace">
      <header className="workspace-heading">
        <div><p className="kicker">Long-term memory</p><h2>{character.name} 的记忆</h2></div>
        <button className="ghost-btn" onClick={extract} disabled={!!busy}><Sparkles size={17} /> {busy === "extract" ? "正在整理..." : "从最近对话整理"}</button>
      </header>
      <section className="memory-intro">
        <Brain />
        <div><h3>记住真正重要的事</h3><p>置顶与高重要度记忆会优先进入网页和微信的回复上下文。宠物会自然地延续这些细节，不会机械复述。</p></div>
        <strong>{memories.length}<small> 条长期记忆</small></strong>
      </section>
      <div className="memory-layout">
        <form className="memory-editor" onSubmit={submit}>
          <div className="panel-title"><div><h3>{editing ? "编辑记忆" : "添加核心记忆"}</h3><p>最多 3000 字，保持具体、真实。</p></div><Save /></div>
          <label>记忆标题<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="例如：最喜欢的散步路线" /></label>
          <label>记忆内容<textarea rows={7} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder={`${character.name} 应该长期记住什么？`} /></label>
          <div className="memory-fields">
            <label>分类<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}><option value="daily">日常</option><option value="relationship">关系</option><option value="preference">偏好</option><option value="promise">约定</option></select></label>
            <label>重要度<select value={draft.importance} onChange={(e) => setDraft({ ...draft, importance: Number(e.target.value) })}><option value={1}>1 · 普通</option><option value={2}>2</option><option value={3}>3 · 重要</option><option value={4}>4</option><option value={5}>5 · 核心</option></select></label>
          </div>
          <label className="check-row"><input type="checkbox" checked={draft.is_pinned} onChange={(e) => setDraft({ ...draft, is_pinned: e.target.checked })} /><span>置顶这条记忆，优先用于回复</span></label>
          <div className="editor-actions">
            <button className="primary-btn" disabled={!!busy}><Save size={17} /> {busy === "save" ? "保存中..." : editing ? "更新记忆" : "保存记忆"}</button>
            {editing && <button type="button" className="ghost-btn" onClick={() => { setEditing(null); setDraft(blankMemory); }}>取消编辑</button>}
          </div>
        </form>
        <section className="memory-list">
          {memories.length === 0 ? (
            <div className="workspace-empty"><Brain /><h3>还没有长期记忆</h3><p>手动添加，或让 AnglePet 从最近的对话中整理一条。</p></div>
          ) : memories.map((item) => (
            <article key={item.id} className={editing === item.id ? "editing" : ""}>
              <button className="memory-main" onClick={() => editItem(item)}>
                <span className="memory-meta">{item.is_pinned && <Pin size={14} />} {item.category === "daily" ? "日常" : item.category === "relationship" ? "关系" : item.category === "preference" ? "偏好" : "约定"} · 重要度 {item.importance}</span>
                <b>{item.title}</b>
                <p>{item.content}</p>
                <small>{item.source === "conversation" ? "从对话整理" : "手动记录"} · {new Date(item.updated_at).toLocaleDateString("zh-CN")}</small>
              </button>
              <button className="icon-danger" onClick={() => remove(item.id)} aria-label="删除记忆"><Trash2 size={17} /></button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function StickerWorkspace({ character, stickers, features, saveFeatures, reload, flash }: {
  character: Character;
  stickers: StickerItem[];
  features: FeatureConfig;
  saveFeatures: (patch: Partial<FeatureConfig>) => Promise<void>;
  reload: () => Promise<void>;
  flash: (value: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [triggers, setTriggers] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return flash("请先选择一张表情图片");
    setBusy(true);
    try {
      await uploadSticker(character.id, file, name || file.name.replace(/\.[^.]+$/, ""), triggers);
      setFile(null);
      setName("");
      setTriggers("");
      await reload();
      flash("专属表情已加入");
    } catch (error: any) {
      flash(error.message || "表情上传失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await request(`/characters/${character.id}/stickers/${id}`, { method: "DELETE" });
    await reload();
    flash("表情已删除");
  }

  async function send(item: StickerItem) {
    await request(`/characters/${character.id}/stickers/${item.id}/send`, { method: "POST" });
    await reload();
    flash(`已把“${item.name}”发送到网页聊天`);
  }

  return (
    <div className="sticker-workspace">
      <header className="workspace-heading">
        <div><p className="kicker">Pet expressions</p><h2>{character.name} 的表情包</h2></div>
        <label className="switch-control"><span>{features.stickers_enabled ? "已开启" : "已关闭"}</span><input type="checkbox" checked={features.stickers_enabled} onChange={(e) => saveFeatures({ stickers_enabled: e.target.checked })} /><i /></label>
      </header>
      <section className="expression-modes">
        {[
          { key: "pet", title: "宠物语气", text: "由角色性格决定何时表达情绪" },
          { key: "classic", title: "经典表情", text: "使用 AnglePet 的克制通用表达" },
          { key: "custom", title: "专属图库", text: "只使用你为这只宠物上传的图片" },
        ].map((mode) => (
          <button key={mode.key} className={features.sticker_mode === mode.key ? "active" : ""} onClick={() => saveFeatures({ sticker_mode: mode.key })}>
            <span>{features.sticker_mode === mode.key ? <Check /> : <ImagePlus />}</span>
            <b>{mode.title}</b><p>{mode.text}</p>
          </button>
        ))}
      </section>
      <div className="sticker-layout">
        <form className="sticker-uploader" onSubmit={submit}>
          <div className="panel-title"><div><h3>添加专属表情</h3><p>支持 JPG、PNG、WEBP、GIF，最大 5MB。</p></div><Upload /></div>
          <label className="drop-file">
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <ImagePlus /><b>{file ? file.name : "选择表情图片"}</b><span>点击选择本地文件</span>
          </label>
          <label>表情名称<input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：开心摇尾巴" /></label>
          <label>触发词<input value={triggers} onChange={(e) => setTriggers(e.target.value)} placeholder="开心, 回家, 想你（用逗号分隔）" /></label>
          <button className="primary-btn" disabled={busy}><Upload size={17} /> {busy ? "上传中..." : "加入表情包"}</button>
        </form>
        <section className="sticker-gallery">
          {stickers.length === 0 ? (
            <div className="workspace-empty"><ImagePlus /><h3>还没有专属表情</h3><p>上传真实宠物照片、动图或你喜欢的表情。</p></div>
          ) : stickers.map((item) => (
            <article key={item.id}>
              <div className="sticker-image"><img src={item.image_url} alt={item.name} /></div>
              <div><b>{item.name}</b><p>{item.trigger_words || "未设置触发词"}</p><small>已使用 {item.usage_count} 次</small></div>
              <div className="sticker-actions">
                <button onClick={() => send(item)} aria-label="发送到聊天"><Send size={16} /></button>
                <button onClick={() => remove(item.id)} aria-label="删除表情"><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function VoiceWorkspace({ character, features, saveFeatures, flash }: {
  character: Character;
  features: FeatureConfig;
  saveFeatures: (patch: Partial<FeatureConfig>) => Promise<void>;
  flash: (value: string) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  function preview() {
    if (!("speechSynthesis" in window)) return flash("当前浏览器不支持语音试听");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${character.name}在这里。今天也想好好陪你说说话。`);
    const voice = voices.find((item) => item.name === features.voice_name);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "zh-CN";
    utterance.rate = features.voice_rate;
    utterance.pitch = features.voice_pitch;
    window.speechSynthesis.speak(utterance);
  }

  const recommended = voices.filter((voice) => /^zh|Chinese|Xiaoxiao|Yun/i.test(`${voice.lang} ${voice.name}`));
  const visibleVoices = (recommended.length ? recommended : voices).slice(0, 12);
  return (
    <div className="voice-workspace">
      <header className="workspace-heading">
        <div><p className="kicker">Character voice</p><h2>{character.name} 的声音</h2></div>
        <label className="switch-control"><span>{features.voice_enabled ? "已开启" : "已关闭"}</span><input type="checkbox" checked={features.voice_enabled} onChange={(e) => saveFeatures({ voice_enabled: e.target.checked })} /><i /></label>
      </header>
      <section className="voice-current">
        <div className="voice-current-icon"><Volume2 /></div>
        <div><span>正在使用</span><h3>{features.voice_name || "浏览器默认中文声音"}</h3><p>网页聊天可自动朗读宠物回复，声音配置只属于 {character.name}。</p></div>
        <button className="primary-btn" onClick={preview}><Play size={17} /> 试听声音</button>
      </section>
      <div className="voice-layout">
        <section className="voice-options">
          <div className="panel-title"><div><h3>选择声音</h3><p>声音列表来自当前浏览器和操作系统。</p></div><Mic2 /></div>
          <div className="voice-list">
            {visibleVoices.length === 0 ? <p className="voice-unavailable">当前浏览器还没有返回可用声音，请稍候刷新。</p> : visibleVoices.map((voice) => (
              <button key={`${voice.name}-${voice.lang}`} className={features.voice_name === voice.name ? "active" : ""} onClick={() => saveFeatures({ voice_name: voice.name })}>
                <span><Volume2 size={17} /></span>
                <div><b>{voice.name}</b><small>{voice.lang} {voice.localService ? "· 本地" : "· 在线"}</small></div>
                {features.voice_name === voice.name && <Check size={18} />}
              </button>
            ))}
          </div>
        </section>
        <section className="voice-tuning">
          <div className="panel-title"><div><h3>声音细节</h3><p>调整后可以随时试听。</p></div><SlidersHorizontal /></div>
          <label>说话速度 <b>{features.voice_rate.toFixed(1)}×</b><input type="range" min=".6" max="1.6" step=".1" value={features.voice_rate} onChange={(e) => saveFeatures({ voice_rate: Number(e.target.value) })} /></label>
          <label>声音音高 <b>{features.voice_pitch.toFixed(1)}</b><input type="range" min=".5" max="1.8" step=".1" value={features.voice_pitch} onChange={(e) => saveFeatures({ voice_pitch: Number(e.target.value) })} /></label>
          <div className="voice-styles">
            <span>表达气质</span>
            {["warm", "bright", "calm"].map((style) => <button key={style} className={features.voice_style === style ? "active" : ""} onClick={() => saveFeatures({ voice_style: style })}>{style === "warm" ? "温暖" : style === "bright" ? "明快" : "安静"}</button>)}
          </div>
          <label className="check-row"><input type="checkbox" checked={features.auto_play_web} onChange={(e) => saveFeatures({ auto_play_web: e.target.checked })} /><span>网页聊天收到回复后自动朗读</span></label>
          <button className="ghost-btn" onClick={preview}><Play size={17} /> 用当前参数试听</button>
        </section>
      </div>
    </div>
  );
}

function ChatEmpty({ chars, choose }: { chars: Character[]; choose: (character: Character) => void }) {
  return (
    <div className="panel-stack">
      <header className="page-head">
        <div>
          <p className="kicker">Pet dialogue</p>
          <h1>宠物对话</h1>
        </div>
      </header>
      <div className="empty-box">
        <MessageCircle />
        <h2>先选择一只宠物</h2>
        <p>网页聊天和微信消息会同步到同一套对话记录。</p>
      </div>
      {chars.length > 0 && (
        <div className="character-table">
          {chars.map((item) => (
            <button key={item.id} onClick={() => choose(item)}>
              <Avatar character={item} />
              <span><b>{item.name}</b><small>{item.identity} · {item.relationship}</small></span>
              <em className={`status ${item.status}`}>{item.status === "active" ? "已连接" : "未激活"}</em>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chat({ character }: { character: Character }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [features, setFeatures] = useState<FeatureConfig | null>(null);

  async function load() {
    const [messageData, featureData] = await Promise.all([
      request(`/characters/${character.id}/messages`),
      request(`/characters/${character.id}/features`),
    ]);
    setMessages(messageData);
    setFeatures(featureData);
  }

  useEffect(() => { load(); }, [character.id]);

  async function send() {
    if (!text.trim() || sending) return;
    const content = text;
    setText("");
    setMessages((items) => [...items, { id: Date.now(), sender_type: "user", content, created_at: new Date().toISOString() }]);
    setSending(true);
    try {
      const data = await request(`/characters/${character.id}/chat`, { method: "POST", body: JSON.stringify({ content }) });
      setMessages((items) => [...items, data]);
      if (features?.voice_enabled && features.auto_play_web && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(data.content);
        const voice = window.speechSynthesis.getVoices().find((item) => item.name === features.voice_name);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || "zh-CN";
        utterance.rate = features.voice_rate;
        utterance.pitch = features.voice_pitch;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-panel">
      <header><Avatar character={character} /><div><h1>{character.name}</h1><p>网页对话 · 微信消息会同步到这里</p></div>{features?.voice_enabled && <span className="chat-voice-status"><Volume2 size={15} /> 语音已开启</span>}</header>
      <div className="messages">
        {messages.length === 0 && <p className="empty-chat">{character.greeting}</p>}
        {messages.map((message) => {
          const stickerUrl = message.content?.startsWith("__ANGLEPET_STICKER__:") ? message.content.slice("__ANGLEPET_STICKER__:".length) : "";
          return <div key={message.id} className={`msg ${message.sender_type} ${stickerUrl ? "sticker-message" : ""}`}>{stickerUrl ? <img src={stickerUrl} alt="宠物表情" /> : <p>{message.content}</p>}<small>{message.channel || "web"} · {new Date(message.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small></div>;
        })}
        {sending && <div className="typing-dot"><i /><i /><i /></div>}
      </div>
      <div className="composer"><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`给 ${character.name} 发消息...`} /><button onClick={send}><Send size={18} /></button></div>
    </div>
  );
}

type AdminConfig = {
  llm_base_url: string;
  llm_api_key_set: boolean;
  llm_default_model: string;
  openclaw_base_url: string;
  openclaw_token_set: boolean;
  wechat_adapter: string;
  wechat_poll_enabled: boolean;
  frontend_url: string;
};

type AdminUser = {
  id: string;
  username: string;
  avatar_url: string;
  is_admin: boolean;
  created_at: string;
  characters: number;
  messages: number;
  input_tokens: number;
  output_tokens: number;
  last_message_at?: string | null;
};

type AdminOverview = {
  totals: {
    users: number;
    characters: number;
    messages: number;
    wechat_connected: number;
    input_tokens: number;
    output_tokens: number;
    llm_configured: boolean;
  };
  recent_messages: Array<{
    id: string;
    user_id: string;
    character_id: string;
    sender_type: string;
    channel: string;
    model_name: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
    status: string;
    created_at: string;
  }>;
};

function AdminPanel({ flash }: { flash: (value: string) => void }) {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState({
    llm_base_url: "",
    llm_api_key: "",
    llm_default_model: "",
    openclaw_base_url: "",
    openclaw_token: "",
    wechat_adapter: "openclaw",
    wechat_poll_enabled: true,
    frontend_url: "",
  });
  const [saving, setSaving] = useState("");

  async function loadAdmin() {
    const [configData, overviewData, usersData] = await Promise.all([
      request("/admin/config"),
      request("/admin/overview"),
      request("/admin/users"),
    ]);
    setConfig(configData);
    setOverview(overviewData);
    setUsers(usersData);
    setForm({
      llm_base_url: configData.llm_base_url || "",
      llm_api_key: "",
      llm_default_model: configData.llm_default_model || "",
      openclaw_base_url: configData.openclaw_base_url || "",
      openclaw_token: "",
      wechat_adapter: configData.wechat_adapter || "openclaw",
      wechat_poll_enabled: !!configData.wechat_poll_enabled,
      frontend_url: configData.frontend_url || "",
    });
  }

  useEffect(() => {
    loadAdmin().catch((err) => flash((err as Error).message));
  }, []);

  async function saveConfig(event: React.FormEvent) {
    event.preventDefault();
    setSaving("config");
    try {
      const data = await request("/admin/config", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setConfig(data);
      setForm((value) => ({ ...value, llm_api_key: "", openclaw_token: "" }));
      flash("系统参数已保存");
      await loadAdmin();
    } finally {
      setSaving("");
    }
  }

  async function toggleAdmin(user: AdminUser) {
    const data = await request(`/admin/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({ username: user.username, is_admin: !user.is_admin }),
    });
    setUsers((items) => items.map((item) => item.id === user.id ? { ...item, is_admin: data.is_admin } : item));
    flash(data.is_admin ? "已授予管理员权限" : "已取消管理员权限");
  }

  async function renameUser(user: AdminUser) {
    const username = window.prompt("新的用户名", user.username);
    if (!username || username === user.username) return;
    const data = await request(`/admin/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({ username, is_admin: user.is_admin }),
    });
    setUsers((items) => items.map((item) => item.id === user.id ? { ...item, username: data.username } : item));
    flash("用户名已更新");
  }

  async function resetPassword(user: AdminUser) {
    const password = window.prompt(`给 ${user.username} 设置新密码，至少 6 位`);
    if (!password) return;
    await request(`/admin/users/${user.id}/password`, {
      method: "PUT",
      body: JSON.stringify({ new_password: password }),
    });
    flash("密码已重置");
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`确定删除用户 ${user.username}？该用户的宠物、聊天记录和微信绑定都会删除。`)) return;
    await request(`/admin/users/${user.id}`, { method: "DELETE" });
    setUsers((items) => items.filter((item) => item.id !== user.id));
    await loadAdmin();
    flash("用户已删除");
  }

  const totals = overview?.totals;

  return (
    <div className="panel-stack admin-page">
      <header className="page-head">
        <div>
          <p className="kicker">Admin center</p>
          <h1>管理后台</h1>
        </div>
        <button className="ghost-btn" onClick={() => loadAdmin()}><Activity size={18} /> 刷新数据</button>
      </header>

      <section className="admin-hero">
        <div>
          <p className="kicker"><ShieldCheck size={15} /> System control</p>
          <h2>管理员参数、用户账号和使用情况集中管理。</h2>
          <p>默认管理员账号为 admin / admin。上线前建议先修改管理员密码，并补齐真实 LLM API Key。</p>
        </div>
        <div className={`admin-health ${totals?.llm_configured ? "ok" : "warn"}`}>
          <b>{totals?.llm_configured ? "LLM 已配置" : "LLM 未配置"}</b>
          <span>{totals?.llm_configured ? "聊天会调用真实模型" : "当前仍会走 mock 陪伴回复"}</span>
        </div>
      </section>

      <div className="admin-metrics">
        <article><Users /><span>用户</span><b>{totals?.users ?? "-"}</b></article>
        <article><PawPrint /><span>宠物</span><b>{totals?.characters ?? "-"}</b></article>
        <article><MessageCircle /><span>消息</span><b>{totals?.messages ?? "-"}</b></article>
        <article><QrCode /><span>微信连接</span><b>{totals?.wechat_connected ?? "-"}</b></article>
        <article><Activity /><span>Tokens</span><b>{totals ? totals.input_tokens + totals.output_tokens : "-"}</b></article>
      </div>

      <div className="admin-grid">
        <form className="settings-card admin-config-card" onSubmit={saveConfig}>
          <div className="settings-card-head">
            <span><KeyRound size={19} /></span>
            <div>
              <h2>系统参数</h2>
              <p>修改后会写入后端 .env，并立刻更新当前进程里的配置。</p>
            </div>
          </div>
          <div className="fields two">
            <label>LLM Base URL<input value={form.llm_base_url} onChange={(e) => setForm({ ...form, llm_base_url: e.target.value })} /></label>
            <label>默认模型<input value={form.llm_default_model} onChange={(e) => setForm({ ...form, llm_default_model: e.target.value })} /></label>
            <label>LLM API Key<input type="password" value={form.llm_api_key} onChange={(e) => setForm({ ...form, llm_api_key: e.target.value })} placeholder={config?.llm_api_key_set ? "已配置，留空不修改" : "未配置，请填入 Key"} /></label>
            <label>OpenClaw Token<input type="password" value={form.openclaw_token} onChange={(e) => setForm({ ...form, openclaw_token: e.target.value })} placeholder={config?.openclaw_token_set ? "已配置，留空不修改" : "未配置，可填入 token"} /></label>
            <label>OpenClaw Base URL<input value={form.openclaw_base_url} onChange={(e) => setForm({ ...form, openclaw_base_url: e.target.value })} /></label>
            <label>前端地址<input value={form.frontend_url} onChange={(e) => setForm({ ...form, frontend_url: e.target.value })} /></label>
            <label>微信适配器<select value={form.wechat_adapter} onChange={(e) => setForm({ ...form, wechat_adapter: e.target.value })}><option value="openclaw">openclaw</option><option value="mock">mock</option></select></label>
            <label className="toggle-row"><span>微信轮询</span><input type="checkbox" checked={form.wechat_poll_enabled} onChange={(e) => setForm({ ...form, wechat_poll_enabled: e.target.checked })} /></label>
          </div>
          <button className="primary-btn" disabled={saving === "config"}>{saving === "config" ? "保存中..." : "保存系统参数"}</button>
        </form>

        <section className="settings-card admin-users-card">
          <div className="settings-card-head">
            <span><Users size={19} /></span>
            <div>
              <h2>用户管理</h2>
              <p>查看用户宠物、消息量和 token 使用，也可以重置密码或删除账号。</p>
            </div>
          </div>
          <div className="admin-user-list">
            {users.map((user) => (
              <article key={user.id} className="admin-user-row">
                <UserAvatar username={user.username} avatarUrl={user.avatar_url} />
                <div className="admin-user-main">
                  <b>{user.username}{user.is_admin ? " · 管理员" : ""}</b>
                  <span>{user.characters} 只宠物 · {user.messages} 条消息 · {user.input_tokens + user.output_tokens} tokens</span>
                  <small>最近消息：{user.last_message_at ? new Date(user.last_message_at).toLocaleString("zh-CN") : "暂无"}</small>
                </div>
                <div className="admin-user-actions">
                  <button onClick={() => renameUser(user)}>改名</button>
                  <button onClick={() => resetPassword(user)}>重置密码</button>
                  <button onClick={() => toggleAdmin(user)}>{user.is_admin ? "取消管理员" : "设为管理员"}</button>
                  <button className="danger-link" onClick={() => deleteUser(user)}>删除</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="settings-card admin-log-card">
        <div className="settings-card-head">
          <span><Activity size={19} /></span>
          <div>
            <h2>最近使用情况</h2>
            <p>显示最近 20 条模型调用和微信/网页消息。</p>
          </div>
        </div>
        <div className="admin-log-table">
          <div className="admin-log-head"><span>时间</span><span>来源</span><span>角色</span><span>模型</span><span>Tokens</span><span>延迟</span><span>状态</span></div>
          {overview?.recent_messages.map((item) => (
            <div key={item.id}>
              <span>{new Date(item.created_at).toLocaleString("zh-CN")}</span>
              <span>{item.channel || "web"}</span>
              <span>{item.sender_type}</span>
              <span>{item.model_name || "-"}</span>
              <span>{item.input_tokens + item.output_tokens}</span>
              <span>{item.latency_ms ? `${item.latency_ms}ms` : "-"}</span>
              <span>{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Avatar({ character, large = false }: { character: Pick<Character, "name" | "avatar_url">; large?: boolean }) {
  return (
    <span className={`avatar ${large ? "large" : ""}`}>
      {character.avatar_url ? <img src={character.avatar_url} alt={character.name} /> : character.name?.[0] || "A"}
    </span>
  );
}

function UserAvatar({ username, avatarUrl }: { username: string; avatarUrl: string }) {
  if (isPdfUrl(avatarUrl)) {
    return <span className="user-avatar pdf-avatar">PDF</span>;
  }
  return (
    <span className="user-avatar">
      {avatarUrl ? <img src={avatarUrl} alt={username} /> : username?.[0]?.toUpperCase() || "U"}
    </span>
  );
}
