import { notFound } from "next/navigation";
import { roomStore } from "@/lib/store";
import RoomClient, { Room } from "./RoomClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params;

  let room: Room;
  try {
    const raw = (await roomStore.get(`room:${id}`)) as string;
    room = JSON.parse(raw) as Room;
  } catch {
    notFound();
  }

  return <RoomClient initialRoom={room} roomId={id} />;
}
