export interface DuomiCreateTaskParams {
  prompt: string;
  model: "sora-2-temporary" | "sora-2-pro";
  aspectRatio: "16:9" | "9:16";
  duration: number;
  imageUrl?: string;
  callbackUrl?: string;
}

// Duomi API 直接返回 { id: "..." }
export interface DuomiCreateTaskResponse {
  id: string;
}

export interface DuomiVideoResult {
  url: string;
}

export interface DuomiVideoTaskStatusResponse {
  id?: string;
  state: "pending" | "running" | "succeeded" | "error";
  data?: {
    videos?: DuomiVideoResult[];
  };
  progress?: number;
  message?: string;
  error?: string;
}

const DUOMI_API_BASE = "https://duomiapi.com/v1";

export const duomiService = {
  async createVideoTask(
    params: DuomiCreateTaskParams
  ): Promise<DuomiCreateTaskResponse> {
    const apiKey = process.env.DUOMI_API;

    if (!apiKey) {
      throw new Error("DUOMI_API 环境变量未设置");
    }

    const requestBody: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      duration: params.duration,
    };

    if (params.callbackUrl) {
      requestBody.callback_url = params.callbackUrl;
    }

    if (params.imageUrl) {
      requestBody.image_url = params.imageUrl;
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
      throw new Error(`Duomi API 错误: ${response.status}`);
    }

    return response.json();
  },

  async getVideoTaskStatus(
    taskId: string
  ): Promise<DuomiVideoTaskStatusResponse> {
    const apiKey = process.env.DUOMI_API;

    if (!apiKey) {
      throw new Error("DUOMI_API 环境变量未设置");
    }

    const response = await fetch(`${DUOMI_API_BASE}/videos/tasks/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Duomi API 错误: ${response.status}`);
    }

    const result = await response.json();

    if (
      result?.data &&
      typeof result.data === "object" &&
      "state" in result.data
    ) {
      return result.data as DuomiVideoTaskStatusResponse;
    }

    return result as DuomiVideoTaskStatusResponse;
  },
};
