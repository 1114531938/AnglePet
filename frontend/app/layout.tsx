import type { Metadata } from "next";
import type { ReactNode } from "react";
import BrowserClass from "./browser-class";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnglePet - 宠物对话与陪伴",
  description: "领养一只会说话、会记得你、能在微信里陪你的数字宠物。",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <BrowserClass />
        {children}
      </body>
    </html>
  );
}
