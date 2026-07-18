import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/get-session";
import { ensureUserActive } from "@/lib/auth/ensure-active-user";
import { rateLimiter } from "@/lib/rate-limit";
import { geminiService } from "@/lib/ai/gemini-service";
import { getPptStyle } from "@/features/studio/data/ppt-skills";
import {
  PptOutlineRequestSchema,
  PPT_LAYOUT_ROLES,
} from "@/lib/validations/schemas";
import { sanitizeError } from "@/lib/security/error-handler";

export const maxDuration = 60;

const OUTLINE_SYSTEM_PROMPT = `你是资深演示文稿策划师。根据用户提供的主题或文档内容，产出结构化的 PPT 大纲。

输出严格 JSON（不要代码块标记、不要任何解释）：
{"title": "整套 PPT 标题", "slides": [{"index": 1, "title": "页面标题", "bullets": ["要点"], "layoutRole": "cover"}]}

规则：
- slides 数量必须恰好等于用户要求的页数
- 第 1 页 layoutRole 必须是 "cover"，bullets 中只放一句副标题
- 总页数 ≥6 时，第 2 页为 "toc"（目录页），bullets 为各章节名
- 最后一页为 "end"（结尾页：致谢或行动号召）
- 中间页在 "section"（章节分隔）/ "content"（内容页）/ "data"（数据页）中合理分配；涉及数字、对比、趋势的内容用 "data"
- 每页 bullets 不超过 5 条，每条不超过 20 字；页面标题不超过 15 字
- 语言与用户输入语言一致（默认简体中文）`;

const outlineResponseSchema = z.object({
  title: z.string().min(1).max(100),
  slides: z
    .array(
      z.object({
        index: z.number().int(),
        title: z.string().min(1).max(60),
        bullets: z.array(z.string().max(60)).max(6),
        layoutRole: z.enum(PPT_LAYOUT_ROLES),
      })
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const userId = session.user.id;

  const activeCheck = await ensureUserActive(userId);
  if (!activeCheck.ok) {
    return NextResponse.json({ error: activeCheck.error }, { status: activeCheck.status });
  }

  const { success } = await rateLimiter.limit(userId, "pptOutline");
  if (!success) {
    return NextResponse.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validation = PptOutlineRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { topic, docText, pageCount, skillKey, styleKey } = validation.data;

    const resolved = getPptStyle(skillKey, styleKey);
    if (!resolved) {
      return NextResponse.json({ error: "无效的风格选择" }, { status: 400 });
    }

    const userParts: string[] = [`页数要求：恰好 ${pageCount} 页。`];
    if (topic?.trim()) {
      userParts.push(`主题：${topic.trim()}`);
    }
    if (docText?.trim()) {
      userParts.push(`参考文档内容：\n${docText.trim()}`);
    }
    userParts.push(
      `视觉风格为「${resolved.style.name}」（${resolved.style.description}），大纲措辞可与之呼应。`
    );

    const result = await geminiService.generateJson({
      systemInstruction: OUTLINE_SYSTEM_PROMPT,
      userText: userParts.join("\n"),
      validate: (value) => outlineResponseSchema.parse(value),
    });

    // 规范化：强制 index 连续、页数对齐（多裁少补由前端编辑器兜底）
    const slides = result.slides.slice(0, pageCount).map((slide, i) => ({
      ...slide,
      index: i + 1,
      bullets: slide.bullets.slice(0, 5).map((b) => b.slice(0, 40)),
    }));

    return NextResponse.json({
      success: true,
      title: result.title,
      slides,
    });
  } catch (error) {
    console.error("[PPT Outline] Error:", error);
    return NextResponse.json(
      { error: `大纲生成失败：${sanitizeError(error)}` },
      { status: 500 }
    );
  }
}
