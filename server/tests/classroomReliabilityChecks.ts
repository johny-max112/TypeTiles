import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { generateToken } from "../src/auth.js";
import { completeClassroomMatch, cancelClassroomMatch } from "../src/classroomPersistence.js";
import type { ApplicationDatabase } from "../src/databaseTypes.js";

export async function classroomReliabilityChecks(db: ApplicationDatabase, base: string, wsUrl: string, sockets: WebSocket[], provider: "sqlite" | "postgres") {
  const identities: { id: number; token: string }[] = [];
  for (const [i, role] of ["teacher", "student", "student", "teacher"].entries()) {
    const id = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)", `reliable-${i}`, `reliable-${i}@example.test`, "test-only", `Reliable ${i}`, role)).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", id);
    identities.push({ id, token: generateToken({ userId: id, username: `reliable-${i}`, role }) });
  }
  const get = async (path: string, i = 0) => {
    const response = await fetch(base + path, { headers: { authorization: `Bearer ${identities[i].token}` } });
    return { status: response.status, body: await response.json() };
  };
  const open = async (i: number) => {
    const socket = new WebSocket(wsUrl); sockets.push(socket); const messages: any[] = [];
    socket.on("message", raw => messages.push(JSON.parse(raw.toString()))); await once(socket, "open");
    return { send: (body: object) => socket.send(JSON.stringify({ ...body, token: identities[i].token, playerName: "Impersonated name" })),
      wait: async (type: string, predicate: (message: any) => boolean = () => true) => {
        for (let attempt = 0; attempt < 500; attempt++) {
          const at = messages.findIndex(message => message.type === type && predicate(message));
          if (at >= 0) return messages.splice(at, 1)[0];
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw new Error(`Missing reliability event ${type}`);
      },
    };
  };
  const snapshot = async (id: number) => ({ match: await db.get("SELECT * FROM matches WHERE id=?", id),
    participants: await db.all("SELECT * FROM match_participants WHERE match_id=? ORDER BY id", id) });
  const create = async () => {
    const host = await open(0); host.send({ type: "create_room", wordSet: "General", roundTime: 30 });
    const { roomCode } = await host.wait("room_created");
    const match = await db.get("SELECT * FROM matches WHERE owner_user_id=? ORDER BY id DESC LIMIT 1", identities[0].id);
    return { host, roomCode, id: match.id as number };
  };
  const cancelled = await create(); const student = await open(1);
  student.send({ type: "join_room", roomCode: cancelled.roomCode }); await student.wait("room_joined");
  const state = await cancelled.host.wait("room_state", message => message.studentCount === 1);
  assert(state.players.every((player: any) => player.name.startsWith("reliable-") && player.name !== "Impersonated name"));
  student.send({ type: "ready" }); await cancelled.host.wait("room_state", message => message.players.some((player: any) => !player.isHost && player.ready));
  cancelled.host.send({ type: "start_game" }); await cancelled.host.wait("room_started");
  student.send({ type: "score_update", score: 10, wpm: 30, accuracy: 90, completedWords: 1, lives: 3, finished: false });
  await cancelled.host.wait("standings_update", message => message.players.some((player: any) => player.score === 10));
  const beforeCancel = await snapshot(cancelled.id);
  cancelled.host.send({ type: "cancel_room" }); cancelled.host.send({ type: "cancel_room" });
  await cancelled.host.wait("room_cancelled"); await student.wait("room_cancelled");
  const savedCancel = await snapshot(cancelled.id);
  assert.equal(savedCancel.match.status, "cancelled"); assert(savedCancel.match.ended_at);
  assert.deepEqual(savedCancel.participants, beforeCancel.participants);
  assert.equal(await cancelClassroomMatch(cancelled.id, identities[0].id), "cancelled");
  assert.equal(await completeClassroomMatch(cancelled.id, identities[0].id, []), "cancelled");
  assert.deepEqual(await snapshot(cancelled.id), savedCancel);
  assert.equal((await get(`/teacher/matches/${cancelled.id}`)).body.match.status, "cancelled");
  assert.equal((await get(`/teacher/matches/${cancelled.id}`, 3)).status, 404);
  assert((await get("/teacher/matches")).body.sessions.some((match: any) => match.id === cancelled.id && match.status === "cancelled"));
  assert.deepEqual((await get("/teacher/students")).body.students, []);

  const completed = await create(); const finisher = await open(1);
  finisher.send({ type: "join_room", roomCode: completed.roomCode }); await finisher.wait("room_joined");
  finisher.send({ type: "ready" }); await completed.host.wait("room_state", message => message.players.some((player: any) => !player.isHost && player.ready));
  completed.host.send({ type: "start_game" }); await completed.host.wait("room_started");
  finisher.send({ type: "score_update", score: 20, wpm: 45, accuracy: 90, completedWords: 2, lives: 3, finished: true });
  await completed.host.wait("classroom_results");
  const savedComplete = await snapshot(completed.id);
  assert.equal(savedComplete.match.status, "completed");
  const participant = savedComplete.participants.find((row: any) => row.user_id === identities[1].id);
  assert.equal(participant.position, 1); assert.equal(participant.score, 20); assert.equal(participant.end_reason, "time");
  finisher.send({ type: "score_update", score: 999, wpm: 999, accuracy: 1, completedWords: 9, lives: 0, finished: true });
  finisher.send({ type: "ready" }); await completed.host.wait("room_state", message => message.players.some((player: any) => !player.isHost && player.ready));
  completed.host.send({ type: "cancel_room" });
  assert.match((await completed.host.wait("room_cancelled")).message, /closed/);
  assert.deepEqual(await snapshot(completed.id), savedComplete);
  assert.equal((await get("/teacher/students")).body.students[0].session_count, 1);

  const fixture = async (status = "active") => {
    const id = (await db.run("INSERT INTO matches(mode,difficulty,word_set,status,owner_user_id) VALUES('LAN Match','Normal','General',?,?)", status, identities[0].id)).lastID!;
    for (const i of [1, 2]) await db.run("INSERT INTO match_participants(match_id,user_id,score,wpm,accuracy) VALUES(?,?,7,8,9)", id, identities[i].id);
    return id;
  };
  const results = [1, 2].map((i, index) => ({ userId: identities[i].id, score: 100 - index, wpm: 50, accuracy: 90, completedWords: 2, lives: 3, finished: true }));
  const atomicId = await fixture(); const beforeAtomic = await snapshot(atomicId);
  if (provider === "sqlite") await db.exec("CREATE TRIGGER reliability_fail BEFORE UPDATE OF position ON match_participants WHEN NEW.position=2 BEGIN SELECT RAISE(ABORT,'reliability failure'); END");
  else {
    await db.exec(`CREATE FUNCTION reliability_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.position=2 THEN RAISE EXCEPTION 'reliability failure'; END IF; RETURN NEW; END; $$`);
    await db.exec("CREATE TRIGGER reliability_fail BEFORE UPDATE ON match_participants FOR EACH ROW EXECUTE FUNCTION reliability_fail()");
  }
  try {
    await assert.rejects(() => completeClassroomMatch(atomicId, identities[0].id, results));
    assert.deepEqual(await snapshot(atomicId), beforeAtomic);
  } finally {
    await db.exec(provider === "sqlite" ? "DROP TRIGGER reliability_fail" : "DROP TRIGGER reliability_fail ON match_participants");
    if (provider === "postgres") await db.exec("DROP FUNCTION reliability_fail()");
  }
  assert.equal(await completeClassroomMatch(atomicId, identities[0].id, results), "completed");
  const atomic = await snapshot(atomicId);
  assert.deepEqual(atomic.participants.map((row: any) => row.position), [1, 2]);
  assert.equal(await completeClassroomMatch(atomicId, identities[0].id, results.map(row => ({ ...row, score: 9999 }))), "completed");
  assert.deepEqual(await snapshot(atomicId), atomic);
  assert.equal(await cancelClassroomMatch(atomicId, identities[3].id), "unavailable");
  const raceId = await fixture();
  await Promise.all([completeClassroomMatch(raceId, identities[0].id, results), cancelClassroomMatch(raceId, identities[0].id)]);
  const raced = await snapshot(raceId);
  assert(["completed", "cancelled"].includes(raced.match.status));
  assert(raced.participants.every((row: any) => raced.match.status === "completed" ? row.position !== null : row.position === null));
  const interruptedId = await fixture("interrupted"); const interrupted = await snapshot(interruptedId);
  assert.equal(await completeClassroomMatch(interruptedId, identities[0].id, results), "interrupted");
  assert.equal(await cancelClassroomMatch(interruptedId, identities[0].id), "interrupted");
  assert.deepEqual(await snapshot(interruptedId), interrupted);
  assert.equal((await get(`/teacher/matches/${interruptedId}`)).body.match.status, "interrupted");
  // An unrelated active session cannot safely be classified as abandoned.
  const untouchedActiveId = await fixture();
  assert.equal((await db.get("SELECT status FROM matches WHERE id=?", untouchedActiveId)).status, "active");
  return { cancelledId: cancelled.id, completedId: completed.id, interruptedId, untouchedActiveId };
}
