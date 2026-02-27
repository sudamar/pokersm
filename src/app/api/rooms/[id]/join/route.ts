import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";
import { notifyRoomUpdate } from "@/lib/roomEvents";
import type { Room } from "@/lib/types";

// POST /api/rooms/[id]/join — entra na sala com um nome
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

  // Se o participante já existe com esse nome, retorna ele sem duplicar
  const existing = room.participants.find((p) => p.name === name.trim());
  if (existing) {
    return NextResponse.json({ roomId: id, participantName: existing.name });
  }

  room.participants.push({
    name: name.trim(),
    status: "online",
    joinedAt: new Date().toISOString(),
    vote: null,
  });

  await roomStore.put(`room:${id}`, JSON.stringify(room));
  notifyRoomUpdate(id);

  return NextResponse.json({ roomId: id, participantName: name.trim() });
}
