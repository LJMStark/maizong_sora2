import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoLimitService } from "@/features/studio/services/video-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;

type ConfigVersionTick = { version: string } | { error: true };
type ConfigVersionListener = (tick: ConfigVersionTick) => void;

// 所有 SSE 连接共享一个轮询定时器，避免每个连接各自每 3s 打一次数据库。
// 无连接订阅时定时器自动停止，方便无服务器实例空闲下线。
let sharedPollTimer: ReturnType<typeof setInterval> | null = null;
const configVersionListeners = new Set<ConfigVersionListener>();

function startSharedPollIfNeeded(): void {
  if (sharedPollTimer) return;

  sharedPollTimer = setInterval(async () => {
    try {
      const latestVersion = await videoLimitService.getConfigVersion();
      for (const listener of configVersionListeners) {
        listener({ version: latestVersion });
      }
    } catch {
      for (const listener of configVersionListeners) {
        listener({ error: true });
      }
    }
  }, POLL_INTERVAL_MS);
}

function stopSharedPollIfIdle(): void {
  if (configVersionListeners.size > 0) return;
  if (sharedPollTimer) {
    clearInterval(sharedPollTimer);
    sharedPollTimer = null;
  }
}

function subscribeToConfigVersion(listener: ConfigVersionListener): () => void {
  configVersionListeners.add(listener);
  startSharedPollIfNeeded();

  return () => {
    configVersionListeners.delete(listener);
    stopSharedPollIfIdle();
  };
}

function toSseEvent(
  event: string,
  payload: Record<string, string | number | boolean>
): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (
        event: string,
        payload: Record<string, string | number | boolean>
      ) => {
        if (closed) return;
        controller.enqueue(encoder.encode(toSseEvent(event, payload)));
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;

        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

        request.signal.removeEventListener("abort", closeStream);
        controller.close();
      };

      request.signal.addEventListener("abort", closeStream);

      let currentVersion = "0";
      try {
        currentVersion = await videoLimitService.getConfigVersion();
      } catch {
        currentVersion = "0";
      }

      sendEvent("connected", { version: currentVersion });

      unsubscribe = subscribeToConfigVersion((tick) => {
        if (closed) return;

        if ("error" in tick) {
          sendEvent("stream-error", { message: "CONFIG_VERSION_CHECK_FAILED" });
          return;
        }

        if (tick.version !== currentVersion) {
          currentVersion = tick.version;
          sendEvent("config-updated", { version: tick.version });
        }
      });

      heartbeatTimer = setInterval(() => {
        sendEvent("heartbeat", { ts: Date.now() });
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      closed = true;

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
