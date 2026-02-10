export interface VeoCreateTaskParams {
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  imageUrls?: string[];
}

export interface VeoCreateTaskResponse {
  id: string;
}

const DUOMI_API_BASE = "https://duomiapi.com/v1";

type GenerationType = "TEXT" | "FIRST&LAST" | "REFERENCE";

function resolveGenerationType(imageUrls?: string[]): GenerationType {
  if (!imageUrls || imageUrls.length === 0) return "TEXT";
  if (imageUrls.length === 2) return "FIRST&LAST";
  return "REFERENCE";
}

export const veoService = {
  async createVideoTask(
    params: VeoCreateTaskParams
  ): Promise<VeoCreateTaskResponse> {
    const apiKey = process.env.DUOMI_API;

    if (!apiKey) {
      throw new Error("DUOMI_API 环境变量未设置");
    }

    const generationType = resolveGenerationType(params.imageUrls);

    const requestBody: Record<string, unknown> = {
      model: "veo3.1-fast",
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      duration: 8,
      generation_type: generationType,
    };

    if (params.imageUrls && params.imageUrls.length > 0) {
      requestBody.image_urls = params.imageUrls.slice(0, 3);
    }

    const response = await fetch(`${DUOMI_API_BASE}/videos/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `VEO API 错误: ${response.status}${errorText ? ` - ${errorText}` : ""}`
      );
    }

    return response.json();
  },

  /**
   * 查询 VEO 任务状态
   * VEO 的查询 API 格式与 DUOMI 完全一致，复用 duomiService.getVideoTaskStatus
   */
  async getVideoTaskStatus(taskId: string) {
    const { duomiService } = await import("./duomi-service");
    return duomiService.getVideoTaskStatus(taskId);
  },
};
