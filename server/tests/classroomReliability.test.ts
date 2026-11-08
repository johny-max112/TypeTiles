import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import express from "express";
import { WebSocket } from "ws";
import { initializeDatabase, closeDatabase } from "../src/db.js";
import { attachLanServer } from "../src/lan.js";
import matchesRoutes from "../src/routes/matches.js";
import { classroomReliabilityChecks } from "./classroomReliabilityChecks.js";
import { classroomStatusLabel } from "../../src/lib/classroomStatus.js";

test("classroom status labels distinguish cancellation and interruption", () => {
  assert.equal(classroomStatusLabel("cancelled"), "Cancelled");
  assert.equal(classroomStatusLabel("interrupted"), "Interrupted");
  assert.equal(classroomStatusLabel("completed"), "Complete");
  assert.equal(classroomStatusLabel("active"), "In progress");
  assert.equal(classroomStatusLabel("other"), "Unknown");
});

test("SQLite classroom cancellation, atomic completion, retries and restart safety", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-reliability-"));
  process.env.DATABASE_PROVIDER = "sqlite"; process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();
  const app = express(); app.use(express.json()); app.use("/api", matchesRoutes);
  const server = createServer(app); const lan = attachLanServer(server); const sockets: WebSocket[] = [];
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert(address && typeof address !== "string");
    const ids = await classroomReliabilityChecks(db, `http://127.0.0.1:${address.port}/api`, `ws://127.0.0.1:${address.port}/ws`, sockets, "sqlite");
    await closeDatabase(); const reopened = await initializeDatabase();
    for (const [key, status] of [["cancelledId", "cancelled"], ["completedId", "completed"], ["interruptedId", "interrupted"], ["untouchedActiveId", "active"]] as const) {
      assert.equal((await reopened.get("SELECT status FROM matches WHERE id=?", ids[key])).status, status);
    }
  } finally {
    for (const socket of sockets) socket.terminate(); for (const socket of lan.clients) socket.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase(); await rm(directory, { recursive: true, force: true });
  }
});
