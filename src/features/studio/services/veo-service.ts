import {
  duomiService,
  PROVIDER_CREATE_TIMEOUT_MS,
} from "./duomi-service";

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

    // image_urls 必须始终出现，文生视频时也要给空数组。
    // 上游把它列在 required 里，而实测中省略该键并不会报错——
    // 任务会直接永久停在 `pending`（2026-09-18 实测：带空数组 2 分钟出片，
    // 省略则 8 分钟毫无进展）。对用户表现为「扣了积分、一直转圈、没有报错」，
    // 要等 recoverStuckVideoTasks 的 30 分钟阈值才兜得住。
    const requestBody: Record<string, unknown> = {
      model: "veo3.1-fast",
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      duration: 8,
      generation_type: generationType,
      image_urls: params.imageUrls?.slice(0, 3) ?? [],
    };

    const response = await fetch(`${DUOMI_API_BASE}/videos/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(PROVIDER_CREATE_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `VEO API 错误: ${response.status}${errorText ? ` - ${errorText}` : ""}`
      );
    }

    const result = await response.json();

    const taskId = result?.id || result?.data?.id || result?.data?.task_id || result?.task_id;
    if (!taskId) {
      throw new Error(`VEO API 返回格式异常: ${JSON.stringify(result)}`);
    }

    return { id: taskId };
  },

  async getVideoTaskStatus(taskId: string) {
    return duomiService.getVideoTaskStatus(taskId);
  },
};
