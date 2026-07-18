import { z } from "zod";

// Max decoded image payload accepted from the client (10 MB). Base64 inflates
// bytes by ~4/3, so cap the encoded string accordingly. Routes should also
// reject oversized requests via Content-Length before parsing the body.
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BASE64_LENGTH = Math.ceil(MAX_IMAGE_UPLOAD_BYTES / 3) * 4;

const imageBase64Schema = z
  .string()
  .min(1, "图像为必填项")
  .max(MAX_IMAGE_BASE64_LENGTH, "图像过大（最多 10MB）");

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const imageMimeTypeSchema = z.enum(ALLOWED_IMAGE_MIME_TYPES, {
  message: "不支持的图片类型，仅允许 jpeg/png/webp/gif",
});

export const GenerateImageSchema = z.object({
  prompt: z.string().min(1, "提示词为必填项").max(10000, "提示词过长（最多 10000 字符）"),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageSize: z.string().optional(),
  sessionId: z.string().optional(),
});

export const EditImageSchema = z.object({
  prompt: z.string().min(1, "提示词为必填项").max(10000, "提示词过长（最多 10000 字符）"),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageSize: z.string().optional(),
  sessionId: z.string().optional(),
  imageBase64: imageBase64Schema,
  imageMimeType: imageMimeTypeSchema,
});

// ---------- PPT 生成 ----------

export const PPT_LAYOUT_ROLES = [
  "cover",
  "toc",
  "section",
  "content",
  "data",
  "end",
] as const;

export const PPT_MIN_PAGES = 3;
export const PPT_MAX_PAGES = 20;

// .pptx 模板上传上限（20MB，base64 按 4/3 膨胀）
export const MAX_PPTX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_PPTX_BASE64_LENGTH = Math.ceil(MAX_PPTX_UPLOAD_BYTES / 3) * 4;

const pptOutlineSlideSchema = z.object({
  index: z.number().int().min(1),
  title: z.string().min(1, "页面标题不能为空").max(60, "页面标题过长（最多 60 字）"),
  bullets: z.array(z.string().max(60, "要点过长（最多 60 字）")).max(6, "每页最多 6 条要点"),
  layoutRole: z.enum(PPT_LAYOUT_ROLES),
  promptOverride: z.string().max(500, "单页提示词微调过长").optional(),
});

export type PptOutlineSlideInput = z.infer<typeof pptOutlineSlideSchema>;

export const PptOutlineRequestSchema = z
  .object({
    topic: z.string().max(200, "主题过长（最多 200 字）").optional(),
    docText: z.string().max(20000, "文档内容过长（最多 20000 字）").optional(),
    pageCount: z.number().int().min(PPT_MIN_PAGES).max(PPT_MAX_PAGES),
    skillKey: z.string().min(1),
    styleKey: z.string().min(1),
  })
  .refine((d) => Boolean(d.topic?.trim() || d.docText?.trim()), {
    message: "主题或文档内容至少填写一项",
  });

const pptTemplateProfileSchema = z.object({
  palette: z.array(z.string().max(30)).max(10),
  fonts: z.array(z.string().max(50)).max(5),
  layoutTraits: z.string().max(500),
  background: z.string().max(300),
  motifs: z.string().max(300),
});

export const PptGenerateSchema = z
  .object({
    title: z.string().min(1, "标题不能为空").max(100, "标题过长"),
    skillKey: z.string().min(1),
    styleKey: z.string().min(1),
    anchorColor: z.string().max(50).optional(),
    resolution: z.enum(["2k", "4k"]).default("2k"),
    pageCount: z.number().int().min(PPT_MIN_PAGES).max(PPT_MAX_PAGES),
    outline: z.array(pptOutlineSlideSchema).min(PPT_MIN_PAGES).max(PPT_MAX_PAGES),
    sampleFirst: z.boolean().default(true),
    speechNotesEnabled: z.boolean().default(false),
    templateProfile: pptTemplateProfileSchema.optional(),
    templateRefImageUrls: z.array(z.string().url()).max(5).optional(),
    sessionId: z.string().optional(),
  })
  .refine((d) => d.outline.length === d.pageCount, {
    message: "大纲页数与 pageCount 不一致",
  });

export const PptSampleActionSchema = z.object({
  taskId: z.string().min(1),
  action: z.enum(["confirm", "regenerate"]),
  styleKey: z.string().optional(),
  anchorColor: z.string().max(50).optional(),
  promptOverride: z.string().max(500).optional(),
});

export const PptCancelSchema = z.object({
  taskId: z.string().min(1),
});

export const PptSlideRegenerateSchema = z.object({
  taskId: z.string().min(1),
  slideIndex: z.number().int().min(1),
  promptOverride: z.string().max(500).optional(),
});

export const PptSpeechSchema = z.object({
  taskId: z.string().min(1),
});

export const PptTemplateAnalyzeSchema = z
  .object({
    pptxBase64: z
      .string()
      .max(MAX_PPTX_BASE64_LENGTH, "模板文件过大（最多 20MB）")
      .optional(),
    images: z
      .array(
        z.object({
          base64: imageBase64Schema,
          mimeType: imageMimeTypeSchema,
        })
      )
      .max(5, "参考图最多 5 张")
      .optional(),
  })
  .refine((d) => Boolean(d.pptxBase64 || (d.images && d.images.length > 0)), {
    message: "请上传 .pptx 模板或参考图",
  });

export const GenerateVideoSchema = z.object({
  prompt: z.string().min(1, "提示词为必填项").max(10000, "提示词过长（最多 10000 字符）"),
  mode: z.string().optional(),
  model: z.string().optional(),
  sessionId: z.string().optional(),
  aspectRatio: z.string().optional(),
  duration: z
    .number()
    .int()
    .refine((value) => value === 8 || value === 10 || value === 15, {
      message: "视频时长仅支持 8、10 或 15 秒",
    })
    .optional(),
  imageBase64: imageBase64Schema.optional(),
  imageMimeType: imageMimeTypeSchema.optional(),
});
