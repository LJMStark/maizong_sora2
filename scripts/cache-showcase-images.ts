/**
 * Script to download all showcase images and upload to Supabase Storage
 * Run with: npx tsx scripts/cache-showcase-images.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// All showcase image URLs with their IDs
const SHOWCASE_IMAGES: { id: string; url: string; title: string }[] = [
  { id: "1", url: "https://github.com/user-attachments/assets/3a056a8d-904e-4b3e-b0d2-b5122758b7f5", title: "超写实名人群像" },
  { id: "2", url: "https://github.com/user-attachments/assets/b71755dc-ff33-4872-8161-3f5066e0ccb6", title: "2000年代镜子自拍" },
  { id: "3", url: "https://github.com/user-attachments/assets/963c0a46-cf86-4604-8782-524b94afc51d", title: "维密风格写真" },
  { id: "4", url: "https://github.com/user-attachments/assets/eca5066b-1bf6-4a97-8b81-63e9e7435050", title: "90年代胶片人像" },
  { id: "5", url: "https://github.com/user-attachments/assets/793ad242-7867-4709-bdc6-55021f5eb78f", title: "硅谷风商务照" },
  { id: "6", url: "https://github.com/user-attachments/assets/243d1b11-9ef0-4d4f-b308-97d67b5d3bc3", title: "柯达胶片情绪照" },
  { id: "7", url: "https://github.com/user-attachments/assets/439317c2-4be8-4b28-803f-36427ecca31e", title: "星球大战寻找沃尔多" },
  { id: "8", url: "https://github.com/user-attachments/assets/74fced67-0715-46d3-b788-d9ed9e98873b", title: "岁月变迁" },
  { id: "9", url: "https://github.com/user-attachments/assets/f7ef5a84-e2bf-4d4e-a93e-38a23a21b9ef", title: "递归视觉" },
  { id: "10", url: "https://github.com/user-attachments/assets/8629b88a-b872-43e2-a19e-855542702ac2", title: "坐标可视化" },
  { id: "11", url: "https://github.com/user-attachments/assets/761380fe-0850-49e2-8589-797f10b7cb8d", title: "工程师眼中的金门大桥" },
  { id: "12", url: "https://replicate.delivery/xezq/piAS0s9DshbqMFXJvIfw9feWaEaNsejlRifhVgMSflvZJzzaF/tmp3u2ym4f_.jpeg", title: "字面解读" },
  { id: "13", url: "https://github.com/user-attachments/assets/54e2a2eb-1ab4-4f2b-86a2-7a59856e615f", title: "多人合成团队照" },
  { id: "14", url: "https://github.com/user-attachments/assets/b399c4d9-151b-4e15-9a40-f092f7a892b9", title: "白板马克笔艺术" },
  { id: "15", url: "https://pbs.twimg.com/media/G6x00O_XIAASY0r?format=jpg&name=900x900", title: "专业头像生成器" },
  { id: "16", url: "https://pbs.twimg.com/media/G7Ah9SIbIAAGlyu?format=jpg&name=900x900", title: "聚光灯动漫肖像" },
  { id: "17", url: "https://bibigpt-apps.chatvid.ai/chatimg/gemini-Bt055iW47OUqRDOh-K0gZ.png?v=1", title: "实物与手绘涂鸦广告" },
  { id: "18", url: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/99/black-white-portrait-art.png", title: "黑白肖像艺术" },
  { id: "19", url: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/98/blurred-silhouette-frosted-glass.png", title: "磨砂玻璃后的模糊剪影" },
  { id: "20", url: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/97/cute-cozy-knitted-doll.png", title: "可爱舒适针织娃娃" },
  { id: "21", url: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/90/branded-mechanical-keycaps.png", title: "品牌机械键帽" },
  { id: "22", url: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/72/gold-pendant-necklace.png", title: "金色吊坠项链" },
  { id: "23", url: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/73/cute-chibi-keychain.png", title: "可爱Q版钥匙扣" },
  { id: "24", url: "https://cdn.jsdelivr.net/gh/jamez-bondos/awesome-gpt4o-images/cases/62/kawaii-enamel-pin.png", title: "卡哇伊珐琅徽章" },
  { id: "25", url: "https://github.com/user-attachments/assets/cdfd4934-d06a-48ee-bf28-58ce16c458c1", title: "专业产品摄影" },
  { id: "26", url: "https://github.com/user-attachments/assets/81eaafb6-901b-424d-a197-dc1bc0bfc5bf", title: "虚拟模特试穿" },
  { id: "27", url: "https://pbs.twimg.com/media/G7BWvI8X0AApeZB?format=jpg&name=900x900", title: "3D迷你品牌店铺" },
  { id: "28", url: "https://github.com/user-attachments/assets/082f8bab-b098-4196-adf9-c6007a4b7006", title: "房间家具可视化" },
  { id: "29", url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400", title: "精华液滴管瓶" },
  { id: "30", url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400", title: "奢华口红特写" },
  { id: "31", url: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400", title: "护肤品套装" },
  { id: "32", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400", title: "咖啡生活方式" },
  { id: "33", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", title: "美食汉堡广告" },
  { id: "34", url: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400", title: "夏日饮品广告" },
  { id: "35", url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", title: "能量饮料海报" },
  { id: "36", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400", title: "无线耳机广告" },
  { id: "37", url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400", title: "便携音箱产品照" },
  { id: "38", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", title: "智能手表展示" },
  { id: "39", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", title: "运动鞋产品照" },
  { id: "40", url: "https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400", title: "奢华手提包" },
  { id: "41", url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400", title: "钻石戒指特写" },
  { id: "42", url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400", title: "珍珠耳环展示" },
  { id: "43", url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400", title: "香水瓶日落广告" },
  { id: "44", url: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400", title: "琥珀香水瓶" },
  { id: "45", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", title: "露营灯具海报" },
  { id: "46", url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400", title: "香薰蜡烛氛围" },
  { id: "47", url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", title: "手工面包摄影" },
  { id: "48", url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400", title: "巧克力甜点展示" },
  { id: "49", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", title: "悬浮运动鞋" },
  { id: "50", url: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400", title: "护肤品平铺" },
  { id: "51", url: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400", title: "高跟鞋特写" },
  { id: "52", url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400", title: "无线耳机悬浮" },
  { id: "53", url: "https://images.unsplash.com/photo-1522273400909-fd1a8f77637e?w=400", title: "相机装备展示" },
  { id: "54", url: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400", title: "皮革钱包特写" },
  { id: "55", url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400", title: "眼镜产品照" },
  { id: "56", url: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400", title: "红酒瓶广告" },
  { id: "57", url: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=400", title: "金色手表特写" },
  { id: "58", url: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400", title: "护手霜产品照" },
  { id: "59", url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400", title: "化妆品套装" },
  { id: "60", url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400", title: "彩色运动鞋" },
  { id: "61", url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400", title: "宝丽来相机" },
  { id: "62", url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400", title: "香薰精油瓶" },
  { id: "63", url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400", title: "白色运动鞋" },
  { id: "64", url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400", title: "太阳镜广告" },
  { id: "65", url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400", title: "皮革背包" },
  { id: "66", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400", title: "帆布托特包" },
  { id: "67", url: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400", title: "机械键盘" },
  { id: "68", url: "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400", title: "AirPods耳机" },
  { id: "69", url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400", title: "游戏手柄" },
  { id: "70", url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400", title: "智能手机展示" },
  { id: "71", url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400", title: "笔记本文具" },
  { id: "72", url: "https://images.unsplash.com/photo-1583209814683-c023dd293cc6?w=400", title: "运动水壶" },
  { id: "73", url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400", title: "粉底液广告" },
  { id: "74", url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400", title: "马卡龙甜点" },
  { id: "75", url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400", title: "甜甜圈广告" },
  { id: "76", url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400", title: "咖啡杯特写" },
  { id: "77", url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", title: "披萨美食照" },
  { id: "78", url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", title: "意大利面广告" },
  { id: "79", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400", title: "健康沙拉" },
  { id: "80", url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400", title: "早餐煎饼" },
  { id: "81", url: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400", title: "寿司拼盘" },
  { id: "82", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", title: "牛排大餐" },
  { id: "83", url: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400", title: "冰淇淋广告" },
  { id: "84", url: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400", title: "新鲜水果" },
  { id: "85", url: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400", title: "奶茶饮品" },
  { id: "86", url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400", title: "蛋糕切片" },
  { id: "87", url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", title: "健身器材" },
  { id: "88", url: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400", title: "篮球鞋广告" },
  { id: "89", url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400", title: "瑜伽垫展示" },
  { id: "90", url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400", title: "眼影盘特写" },
];

const BUCKET_NAME = "showcase";
const TEMP_DIR = "./temp-showcase-images";

async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });
    if (error) {
      console.error("Failed to create bucket:", error);
      throw error;
    }
    console.log(`Created bucket: ${BUCKET_NAME}`);
  }
}

async function downloadImage(url: string, id: string): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Failed to download ${id}: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("gif")) ext = "gif";

    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), ext };
  } catch (error) {
    console.error(`Error downloading ${id}:`, error);
    return null;
  }
}

async function uploadToSupabase(buffer: Buffer, id: string, ext: string): Promise<string | null> {
  const fileName = `${id}.${ext}`;
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error(`Failed to upload ${id}:`, error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  console.log("Starting showcase image caching...\n");

  // Ensure bucket exists
  await ensureBucketExists();

  const results: { id: string; title: string; originalUrl: string; cdnUrl: string | null }[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const img of SHOWCASE_IMAGES) {
    console.log(`Processing ${img.id}: ${img.title}...`);

    const downloaded = await downloadImage(img.url, img.id);
    if (!downloaded) {
      results.push({ id: img.id, title: img.title, originalUrl: img.url, cdnUrl: null });
      failCount++;
      continue;
    }

    const cdnUrl = await uploadToSupabase(downloaded.buffer, img.id, downloaded.ext);
    results.push({ id: img.id, title: img.title, originalUrl: img.url, cdnUrl });

    if (cdnUrl) {
      console.log(`  ✓ Uploaded: ${cdnUrl}`);
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n=== Summary ===");
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  // Generate updated showcase-examples.ts content
  console.log("\n=== CDN URLs for showcase-examples.ts ===\n");

  const cdnMapping = results
    .filter((r) => r.cdnUrl)
    .map((r) => `  // ID ${r.id}: ${r.title}\n  // Original: ${r.originalUrl}\n  "${r.id}": "${r.cdnUrl}",`)
    .join("\n");

  console.log("export const SHOWCASE_CDN_URLS: Record<string, string> = {");
  console.log(cdnMapping);
  console.log("};");

  // Save results to file
  const outputPath = "./scripts/showcase-cdn-urls.json";
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);
