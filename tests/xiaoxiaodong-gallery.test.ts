import assert from "node:assert/strict";
import test from "node:test";
import { IMAGE_GALLERY_CATEGORIES } from "../src/features/studio/data/image-gallery";
import {
  getXiaoxiaodongGalleryBase,
  xiaoxiaodongTopicFileName,
} from "../src/features/studio/data/xiaoxiaodong-cdn";
import { mergeGalleryCategories } from "../src/features/studio/utils/merge-gallery-categories";

test("xiaoxiaodong gallery base uses public supabase storage prefix", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cdn.example.com";
  process.env.NEXT_PUBLIC_XIAOXIAODONG_GALLERY_BASE = "";

  try {
    assert.equal(
      getXiaoxiaodongGalleryBase(),
      "https://cdn.example.com/storage/v1/object/public/studio-assets/gallery/xiaoxiaodong"
    );
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});

test("xiaoxiaodong topic files stay ASCII-safe", () => {
  assert.equal(xiaoxiaodongTopicFileName("海报版式"), "e6b5b7e68aa5e78988e5bc8f.json");
  assert.equal(xiaoxiaodongTopicFileName("ppt"), "707074.json");
});

test("image gallery categories put remote topics after featured", () => {
  const keys = mergeGalleryCategories(IMAGE_GALLERY_CATEGORIES, [
    { key: "海报版式", label: "海报版式" },
    { key: "数字海报", label: "数字海报" },
  ]).map((category) => category.key);

  assert.deepEqual(keys.slice(0, 4), [
    "featured",
    "海报版式",
    "数字海报",
    "portrait",
  ]);
});
