"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Download,
  ImageIcon,
  Maximize2,
  Paperclip,
  Plus,
  Shuffle,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AspectRatio } from "../types";
import { VIDEO_PROMPTS } from "../utils/prompt-library";
import Lightbox from "./lightbox";
import AssetPicker from "./asset-picker";
import { PromptEnhanceDialog } from "./prompt-enhance-dialog";
import { useStudio } from "../context/studio-context";
import { useTaskPolling, VideoTaskStatus } from "../hooks/use-task-polling";
import { useSimulatedProgress } from "../hooks/use-simulated-progress";
import { cn } from "@/lib/utils";

type RenderMode = "Fast" | "Quality";

interface VideoConfig {
  fastProvider: string;
  qualityProvider: string;
  creditCosts: {
    videoFast: number;
    videoQuality: number;
    image: number;
  };
  dailyLimits: {
    fast: number;
    quality: number;
  };
}

interface VideoSessionTask {
  id: string;
  sessionId?: string | null;
  status: "pending" | "running" | "succeeded" | "error" | "retrying";
  progress: number;
  prompt: string;
  aspectRatio: string;
  duration: number;
  model: string;
  videoUrl?: string | null;
  sourceImageUrl?: string | null;
  errorMessage?: string | null;
  creditCost: number;
  createdAt: string;
  completedAt?: string | null;
}

const DEFAULT_CREDIT_COSTS = {
  Fast: 30,
  Quality: 100,
} as const;

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

async function urlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return fileToDataUri(new File([blob], "source-image", { type: blob.type || "image/png" }));
}

function parseDataUri(dataUri: string): { base64: string; mimeType: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function getImageData(file: File | null, preview: string | null) {
  if (file) return parseDataUri(await fileToDataUri(file));
  if (preview && !preview.startsWith("blob:")) return parseDataUri(await urlToDataUri(preview));
  return null;
}

function taskDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function VideoWorkshop() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const imageParam = searchParams.get("image");
  const { state, refreshCredits, refreshVideoTasks } = useStudio();

  const [prompt, setPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SOCIAL);
  const [duration, setDuration] = useState<8 | 10 | 15>(10);
  const [mode, setMode] = useState<RenderMode>("Fast");
  const [loading, setLoading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [optimisticTask, setOptimisticTask] = useState<VideoSessionTask | null>(null);
  const [sessionTasks, setSessionTasks] = useState<VideoSessionTask[]>([]);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
  const [failCount, setFailCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRequestRef = useRef(0);

  const isVeo =
    mode === "Fast"
      ? videoConfig?.fastProvider === "veo"
      : videoConfig?.qualityProvider === "veo";
  const allVeo =
    videoConfig?.fastProvider === "veo" && videoConfig?.qualityProvider === "veo";
  const creditCosts = {
    Fast: videoConfig?.creditCosts.videoFast ?? DEFAULT_CREDIT_COSTS.Fast,
    Quality: videoConfig?.creditCosts.videoQuality ?? DEFAULT_CREDIT_COSTS.Quality,
  };
  const currentCost = isVeo ? creditCosts.Fast : creditCosts[mode];

  const loadSession = useCallback(async () => {
    const requestId = sessionRequestRef.current + 1;
    sessionRequestRef.current = requestId;

    if (!activeSessionId) {
      setSessionTasks([]);
      setCurrentTaskId(null);
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/studio/sessions/${activeSessionId}?type=video`);
    if (requestId !== sessionRequestRef.current) return;

    if (!response.ok) {
      setSessionTasks([]);
      setCurrentTaskId(null);
      setLoading(false);
      return;
    }

    const data = await response.json();
    const nextTasks = (data.tasks ?? []) as VideoSessionTask[];
    const activeTask = [...nextTasks]
      .reverse()
      .find((task) =>
        task.status === "pending" ||
        task.status === "running" ||
        task.status === "retrying"
      );

    setSessionTasks(nextTasks);
    setCurrentTaskId(activeTask?.id ?? null);
    setLoading(Boolean(activeTask));
  }, [activeSessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    setOptimisticTask((prev) =>
      prev && prev.sessionId === activeSessionId ? prev : null
    );
    setCurrentTaskId(null);
    setLoading(false);
    setFailCount(0);
  }, [activeSessionId]);

  useEffect(() => {
    const handler = () => {
      setPrompt("");
      setSourceImage(null);
      setSourcePreview(null);
      setOptimisticTask(null);
      setCurrentTaskId(null);
      setLoading(false);
    };
    window.addEventListener("studio:new-session", handler);
    return () => window.removeEventListener("studio:new-session", handler);
  }, []);

  useEffect(() => {
    if (imageParam) {
      setSourcePreview(decodeURIComponent(imageParam));
    }
  }, [imageParam]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/video/config");
        const json = await res.json();
        if (json.success) {
          setVideoConfig(json.data);
          if (json.data.fastProvider === "veo" && json.data.qualityProvider === "veo") {
            setDuration(8);
          }
        }
      } catch (error) {
        console.error("获取视频配置失败:", error);
      }
    };
    void fetchConfig();
  }, []);

  useEffect(() => {
    if (isVeo) {
      setDuration(8);
    } else {
      setDuration((prev) => (prev === 8 ? 10 : prev));
    }
  }, [isVeo]);

  const handleTaskComplete = useCallback(
    (task: VideoTaskStatus) => {
      setLoading(false);
      setCurrentTaskId(null);
      setFailCount(0);
      setOptimisticTask((prev) =>
        prev && prev.id === task.id
          ? {
              ...prev,
              status: "succeeded",
              progress: 100,
              videoUrl: task.videoUrl,
              completedAt: task.completedAt,
            }
          : prev
      );
      void refreshCredits();
      void refreshVideoTasks();
      void loadSession();
      window.dispatchEvent(new CustomEvent("studio:sessions-changed"));
    },
    [loadSession, refreshCredits, refreshVideoTasks]
  );

  const handleTaskError = useCallback(
    (task: VideoTaskStatus) => {
      setLoading(false);
      setCurrentTaskId(null);
      setFailCount((prev) => prev + 1);
      setOptimisticTask((prev) =>
        prev && prev.id === task.id
          ? {
              ...prev,
              status: "error",
              progress: task.progress ?? prev.progress,
              errorMessage: task.errorMessage,
            }
          : prev
      );
      toast.error(task.errorMessage || "视频生成失败，积分已退还");
      void refreshCredits();
      void refreshVideoTasks();
      void loadSession();
    },
    [loadSession, refreshCredits, refreshVideoTasks]
  );

  const { task: pollingTask } = useTaskPolling<VideoTaskStatus>({
    taskId: currentTaskId,
    taskType: "video",
    interval: 3000,
    onComplete: handleTaskComplete,
    onError: handleTaskError,
  });

  const simulatedProgress = useSimulatedProgress({
    isRunning: loading,
    actualStatus: pollingTask?.status,
    estimatedDuration: 300000,
    maxProgress: 92,
  });

  const progress = pollingTask?.progress ?? simulatedProgress;
  const taskStatus = pollingTask?.status || "pending";

  useEffect(() => {
    setOptimisticTask((prev) =>
      prev && currentTaskId === prev.id && loading
          ? {
              ...prev,
              status: taskStatus,
              progress,
              videoUrl: pollingTask?.videoUrl ?? prev.videoUrl,
              errorMessage: pollingTask?.errorMessage ?? prev.errorMessage,
            }
        : prev
    );
  }, [currentTaskId, loading, pollingTask?.errorMessage, pollingTask?.videoUrl, progress, taskStatus]);

  const tasks = useMemo(() => {
    const map = new Map<string, VideoSessionTask>();
    sessionTasks.forEach((task) => map.set(task.id, task));
    if (optimisticTask?.sessionId === activeSessionId) {
      map.set(optimisticTask.id, optimisticTask);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeSessionId, sessionTasks, optimisticTask]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [tasks.length, progress]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSourceImage(file);
    setSourcePreview(URL.createObjectURL(file));
  };

  const handleAssetSelect = (url: string) => {
    setSourcePreview(url);
    setSourceImage(null);
  };

  const clearAttachment = () => {
    setSourceImage(null);
    setSourcePreview(null);
  };

  const handleRandomPrompt = async () => {
    if (enhancing || randomizing) return;
    const hasImage = sourceImage || (sourcePreview && !sourcePreview.startsWith("blob:"));

    if (!hasImage) {
      const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
      setPrompt(random);
      return;
    }

    setRandomizing(true);
    try {
      const imageData = await getImageData(sourceImage, sourcePreview);
      if (!imageData) {
        const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
        setPrompt(random);
        return;
      }

      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "根据这张图片，生成一个适合图生视频的创意提示词。描述图片中的主体，并设计一个有趣的动态效果。",
          provider: isVeo ? "veo" : undefined,
          imageBase64: imageData.base64,
          imageMimeType: imageData.mimeType,
          mode: "random",
        }),
      });

      const data = await res.json();
      setPrompt(data.enhancedPrompt || VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)]);
    } catch (error) {
      console.error("随机提示词生成失败:", error);
      const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
      setPrompt(random);
    } finally {
      setRandomizing(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || randomizing || enhancing) return;

    setEnhancing(true);
    try {
      const imageData = await getImageData(sourceImage, sourcePreview);
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: isVeo ? "veo" : undefined,
          ...(imageData && {
            imageBase64: imageData.base64,
            imageMimeType: imageData.mimeType,
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `润色失败（状态码 ${res.status}）`);
      }

      setEnhancedPrompt(data.enhancedPrompt);
      setEnhanceDialogOpen(true);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`润色失败：${detail}`);
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    const resolvedPrompt = prompt.trim() || "Product showcase, cinematic lighting, 4k";
    if (!prompt.trim() && !sourceImage && !sourcePreview) {
      toast.error("请提供提示词或图像");
      return;
    }

    const currentLimit = mode === "Fast"
      ? videoConfig?.dailyLimits?.fast
      : videoConfig?.dailyLimits?.quality;
    if (currentLimit === 0) {
      toast.error("该视频渠道暂不可用，请稍后再试");
      return;
    }

    if (state.credits < currentCost) {
      toast.error(`积分不足，本次需要 ${currentCost} 积分`);
      return;
    }

    setLoading(true);

    try {
      const imageData = await getImageData(sourceImage, sourcePreview);

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: resolvedPrompt,
          mode: isVeo ? "Fast" : mode,
          aspectRatio: aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9",
          duration: isVeo ? 8 : duration,
          sessionId: activeSessionId ?? undefined,
          imageBase64: imageData?.base64,
          imageMimeType: imageData?.mimeType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "创建视频任务失败");
      }

      const nextSessionId = data.sessionId as string;
      const nextTask: VideoSessionTask = {
        id: data.taskId,
        sessionId: nextSessionId,
        status: "running",
        progress: 0,
        prompt: resolvedPrompt,
        aspectRatio: aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9",
        duration: isVeo ? 8 : duration,
        model: isVeo ? "veo3.1-fast" : mode === "Quality" ? "sora-2-pro" : "sora-2-temporary",
        sourceImageUrl: sourcePreview,
        creditCost: data.creditCost ?? currentCost,
        createdAt: new Date().toISOString(),
      };

      setOptimisticTask(nextTask);
      setCurrentTaskId(data.taskId);
      setPrompt("");
      setFailCount(0);
      void refreshCredits();
      if (!activeSessionId) {
        router.replace(`${pathname}?session=${nextSessionId}`);
      }
      window.dispatchEvent(new CustomEvent("studio:sessions-changed"));
    } catch (error) {
      setLoading(false);
      setFailCount((prev) => prev + 1);
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`视频生成失败：${detail}`);
    }
  };

  const renderComposer = (centered = false) => (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[980px]",
        centered ? "px-4" : "px-4 pb-4 md:px-8 md:pb-6"
      )}
    >
      <div className="min-w-0 rounded-[28px] border border-black/15 bg-white p-3 shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
        {sourcePreview && (
          <div className="mb-3 flex items-center gap-3">
            <div className="relative size-24 overflow-hidden rounded-2xl bg-[#f4f4f4]">
              <img src={sourcePreview} alt="源图像" className="size-full object-cover" />
              <button
                type="button"
                onClick={clearAttachment}
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black text-white"
                aria-label="移除源图像"
              >
                <X className="size-4" />
              </button>
            </div>
            <span className="text-sm text-[#6f6f6f]">将作为视频源图像</span>
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleGenerate();
            }
          }}
          rows={centered ? 2 : 1}
          maxLength={10000}
          placeholder="描述你想生成的视频"
          className="max-h-40 min-h-12 w-full min-w-0 resize-none bg-transparent px-3 py-2 text-[17px] leading-relaxed outline-none placeholder:text-[#8b8b8b]"
        />

        <div className="relative px-1 pb-12 sm:pb-1">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 pr-12">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
              aria-label="上传源图像"
            >
              <Plus className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#0b84ff] hover:bg-[#edf6ff]"
            >
              <ImageIcon className="size-4" />
              历史素材
            </button>
            <button
              type="button"
              onClick={handleRandomPrompt}
              disabled={randomizing || enhancing}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
            >
              <Shuffle className="size-4" />
              {randomizing ? "生成中" : "随机"}
            </button>
            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={!prompt.trim() || enhancing || randomizing}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
            >
              <Wand2 className="size-4" />
              {enhancing ? "润色中" : "润色"}
            </button>
            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm outline-none hover:bg-black/5"
            >
              <option value={AspectRatio.SOCIAL}>9:16</option>
              <option value={AspectRatio.LANDSCAPE}>16:9</option>
            </select>
            <select
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value) as 8 | 10 | 15)}
              disabled={isVeo}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm outline-none hover:bg-black/5 disabled:opacity-60"
            >
              <option value={8}>8 秒</option>
              <option value={10}>10 秒</option>
              <option value={15}>15 秒</option>
            </select>
            {!allVeo && (
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as RenderMode)}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm outline-none hover:bg-black/5"
            >
              <option value="Fast">快速</option>
              <option value="Quality">高质量</option>
            </select>
            )}
            <span className="rounded-full bg-[#f4f4f4] px-3 py-2 text-sm text-[#666]">
              {currentCost} 积分
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || (!prompt.trim() && !sourceImage && !sourcePreview)}
            className="absolute bottom-1 right-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#333] disabled:bg-[#d7d7d7]"
            aria-label="发送"
          >
            <ArrowUp className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const empty = tasks.length === 0;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden bg-white">
      {lightboxVideo && (
        <Lightbox src={lightboxVideo} type="video" onClose={() => setLightboxVideo(null)} />
      )}
      {pickerOpen && (
        <AssetPicker
          history={state.history}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAssetSelect}
        />
      )}
      <PromptEnhanceDialog
        open={enhanceDialogOpen}
        onOpenChange={setEnhanceDialogOpen}
        originalPrompt={prompt}
        enhancedPrompt={enhancedPrompt}
        onConfirm={() => {
          setPrompt(enhancedPrompt);
          setEnhanceDialogOpen(false);
        }}
      />

      {empty ? (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start overflow-x-hidden overflow-y-auto px-4 pb-10 pt-8 md:justify-center md:pt-0">
          <h1 className="mb-8 text-center text-3xl font-normal tracking-normal md:text-4xl">
            想生成什么视频？
          </h1>
          {renderComposer(true)}
          <div className="mt-8 flex w-full max-w-[980px] gap-3 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-32 w-28 shrink-0 flex-col items-center justify-center gap-3 rounded-3xl bg-[#f6f6f6] text-sm text-[#777] hover:bg-[#efefef]"
            >
              <Paperclip className="size-5" />
              上传源图
            </button>
            {VIDEO_PROMPTS.slice(0, 6).map((item, index) => (
              <button
                type="button"
                key={item}
                onClick={() => setPrompt(item)}
                className="h-32 w-44 shrink-0 rounded-3xl bg-[#f6f6f6] p-4 text-left text-sm leading-relaxed text-[#555] hover:bg-[#efefef]"
              >
                <span className="mb-2 block text-xs text-[#888]">示例 {index + 1}</span>
                <span className="line-clamp-4">{item}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-8">
            <div className="mx-auto flex max-w-[980px] flex-col gap-10">
              {tasks.map((task) => {
                const isWorking =
                  task.status === "pending" ||
                  task.status === "running" ||
                  task.status === "retrying" ||
                  (optimisticTask?.id === task.id && loading);
                const videoUrl = task.videoUrl;
                const liveProgress = currentTaskId === task.id ? progress : task.progress;

                return (
                  <article key={task.id} className="flex flex-col gap-5">
                    <div className="ml-auto max-w-[760px] rounded-[24px] bg-[#f4f4f4] px-5 py-3 text-[16px] leading-relaxed">
                      {task.prompt}
                    </div>
                    <div className="max-w-[760px]">
                      <div className="mb-3 flex items-center gap-2 text-sm text-[#777]">
                        <Sparkles className="size-4" />
                        <span>
                          视频生成 · {task.aspectRatio} · {task.duration} 秒 · {taskDate(task.createdAt)}
                        </span>
                      </div>
                      {task.sourceImageUrl && (
                        <img
                          src={task.sourceImageUrl}
                          alt="源图像"
                          className="mb-4 size-28 rounded-2xl object-cover"
                        />
                      )}
                      {isWorking ? (
                        <div className="w-full rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                          <p className="text-base">
                            {task.status === "retrying" ? "正在自动重试" : "正在生成视频"}
                          </p>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ececec]">
                            <div
                              className="h-full rounded-full bg-black transition-all duration-500"
                              style={{ width: `${liveProgress}%` }}
                            />
                          </div>
                          <p className="mt-3 text-sm text-[#777]">
                            {liveProgress}%
                          </p>
                        </div>
                      ) : task.status === "error" ? (
                        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                          {failCount >= 3
                            ? "上游服务暂时繁忙，建议稍后再试。积分不会扣除。"
                            : task.errorMessage || "视频生成失败，积分已退还"}
                        </div>
                      ) : videoUrl ? (
                        <div className="group w-fit">
                          <video
                            src={videoUrl}
                            controls
                            className="max-h-[640px] max-w-full rounded-3xl bg-black"
                          />
                          <div className="mt-3 flex items-center gap-2 text-[#555]">
                            <button
                              type="button"
                              onClick={() => setLightboxVideo(videoUrl)}
                              className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                              aria-label="放大"
                            >
                              <Maximize2 className="size-5" />
                            </button>
                            <a
                              href={videoUrl}
                              download="generated_video.mp4"
                              className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                              aria-label="下载"
                            >
                              <Download className="size-5" />
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          {renderComposer(false)}
        </>
      )}
    </div>
  );
}
