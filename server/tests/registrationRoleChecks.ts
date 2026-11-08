import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import type { ApplicationDatabase } from "../src/databaseTypes.js";
import { validateRegistration } from "../src/emailVerification.js";
import { generateToken } from "../src/auth.js";

export async function registrationRoleChecks(db: ApplicationDatabase, base: string, wsUrl: string,
  sockets: WebSocket[], mail: { to: string; code: string }[]) {
  const request = async (path: string, body?: object, token?: string) => {
    const response = await fetch(base + path, { method: body ? "POST" : "GET",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const input = { username: "role-invalid", email: "role-invalid@example.test", password: "new-password", displayName: "Role test" };
  const before = await db.all("SELECT * FROM users ORDER BY id");
  const sentBefore = mail.length;
  for (const role of ["admin", "player", "Teacher", "STUDENT", "teacher ", "", "unknown", null, [], ["teacher"], {}, { role: "teacher" }, 1, false]) {
    assert.throws(() => validateRegistration({ ...input, role }));
    assert.equal((await request("/auth/register", { ...input, role })).status, 400);
  }
  assert.throws(() => validateRegistration({ ...input, role: undefined }));
  assert.equal(validateRegistration(input).role, "student");
  assert.deepEqual(await db.all("SELECT * FROM users ORDER BY id"), before);
  assert.equal(mail.length, sentBefore);

  const open = async () => {
    const socket = new WebSocket(wsUrl); sockets.push(socket);
    const inbox: any[] = [];
    socket.on("message", raw => inbox.push(JSON.parse(raw.toString())));
    await once(socket, "open");
    return { send: (message: object) => socket.send(JSON.stringify(message)),
      wait: async (type: string, predicate: (message: any) => boolean = () => true) => {
        for (let i = 0; i < 400; i++) {
          const at = inbox.findIndex(message => message.type === type && predicate(message));
          if (at >= 0) return inbox.splice(at, 1)[0];
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw new Error(`Registration check timed out waiting for ${type}`);
      },
    };
  };
  const users: { id: number; token: string }[] = [];
  for (const [index, role] of ["student", "teacher", undefined].entries()) {
    const username = `role-${index}`;
    const email = `${username}@example.test`;
    const payload = { ...input, username, email, ...(role === undefined ? {} : { role }) };
    const registration = await request("/auth/register", payload);
    assert.equal(registration.status, 201);
    assert.deepEqual(Object.keys(registration.body).sort(), ["message", "verificationRequired"]);
    assert.equal(registration.body.verificationRequired, true);
    const user = await db.get("SELECT * FROM users WHERE username=?", username);
    assert.equal(user.role, role ?? "student"); assert.equal(user.email_verified, 0);
    assert.equal(user.email_verified_at, null); assert.equal(user.session_version, 0);
    assert.equal((await request("/auth/login", { username, password: input.password })).status, 403);
    const pending = await open();
    pending.send({ type: "create_room", token: generateToken({ userId: user.id, username, role: "teacher" }) });
    await pending.wait("error", message => /Authentication/.test(message.message));
    const code = mail.filter(item => item.to === email).at(-1)!.code;
    assert.equal((await request("/auth/verify-email", { email, code })).status, 200);
    const verified = await db.get("SELECT * FROM users WHERE id=?", user.id);
    for (const field of Object.keys(user).filter(field => !["email_verified", "email_verified_at"].includes(field))) {
      assert.deepEqual(verified[field], user[field]);
    }
    assert.equal(verified.email_verified, 1); assert(verified.email_verified_at > 0);
    assert.equal((await request("/auth/verify-email", { email, code })).status, 400);
    const login = await request("/auth/login", { username, password: input.password });
    assert.equal(login.status, 200); assert.equal(login.body.user.role, role ?? "student");
    users.push({ id: user.id, token: login.body.token });
    const opposite = role === "teacher" ? "student" : "teacher";
    assert.equal((await request("/auth/register", { ...payload, role: opposite })).status, 409);
    assert.deepEqual(await db.get("SELECT * FROM users WHERE id=?", user.id), verified);
    if (index === 0) {
      assert.equal((await request("/auth/register", { ...payload, username: `duplicate-${index}`, role: opposite })).status, 409);
      assert.deepEqual(await db.get("SELECT * FROM users WHERE id=?", user.id), verified);
    }
  }
  const secondTeacherInput = { ...input, username: "role-second-teacher", email: "role-second-teacher@example.test", role: "teacher" };
  assert.equal((await request("/auth/register", secondTeacherInput)).status, 201);
  const secondCode = mail.filter(item => item.to === secondTeacherInput.email).at(-1)!.code;
  assert.equal((await request("/auth/verify-email", { email: secondTeacherInput.email, code: secondCode })).status, 200);
  const secondLogin = await request("/auth/login", { username: secondTeacherInput.username, password: input.password });
  assert.equal(secondLogin.status, 200); assert.equal(secondLogin.body.user.role, "teacher");
  // Valid role submissions also cannot overwrite a pre-existing Admin account.
  const admin = before.find((user: any) => user.role === "admin");
  if (admin) {
    assert.equal((await request("/auth/register", { ...input, username: admin.username, email: admin.email, role: "teacher" })).status, 409);
    assert.deepEqual(await db.get("SELECT * FROM users WHERE id=?", admin.id), admin);
  }
  const teacher = await open();
  teacher.send({ type: "create_room", token: users[1].token, wordSet: "General", roundTime: 30 });
  const { roomCode } = await teacher.wait("room_created");
  const match = await db.get("SELECT * FROM matches WHERE owner_user_id=?", users[1].id);
  assert(match);
  const student = await open();
  student.send({ type: "create_room", token: users[0].token });
  await student.wait("error", message => /Only teachers/.test(message.message));
  student.send({ type: "join_room", token: users[0].token, roomCode }); await student.wait("room_joined");
  assert.equal((await request(`/teacher/matches/${match.id}`, undefined, users[0].token)).status, 403);
  assert.equal((await request(`/teacher/matches/${match.id}`, undefined, users[1].token)).status, 200);
  assert.equal((await request(`/teacher/matches/${match.id}`, undefined, secondLogin.body.token)).status, 404);
  assert.equal((await request(`/matches/${match.id}`, undefined, secondLogin.body.token)).status, 404);
  assert.equal((await request(`/matches/${match.id}/join`, {}, secondLogin.body.token)).status, 403);
  assert.equal((await request(`/admin/users`, undefined, users[1].token)).status, 403);
  teacher.send({ type: "cancel_room" }); await teacher.wait("room_cancelled");
}
