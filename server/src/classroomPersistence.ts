import { databaseTransaction } from "./db.js";

export type ClassroomResultRecord = {
  userId?: number;
  score: number;
  wpm: number;
  accuracy: number;
  completedWords: number;
  lives: number;
  finished: boolean;
};

// Uses the same serialized, dedicated-connection transaction as auth/admin.
// Terminal rows are immutable: retries return their status without rewriting.
export function completeClassroomMatch(matchId: number, ownerId: number, results: ClassroomResultRecord[]): Promise<string> {
  return databaseTransaction(async db => {
    const match = await db.get("SELECT status, owner_user_id FROM matches WHERE id=?", matchId);
    if (!match || match.owner_user_id !== ownerId) return "unavailable";
    if (match.status !== "active") return match.status;
    for (const [index, result] of results.entries()) {
      if (result.userId === undefined) continue;
      await db.run(`UPDATE match_participants
        SET score=?, wpm=?, accuracy=?, completed_words=?, end_reason=?, remaining_lives=?, position=?, error_rate=?
        WHERE match_id=? AND user_id=?`, result.score, result.wpm, result.accuracy, result.completedWords,
      result.finished ? (result.lives === 0 ? "health" : "time") : null, result.lives, index + 1,
      result.completedWords === 0 && result.accuracy === 0 ? 0 : 100 - result.accuracy, matchId, result.userId);
    }
    await db.run("UPDATE matches SET status='completed', ended_at=CURRENT_TIMESTAMP WHERE id=? AND status='active' AND owner_user_id=?", matchId, ownerId);
    return "completed";
  });
}

export function cancelClassroomMatch(matchId: number, ownerId: number): Promise<string> {
  return databaseTransaction(async db => {
    const match = await db.get("SELECT status, owner_user_id FROM matches WHERE id=?", matchId);
    if (!match || match.owner_user_id !== ownerId) return "unavailable";
    if (match.status !== "active") return match.status;
    await db.run("UPDATE matches SET status='cancelled', ended_at=CURRENT_TIMESTAMP WHERE id=? AND status='active' AND owner_user_id=?", matchId, ownerId);
    return "cancelled";
  });
}
