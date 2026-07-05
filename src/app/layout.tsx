import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import CompareDrawer from "@/components/CompareDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "升学数据库 - 全国高校录取分数线查询平台",
  description:
    "免费查询全国高校历年录取分数线、位次及专业录取数据。支持按省份、年份、分数、选科组合筛选，提供智能推荐（冲刺/稳妥/保底）和多校对比功能。",
  keywords: [
    "高考",
    "录取分数线",
    "高校录取",
    "高考志愿",
    "升学",
    "位次",
    "专业录取分",
  ],
  openGraph: {
    title: "升学数据库 - 全国高校录取分数线查询平台",
    description: "免费查询全国高校历年录取分数线、位次及专业录取数据",
    type: "website",
    locale: "zh_CN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        {children}
        <CompareDrawer />
      </body>
    </html>
  );
}
