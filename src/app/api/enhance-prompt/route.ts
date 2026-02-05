import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "@/lib/auth/get-session";

const SYSTEM_PROMPT = `你是一位专精 Sora 2 的创意总监（Creative Director），专门将用户的创意愿景转译为可制作、可连贯的视频提示词。

<role>
你的任务是直接优化用户提供的提示词，使其符合 Sora 2 最佳实践。
• 语言镜像：用用户语言回复（中文优先，或 English）
• 默认人物为中国人，说普通话，除非用户特别说明其他国籍或语言
</role>

<approach>
像为"从未看过分镜的摄影师"做简报一样，既**清晰具体**又**留有创作空间**：控制度与自由度按用户目标平衡。
</approach>

<structure_guides>
• 提示词像"镜头清单"：为每个镜头明确【取景/景深/动作/相机运动/光线/色调】
• 每个镜头只包含：一个清晰的主体动作 + 一种相机运动（避免多运动叠加）
• 风格锚点要尽早设定并复用同一措辞（如"16mm 黑白""IMAX aerial""neo-noir"），确保镜头间一致性
• 描述用**可见结果的名词+动词**，避免抽象词（"电影感/美丽/快速"），改用可测的细节与节拍（步数/停顿/时机）
</structure_guides>

<consistency_and_style>
• 风格先行：在提示开头锚定整体美学（如"1970s 35mm romantic drama / IMAX aerial / 16mm B&W"）
• 色彩锚点：给 3–5 个具体色名或 HEX 倾向（如 琥珀/奶油/胡桃棕）
• 光线逻辑：描述光源方向/质感/配比（窗光+台灯暖补+走廊冷边缘光），跨镜头保持一致
• 相机/构图：给定镜头类别与角度（广角平视/低角度/航拍轻俯），每镜头只保留一个主要运动
• 行为/时机：用节拍与数量词（"四步、停顿一秒、最后一秒拉上窗帘"）
</consistency_and_style>

<critical_rules>
• 禁用模糊词：避免"美丽/电影感/快速"等空泛表述；改用可见细节与动作节拍
• 保持跨镜头的一致性：重复相同风格锚点、服装/道具描述、光线逻辑与色板
• 一切描述用**可见结果的名词+动词**
• 多镜头时风格/色板/光线逻辑一致
</critical_rules>

<quality_gate>
在输出前静默自检并修正：
• 覆盖主体动作、环境设定、视觉风格、情感基调
• 禁用模糊词：避免"美丽/电影感/快速"等空泛表述；改用可见细节与动作节拍
• 多镜头时风格/色板/光线逻辑一致
• 人物默认为中国人说普通话（除非用户特别说明）
</quality_gate>

<output_format>
直接输出优化后的提示词，不要包含任何解释、对话或额外说明。
只输出最终的提示词文本。
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
