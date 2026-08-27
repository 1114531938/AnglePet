"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, PawPrint, Sparkles } from "lucide-react";

type Billing = "monthly" | "yearly";

const plans = [
  {
    name: "贴贴",
    caption: "轻量陪伴",
    monthly: 29,
    yearly: 189,
    saving: 159,
    description: "适合每天聊几句、分享日常，让一只宠物稳定陪在身边。",
    features: ["1 只微信陪伴宠物", "网页与微信同源对话", "基础长期记忆", "每月陪伴额度自动刷新"],
  },
  {
    name: "相伴",
    caption: "高频陪伴",
    monthly: 59,
    yearly: 499,
    saving: 209,
    popular: true,
    description: "适合高频聊天、持续养成，让宠物更充分地理解你的日常。",
    features: ["最多 3 只陪伴宠物", "约为贴贴版 4 至 5 倍额度", "更多长期记忆与表情", "优先处理微信消息"],
  },
  {
    name: "长久",
    caption: "深度陪伴",
    monthly: 99,
    yearly: 999,
    saving: 189,
    description: "适合长时间、深度对话和多只宠物共同生活的用户。",
    features: ["最多 8 只陪伴宠物", "约为贴贴版 10 倍额度", "完整记忆与语音能力", "更高并发与优先支持"],
  },
];

export default function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      <section className="pricing-hero">
        <div className="pricing-hero-copy">
          <p className="kicker"><Sparkles size={15} /> Pricing</p>
          <h1>先免费认识它，<br />再决定陪多久。</h1>
          <p>AnglePet 可以免费开始使用。需要更长对话、更深记忆或更多宠物时，再选择适合你的陪伴方案。</p>
        </div>
        <div className="pricing-free-note">
          <PawPrint size={28} />
          <div>
            <span>免费体验</span>
            <b>¥0，先把第一只宠物带回家</b>
            <p>包含网页对话、宠物设定和基础记忆；无需绑定支付方式。</p>
          </div>
          <Link href="/console" aria-label="免费进入宠物屋"><ArrowRight /></Link>
        </div>
      </section>

      <section className="pricing-plans-section">
        <div className="pricing-toolbar">
          <div>
            <span>陪伴方案</span>
            <h2>按你的相处方式选择</h2>
          </div>
          <div className="billing-switch" role="group" aria-label="计费周期">
            <button type="button" className={billing === "monthly" ? "active" : ""} onClick={() => setBilling("monthly")}>月付</button>
            <button type="button" className={billing === "yearly" ? "active" : ""} onClick={() => setBilling("yearly")}>年付更省</button>
          </div>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => {
            const price = billing === "monthly" ? plan.monthly : plan.yearly;
            return (
              <article className={`pricing-card${plan.popular ? " featured" : ""}`} key={plan.name}>
                <div className="pricing-card-head">
                  <div>
                    <span>{plan.caption}</span>
                    <h3>{plan.name}</h3>
                  </div>
                  {plan.popular && <b className="popular-label">最受欢迎</b>}
                </div>
                <div className="price-line">
                  <strong>¥{price}</strong>
                  <span>/{billing === "monthly" ? "月" : "年"}</span>
                </div>
                <div className="annual-line">
                  {billing === "monthly" ? (
                    <><span>年付 ¥{plan.yearly}</span><b>立省 ¥{plan.saving}</b></>
                  ) : (
                    <><span>折合 ¥{(plan.yearly / 12).toFixed(2)} / 月</span><b>已省 ¥{plan.saving}</b></>
                  )}
                </div>
                <p className="pricing-description">{plan.description}</p>
                <ul>
                  {plan.features.map((feature) => <li key={feature}><Check size={17} />{feature}</li>)}
                </ul>
                <Link href="/console" className="pricing-action">
                  选择{plan.name} <ArrowRight size={18} />
                </Link>
              </article>
            );
          })}
        </div>
        <p className="pricing-disclaimer">当前页面用于展示套餐方案，点击不会直接扣费。额度按月刷新，不跨月累计。</p>
      </section>

      <section className="pricing-closing">
        <span>ONE PET, ONE CONTINUOUS STORY</span>
        <h2>不是购买一段回答，<br />是把陪伴延续下去。</h2>
        <Link href="/faq">查看常见问题 <ArrowRight size={18} /></Link>
      </section>
    </>
  );
}
