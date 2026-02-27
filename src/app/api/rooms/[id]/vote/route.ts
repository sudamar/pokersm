import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";
import { notifyRoomUpdate } from "@/lib/roomEvents";
import type { Room } from "@/lib/types";

const VALID_VOTES = [1, 3, 5, 8, 13];

// POST /api/rooms/[id]/vote — registra o voto de um participante
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, vote } = (await request.json()) as {
    name?: string;
    vote?: number;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  if (vote === undefined || !VALID_VOTES.includes(vote)) {
    return NextResponse.json(
      { error: `Voto inválido. Valores aceitos: ${VALID_VOTES.join(", ")}` },
      { status: 400 }
    );
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

  participant.vote = vote;
  participant.status = "finalizado";

  await roomStore.put(`room:${id}`, JSON.stringify(room));
  notifyRoomUpdate(id);

  return NextResponse.json({ ok: true });
}
