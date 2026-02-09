export interface KieCreateTaskParams {
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  duration: number;
  imageUrl?: string;
  callbackUrl?: string;
  progressCallbackUrl?: string;
  isPro?: boolean;
}

export interface KieCreateTaskResponse {
  id: string;
}

export interface KieVideoTaskStatusResponse {
  state: "pending" | "running" | "succeeded" | "error";
  progress?: number;
  data?: {
    videos?: { url: string }[];
  };
  message?: string;
  error?: string;
}

const KIE_API_BASE = "https://api.kie.ai/api/v1";

function mapAspectRatio(aspectRatio: string): "portrait" | "landscape" {
  return aspectRatio === "9:16" ? "portrait" : "landscape";
}

function mapDurationToFrames(duration: number): "10" | "15" {
  return duration === 15 ? "15" : "10";
}

function mapKieState(
  state: string
): "pending" | "running" | "succeeded" | "error" {
  switch (state) {
    case "success":
      return "succeeded";
    case "fail":
      return "error";
    case "generating":
      return "running";
    case "waiting":
    case "queuing":
      return "pending";
    default:
      return "pending";
  }
}

export const kieService = {
  async createVideoTask(
    params: KieCreateTaskParams
  ): Promise<KieCreateTaskResponse> {
    const apiKey = process.env.KIE_AI_API_KEY;

    if (!apiKey) {
      throw new Error("KIE_AI_API_KEY 环境变量未设置");
    }

    const model = params.imageUrl
      ? params.isPro
        ? "sora-2-pro-image-to-video"
        : "sora-2-image-to-video"
      : params.isPro
        ? "sora-2-pro-text-to-video"
        : "sora-2-text-to-video";

    const input: Record<string, unknown> = {
      prompt: params.prompt,
      aspect_ratio: mapAspectRatio(params.aspectRatio),
      n_frames: mapDurationToFrames(params.duration),
      remove_watermark: true,
      upload_method: "s3",
    };

    if (params.imageUrl) {
      input.image_url = params.imageUrl;
    }

    const requestBody: Record<string, unknown> = {
      model,
      input,
    };

    if (params.callbackUrl) {
      requestBody.callBackUrl = params.callbackUrl;
    }

    if (params.progressCallbackUrl) {
      requestBody.progressCallBackUrl = params.progressCallbackUrl;
    }

    const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
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
        `KIE AI API 错误: ${response.status}${errorText ? ` - ${errorText}` : ""}`
      );
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data?.taskId) {
      throw new Error(
        `KIE AI 创建任务失败: ${result.msg || "未知错误"}`
      );
    }

    return { id: result.data.taskId };
  },

  async getVideoTaskStatus(
    taskId: string
  ): Promise<KieVideoTaskStatusResponse> {
    const apiKey = process.env.KIE_AI_API_KEY;

    if (!apiKey) {
      throw new Error("KIE_AI_API_KEY 环境变量未设置");
    }

    const response = await fetch(
      `${KIE_API_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`KIE AI API 错误: ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data) {
      throw new Error(
        `KIE AI 查询任务失败: ${result.msg || "未知错误"}`
      );
    }

    const data = result.data;
    const mappedState = mapKieState(data.state);

    let videoUrls: { url: string }[] | undefined;
    if (data.resultJson) {
      try {
        const parsed =
          typeof data.resultJson === "string"
            ? JSON.parse(data.resultJson)
            : data.resultJson;
        if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
          videoUrls = parsed.resultUrls.map((url: string) => ({ url }));
        }
      } catch {
        // resultJson parse failed, ignore
      }
    }

    return {
      state: mappedState,
      progress: typeof data.progress === "number" ? data.progress : undefined,
      data: videoUrls ? { videos: videoUrls } : undefined,
      message: data.failMsg || undefined,
      error: data.failMsg || undefined,
    };
  },
};
