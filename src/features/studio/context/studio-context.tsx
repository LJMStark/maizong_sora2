"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import {
  AppState,
  GenerationResult,
  StudioContextType,
  CreditTransaction,
  VideoTask,
} from "../types";

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>({
    credits: 0,
    history: [],
    creditHistory: [],
    videoTasks: [],
  });

  const refreshCredits = useCallback(async () => {
    try {
      const response = await fetch("/api/credits");
      if (response.ok) {
        const data = await response.json();
        setAppState((prev) => ({ ...prev, credits: data.credits }));
      }
    } catch {
      // Silently fail
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
    } catch {
      // Silently fail
    }
  }, []);

  const refreshVideoTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/video/tasks");
      if (response.ok) {
        const data = await response.json();
        const formattedTasks: VideoTask[] = data.tasks.map(
          (task: {
            id: string;
            status: "pending" | "running" | "succeeded" | "error";
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
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    refreshCredits();
    refreshCreditHistory();
    refreshVideoTasks();
  }, [refreshCredits, refreshCreditHistory, refreshVideoTasks]);

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
