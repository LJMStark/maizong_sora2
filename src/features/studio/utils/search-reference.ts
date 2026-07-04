"use client";

export type SearchReferenceKind = "image" | "video";

export interface SearchReferenceOptions {
  kind: SearchReferenceKind;
  prompt: string;
  modeLabel: string;
}

export interface SearchReferenceDraft {
  query: string;
  notes: string;
  sourceUrl: string;
}

function normalizePrompt(prompt: string, kind: SearchReferenceKind) {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed) return trimmed;

  return kind === "image" ? "AI 图像创作参考" : "AI 视频创作参考";
}

export function buildSearchQuery({
  kind,
  prompt,
  modeLabel,
}: SearchReferenceOptions) {
  const base = normalizePrompt(prompt, kind);
  const suffix =
    kind === "image"
      ? "visual style lighting composition reference"
      : "cinematic motion camera reference";

  return `${base} ${modeLabel} ${suffix}`;
}

export function buildSearchReferencePrompt({
  kind,
  currentPrompt,
  draft,
}: {
  kind: SearchReferenceKind;
  currentPrompt: string;
  draft: SearchReferenceDraft;
}) {
  const base = normalizePrompt(currentPrompt, kind);
  const notes = draft.notes.trim();
  const sourceUrl = draft.sourceUrl.trim();
  const searchQuery = draft.query.trim();
  const referenceIntent =
    kind === "image"
      ? "把参考资料转成可见的主体、构图、光线、材质和风格细节，不要在画面里写出网址或长段文字。"
      : "把参考资料转成可见的主体、镜头运动、动作节奏、光线和场景细节，不要在画面里写出网址或长段文字。";

  return [
    base,
    searchQuery ? `搜索主题：${searchQuery}` : "",
    notes ? `参考摘录：${notes}` : "",
    sourceUrl ? `来源链接：${sourceUrl}` : "",
    referenceIntent,
  ]
    .filter(Boolean)
    .join("\n\n");
}
