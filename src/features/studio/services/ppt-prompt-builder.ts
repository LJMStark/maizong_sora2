import type { PptOutlineSlide, PptTemplateProfile } from "@/db/schema";
import type { PptStyle } from "@/features/studio/data/ppt-skills/types";

const UNIVERSAL_CONSTRAINTS =
  "约束：整页 16:9 满版海报式构图，画面本身就是完整的一页幻灯片；" +
  "所有文字必须逐字准确渲染，不得增删改任何字；" +
  "不得虚构页面内容之外的数字、数据或统计图数值，装饰性图形不得携带具体数值；" +
  "禁止出现水印、软件界面、鼠标指针、多页拼贴、画面外边框与投影。";

function pickLayout(
  layout: string | string[] | undefined,
  slideIndex: number
): string {
  if (!layout) return "";
  if (Array.isArray(layout)) {
    return layout[slideIndex % layout.length] ?? layout[0] ?? "";
  }
  return layout;
}

function formatAnchorColor(
  style: PptStyle,
  anchorColor: string | null | undefined
): string {
  const colors = style.anchorColors;
  if (!colors || colors.length === 0) return "";

  const chosen =
    colors.find((c) => c.hex === anchorColor || c.name === anchorColor) ??
    colors[0];
  return `${chosen.name}（${chosen.hex}）`;
}

function formatTemplateProfile(profile: PptTemplateProfile): string {
  const parts: string[] = [];
  if (profile.palette?.length) {
    parts.push(`主色板 ${profile.palette.join("、")}`);
  }
  if (profile.fonts?.length) {
    parts.push(`字体气质 ${profile.fonts.join("、")}`);
  }
  if (profile.layoutTraits) {
    parts.push(`版式特征：${profile.layoutTraits}`);
  }
  if (profile.background) {
    parts.push(`背景处理：${profile.background}`);
  }
  if (profile.motifs) {
    parts.push(`装饰母题：${profile.motifs}`);
  }
  if (parts.length === 0) return "";
  return `参考模板画像（版式与配色须与之保持一致）：${parts.join("；")}。`;
}

export interface BuildSlidePromptParams {
  style: PptStyle;
  anchorColor?: string | null;
  slide: PptOutlineSlide;
  pageCount: number;
  deckTitle: string;
  templateProfile?: PptTemplateProfile | null;
  /** 存在参考图时提醒模型参照其版式 */
  hasRefImages?: boolean;
}

export function buildSlidePrompt(params: BuildSlidePromptParams): string {
  const { style, slide, pageCount, deckTitle } = params;

  const sections: string[] = [style.systemPrefix];

  const layout = pickLayout(style.layouts[slide.layoutRole], slide.index);
  if (layout) {
    sections.push(`版式：${layout}`);
  }

  const anchorText = formatAnchorColor(style, params.anchorColor);
  const colorRule = style.colorRule.replaceAll("{anchorColor}", anchorText);
  sections.push(`配色：${colorRule}`);

  const contentParts: string[] = [];
  if (slide.layoutRole === "cover") {
    contentParts.push(`主标题「${slide.title || deckTitle}」`);
    if (slide.bullets.length > 0) {
      contentParts.push(`副标题「${slide.bullets[0]}」`);
    }
  } else {
    contentParts.push(`页面标题「${slide.title}」`);
    if (slide.bullets.length > 0) {
      contentParts.push(
        `要点：${slide.bullets.map((b, i) => `${i + 1}）${b}`).join("　")}`
      );
    }
  }
  contentParts.push(`页码 ${slide.index}/${pageCount}`);
  sections.push(`页面内容：${contentParts.join("；")}。`);

  if (params.templateProfile) {
    sections.push(formatTemplateProfile(params.templateProfile));
  }
  if (params.hasRefImages) {
    sections.push(
      "已提供参考图：严格参照参考图的版式骨架、配色与视觉语言，仅替换为上述页面内容。"
    );
  }

  if (style.extraDirectives) {
    sections.push(style.extraDirectives);
  }

  sections.push(UNIVERSAL_CONSTRAINTS);

  if (slide.promptOverride?.trim()) {
    sections.push(`额外要求：${slide.promptOverride.trim()}`);
  }

  return sections.filter(Boolean).join("\n");
}

export function buildAllSlidePrompts(params: {
  style: PptStyle;
  anchorColor?: string | null;
  outline: PptOutlineSlide[];
  deckTitle: string;
  templateProfile?: PptTemplateProfile | null;
  hasRefImages?: boolean;
}): string[] {
  return params.outline.map((slide) =>
    buildSlidePrompt({
      style: params.style,
      anchorColor: params.anchorColor,
      slide,
      pageCount: params.outline.length,
      deckTitle: params.deckTitle,
      templateProfile: params.templateProfile,
      hasRefImages: params.hasRefImages,
    })
  );
}
