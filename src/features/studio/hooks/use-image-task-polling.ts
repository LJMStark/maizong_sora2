import { useState, useEffect, useCallback, useRef } from "react";

export interface ImageTaskStatus {
  taskId: string;
  status: "pending" | "running" | "succeeded" | "error";
  imageUrl?: string;
  errorMessage?: string;
}

interface UseImageTaskPollingOptions {
  taskId: string | null;
  interval?: number;
  onComplete?: (task: ImageTaskStatus) => void;
  onError?: (task: ImageTaskStatus) => void;
}

export function useImageTaskPolling({
  taskId,
  interval = 3000,
  onComplete,
  onError,
}: UseImageTaskPollingOptions) {
  const [task, setTask] = useState<ImageTaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`/api/image/status/${taskId}`);

      if (!response.ok) {
        throw new Error("获取任务状态失败");
      }

      const data: ImageTaskStatus = await response.json();
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
  }, [taskId, onComplete, onError]);

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
