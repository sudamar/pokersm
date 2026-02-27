import { NextRequest } from "next/server";
import { roomStore } from "@/lib/store";
import { roomEventBus, type RoomHonkPayload } from "@/lib/roomEvents";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (!closed) {
          try {
            controller.enqueue(chunk);
          } catch {
            closed = true;
          }
        }
      };

      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        safeEnqueue(encoder.encode(payload));
      };

      // Envia estado inicial imediatamente
      try {
        const raw = await roomStore.get(`room:${id}`) as string;
        send("room-update", JSON.parse(raw));
      } catch {
        send("error", { message: "Sala não encontrada" });
        closed = true;
        controller.close();
        return;
      }

      // Ouve atualizações da sala
      const onUpdate = async () => {
        if (closed) return;
        try {
          const raw = await roomStore.get(`room:${id}`) as string;
          send("room-update", JSON.parse(raw));
        } catch {
          send("error", { message: "Erro ao buscar sala" });
        }
      };

      roomEventBus.on(`room:${id}`, onUpdate);

      // Ouve evento de sala destruída
      const onDestroyed = () => {
        send("room-destroyed", {});
        closed = true;
        try { controller.close(); } catch { /* já fechado */ }
      };
      roomEventBus.once(`room-destroyed:${id}`, onDestroyed);

      // Ouve buzina do criador para usuários que ainda não votaram
      const onHonk = (payload: RoomHonkPayload) => {
        send("room-honk", payload);
      };
      roomEventBus.on(`room-honk:${id}`, onHonk);

      // Heartbeat para evitar timeout de proxies/browsers
      const heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(": heartbeat\n\n"));
      }, 25_000);

      // Cleanup — chamado pelo cancel() abaixo quando o cliente desconecta
      cleanup = () => {
        closed = true;
        roomEventBus.off(`room:${id}`, onUpdate);
        roomEventBus.off(`room-destroyed:${id}`, onDestroyed);
        roomEventBus.off(`room-honk:${id}`, onHonk);
        clearInterval(heartbeat);
      };
    },

    cancel() {
      cleanup?.();
      cleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
