import { z } from "zod";

export const GenerateImageSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long"),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageSize: z.string().optional(),
});

export const EditImageSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long"),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  imageSize: z.string().optional(),
  imageBase64: z.string().min(1, "Image is required"),
  imageMimeType: z.string().min(1, "Image type is required"),
});

export const GenerateVideoSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long"),
  mode: z.string().optional(),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  duration: z.number().min(3).max(10).optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
});
