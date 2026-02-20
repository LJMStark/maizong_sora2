import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoLimitService } from "@/features/studio/services/video-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;

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
  let pollTimer: ReturnType<typeof setInterval> | null = null;
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

        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
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

      pollTimer = setInterval(async () => {
        if (closed) return;

        try {
          const latestVersion = await videoLimitService.getConfigVersion();
          if (latestVersion !== currentVersion) {
            currentVersion = latestVersion;
            sendEvent("config-updated", { version: latestVersion });
          }
        } catch {
          sendEvent("stream-error", { message: "CONFIG_VERSION_CHECK_FAILED" });
        }
      }, POLL_INTERVAL_MS);

      heartbeatTimer = setInterval(() => {
        sendEvent("heartbeat", { ts: Date.now() });
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      closed = true;

      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
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
