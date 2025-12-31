import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "导航中心 - AI聊天与心理测试",
  description: "提供AI机器人聊天和心理测试功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body >{children}</body>
    </html>
  );
}