import { EventEmitter } from "events";

const g = globalThis as unknown as {
  __roomEventBus?: EventEmitter;
};

if (!g.__roomEventBus) {
  g.__roomEventBus = new EventEmitter();
  g.__roomEventBus.setMaxListeners(100);
}

export const roomEventBus = g.__roomEventBus;

export function notifyRoomUpdate(roomId: string) {
  roomEventBus.emit(`room:${roomId}`);
}

export function notifyRoomDestroyed(roomId: string) {
  roomEventBus.emit(`room-destroyed:${roomId}`);
}

export interface RoomHonkPayload {
  honkId: string;
  triggeredBy: string;
  targets: string[];
  sentAt: string;
}

export function notifyRoomHonk(roomId: string, payload: RoomHonkPayload) {
  roomEventBus.emit(`room-honk:${roomId}`, payload);
}
