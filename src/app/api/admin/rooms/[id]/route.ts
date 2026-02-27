import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { roomStore } from "@/lib/store";
import { notifyRoomDestroyed } from "@/lib/roomEvents";

// DELETE /api/admin/rooms/[id] — destrói sala via painel admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await roomStore.get(`room:${id}`);
  } catch {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  await roomStore.del(`room:${id}`);
  notifyRoomDestroyed(id);

  return NextResponse.json({ ok: true });
}
