import type { PromptGalleryCategory } from "../components/shared/prompt-gallery";

export function mergeGalleryCategories(
  base: readonly PromptGalleryCategory[],
  extra: readonly PromptGalleryCategory[]
) {
  const used = new Set<string>();
  const merged: PromptGalleryCategory[] = [];
  const featured = base.find((category) => category.key === "featured");

  if (featured) {
    merged.push(featured);
    used.add(featured.key);
  }

  for (const category of extra) {
    if (used.has(category.key)) continue;
    merged.push(category);
    used.add(category.key);
  }

  for (const category of base) {
    if (used.has(category.key)) continue;
    merged.push(category);
    used.add(category.key);
  }

  return merged;
}
