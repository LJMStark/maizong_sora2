/**
 * 迁移基线：把已经生效的迁移登记进 drizzle 的迁移记录表。
 *
 * 背景：本项目此前一直用 `drizzle-kit push` 直接把库改成与 schema 一致，
 * 从未产生迁移记录，因此 drizzle 的 `drizzle.__drizzle_migrations` 表
 * 是空的（甚至不存在）。此时直接跑 `drizzle-kit migrate` 会从 0000
 * 开始重放全部迁移，撞上已存在的表而失败。
 *
 * 本脚本把「已经在库里生效」的那部分迁移补登记进去，之后 `db:migrate`
 * 就只会执行尚未应用的增量。
 *
 * 用法：
 *   pnpm db:baseline 0015_late_namor    # 标记 0000~0015 为已应用
 *   pnpm db:baseline --list             # 只列出 journal 里的迁移
 *
 * 幂等：重复执行不会产生重复登记。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "drizzle");
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
}

function readJournal(): JournalEntry[] {
  const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    throw new Error(`找不到 ${journalPath}`);
  }
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  return journal.entries as JournalEntry[];
}

// 与 drizzle-orm/migrator 的算法保持一致：迁移文件内容的 sha256
function hashOf(tag: string): string {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), "utf8");
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function main() {
  const arg = process.argv[2];
  const entries = readJournal();

  if (!arg || arg === "--list") {
    console.log("drizzle/meta/_journal.json 中的迁移：");
    for (const entry of entries) {
      console.log(`  ${entry.tag}`);
    }
    if (!arg) {
      console.error(
        "\n用法：pnpm db:baseline <tag>  —— 把该 tag 及之前的迁移标记为已应用"
      );
      process.exit(1);
    }
    return;
  }

  const cutoffIndex = entries.findIndex((entry) => entry.tag === arg);
  if (cutoffIndex === -1) {
    console.error(`journal 中没有名为 ${arg} 的迁移，用 --list 查看可用值`);
    process.exit(1);
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("需要 DIRECT_URL 或 DATABASE_URL 环境变量");
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${MIGRATIONS_SCHEMA}"`);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const existing = await sql.unsafe<{ hash: string }[]>(
      `SELECT hash FROM "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}"`
    );
    const known = new Set(existing.map((row) => row.hash));

    let inserted = 0;
    for (const entry of entries.slice(0, cutoffIndex + 1)) {
      const hash = hashOf(entry.tag);
      if (known.has(hash)) {
        console.log(`  跳过（已登记）: ${entry.tag}`);
        continue;
      }
      await sql.unsafe(
        `INSERT INTO "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}" (hash, created_at) VALUES ($1, $2)`,
        [hash, String(entry.when)]
      );
      console.log(`  已登记: ${entry.tag}`);
      inserted += 1;
    }

    const remaining = entries.slice(cutoffIndex + 1);
    console.log(`\n完成：新登记 ${inserted} 条。`);
    if (remaining.length > 0) {
      console.log(
        `下次 pnpm db:migrate 将执行：${remaining.map((e) => e.tag).join(", ")}`
      );
    } else {
      console.log("没有待执行的迁移。");
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
