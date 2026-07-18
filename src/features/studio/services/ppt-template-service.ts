import JSZip from "jszip";
import { z } from "zod";
import { geminiService, GeminiImagePart } from "@/lib/ai/gemini-service";
import { storageService } from "@/features/studio/services/storage-service";
import type { PptTemplateProfile } from "@/db/schema";

// 送入视觉分析与作为参考图的模板图片数量上限
const MAX_REF_IMAGES = 3;
// 从 pptx 内嵌媒体中筛选的最小体积（跳过图标等小图）
const MIN_MEDIA_BYTES = 20 * 1024;

const TEMPLATE_ANALYSIS_SYSTEM_PROMPT = `你是资深演示文稿视觉分析师。用户会提供 PPT 模板的页面截图或内嵌素材图，请提取可复用的视觉画像。

输出严格 JSON（不要代码块标记、不要任何解释）：
{"palette": ["#RRGGBB"], "fonts": ["字体气质描述"], "layoutTraits": "版式特征", "background": "背景处理", "motifs": "装饰母题"}

要求：
- palette：3-6 个主色（HEX），按视觉权重排序
- fonts：1-3 条字体气质描述（如"厚重无衬线黑体标题"、"细宋体正文"）
- layoutTraits：一句话概括版式骨架（标题位置、栏式、对齐、留白比例）
- background：背景颜色/质感/渐变处理
- motifs：反复出现的装饰元素（几何形、线条、图标风格等），没有则写"无"`;

const templateProfileSchema = z.object({
  palette: z.array(z.string().max(30)).max(10),
  fonts: z.array(z.string().max(50)).max(5),
  layoutTraits: z.string().max(500),
  background: z.string().max(300),
  motifs: z.string().max(300),
});

interface ExtractedImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

function mimeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

/** 解包 .pptx：缩略图 + 大尺寸内嵌图 + theme1.xml 色板与字体 */
async function extractFromPptx(pptxBuffer: Buffer): Promise<{
  images: ExtractedImage[];
  themeColors: string[];
  themeFonts: string[];
}> {
  const zip = await JSZip.loadAsync(pptxBuffer);
  const images: ExtractedImage[] = [];

  // docProps/thumbnail.jpeg 为首页缩略图（非必存）
  const thumbnail = zip.file("docProps/thumbnail.jpeg");
  if (thumbnail) {
    const buffer = Buffer.from(await thumbnail.async("arraybuffer"));
    images.push({ buffer, mimeType: "image/jpeg", extension: "jpeg" });
  }

  const mediaFiles = Object.keys(zip.files)
    .filter((name) => name.startsWith("ppt/media/"))
    .sort();
  for (const name of mediaFiles) {
    if (images.length >= MAX_REF_IMAGES) break;
    const mimeType = mimeFromFilename(name);
    if (!mimeType) continue;
    const file = zip.file(name);
    if (!file) continue;
    const buffer = Buffer.from(await file.async("arraybuffer"));
    if (buffer.length < MIN_MEDIA_BYTES) continue;
    images.push({
      buffer,
      mimeType,
      extension: mimeType.split("/")[1],
    });
  }

  let themeColors: string[] = [];
  let themeFonts: string[] = [];
  const theme = zip.file("ppt/theme/theme1.xml");
  if (theme) {
    const xml = await theme.async("string");
    themeColors = Array.from(
      new Set(
        Array.from(xml.matchAll(/<a:srgbClr val="([0-9A-Fa-f]{6})"/g)).map(
          (m) => `#${m[1].toUpperCase()}`
        )
      )
    ).slice(0, 8);
    themeFonts = Array.from(
      new Set(
        Array.from(xml.matchAll(/typeface="([^"]+)"/g))
          .map((m) => m[1].trim())
          .filter((f) => f && !f.startsWith("+"))
      )
    ).slice(0, 5);
  }

  return { images, themeColors, themeFonts };
}

export interface AnalyzeTemplateParams {
  userId: string;
  pptxBase64?: string;
  images?: { base64: string; mimeType: string }[];
}

export interface AnalyzeTemplateResult {
  templateProfile: PptTemplateProfile;
  refImageUrls: string[];
}

export const pptTemplateService = {
  async analyzeTemplate(
    params: AnalyzeTemplateParams
  ): Promise<AnalyzeTemplateResult> {
    let candidates: ExtractedImage[] = [];
    let themeColors: string[] = [];
    let themeFonts: string[] = [];

    if (params.pptxBase64) {
      const extracted = await extractFromPptx(
        Buffer.from(params.pptxBase64, "base64")
      );
      candidates = extracted.images;
      themeColors = extracted.themeColors;
      themeFonts = extracted.themeFonts;
    }

    for (const image of params.images ?? []) {
      if (candidates.length >= MAX_REF_IMAGES) break;
      candidates.push({
        buffer: Buffer.from(image.base64, "base64"),
        mimeType: image.mimeType,
        extension: image.mimeType.split("/")[1] || "png",
      });
    }

    if (candidates.length === 0 && themeColors.length === 0) {
      throw new Error(
        "模板中未找到可分析的视觉素材，请改为上传模板页面截图"
      );
    }

    // 视觉分析（无图时基于 theme 数据构造兜底画像）
    let profile: PptTemplateProfile;
    if (candidates.length > 0) {
      const geminiImages: GeminiImagePart[] = candidates.map((c) => ({
        mimeType: c.mimeType,
        base64: c.buffer.toString("base64"),
      }));
      const hints: string[] = [];
      if (themeColors.length > 0) {
        hints.push(`模板 theme 声明的主色板：${themeColors.join("、")}`);
      }
      if (themeFonts.length > 0) {
        hints.push(`模板 theme 声明的字体：${themeFonts.join("、")}`);
      }
      profile = await geminiService.generateJson({
        systemInstruction: TEMPLATE_ANALYSIS_SYSTEM_PROMPT,
        userText:
          hints.length > 0
            ? `请分析以上模板图片。补充信息：${hints.join("；")}`
            : "请分析以上模板图片。",
        images: geminiImages,
        validate: (value) => templateProfileSchema.parse(value),
      });
    } else {
      profile = {
        palette: themeColors,
        fonts: themeFonts,
        layoutTraits: "沿用模板主题色板与字体气质",
        background: "浅色净面背景",
        motifs: "无",
      };
    }

    // 上传参考图（供 image2 图生图参照版式）
    const groupId = crypto.randomUUID();
    const refImageUrls: string[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        const url = await storageService.uploadImage(
          params.userId,
          candidate.buffer,
          `ppt-template-${groupId}-${i}.${candidate.extension}`,
          candidate.mimeType
        );
        refImageUrls.push(url);
      } catch (error) {
        console.error("[PPT Template] 参考图上传失败:", { index: i, error });
      }
    }

    return { templateProfile: profile, refImageUrls };
  },
};
