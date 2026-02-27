import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { roomStore } from "@/lib/store";
import { notifyRoomDestroyed } from "@/lib/roomEvents";
import type { Room } from "@/lib/types";

const AUTO_DESTROY_MS = 30 * 60 * 1000; // 30 minutos

// GET /api/rooms — lista as últimas 5 salas abertas
export async function GET() {
  const rooms: Pick<Room, "id" | "name" | "creatorName" | "participants" | "createdAt">[] = [];

  for await (const [, value] of roomStore.iterator()) {
    const raw = value as string;
    const room = JSON.parse(raw) as Room;
    rooms.push({
      id: room.id,
      name: room.name,
      creatorName: room.creatorName,
      participants: room.participants,
      createdAt: room.createdAt,
    });
  }

  // Mais recentes primeiro, limitar a 5
  rooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(rooms.slice(0, 5));
}

// POST /api/rooms — cria uma sala nova
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { creatorName, roomName } = body as {
    creatorName?: string;
    roomName?: string;
  };

  if (!creatorName?.trim() || !roomName?.trim()) {
    return NextResponse.json(
      { error: "Nome e nome da sala são obrigatórios" },
      { status: 400 }
    );
  }

  const roomId = randomUUID();
  const now = new Date().toISOString();

  const room: Room = {
    id: roomId,
    name: roomName.trim(),
    creatorName: creatorName.trim(),
    createdAt: now,
    participants: [
      {
        name: creatorName.trim(),
        status: "online",
        joinedAt: now,
        vote: null,
        isViewingRoom: true,
        lastPresenceAt: now,
      },
    ],
    revealed: false,
  };

  await roomStore.put(`room:${roomId}`, JSON.stringify(room));

  // Auto-destruir sala após 30 minutos
  setTimeout(async () => {
    try {
      await roomStore.del(`room:${roomId}`);
      notifyRoomDestroyed(roomId);
    } catch { /* já foi destruída manualmente */ }
  }, AUTO_DESTROY_MS);

  return NextResponse.json({ roomId, roomName: room.name, creatorName: room.creatorName });
}
