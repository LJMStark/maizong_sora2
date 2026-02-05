import "dotenv/config";
import postgres from "postgres";
import { nanoid } from "nanoid";

const sql = postgres(process.env.DIRECT_URL!);

const packages = [
  // 积分包
  {
    id: nanoid(),
    name: "启智积分包（基础版）",
    type: "package",
    credits: 100,
    daily_credits: null,
    duration_days: null,
    price: 990,
    sort_order: 1,
  },
  {
    id: nanoid(),
    name: "迅驰智算套餐（进阶版）",
    type: "package",
    credits: 1000,
    daily_credits: null,
    duration_days: null,
    price: 6880,
    sort_order: 2,
  },
  {
    id: nanoid(),
    name: "星云超算方案（高级版）",
    type: "package",
    credits: 3000,
    daily_credits: null,
    duration_days: null,
    price: 13880,
    sort_order: 3,
  },
  {
    id: nanoid(),
    name: "银河积分旗舰包（旗舰版）",
    type: "package",
    credits: 10000,
    daily_credits: null,
    duration_days: null,
    price: 39880,
    sort_order: 4,
  },
  // 会员订阅
  {
    id: nanoid(),
    name: "体验天卡",
    type: "subscription",
    credits: null,
    daily_credits: 30,
    duration_days: 1,
    price: 288,
    sort_order: 5,
  },
  {
    id: nanoid(),
    name: "超值月卡",
    type: "subscription",
    credits: null,
    daily_credits: 30,
    duration_days: 30,
    price: 5880,
    sort_order: 6,
  },
  {
    id: nanoid(),
    name: "劲爆半年",
    type: "subscription",
    credits: null,
    daily_credits: 40,
    duration_days: 180,
    price: 19800,
    sort_order: 7,
  },
  {
    id: nanoid(),
    name: "无敌年卡",
    type: "subscription",
    credits: null,
    daily_credits: 50,
    duration_days: 365,
    price: 39880,
    sort_order: 8,
  },
];

async function main() {
  console.log("Seeding credit packages...");

  try {
    for (const pkg of packages) {
      await sql`
        INSERT INTO credit_package (id, name, type, credits, daily_credits, duration_days, price, sort_order, is_active, created_at)
        VALUES (${pkg.id}, ${pkg.name}, ${pkg.type}, ${pkg.credits}, ${pkg.daily_credits}, ${pkg.duration_days}, ${pkg.price}, ${pkg.sort_order}, true, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      console.log(`  - ${pkg.name}`);
    }
    console.log("Seed successful!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  await sql.end();
}

main();
