import { useState, useEffect, useCallback, useRef } from "react";

export type TaskType = "video" | "image";

export interface BaseTaskStatus {
  status: "pending" | "running" | "succeeded" | "error";
  errorMessage?: string;
}

export interface VideoTaskStatus extends BaseTaskStatus {
  id: string;
  progress: number;
  videoUrl?: string;
  prompt: string;
  createdAt: string;
  completedAt?: string;
}

export interface ImageTaskStatus extends BaseTaskStatus {
  taskId: string;
  imageUrl?: string;
}

interface UseTaskPollingOptions<T extends BaseTaskStatus> {
  taskId: string | null;
  taskType: TaskType;
  interval?: number;
  onComplete?: (task: T) => void;
  onError?: (task: T) => void;
}

function getApiEndpoint(taskType: TaskType, taskId: string): string {
  return `/api/${taskType}/status/${taskId}`;
}

export function useTaskPolling<T extends BaseTaskStatus>({
  taskId,
  taskType,
  interval = 3000,
  onComplete,
  onError,
}: UseTaskPollingOptions<T>) {
  const [task, setTask] = useState<T | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await fetch(getApiEndpoint(taskType, taskId));

      if (!response.ok) {
        throw new Error("Failed to fetch task status");
      }

      const data: T = await response.json();
      setTask(data);
      setError(null);

      if (data.status === "succeeded") {
        setIsPolling(false);
        onComplete?.(data);
      } else if (data.status === "error") {
        setIsPolling(false);
        onError?.(data);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    }
  }, [taskId, taskType, onComplete, onError]);

  const startPolling = useCallback(() => {
    if (!taskId) return;
    setIsPolling(true);
    fetchStatus();
  }, [taskId, fetchStatus]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (isPolling && taskId) {
      intervalRef.current = setInterval(fetchStatus, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPolling, taskId, interval, fetchStatus]);

  useEffect(() => {
    if (taskId) {
      startPolling();
    } else {
      setTask(null);
      setIsPolling(false);
    }

    return () => {
      stopPolling();
    };
  }, [taskId, startPolling, stopPolling]);

  return {
    task,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refetch: fetchStatus,
  };
}

// Convenience hooks for backward compatibility
export function useVideoTaskPolling(
  options: Omit<UseTaskPollingOptions<VideoTaskStatus>, "taskType">
) {
  return useTaskPolling<VideoTaskStatus>({ ...options, taskType: "video" });
}

export function useImageTaskPolling(
  options: Omit<UseTaskPollingOptions<ImageTaskStatus>, "taskType">
) {
  return useTaskPolling<ImageTaskStatus>({ ...options, taskType: "image" });
}
