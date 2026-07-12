import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "有一 · AI 陪伴", description: "让你的 AI 角色真正住进微信里" };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body>{children}</body></html> }
