import { getAppData } from "@/lib/appData";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events: pushes the full AppData snapshot on connect and again
 * whenever the store changes. One-way server -> client, which is all the
 * dashboard needs to refresh live.
 */
export function GET() {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const payload = JSON.stringify(getAppData());
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          /* controller may be closed */
        }
      };
      send();
      unsubscribe = store.subscribe(send);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* ignore */
        }
      }, 25000);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
