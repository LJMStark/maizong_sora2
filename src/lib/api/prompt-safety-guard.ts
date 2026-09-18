import { NextResponse } from "next/server";
import { checkPromptSafety } from "@/lib/security/prompt-safety";

/**
 * 生成类路由的提示词前置检查。
 *
 * 用法：在**扣积分之前**调用，返回非 null 就直接 return 它。
 * 放在扣费前是有意的——被安全策略拦下不该让用户掏钱（见 `/terms` 第四条）。
 *
 * 命中时记一条 warn 日志：反复触发同一分类的账号是后续限制/封停的依据，
 * 没有日志就无从判断「谁在反复试探」。日志里**不记提示词原文**，
 * 只记分类与用户——原文落进日志等于把违禁内容留在了运维系统里。
 */
export function promptSafetyRejection(
  prompt: string,
  context: { userId: string; route: string }
): NextResponse | null {
  const result = checkPromptSafety(prompt);
  if (result.allowed) return null;

  console.warn("[PromptSafety] 已拦截生成请求", {
    userId: context.userId,
    route: context.route,
    category: result.category,
    promptLength: prompt.length,
  });

  return NextResponse.json({ error: result.message }, { status: 400 });
}
