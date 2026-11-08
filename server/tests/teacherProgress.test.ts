import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
import assert from "node:assert/strict";
import { initializeDatabase, closeDatabase } from "../src/db.js";
import matchesRoutes from "../src/routes/matches.js";
import { teacherProgressChecks } from "./teacherProgressChecks.js";

test("SQLite teacher-specific student progress: isolation, aggregates, history and eligibility", async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-progress-"));
  process.env.DATABASE_PROVIDER = "sqlite"; process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();
  const app = express(); app.use(express.json()); app.use("/api", matchesRoutes);
  const server = createServer(app);
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert(address && typeof address !== "string");
    await teacherProgressChecks(db, `http://127.0.0.1:${address.port}/api`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase(); await rm(directory, { recursive: true, force: true });
  }
});
