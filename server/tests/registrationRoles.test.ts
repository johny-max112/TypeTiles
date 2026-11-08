import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import assert from "node:assert/strict";
import express from "express";
import { WebSocket } from "ws";
import { initializeDatabase, closeDatabase } from "../src/db.js";
import { EmailVerificationService } from "../src/emailVerification.js";
import { createAuthRouter } from "../src/routes/auth.js";
import matchesRoutes from "../src/routes/matches.js";
import adminRoutes from "../src/routes/admin.js";
import { attachLanServer } from "../src/lan.js";
import { registrationRoleChecks } from "./registrationRoleChecks.js";

test("SQLite direct student/teacher registration, verification and classroom access", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-registration-roles-"));
  process.env.DATABASE_PROVIDER = "sqlite"; process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.EMAIL_VERIFICATION_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();
  const mail: { to: string; code: string }[] = [];
  const service = new EmailVerificationService(async (to, code) => { mail.push({ to, code }); return { id: "mock" }; });
  const app = express(); app.use(express.json()); app.use("/api/auth", createAuthRouter(service));
  app.use("/api", matchesRoutes); app.use("/api/admin", adminRoutes);
  const server = createServer(app); const lan = attachLanServer(server); const sockets: WebSocket[] = [];
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert(address && typeof address !== "string");
    await registrationRoleChecks(db, `http://127.0.0.1:${address.port}/api`, `ws://127.0.0.1:${address.port}/ws`, sockets, mail);
  } finally {
    for (const socket of sockets) socket.terminate();
    for (const socket of lan.clients) socket.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase(); await rm(directory, { recursive: true, force: true });
  }
});
