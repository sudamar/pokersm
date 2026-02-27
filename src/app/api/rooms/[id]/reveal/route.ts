import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";
import { notifyRoomUpdate } from "@/lib/roomEvents";
import type { Room } from "@/lib/types";

// POST /api/rooms/[id]/reveal — revela todos os votos
// Idempotente: se já revelado, retorna ok sem fazer nada
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let room: Room;
  try {
    const raw = (await roomStore.get(`room:${id}`)) as string;
    room = JSON.parse(raw) as Room;
  } catch {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  // Idempotente — se já revelado, não faz nada
  if (room.revealed) {
    return NextResponse.json({ ok: true });
  }

  room.revealed = true;
  room.revealedAt = new Date().toISOString();

  await roomStore.put(`room:${id}`, JSON.stringify(room));
  notifyRoomUpdate(id);

  return NextResponse.json({ ok: true });
}
