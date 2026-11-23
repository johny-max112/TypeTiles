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

export type PartnerPovState = {
  userId: number;
  displayName: string;
  target: string;
  typedPrefix: string;
  tileX: number;
  tileY: number;
  lives: number;
  score: number;
  wpm: number;
  accuracy: number;
  remainingTime: number;
  completedWords: number;
  status: "playing" | "paused" | "completed" | "disconnected";
};

export type PartnerAssignment = {
  partner?: {
    userId: number;
    displayName: string;
  };
};
