"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AspectRatio } from "../types";
import { VIDEO_PROMPTS } from "../utils/prompt-library";
import Lightbox from "./lightbox";
import AssetPicker from "./asset-picker";
import { PromptEnhanceDialog } from "./prompt-enhance-dialog";
import { useStudio } from "../context/studio-context";
import { useTaskPolling, VideoTaskStatus } from "../hooks/use-task-polling";
import { useSimulatedProgress } from "../hooks/use-simulated-progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// 工具函数 - 返回完整 data URI (data:mime;base64,xxx)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
  });
};

const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
  });
};

// 从 data URI 中提取 base64 和 mime type
const parseDataUri = (dataUri: string): { base64: string; mimeType: string } | null => {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

// 获取当前图片的 base64 数据（用于 AI 分析）
const getImageBase64Data = async (
  sourceImage: File | null,
  sourcePreview: string | null
): Promise<{ base64: string; mimeType: string } | null> => {
  if (sourceImage) {
    const dataUri = await fileToBase64(sourceImage);
    return parseDataUri(dataUri);
  }
  if (sourcePreview && !sourcePreview.startsWith("blob:")) {
    const dataUri = await urlToBase64(sourcePreview);
    return parseDataUri(dataUri);
  }
  return null;
};

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

const DEFAULT_CREDIT_COSTS = {
  Fast: 30,
  Quality: 100,
} as const;

const VideoWorkshop: React.FC = () => {
  const t = useTranslations("studio.video");
  const searchParams = useSearchParams();
  const { state, refreshCredits, refreshVideoTasks } = useStudio();
  const { credits, history } = state;

  const [prompt, setPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SOCIAL);
  const [duration, setDuration] = useState<8 | 10 | 15>(10);
  const [mode, setMode] = useState<"Fast" | "Quality">("Fast");
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
  const [unavailableDialogOpen, setUnavailableDialogOpen] = useState(false);

  const isVeo = mode === "Fast"
    ? videoConfig?.fastProvider === "veo"
    : videoConfig?.qualityProvider === "veo";
  const allVeo = videoConfig?.fastProvider === "veo" && videoConfig?.qualityProvider === "veo";
  const creditCosts = {
    Fast: videoConfig?.creditCosts.videoFast ?? DEFAULT_CREDIT_COSTS.Fast,
    Quality: videoConfig?.creditCosts.videoQuality ?? DEFAULT_CREDIT_COSTS.Quality,
  };

  useEffect(() => {
    if (isVeo) {
      setDuration(8);
    } else {
      setDuration(prev => prev === 8 ? 10 : prev);
    }
  }, [isVeo]);

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
        // fallback to defaults
      }
    };
    fetchConfig();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTaskComplete = useCallback(
    (task: VideoTaskStatus) => {
      setLoading(false);
      if (task.videoUrl) {
        setGeneratedVideo(task.videoUrl);
      }
      setCurrentTaskId(null);
      refreshCredits();
      refreshVideoTasks();
    },
    [refreshCredits, refreshVideoTasks]
  );

  const handleTaskError = useCallback(
    (task: VideoTaskStatus) => {
      setLoading(false);
      setErrorMessage(task.errorMessage || t("errors.generationFailed"));
      setCurrentTaskId(null);
      refreshCredits();
      refreshVideoTasks();
    },
    [refreshCredits, refreshVideoTasks, t]
  );

  const { task: pollingTask } = useTaskPolling<VideoTaskStatus>({
    taskId: currentTaskId,
    taskType: "video",
    interval: 3000,
    onComplete: handleTaskComplete,
    onError: handleTaskError,
  });

  // 模拟进度：5分钟，最多到92%
  const simulatedProgress = useSimulatedProgress({
    isRunning: loading,
    actualStatus: pollingTask?.status,
    estimatedDuration: 300000, // 5分钟
    maxProgress: 92,
  });

  const progress = pollingTask?.status === "succeeded" ? 100 : simulatedProgress;
  const taskStatus = pollingTask?.status || "pending";

  useEffect(() => {
    const imageParam = searchParams.get("image");
    if (imageParam) {
      setSourcePreview(decodeURIComponent(imageParam));
    }
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceImage(file);
      setSourcePreview(URL.createObjectURL(file));
    }
  };

  const handleAssetSelect = (url: string) => {
    setSourcePreview(url);
    setSourceImage(null);
  };

  const [randomizing, setRandomizing] = useState(false);

  const handleRandomPrompt = async () => {
    if (enhancing) return;
    const hasImage = sourceImage || (sourcePreview && !sourcePreview.startsWith("blob:"));

    if (!hasImage) {
      const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
      setPrompt(random);
      return;
    }

    // 有图片时，调用 AI 分析图片生成提示词
    setRandomizing(true);
    try {
      const imageData = await getImageBase64Data(sourceImage, sourcePreview);
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
      if (res.ok && data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      } else {
        const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
        setPrompt(random);
      }
    } catch (error) {
      console.error("随机提示词生成失败:", error);
      const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
      setPrompt(random);
    } finally {
      setRandomizing(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || randomizing) return;

    setEnhancing(true);
    try {
      // 如果有图片，一起传给 AI 分析
      const imageData = await getImageBase64Data(sourceImage, sourcePreview);

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
      console.error("Enhance prompt error:", error);
      const detail = error instanceof Error ? error.message : String(error);
      const message = `润色失败：${detail}`;
      toast.error(message);
    } finally {
      setEnhancing(false);
    }
  };

  const handleConfirmEnhanced = () => {
    setPrompt(enhancedPrompt);
    setEnhanceDialogOpen(false);
  };

  const handleGenerate = async () => {
    if (!prompt && !sourceImage && !sourcePreview) {
      alert(t("errors.providePromptOrImage"));
      return;
    }

    const currentLimit = mode === "Fast"
      ? videoConfig?.dailyLimits?.fast
      : videoConfig?.dailyLimits?.quality;
    if (currentLimit === 0) {
      setUnavailableDialogOpen(true);
      return;
    }

    const cost = creditCosts[mode];
    if (credits < cost) {
      alert(
        t("errors.insufficientCredits", {
          required: cost.toString(),
          available: credits.toString(),
        })
      );
      return;
    }

    setLoading(true);
    setGeneratedVideo(null);
    setErrorMessage(null);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      const imageData = await getImageBase64Data(sourceImage, sourcePreview);
      if (imageData) {
        imageBase64 = imageData.base64;
        imageMimeType = imageData.mimeType;
      }

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt || "Product showcase, cinematic lighting, 4k",
          mode: isVeo ? "Fast" : mode,
          aspectRatio: aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9",
          duration: isVeo ? 8 : duration,
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.taskCreationFailed"));
      }

      setCurrentTaskId(data.taskId);
      refreshCredits();
    } catch (e) {
      setLoading(false);
      const detail = e instanceof Error ? e.message : String(e);
      const message = `视频生成失败：${detail}`;
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden font-sans">
      {lightboxOpen && generatedVideo && (
        <Lightbox
          src={generatedVideo}
          type="video"
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {pickerOpen && (
        <AssetPicker
          history={history}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAssetSelect}
        />
      )}

      <PromptEnhanceDialog
        open={enhanceDialogOpen}
        onOpenChange={setEnhanceDialogOpen}
        originalPrompt={prompt}
        enhancedPrompt={enhancedPrompt}
        onConfirm={handleConfirmEnhanced}
      />

      <Dialog open={unavailableDialogOpen} onOpenChange={setUnavailableDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>渠道暂不可用</DialogTitle>
            <DialogDescription>
              该渠道因上游供应原因暂时不可用，请耐心等待恢复。
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => setUnavailableDialogOpen(false)}
            className="w-full py-2.5 bg-[#1a1a1a] text-white text-sm font-medium rounded hover:bg-[#2d3436] transition-colors"
          >
            知道了
          </button>
        </DialogContent>
      </Dialog>

      <div className="w-full md:w-[380px] border-b md:border-b-0 md:border-r border-[#e5e5e1] flex flex-col bg-white overflow-y-auto custom-scrollbar p-4 md:p-8 gap-6 md:gap-8 order-1 md:order-1">
        <div className="border-b border-[#e5e5e1] pb-6">
          <h1 className="text-2xl font-serif italic mb-1 text-[#1a1a1a]">
            {t("creationSuite")}
          </h1>
          <p className="text-gray-500 text-xs uppercase tracking-wider">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
              {t("sections.sourceMaterial")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPickerOpen(true)}
                className="text-xs underline text-[#1a1a1a] font-bold"
              >
                {t("sourceMaterial.history")}
              </button>
              {sourcePreview && (
                <button
                  onClick={() => {
                    setSourceImage(null);
                    setSourcePreview(null);
                  }}
                  className="text-xs underline text-gray-500 hover:text-gray-800"
                >
                  {t("sourceMaterial.clear")}
                </button>
              )}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {sourcePreview ? (
            <div className="relative group border border-[#e5e5e1] aspect-video overflow-hidden bg-[#faf9f6]">
              <img
                src={sourcePreview}
                className="w-full h-full object-cover"
                alt="源素材"
              />
              <button
                onClick={() => {
                  setSourceImage(null);
                  setSourcePreview(null);
                }}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs uppercase tracking-widest font-bold"
              >
                {t("sourceMaterial.changeSource")}
              </button>
              {!sourceImage && (
                <div className="absolute top-2 right-2 bg-[#1a1a1a] text-white text-[8px] px-2 py-1 uppercase tracking-widest font-bold">
                  {t("sourceMaterial.imported")}
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group border border-[#e5e5e1] p-8 flex flex-col items-center justify-center gap-3 hover:bg-[#faf9f6] transition-colors cursor-pointer bg-white border-dashed"
            >
              <span className="material-symbols-outlined text-[#6b7280]/40 group-hover:text-[#1a1a1a]">
                add_photo_alternate
              </span>
              <p className="text-[11px] uppercase tracking-widest text-[#6b7280] group-hover:text-[#1a1a1a]">
                {t("sourceMaterial.uploadAsset")}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
            {t("sections.frameFormat")}
          </p>
          <div className="grid grid-cols-2 gap-px bg-[#e5e5e1] border border-[#e5e5e1]">
            <button
              onClick={() => setAspectRatio(AspectRatio.SOCIAL)}
              className={`flex items-center justify-center gap-2 py-4 transition-colors ${aspectRatio === AspectRatio.SOCIAL ? "bg-[#faf9f6] text-[#1a1a1a] font-bold" : "bg-white text-gray-500 hover:text-gray-800"}`}
            >
              <span className="text-xs uppercase tracking-tighter">
                {t("aspectRatio.portrait")}
              </span>
            </button>
            <button
              onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
              className={`flex items-center justify-center gap-2 py-4 transition-colors ${aspectRatio === AspectRatio.LANDSCAPE ? "bg-[#faf9f6] text-[#1a1a1a] font-bold" : "bg-white text-gray-500 hover:text-gray-800"}`}
            >
              <span className="text-xs uppercase tracking-tighter">
                {t("aspectRatio.cinema")}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
            {t("sections.videoDuration")}
          </p>
          {isVeo ? (
            <div className="border border-[#e5e5e1]">
              <div className="flex items-center justify-center py-4 bg-[#faf9f6] text-[#1a1a1a] font-bold">
                <span className="text-xs uppercase tracking-tighter">
                  {t("duration.8s")}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-[#e5e5e1] border border-[#e5e5e1]">
              <button
                onClick={() => setDuration(10)}
                className={`flex items-center justify-center gap-2 py-4 transition-colors ${duration === 10 ? "bg-[#faf9f6] text-[#1a1a1a] font-bold" : "bg-white text-gray-500 hover:text-gray-800"}`}
              >
                <span className="text-xs uppercase tracking-tighter">
                  {t("duration.10s")}
                </span>
              </button>
              <button
                onClick={() => setDuration(15)}
                className={`flex items-center justify-center gap-2 py-4 transition-colors ${duration === 15 ? "bg-[#faf9f6] text-[#1a1a1a] font-bold" : "bg-white text-gray-500 hover:text-gray-800"}`}
              >
                <span className="text-xs uppercase tracking-tighter">
                  {t("duration.15s")}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
              {t("sections.narrativePrompt")}
            </p>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 bg-[#faf9f6] border border-[#e5e5e1] focus:ring-1 focus:ring-[#1a1a1a] focus:outline-none p-4 text-sm text-gray-800 leading-relaxed placeholder:text-gray-400 resize-none"
            placeholder={t("prompt.placeholder")}
          />
          <div className="flex gap-2">
            <button
              onClick={handleRandomPrompt}
              disabled={randomizing || enhancing}
              className="flex-1 py-3 px-4 border border-[#e5e5e1] text-[#4b5563] text-[11px] font-bold uppercase tracking-widest hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">casino</span>
              {randomizing ? "生成中..." : "随机"}
            </button>
            <button
              onClick={handleEnhancePrompt}
              disabled={!prompt.trim() || enhancing || randomizing}
              className="flex-1 py-3 px-4 bg-[#8C7355] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#7a6349] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">auto_fix_high</span>
              {enhancing ? "润色中..." : "润色"}
            </button>
          </div>
        </div>

        {!allVeo && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
              {t("sections.renderMode")}
            </p>
            <div className="flex border border-[#e5e5e1]">
              <button
                onClick={() => {
                  if (videoConfig?.dailyLimits.fast === 0) {
                    setUnavailableDialogOpen(true);
                    return;
                  }
                  setMode("Fast");
                }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex flex-col items-center ${mode === "Fast" ? "bg-[#1a1a1a] text-white" : "bg-white text-gray-500 hover:bg-[#faf9f6]"}`}
              >
                <span>{t("mode.fast")}</span>
                <span className="text-[10px] opacity-70">
                  {creditCosts.Fast} {t("cost.credits")}
                </span>
              </button>
              <button
                onClick={() => {
                  if (videoConfig?.dailyLimits.quality === 0) {
                    setUnavailableDialogOpen(true);
                    return;
                  }
                  setMode("Quality");
                }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex flex-col items-center ${mode === "Quality" ? "bg-[#1a1a1a] text-white" : "bg-white text-gray-500 hover:bg-[#faf9f6]"}`}
              >
                <span>{t("mode.quality")}</span>
                <span className="text-[10px] opacity-70">
                  {creditCosts.Quality} {t("cost.credits")}
                </span>
              </button>
            </div>
          </div>
        )}

        {allVeo && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
              {t("sections.renderMode")}
            </p>
            <div className="border border-[#e5e5e1]">
              <div className="py-3 text-xs font-bold uppercase tracking-widest flex flex-col items-center bg-[#1a1a1a] text-white">
                <span>VEO</span>
                <span className="text-[10px] opacity-70">
                  {creditCosts.Fast} {t("cost.credits")}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto pt-8 border-t border-[#e5e5e1]">
          <button
            onClick={handleGenerate}
            disabled={loading || (!prompt && !sourceImage && !sourcePreview)}
            className="w-full bg-[#1a1a1a] text-white py-5 text-sm font-bold uppercase tracking-[0.2em] hover:bg-[#2d3436] disabled:bg-gray-400 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-sm">
              movie_filter
            </span>
            {loading ? t("actions.generating") : t("actions.generate")}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#faf9f6] overflow-y-auto custom-scrollbar flex flex-col p-4 md:p-12 items-center justify-center order-2 md:order-2 min-h-[300px] md:min-h-0">
        <div className="max-w-4xl w-full flex flex-col items-center">
          {loading ? (
            <div
              className={`bg-white border border-[#e5e5e1] p-1 shadow-sm flex flex-col items-center justify-center ${aspectRatio === AspectRatio.SOCIAL ? "aspect-9/16 h-[600px]" : "aspect-video w-full"}`}
            >
              <span className="material-symbols-outlined text-4xl animate-spin text-[#6b7280]/40 mb-6">
                hourglass_empty
              </span>
              <h3 className="text-lg font-serif italic mb-2 text-[#1a1a1a]">
                {t("canvas.renderingProcess")}
              </h3>
              <p className="text-[#6b7280]/60 text-[11px] leading-relaxed uppercase tracking-widest">
                {taskStatus === "pending"
                  ? t("canvas.initializingEngine")
                  : taskStatus === "retrying"
                    ? t("canvas.autoRetrying")
                    : t("canvas.compilingFrames")}
              </p>

              <div className="w-64 mt-6">
                <div className="flex justify-between text-[10px] text-[#6b7280] mb-2">
                  <span>{t("canvas.progress")}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-[#e5e5e1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1a1a] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#8C7355] mt-4 animate-pulse">
                {t("canvas.waitMessage")}
              </p>
            </div>
          ) : generatedVideo ? (
            <div className="flex flex-col gap-6 w-full items-center">
              <div
                className={`relative bg-black ${aspectRatio === AspectRatio.SOCIAL ? "aspect-9/16 h-[600px]" : "aspect-video w-full"} shadow-2xl group`}
              >
                <video
                  src={generatedVideo}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80 backdrop-blur-sm transition-all"
                    title={t("actions.fullScreen")}
                  >
                    <span className="material-symbols-outlined text-xl">
                      open_in_full
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <a
                  href={generatedVideo}
                  download="generated_video.mp4"
                  className="px-8 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-widest font-bold"
                >
                  {t("actions.download")}
                </a>
              </div>
            </div>
          ) : errorMessage ? (
            <div
              className={`bg-white border border-red-200 p-1 shadow-sm flex flex-col items-center justify-center ${aspectRatio === AspectRatio.SOCIAL ? "aspect-9/16 h-[600px]" : "aspect-video w-full"}`}
            >
              <span className="material-symbols-outlined text-4xl text-red-400 mb-6">
                error
              </span>
              <h3 className="text-lg font-serif italic mb-2 text-red-600">
                {t("canvas.generationFailed")}
              </h3>
              <p className="text-red-500/80 text-[11px] leading-relaxed text-center max-w-xs">
                {errorMessage}
              </p>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  handleGenerate();
                }}
                className="mt-6 px-6 py-2 bg-[#1a1a1a] text-white text-[10px] uppercase tracking-widest"
              >
                {t("actions.tryAgain")}
              </button>
            </div>
          ) : (
            <div
              className={`bg-white border border-[#e5e5e1] p-1 shadow-sm flex flex-col items-center justify-center opacity-50 ${aspectRatio === AspectRatio.SOCIAL ? "aspect-9/16 h-[600px]" : "aspect-video w-full"}`}
            >
              <span className="material-symbols-outlined text-4xl text-[#6b7280]/20 mb-6">
                movie
              </span>
              <p className="text-[#6b7280]/40 text-[11px] uppercase tracking-widest">
                {t("canvas.previewWindow")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoWorkshop;
