import { getCurrentUser } from "@/lib/auth";
import type { CommunicationRealtimeEvent } from "@/lib/communication-realtime";
import { logServerError } from "@/lib/runtime-guards";
import { subscribeToCommunicationRealtimeEvents } from "@/server/communication-realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const encoder = new TextEncoder();

function encodeSseEvent(event: CommunicationRealtimeEvent) {
  return encoder.encode(`event: communication\ndata: ${JSON.stringify(event)}\n\n`);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Authentication required.", { status: 401 });
  }

  let cleanup: (() => Promise<void>) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encodeSseEvent({
          id: crypto.randomUUID(),
          type: "system:connected",
          createdAt: new Date().toISOString(),
          recipients: [user.id],
        }),
      );

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      try {
        cleanup = await subscribeToCommunicationRealtimeEvents(user.id, (event) => {
          controller.enqueue(encodeSseEvent(event));
        });
      } catch (error) {
        logServerError("api/realtime/communication:subscribe", error, {
          userId: user.id,
        });
        controller.error(error);
      }

      request.signal.addEventListener("abort", async () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }

        if (cleanup) {
          await cleanup();
          cleanup = null;
        }

        controller.close();
      });
    },
    async cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      if (cleanup) {
        await cleanup();
        cleanup = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
