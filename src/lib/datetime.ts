const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** JST基準の日付文字列(YYYY-MM-DD)を返す。daily_picks.pick_date のキーに使う */
export function toJstDateString(date: Date = new Date()): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
}

/** JSTでの「HH:mm」表示 */
export function formatJstTime(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(11, 16);
}

/** 記事カード向けの「M/D HH:mm」表示(JST) */
export function formatJstDateTime(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  return `${month}/${day} ${formatJstTime(date)}`;
}

/** 相対時刻表示(一覧の「◯時間前」)。24時間以上前は日時表示にフォールバック */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  return formatJstDateTime(date);
}
