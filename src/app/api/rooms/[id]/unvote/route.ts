import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";
import { notifyRoomUpdate } from "@/lib/roomEvents";
import type { Room } from "@/lib/types";

// POST /api/rooms/[id]/unvote — cancela o voto do participante
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name } = body as { name?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }

  let room: Room;
  try {
    const raw = (await roomStore.get(`room:${id}`)) as string;
    room = JSON.parse(raw) as Room;
  } catch {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  if (room.revealed) {
    return NextResponse.json({ error: "Votos já revelados" }, { status: 400 });
  }

  const participant = room.participants.find((p) => p.name === name.trim());
  if (!participant) {
    return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
  }

  participant.vote = null;
  participant.status = "online";

  await roomStore.put(`room:${id}`, JSON.stringify(room));
  notifyRoomUpdate(id);

  return NextResponse.json({ ok: true });
}
