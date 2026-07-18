import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-3-flash-preview";

export interface GeminiImagePart {
  mimeType: string;
  base64: string;
}

export class GeminiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiServiceError";
  }
}

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError("GOOGLE_GEMINI_API_KEY 未配置");
  }
  return new GoogleGenerativeAI(apiKey);
}

function buildParts(
  userText: string,
  images?: GeminiImagePart[]
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  for (const image of images ?? []) {
    parts.push({
      inlineData: { mimeType: image.mimeType, data: image.base64 },
    });
  }

  parts.push({ text: userText });
  return parts;
}

/**
 * 从模型输出中提取 JSON：兼容 ```json 代码块包裹与前后闲话
 */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : trimmed).trim();

  const firstBrace = candidate.search(/[[{]/);
  if (firstBrace === -1) {
    throw new GeminiServiceError("模型未返回 JSON 内容");
  }

  return candidate.slice(firstBrace);
}

export const geminiService = {
  async generateText(params: {
    systemInstruction: string;
    userText: string;
    images?: GeminiImagePart[];
  }): Promise<string> {
    const model = getClient().getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: params.systemInstruction,
    });

    const result = await model.generateContent(
      buildParts(params.userText, params.images)
    );
    const text = result.response.text().trim();

    if (!text) {
      throw new GeminiServiceError("模型返回内容为空");
    }

    return text;
  },

  /**
   * 生成并解析 JSON。解析失败时自动带错误上下文重试一次。
   */
  async generateJson<T>(params: {
    systemInstruction: string;
    userText: string;
    images?: GeminiImagePart[];
    validate?: (value: unknown) => T;
  }): Promise<T> {
    const attempt = async (userText: string): Promise<T> => {
      const raw = await this.generateText({
        systemInstruction: params.systemInstruction,
        userText,
        images: params.images,
      });
      const parsed: unknown = JSON.parse(extractJson(raw));
      return params.validate ? params.validate(parsed) : (parsed as T);
    };

    try {
      return await attempt(params.userText);
    } catch (firstError) {
      const reason =
        firstError instanceof Error ? firstError.message : String(firstError);
      return attempt(
        `${params.userText}\n\n（上一次输出无法解析为合法 JSON：${reason}。请严格只输出 JSON，不要任何解释或代码块标记。）`
      );
    }
  },
};
