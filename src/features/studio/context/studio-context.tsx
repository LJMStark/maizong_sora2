"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  AppState,
  GenerationResult,
  StudioContextType,
  CreditTransaction,
  VideoTask,
  ImageTask,
} from "../types";

const StudioContext = createContext<StudioContextType | undefined>(undefined);

function isActiveVideoTask(task: VideoTask): boolean {
  return (
    task.status === "pending" ||
    task.status === "running" ||
    task.status === "retrying"
  );
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>({
    credits: 0,
    history: [],
    creditHistory: [],
    videoTasks: [],
    imageTasks: [],
  });
  const [pendingConfigReload, setPendingConfigReload] = useState(false);
  const videoTasksRef = useRef<VideoTask[]>([]);
  const reloadingRef = useRef(false);

  useEffect(() => {
    videoTasksRef.current = appState.videoTasks;
  }, [appState.videoTasks]);

  const refreshCredits = useCallback(async () => {
    try {
      const response = await fetch("/api/credits");
      if (response.ok) {
        const data = await response.json();
        setAppState((prev) => ({ ...prev, credits: data.credits }));
      }
    } catch (error) {
      console.error("刷新积分失败:", error);
    }
  }, []);

  const refreshCreditHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/credits/history");
      if (response.ok) {
        const data = await response.json();
        const formattedHistory: CreditTransaction[] = data.history.map(
          (txn: {
            id: string;
            type: "deduction" | "addition" | "refund";
            amount: number;
            reason: string;
            createdAt: string;
            balanceBefore: number;
            balanceAfter: number;
          }) => ({
            id: txn.id,
            type: txn.type,
            amount: txn.amount,
            reason: txn.reason,
            date: new Date(txn.createdAt),
            balanceBefore: txn.balanceBefore,
            balanceAfter: txn.balanceAfter,
          })
        );
        setAppState((prev) => ({ ...prev, creditHistory: formattedHistory }));
      }
    } catch (error) {
      console.error("刷新积分历史失败:", error);
    }
  }, []);

  const fetchVideoTasks = useCallback(async (): Promise<VideoTask[] | null> => {
    try {
      const response = await fetch("/api/video/tasks");
      if (response.ok) {
        const data = await response.json();
        const formattedTasks: VideoTask[] = data.tasks.map(
          (task: {
            id: string;
            status: "pending" | "running" | "succeeded" | "error" | "retrying";
            progress: number;
            prompt: string;
            aspectRatio: string;
            duration: number;
            model: string;
            videoUrl?: string;
            sourceImageUrl?: string;
            errorMessage?: string;
            creditCost: number;
            createdAt: string;
            completedAt?: string;
          }) => ({
            ...task,
            createdAt: new Date(task.createdAt),
            completedAt: task.completedAt
              ? new Date(task.completedAt)
              : undefined,
          })
        );
        setAppState((prev) => ({ ...prev, videoTasks: formattedTasks }));

        const completedVideos = formattedTasks.filter(
          (task: VideoTask) => task.status === "succeeded" && task.videoUrl
        );
        const videoHistory: GenerationResult[] = completedVideos.map(
          (task: VideoTask) => ({
            id: task.id,
            type: "video" as const,
            url: task.videoUrl,
            prompt: task.prompt,
            createdAt: task.createdAt,
            status: "completed" as const,
          })
        );

        setAppState((prev) => {
          const existingNonVideoHistory = prev.history.filter(
            (item) => item.type !== "video"
          );
          return {
            ...prev,
            history: [...videoHistory, ...existingNonVideoHistory],
          };
        });

        return formattedTasks;
      }
    } catch (error) {
      console.error("刷新视频任务失败:", error);
    }

    return null;
  }, []);

  const refreshVideoTasks = useCallback(async () => {
    await fetchVideoTasks();
  }, [fetchVideoTasks]);

  const refreshImageTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/image/tasks");
      if (response.ok) {
        const data = await response.json();
        const formattedTasks: ImageTask[] = data.tasks.map(
          (task: {
            id: string;
            mode: "generate" | "edit";
            model: string;
            prompt: string;
            aspectRatio?: string;
            status: "pending" | "running" | "succeeded" | "error";
            errorMessage?: string;
            sourceImageUrl?: string;
            imageUrl?: string;
            creditCost: number;
            createdAt: string;
            completedAt?: string;
          }) => ({
            ...task,
            createdAt: new Date(task.createdAt),
            completedAt: task.completedAt
              ? new Date(task.completedAt)
              : undefined,
          })
        );
        setAppState((prev) => ({ ...prev, imageTasks: formattedTasks }));

        const completedImages = formattedTasks.filter(
          (task: ImageTask) => task.status === "succeeded" && task.imageUrl
        );
        const imageHistory: GenerationResult[] = completedImages.map(
          (task: ImageTask) => ({
            id: task.id,
            type: "image" as const,
            url: task.imageUrl,
            prompt: task.prompt,
            createdAt: task.createdAt,
            status: "completed" as const,
          })
        );

        setAppState((prev) => {
          const existingNonImageHistory = prev.history.filter(
            (item) => item.type !== "image"
          );
          return {
            ...prev,
            history: [...imageHistory, ...existingNonImageHistory],
          };
        });
      }
    } catch (error) {
      console.error("刷新图片任务失败:", error);
    }
  }, []);

  useEffect(() => {
    refreshCredits();
    refreshCreditHistory();
    refreshVideoTasks();
    refreshImageTasks();
  }, [refreshCredits, refreshCreditHistory, refreshVideoTasks, refreshImageTasks]);

  const triggerReload = useCallback(() => {
    if (reloadingRef.current) {
      return;
    }

    reloadingRef.current = true;
    window.location.reload();
  }, []);

  const handleConfigUpdate = useCallback(async () => {
    if (reloadingRef.current) {
      return;
    }

    const latestTasks = await fetchVideoTasks();
    const tasksToCheck = latestTasks ?? videoTasksRef.current;
    const hasActiveVideoTasks = tasksToCheck.some(isActiveVideoTask);

    if (hasActiveVideoTasks) {
      setPendingConfigReload(true);
      return;
    }

    triggerReload();
  }, [fetchVideoTasks, triggerReload]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let eventSource: EventSource | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) {
        return;
      }

      eventSource = new EventSource("/api/video/config/stream");

      eventSource.addEventListener("config-updated", () => {
        void handleConfigUpdate();
      });

      eventSource.onerror = () => {
        eventSource?.close();

        if (!stopped) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      eventSource?.close();

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [handleConfigUpdate]);

  useEffect(() => {
    if (!pendingConfigReload || reloadingRef.current) {
      return;
    }

    const hasActiveVideoTasks = appState.videoTasks.some(isActiveVideoTask);
    if (!hasActiveVideoTasks) {
      triggerReload();
    }
  }, [appState.videoTasks, pendingConfigReload, triggerReload]);

  useEffect(() => {
    if (!pendingConfigReload || reloadingRef.current) {
      return;
    }

    const timer = setInterval(() => {
      void refreshVideoTasks();
    }, 3000);

    return () => {
      clearInterval(timer);
    };
  }, [pendingConfigReload, refreshVideoTasks]);

  const deductCredits = (amount: number, reason: string = "Service Usage") => {
    setAppState((prev) => ({
      ...prev,
      credits: Math.max(0, prev.credits - amount),
      creditHistory: [
        {
          id: Date.now().toString(),
          type: "deduction",
          amount,
          reason,
          date: new Date(),
        },
        ...prev.creditHistory,
      ],
    }));
  };

  const addCredits = (amount: number, reason: string = "Recharge") => {
    setAppState((prev) => ({
      ...prev,
      credits: prev.credits + amount,
      creditHistory: [
        {
          id: Date.now().toString(),
          type: "addition",
          amount,
          reason,
          date: new Date(),
        },
        ...prev.creditHistory,
      ],
    }));
  };

  const addToHistory = (item: GenerationResult) => {
    setAppState((prev) => ({
      ...prev,
      history: [item, ...prev.history],
    }));
  };

  return (
    <StudioContext.Provider
      value={{
        state: appState,
        deductCredits,
        addCredits,
        addToHistory,
        refreshCredits,
        refreshVideoTasks,
        refreshImageTasks,
        refreshCreditHistory,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return context;
}
