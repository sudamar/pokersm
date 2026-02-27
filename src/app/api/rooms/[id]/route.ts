import { NextRequest, NextResponse } from "next/server";
import { roomStore } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const raw = (await roomStore.get(`room:${id}`)) as string;
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }
}
