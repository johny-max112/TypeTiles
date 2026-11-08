import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { generateToken } from "../src/auth.js";
import { EmailVerificationService } from "../src/emailVerification.js";
import type { ApplicationDatabase } from "../src/databaseTypes.js";

export async function userDeletionChecks(db: ApplicationDatabase, base: string, wsUrl: string, sockets: WebSocket[]) {
  const accounts: { id: number; token: string }[] = [];
  for (const [index, role] of ["admin", "teacher", "student", "student"].entries()) {
    const id = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
      `delete-${index}`, `delete-${index}@example.test`, "test-only", `Delete ${index}`, role)).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", id);
    accounts.push({ id, token: generateToken({ userId: id, username: `delete-${index}`, role }) });
  }
  const request = async (path: string, index?: number, method = "DELETE") => {
    const response = await fetch(base + path, { method,
      headers: index === undefined ? {} : { authorization: `Bearer ${accounts[index].token}` } });
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
        throw new Error(`Deletion check timed out waiting for ${type}`);
      },
    };
  };
  const path = `/admin/users/${accounts[2].id}`;
  assert.equal((await request(path)).status, 401);
  assert.equal((await request(path, 1)).status, 403);
  assert.equal((await request(path, 2)).status, 403);
  assert.equal((await request(`/admin/users/${accounts[0].id}`, 0)).status, 403);
  assert.equal((await request("/admin/users/not-an-id", 0)).status, 400);
  assert.equal((await request("/admin/users/999999999", 0)).status, 404);
  const teacher = await open();
  teacher.send({ type: "create_room", token: accounts[1].token, wordSet: "General" });
  const { roomCode } = await teacher.wait("room_created");
  const match = await db.get("SELECT * FROM matches WHERE owner_user_id=?", accounts[1].id);
  const student = await open();
  student.send({ type: "join_room", token: accounts[2].token, roomCode }); await student.wait("room_joined");
  await db.run("INSERT INTO match_results(match_id,user_id,result) VALUES(?,?,'win')", match.id, accounts[2].id);
  await db.run("INSERT INTO feedback(user_id,message) VALUES(?,'test feedback')", accounts[2].id);
  for (const table of ["email_verification_codes", "password_reset_codes"]) {
    await db.run(`INSERT INTO ${table}(user_id,code_hash,expires_at,created_at,updated_at) VALUES(?,'test-only',100,1,1)`, accounts[2].id);
  }
  await db.run("INSERT INTO admin_logs(admin_id,action,target_user_id,details) VALUES(?,'ban_user',?,'test log')", accounts[0].id, accounts[2].id);
  const closed = once(student.socket, "close");
  assert.equal((await request(path, 0)).status, 200);
  assert.equal((await closed)[0], 4001);
  await teacher.wait("room_state", state => state.studentCount === 0);
  assert.equal(await db.get("SELECT id FROM users WHERE id=?", accounts[2].id), undefined);
  for (const table of ["user_stats", "match_results", "match_participants", "feedback", "email_verification_codes", "password_reset_codes"]) {
    assert.equal((await db.get(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id=?`, accounts[2].id)).count, 0);
  }
  assert(await db.get("SELECT id FROM matches WHERE id=?", match.id));
  assert(await db.get("SELECT id FROM admin_logs WHERE action='ban_user' AND admin_id=? AND target_user_id IS NULL", accounts[0].id));
  assert.equal((await request(`/matches/${match.id}`, 2, "GET")).status, 401);
  assert.equal((await request(path, 0)).status, 404);

  // Re-registration uses the real service, mocked delivery and its own rate key.
  const mail: { to: string; code: string }[] = [];
  const service = new EmailVerificationService(async (to, code) => { mail.push({ to, code }); return { id: "mock" }; });
  await service.register({ username: "delete-2", email: "delete-2@example.test", password: "new-password", displayName: "Recreated", role: "teacher" }, "delete-test");
  const recreated = await db.get("SELECT * FROM users WHERE username='delete-2'");
  assert.notEqual(recreated.id, accounts[2].id); assert.equal(recreated.email_verified, 0);
  assert.equal(recreated.role, "teacher"); assert.equal(recreated.email_verified_at, null);
  assert.equal(await service.verify(mail[0].to, mail[0].code, "delete-test"), true);
  assert.equal((await db.get("SELECT email_verified FROM users WHERE id=?", recreated.id)).email_verified, 1);

  // Preserve authored audit history, and roll back ownership/target detachment.
  await db.run("INSERT INTO admin_logs(admin_id,action) VALUES(?,'legacy_admin_action')", accounts[3].id);
  assert.equal((await request(`/admin/users/${accounts[3].id}`, 0)).status, 409);
  assert(await db.get("SELECT id FROM users WHERE id=?", accounts[3].id));

  const hostClosed = once(teacher.socket, "close");
  assert.equal((await request(`/admin/users/${accounts[1].id}`, 0)).status, 200);
  await teacher.wait("room_cancelled"); await hostClosed;
  assert.equal((await db.get("SELECT owner_user_id FROM matches WHERE id=?", match.id)).owner_user_id, null);
  assert(await db.get("SELECT id FROM admin_logs WHERE action='delete_user' AND admin_id=?", accounts[0].id));
  assert.equal((await request(`/matches/${match.id}`, 1, "GET")).status, 401);
}
