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
  Play,
  Plus,
  Search,
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
import { DeepThinkingDialog } from "./shared/deep-thinking-dialog";
import { SearchReferenceDialog } from "./shared/search-reference-dialog";
import { useStudio } from "../context/studio-context";
import { useTaskPolling, VideoTaskStatus } from "../hooks/use-task-polling";
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
  requiresLogin?: boolean;
  localErrorType?: "channel-unavailable";
}

const DEFAULT_CREDIT_COSTS = {
  Fast: 30,
  Quality: 100,
} as const;

function openLoginDialog() {
  window.dispatchEvent(new CustomEvent("studio:open-login"));
}

const VIDEO_ASPECT_OPTIONS = [
  { value: AspectRatio.SOCIAL, label: "9:16" },
  { value: AspectRatio.LANDSCAPE, label: "16:9" },
] as const;

const VIDEO_DURATION_OPTIONS = [8, 10, 15] as const;

const STUDIO_VIDEO_EXAMPLES = [
  {
    id: "orbit-product",
    title: "产品环绕",
    image: "/studio-showcase/gold.png",
    prompt: VIDEO_PROMPTS[3],
  },
  {
    id: "lifestyle-pan",
    title: "生活运镜",
    image: "/studio-showcase/caricature-trend.png",
    prompt: VIDEO_PROMPTS[1],
  },
  {
    id: "macro-detail",
    title: "细节特写",
    image: "/studio-showcase/flower-petals.png",
    prompt: VIDEO_PROMPTS[2],
  },
  {
    id: "festival-cut",
    title: "节日短片",
    image: "/studio-showcase/lunar-new-year.png",
    prompt: VIDEO_PROMPTS[5],
  },
  {
    id: "soft-reveal",
    title: "柔焦揭示",
    image: "/studio-showcase/crayon.png",
    prompt: VIDEO_PROMPTS[4],
  },
  {
    id: "flash-capture",
    title: "闪光镜头",
    image: "/studio-showcase/paparazzi.png",
    prompt: VIDEO_PROMPTS[6],
  },
];

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

function getVideoFailureReason(task: Pick<VideoSessionTask, "errorMessage">) {
  return task.errorMessage?.trim() || "视频生成失败";
}

function getVideoRefundMessage(
  task: Pick<VideoSessionTask, "creditCost">,
  repeatedFailure: boolean
) {
  if (task.creditCost === 0) return "本次没有扣除积分。";
  if (repeatedFailure) return "本次不会扣除积分。";
  return task.creditCost > 0
    ? `已退回 ${task.creditCost} 积分。`
    : "本次没有扣除积分。";
}

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
          登录后使用完整视频能力
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

export default function VideoWorkshop() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const imageParam = searchParams.get("image");
  const { state, refreshCredits, refreshVideoTasks } = useStudio();
  const { data: session, isPending: sessionPending } = useSession();
  const hasSession = Boolean(session?.user);

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

    if (!activeSessionId || !hasSession) {
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
    if (imageParam) {
      setSourcePreview(decodeURIComponent(imageParam));
    }
  }, [imageParam]);

  useEffect(() => {
    if (sessionPending || !hasSession) {
      return;
    }

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
  }, [hasSession, sessionPending]);

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
      toast.error(`${task.errorMessage || "视频生成失败"}，积分已退还`);
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

  // Release object URLs created for local file previews so blob data does not
  // accumulate in memory when the preview is replaced or the view unmounts.
  useEffect(() => {
    if (!sourcePreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(sourcePreview);
  }, [sourcePreview]);

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

  const handleOpenImageWorkshop = () => {
    setAttachmentMenuOpen(false);
    router.push("/studio");
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
        kind: "video",
        prompt,
        modeLabel: isVeo ? "Veo Fast" : mode,
        aspectLabel: aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9",
        durationLabel: `${isVeo ? 8 : duration} 秒`,
        referenceLabel: sourcePreview ? "已附加参考图" : undefined,
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
        kind: "video",
        currentPrompt: prompt,
        draft,
      })
    );
    setSearchReferenceOpen(false);
    window.setTimeout(() => promptInputRef.current?.focus(), 0);
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
      if (sessionPending) {
        return;
      }

      if (!hasSession) {
        openLoginDialog();
        return;
      }

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

    if (sessionPending) {
      return;
    }

    if (!hasSession) {
      openLoginDialog();
      return;
    }

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

    if (sessionPending) {
      return;
    }

    if (!hasSession) {
      const nextTask: VideoSessionTask = {
        id: `login-required-${Date.now()}`,
        sessionId: activeSessionId,
        status: "pending",
        progress: 0,
        prompt: resolvedPrompt,
        aspectRatio: aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9",
        duration: isVeo ? 8 : duration,
        model: isVeo
          ? "veo3.1-fast"
          : mode === "Quality"
            ? "sora-2-pro"
            : "sora-2-temporary",
        sourceImageUrl: sourcePreview,
        creditCost: currentCost,
        createdAt: new Date().toISOString(),
        requiresLogin: true,
      };

      setOptimisticTask(nextTask);
      setCurrentTaskId(null);
      setLoading(false);
      setPrompt("");
      return;
    }

    const currentLimit = mode === "Fast"
      ? videoConfig?.dailyLimits?.fast
      : videoConfig?.dailyLimits?.quality;
    if (currentLimit === 0) {
      const nextTask: VideoSessionTask = {
        id: `channel-unavailable-${Date.now()}`,
        sessionId: activeSessionId,
        status: "error",
        progress: 0,
        prompt: resolvedPrompt,
        aspectRatio: aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9",
        duration: isVeo ? 8 : duration,
        model: isVeo
          ? "veo3.1-fast"
          : mode === "Quality"
            ? "sora-2-pro"
            : "sora-2-temporary",
        sourceImageUrl: sourcePreview,
        errorMessage: "该视频渠道暂不可用，请调整设置或稍后再试。",
        creditCost: 0,
        createdAt: new Date().toISOString(),
        localErrorType: "channel-unavailable",
      };

      setOptimisticTask(nextTask);
      setCurrentTaskId(null);
      setLoading(false);
      setPrompt("");
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

  const renderComposer = (centered = false, compact = false) => {
    const canSendPrompt =
      prompt.trim().length > 0 || Boolean(sourceImage) || Boolean(sourcePreview);
    const hasPrompt = prompt.trim().length > 0;
    const showCompactEnhance = compact && hasPrompt;
    const placeholder = compact
      ? "描述一段新视频"
      : "描述视频画面、镜头运动和主体动作";

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
        {sourcePreview && (
          <div className="mb-3 flex items-center gap-3">
            <div className="relative size-16 overflow-hidden rounded-2xl bg-[#f4f4f4]">
              <img src={sourcePreview} alt="源图像" width={80} height={80} className="size-full object-cover" />
              <button
                type="button"
                onClick={clearAttachment}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black text-white"
                aria-label="移除源图像"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <span className="text-sm text-[#6f6f6f]">将作为视频源图像</span>
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
                void handleGenerate();
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
              {isVeo ? "Veo Fast" : mode}
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-[#555]">
              {aspectRatio === AspectRatio.SOCIAL ? "9:16" : "16:9"}
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-[#555]">
              {isVeo ? 8 : duration} 秒
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-[#555]">
              {currentCost} 积分
            </span>
          </div>

          {settingsOpen && (
            <div
              role="menu"
              aria-label="视频设置"
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
                {!allVeo && (
                  <div>
                    <p className="px-2.5 py-1 text-xs font-medium text-[#777]">
                      渲染模式
                    </p>
                    <div className="space-y-0.5">
                      {(["Fast", "Quality"] as const).map((item) => (
                        <SettingsOption
                          key={item}
                          label={item === "Fast" ? "快速模式" : "高质量模式"}
                          description={
                            item === "Fast"
                              ? "更快返回，适合草稿和日常短片"
                              : "更高质量，适合成片和精细画面"
                          }
                          active={mode === item}
                          onClick={() => setMode(item)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!allVeo && <div className="h-px bg-[#eeeeee]" />}

                <div>
                  <p className="px-2.5 py-1 text-xs font-medium text-[#777]">比例</p>
                  <div className="space-y-0.5">
                    {VIDEO_ASPECT_OPTIONS.map((item) => (
                      <SettingsOption
                        key={item.value}
                        label={item.label}
                        description={
                          item.value === AspectRatio.SOCIAL
                            ? "竖屏短视频和社媒内容"
                            : "横屏展示和宽画面叙事"
                        }
                        active={aspectRatio === item.value}
                        onClick={() => setAspectRatio(item.value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#eeeeee]" />

                <div>
                  <p className="px-2.5 py-1 text-xs font-medium text-[#777]">时长</p>
                  <div className="space-y-0.5">
                    {VIDEO_DURATION_OPTIONS.map((item) => (
                      <SettingsOption
                        key={item}
                        label={`${item} 秒`}
                        description={
                          item === 8
                            ? "短镜头，适合快速预览"
                            : item === 10
                              ? "常规时长，适合大多数内容"
                              : "更长镜头，适合完整动作"
                        }
                        active={duration === item}
                        disabled={isVeo}
                        onClick={() => setDuration(item)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[#f6f6f6] px-2.5 py-2 text-sm">
                  <span className="text-[#777]">本次消耗</span>
                  <span className="font-medium text-[#0d0d0d]">
                    {currentCost} 积分
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
              showCompactEnhance
                ? "md:pr-[136px]"
                : canSendPrompt
                  ? "md:pr-24"
                  : "md:pr-[136px]"
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
                      icon={<ImageIcon className="size-4" strokeWidth={1.9} />}
                      label="图像创作"
                      onClick={handleOpenImageWorkshop}
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
              <IconHint label="随机提示词">
                <button
                  type="button"
                  onClick={handleRandomPrompt}
                  disabled={randomizing || enhancing}
                  className={cn(
                    compact
                      ? "hidden"
                      : "hidden h-9 items-center gap-2 rounded-full px-2.5 text-[15px] text-[#555] hover:bg-black/5 disabled:text-[#aaa] md:flex"
                  )}
                >
                  <Shuffle className="size-4" />
                  {randomizing ? "生成中…" : "随机"}
                </button>
              </IconHint>
              <IconHint label="润色提示词">
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={!prompt.trim() || enhancing || randomizing}
                  className={cn(
                    compact
                      ? "hidden"
                      : "hidden h-9 items-center gap-2 rounded-full px-2.5 text-[15px] text-[#555] hover:bg-black/5 disabled:text-[#aaa] sm:flex"
                  )}
                >
                  <Wand2 className="size-4" />
                  {enhancing ? "润色中…" : "润色"}
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
                      void handleGenerate();
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
              {hasPrompt && (
                <IconHint label={enhancing ? "正在润色" : "润色提示词"}>
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                  disabled={enhancing || randomizing}
                  className="flex size-9 items-center justify-center rounded-full text-[#555] transition hover:bg-black/5 disabled:text-[#aaa]"
                  aria-label="润色提示词"
                >
                    <Wand2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </button>
                </IconHint>
              )}
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
                  onClick={handleGenerate}
                  disabled={loading}
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
                  <span>{isListening ? "听写中" : "Voice"}</span>
                </button>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            {showCompactEnhance && (
              <IconHint
                label={enhancing ? "正在润色" : "润色提示词"}
                className="absolute bottom-1 right-[88px]"
              >
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={enhancing || randomizing}
                  className="flex size-9 items-center justify-center rounded-full text-[#555] transition hover:bg-black/5 disabled:text-[#aaa]"
                  aria-label="润色提示词"
                >
                  <Wand2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </button>
              </IconHint>
            )}
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
                  onClick={handleGenerate}
                  disabled={loading}
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
                  <span>{isListening ? "听写中" : "Voice"}</span>
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
      <DeepThinkingDialog
        open={deepThinkingOpen}
        onOpenChange={setDeepThinkingOpen}
        result={deepThinkingResult}
        onConfirm={handleUseDeepThinkingPrompt}
      />
      <SearchReferenceDialog
        open={searchReferenceOpen}
        onOpenChange={setSearchReferenceOpen}
        kind="video"
        prompt={prompt}
        modeLabel={isVeo ? "Veo Fast" : mode}
        onConfirm={handleUseSearchReference}
      />

      {empty ? (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto px-0 pb-10 pt-7 md:pt-8">
          <div className="mx-auto w-full max-w-[768px] px-4">
            <h1 className="mb-6 text-left text-[28px] font-medium leading-tight tracking-normal text-[#0d0d0d] md:mb-7 md:text-[30px]">
              视频创作
            </h1>
          </div>
          {renderComposer(true, true)}
          <div className="mx-auto mt-12 w-full max-w-[768px] px-4 md:mt-14">
            <h2 className="text-[18px] font-medium leading-7 text-[#0d0d0d]">
              创建视频
            </h2>
          </div>
          <div className="scrollbar-none relative mt-5 w-full max-w-[768px] overflow-x-auto px-4 pb-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-36 shrink-0 flex-col items-center gap-3 text-[#777]"
              >
                <span className="flex h-[180px] w-36 items-center justify-center rounded-[20px] bg-[#f6f6f6] transition hover:bg-[#efefef]">
                  <Paperclip className="size-6" />
                </span>
                <span className="block text-center text-[15px] leading-5">
                  上传图片
                </span>
              </button>
              <div className="h-[228px] w-px shrink-0 bg-[#dcdcdc]" />
              {STUDIO_VIDEO_EXAMPLES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPrompt(item.prompt)}
                  className="w-36 shrink-0 text-left"
                >
                  <span className="relative block h-[180px] w-36 overflow-hidden rounded-[20px] bg-[#f6f6f6]">
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={144}
                      height={180}
                      priority={item.id === STUDIO_VIDEO_EXAMPLES[0]?.id}
                      className="size-full object-cover transition duration-200 hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/80 text-white shadow-sm">
                      <Play className="ml-0.5 size-4 fill-current" strokeWidth={2} />
                    </span>
                  </span>
                  <span className="mt-3 flex items-center justify-center gap-1.5 text-center text-[15px] leading-5 text-[#777]">
                    <Film className="size-3.5 shrink-0" strokeWidth={1.9} />
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
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
                    task.status === "retrying" ||
                    (optimisticTask?.id === task.id && loading));
                const videoUrl = task.videoUrl;
                const liveProgress = currentTaskId === task.id ? progress : task.progress;

                return (
                  <article key={task.id} className="flex flex-col gap-5">
                    <div className="ml-auto max-w-[74%] rounded-[24px] bg-[#f4f4f4] px-5 py-3 text-[15px] leading-relaxed md:text-[16px]">
                      {task.prompt}
                    </div>
                    <div className="max-w-[92%] md:max-w-[760px]">
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
                      {task.requiresLogin ? (
                        <div className="w-full max-w-[560px] rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
                          <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                              <Sparkles className="size-4" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-medium text-[#0d0d0d]">
                                登录后生成这段视频
                              </p>
                              <p className="mt-1 text-sm leading-6 text-[#666]">
                                你的提示词已放入当前对话。登录后可继续生成、保存视频，并在作品库里查看结果。
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
                        <div className="max-w-[520px] rounded-3xl border border-[#f1c9c9] bg-[#fff4f4] p-5 text-sm text-[#8f1d1d]">
                          <p className="font-medium text-[#6f1515]">
                            视频没有生成成功
                          </p>
                          <p className="mt-2 leading-6">
                            {task.localErrorType === "channel-unavailable"
                              ? task.errorMessage
                              : failCount >= 3
                                ? "上游服务暂时繁忙，建议稍后再试。"
                                : getVideoFailureReason(task)}
                          </p>
                          <p className="mt-3 text-xs leading-5 text-[#9f4a4a]">
                            {getVideoRefundMessage(task, failCount >= 3)}
                          </p>
                          {task.localErrorType === "channel-unavailable" && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSettingsOpen(true);
                                  window.setTimeout(
                                    () => promptInputRef.current?.focus(),
                                    0
                                  );
                                }}
                                className="h-9 rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                              >
                                调整设置
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPrompt(task.prompt);
                                  setOptimisticTask(null);
                                  window.setTimeout(
                                    () => promptInputRef.current?.focus(),
                                    0
                                  );
                                }}
                                className="h-9 rounded-full border border-[#e8bcbc] bg-white px-4 text-sm font-medium text-[#6f1515] hover:bg-[#fffafa]"
                              >
                                继续编辑
                              </button>
                            </div>
                          )}
                        </div>
                      ) : videoUrl ? (
                        <div className="group w-full max-w-[420px]">
                          <video
                            src={videoUrl}
                            controls
                            poster={task.sourceImageUrl ?? undefined}
                            className="aspect-video w-full rounded-3xl bg-black object-cover"
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
                            <button
                              type="button"
                              onClick={() => void handleCopyResultPrompt(task.prompt)}
                              className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                              aria-label="复制提示词"
                              title="复制提示词"
                            >
                              <Copy className="size-5" />
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
