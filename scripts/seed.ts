import { getDb } from "@/db/client";
import { sources, tags } from "@/db/schema";

/**
 * sources / tags の初期データ投入(docs/03 §4, docs/05 §2.3)。
 * slug の onConflictDoNothing により何度実行しても安全(冪等)。
 * フィードURL・利用規約は追加時に個別確認する(docs/09 §2)。
 */
const INITIAL_SOURCES: (typeof sources.$inferInsert)[] = [
  {
    slug: "openai-blog",
    name: "OpenAI",
    feedUrl: "https://openai.com/blog/rss.xml",
    siteUrl: "https://openai.com/blog",
    category: "official",
  },
  {
    slug: "google-ai-blog",
    name: "Google AI",
    feedUrl: "https://blog.google/technology/ai/rss/",
    siteUrl: "https://blog.google/technology/ai/",
    category: "official",
  },
  {
    slug: "github-blog",
    name: "GitHub",
    feedUrl: "https://github.blog/feed/",
    siteUrl: "https://github.blog",
    category: "official",
  },
  {
    slug: "microsoft-devblogs",
    name: "Microsoft DevBlogs",
    feedUrl: "https://devblogs.microsoft.com/feed/",
    siteUrl: "https://devblogs.microsoft.com",
    category: "official",
  },
  {
    slug: "huggingface-blog",
    name: "Hugging Face",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    siteUrl: "https://huggingface.co/blog",
    category: "official",
  },
  {
    slug: "techcrunch-ai",
    name: "TechCrunch",
    feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    siteUrl: "https://techcrunch.com/category/artificial-intelligence/",
    category: "media",
  },
  {
    slug: "the-verge",
    name: "The Verge",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    siteUrl: "https://www.theverge.com",
    category: "media",
  },
  {
    slug: "ars-technica",
    name: "Ars Technica",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    siteUrl: "https://arstechnica.com",
    category: "media",
  },
  {
    slug: "venturebeat-ai",
    name: "VentureBeat",
    feedUrl: "https://venturebeat.com/category/ai/feed/",
    siteUrl: "https://venturebeat.com/category/ai/",
    category: "media",
  },
  // Anthropic News は公式RSSの有無を確認後に有効化する(docs/03 §4)
  {
    slug: "anthropic-news",
    name: "Anthropic",
    feedUrl: "https://www.anthropic.com/news",
    siteUrl: "https://www.anthropic.com/news",
    category: "official",
    isActive: false,
  },
];

const INITIAL_TAGS: (typeof tags.$inferInsert)[] = [
  { slug: "llm", name: "LLM" },
  { slug: "ai-agent", name: "AI Agent" },
  { slug: "openai", name: "OpenAI" },
  { slug: "anthropic", name: "Anthropic" },
  { slug: "google", name: "Google" },
  { slug: "meta", name: "Meta" },
  { slug: "microsoft", name: "Microsoft" },
  { slug: "github", name: "GitHub" },
  { slug: "python", name: "Python" },
  { slug: "typescript", name: "TypeScript" },
  { slug: "aws", name: "AWS" },
  { slug: "cloud", name: "Cloud" },
  { slug: "security", name: "Security" },
  { slug: "frontend", name: "Frontend" },
  { slug: "backend", name: "Backend" },
  { slug: "devtools", name: "DevTools" },
  { slug: "research", name: "Research" },
  { slug: "business", name: "Business" },
  { slug: "open-source", name: "Open Source" },
  { slug: "hardware", name: "Hardware" },
];

async function main() {
  const db = getDb();

  const insertedSources = await db
    .insert(sources)
    .values(INITIAL_SOURCES)
    .onConflictDoNothing({ target: sources.slug })
    .returning({ slug: sources.slug });

  const insertedTags = await db
    .insert(tags)
    .values(INITIAL_TAGS)
    .onConflictDoNothing({ target: tags.slug })
    .returning({ slug: tags.slug });

  console.log(`sources: ${insertedSources.length} inserted (${INITIAL_SOURCES.length} defined)`);
  console.log(`tags: ${insertedTags.length} inserted (${INITIAL_TAGS.length} defined)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
