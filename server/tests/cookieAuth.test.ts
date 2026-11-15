import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import express from "express";
import { initializeDatabase, closeDatabase } from "../src/db.js";
import { createAuthRouter } from "../src/routes/auth.js";
import { attachLanServer } from "../src/lan.js";
import { cookieAuthChecks } from "./cookieAuthChecks.js";
import { LoginLimiter } from "../src/loginLimiter.js";
import { sessionCookieName, sessionCookieOptions, readSessionCookie, allowedOrigin } from "../src/cookieSecurity.js";

test("login throttling: concurrency reservations, expiry, successful attempts, account/IP isolation and bounded storage", () => {
  let now = 1000; const limiter = new LoginLimiter(() => now);
  const failures = Array.from({ length: 5 }, () => limiter.reserve("ip1", "student"));
  assert(failures.every(result => !result.retryAfter));
  assert.equal(limiter.reserve("ip2", "STUDENT").retryAfter, 900);
  assert.equal(limiter.reserve("ip1", "other").retryAfter, 0);
  now += 900_001; assert.equal(limiter.reserve("ip1", "student").retryAfter, 0);
  const successful = new LoginLimiter(() => now);
  for (let i = 0; i < 350; i++) { const attempt = successful.reserve("school-ip", "student"); assert.equal(attempt.retryAfter, 0); attempt.finish(true); }
  for (let i = 0; i < 300; i++) assert.equal(successful.reserve("school-ip", `different-${i}`).retryAfter, 0);
  assert.equal(successful.reserve("school-ip", "next").retryAfter, 900);
  const small = new LoginLimiter(() => now, 900_000, 2); small.reserve("1", "1"); assert.equal(small.reserve("2", "2").retryAfter, 60);
});

test("production host-only cookie flags and exact origin policy", () => {
  const saved = { node: process.env.NODE_ENV, site: process.env.AUTH_COOKIE_SAME_SITE, origin: process.env.CLIENT_URL };
  try {
    process.env.NODE_ENV = "production"; delete process.env.AUTH_COOKIE_SAME_SITE; process.env.CLIENT_URL = "https://playtypetiles.com";
    assert.equal(sessionCookieName(), "__Host-typetiles_session");
    assert.deepEqual(sessionCookieOptions(), { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    assert.equal(allowedOrigin("https://playtypetiles.com"), true);
    for (const origin of [undefined, "null", "https://playtypetiles.com.evil.test", "http://192.168.1.2:5173"]) assert.equal(allowedOrigin(origin), false);
    process.env.AUTH_COOKIE_SAME_SITE = "none"; assert.equal(sessionCookieOptions().secure, true);
    process.env.NODE_ENV = "development"; assert.throws(sessionCookieOptions);
    assert.equal(readSessionCookie({ headers: { cookie: "typetiles_session=a; typetiles_session=b" } }), undefined);
  } finally {
    for (const [key, value] of Object.entries({ NODE_ENV: saved.node, AUTH_COOKIE_SAME_SITE: saved.site, CLIENT_URL: saved.origin })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("SQLite cookie login, CSRF, global logout, database checks, throttling and WebSocket security", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-cookie-"));
  process.env.NODE_ENV = "test"; process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.DATABASE_PROVIDER = "sqlite"; process.env.DATABASE_PATH = join(directory, "test.db");
  const db = await initializeDatabase(); const app = express(); app.use(express.json()); app.use("/api/auth", createAuthRouter());
  const server = createServer(app), lan = attachLanServer(server);
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening"); const port = (server.address() as { port: number }).port;
    await cookieAuthChecks(db, `http://127.0.0.1:${port}/api/auth`, `ws://127.0.0.1:${port}/ws`);
  } finally {
    for (const client of lan.clients) client.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve())); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase(); await rm(directory, { recursive: true, force: true });
  }
});
