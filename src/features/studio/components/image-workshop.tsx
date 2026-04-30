"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Download,
  Film,
  ImageIcon,
  Maximize2,
  Paperclip,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AspectRatio, ImageQuality } from "../types";
import { IMAGE_PROMPTS, EDIT_PROMPTS } from "../utils/prompt-library";
import { SHOWCASE_EXAMPLES } from "../data/showcase-examples";
import Lightbox from "./lightbox";
import AssetPicker from "./asset-picker";
import { useStudio } from "../context/studio-context";
import { useImageTaskPolling } from "../hooks/use-image-task-polling";
import { useSimulatedProgress } from "../hooks/use-simulated-progress";
import { cn } from "@/lib/utils";

type Mode = "generate" | "edit";

interface ImageSessionTask {
  id: string;
  sessionId?: string | null;
  mode: Mode;
  model: string;
  prompt: string;
  aspectRatio?: string | null;
  status: "pending" | "running" | "succeeded" | "error";
  errorMessage?: string | null;
  sourceImageUrl?: string | null;
  imageUrl?: string | null;
  creditCost: number;
  createdAt: string;
  completedAt?: string | null;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(",");
      const mimeType = header.match(/^data:([^;]+);base64$/)?.[1] || file.type;
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
  });
}

async function imageUrlToBase64(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return fileToBase64(new File([blob], "source-image", { type: blob.type || "image/png" }));
}

function taskDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const aspectOptions = Object.values(AspectRatio);
const qualityOptions = Object.values(ImageQuality);

export default function ImageWorkshop() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const { state, refreshCredits, refreshImageTasks } = useStudio();

  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [quality, setQuality] = useState<ImageQuality>(ImageQuality.STANDARD);
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState<"pending" | "running" | "succeeded" | "error">("pending");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [optimisticTask, setOptimisticTask] = useState<ImageSessionTask | null>(null);
  const [sessionTasks, setSessionTasks] = useState<ImageSessionTask[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageCreditCost, setImageCreditCost] = useState(10);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRequestRef = useRef(0);

  const loadSession = useCallback(async () => {
    const requestId = sessionRequestRef.current + 1;
    sessionRequestRef.current = requestId;

    if (!activeSessionId) {
      setSessionTasks([]);
      setCurrentTaskId(null);
      setLoading(false);
      setTaskStatus("pending");
      return;
    }

    const response = await fetch(`/api/studio/sessions/${activeSessionId}?type=image`);
    if (requestId !== sessionRequestRef.current) return;

    if (!response.ok) {
      setSessionTasks([]);
      setCurrentTaskId(null);
      setLoading(false);
      setTaskStatus("pending");
      return;
    }

    const data = await response.json();
    const nextTasks = (data.tasks ?? []) as ImageSessionTask[];
    const activeTask = [...nextTasks]
      .reverse()
      .find((task) => task.status === "pending" || task.status === "running");

    setSessionTasks(nextTasks);
    setCurrentTaskId(activeTask?.id ?? null);
    setLoading(Boolean(activeTask));
    setTaskStatus(activeTask?.status ?? "pending");
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
    setTaskStatus("pending");
  }, [activeSessionId]);

  useEffect(() => {
    const handler = () => {
      setPrompt("");
      setRefImage(null);
      setRefImagePreview(null);
      setOptimisticTask(null);
      setCurrentTaskId(null);
      setLoading(false);
    };
    window.addEventListener("studio:new-session", handler);
    return () => window.removeEventListener("studio:new-session", handler);
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/video/config");
        const data = await response.json();
        if (
          response.ok &&
          data?.success &&
          typeof data?.data?.creditCosts?.image === "number"
        ) {
          setImageCreditCost(data.data.creditCosts.image);
        }
      } catch (error) {
        console.error("获取图片积分配置失败:", error);
      }
    };

    void fetchConfig();
  }, []);

  useImageTaskPolling({
    taskId: currentTaskId,
    interval: 3000,
    onComplete: (task) => {
      setLoading(false);
      setCurrentTaskId(null);
      setTaskStatus("succeeded");
      setOptimisticTask((prev) =>
        prev && prev.id === task.taskId
          ? { ...prev, status: "succeeded", imageUrl: task.imageUrl }
          : prev
      );
      void refreshCredits();
      void refreshImageTasks();
      void loadSession();
      window.dispatchEvent(new CustomEvent("studio:sessions-changed"));
    },
    onError: (task) => {
      setLoading(false);
      setCurrentTaskId(null);
      setTaskStatus("error");
      setOptimisticTask((prev) =>
        prev && prev.id === task.taskId
          ? { ...prev, status: "error", errorMessage: task.errorMessage }
          : prev
      );
      toast.error(task.errorMessage || "图像生成失败，积分已退还");
      void refreshCredits();
      void refreshImageTasks();
      void loadSession();
    },
  });

  const simulatedProgress = useSimulatedProgress({
    isRunning: loading,
    actualStatus: taskStatus,
    estimatedDuration: 30000,
    maxProgress: 95,
  });

  const progress = taskStatus === "succeeded" ? 100 : simulatedProgress;

  const tasks = useMemo(() => {
    const map = new Map<string, ImageSessionTask>();
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
    setRefImage(file);
    setRefImagePreview(URL.createObjectURL(file));
    setMode("edit");
  };

  const handleAssetSelect = (url: string) => {
    setRefImagePreview(url);
    setRefImage(null);
    setMode("edit");
  };

  const handleRandomPrompt = () => {
    const list = mode === "generate" ? IMAGE_PROMPTS : EDIT_PROMPTS;
    const random = list[Math.floor(Math.random() * list.length)];
    setPrompt(random);
  };

  const clearAttachment = () => {
    setRefImage(null);
    setRefImagePreview(null);
    setMode("generate");
  };

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    if (mode === "edit" && !refImage && !refImagePreview) {
      toast.error("编辑图像需要先上传或选择一张图");
      return;
    }

    if (state.credits < imageCreditCost) {
      toast.error(`积分不足，本次需要 ${imageCreditCost} 积分`);
      return;
    }

    setLoading(true);
    setTaskStatus("pending");

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (mode === "edit") {
        const imageData = refImage
          ? await fileToBase64(refImage)
          : refImagePreview
            ? await imageUrlToBase64(refImagePreview)
            : null;

        if (!imageData) {
          throw new Error("缺少输入图像");
        }

        imageBase64 = imageData.base64;
        imageMimeType = imageData.mimeType;
      }

      const model =
        quality === ImageQuality.UHD
          ? "gemini-3-pro-image-preview"
          : "gemini-2.5-flash-image";
      const endpoint = mode === "edit" ? "/api/image/edit" : "/api/image/generate";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          model,
          aspectRatio,
          sessionId: activeSessionId ?? undefined,
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "创建图像任务失败");
      }

      const nextSessionId = data.sessionId as string;
      const nextTask: ImageSessionTask = {
        id: data.taskId,
        sessionId: nextSessionId,
        mode,
        model,
        prompt: trimmedPrompt,
        aspectRatio,
        status: "running",
        sourceImageUrl: refImagePreview,
        creditCost: data.creditCost ?? imageCreditCost,
        createdAt: new Date().toISOString(),
      };

      setOptimisticTask(nextTask);
      setCurrentTaskId(data.taskId);
      setTaskStatus("running");
      setPrompt("");
      if (!activeSessionId) {
        router.replace(`${pathname}?session=${nextSessionId}`);
      }
      window.dispatchEvent(new CustomEvent("studio:sessions-changed"));
    } catch (error) {
      setLoading(false);
      setTaskStatus("error");
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`操作失败：${message}`);
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
        {refImagePreview && (
          <div className="mb-3 flex items-center gap-3">
            <div className="relative size-24 overflow-hidden rounded-2xl bg-[#f4f4f4]">
              <img src={refImagePreview} alt="参考图" className="size-full object-cover" />
              <button
                type="button"
                onClick={clearAttachment}
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black text-white"
                aria-label="移除参考图"
              >
                <X className="size-4" />
              </button>
            </div>
            <span className="text-sm text-[#6f6f6f]">将作为编辑输入图像</span>
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          rows={centered ? 2 : 1}
          maxLength={10000}
          placeholder={mode === "edit" ? "描述或编辑图像" : "描述你想生成的图像"}
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
              aria-label="上传图像"
            >
              <Plus className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#0b84ff] hover:bg-[#edf6ff]"
            >
              <ImageIcon className="size-4" />
              历史图像
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "generate" ? "edit" : "generate")}
              className="rounded-full px-3 py-2 text-sm hover:bg-black/5"
            >
              {mode === "generate" ? "生成" : "编辑"}
            </button>
            <button
              type="button"
              onClick={handleRandomPrompt}
              className="rounded-full px-3 py-2 text-sm hover:bg-black/5"
            >
              随机
            </button>
            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm outline-none hover:bg-black/5"
            >
              {aspectOptions.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
            <select
              value={quality}
              onChange={(event) => setQuality(event.target.value as ImageQuality)}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm outline-none hover:bg-black/5"
            >
              {qualityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <span className="rounded-full bg-[#f4f4f4] px-3 py-2 text-sm text-[#666]">
              {imageCreditCost} 积分
            </span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !prompt.trim() || (mode === "edit" && !refImage && !refImagePreview)}
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
      {lightboxImage && (
        <Lightbox src={lightboxImage} type="image" onClose={() => setLightboxImage(null)} />
      )}
      {pickerOpen && (
        <AssetPicker
          history={state.history}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAssetSelect}
        />
      )}

      {empty ? (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start overflow-x-hidden overflow-y-auto px-4 pb-10 pt-8 md:justify-center md:pt-0">
          <h1 className="mb-8 text-center text-3xl font-normal tracking-normal md:text-4xl">
            想创作什么图像？
          </h1>
          {renderComposer(true)}
          <div className="mt-8 w-full max-w-[980px] overflow-x-auto pb-2">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-36 w-28 shrink-0 flex-col items-center justify-center gap-3 rounded-3xl bg-[#f6f6f6] text-sm text-[#777] hover:bg-[#efefef]"
              >
                <Paperclip className="size-5" />
                编辑图像
              </button>
              {SHOWCASE_EXAMPLES.slice(0, 8).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPrompt(item.promptZh)}
                  className="w-28 shrink-0 text-left"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-36 w-28 rounded-3xl object-cover"
                  />
                  <span className="mt-2 block text-center text-sm text-[#777]">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
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
                  (optimisticTask?.id === task.id && loading);
                const imageUrl = task.imageUrl;

                return (
                  <article key={task.id} className="flex flex-col gap-5">
                    <div className="ml-auto max-w-[760px] rounded-[24px] bg-[#f4f4f4] px-5 py-3 text-[16px] leading-relaxed">
                      {task.prompt}
                    </div>
                    <div className="max-w-[760px]">
                      <div className="mb-3 flex items-center gap-2 text-sm text-[#777]">
                        <Sparkles className="size-4" />
                        <span>
                          {task.mode === "edit" ? "图像编辑" : "图像生成"} ·{" "}
                          {taskDate(task.createdAt)}
                        </span>
                      </div>
                      {task.sourceImageUrl && (
                        <img
                          src={task.sourceImageUrl}
                          alt="输入图像"
                          className="mb-4 size-28 rounded-2xl object-cover"
                        />
                      )}
                      {isWorking ? (
                        <div className="w-full rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                          <p className="text-base">正在生成图像</p>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ececec]">
                            <div
                              className="h-full rounded-full bg-black transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="mt-3 text-sm text-[#777]">{progress}%</p>
                        </div>
                      ) : task.status === "error" ? (
                        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                          {task.errorMessage || "图像生成失败，积分已退还"}
                        </div>
                      ) : imageUrl ? (
                        <div className="group w-fit">
                          <img
                            src={imageUrl}
                            alt="生成结果"
                            className="max-h-[640px] max-w-full rounded-3xl object-contain"
                          />
                          <div className="mt-3 flex items-center gap-2 text-[#555]">
                            <button
                              type="button"
                              onClick={() => setLightboxImage(imageUrl)}
                              className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                              aria-label="放大"
                            >
                              <Maximize2 className="size-5" />
                            </button>
                            <a
                              href={imageUrl}
                              download
                              className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                              aria-label="下载"
                            >
                              <Download className="size-5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => router.push(`/studio/video?image=${encodeURIComponent(imageUrl)}`)}
                              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-black/5"
                            >
                              <Film className="size-4" />
                              转视频
                            </button>
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
