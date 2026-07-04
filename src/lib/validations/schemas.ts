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
