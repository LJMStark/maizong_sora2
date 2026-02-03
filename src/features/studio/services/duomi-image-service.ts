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

export const duomiImageService = {
  async createTextToImageTask(
    params: DuomiTextToImageParams
  ): Promise<DuomiCreateImageResponse> {
    const apiKey = process.env.DUOMI_KEY;

    if (!apiKey) {
      throw new Error("DUOMI_KEY environment variable is not set");
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
      const errorText = await response.text();
      throw new Error(`Duomi API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async createImageToImageTask(
    params: DuomiImageToImageParams
  ): Promise<DuomiCreateImageResponse> {
    const apiKey = process.env.DUOMI_KEY;

    if (!apiKey) {
      throw new Error("DUOMI_KEY environment variable is not set");
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
      const errorText = await response.text();
      throw new Error(`Duomi API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async getTaskStatus(taskId: string): Promise<DuomiTaskStatusResponse> {
    const apiKey = process.env.DUOMI_KEY;

    if (!apiKey) {
      throw new Error("DUOMI_KEY environment variable is not set");
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
      const errorText = await response.text();
      throw new Error(`Duomi API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  },
};
