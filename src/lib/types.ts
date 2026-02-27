export type ParticipantStatus = "online" | "votando" | "finalizado";

export interface Participant {
  name: string;
  status: ParticipantStatus;
  joinedAt: string;
  vote?: number | null; // null = ainda não votou
  isViewingRoom?: boolean;
  lastPresenceAt?: string;
}

export interface Room {
  id: string;
  name: string;
  creatorName: string;
  createdAt: string;
  participants: Participant[];
  revealed: boolean;
  revealedAt?: string;
  lastHonkId?: string;
  lastHonkBy?: string;
  lastHonkAt?: string;
  lastHonkTargets?: string[];
}
