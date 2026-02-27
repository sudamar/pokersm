import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";
import { notifyRoomDestroyed } from "@/lib/roomEvents";
import type { Room } from "@/lib/types";

// DELETE /api/rooms/[id]/destroy — destroi a sala (apenas o criador)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name } = body as { name?: string };

  let room: Room;
  try {
    const raw = (await roomStore.get(`room:${id}`)) as string;
    room = JSON.parse(raw) as Room;
  } catch {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  if (!name || room.creatorName !== name.trim()) {
    return NextResponse.json({ error: "Apenas o criador pode destruir a sala" }, { status: 403 });
  }

  await roomStore.del(`room:${id}`);
  notifyRoomDestroyed(id);

  return NextResponse.json({ ok: true });
}
