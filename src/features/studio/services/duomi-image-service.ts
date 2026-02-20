export interface DuomiTextToImageParams {
  prompt: string;
  model: "gemini-3-pro-image-preview" | "gemini-2.5-flash-image";
  aspectRatio?: string;
  imageSize?: string;
}

export interface DuomiImageToImageParams {
  prompt: string;
  model: "gemini-3-pro-image-preview" | "gemini-2.5-flash-image";
  imageUrls: string[];
  aspectRatio?: string;
  imageSize?: string;
}

export interface DuomiCreateImageResponse {
  task_id: string;
}

export interface DuomiImageResult {
  url: string;
  file_name: string;
}

export interface DuomiTaskStatusResponse {
  state: "pending" | "running" | "succeeded" | "error";
  data?: {
    images: DuomiImageResult[];
  };
  error?: string;
}

const DUOMI_API_BASE = "https://duomiapi.com";

async function getDuomiImageErrorDetail(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await response.json().catch(() => null);
    if (json && typeof json === "object") {
      const message =
        typeof (json as { message?: unknown }).message === "string"
          ? (json as { message: string }).message
          : typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : "";
      return message || JSON.stringify(json);
    }
  }

  return (await response.text().catch(() => "")).trim();
}

export const duomiImageService = {
  async createTextToImageTask(
    params: DuomiTextToImageParams
  ): Promise<DuomiCreateImageResponse> {
    const apiKey = process.env.DUOMI_API;

    if (!apiKey) {
      throw new Error("DUOMI_API 环境变量未设置");
    }

    const requestBody: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
    };

    if (params.aspectRatio) {
      requestBody.aspect_ratio = params.aspectRatio;
    }

    if (params.imageSize) {
      requestBody.image_size = params.imageSize;
    }

    const response = await fetch(`${DUOMI_API_BASE}/api/gemini/nano-banana`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const detail = await getDuomiImageErrorDetail(response);
      throw new Error(
        `Duomi API 错误: ${response.status}${detail ? ` - ${detail}` : ""}`
      );
    }

    const result = await response.json();
    // Duomi API 返回格式: { code: 200, data: { task_id: "..." } }
    if (result.data?.task_id) {
      return { task_id: result.data.task_id };
    }
    return result;
  },

  async createImageToImageTask(
    params: DuomiImageToImageParams
  ): Promise<DuomiCreateImageResponse> {
    const apiKey = process.env.DUOMI_API;

    if (!apiKey) {
      throw new Error("DUOMI_API 环境变量未设置");
    }

    const requestBody: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      image_urls: params.imageUrls,
    };

    if (params.aspectRatio) {
      requestBody.aspect_ratio = params.aspectRatio;
    }

    if (params.imageSize) {
      requestBody.image_size = params.imageSize;
    }

    const response = await fetch(
      `${DUOMI_API_BASE}/api/gemini/nano-banana-edit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const detail = await getDuomiImageErrorDetail(response);
      throw new Error(
        `Duomi API 错误: ${response.status}${detail ? ` - ${detail}` : ""}`
      );
    }

    const result = await response.json();
    // Duomi API 返回格式: { code: 200, data: { task_id: "..." } }
    if (result.data?.task_id) {
      return { task_id: result.data.task_id };
    }
    return result;
  },

  async getTaskStatus(taskId: string): Promise<DuomiTaskStatusResponse> {
    const apiKey = process.env.DUOMI_API;

    if (!apiKey) {
      throw new Error("DUOMI_API 环境变量未设置");
    }

    const response = await fetch(
      `${DUOMI_API_BASE}/api/gemini/nano-banana/${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      const detail = await getDuomiImageErrorDetail(response);
      throw new Error(
        `Duomi API 错误: ${response.status}${detail ? ` - ${detail}` : ""}`
      );
    }

    const result = await response.json();
    // Duomi API 返回格式: { code: 200, data: { state: "...", data: {...} } }
    if (result.data) {
      return {
        state: result.data.state,
        data: result.data.data,
        error: result.data.msg || result.data.error,
      };
    }
    return result;
  },
};
