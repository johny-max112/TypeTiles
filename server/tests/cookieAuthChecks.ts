import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { hashPassword, jwtSecret, verifyToken } from "../src/auth.js";
import type { ApplicationDatabase } from "../src/databaseTypes.js";
import { socketOptions } from "./cookieFixtures.js";

export async function cookieAuthChecks(db: ApplicationDatabase, base: string, wsUrl: string) {
  const userId = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
    "cookie-teacher", "cookie-teacher@example.test", await hashPassword("cookie-password"), "Cookie Teacher", "teacher")).lastID!;
  const post = (path: string, body = {}, cookie?: string, origin = "http://localhost:5173", csrf = true) => fetch(base + path, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin,
      ...(csrf ? { "X-TypeTiles-Request": "1" } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
  });
  const me = (cookie: string) => fetch(base + "/me", { headers: { Cookie: cookie } });
  const credentials = { username: "cookie-teacher", password: "cookie-password" };
  assert.equal((await post("/login", credentials, undefined, "https://evil.example")).status, 403);
  assert.equal((await post("/login", credentials, undefined, "http://localhost:5173", false)).status, 403);
  const login = await post("/login", credentials); assert.equal(login.status, 200);
  const body = await login.json(); assert.equal(body.token, undefined);
  const setCookie = login.headers.get("set-cookie")!;
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Lax/); assert.match(setCookie, /Max-Age=900/);
  assert.equal(login.headers.get("cache-control"), "no-store");
  const cookie = setCookie.split(";")[0], token = cookie.split("=")[1];
  const decoded = jwt.decode(token) as { iat: number; exp: number };
  assert.equal(decoded.exp - decoded.iat, 900); assert(verifyToken(token));
  assert.equal((await me(cookie)).status, 200);
  assert.equal((await fetch(base + "/me", { headers: { Authorization: `Bearer ${token}` } })).status, 401);
  const secondLogin = await post("/login", credentials); const second = secondLogin.headers.get("set-cookie")!.split(";")[0];

  // Current role and status are always DB authoritative, not the cookie claims.
  await db.run("UPDATE users SET role='student' WHERE id=?", userId);
  assert.equal((await (await me(cookie)).json()).user.role, "student");
  await db.run("UPDATE users SET is_banned=1 WHERE id=?", userId); assert.equal((await me(cookie)).status, 401);
  await db.run("UPDATE users SET is_banned=0,email_verified=0 WHERE id=?", userId); assert.equal((await me(cookie)).status, 401);
  await db.run("UPDATE users SET email_verified=1,role='teacher' WHERE id=?", userId);
  const expired = jwt.sign({ userId, username: "cookie-teacher", role: "teacher", sessionVersion: 0 }, jwtSecret(), { expiresIn: -1 });
  assert.equal((await me(`typetiles_session=${expired}`)).status, 401);

  const socket = new WebSocket(wsUrl, socketOptions(token));
  await once(socket, "open");
  const first = once(socket, "message"); socket.send(JSON.stringify({ type: "create_room", wordSet: "General" }));
  assert.equal(JSON.parse(String((await first)[0])).type, "room_created");
  assert.equal((await post("/logout", {}, cookie, "https://evil.example")).status, 403);
  assert.equal((await me(cookie)).status, 200);
  const closed = once(socket, "close"); const logout = await post("/logout", {}, cookie);
  assert.equal(logout.status, 200); assert.match(logout.headers.get("set-cookie")!, /Expires=Thu, 01 Jan 1970/);
  assert.equal((await closed)[0], 4001);
  assert.equal((await db.get("SELECT session_version FROM users WHERE id=?", userId)).session_version, 1);
  assert.equal((await me(cookie)).status, 401); assert.equal((await me(second)).status, 401);
  assert.equal((await post("/login", credentials)).status, 200);

  const race = await Promise.all(Array.from({ length: 6 }, () => post("/login", { username: "nonexistent-cookie-user", password: "wrong" })));
  assert.equal(race.filter(response => response.status === 401).length, 5);
  assert.equal(race.filter(response => response.status === 429).length, 1);
  const blocked = await post("/login", { username: "nonexistent-cookie-user", password: "wrong" });
  assert.equal(blocked.status, 429); assert(Number(blocked.headers.get("retry-after")) > 0);

  // A message-supplied JWT cannot authenticate an otherwise anonymous connection.
  const anonymous = new WebSocket(wsUrl, socketOptions()); await once(anonymous, "open");
  const denied = once(anonymous, "message"); anonymous.send(JSON.stringify({ type: "create_room", token }));
  assert.equal(JSON.parse(String((await denied)[0])).type, "error"); anonymous.close(); await once(anonymous, "close");
  const badOrigin = new WebSocket(wsUrl, { headers: { Origin: "https://evil.example", Cookie: cookie } });
  badOrigin.on("error", () => {});
  const [, response] = await once(badOrigin, "unexpected-response"); assert.equal(response.statusCode, 403); badOrigin.terminate();
}
