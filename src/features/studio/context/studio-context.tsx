"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
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
import { useSession } from "@/lib/auth/client";
import { useHydrated } from "../hooks/use-hydrated";

const StudioContext = createContext<StudioContextType | undefined>(undefined);

const EMPTY_APP_STATE: AppState = {
  credits: 0,
  history: [],
  creditHistory: [],
  videoTasks: [],
  imageTasks: [],
};

type OwnedAppState = {
  ownerUserId: string | null;
  state: AppState;
};

function isActiveVideoTask(task: VideoTask): boolean {
  return (
    task.status === "pending" ||
    task.status === "running" ||
    task.status === "retrying"
  );
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession();
  const hasSession = Boolean(session?.user);
  const userId = session?.user?.id ?? null;
  const hydrated = useHydrated();
  const [ownedAppState, setOwnedAppStateValue] = useState<OwnedAppState>({
    ownerUserId: null,
    state: EMPTY_APP_STATE,
  });
  const [pendingConfigReload, setPendingConfigReload] = useState(false);
  const videoTasksRef = useRef<VideoTask[]>([]);
  const reloadingRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(userId);
  const pendingConfigReloadUserRef = useRef<string | null>(null);
  const appState = ownedAppState.state;

  useEffect(() => {
    currentUserIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    videoTasksRef.current = appState.videoTasks;
  }, [appState.videoTasks]);

  const setOwnedAppState = useCallback(
    (
      ownerUserId: string | null,
      updater: (previous: AppState) => AppState
    ) => {
      if (!ownerUserId || currentUserIdRef.current !== ownerUserId) {
        return;
      }

      setOwnedAppStateValue((previous) => {
        const baseState =
          previous.ownerUserId === ownerUserId
            ? previous.state
            : EMPTY_APP_STATE;
        const nextState = updater(baseState);
        videoTasksRef.current = nextState.videoTasks;
        return {
          ownerUserId,
          state: nextState,
        };
      });
    },
    []
  );

  const refreshCredits = useCallback(async () => {
    if (!hasSession) {
      return;
    }

    const requestUserId = userId;
    try {
      const response = await fetch("/api/credits");
      if (response.ok) {
        const data = await response.json();
        setOwnedAppState(requestUserId, (prev) => ({
          ...prev,
          credits: data.credits,
        }));
      }
    } catch (error) {
      console.error("刷新积分失败:", error);
    }
  }, [hasSession, setOwnedAppState, userId]);

  const refreshCreditHistory = useCallback(async () => {
    if (!hasSession) {
      return;
    }

    const requestUserId = userId;
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
        setOwnedAppState(requestUserId, (prev) => ({
          ...prev,
          creditHistory: formattedHistory,
        }));
      }
    } catch (error) {
      console.error("刷新积分历史失败:", error);
    }
  }, [hasSession, setOwnedAppState, userId]);

  const fetchVideoTasks = useCallback(async (): Promise<VideoTask[] | null> => {
    if (!hasSession) {
      return null;
    }

    const requestUserId = userId;
    try {
      const response = await fetch("/api/video/tasks");
      if (response.ok) {
        const data = await response.json();
        const formattedTasks: VideoTask[] = data.tasks.map(
          (task: {
            id: string;
            sessionId?: string | null;
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
        if (currentUserIdRef.current !== requestUserId) {
          return null;
        }

        setOwnedAppState(requestUserId, (prev) => ({
          ...prev,
          videoTasks: formattedTasks,
        }));

        const completedVideos = formattedTasks.filter(
          (task: VideoTask) => task.status === "succeeded" && task.videoUrl
        );
        const videoHistory: GenerationResult[] = completedVideos.map(
          (task: VideoTask) => ({
            id: task.id,
            sessionId: task.sessionId,
            type: "video" as const,
            url: task.videoUrl,
            prompt: task.prompt,
            createdAt: task.createdAt,
            status: "completed" as const,
          })
        );

        setOwnedAppState(requestUserId, (prev) => {
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
  }, [hasSession, setOwnedAppState, userId]);

  const refreshVideoTasks = useCallback(async () => {
    await fetchVideoTasks();
  }, [fetchVideoTasks]);

  const refreshImageTasks = useCallback(async () => {
    if (!hasSession) {
      return;
    }

    const requestUserId = userId;
    try {
      const response = await fetch("/api/image/tasks");
      if (response.ok) {
        const data = await response.json();
        const formattedTasks: ImageTask[] = data.tasks.map(
          (task: {
            id: string;
            sessionId?: string | null;
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
        if (currentUserIdRef.current !== requestUserId) {
          return;
        }

        setOwnedAppState(requestUserId, (prev) => ({
          ...prev,
          imageTasks: formattedTasks,
        }));

        const completedImages = formattedTasks.filter(
          (task: ImageTask) => task.status === "succeeded" && task.imageUrl
        );
        const imageHistory: GenerationResult[] = completedImages.map(
          (task: ImageTask) => ({
            id: task.id,
            sessionId: task.sessionId,
            type: "image" as const,
            url: task.imageUrl,
            prompt: task.prompt,
            createdAt: task.createdAt,
            status: "completed" as const,
          })
        );

        setOwnedAppState(requestUserId, (prev) => {
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
  }, [hasSession, setOwnedAppState, userId]);

  useEffect(() => {
    if (!hydrated || sessionPending) {
      return;
    }

    if (!hasSession) return;

    queueMicrotask(() => {
      void refreshCredits();
      void refreshCreditHistory();
      void refreshVideoTasks();
      void refreshImageTasks();
    });
  }, [
    hasSession,
    hydrated,
    sessionPending,
    refreshCredits,
    refreshCreditHistory,
    refreshVideoTasks,
    refreshImageTasks,
  ]);

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

    const updateUserId = currentUserIdRef.current;
    if (!updateUserId) {
      return;
    }

    const latestTasks = await fetchVideoTasks();
    if (currentUserIdRef.current !== updateUserId) {
      return;
    }

    const tasksToCheck = latestTasks ?? videoTasksRef.current;
    const hasActiveVideoTasks = tasksToCheck.some(isActiveVideoTask);

    if (hasActiveVideoTasks) {
      pendingConfigReloadUserRef.current = updateUserId;
      setPendingConfigReload(true);
      return;
    }

    pendingConfigReloadUserRef.current = null;
    triggerReload();
  }, [fetchVideoTasks, triggerReload]);

  useEffect(() => {
    if (!hydrated || !hasSession || sessionPending) {
      return;
    }

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
  }, [hydrated, hasSession, sessionPending, handleConfigUpdate]);

  useEffect(() => {
    if (!pendingConfigReload || reloadingRef.current) {
      return;
    }

    if (pendingConfigReloadUserRef.current !== userId) {
      pendingConfigReloadUserRef.current = null;
      queueMicrotask(() => {
        setPendingConfigReload(false);
      });
      return;
    }

    const hasActiveVideoTasks = appState.videoTasks.some(isActiveVideoTask);
    if (!hasActiveVideoTasks) {
      pendingConfigReloadUserRef.current = null;
      triggerReload();
    }
  }, [appState.videoTasks, pendingConfigReload, triggerReload, userId]);

  useEffect(() => {
    if (!pendingConfigReload || reloadingRef.current) {
      return;
    }

    if (pendingConfigReloadUserRef.current !== userId) {
      return;
    }

    const timer = setInterval(() => {
      void refreshVideoTasks();
    }, 3000);

    return () => {
      clearInterval(timer);
    };
  }, [pendingConfigReload, refreshVideoTasks, userId]);

  const clearLocalView = useCallback(() => {
    setOwnedAppState(userId, (prev) => ({
      ...prev,
      history: [],
      imageTasks: [],
      videoTasks: [],
    }));
  }, [setOwnedAppState, userId]);

  const visibleState =
    hydrated && hasSession && ownedAppState.ownerUserId === userId
      ? ownedAppState.state
      : EMPTY_APP_STATE;

  // Memoized so consumers of useStudio() only re-render when a value actually
  // changes, not on every provider render.
  const contextValue = useMemo(
    () => ({
      state: visibleState,
      refreshCredits,
      refreshVideoTasks,
      refreshImageTasks,
      refreshCreditHistory,
      clearLocalView,
    }),
    [
      visibleState,
      refreshCredits,
      refreshVideoTasks,
      refreshImageTasks,
      refreshCreditHistory,
      clearLocalView,
    ]
  );

  return (
    <StudioContext.Provider value={contextValue}>
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
