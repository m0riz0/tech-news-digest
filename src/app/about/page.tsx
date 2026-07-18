import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — TechBeacon",
};

/** About / 免責 / 出典方針 / 削除依頼窓口(docs/09 §3。法的観点からMVP必須) */
export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">About</h1>

        <section className="mt-6 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-owl-text/85">
          <h2 className="text-lg font-bold text-stone-900 dark:text-owl-text">
            このサイトについて
          </h2>
          <p>
            TechBeacon は、海外のIT・AI系メディアを横断的に収集し、AIが「編集者」として
            日本語タイトル・要約・重要度を整理する個人運営のニュースリーダーです。
            英語記事を読む負担を減らし、毎日数分で重要ニュースをキャッチアップできることを目指しています。
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-owl-text/85">
          <h2 className="text-lg font-bold text-stone-900 dark:text-owl-text">免責事項</h2>
          <p>
            各記事の日本語タイトル・要約はAIによって自動生成されたものです。
            正確性には配慮していますが、誤訳や不正確な要約が含まれる可能性があります。
            <strong>正確な内容は必ず元記事(一次情報)をご確認ください。</strong>
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-owl-text/85">
          <h2 className="text-lg font-bold text-stone-900 dark:text-owl-text">出典方針</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>すべての記事にメディア名・公開日時・元記事へのリンクを明示しています</li>
            <li>要約は元記事の代替とならない短い分量(2〜4文)に留めています</li>
            <li>記事本文の全文翻訳・転載、記事画像の表示は行いません</li>
            <li>収集は各メディアが公開しているRSS/Atomフィードを利用しています</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-owl-text/85">
          <h2 className="text-lg font-bold text-stone-900 dark:text-owl-text">
            削除依頼・お問い合わせ
          </h2>
          <p>
            権利者の方からの掲載停止・削除のご依頼には誠実かつ迅速に対応いたします。
            下記窓口までご連絡ください。該当メディア・記事の掲載を速やかに停止します。
          </p>
          <p className="rounded border border-stone-200 bg-white p-3 dark:border-owl-border dark:bg-owl-surface">
            連絡先:{" "}
            <a href="mailto:m0riz0.tech@gmail.com" className="font-mono underline">
              m0riz0.tech@gmail.com
            </a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
