import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";
import type { Room } from "@/lib/types";

// POST /api/rooms/[id]/presence — heartbeat de presença da tela da sala
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, isViewingRoom } = (await request.json()) as {
    name?: string;
    isViewingRoom?: boolean;
  };

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

  const participant = room.participants.find((p) => p.name === name.trim());
  if (!participant) {
    return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
  }

  participant.isViewingRoom = Boolean(isViewingRoom);
  participant.lastPresenceAt = new Date().toISOString();

  await roomStore.put(`room:${id}`, JSON.stringify(room));
  return NextResponse.json({ ok: true });
}
