import { z } from "zod";

export const GenerateImageSchema = z.object({
  prompt: z.string().min(1, "提示词为必填项").max(2000, "提示词过长（最多 2000 字符）"),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageSize: z.string().optional(),
});

export const EditImageSchema = z.object({
  prompt: z.string().min(1, "提示词为必填项").max(2000, "提示词过长（最多 2000 字符）"),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageSize: z.string().optional(),
  imageBase64: z.string().min(1, "图像为必填项"),
  imageMimeType: z.string().min(1, "图像类型为必填项"),
});

export const GenerateVideoSchema = z.object({
  prompt: z.string().min(1, "提示词为必填项").max(2000, "提示词过长（最多 2000 字符）"),
  mode: z.string().optional(),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  duration: z.number().min(3).max(10).optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
});
