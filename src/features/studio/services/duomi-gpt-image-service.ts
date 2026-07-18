// Duomi GPT-Image-2 provider（OpenAI 兼容异步端点）
// 实测（2026-07）：
//   创建: POST {base}/v1/images/generations?async=true  Authorization: DUOMI_API
//         body { model:"gpt-image-2", prompt, size:"宽x高"(必须被16整除), image_urls?: string[] }
//         → { id: "<task_id>" }；4xx → { error: { code, message, type } }
//   查询: GET  {base}/v1/tasks/{id}
//         → { id, state: pending|running|succeeded|error, progress,
//             data?: { images: [{ url, file_name }], description }, ... }

export type PptResolution = "2k" | "4k";

// 16:9 整页幻灯片尺寸（宽高均被 16 整除）
const RESOLUTION_SIZES: Record<PptResolution, string> = {
  "2k": "2048x1152",
  "4k": "3840x2160",
};

export interface GptImageCreateParams {
  prompt: string;
  resolution: PptResolution;
  /** 参考图（模板克隆）；传入后 gpt-image-2 会参照其版式风格 */
  imageUrls?: string[];
}

export interface GptImageCreateResponse {
  task_id: string;
}

export interface GptImageTaskStatus {
  state: "pending" | "running" | "succeeded" | "error";
  imageUrl?: string;
  error?: string;
}

function getApiBase(): string {
  return process.env.DUOMI_API_BASE || "https://duomiapi.com";
}

function getApiKey(): string {
  const apiKey = process.env.DUOMI_API;
  if (!apiKey) {
    throw new Error("DUOMI_API 环境变量未设置");
  }
  return apiKey;
}

async function getErrorDetail(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await response.json().catch(() => null);
    if (json && typeof json === "object") {
      const errorObj = (json as { error?: { message?: unknown } }).error;
      if (errorObj && typeof errorObj.message === "string") {
        return errorObj.message;
      }
      const message =
        typeof (json as { message?: unknown }).message === "string"
          ? (json as { message: string }).message
          : "";
      return message || JSON.stringify(json);
    }
  }
  return (await response.text().catch(() => "")).trim();
}

export const duomiGptImageService = {
  async createTask(params: GptImageCreateParams): Promise<GptImageCreateResponse> {
    const requestBody: Record<string, unknown> = {
      model: "gpt-image-2",
      prompt: params.prompt,
      size: RESOLUTION_SIZES[params.resolution],
    };

    if (params.imageUrls && params.imageUrls.length > 0) {
      requestBody.image_urls = params.imageUrls;
    }

    const response = await fetch(
      `${getApiBase()}/v1/images/generations?async=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getApiKey(),
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const detail = await getErrorDetail(response);
      throw new Error(
        `Duomi API 错误: ${response.status}${detail ? ` - ${detail}` : ""}`
      );
    }

    const result = await response.json();
    if (typeof result?.id === "string" && result.id) {
      return { task_id: result.id };
    }
    throw new Error(`Duomi API 返回缺少任务 ID: ${JSON.stringify(result)}`);
  },

  async getTaskStatus(taskId: string): Promise<GptImageTaskStatus> {
    const response = await fetch(`${getApiBase()}/v1/tasks/${taskId}`, {
      method: "GET",
      headers: { Authorization: getApiKey() },
    });

    if (!response.ok) {
      const detail = await getErrorDetail(response);
      throw new Error(
        `Duomi API 错误: ${response.status}${detail ? ` - ${detail}` : ""}`
      );
    }

    const result = await response.json();
    const state = result?.state;
    if (
      state !== "pending" &&
      state !== "running" &&
      state !== "succeeded" &&
      state !== "error"
    ) {
      throw new Error(`Duomi API 返回未知状态: ${JSON.stringify(result)}`);
    }

    return {
      state,
      imageUrl: result?.data?.images?.[0]?.url,
      error:
        typeof result?.data?.description === "string" && result.data.description
          ? result.data.description
          : typeof result?.error === "string"
            ? result.error
            : undefined,
    };
  },
};
