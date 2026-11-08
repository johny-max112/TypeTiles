import assert from "node:assert/strict";
import { generateToken } from "../src/auth.js";
import type { ApplicationDatabase } from "../src/databaseTypes.js";

// Invoked after a real WebSocket classroom has finalized, on both providers.
export async function resultIntegrityChecks(db: ApplicationDatabase, base: string, classroomId: number) {
  const classroom = await db.get("SELECT * FROM matches WHERE id=?", classroomId);
  assert.equal(classroom.status, "completed");
  const teacher = await db.get("SELECT * FROM users WHERE id=?", classroom.owner_user_id);
  const student = await db.get("SELECT u.* FROM users u JOIN match_participants mp ON mp.user_id=u.id WHERE mp.match_id=? AND u.id<>? ORDER BY u.id LIMIT 1", classroomId, teacher.id);
  assert(teacher && student);
  const token = (user: any) => generateToken({ userId: user.id, username: user.username, role: user.role, sessionVersion: user.session_version });
  const request = async (path: string, user: any, body?: object) => {
    const response = await fetch(base + path, { method: body ? "POST" : "GET",
      headers: { "content-type": "application/json", authorization: `Bearer ${token(user)}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const metrics = { score: 98765, wpm: 123.5, accuracy: 99, errorRate: 1, completedWords: 99, endReason: "time", remainingLives: 3 };
  const snapshot = async (id: number) => ({
    match: await db.get("SELECT * FROM matches WHERE id=?", id),
    participants: await db.all("SELECT * FROM match_participants WHERE match_id=? ORDER BY id", id),
    results: await db.all("SELECT * FROM match_results WHERE match_id=? ORDER BY id", id),
    stats: await db.all("SELECT * FROM user_stats ORDER BY user_id"),
  });
  const persisted = await snapshot(classroomId);
  assert(persisted.participants.some((row: any) => row.position !== null));
  const reportBefore = await request(`/teacher/matches/${classroomId}`, teacher);
  assert.equal(reportBefore.status, 200);
  for (const user of [student, teacher]) {
    for (let retry = 0; retry < 3; retry++) {
      const rejected = await request(`/matches/${classroomId}/submit`, user, {
        ...metrics, mode: "Solo Practice", owner_user_id: null, userId: student.id, matchId: -1,
      });
      assert.equal(rejected.status, 403);
      assert.deepEqual(await snapshot(classroomId), persisted);
    }
  }
  assert.deepEqual((await request(`/teacher/matches/${classroomId}`, teacher)).body, reportBefore.body);

  // Active, legacy ownerless, mislabeled owned and unknown-mode records fail closed.
  for (const [mode, owner] of [["LAN Match", teacher.id], ["LAN Match", null], ["Solo Practice", teacher.id], ["Solo", null], ["Solo Practice multiplayer", null]] as const) {
    const id = (await db.run("INSERT INTO matches(mode,difficulty,word_set,owner_user_id) VALUES(?,'Normal','General',?)", mode, owner)).lastID!;
    for (const user of [student, teacher]) await db.run("INSERT INTO match_participants(match_id,user_id) VALUES(?,?)", id, user.id);
    const before = await snapshot(id);
    for (const user of [student, teacher]) {
      assert.equal((await request(`/matches/${id}/submit`, user, { ...metrics, mode: "Solo Practice" })).status, 403);
      assert.deepEqual(await snapshot(id), before);
    }
  }

  const created = await request("/matches", student, { mode: "Solo Practice", difficulty: "Normal", wordSet: "General", roundTime: 30 });
  assert.equal(created.status, 201);
  const soloId = created.body.matchId;
  const beforeSolo = await snapshot(soloId);
  assert.equal((await request(`/matches/${soloId}/submit`, teacher, metrics)).status, 404);
  assert.deepEqual(await snapshot(soloId), beforeSolo);
  assert.equal((await request(`/matches/${classroomId}/submit`, { ...student, id: -1 }, metrics)).status, 401);
  assert.equal((await request("/matches/999999999/submit", student, metrics)).status, 404);
  // Preserve legacy payload compatibility and the existing repeat-acceptance policy.
  const statsBefore = await db.get("SELECT * FROM user_stats WHERE user_id=?", student.id);
  for (let retry = 0; retry < 2; retry++) {
    assert.equal((await request(`/matches/${soloId}/submit`, student, { score: 10, wpm: 45.5, accuracy: 98 })).status, 200);
  }
  const solo = await db.get("SELECT * FROM match_participants WHERE match_id=? AND user_id=?", soloId, student.id);
  assert.equal(solo.score, 10); assert.equal(solo.wpm, 45.5); assert.equal(solo.accuracy, 98);
  const statsAfter = await db.get("SELECT * FROM user_stats WHERE user_id=?", student.id);
  assert.equal(statsAfter.games_played, statsBefore.games_played + 2);
  assert.equal(statsAfter.total_score, statsBefore.total_score + 20);
}
