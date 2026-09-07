import { z } from "zod";

const limit = z.number().int().min(-1).optional();
const credits = z.number().int().nonnegative().optional();
const provider = z.enum(["kie", "duomi", "veo"]).optional();

export const AdminSettingsSchema = z.object({
  dailyFastVideoLimit: limit,
  dailyQualityVideoLimit: limit,
  dailyPptLimit: limit,
  videoFastProvider: provider,
  videoQualityProvider: provider,
  creditCostVideoFast: credits,
  creditCostVideoQuality: credits,
  creditCostImage: credits,
  creditCostPptPage: credits,
});
