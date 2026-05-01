"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  AudioLines,
  ChevronDown,
  Download,
  ImageIcon,
  Maximize2,
  Mic,
  Paperclip,
  Plus,
  Shuffle,
  SlidersHorizontal,
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

const VIDEO_ASPECT_OPTIONS = [
  { value: AspectRatio.SOCIAL, label: "9:16" },
  { value: AspectRatio.LANDSCAPE, label: "16:9" },
] as const;

const VIDEO_DURATION_OPTIONS = [8, 10, 15] as const;

function subscribeHydration() {
  return () => undefined;
}

function getHydratedClientSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

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
  const hasHydrated = React.useSyncExternalStore(
    subscribeHydration,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot
  );

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
        "mx-auto w-full min-w-0 max-w-[1010px]",
        centered ? "px-4" : "px-4 pb-4 md:px-8 md:pb-6"
      )}
    >
      <div className="min-h-[132px] min-w-0 rounded-[30px] border border-[#d7d7d7] bg-white px-6 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.07)]">
        {sourcePreview && (
          <div className="mb-3 flex items-center gap-3">
            <div className="relative size-20 overflow-hidden rounded-2xl bg-[#f4f4f4]">
              <img src={sourcePreview} alt="源图像" width={80} height={80} className="size-full object-cover" />
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
          aria-label="输入提示词"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleGenerate();
            }
          }}
          rows={1}
          maxLength={10000}
          placeholder="Ask anything"
          className="max-h-40 min-h-[50px] w-full min-w-0 resize-none rounded-xl bg-transparent px-2 py-1 text-[20px] leading-relaxed outline-none placeholder:text-[#8f8f8f] focus-visible:ring-4 focus-visible:ring-black/10"
        />

        <div className="mb-1 flex flex-wrap items-center gap-2 border-t border-[#eeeeee] pt-3">
          <div className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#f4f4f4] px-3 text-sm text-[#555]">
            <SlidersHorizontal className="size-4" strokeWidth={1.9} />
            设置
          </div>
          {!allVeo && (
            <div className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#f4f4f4] p-1">
              {(["Fast", "Quality"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "h-7 rounded-full px-3 text-sm transition",
                    mode === item
                      ? "bg-white text-[#0d0d0d] shadow-sm"
                      : "text-[#777] hover:text-[#0d0d0d]"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          <label className="sr-only" htmlFor="video-aspect-ratio">
            视频比例
          </label>
          <div className="relative shrink-0">
            <select
              id="video-aspect-ratio"
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}
              className="h-9 appearance-none rounded-full bg-[#f4f4f4] pl-3 pr-8 text-sm text-[#0d0d0d] outline-none transition hover:bg-[#eeeeee] focus:ring-4 focus:ring-black/10"
            >
              {VIDEO_ASPECT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#777]" />
          </div>
          <label className="sr-only" htmlFor="video-duration">
            视频时长
          </label>
          <div className="relative shrink-0">
            <select
              id="video-duration"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value) as 8 | 10 | 15)}
              disabled={isVeo}
              className="h-9 appearance-none rounded-full bg-[#f4f4f4] pl-3 pr-8 text-sm text-[#0d0d0d] outline-none transition hover:bg-[#eeeeee] focus:ring-4 focus:ring-black/10 disabled:text-[#9a9a9a]"
            >
              {VIDEO_DURATION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item} 秒
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#777]" />
          </div>
          <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#f4f4f4] px-3 text-sm text-[#555]">
            {currentCost} 积分
          </span>
        </div>

        <div className="relative">
          <div className="flex h-12 w-full min-w-0 items-center gap-3 pr-24">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="选择图像文件"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-10 items-center justify-center rounded-full hover:bg-black/5"
              aria-label="上传源图像"
            >
              <Plus className="size-6" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex h-9 items-center gap-2 rounded-full px-2.5 text-[18px] text-[#0b84ff] hover:bg-[#edf6ff]"
            >
              <ImageIcon className="size-5" strokeWidth={1.9} />
              Image
            </button>
            <button
              type="button"
              onClick={handleRandomPrompt}
              disabled={randomizing || enhancing}
              className="sr-only"
            >
              <Shuffle className="size-4" />
              {randomizing ? "生成中…" : "随机"}
            </button>
            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={!prompt.trim() || enhancing || randomizing}
              className="sr-only"
            >
              <Wand2 className="size-4" />
              {enhancing ? "润色中…" : "润色"}
            </button>
          </div>
          <button
            type="button"
            className="absolute bottom-1 right-14 flex size-10 items-center justify-center rounded-full hover:bg-black/5"
            aria-label="语音输入"
          >
            <Mic className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="absolute bottom-0 right-0 flex size-12 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#333] disabled:bg-[#d7d7d7]"
            aria-label="发送"
          >
            {prompt.trim() || sourceImage || sourcePreview ? (
              <ArrowUp className="size-5" />
            ) : (
              <AudioLines className="size-6" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const empty = tasks.length === 0;

  if (!hasHydrated) {
    return <div className="flex h-full min-w-0 flex-col overflow-x-hidden bg-white" />;
  }

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
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start overflow-x-hidden overflow-y-auto px-0 pb-10 pt-8 md:pt-[284px]">
          <h1 className="mb-[58px] text-center text-[35px] font-normal leading-tight tracking-normal">
            What can I help with?
          </h1>
          {renderComposer(true)}
          <div className="mt-[86px] flex w-full max-w-[1010px] gap-3 overflow-x-auto px-4 pb-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[184px] w-[124px] shrink-0 flex-col items-center justify-center gap-3 rounded-[18px] bg-[#f6f6f6] text-[16px] text-[#777] hover:bg-[#efefef]"
            >
              <Paperclip className="size-5" />
              Upload image
            </button>
            {VIDEO_PROMPTS.slice(0, 6).map((item, index) => (
              <button
                type="button"
                key={item}
                onClick={() => setPrompt(item)}
                className="h-[184px] w-[180px] shrink-0 rounded-[18px] bg-[#f6f6f6] p-4 text-left text-[15px] leading-relaxed text-[#555] hover:bg-[#efefef]"
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
                          width={112}
                          height={112}
                          className="mb-4 size-28 rounded-2xl object-cover"
                        />
                      )}
                      {isWorking ? (
                        <div className="w-full rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                          <p className="text-base">
                            {task.status === "retrying" ? "正在自动重试…" : "正在生成视频…"}
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
