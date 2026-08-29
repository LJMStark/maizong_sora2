import { pgClient } from "@/db";
import {
  advanceActivePptTasks,
  reconcileMissingRefunds,
  recoverStuckVideoTasks,
} from "@/features/studio/services/task-reconcile-service";
import { refreshDailySubscriptionQuota } from "@/features/studio/services/subscription-quota-service";

/**
 * 进程内调度器。
 *
 * 本项目部署在 Zeabur（长驻 Node 容器），不是 Vercel —— vercel.json 里的
 * crons 不会被任何平台读取。所以定时任务必须由应用自己驱动。
 *
 * 多副本安全：每轮任务都在 Postgres session 级 advisory lock 保护下执行，
 * 抢不到锁的副本直接跳过。退款补偿等非幂等操作因此不会被并发执行两次。
 */

// advisory lock 的键，取一个本项目专用的常量，避免与业务锁冲突
const SCHEDULER_LOCK_KEY = 918_273_641;

// PPT 流水线每轮只推进一步，需要较密的节奏才能让整卷顺畅生成
const PPT_ADVANCE_INTERVAL_MS = 15_000;
// 卡死任务恢复：向 provider 核对在途任务
const VIDEO_RECOVERY_INTERVAL_MS = 60_000;
// 漏退款补偿：只处理静默超过 10 分钟的记录，不需要跑太勤
const REFUND_RECONCILE_INTERVAL_MS = 5 * 60_000;
// 订阅每日额度刷新与过期处理（额度本身在钱包访问时也会惰性刷新，
// 这里是兜底，保证长期不活跃的订阅也能被正确置为过期）
const SUBSCRIPTION_REFRESH_INTERVAL_MS = 60 * 60_000;

let started = false;

/**
 * 在独占连接上尝试取得 advisory lock 并执行任务。
 * 抢不到锁说明另一个副本正在跑这一轮，直接跳过。
 */
async function withSchedulerLock(
  label: string,
  run: () => Promise<void>
): Promise<void> {
  let reserved: Awaited<ReturnType<typeof pgClient.reserve>> | null = null;

  try {
    reserved = await pgClient.reserve();
    const rows = await reserved<{ locked: boolean }[]>`
      select pg_try_advisory_lock(${SCHEDULER_LOCK_KEY}) as locked
    `;

    if (!rows[0]?.locked) return;

    try {
      await run();
    } finally {
      await reserved`select pg_advisory_unlock(${SCHEDULER_LOCK_KEY})`;
    }
  } catch (error) {
    console.error(`[Scheduler] ${label} 执行失败:`, error);
  } finally {
    reserved?.release();
  }
}

/** 注册一个不会重叠执行的定时任务（上一轮没跑完就跳过这一轮） */
function scheduleTask(
  label: string,
  intervalMs: number,
  run: () => Promise<void>
): void {
  let running = false;

  const timer = setInterval(() => {
    if (running) return;
    running = true;
    void withSchedulerLock(label, run).finally(() => {
      running = false;
    });
  }, intervalMs);

  // 不要因为这个定时器让进程无法退出
  timer.unref?.();
}

export function startScheduler(): void {
  if (started) return;
  started = true;

  scheduleTask("ppt-advance", PPT_ADVANCE_INTERVAL_MS, async () => {
    await advanceActivePptTasks();
  });

  scheduleTask("video-recovery", VIDEO_RECOVERY_INTERVAL_MS, async () => {
    await recoverStuckVideoTasks();
  });

  scheduleTask("refund-reconcile", REFUND_RECONCILE_INTERVAL_MS, async () => {
    await reconcileMissingRefunds();
  });

  scheduleTask(
    "subscription-refresh",
    SUBSCRIPTION_REFRESH_INTERVAL_MS,
    async () => {
      await refreshDailySubscriptionQuota();
    }
  );

  console.log("[Scheduler] 已启动进程内调度器");
}
