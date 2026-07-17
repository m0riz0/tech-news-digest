import { extractFromHtml } from "@extractus/article-extractor";

/**
 * 記事ページからの本文抽出(F-04 Should)。
 * - robots.txt を尊重し、拒否されたホストは取得しない(docs/09 §2)
 * - User-Agent にサービス名を明示
 * - 同一バッチ内のリクエスト間隔を空ける(呼び出し側で制御)
 * 取得した本文は要約生成の内部利用に限定し、画面には表示しない。
 */
const USER_AGENT = "tech-news-digest-bot/0.1 (personal news reader; contact via site About page)";
const FETCH_TIMEOUT_MS = 15_000;

/** ホストごとの robots.txt 判定キャッシュ(プロセス内) */
const robotsCache = new Map<string, string[]>();

export async function extractArticleText(url: string): Promise<string | null> {
  try {
    if (!(await isAllowedByRobots(url))) {
      return null;
    }
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const article = await extractFromHtml(html, url);
    if (!article?.content) return null;

    return stripHtml(article.content);
  } catch {
    return null;
  }
}

/** robots.txt の Disallow を簡易チェック(User-agent: * のグループのみ評価) */
async function isAllowedByRobots(url: string): Promise<boolean> {
  const { origin, pathname } = new URL(url);

  let disallows = robotsCache.get(origin);
  if (!disallows) {
    disallows = await fetchDisallowRules(origin);
    robotsCache.set(origin, disallows);
  }
  return !disallows.some((rule) => rule !== "" && pathname.startsWith(rule));
}

async function fetchDisallowRules(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    return parseRobotsDisallows(await res.text());
  } catch {
    // robots.txt が取得できない場合は取得を控えない(存在しないサイトも多い)
    return [];
  }
}

/** User-agent: * グループの Disallow ルールを抽出 */
export function parseRobotsDisallows(robotsTxt: string): string[] {
  const disallows: string[] = [];
  let inWildcardGroup = false;

  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (line === "") continue;

    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();

    switch (key.trim().toLowerCase()) {
      case "user-agent":
        inWildcardGroup = value === "*";
        break;
      case "disallow":
        if (inWildcardGroup && value !== "") disallows.push(value);
        break;
    }
  }
  return disallows;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
