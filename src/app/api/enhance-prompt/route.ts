import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "@/lib/auth/get-session";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

const SORA_SYSTEM_PROMPT = `你是一位专精 Sora 2 的创意总监（Creative Director），专门将用户的创意愿景转译为可制作、可连贯的视频提示词。

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

const VEO_SYSTEM_PROMPT = `你是一位专精 VEO 视频模型的创意总监（Creative Director），专门将用户的创意愿景转译为适合 VEO 模型的高质量视频提示词。

<role>
你的任务是直接优化用户提供的提示词，使其符合 VEO 模型最佳实践。
• 语言镜像：用用户语言回复（中文优先，或 English）
• 默认人物为中国人，说普通话，除非用户特别说明其他国籍或语言
</role>

<veo_constraints>
• 视频固定为 8 秒时长，所有动作和叙事必须在 8 秒内完成
• 聚焦单镜头描述：一个连贯的场景、一个主要动作、一种相机运动
• 避免多镜头切换或复杂的场景转换，8 秒内只需一个完整的视觉叙事
• 提示词应简洁明确，避免过于复杂的多层描述
</veo_constraints>

<approach>
为 8 秒短视频设计单一镜头，既**清晰具体**又**留有创作空间**。重点是一个完整的视觉瞬间，而非多镜头叙事。
</approach>

<structure_guides>
• 单镜头结构：明确【主体/动作/环境/光线/相机运动】
• 只包含一个清晰的主体动作 + 一种相机运动
• 风格锚点在提示词开头设定（如"cinematic 4K""drone aerial""macro close-up"）
• 描述用**可见结果的名词+动词**，避免抽象词
• 时间节奏适配 8 秒：动作要有明确的起始和结束
</structure_guides>

<critical_rules>
• 8 秒约束：所有描述的动作必须在 8 秒内自然完成
• 单镜头：不要描述剪辑、转场或多个场景
• 禁用模糊词：避免"美丽/电影感/快速"等空泛表述
• 一切描述用**可见结果的名词+动词**
• 人物默认为中国人说普通话（除非用户特别说明）
</critical_rules>

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
    const { prompt, provider, imageBase64, imageMimeType, mode } = await request.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 校验图片参数：必须成对出现，且限制大小 (10MB base64 ≈ 7.5MB 原图)
    const hasImage = imageBase64 && imageMimeType;
    if (imageBase64 && !imageMimeType) {
      return NextResponse.json(
        { error: "imageMimeType is required when imageBase64 is provided" },
        { status: 400 }
      );
    }
    if (hasImage) {
      if (typeof imageBase64 !== "string" || typeof imageMimeType !== "string") {
        return NextResponse.json(
          { error: "Invalid image parameters" },
          { status: 400 }
        );
      }
      const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~10MB base64
      if (imageBase64.length > MAX_BASE64_LENGTH) {
        return NextResponse.json(
          { error: "Image too large, max 10MB" },
          { status: 400 }
        );
      }
      const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!ALLOWED_MIME_TYPES.includes(imageMimeType)) {
        return NextResponse.json(
          { error: "Unsupported image type" },
          { status: 400 }
        );
      }
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

    // 根据是否有图片和模式选择不同的系统提示
    let systemInstruction: string;
    if (mode === "random" && hasImage) {
      // 随机模式 + 有图片：根据图片生成创意提示词
      const baseConstraint = provider === "veo"
        ? "生成的提示词必须适合 8 秒单镜头短视频。"
        : "生成的提示词可以包含多镜头叙事。";
      systemInstruction = `你是一位视频创意总监。用户会提供一张图片，你需要仔细分析图片内容（主体、场景、色调、氛围），然后生成一个富有创意的视频提示词。

要求：
- 仔细观察图片中的主体、颜色、材质、场景
- 基于图片内容设计动态效果（相机运动、光线变化、物体动作等）
- ${baseConstraint}
- 提示词要具体、可执行，避免模糊词汇
- 用中文输出
- 直接输出提示词，不要任何解释

只输出最终的提示词文本。`;
    } else if (hasImage) {
      // 润色模式 + 有图片：结合图片内容润色提示词
      const basePrompt = provider === "veo" ? VEO_SYSTEM_PROMPT : SORA_SYSTEM_PROMPT;
      systemInstruction = basePrompt + `

<image_context>
用户同时提供了一张参考图片。你必须：
1. 仔细分析图片中的主体、场景、色调、材质
2. 确保优化后的提示词与图片内容一致
3. 基于图片中的实际元素来丰富描述（而非凭空想象）
4. 如果用户的提示词与图片内容不符，以图片为准进行调整
</image_context>`;
    } else {
      systemInstruction = provider === "veo" ? VEO_SYSTEM_PROMPT : SORA_SYSTEM_PROMPT;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction,
    });

    // 构建请求内容 - 如果有图片则包含图片
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
    }

    parts.push({ text: prompt.trim() });

    const result = await model.generateContent(parts);
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
    const message = sanitizeApiErrorMessage(error);

    return NextResponse.json(
      { error: `润色提示词失败：${message}` },
      { status: 500 }
    );
  }
}
