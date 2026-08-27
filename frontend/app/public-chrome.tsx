import Link from "next/link";
import { ArrowRight, PawPrint } from "lucide-react";

type PublicHeaderProps = {
  active?: "about" | "faq" | "pricing";
};

export function PublicHeader({ active }: PublicHeaderProps) {
  return (
    <nav className="topbar public-topbar">
      <Link href="/" className="brand">
        <span className="brand-mark"><PawPrint size={19} /></span>
        <span>AnglePet</span>
      </Link>
      <div className="navlinks public-navlinks">
        <Link href="/#product">陪伴</Link>
        <Link href="/faq" className={active === "faq" ? "active" : ""}>常见问题</Link>
        <Link href="/pricing" className={active === "pricing" ? "active" : ""}>价格</Link>
      </div>
      <Link href="/console" className="nav-cta">
        进入宠物屋 <ArrowRight size={16} />
      </Link>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer public-page-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <span className="brand-mark"><PawPrint size={19} /></span>
          <div>
            <b>AnglePet</b>
            <p>把一只懂你的宠物，留在每天都会打开的微信里。</p>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/">产品首页</Link>
          <Link href="/console">进入宠物屋</Link>
          <Link href="/about">安全与合规</Link>
          <Link href="/faq">常见问题</Link>
          <Link href="/pricing">价格方案</Link>
        </div>
        <Link href="/console" className="footer-cta">
          领养宠物 <ArrowRight size={18} />
        </Link>
      </div>
      <div className="footer-meta">
        <span>© {new Date().getFullYear()} AnglePet</span>
        <span>AI 生成内容仅供陪伴与交流，请谨慎判断重要信息。</span>
      </div>
    </footer>
  );
}
