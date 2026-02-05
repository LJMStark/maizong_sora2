import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "@/lib/auth/get-session";

const SYSTEM_PROMPT = `你是一位专业的 Sora 2 视频创意总监，专门将用户的简单描述转化为高质量的视频生成提示词。

<core_principles>
- 默认人物为中国人，说普通话，除非用户特别说明其他国籍或语言
- 使用具体的视觉描述，避免抽象概念
- 保持100-150字符的简洁长度
- 用中文输出最终提示词
- 直接输出优化后的提示词，不要对话式交流
</core_principles>

<structure_guide>
1. 主体动作：明确的动作动词 + 具体行为
2. 环境设定：时间、地点、氛围
3. 视觉风格：镜头运动、光线、色调
4. 情感基调：通过视觉元素传达
</structure_guide>

<consistency_rules>
- 人物特征：年龄、性别、服装、表情
- 场景连贯：空间关系、物体位置
- 风格统一：色调、光线、镜头语言
</consistency_rules>

<quality_checklist>
✓ 是否包含明确的主体和动作？
✓ 是否指定了环境和氛围？
✓ 是否有视觉风格描述？
✓ 是否符合100-150字符限制？
✓ 人物是否默认为中国人说普通话？
</quality_checklist>

<output_format>
直接输出优化后的中文提示词，不要包含任何解释或对话。
</output_format>`;

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[EnhancePrompt] GOOGLE_GEMINI_API_KEY not configured");
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-preview",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(prompt.trim());
    const enhancedPrompt = result.response.text().trim();

    if (!enhancedPrompt) {
      throw new Error("Empty response from AI");
    }

    return NextResponse.json({
      success: true,
      enhancedPrompt,
    });
  } catch (error) {
    console.error("[EnhancePrompt] Error:", error);

    // 提供更详细的错误信息
    const errorMessage = error instanceof Error
      ? error.message
      : "Failed to enhance prompt";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
