import "dotenv/config";
import postgres from "postgres";
import { readFile } from "fs/promises";

async function migrate() {
  console.log("Starting image task migration...");

  try {
    // Validate environment variable
    const directUrl = process.env.DIRECT_URL;
    if (!directUrl) {
      throw new Error("DIRECT_URL environment variable is required");
    }

    const sql = postgres(directUrl);

    // Read migration SQL file
    const migrationSql = await readFile(
      "./drizzle/0001_strong_spacker_dave.sql",
      "utf8"
    );

    // Split by statement-breakpoint and execute each statement
    const statements = migrationSql
      .split("-->statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
        console.log("✓ Executed:", stmt.substring(0, 60) + "...");
      } catch (e: any) {
        // Handle duplicate object/relation errors gracefully
        if (e.code === "42710" || e.code === "42P07" || e.code === "42P16") {
          console.log("⊘ Already exists, skipping:", stmt.substring(0, 60) + "...");
        } else {
          console.error("✗ Error:", e.message);
          console.error("Statement:", stmt.substring(0, 100));
          throw e;
        }
      }
    }

    await sql.end();
    console.log("\n✓ Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
