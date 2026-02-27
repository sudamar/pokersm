import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";
import { notifyRoomHonk } from "@/lib/roomEvents";
import type { Room } from "@/lib/types";

// POST /api/rooms/[id]/honk — avisa participantes que ainda não votaram (apenas criador)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = (await request.json()) as { name?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  let room: Room;
  try {
    const raw = (await roomStore.get(`room:${id}`)) as string;
    room = JSON.parse(raw) as Room;
  } catch {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  const actorName = name.trim();
  if (room.creatorName !== actorName) {
    return NextResponse.json({ error: "Apenas o criador pode buzinar" }, { status: 403 });
  }

  const targets = room.participants
    .filter((participant) => participant.name !== actorName && participant.status !== "finalizado")
    .map((participant) => participant.name);

  if (targets.length > 0) {
    notifyRoomHonk(id, {
      triggeredBy: actorName,
      targets,
      sentAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, targets });
}
