export type ClassroomStanding = {
  userId: number;
  username: string;
  displayName: string;
  score: number;
  wpm: number;
  accuracy: number;
  lives: number;
  completedWords: number;
  finished: boolean;
  rank?: number;
  connected?: boolean;
};

export type ClassroomRankUpdate = ClassroomStanding & {
  totalStudents: number;
  maxStudents: number;
};

export type PartnerPovTile = {
  id: string;
  text: string;
  typedPrefix: string;
  x: number;
  y: number;
  speed: number;
  state: "active" | "cleared" | "missed";
};

export type PartnerPovState = {
  userId: number;
  displayName: string;
  sentAt: number;
  relayedAt: number;
  target: string;
  typedPrefix: string;
  tileX: number;
  tileY: number;
  tiles: PartnerPovTile[];
  lives: number;
  score: number;
  wpm: number;
  accuracy: number;
  remainingTime: number;
  completedWords: number;
  status: "playing" | "paused" | "completed" | "disconnected";
};

export type PartnerPovSnapshot = {
  state: PartnerPovState;
  receivedAt: number;
  messageBytes: number;
};

export type PartnerAssignment = {
  partner?: {
    userId: number;
    displayName: string;
  };
};
