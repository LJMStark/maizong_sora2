export interface DuomiCreateTaskParams {
  prompt: string;
  model: "sora-2" | "sora-2-pro";
  aspectRatio: "16:9" | "9:16";
  duration: number;
  imageUrl?: string;
  callbackUrl: string;
}

// Duomi API 直接返回 { id: "..." }
export interface DuomiCreateTaskResponse {
  id: string;
}

const DUOMI_API_BASE = "https://duomiapi.com/v1";

export const duomiService = {
  async createVideoTask(
    params: DuomiCreateTaskParams
  ): Promise<DuomiCreateTaskResponse> {
    const apiKey = process.env.DUOMI_API;

    if (!apiKey) {
      throw new Error("DUOMI_API environment variable is not set");
    }

    const requestBody: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      duration: params.duration,
      callback_url: params.callbackUrl,
    };

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
      const errorText = await response.text();
      throw new Error(`Duomi API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  },
};
