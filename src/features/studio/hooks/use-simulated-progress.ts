import { useState, useEffect, useRef } from "react";

interface UseSimulatedProgressOptions {
  /**
   * 是否正在运行任务
   */
  isRunning: boolean;
  /**
   * 实际任务状态
   */
  actualStatus?: "pending" | "running" | "succeeded" | "error" | "retrying";
  /**
   * 预计完成时间（毫秒）
   */
  estimatedDuration: number;
  /**
   * 最大进度（如果任务未完成，进度不会超过这个值）
   */
  maxProgress?: number;
}

/**
 * 模拟进度条 Hook
 *
 * 用于在任务执行期间显示平滑的进度动画，提升用户体验
 *
 * @example
 * // 图片生成（30秒，最多到95%）
 * const progress = useSimulatedProgress({
 *   isRunning: loading,
 *   actualStatus: task?.status,
 *   estimatedDuration: 30000,
 *   maxProgress: 95
 * });
 *
 * @example
 * // 视频生成（5分钟，最多到92%）
 * const progress = useSimulatedProgress({
 *   isRunning: loading,
 *   actualStatus: task?.status,
 *   estimatedDuration: 300000,
 *   maxProgress: 92
 * });
 */
export function useSimulatedProgress({
  isRunning,
  actualStatus,
  estimatedDuration,
  maxProgress = 95,
}: UseSimulatedProgressOptions): number {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      // 任务未运行，重置进度
      setProgress(0);
      startTimeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // 任务开始，记录开始时间
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    // 如果任务已完成，直接设置为100%
    if (actualStatus === "succeeded") {
      setProgress(100);
      return;
    }

    // 如果任务出错，保持当前进度
    if (actualStatus === "error") {
      return;
    }

    // 模拟进度动画
    const animate = () => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const ratio = elapsed / estimatedDuration;

      // 使用缓动函数计算进度（快速启动，然后逐渐变慢）
      // 使用 easeOutCubic: 1 - (1 - x)^3
      const easedRatio = 1 - Math.pow(1 - ratio, 3);

      // 计算当前进度，但不超过 maxProgress
      let currentProgress = Math.min(easedRatio * 100, maxProgress);

      // 如果超过预计时间，进度卡在 maxProgress
      if (elapsed > estimatedDuration) {
        currentProgress = maxProgress;
      }

      setProgress(Math.floor(currentProgress));

      // 如果还没到最大进度，继续动画
      if (currentProgress < maxProgress) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRunning, actualStatus, estimatedDuration, maxProgress]);

  return progress;
}
