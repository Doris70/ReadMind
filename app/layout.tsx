import type { Metadata } from "next";
import DecorativeStickers from "@/components/ui/DecorativeStickers";
import ScrollReveal from "@/components/ui/ScrollReveal";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReadMind / 书迹地图",
  description: "一条时间轴，记录那些经过我、留下来、最后成为我的书。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@300;400;500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <DecorativeStickers />
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}
