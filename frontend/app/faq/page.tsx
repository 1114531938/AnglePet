import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, CircleHelp, MessageCircleQuestion } from "lucide-react";
import { PublicFooter, PublicHeader } from "../public-chrome";

export const metadata: Metadata = {
  title: "常见问题 - AnglePet",
  description: "查看 AnglePet 关于微信接入、宠物设定、长期记忆、语音、表情包和账号数据的常见问题。",
};

const faqGroups = [
  {
    id: "start",
    label: "开始使用",
    description: "认识 AnglePet，并把第一只宠物带回家。",
    items: [
      {
        question: "AnglePet 是什么？",
        answer: "AnglePet 是一个宠物对话与长期陪伴工具。你可以设定宠物的名字、物种、性格和关系，让它在网页与微信中保持同一套设定、记忆和对话历史。",
      },
      {
        question: "可以直接使用预设宠物吗？",
        answer: "可以。陪伴模型页面提供不同品种和性格的猫猫狗狗，选择后可以直接加入宠物屋，再继续修改名字、关系、故事和表达方式。",
      },
      {
        question: "可以创建多只宠物吗？",
        answer: "可以。每只宠物都有独立的设定、记忆、表情包和数据分析。为了避免微信消息混淆，同一时间建议只让一只宠物保持激活状态。",
      },
    ],
  },
  {
    id: "wechat",
    label: "微信接入",
    description: "关于扫码授权、消息回复和连接状态。",
    items: [
      {
        question: "怎样把宠物接入微信？",
        answer: "登录宠物屋，进入宠物详情页并选择微信接入。使用微信扫描页面生成的真实二维码，在手机上确认授权后，宠物就可以通过微信 AI 联系人收发消息。",
      },
      {
        question: "微信扫码接入安全吗？",
        answer: "AnglePet 使用 openclaw-weixin / iLink 授权链路，不使用 Hook、模拟点击或 PC 微信自动化，也不会索取电脑控制权。它只能处理开放能力明确交付给宠物机器人的消息。",
      },
      {
        question: "为什么宠物偶尔没有立即回复？",
        answer: "消息需要依次经过微信投递、AnglePet 轮询、模型生成和回复发送。网络或模型服务繁忙时可能短暂延迟；若长时间没有回复，请检查后端服务、宠物连接状态和管理员模型配置。",
      },
      {
        question: "怎样断开微信或切换另一只宠物？",
        answer: "在当前宠物详情页停用微信连接，再打开另一只宠物重新生成二维码并扫码绑定。重新绑定前请确认旧连接已经停止，避免消息被错误路由。",
      },
    ],
  },
  {
    id: "companion",
    label: "陪伴与记忆",
    description: "管理宠物的性格、记忆和表达方式。",
    items: [
      {
        question: "可以随时修改宠物设定吗？",
        answer: "可以。宠物工作台的“编辑设定”可以修改名字、身份、性格、关系、故事、开场白和模型参数，保存后会用于后续网页与微信回复。",
      },
      {
        question: "宠物会记住什么？我可以修改吗？",
        answer: "宠物可以从近期对话中整理长期记忆，也支持手动新增、编辑和删除。记忆内容会进入宠物的回复上下文，并且始终可以在工作台中查看。",
      },
      {
        question: "语音和表情包目前怎样使用？",
        answer: "表情包可以上传到每只宠物的专属素材库并用于网页对话。语音支持在网页端选择系统音色、调节语速语调、试听和自动朗读；微信端当前仍以文本回复为主。",
      },
      {
        question: "网页和微信会共用聊天记录吗？",
        answer: "会。网页与微信消息会写入同一只宠物的会话历史，方便在宠物对话页面查看、调试并继续交流。",
      },
    ],
  },
  {
    id: "account",
    label: "账号与数据",
    description: "头像、密码、账号隔离与注销操作。",
    items: [
      {
        question: "怎样修改头像、用户名或密码？",
        answer: "进入宠物屋左侧的“设置”页面，可以上传 JPG、JPEG 或 PDF 头像，修改用户名，并通过当前密码设置新密码。",
      },
      {
        question: "不同用户的宠物数据会混在一起吗？",
        answer: "不会。宠物设定、长期记忆、会话记录、微信绑定和素材都归属于当前账号，后端按账号检查数据访问权限。",
      },
      {
        question: "怎样注销账号？",
        answer: "在设置页面的账号管理区域执行注销。注销会删除当前账号及其宠物、记忆、会话和连接信息，该操作不可恢复，确认前请先保留仍然需要的内容。",
      },
    ],
  },
];

export default function FaqPage() {
  let questionIndex = 0;

  return (
    <main className="public-document-site faq-page">
      <PublicHeader active="faq" />

      <header className="faq-page-hero">
        <p className="kicker"><CircleHelp size={15} /> Frequently asked questions</p>
        <div>
          <h1>常见问题</h1>
          <p>从领养第一只宠物，到微信接入、长期记忆和账号管理，这里给出直接答案。</p>
        </div>
        <div className="faq-hero-stat">
          <MessageCircleQuestion size={28} />
          <b>14</b>
          <span>个当前版本常见问题</span>
        </div>
      </header>

      <nav className="faq-category-nav" aria-label="常见问题分类">
        {faqGroups.map((group, index) => (
          <a href={`#${group.id}`} key={group.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {group.label}
          </a>
        ))}
      </nav>

      <div className="faq-page-body">
        {faqGroups.map((group, groupIndex) => (
          <section className="faq-group" id={group.id} key={group.id}>
            <header>
              <span>{String(groupIndex + 1).padStart(2, "0")}</span>
              <div>
                <h2>{group.label}</h2>
                <p>{group.description}</p>
              </div>
            </header>
            <div className="faq-page-list">
              {group.items.map((item) => {
                questionIndex += 1;
                const currentIndex = questionIndex;
                return (
                  <details key={item.question} open={currentIndex === 1}>
                    <summary>
                      <span>Q{String(currentIndex).padStart(2, "0")}</span>
                      <b>{item.question}</b>
                      <ChevronDown size={21} />
                    </summary>
                    <p>{item.answer}</p>
                  </details>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="faq-contact">
        <span>STILL NEED HELP?</span>
        <h2>先检查连接状态，<br />再看看服务是否都在运行。</h2>
        <p>大多数无法登录、扫码不出现或微信不回复的问题，都可以从前后端服务状态和模型配置开始排查。</p>
        <div>
          <Link href="/about">查看安全与合规说明</Link>
          <Link href="/console">进入宠物屋</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
