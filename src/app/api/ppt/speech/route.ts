import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/get-session";
import { ensureUserActive } from "@/lib/auth/ensure-active-user";
import { rateLimiter } from "@/lib/rate-limit";
import { geminiService } from "@/lib/ai/gemini-service";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { PptSpeechSchema } from "@/lib/validations/schemas";
import { sanitizeError } from "@/lib/security/error-handler";

export const maxDuration = 60;

const SPEECH_SYSTEM_PROMPT = `你是资深演讲教练。基于 PPT 的每页标题与要点，为演讲者撰写自然口语化的逐页演讲备注。

输出严格 JSON（不要代码块标记、不要任何解释）：
{"slides": [{"index": 1, "notes": "该页演讲备注"}]}

规则：
- 每页备注 60-120 字，口语自然、可直接照讲
- 承上启下：除首页外，开头一句衔接上一页
- 封面页备注为开场白，结尾页备注为收尾致谢
- 语言与大纲一致（默认简体中文）`;

const speechResponseSchema = z.object({
  slides: z
    .array(
      z.object({
        index: z.number().int().min(1),
        notes: z.string().min(1).max(500),
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

  const { success } = await rateLimiter.limit(userId, "pptSpeech");
  if (!success) {
    return NextResponse.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validation = PptSpeechSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { taskId } = validation.data;

    const task = await pptTaskService.getTaskById(taskId);
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    const outlineText = task.outline
      .map(
        (s) =>
          `第 ${s.index} 页（${s.layoutRole}）：${s.title}${
            s.bullets.length > 0 ? `｜要点：${s.bullets.join("；")}` : ""
          }`
      )
      .join("\n");

    const result = await geminiService.generateJson({
      systemInstruction: SPEECH_SYSTEM_PROMPT,
      userText: `PPT 标题：《${task.title}》\n共 ${task.pageCount} 页：\n${outlineText}`,
      validate: (value) => speechResponseSchema.parse(value),
    });

    const notes = new Map<number, string>();
    for (const item of result.slides) {
      if (item.index >= 1 && item.index <= task.pageCount) {
        notes.set(item.index, item.notes);
      }
    }
    await pptTaskService.updateSlideSpeechNotes(taskId, notes);

    return NextResponse.json({
      success: true,
      slides: Array.from(notes.entries()).map(([index, speechNotes]) => ({
        slideIndex: index,
        speechNotes,
      })),
    });
  } catch (error) {
    console.error("[PPT Speech] Error:", error);
    return NextResponse.json(
      { error: `演讲备注生成失败：${sanitizeError(error)}` },
      { status: 500 }
    );
  }
}
