import type { Metadata } from "next";
import {
  CheckCircle2,
  Database,
  LockKeyhole,
  MessageCircle,
  RadioTower,
  ServerCog,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "../public-chrome";

export const metadata: Metadata = {
  title: "安全与合规性说明 - AnglePet",
  description: "了解 AnglePet 的微信接入方式、权限边界、聊天隐私、数据隔离与服务边界。",
};

const policySections = [
  {
    id: "connection",
    icon: RadioTower,
    title: "接入方式",
    text: "AnglePet 的微信连接基于 openclaw-weixin / iLink 提供的扫码授权与消息接口。它不同于通过 Hook、模拟点击、抓包或 PC 微信自动化实现的消息收发方式，只在微信开放并明确授权的能力范围内完成扫码接入、消息轮询、回复发送和连接状态管理。",
  },
  {
    id: "permission",
    icon: LockKeyhole,
    title: "权限与账号安全",
    text: "扫码确认建立的是受限的宠物消息通道，不是对个人微信的完整控制权限。AnglePet 不要求远程控制你的电脑，也不会接管微信客户端。你可以在宠物详情页查看连接状态，并在不再使用时停用当前绑定。",
  },
  {
    id: "privacy",
    icon: MessageCircle,
    title: "聊天隐私",
    text: "AnglePet 只处理授权后发送给宠物联系人的消息，无法读取你的其他微信聊天、联系人列表或朋友圈内容。请仍然避免在与 AI 的对话中发送密码、证件号码、支付凭据等不必要的敏感信息。",
  },
  {
    id: "data",
    icon: Database,
    title: "数据与账号隔离",
    text: "宠物设定、长期记忆、会话记录、表情包配置和微信绑定都归属于当前 AnglePet 账号。不同用户之间不共用宠物上下文；账号资料、密码修改、头像替换和注销操作可以在设置页面管理。",
  },
  {
    id: "stability",
    icon: ServerCog,
    title: "服务稳定性",
    text: "消息回复依赖本地服务、网络连接、大模型接口和微信开放能力。任一环节出现波动时都可能造成访问异常或回复延迟。AnglePet 会优先保障登录、宠物数据、扫码绑定与消息收发等核心链路可检查、可恢复。",
  },
  {
    id: "content",
    icon: ShieldCheck,
    title: "模型内容与责任边界",
    text: "宠物回复由大模型根据角色设定、长期记忆和会话上下文生成，可能出现偏差、遗漏或不符合预期的内容。生成结果仅用于陪伴与交流，不应替代医疗、法律、金融或其他专业人士的判断。",
  },
  {
    id: "maintenance",
    icon: Wrench,
    title: "持续维护",
    text: "AnglePet 会持续改进接口兼容、错误诊断、数据管理和跨端体验。当第三方协议、模型能力或微信开放范围发生变化时，我们会根据实际能力调整功能，并尽量清楚说明受影响的范围。",
  },
];

export default function AboutPage() {
  return (
    <main className="public-document-site">
      <PublicHeader active="about" />

      <header className="policy-hero">
        <div className="policy-hero-main">
          <p className="kicker"><ShieldCheck size={15} /> Safety & compliance</p>
          <h1>安全与合规性说明</h1>
        </div>
        <div className="policy-hero-note">
          <span>OUR BOUNDARY</span>
          <p>
            AnglePet 只在明确授权的范围内连接微信，并把数据用途、能力边界和潜在风险说清楚。
          </p>
          <div className="policy-status"><i /> 当前接入方式：openclaw-weixin / iLink</div>
        </div>
      </header>

      <section className="policy-summary">
        <div className="policy-summary-icon"><ShieldCheck size={34} /></div>
        <div>
          <span>核心原则</span>
          <h2>不接管微信，只回应宠物消息。</h2>
          <p>
            扫码授权建立的是受限消息通道，不是个人微信的完整访问权限。
            你始终可以查看宠物记忆、管理账号资料或停用微信连接。
          </p>
        </div>
        <div className="policy-checks">
          <b><CheckCircle2 size={17} /> 不使用 Hook</b>
          <b><CheckCircle2 size={17} /> 不读取其他会话</b>
          <b><CheckCircle2 size={17} /> 用户数据相互隔离</b>
          <b><CheckCircle2 size={17} /> 连接可随时停用</b>
        </div>
      </section>

      <div className="policy-layout">
        <aside className="policy-toc">
          <span>本页目录</span>
          {policySections.map((section, index) => (
            <a href={`#${section.id}`} key={section.id}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              {section.title}
            </a>
          ))}
        </aside>

        <article className="policy-document">
          {policySections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section id={section.id} key={section.id}>
                <div className="policy-section-mark">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Icon size={23} />
                </div>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.text}</p>
                </div>
              </section>
            );
          })}
        </article>
      </div>

      <section className="policy-closing">
        <span>CONTROL STAYS WITH YOU</span>
        <h2>你的宠物、记忆和连接，<br />都应当由你管理。</h2>
        <p>需要进一步了解具体功能时，可前往常见问题页面查看操作说明与当前能力边界。</p>
        <a href="/faq">查看常见问题</a>
      </section>

      <PublicFooter />
    </main>
  );
}
