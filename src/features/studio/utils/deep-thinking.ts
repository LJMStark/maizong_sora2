"use client";

export type DeepThinkingKind = "image" | "video";

export interface DeepThinkingOptions {
  kind: DeepThinkingKind;
  prompt: string;
  modeLabel: string;
  aspectLabel: string;
  referenceLabel?: string;
  qualityLabel?: string;
  durationLabel?: string;
}

export interface DeepThinkingResult {
  originalPrompt: string;
  plannedPrompt: string;
  summary: string[];
  checklist: string[];
}

function normalizePrompt(prompt: string, kind: DeepThinkingKind) {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed) return trimmed;

  return kind === "image"
    ? "创建一张主体明确、细节丰富、适合直接生成的图像"
    : "创建一段主体明确、动作连贯、适合直接生成的视频";
}

function buildImagePrompt({
  prompt,
  modeLabel,
  aspectLabel,
  referenceLabel,
  qualityLabel,
}: DeepThinkingOptions) {
  const base = normalizePrompt(prompt, "image");
  const editDirection =
    modeLabel === "编辑"
      ? "基于参考图继续创作，保留主体识别度，同时让变化集中在风格、光线和背景上"
      : "从零生成画面，先保证主体、场景和风格清楚";

  return [
    base,
    editDirection,
    `画面比例使用 ${aspectLabel}`,
    qualityLabel ? `输出质量偏好为 ${qualityLabel}` : "",
    referenceLabel ? `参考输入：${referenceLabel}` : "",
    "构图要求：主体占画面视觉中心，前景、中景、背景层次清楚，边缘留出自然呼吸空间",
    "视觉要求：光线方向明确，材质细节真实，颜色不过饱和，避免杂乱文字、水印、畸形手部和重复肢体",
    "成片风格：高完成度、适合商业展示，保留可继续编辑的干净画面",
  ]
    .filter(Boolean)
    .join("。");
}

function buildVideoPrompt({
  prompt,
  modeLabel,
  aspectLabel,
  referenceLabel,
  durationLabel,
}: DeepThinkingOptions) {
  const base = normalizePrompt(prompt, "video");
  const sourceDirection = referenceLabel
    ? "以参考图为第一帧视觉基础，保持主体外观稳定"
    : "从清晰的开场画面开始，先建立主体和环境";

  return [
    base,
    sourceDirection,
    `视频比例使用 ${aspectLabel}`,
    durationLabel ? `时长约 ${durationLabel}` : "",
    `生成模式：${modeLabel}`,
    "镜头设计：开场稳定展示主体，随后做一次缓慢推进或环绕，结尾停在干净的定格画面",
    "动作设计：主体动作连续自然，背景变化克制，避免突然变形、闪烁、穿帮和不必要的镜头跳切",
    "视觉要求：电影感光线，清楚的景深层次，画面干净，适合短视频封面和循环播放",
  ]
    .filter(Boolean)
    .join("。");
}

export function buildDeepThinkingResult(
  options: DeepThinkingOptions
): DeepThinkingResult {
  const originalPrompt = options.prompt.trim() || "未输入提示词";
  const plannedPrompt =
    options.kind === "image"
      ? buildImagePrompt(options)
      : buildVideoPrompt(options);

  return {
    originalPrompt,
    plannedPrompt,
    summary:
      options.kind === "image"
        ? [
            "先固定主体、构图、比例和参考图关系。",
            "补足光线、材质、背景层次和常见失败约束。",
            "输出一版可直接生成或继续手改的提示词。",
          ]
        : [
            "先固定主体、镜头、动作和时长。",
            "补足第一帧、运动连续性和画面稳定要求。",
            "输出一版可直接生成或继续手改的视频提示词。",
          ],
    checklist:
      options.kind === "image"
        ? ["主体是否明确", "构图是否可控", "风格是否足够具体", "失败约束是否写清"]
        : ["主体是否稳定", "镜头运动是否明确", "动作是否连续", "结尾画面是否干净"],
  };
}
