import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { roomStore } from "@/lib/store";
import type { Room } from "@/lib/types";

interface AdminRoomSummary {
  id: string;
  name: string;
  creatorName: string;
  createdAt: string;
  revealed: boolean;
  participantsOnline: number;
  participants: Array<{
    name: string;
    vote: number | null;
    isScreenOpen: boolean;
  }>;
  votesCount: number;
  pendingVotes: number;
  winnerVote: number | null;
  voteDistribution: Record<number, number>;
}

const PRESENCE_ACTIVE_WINDOW_MS = 25_000;

// GET /api/admin/rooms — lista todas as salas para administração
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const rooms: AdminRoomSummary[] = [];

  for await (const [, value] of roomStore.iterator()) {
    const raw = value as string;
    const room = JSON.parse(raw) as Room;

    const voteDistribution: Record<number, number> = {};
    const votes = room.participants
      .map((participant) => participant.vote)
      .filter((vote): vote is number => vote != null);

    for (const vote of votes) {
      voteDistribution[vote] = (voteDistribution[vote] ?? 0) + 1;
    }

    const winnerVote = (() => {
      const entries = Object.entries(voteDistribution);
      if (entries.length === 0) return null;

      let bestVote = Number(entries[0][0]);
      let bestCount = entries[0][1];

      for (const [voteRaw, count] of entries) {
        const vote = Number(voteRaw);
        if (count > bestCount || (count === bestCount && vote > bestVote)) {
          bestVote = vote;
          bestCount = count;
        }
      }
      return bestVote;
    })();

    const nowMs = Date.now();
    const participants = room.participants
      .map((participant) => ({
        name: participant.name,
        vote: participant.vote ?? null,
        isScreenOpen:
          participant.isViewingRoom === true &&
          Boolean(participant.lastPresenceAt) &&
          nowMs - new Date(participant.lastPresenceAt as string).getTime() <=
            PRESENCE_ACTIVE_WINDOW_MS,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const participantsOnline = participants.filter((participant) => participant.isScreenOpen).length;
    const votesCount = votes.length;
    const pendingVotes = Math.max(room.participants.length - votesCount, 0);

    rooms.push({
      id: room.id,
      name: room.name,
      creatorName: room.creatorName,
      createdAt: room.createdAt,
      revealed: room.revealed,
      participantsOnline,
      participants,
      votesCount,
      pendingVotes,
      winnerVote,
      voteDistribution,
    });
  }

  rooms.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(rooms);
}
