"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  AudioLines,
  Brain,
  ChevronDown,
  Check,
  Copy,
  Download,
  Film,
  ImageIcon,
  Maximize2,
  Mic,
  Paperclip,
  Plus,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AspectRatio, ImageQuality } from "../types";
import { IMAGE_PROMPTS, EDIT_PROMPTS } from "../utils/prompt-library";
import dynamic from "next/dynamic";
import Lightbox from "./lightbox";
import AssetPicker from "./asset-picker";
import type { PromptGalleryItem } from "./shared/prompt-gallery";
import { useUploadShortcut } from "../hooks/use-upload-shortcut";
import { DeepThinkingDialog } from "./shared/deep-thinking-dialog";
import { SearchReferenceDialog } from "./shared/search-reference-dialog";
import { useStudio } from "../context/studio-context";
import { useImageTaskPolling, type ImageTaskStatus } from "../hooks/use-task-polling";
import { useSimulatedProgress } from "../hooks/use-simulated-progress";
import { useSpeechComposer } from "../hooks/use-speech-composer";
import {
  buildDeepThinkingResult,
  type DeepThinkingResult,
} from "../utils/deep-thinking";
import { buildSearchReferencePrompt } from "../utils/search-reference";
import { resolveHasAuthUser } from "../utils/user-helpers";
import { cn } from "@/lib/utils";
import { getSession, useSession } from "@/lib/auth/client";

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
  requiresLogin?: boolean;
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

function getResultAspectRatio(value?: string | null) {
  if (!value || value === "auto") return "1 / 1";

  const [width, height] = value.split(":").map(Number);
  if (!width || !height) return "1 / 1";

  return `${width} / ${height}`;
}

const aspectOptions = Object.values(AspectRatio);
const qualityOptions = Object.values(ImageQuality);

const ASPECT_LABELS: Record<AspectRatio, string> = {
  [AspectRatio.AUTO]: "Auto",
  [AspectRatio.SQUARE]: "1:1",
  [AspectRatio.PORTRAIT_ALT]: "2:3",
  [AspectRatio.LANDSCAPE_ALT]: "3:2",
  [AspectRatio.PORTRAIT]: "3:4",
  [AspectRatio.STANDARD]: "4:3",
  [AspectRatio.PORTRAIT_TALL]: "4:5",
  [AspectRatio.LANDSCAPE_WIDE]: "5:4",
  [AspectRatio.SOCIAL]: "9:16",
  [AspectRatio.LANDSCAPE]: "16:9",
  [AspectRatio.CINEMA]: "21:9",
};

function getImageModel(quality: ImageQuality) {
  return quality === ImageQuality.STANDARD
    ? "gemini-2.5-flash-image"
    : "gemini-3-pro-image-preview";
}

function getImageSize(quality: ImageQuality) {
  return quality === ImageQuality.STANDARD ? undefined : quality;
}

function getImageFailureReason(task: Pick<ImageSessionTask, "errorMessage">) {
  return task.errorMessage?.trim() || "图像生成失败";
}

function getImageRefundMessage(task: Pick<ImageSessionTask, "creditCost">) {
  return task.creditCost > 0
    ? `已退回 ${task.creditCost} 积分。`
    : "本次没有扣除积分。";
}

function openLoginDialog() {
  window.dispatchEvent(new CustomEvent("studio:open-login"));
}

const ImageGallerySection = dynamic(() => import("./image-gallery-section"), {
  loading: () => null,
});

function IconHint({
  label,
  className,
  disabled,
  children,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("group/hint relative inline-flex", className)}>
      {children}
      {!disabled && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0d0d0d] px-2 py-1 text-xs text-white shadow-lg group-hover/hint:block group-focus-within/hint:block">
          {label}
        </span>
      )}
    </span>
  );
}

function SettingsLoginCard({
  hasSession,
  onLogin,
  onSignup,
}: {
  hasSession: boolean;
  onLogin: () => void;
  onSignup: () => void;
}) {
  if (hasSession) return null;

  return (
    <div className="rounded-xl border border-black/10 bg-[#f7f7f7] p-3">
      <div>
        <p className="text-sm font-medium text-[#0d0d0d]">
          登录后使用完整创作能力
        </p>
        <p className="mt-1 text-xs leading-5 text-[#666]">
          保存设置、读取作品库，并同步最近创作记录。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onLogin}
            className="h-8 rounded-full bg-[#0d0d0d] px-3.5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          >
            登录
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="h-8 rounded-full border border-black/10 bg-white px-3.5 text-sm font-medium text-[#0d0d0d] hover:bg-black/[0.04]"
          >
            免费注册
          </button>
        </div>
      </div>
    </div>
  );
}

function ComposerNotice({ compact }: { compact: boolean }) {
  return (
    <p
      className={cn(
        "mx-auto max-w-[720px] px-4 text-center text-xs leading-5 text-[#8a8a8a]",
        compact ? "mt-3 md:mt-[54px]" : "mt-2"
      )}
    >
      生成内容可能不准确，重要用途请人工确认。
    </p>
  );
}

function SettingsOption({
  label,
  description,
  active,
  disabled,
  onClick,
}: {
  label: string;
  description?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition",
        disabled
          ? "cursor-not-allowed text-[#b5b5b5]"
          : "text-[#0d0d0d] hover:bg-black/[0.04]"
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {active && <Check className="size-3.5" strokeWidth={2} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="block text-xs leading-4 text-[#777]">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

function AttachmentMenuItem({
  icon,
  label,
  description,
  trailing,
  muted,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  muted?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left transition",
        disabled
          ? "cursor-not-allowed text-[#b5b5b5]"
          : muted
            ? "text-[#8a8a8a] hover:bg-black/[0.04]"
            : "text-[#0d0d0d] hover:bg-black/[0.04]"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center",
          muted || disabled ? "text-[#9b9b9b]" : "text-[#555]"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-normal leading-5">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-4 text-[#777]">
            {description}
          </span>
        )}
      </span>
      {trailing && (
        <span className="shrink-0 text-xs text-[#777]">
          {trailing}
        </span>
      )}
    </button>
  );
}

export default function ImageWorkshop() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const { state, refreshCredits, refreshImageTasks } = useStudio();
  const { data: session, isPending: sessionPending } = useSession();
  const hasSession = Boolean(session?.user);

  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.AUTO);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [deepThinkingOpen, setDeepThinkingOpen] = useState(false);
  const [deepThinkingResult, setDeepThinkingResult] =
    useState<DeepThinkingResult | null>(null);
  const [searchReferenceOpen, setSearchReferenceOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRequestRef = useRef(0);
  const { isListening, toggleSpeechInput } = useSpeechComposer({
    value: prompt,
    onChange: setPrompt,
    inputRef: promptInputRef,
  });
  const loadSession = useCallback(async () => {
    const requestId = sessionRequestRef.current + 1;
    sessionRequestRef.current = requestId;

    if (!activeSessionId || !hasSession) {
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
  }, [activeSessionId, hasSession]);

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
      setMode("generate");
      setRefImage(null);
      setRefImagePreview(null);
      setOptimisticTask(null);
      setCurrentTaskId(null);
      setLoading(false);
      window.setTimeout(() => promptInputRef.current?.focus(), 0);
    };
    window.addEventListener("studio:new-session", handler);
    return () => window.removeEventListener("studio:new-session", handler);
  }, []);

  useEffect(() => {
    const textarea = promptInputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [prompt]);

  useEffect(() => {
    const handler = () => promptInputRef.current?.focus();
    window.addEventListener("studio:focus-composer", handler);
    return () => window.removeEventListener("studio:focus-composer", handler);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!attachmentMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) {
        setAttachmentMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAttachmentMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    if (sessionPending || !hasSession) {
      return;
    }

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
  }, [hasSession, sessionPending]);

  // Memoized so the polling hook keeps a stable fetch identity. The simulated
  // progress bar re-renders this component many times per second; inline
  // callbacks here would restart polling on every frame (see video-workshop).
  const handleImageComplete = useCallback(
    (task: ImageTaskStatus) => {
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
    [refreshCredits, refreshImageTasks, loadSession]
  );

  const handleImageError = useCallback(
    (task: ImageTaskStatus) => {
      setLoading(false);
      setCurrentTaskId(null);
      setTaskStatus("error");
      setOptimisticTask((prev) =>
        prev && prev.id === task.taskId
          ? { ...prev, status: "error", errorMessage: task.errorMessage }
          : prev
      );
      toast.error(`${task.errorMessage || "图像生成失败"}，积分已退还`);
      void refreshCredits();
      void refreshImageTasks();
      void loadSession();
    },
    [refreshCredits, refreshImageTasks, loadSession]
  );

  useImageTaskPolling({
    taskId: currentTaskId,
    interval: 3000,
    onComplete: handleImageComplete,
    onError: handleImageError,
  });

  // Release object URLs created for local file previews so blob data does not
  // accumulate in memory when the preview is replaced or the view unmounts.
  useEffect(() => {
    if (!refImagePreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(refImagePreview);
  }, [refImagePreview]);

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

  const handleOpenAssetPicker = async () => {
    setAttachmentMenuOpen(false);
    if (!hasSession) {
      if (await resolveHasAuthUser(getSession)) {
        setPickerOpen(true);
        return;
      }

      openLoginDialog();
      return;
    }
    setPickerOpen(true);
  };

  const handleOpenVideoWorkshop = () => {
    setAttachmentMenuOpen(false);
    router.push("/studio/video");
  };

  const handleCopyResultPrompt = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("提示词已复制。");
    } catch {
      toast.error("复制失败，请手动复制提示词。");
    }
  }, []);

  const handleOpenSearchReference = () => {
    setAttachmentMenuOpen(false);
    setSearchReferenceOpen(true);
  };

  const handleDeepThinking = () => {
    setAttachmentMenuOpen(false);
    if (!hasSession) {
      openLoginDialog();
      return;
    }

    setDeepThinkingResult(
      buildDeepThinkingResult({
        kind: "image",
        prompt,
        modeLabel: mode === "generate" ? "生成" : "编辑",
        aspectLabel: ASPECT_LABELS[aspectRatio],
        qualityLabel: quality,
        referenceLabel: refImagePreview ? "已附加参考图" : undefined,
      })
    );
    setDeepThinkingOpen(true);
  };

  const handleUseDeepThinkingPrompt = () => {
    if (!deepThinkingResult) return;
    setPrompt(deepThinkingResult.plannedPrompt);
    setDeepThinkingOpen(false);
    window.setTimeout(() => promptInputRef.current?.focus(), 0);
  };

  const handleUseSearchReference = (draft: {
    query: string;
    notes: string;
    sourceUrl: string;
  }) => {
    setPrompt(
      buildSearchReferencePrompt({
        kind: "image",
        currentPrompt: prompt,
        draft,
      })
    );
    setSearchReferenceOpen(false);
    window.setTimeout(() => promptInputRef.current?.focus(), 0);
  };

  const handleRandomPrompt = () => {
    const list = mode === "generate" ? IMAGE_PROMPTS : EDIT_PROMPTS;
    const random = list[Math.floor(Math.random() * list.length)];
    setPrompt(random);
  };

  const handleGallerySelect = (item: PromptGalleryItem) => {
    setPrompt(item.prompt);
    toast.success(`已填入「${item.title}」提示词`);
    window.setTimeout(() => promptInputRef.current?.focus(), 0);
  };

  useUploadShortcut(fileInputRef);

  const clearAttachment = () => {
    setRefImage(null);
    setRefImagePreview(null);
    setMode("generate");
  };

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    if (sessionPending) {
      return;
    }

    if (!hasSession) {
      const nextTask: ImageSessionTask = {
        id: `login-required-${Date.now()}`,
        sessionId: activeSessionId,
        mode,
        model: getImageModel(quality),
        prompt: trimmedPrompt,
        aspectRatio,
        status: "pending",
        sourceImageUrl: refImagePreview,
        creditCost: imageCreditCost,
        createdAt: new Date().toISOString(),
        requiresLogin: true,
      };

      setOptimisticTask(nextTask);
      setCurrentTaskId(null);
      setTaskStatus("pending");
      setLoading(false);
      setPrompt("");
      return;
    }

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
        let imageData: { base64: string; mimeType: string } | null = null;
        if (refImage) {
          imageData = await fileToBase64(refImage);
        } else if (refImagePreview) {
          imageData = await imageUrlToBase64(refImagePreview);
        }

        if (!imageData) {
          throw new Error("缺少输入图像");
        }

        imageBase64 = imageData.base64;
        imageMimeType = imageData.mimeType;
      }

      const model = getImageModel(quality);
      const imageSize = getImageSize(quality);
      const endpoint = mode === "edit" ? "/api/image/edit" : "/api/image/generate";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          model,
          aspectRatio,
          imageSize,
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

  const renderComposer = (centered = false, compact = false) => {
    const canSendPrompt = prompt.trim().length > 0;
    const sendDisabled = loading || (mode === "edit" && !refImage && !refImagePreview);
    const placeholder = compact
      ? "描述一张新图片"
      : "描述图片，或上传参考图后说明怎么修改";

    return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[768px]",
        centered ? "px-4" : "px-3 pb-3 md:px-4 md:pb-5"
      )}
    >
      <div
        className={cn(
          "relative min-w-0 rounded-[28px] border border-[#d9d9d9] bg-white shadow-[0_2px_18px_rgba(0,0,0,0.08)]",
          compact
            ? "px-3 py-2 md:px-4 md:py-2"
            : "min-h-[84px] px-3 py-2 md:min-h-[118px] md:px-5 md:py-3"
        )}
      >
        {refImagePreview && (
          <div className="mb-3 flex items-center gap-3">
            <div className="relative size-16 overflow-hidden rounded-2xl bg-[#f4f4f4]">
              <img src={refImagePreview} alt="参考图" className="size-full object-cover" />
              <button
                type="button"
                onClick={clearAttachment}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black text-white"
                aria-label="移除参考图"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <span className="text-sm text-[#6f6f6f]">将作为编辑输入图像</span>
          </div>
        )}

        {!compact && (
          <textarea
            ref={promptInputRef}
            aria-label="输入提示词"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            rows={1}
            maxLength={10000}
            placeholder={placeholder}
            className="max-h-40 min-h-[34px] w-full min-w-0 resize-none bg-transparent px-0 py-1 text-[16px] leading-6 outline-none placeholder:text-[#8f8f8f] md:min-h-[44px] md:text-[17px] md:leading-7"
          />
        )}

        <div
          ref={settingsRef}
          className={cn(
            "relative hidden md:block",
            compact
              ? "absolute left-0 top-full mt-3 w-full px-1"
              : "mb-1 border-t border-[#eeeeee] pt-3"
          )}
        >
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 bg-white px-3 text-sm text-[#555] transition hover:bg-[#f4f4f4]"
            >
              <SlidersHorizontal className="size-4" strokeWidth={1.9} />
              设置
              <ChevronDown
                className={cn(
                  "size-3.5 text-[#777] transition-transform",
                  settingsOpen && "rotate-180"
                )}
              />
            </button>

            <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-[#555]">
              {mode === "generate" ? "生成" : "编辑"}
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-[#555]">
              {ASPECT_LABELS[aspectRatio]}
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-[#555]">
              {quality}
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-[#555]">
              {imageCreditCost} 积分
            </span>
          </div>

          {settingsOpen && (
            <div
              role="menu"
              aria-label="图像设置"
              className={cn(
                "absolute left-0 z-40 w-[min(328px,calc(100vw-48px))] overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.16)]",
                centered
                  ? "top-11 max-h-[clamp(280px,calc(100vh-330px),420px)]"
                  : "bottom-12 max-h-[min(520px,calc(100vh-160px))]"
              )}
            >
              <div className="space-y-1.5">
                <SettingsLoginCard
                  hasSession={hasSession}
                  onLogin={() => {
                    setSettingsOpen(false);
                    openLoginDialog();
                  }}
                  onSignup={() => {
                    setSettingsOpen(false);
                    router.push("/signup");
                  }}
                />
                <div>
                  <p className="px-2.5 py-1 text-xs font-medium text-[#777]">模式</p>
                  <div className="space-y-0.5">
                    {(["generate", "edit"] as const).map((item) => {
                      const disabled = item === "edit" && !refImagePreview;
                      return (
                        <SettingsOption
                          key={item}
                          label={item === "generate" ? "生成图像" : "编辑图像"}
                          description={
                            item === "generate"
                              ? "从提示词创建新图像"
                              : "基于上传或作品库图像继续编辑"
                          }
                          active={mode === item}
                          disabled={disabled}
                          onClick={() => {
                            if (!disabled) setMode(item);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-[#eeeeee]" />

                <div>
                  <p className="px-2.5 py-1 text-xs font-medium text-[#777]">比例</p>
                  <div className="max-h-48 space-y-0.5 overflow-y-auto pr-1">
                    {aspectOptions.map((ratio) => (
                      <SettingsOption
                        key={ratio}
                        label={ASPECT_LABELS[ratio]}
                        description={
                          ratio === AspectRatio.AUTO
                            ? "自动匹配提示词和参考图"
                            : `输出比例 ${ASPECT_LABELS[ratio]}`
                        }
                        active={aspectRatio === ratio}
                        onClick={() => setAspectRatio(ratio)}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#eeeeee]" />

                <div>
                  <p className="px-2.5 py-1 text-xs font-medium text-[#777]">画质</p>
                  <div className="space-y-0.5">
                    {qualityOptions.map((item) => (
                      <SettingsOption
                        key={item}
                        label={item}
                        description={
                          item === ImageQuality.STANDARD
                            ? "速度更快，适合日常出图"
                            : "细节更强，适合高质量成片"
                        }
                        active={quality === item}
                        onClick={() => setQuality(item)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[#f6f6f6] px-2.5 py-2 text-sm">
                  <span className="text-[#777]">本次消耗</span>
                  <span className="font-medium text-[#0d0d0d]">
                    {imageCreditCost} 积分
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={cn("relative", compact && "md:mt-0")}>
          <div
            className={cn(
              "flex w-full min-w-0 items-center justify-between gap-2 md:justify-start",
              compact ? "min-h-10 md:min-h-11" : "h-9 md:h-11",
              canSendPrompt ? "md:pr-24" : "md:pr-[136px]"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-2",
                compact && "flex-1"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="选择图像文件"
                className="hidden"
                onChange={handleFileChange}
              />
              <div ref={attachmentMenuRef} className="relative shrink-0">
                <IconHint label="添加内容" disabled={attachmentMenuOpen}>
                  <button
                    type="button"
                    onClick={() => setAttachmentMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={attachmentMenuOpen}
                    className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                    aria-label="添加内容"
                  >
                    <Plus
                      className={cn(
                        "size-6 transition-transform",
                        attachmentMenuOpen && "rotate-45"
                      )}
                      strokeWidth={1.8}
                    />
                  </button>
                </IconHint>
                {attachmentMenuOpen && (
                  <div
                    role="menu"
                    aria-label="添加内容"
                    className={cn(
                      "absolute left-0 z-40 w-[min(216px,calc(100vw-64px))] rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.16)]",
                      centered ? "top-11" : "bottom-11"
                    )}
                  >
                    <AttachmentMenuItem
                      icon={<Paperclip className="size-4" strokeWidth={1.9} />}
                      label="上传图片"
                      trailing="⌘ U"
                      onClick={() => {
                        setAttachmentMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                    />
                    <AttachmentMenuItem
                      icon={<Search className="size-4" strokeWidth={1.9} />}
                      label="联网搜索"
                      onClick={handleOpenSearchReference}
                    />
                    <AttachmentMenuItem
                      icon={<Video className="size-4" strokeWidth={1.9} />}
                      label="图片转视频"
                      onClick={handleOpenVideoWorkshop}
                    />
                    {!hasSession && (
                      <div className="mx-2 my-1 h-px bg-[#eeeeee]" />
                    )}
                    {!hasSession && (
                      <p className="px-3 pb-1 pt-1 text-xs leading-5 text-[#8a8a8a]">
                        登录后可用
                      </p>
                    )}
                    <AttachmentMenuItem
                      icon={<Brain className="size-4" strokeWidth={1.9} />}
                      label="深度思考"
                      trailing={!hasSession ? "登录" : undefined}
                      muted={!hasSession}
                      onClick={handleDeepThinking}
                    />
                    <AttachmentMenuItem
                      icon={<ImageIcon className="size-4" strokeWidth={1.9} />}
                      label="从作品库选择"
                      trailing={!hasSession ? "登录" : undefined}
                      muted={!hasSession}
                      onClick={handleOpenAssetPicker}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMode(mode === "generate" ? "edit" : "generate")}
                className="sr-only"
              >
                {mode === "generate" ? "生成" : "编辑"}
              </button>
              <IconHint label="随机提示词">
                <button
                  type="button"
                  onClick={handleRandomPrompt}
                  className={cn(
                    compact
                      ? "hidden"
                      : "hidden h-9 items-center gap-2 rounded-full px-2.5 text-[15px] text-[#555] hover:bg-black/5 md:flex"
                  )}
                >
                  <Shuffle className="size-4" />
                  随机
                </button>
              </IconHint>
              {compact && (
                <textarea
                  ref={promptInputRef}
                  aria-label="输入提示词"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={10000}
                  placeholder={placeholder}
                  className="max-h-28 min-h-8 min-w-0 flex-1 resize-none bg-transparent px-0 py-1 text-[16px] leading-6 outline-none placeholder:text-[#8f8f8f]"
                />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 md:hidden">
              {!canSendPrompt && (
                <button
                  type="button"
                  onClick={toggleSpeechInput}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full hover:bg-black/5",
                    isListening && "bg-black text-white hover:bg-[#333]"
                  )}
                  aria-pressed={isListening}
                  aria-label={isListening ? "停止语音输入" : "语音输入"}
                >
                  <Mic className="size-5" strokeWidth={isListening ? 2.4 : 2} />
                </button>
              )}
              {canSendPrompt ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={sendDisabled}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#333] disabled:bg-[#d7d7d7]"
                  aria-label="发送"
                >
                  <ArrowUp className="size-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleSpeechInput}
                  className="flex h-9 min-w-[82px] items-center justify-center gap-1.5 rounded-full bg-[#ececec] px-3 text-sm font-medium text-[#0d0d0d] transition hover:opacity-80"
                  aria-pressed={isListening}
                  aria-label={isListening ? "停止语音输入" : "语音模式"}
                >
                  <AudioLines className="size-4" strokeWidth={2.2} />
                  <span>{isListening ? "听写中" : "语音"}</span>
                </button>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <IconHint
              label={isListening ? "停止语音输入" : "语音输入"}
              className={cn(
                "absolute bottom-1",
                canSendPrompt ? "right-11" : "right-[92px]"
              )}
            >
              <button
                type="button"
                onClick={toggleSpeechInput}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full hover:bg-black/5",
                  isListening && "bg-black text-white hover:bg-[#333]"
                )}
                aria-pressed={isListening}
                aria-label={isListening ? "停止语音输入" : "语音输入"}
              >
                <Mic className="size-5" strokeWidth={isListening ? 2.4 : 2} />
              </button>
            </IconHint>
            {canSendPrompt ? (
              <IconHint label="发送" className="absolute bottom-1 right-0">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={sendDisabled}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#333] disabled:bg-[#d7d7d7]"
                  aria-label="发送"
                >
                  <ArrowUp className="size-5" />
                </button>
              </IconHint>
            ) : (
              <IconHint label={isListening ? "停止语音输入" : "语音模式"} className="absolute bottom-1 right-0">
                <button
                  type="button"
                  onClick={toggleSpeechInput}
                  className="flex h-9 min-w-[82px] items-center justify-center gap-1.5 rounded-full bg-[#ececec] px-3 text-sm font-medium text-[#0d0d0d] transition hover:opacity-80"
                  aria-pressed={isListening}
                  aria-label={isListening ? "停止语音输入" : "语音模式"}
                >
                  <AudioLines className="size-4" strokeWidth={2.2} />
                  <span>{isListening ? "听写中" : "语音"}</span>
                </button>
              </IconHint>
            )}
          </div>
        </div>
      </div>
      <ComposerNotice compact={compact} />
    </div>
    );
  };

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
      <DeepThinkingDialog
        open={deepThinkingOpen}
        onOpenChange={setDeepThinkingOpen}
        result={deepThinkingResult}
        onConfirm={handleUseDeepThinkingPrompt}
      />
      <SearchReferenceDialog
        open={searchReferenceOpen}
        onOpenChange={setSearchReferenceOpen}
        kind="image"
        prompt={prompt}
        modeLabel={mode === "generate" ? "生成" : "编辑"}
        onConfirm={handleUseSearchReference}
      />

      {empty ? (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto px-0 pb-10 pt-7 md:pt-8">
          <div className="mx-auto w-full max-w-[768px] px-4">
            <h1 className="mb-6 text-left text-[28px] font-medium leading-tight tracking-normal text-[#0d0d0d] md:mb-7 md:text-[30px]">
              图像创作
            </h1>
          </div>
          {renderComposer(true, true)}
          <div className="mx-auto mt-12 w-full max-w-[1200px] px-4 pb-4 md:mt-14 md:px-6">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <h2 className="text-[18px] font-medium leading-7 text-[#0d0d0d]">
                灵感库
              </h2>
              <span className="text-xs text-[#8a8a8a]">点击卡片填入提示词</span>
            </div>
            <ImageGallerySection
              onSelect={handleGallerySelect}
              leadingTile={
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group/card min-w-0 text-left"
                >
                  <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#f6f6f6]">
                    <Image
                      src="/studio-showcase/edit-image-tile.png"
                      alt=""
                      fill
                      sizes="(max-width: 640px) 33vw, 190px"
                      priority
                      className="object-cover transition duration-200 group-hover/card:scale-[1.03]"
                    />
                  </span>
                  <span className="mt-2.5 block truncate text-center text-[14px] leading-5 text-[#777] transition group-hover/card:text-[#0d0d0d]">
                    上传图片编辑
                  </span>
                </button>
              }
            />
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-40 pt-8 md:px-8 md:pb-44">
            <div className="mx-auto flex max-w-[768px] flex-col gap-10">
              {tasks.map((task) => {
                const isWorking =
                  !task.requiresLogin &&
                  (task.status === "pending" ||
                    task.status === "running" ||
                    (optimisticTask?.id === task.id && loading));
                const imageUrl = task.imageUrl;

                return (
                  <article key={task.id} className="flex flex-col gap-5">
                    <div className="ml-auto max-w-[74%] rounded-[24px] bg-[#f4f4f4] px-5 py-3 text-[15px] leading-relaxed md:text-[16px]">
                      {task.prompt}
                    </div>
                    <div className="max-w-[92%] md:max-w-[760px]">
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
                      {task.requiresLogin ? (
                        <div className="w-full max-w-[560px] rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
                          <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                              <Sparkles className="size-4" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-medium text-[#0d0d0d]">
                                登录后生成这张图片
                              </p>
                              <p className="mt-1 text-sm leading-6 text-[#666]">
                                你的提示词已放入当前对话。登录后可继续生成、保存作品，并在作品库里查看结果。
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={openLoginDialog}
                                  className="h-9 rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                                >
                                  登录后生成
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrompt(task.prompt);
                                    setOptimisticTask(null);
                                    window.setTimeout(() => promptInputRef.current?.focus(), 0);
                                  }}
                                  className="h-9 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-[#0d0d0d] hover:bg-black/[0.04]"
                                >
                                  继续编辑
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : isWorking ? (
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
                        <div className="max-w-[520px] rounded-3xl border border-[#f1c9c9] bg-[#fff4f4] p-5 text-sm text-[#8f1d1d]">
                          <p className="font-medium text-[#6f1515]">
                            图像没有生成成功
                          </p>
                          <p className="mt-2 leading-6">
                            {getImageFailureReason(task)}
                          </p>
                          <p className="mt-3 text-xs leading-5 text-[#9f4a4a]">
                            {getImageRefundMessage(task)}
                          </p>
                        </div>
                      ) : imageUrl ? (
                        <div className="group w-full max-w-[360px] md:max-w-[320px]">
                          <div
                            className="overflow-hidden rounded-3xl bg-[#f4f4f4]"
                            style={{ aspectRatio: getResultAspectRatio(task.aspectRatio) }}
                          >
                            <img
                              src={imageUrl}
                              alt="生成结果"
                              className="size-full object-cover"
                            />
                          </div>
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
                              onClick={() => void handleCopyResultPrompt(task.prompt)}
                              className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                              aria-label="复制提示词"
                              title="复制提示词"
                            >
                              <Copy className="size-5" />
                            </button>
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
          <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white via-white to-white/0 pt-10 md:left-[var(--studio-sidebar-left)]">
            <div className="pointer-events-auto">{renderComposer(false)}</div>
          </div>
        </>
      )}
    </div>
  );
}
