import EmbeddedPostgres from "embedded-postgres";

/**
 * ローカル開発用PostgreSQL(embedded-postgres)。
 * システムにインストールせず node_modules 内のバイナリで起動する。
 * データは .dev/pgdata に永続化(gitignore済み)。
 *
 * 使い方: pnpm dev:db  (起動したまま別ターミナルで dev / batch を実行)
 * 接続先: postgres://postgres:postgres@127.0.0.1:54321/tech_news_digest
 */
const DB_NAME = "tech_news_digest";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: "./.dev/pgdata",
    user: "postgres",
    password: "postgres",
    port: 54321,
    persistent: true,
  });

  try {
    await pg.initialise();
    console.log("[dev-db] initialized data directory");
  } catch {
    // 既に初期化済み
  }

  await pg.start();
  console.log("[dev-db] postgres started on 127.0.0.1:54321");

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`[dev-db] created database ${DB_NAME}`);
  } catch {
    // 既に存在
  }

  console.log(
    `[dev-db] ready: postgres://postgres:postgres@127.0.0.1:54321/${DB_NAME} (Ctrl+C で停止)`,
  );

  const shutdown = async () => {
    console.log("\n[dev-db] stopping...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
