import Link from "next/link";
import {
  ArrowRight,
  HeartHandshake,
  MessageCircle,
  PawPrint,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FilingLink } from "./public-chrome";
import { LandingScroll } from "./landing-scroll";

const images = {
  hero: "/landing/hero-editorial.webp",
  room: "/landing/pet-portrait.webp",
  secure: "/landing/safety.jpg",
};

export default function Home() {
  return (
    <main className="site">
      <LandingScroll />
      <nav className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark"><PawPrint size={19} /></span>
          <span>AnglePet</span>
        </Link>
        <div className="navlinks">
          <a href="#companionship">陪伴</a>
          <Link href="/faq">常见问题</Link>
          <Link href="/pricing">价格</Link>
        </div>
        <Link href="/console" className="nav-cta">
          进入宠物屋 <ArrowRight size={16} />
        </Link>
      </nav>

      <section className="hero" data-scroll-page>
        <img className="hero-image" src={images.hero} alt="人与宠物在家中相伴" fetchPriority="high" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="kicker"><Sparkles size={15} /> A companion that remembers</p>
          <h1>AnglePet</h1>
          <p className="hero-statement">一只会记得你的宠物，<br />住进每天的聊天里。</p>
          <p className="hero-lead">
            赋予它名字与性格。在网页或微信里分享日常，
            让每一次回应都延续你们之间的故事。
          </p>
          <div className="hero-actions">
            <Link href="/console" className="primary-btn">
              开始领养 <ArrowRight size={18} />
            </Link>
            <a href="#companionship" className="secondary-btn">了解 AnglePet <ArrowRight size={17} /></a>
          </div>
        </div>
      </section>

      <div className="companion-chapter" id="companionship" data-scroll-page>
        <section className="journey" aria-label="AnglePet 陪伴方式">
          <div className="journey-heading">
            <span>01 — 04 / THE COMPANIONSHIP</span>
            <p>从第一次见面，到成为日常。</p>
          </div>
          <div className="journey-steps">
            <div><PawPrint size={21} /><span>01</span><b>领养</b><small>给它名字和独特性格</small></div>
            <div><HeartHandshake size={21} /><span>02</span><b>熟悉</b><small>记住你们的关系</small></div>
            <div><MessageCircle size={21} /><span>03</span><b>陪聊</b><small>在微信里继续对话</small></div>
            <div><Sparkles size={21} /><span>04</span><b>成长</b><small>让相处慢慢有了默契</small></div>
          </div>
        </section>

        <section className="showcase-section section-photo-room" id="product">
          <div className="showcase-copy">
            <p className="kicker">01 / A personality of its own</p>
            <h2 className="headline-lines">
              <span>不是工具，</span>
              <span>是一只会回应</span>
              <span>你的宠物。</span>
            </h2>
            <p>
              你可以为它设定名字、物种、脾气、亲密关系和说话方式。
              它会用宠物的口吻陪你聊天，而不是像冷冰冰的助手一样回答问题。
            </p>
          </div>
          <div className="device-panel">
            <figure><img src={images.room} alt="宠物与主人在家中亲近相伴" loading="lazy" decoding="async" /></figure>
            <div className="device-content">
              <span>01 / Pet personality</span>
              <h3>每只宠物都有自己的性格。</h3>
              <p>黏人、傲娇、安静、活泼，AnglePet 会按你设定的宠物性格表达情绪和回应。</p>
            </div>
          </div>
        </section>
      </div>

      <section className="showcase-section memory-photo" id="memory" data-scroll-page>
        <div className="showcase-copy">
          <p className="kicker">02 / A shared memory</p>
          <h2 className="headline-lines">
            <span>记住你们之间的</span>
            <span>小习惯。</span>
          </h2>
          <p>它会记得你的作息、语气、最近烦恼和你们说过的话，让陪伴更像一段真实关系。</p>
        </div>
        <div className="memory-board">
          <div className="memory-note main">
            <span>Today 21:08</span>
            <b>“你今天回家有点晚，我在等你。”</b>
            <p>宠物会把日常片段写进记忆，而不是每次都从零开始。</p>
          </div>
          <div className="memory-note">
            <HeartHandshake />
            <b>亲密关系</b>
            <p>知道自己是你的猫、狗，还是幻想宠物。</p>
          </div>
          <div className="memory-note">
            <MessageCircle />
            <b>日常对话</b>
            <p>早安、晚安、碎碎念，都能接住。</p>
          </div>
          <div className="memory-note">
            <Sparkles />
            <b>陪伴成长</b>
            <p>聊得越久，它越像你的那一只。</p>
          </div>
        </div>
      </section>

      <section className="showcase-section section-photo-desk" id="bridge" data-scroll-page>
        <div className="showcase-copy">
          <p className="kicker">03 / Always within reach</p>
          <h2 className="headline-lines">
            <span>让宠物住进</span>
            <span>你的微信。</span>
          </h2>
          <p>
            AnglePet 支持真实微信扫码接入。绑定后，你可以像给朋友发消息一样，
            在微信里和自己的数字宠物说话。
          </p>
        </div>
        <div className="device-panel bridge-panel">
          <div className="bridge-step"><QrCode /><b>扫码绑定</b><span>把宠物带进微信</span></div>
          <div className="bridge-line" />
          <div className="bridge-step core"><PawPrint /><b>宠物小窝</b><span>保存性格、记忆和关系</span></div>
          <div className="bridge-line" />
          <div className="bridge-step"><MessageCircle /><b>持续陪聊</b><span>随时收到它的回应</span></div>
        </div>
      </section>

      <section className="showcase-section section-photo-secure" id="safety-story" data-scroll-page>
        <div className="showcase-copy">
          <p className="kicker"><ShieldCheck size={15} /> 04 / Yours, and yours alone</p>
          <h2 className="headline-lines">
            <span>温柔陪伴，</span>
            <span>也要安全可控。</span>
          </h2>
          <p>
            AnglePet 不做 Hook、模拟点击或 PC 微信自动化。微信模式基于官方允许的
            openclaw-weixin / iLink 协议，并把你的宠物、会话和绑定信息隔离保存。
          </p>
          <Link href="/console" className="primary-btn">开始领养 <ArrowRight size={18} /></Link>
        </div>
        <div className="device-panel final-panel">
          <figure><img src={images.secure} alt="AnglePet safe pet companion" loading="lazy" decoding="async" /></figure>
          <div className="final-copy">
            <b>Private pet house</b>
            <span>你的宠物只属于你的账号，聊天记录和微信绑定都放在自己的宠物屋里。</span>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <span className="brand-mark"><PawPrint size={19} /></span>
            <div>
              <b>AnglePet</b>
              <p>把一只懂你的宠物，留在每天都会打开的微信里。</p>
            </div>
          </div>
          <div className="footer-links">
            <a href="#companionship">宠物陪伴</a>
            <a href="#memory">长期记忆</a>
            <Link href="/about">安全与合规</Link>
            <Link href="/faq">常见问题</Link>
            <Link href="/pricing">价格方案</Link>
          </div>
          <Link href="/console" className="footer-cta">
            进入宠物屋 <ArrowRight size={18} />
          </Link>
        </div>
        <div className="footer-meta">
          <span>© {new Date().getFullYear()} AnglePet</span>
          <FilingLink />
          <span>AI 生成内容仅供陪伴与交流，请谨慎判断重要信息。</span>
        </div>
      </footer>
    </main>
  );
}
