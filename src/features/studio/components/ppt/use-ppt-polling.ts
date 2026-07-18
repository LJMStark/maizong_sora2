"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PPT_TERMINAL_STATUSES, PptTaskSnapshot } from "./types";

const POLL_INTERVAL_MS = 3000;

/**
 * PPT 任务轮询：每 3s 拉取快照（服务端顺带推进流水线），终态自动停止。
 * resumeKey 变化会重启轮询（用于终态后单页重生成等重新激活任务的场景）。
 */
export function usePptPolling(taskId: string | null, resumeKey = 0) {
  const [snapshot, setSnapshot] = useState<PptTaskSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<PptTaskSnapshot | null>(null);

  const fetchStatus = useCallback(async (): Promise<PptTaskSnapshot | null> => {
    if (!taskId) return null;

    try {
      const response = await fetch(`/api/ppt/status/${taskId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "获取任务状态失败");
      }
      const data: PptTaskSnapshot = await response.json();
      snapshotRef.current = data;
      setSnapshot(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [taskId]);

  useEffect(() => {
    if (resumeKey === 0) {
      snapshotRef.current = null;
      setSnapshot(null);
    }
    setError(null);

    if (!taskId) {
      snapshotRef.current = null;
      setSnapshot(null);
      return;
    }

    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const data = await fetchStatus();
      if (stopped) return;
      if (data && PPT_TERMINAL_STATUSES.includes(data.status)) {
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [taskId, fetchStatus, resumeKey]);

  return { snapshot, error, refetch: fetchStatus };
}
