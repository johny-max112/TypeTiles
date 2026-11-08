import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { generateToken } from "../src/auth.js";
import type { ApplicationDatabase } from "../src/databaseTypes.js";

// The same black-box REST/WebSocket checks run against SQLite and PostgreSQL.
export async function authorizationChecks(db: ApplicationDatabase, base: string, wsUrl: string, sockets: WebSocket[]) {
  const accounts: { id: number; token: string }[] = [];
  for (const [index, role] of ["teacher", "teacher", "student", "student", "admin", "teacher"].entries()) {
    const id = (await db.run(
      "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,?)",
      `security-${index}`, `security-${index}@example.test`, "test-only", `Security ${index}`, role, index === 5 ? 0 : 1,
    )).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", id);
    accounts.push({ id, token: generateToken({ userId: id, username: `security-${index}`, role }) });
  }
  const request = async (path: string, index: number, method = "GET", body?: object) => {
    const response = await fetch(base + path, { method,
      headers: { authorization: `Bearer ${accounts[index].token}`, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const open = async () => {
    const socket = new WebSocket(wsUrl); sockets.push(socket);
    const inbox: any[] = [];
    socket.on("message", raw => inbox.push(JSON.parse(raw.toString())));
    await once(socket, "open");
    return { socket, send: (message: object) => socket.send(JSON.stringify(message)),
      wait: async (type: string, predicate: (message: any) => boolean = () => true) => {
        for (let i = 0; i < 400; i++) {
          const at = inbox.findIndex(message => message.type === type && predicate(message));
          if (at >= 0) return inbox.splice(at, 1)[0];
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw new Error(`Security check timed out waiting for ${type}`);
      },
    };
  };
  const host = await open();
  host.send({ type: "create_room", token: accounts[0].token, ownerUserId: accounts[1].id, wordSet: "General", roundTime: 30 });
  const { roomCode } = await host.wait("room_created");
  const match = await db.get("SELECT * FROM matches WHERE owner_user_id = ?", accounts[0].id);
  assert(match); assert.equal(match.owner_user_id, accounts[0].id);

  // Neither teachers nor students can manufacture membership through REST.
  for (const index of [1, 2, 3]) assert.equal((await request(`/matches/${match.id}/join`, index, "POST", {})).status, 403);
  assert.equal((await db.get("SELECT COUNT(*) AS count FROM match_participants WHERE match_id = ?", match.id)).count, 1);
  for (const index of [1, 2, 4]) assert.equal((await request(`/matches/${match.id}`, index)).status, 404);
  assert.equal((await request(`/matches/${match.id}`, 0)).status, 200);
  assert.equal((await request(`/teacher/matches/${match.id}`, 1)).status, 404);
  assert.equal((await request(`/teacher/matches/${match.id}`, 2)).status, 403);
  assert.equal((await request(`/teacher/matches/${match.id}`, 4)).status, 403);

  const unverified = await open();
  unverified.send({ type: "create_room", token: accounts[5].token });
  await unverified.wait("error", message => /Authentication/.test(message.message));
  unverified.send({ type: "join_room", token: accounts[5].token, roomCode });
  await unverified.wait("error", message => /Authentication/.test(message.message));
  assert.equal((await request(`/matches/${match.id}`, 5)).status, 401);

  const student = await open();
  student.send({ type: "create_room", token: accounts[2].token });
  await student.wait("error", message => /Only teachers/.test(message.message));
  student.send({ type: "join_room", token: accounts[2].token, roomCode });
  await student.wait("room_joined");
  assert.equal((await request(`/matches/${match.id}`, 2)).status, 200);
  assert.equal((await request(`/matches/${match.id}/join`, 2, "POST", {})).status, 409);
  student.send({ type: "update_match_config", token: accounts[0].token, wordSet: "Legal" });
  await student.wait("error", message => /Only the teacher/.test(message.message));
  student.send({ type: "cancel_room", token: accounts[0].token });
  await student.wait("error", message => /Only the teacher/.test(message.message));
  student.send({ type: "start_game" });
  await student.wait("error", message => /Only the host/.test(message.message));

  // Participation, including legacy/forged rows, is never report ownership.
  await db.run("INSERT INTO match_participants(match_id,user_id) VALUES(?,?)", match.id, accounts[1].id);
  await db.run("UPDATE match_participants SET score=10 WHERE match_id=? AND user_id=?", match.id, accounts[2].id);
  assert.equal((await request(`/teacher/matches/${match.id}`, 1)).status, 404);
  assert(!(await request("/teacher/matches", 1)).body.sessions.some((session: any) => session.id === match.id));
  assert.equal((await request(`/teacher/matches/${match.id}`, 0)).status, 200);
  assert((await request("/teacher/matches", 0)).body.sessions.some((session: any) => session.id === match.id));
  const legacyId = (await db.run("INSERT INTO matches(mode,difficulty,word_set,status) VALUES('LAN Match','Normal','General','completed')")).lastID!;
  await db.run("INSERT INTO match_participants(match_id,user_id) VALUES(?,?)", legacyId, accounts[0].id);
  assert.equal((await request(`/teacher/matches/${legacyId}`, 0)).status, 404);
  assert.equal((await request(`/matches/${legacyId}`, 0)).status, 200);

  // Protect every Admin target, including self, and preserve normal management.
  assert.equal((await request(`/admin/users/${accounts[4].id}/role`, 4, "PUT", { role: "student" })).status, 403);
  assert.equal((await db.get("SELECT role FROM users WHERE id=?", accounts[4].id)).role, "admin");
  assert.equal((await request(`/admin/users/${accounts[3].id}/role`, 2, "PUT", { role: "teacher" })).status, 403);
  assert.equal((await request(`/admin/users/${accounts[3].id}/role`, 4, "PUT", { role: "teacher" })).status, 200);
  assert.equal((await request(`/admin/users/${accounts[3].id}/role`, 4, "PUT", { role: "student" })).status, 200);

  // Current role, not cached isHost or an old JWT, controls existing rooms.
  assert.equal((await request(`/admin/users/${accounts[0].id}/role`, 4, "PUT", { role: "student" })).status, 200);
  host.send({ type: "start_game" }); await host.wait("error", message => /Only the host/.test(message.message));
  host.send({ type: "update_match_config", token: accounts[0].token, wordSet: "Legal" });
  await host.wait("error", message => /Only the teacher/.test(message.message));
  host.send({ type: "cancel_room", token: accounts[0].token });
  await host.wait("error", message => /Only the teacher/.test(message.message));
  const reconnect = await open();
  reconnect.send({ type: "join_room", token: accounts[0].token, roomCode });
  await reconnect.wait("error", message => message.code === "ROLE_NOT_ALLOWED");
  assert.equal((await request(`/teacher/matches/${match.id}`, 0)).status, 403);
  assert.equal((await db.get("SELECT status FROM matches WHERE id=?", match.id)).status, "active");

  // Restoring a legitimate teacher permits host reconnect and controls again.
  assert.equal((await request(`/admin/users/${accounts[0].id}/role`, 4, "PUT", { role: "teacher" })).status, 200);
  reconnect.send({ type: "join_room", token: accounts[0].token, roomCode }); await reconnect.wait("room_joined");
  reconnect.send({ type: "update_match_config", wordSet: "Legal" });
  await reconnect.wait("room_state", message => message.matchConfig.wordSet === "legal");
  const studentReconnect = await open();
  studentReconnect.send({ type: "join_room", token: accounts[2].token, roomCode }); await studentReconnect.wait("room_joined");
  studentReconnect.send({ type: "ready" });
  await reconnect.wait("room_state", message => message.players.some((player: any) => player.userId === accounts[2].id && player.ready));
  reconnect.send({ type: "start_game" }); await reconnect.wait("room_started");
  reconnect.send({ type: "cancel_room" }); await reconnect.wait("room_cancelled");
}
