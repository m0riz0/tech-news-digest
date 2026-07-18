import { PostHogProvider } from "@/components/PostHogProvider";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechBeacon — 海外Tech・AIニュースを日本語で",
  description:
    "海外のIT・AIメディアを横断し、AIが日本語で翻訳・要約・重要度を整理するニュースリーダー",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
