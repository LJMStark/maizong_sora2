/**
 * Script to update showcase-examples.ts with CDN URLs
 * Run with: npx tsx scripts/update-showcase-urls.ts
 */

import * as fs from "fs";

const CDN_RESULTS = JSON.parse(fs.readFileSync("./scripts/showcase-cdn-urls.json", "utf-8"));

// Build CDN URL mapping
const cdnMap: Record<string, string> = {};
const failedIds: string[] = [];

for (const item of CDN_RESULTS) {
  if (item.cdnUrl) {
    cdnMap[item.id] = item.cdnUrl;
  } else {
    failedIds.push(item.id);
  }
}

console.log("=== CDN Upload Summary ===");
console.log(`Success: ${Object.keys(cdnMap).length}`);
console.log(`Failed: ${failedIds.length}`);
console.log(`Failed IDs: ${failedIds.join(", ")}`);

// Read current showcase-examples.ts
let content = fs.readFileSync("./src/features/studio/data/showcase-examples.ts", "utf-8");

// Replace URLs with CDN URLs
for (const [id, cdnUrl] of Object.entries(cdnMap)) {
  const item = CDN_RESULTS.find((r: { id: string }) => r.id === id);
  if (item) {
    // Escape special regex characters in the original URL
    const escapedUrl = item.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`image:\\s*"${escapedUrl}"`, "g");
    content = content.replace(regex, `image: "${cdnUrl}"`);
  }
}

// Write updated file
fs.writeFileSync("./src/features/studio/data/showcase-examples.ts", content);

console.log("\n=== Updated showcase-examples.ts ===");
console.log("All URLs have been replaced with CDN URLs.");
console.log(`\nNote: ${failedIds.length} items failed to upload and still use original URLs.`);
console.log("Consider removing or replacing these items: " + failedIds.join(", "));
