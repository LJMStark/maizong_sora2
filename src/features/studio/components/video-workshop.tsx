"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AspectRatio } from "../types";
import { VIDEO_PROMPTS } from "../utils/prompt-library";
import Lightbox from "./lightbox";
import AssetPicker from "./asset-picker";
import { useStudio } from "../context/studio-context";
import { useTaskPolling, VideoTaskStatus } from "../hooks/use-task-polling";
import { useSimulatedProgress } from "../hooks/use-simulated-progress";

// 工具函数
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
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
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};

const CREDIT_COSTS = {
  Fast: 30,
  Quality: 100,
} as const;

const VideoWorkshop: React.FC = () => {
  const searchParams = useSearchParams();
  const { state, refreshCredits, refreshVideoTasks } = useStudio();
  const { credits, history } = state;

  const [prompt, setPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SOCIAL);
  const [mode, setMode] = useState<"Fast" | "Quality">("Fast");
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(task.errorMessage || "Video generation failed");
      setCurrentTaskId(null);
      refreshCredits();
      refreshVideoTasks();
    },
    [refreshCredits, refreshVideoTasks]
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

  const handleRandomPrompt = () => {
    const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
    setPrompt(random);
  };

  const handleGenerate = async () => {
    if (!prompt && !sourceImage && !sourcePreview) {
      alert("Please provide a prompt or an image.");
      return;
    }

    const cost = CREDIT_COSTS[mode];
    if (credits < cost) {
      alert(`Insufficient credits. Required: ${cost}, Available: ${credits}`);
      return;
    }

    setLoading(true);
    setGeneratedVideo(null);
    setErrorMessage(null);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (sourceImage) {
        const base64Data = await fileToBase64(sourceImage);
        const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          imageMimeType = match[1];
          imageBase64 = match[2];
        }
      } else if (sourcePreview && !sourcePreview.startsWith("blob:")) {
        const base64Data = await urlToBase64(sourcePreview);
        const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          imageMimeType = match[1];
          imageBase64 = match[2];
        }
      }

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt || "Product showcase, cinematic lighting, 4k",
          mode,
          aspectRatio: aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9",
          duration: 10,
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create video task");
      }

      setCurrentTaskId(data.taskId);
      refreshCredits();
    } catch (e) {
      setLoading(false);
      const message = e instanceof Error ? e.message : "Video generation failed.";
      setErrorMessage(message);
      alert(message);
    }
  };

  return (
    <div className="flex h-full overflow-hidden font-sans">
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

      <div className="w-[380px] border-r border-[#e5e5e1] flex flex-col bg-white overflow-y-auto custom-scrollbar p-8 gap-8">
        <div className="border-b border-[#e5e5e1] pb-6">
          <h1 className="text-2xl font-serif italic mb-1 text-[#1a1a1a]">
            Creation Suite
          </h1>
          <p className="text-[#6b7280]/60 text-[11px] uppercase tracking-wider">
            Advanced video synthesis (Sora)
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">
              01. Source Material (Optional)
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPickerOpen(true)}
                className="text-[9px] underline text-[#1a1a1a] font-bold"
              >
                History
              </button>
              {sourcePreview && (
                <button
                  onClick={() => {
                    setSourceImage(null);
                    setSourcePreview(null);
                  }}
                  className="text-[9px] underline text-[#6b7280]"
                >
                  Clear
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
            <div className="relative group border border-[#e5e5e1] aspect-[16/9] overflow-hidden bg-[#faf9f6]">
              <img
                src={sourcePreview}
                className="w-full h-full object-cover"
                alt="Source"
              />
              <button
                onClick={() => {
                  setSourceImage(null);
                  setSourcePreview(null);
                }}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs uppercase tracking-widest font-bold"
              >
                Change Source
              </button>
              {!sourceImage && (
                <div className="absolute top-2 right-2 bg-[#1a1a1a] text-white text-[8px] px-2 py-1 uppercase tracking-widest font-bold">
                  Imported
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
                Upload Product Asset
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">
            02. Frame Format
          </p>
          <div className="grid grid-cols-2 gap-px bg-[#e5e5e1] border border-[#e5e5e1]">
            <button
              onClick={() => setAspectRatio(AspectRatio.SOCIAL)}
              className={`flex items-center justify-center gap-2 py-4 transition-colors ${aspectRatio === AspectRatio.SOCIAL ? "bg-[#faf9f6] text-[#1a1a1a] font-bold" : "bg-white text-[#6b7280]"}`}
            >
              <span className="text-[10px] uppercase tracking-tighter">
                9:16 Portrait
              </span>
            </button>
            <button
              onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
              className={`flex items-center justify-center gap-2 py-4 transition-colors ${aspectRatio === AspectRatio.LANDSCAPE ? "bg-[#faf9f6] text-[#1a1a1a] font-bold" : "bg-white text-[#6b7280]"}`}
            >
              <span className="text-[10px] uppercase tracking-tighter">
                16:9 Cinema
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">
              03. Narrative Prompt
            </p>
            <button
              onClick={handleRandomPrompt}
              title="Surprise me with a motion prompt"
              className="text-[#6b7280] hover:text-[#1a1a1a] p-1 rounded-full hover:bg-[#faf9f6] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">casino</span>
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 bg-[#faf9f6] border border-[#e5e5e1] focus:ring-1 focus:ring-[#1a1a1a] focus:outline-none p-4 text-xs leading-relaxed placeholder:text-[#6b7280]/40 resize-none"
            placeholder="Define motion parameters (e.g., Slow pan, soft lighting, 10s duration...)"
          />
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">
            04. Render Mode
          </p>
          <div className="flex border border-[#e5e5e1]">
            <button
              onClick={() => setMode("Fast")}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex flex-col items-center ${mode === "Fast" ? "bg-[#1a1a1a] text-white" : "bg-white text-[#6b7280] hover:bg-[#faf9f6]"}`}
            >
              <span>Fast</span>
              <span className="text-[8px] opacity-70">
                {CREDIT_COSTS.Fast} credits
              </span>
            </button>
            <button
              onClick={() => setMode("Quality")}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex flex-col items-center ${mode === "Quality" ? "bg-[#1a1a1a] text-white" : "bg-white text-[#6b7280] hover:bg-[#faf9f6]"}`}
            >
              <span>Quality</span>
              <span className="text-[8px] opacity-70">
                {CREDIT_COSTS.Quality} credits
              </span>
            </button>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-[#e5e5e1]">
          <button
            onClick={handleGenerate}
            disabled={loading || (!prompt && !sourceImage && !sourcePreview)}
            className="w-full bg-[#1a1a1a] text-white py-5 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#2d3436] disabled:bg-gray-400 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-sm">
              movie_filter
            </span>
            {loading ? "Rendering..." : "Initialize Generation"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#faf9f6] overflow-y-auto custom-scrollbar flex flex-col p-12 items-center justify-center">
        <div className="max-w-4xl w-full flex flex-col items-center">
          {loading ? (
            <div
              className={`bg-white border border-[#e5e5e1] p-1 shadow-sm flex flex-col items-center justify-center ${aspectRatio === AspectRatio.SOCIAL ? "aspect-[9/16] h-[600px]" : "aspect-[16/9] w-full"}`}
            >
              <span className="material-symbols-outlined text-4xl animate-spin text-[#6b7280]/40 mb-6">
                hourglass_empty
              </span>
              <h3 className="text-lg font-serif italic mb-2 text-[#1a1a1a]">
                Rendering Process
              </h3>
              <p className="text-[#6b7280]/60 text-[11px] leading-relaxed uppercase tracking-widest">
                {taskStatus === "pending"
                  ? "Initializing neural engine..."
                  : "Compiling final frames with neural engine"}
              </p>

              <div className="w-64 mt-6">
                <div className="flex justify-between text-[10px] text-[#6b7280] mb-2">
                  <span>Progress</span>
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
                This may take a few minutes...
              </p>
            </div>
          ) : generatedVideo ? (
            <div className="flex flex-col gap-6 w-full items-center">
              <div
                className={`relative bg-black ${aspectRatio === AspectRatio.SOCIAL ? "aspect-[9/16] h-[600px]" : "aspect-[16/9] w-full"} shadow-2xl group`}
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
                    title="Full Screen"
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
                  Download MP4
                </a>
              </div>
            </div>
          ) : errorMessage ? (
            <div
              className={`bg-white border border-red-200 p-1 shadow-sm flex flex-col items-center justify-center ${aspectRatio === AspectRatio.SOCIAL ? "aspect-[9/16] h-[600px]" : "aspect-[16/9] w-full"}`}
            >
              <span className="material-symbols-outlined text-4xl text-red-400 mb-6">
                error
              </span>
              <h3 className="text-lg font-serif italic mb-2 text-red-600">
                Generation Failed
              </h3>
              <p className="text-red-500/80 text-[11px] leading-relaxed text-center max-w-xs">
                {errorMessage}
              </p>
              <button
                onClick={() => setErrorMessage(null)}
                className="mt-6 px-6 py-2 bg-[#1a1a1a] text-white text-[10px] uppercase tracking-widest"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div
              className={`bg-white border border-[#e5e5e1] p-1 shadow-sm flex flex-col items-center justify-center opacity-50 ${aspectRatio === AspectRatio.SOCIAL ? "aspect-[9/16] h-[600px]" : "aspect-[16/9] w-full"}`}
            >
              <span className="material-symbols-outlined text-4xl text-[#6b7280]/20 mb-6">
                movie
              </span>
              <p className="text-[#6b7280]/40 text-[11px] uppercase tracking-widest">
                Preview Window
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoWorkshop;
