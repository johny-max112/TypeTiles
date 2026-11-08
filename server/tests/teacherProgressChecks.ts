import assert from "node:assert/strict";
import { generateToken } from "../src/auth.js";
import type { ApplicationDatabase } from "../src/databaseTypes.js";

export async function teacherProgressChecks(db: ApplicationDatabase, base: string) {
  const users: { id: number; token: string }[] = [];
  // Last account represents a former student who is now a teacher.
  for (const [index, role] of ["teacher", "teacher", "student", "teacher", "student", "teacher", "admin"].entries()) {
    const id = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
      `progress-${index}`, `progress-${index}@example.test`, "test-only", `Progress ${index}`, role)).lastID!;
    await db.run("INSERT INTO user_stats(user_id,best_wpm,avg_accuracy) VALUES(?,9999,99)", id);
    users.push({ id, token: generateToken({ userId: id, username: `progress-${index}`, role }) });
  }
  const session = async (owner: number | null, status: string, date: string, mode = "LAN Match") =>
    (await db.run("INSERT INTO matches(mode,difficulty,word_set,status,created_at,owner_user_id) VALUES(?,'Normal','General',?,?,?)", mode, status, date, owner)).lastID!;
  const participate = async (matchId: number, index: number, wpm: number | null, accuracy: number | null, endReason: string | null = "time", position: number | null = 1) =>
    db.run("INSERT INTO match_participants(match_id,user_id,score,wpm,accuracy,end_reason,position) VALUES(?,?,100,?,?,?,?)", matchId, users[index].id, wpm, accuracy, endReason, position);
  const first = await session(users[0].id, "completed", "2026-01-01T00:00:00.000Z");
  await participate(first, 2, 999, 1); // Legacy duplicate must not inflate samples.
  await participate(first, 2, 40, 80, "time", 2);
  await participate(first, 0, 900, 99); // A teacher's own row is never a student.
  await participate(first, 3, null, null);
  const second = await session(users[0].id, "completed", "2026-02-01T00:00:00.000Z");
  await participate(second, 2, 60, 100);
  const zero = await session(users[0].id, "completed", "2026-03-01T00:00:00.000Z");
  await participate(zero, 2, 0, 0, "health", 3);
  await db.run("UPDATE match_participants SET score=0 WHERE match_id=?", zero);
  const other = await session(users[1].id, "completed", "2026-04-01T00:00:00.000Z");
  await participate(other, 2, 90, 90);
  await participate(other, 4, 30, 90);
  for (const status of ["active", "cancelled", "interrupted"]) {
    await participate(await session(users[0].id, status, "2026-05-01T00:00:00.000Z"), 2, 555, 55);
  }
  await participate(await session(users[0].id, "completed", "2026-05-01T00:00:00.000Z"), 2, 888, 88, null);
  await participate(await session(null, "completed", "2026-05-01T00:00:00.000Z"), 2, 777, 77);
  await participate(await session(null, "completed", "2026-05-01T00:00:00.000Z", "Solo Practice"), 2, 666, 66);
  const get = async (path: string, index?: number) => {
    const response = await fetch(base + path, { headers: index === undefined ? {} : { authorization: `Bearer ${users[index].token}` } });
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  };
  const historyPath = (index: number) => `/teacher/students/${users[index].id}/history`;
  assert.equal((await get("/teacher/students")).status, 401);
  for (const index of [2, 4, 6]) {
    assert.equal((await get("/teacher/students", index)).status, 403);
    assert.equal((await get(historyPath(2), index)).status, 403);
  }
  const a = await get(`/teacher/students?teacherId=${users[1].id}`, 0);
  assert.equal(a.status, 200); assert.equal(a.cache, "no-store");
  assert.deepEqual(a.body.students.map((student: any) => student.id).sort(), [users[2].id, users[3].id].sort());
  const shared = a.body.students.find((student: any) => student.id === users[2].id);
  assert.equal(shared.session_count, 3);
  assert(Math.abs(shared.average_wpm - 100 / 3) < 0.000001);
  assert.equal(shared.average_accuracy, 60); assert.equal(shared.best_wpm, 60);
  assert.equal(new Date(shared.latest_session_date).toISOString(), "2026-03-01T00:00:00.000Z");
  const missing = a.body.students.find((student: any) => student.id === users[3].id);
  assert.equal(missing.session_count, 1); assert.equal(missing.average_wpm, null);
  assert.equal(missing.average_accuracy, null); assert.equal(missing.best_wpm, null);
  const b = await get(`/teacher/students?teacherId=${users[0].id}`, 1);
  assert.equal(b.body.students.length, 2);
  assert.equal(b.body.students.find((student: any) => student.id === users[2].id).average_wpm, 90);
  const aHistory = await get(historyPath(2), 0);
  assert.equal(aHistory.status, 200);
  assert.equal(aHistory.body.student.id, users[2].id);
  assert.deepEqual(aHistory.body.history.map((row: any) => row.session_id), [zero, second, first]);
  assert.equal(aHistory.body.history[0].wpm, 0); assert.equal(aHistory.body.history[0].score, 0);
  assert.equal(aHistory.body.history[0].position, 3);
  assert(aHistory.body.history.every((row: any) => row.completion_status === "Finished"));
  const bHistory = await get(historyPath(2), 1);
  assert.deepEqual(bHistory.body.history.map((row: any) => row.session_id), [other]);
  for (const id of [users[4].id, 999999999, "invalid", 0]) {
    const denied = await get(`/teacher/students/${id}/history`, 0);
    assert.equal(denied.status, 404); assert.deepEqual(denied.body, { error: "Student progress not found" });
  }
  assert.equal((await get(historyPath(3), 1)).status, 404);
  assert.deepEqual((await get("/teacher/students", 5)).body, { students: [] });
  assert.equal((await get(`/teacher/matches/${first}`, 0)).status, 200);
  assert.equal((await get(`/teacher/matches/${first}`, 1)).status, 404);
  assert.equal((await db.get("SELECT best_wpm FROM user_stats WHERE user_id=?", users[2].id)).best_wpm, 9999);
}
