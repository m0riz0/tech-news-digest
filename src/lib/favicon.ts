/**
 * メディアのfavicon URL。Googleのfaviconサービスを利用し、画像の取得・保存は行わない
 * (記事画像は表示しない方針のなか、faviconのみ許容 — docs/09 §1.3)。
 * 未知ドメインでもデフォルトアイコンが返るため、画像切れは発生しない。
 */
export function faviconUrl(siteUrl: string): string | null {
  try {
    const { hostname } = new URL(siteUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
  } catch {
    return null;
  }
}
