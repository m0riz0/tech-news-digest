"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { type ReactNode, useEffect } from "react";

/**
 * アクセス解析(PostHog)。NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN が未設定の環境
 * (ローカル開発等)では初期化をスキップし、計測なしで動作する。
 * 変数名は Vercel Marketplace 連携(PostHog)が自動注入する名前に合わせている。
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
