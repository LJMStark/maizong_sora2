import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function main() {
  console.log("Adding sora-2-temporary to video_model enum...");

  try {
    await sql.unsafe(`ALTER TYPE "public"."video_model" ADD VALUE IF NOT EXISTS 'sora-2-temporary' BEFORE 'sora-2-pro';`);
    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  await sql.end();
}

main();
