#!/usr/bin/env node
/**
 * 把小象东全库压成缩略图，上传到 Supabase Storage（站点现成 CDN），
 * 并写出按栏目拆分的目录 JSON。
 *
 *   node tools/publish-xiaoxiaodong-gallery.mjs --dry-run
 *   node tools/publish-xiaoxiaodong-gallery.mjs
 */

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

const execFileAsync = promisify(execFile);
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(rootDir, ".env.local") });
loadEnv({ path: join(rootDir, ".env") });

const libraryDir = join(rootDir, "docs/xiaoxiaodong/library/styles");
const workDir = join(rootDir, ".temp/xiaoxiaodong-cdn");
const imageWorkDir = join(workDir, "images");
const manifestPath = join(workDir, "manifest.json");
const BUCKET = "studio-assets";
const PREFIX = "gallery/xiaoxiaodong";
const IMAGE_RE = /\.(webp|png|jpe?g)$/i;
const VARIANT_PREFIX_RE = /^变种[-_]?\d+[-_]?/;
const CONVERT_CONCURRENCY = 6;
const UPLOAD_CONCURRENCY = 6;
const FEATURED_COUNT = 36;
const FEATURED_TOPIC_CAP = 2;

const dryRun = process.argv.includes("--dry-run");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function listImageFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => IMAGE_RE.test(name))
    .sort((a, b) => a.localeCompare(b, "zh"));
}

function cleanTitle(title, fallback) {
  const stripped = String(title || "")
    .replace(VARIANT_PREFIX_RE, "")
    .trim();
  return stripped || fallback || "风格示例";
}

function isReferenceLocked(prompt) {
  return /身份图|参考图|REFERENCE[_ ]?0|保持身份/.test(prompt);
}

function scoreStyle(list, prompt) {
  const recommended = Number(list.recommendedRank);
  const rank = Number(list.rank);
  const quality = Number(list.qualityScore) || 0;
  const fav = Number(list.favCountSnapshot) || 0;
  const recommendedScore = Number.isFinite(recommended) ? 1000 - recommended : 0;
  const rankScore = Number.isFinite(rank) ? 200 - Math.min(rank, 200) : 0;
  const referencePenalty = isReferenceLocked(prompt) ? 400 : 0;
  return recommendedScore * 10 + quality * 80 + fav * 6 + rankScore - referencePenalty;
}

function itemId(styleId, title, imageFile) {
  return `xxd-${createHash("sha1")
    .update(`${styleId}\n${title}\n${imageFile}`)
    .digest("hex")
    .slice(0, 12)}`;
}

function collectPairs(styleDir, prompts, styleName) {
  const imagesDir = join(styleDir, "images");
  const files = listImageFiles(imagesDir);
  if (files.length === 0) return [];

  const used = new Set();
  const pairs = [];
  const entries = Array.isArray(prompts) ? prompts : [];

  for (const prompt of entries) {
    const rawTitle = String(prompt?.title || prompt?.fileName || "").trim();
    const content = String(prompt?.content || "").trim();
    if (!rawTitle || !content) continue;
    const match = files.find((name) => !used.has(name) && name.includes(rawTitle));
    if (!match) continue;
    used.add(match);
    pairs.push({
      title: cleanTitle(rawTitle, styleName),
      prompt: content,
      imageFile: join(imagesDir, match),
    });
  }

  return pairs;
}

function collectItems() {
  const topics = readdirSync(libraryDir, { withFileTypes: true }).filter((d) =>
    d.isDirectory()
  );
  const items = [];

  for (const topic of topics) {
    const topicDir = join(libraryDir, topic.name);
    const styles = readdirSync(topicDir, { withFileTypes: true }).filter((d) =>
      d.isDirectory()
    );

    for (const style of styles) {
      const styleDir = join(topicDir, style.name);
      const list = readJson(join(styleDir, "list.json")) || {};
      const pack = readJson(join(styleDir, "prompts.json"));
      const styleId = list.id || style.name;
      const styleName = list.name || pack?.style?.name || style.name;
      const topicLabel = list.topicName || topic.name;
      const pairs = collectPairs(styleDir, pack?.prompts, styleName);

      for (const pair of pairs) {
        items.push({
          id: itemId(styleId, pair.title, pair.imageFile),
          title: pair.title,
          category: topic.name,
          topicLabel,
          prompt: pair.prompt,
          imageFile: pair.imageFile,
          score: scoreStyle(list, pair.prompt),
          referenceLocked: isReferenceLocked(pair.prompt),
        });
      }
    }
  }

  return items;
}

function pickFeatured(items) {
  const ranked = [...items]
    .filter((item) => !item.referenceLocked)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const selected = [];
  const topicCounts = new Map();

  for (const item of ranked) {
    if (selected.length >= FEATURED_COUNT) break;
    const used = topicCounts.get(item.category) || 0;
    if (used >= FEATURED_TOPIC_CAP) continue;
    selected.push(item);
    topicCounts.set(item.category, used + 1);
  }

  return selected;
}

function publicUrl(supabaseUrl, path) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

function topicFileName(topicKey) {
  const slug = Buffer.from(topicKey, "utf8").toString("hex").slice(0, 24);
  return `${slug || "topic"}.json`;
}

function toCard(item, supabaseUrl) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    prompt: item.prompt,
    image: publicUrl(supabaseUrl, `${PREFIX}/images/${item.id}.jpg`),
  };
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );
  return results;
}

async function convertImage(source, dest) {
  if (existsSync(dest)) return;
  await execFileAsync("sips", [
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    "80",
    "-Z",
    "640",
    source,
    "--out",
    dest,
  ]);
}

async function main() {
  mkdirSync(imageWorkDir, { recursive: true });
  const items = collectItems();
  const featured = pickFeatured(items);
  const topics = [...new Map(items.map((item) => [item.category, item.topicLabel])).entries()]
    .map(([key, label]) => ({
      key,
      label,
      count: items.filter((item) => item.category === key).length,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh"));

  console.log(
    JSON.stringify(
      {
        dryRun,
        items: items.length,
        topics: topics.length,
        featured: featured.length,
        topicCounts: Object.fromEntries(topics.map((topic) => [topic.label, topic.count])),
      },
      null,
      2
    )
  );

  if (dryRun) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 100 * 1024 * 1024,
    });
    if (error) throw new Error(`创建 bucket 失败: ${error.message}`);
  }

  const uploaded = new Set(readJson(manifestPath)?.uploaded || []);
  let converted = 0;
  let skipped = 0;
  let uploadedCount = 0;

  await mapPool(items, CONVERT_CONCURRENCY, async (item) => {
    await convertImage(item.imageFile, join(imageWorkDir, `${item.id}.jpg`));
    converted += 1;
    if (converted % 200 === 0) {
      console.log(`converted ${converted}/${items.length}`);
    }
  });

  await mapPool(items, UPLOAD_CONCURRENCY, async (item) => {
    const path = `${PREFIX}/images/${item.id}.jpg`;
    if (uploaded.has(item.id)) {
      skipped += 1;
      return;
    }
    const local = join(imageWorkDir, `${item.id}.jpg`);
    const body = readFileSync(local);
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "31536000",
      });
      if (!error) {
        lastError = "";
        break;
      }
      lastError = error.message;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    if (lastError) {
      throw new Error(`上传 ${item.id} 失败: ${lastError}`);
    }
    uploaded.add(item.id);
    uploadedCount += 1;
    if (uploadedCount % 100 === 0) {
      writeFileSync(manifestPath, JSON.stringify({ uploaded: [...uploaded] }));
      console.log(`uploaded ${uploaded.size}/${items.length}`);
    }
  });

  writeFileSync(manifestPath, JSON.stringify({ uploaded: [...uploaded] }));

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    featured: featured.map((item) => ({
      ...toCard(item, supabaseUrl),
      category: "featured",
    })),
    topics,
  };

  const jsonFiles = [
    {
      path: `${PREFIX}/index.json`,
      body: JSON.stringify(index),
    },
    ...topics.map((topic) => ({
      path: `${PREFIX}/topics/${topicFileName(topic.key)}`,
      body: JSON.stringify({
        key: topic.key,
        label: topic.label,
        items: items
          .filter((item) => item.category === topic.key)
          .map((item) => toCard(item, supabaseUrl)),
      }),
    })),
  ];

  for (const file of jsonFiles) {
    const { error } = await supabase.storage.from(BUCKET).upload(file.path, file.body, {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "3600",
    });
    if (error) throw new Error(`上传 ${file.path} 失败: ${error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        uploaded: uploaded.size,
        skipped,
        jsonFiles: jsonFiles.length,
        index: publicUrl(supabaseUrl, `${PREFIX}/index.json`),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
