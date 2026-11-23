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
import { generateToken } from "../src/auth.js";
import customDeckRoutes from "../src/routes/customDecks.js";

test("SQLite custom deck API enforces teacher ownership and preserves match snapshots", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-custom-decks-api-"));
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();

  const insertUser = async (username: string, role: "teacher" | "student") => {
    const id = (await db.run(
      "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
      username,
      `${username}@example.test`,
      "test-only",
      username,
      role,
    )).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", id);
    return {
      id,
      token: generateToken({ userId: id, username, role }),
    };
  };
  const teacherA = await insertUser("deck-owner-a", "teacher");
  const teacherB = await insertUser("deck-owner-b", "teacher");
  const student = await insertUser("deck-student", "student");

  const app = express();
  app.use(express.json());
  app.use("/api", customDeckRoutes);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;

  const request = async (path: string, method = "GET", token?: string, body?: object) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
        "X-TypeTiles-Request": "1",
        ...(token ? { cookie: `typetiles_session=${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };

  try {
    assert.equal((await request("/custom-decks")).status, 401);
    assert.equal((await request("/custom-decks", "POST", student.token, {
      name: "Student Deck",
      practiceFormat: "word-phrase",
      entries: [],
    })).status, 403);

    const invalidName = await request("/custom-decks", "POST", teacherA.token, {
      name: " ",
      practiceFormat: "word-phrase",
      entries: [],
    });
    assert.equal(invalidName.status, 400);

    const invalidFormat = await request("/custom-decks", "POST", teacherA.token, {
      name: "Invalid Format",
      practiceFormat: "sentence",
      entries: [],
    });
    assert.equal(invalidFormat.status, 400);

    const invalidEntry = await request("/custom-decks", "POST", teacherA.token, {
      name: "Invalid Entry",
      practiceFormat: "word-phrase",
      entries: [{ answer: " " }],
    });
    assert.equal(invalidEntry.status, 400);

    const created = await request("/custom-decks", "POST", teacherA.token, {
      name: "Office Terms",
      practiceFormat: "word-phrase",
      entries: [
        { prompt: null, answer: "invoice" },
        { prompt: "Please review this document", answer: "memo" },
        { prompt: null, answer: "ledger" },
      ],
    });
    assert.equal(created.status, 201);
    const deckId = created.body.deck.id as number;
    assert.equal(created.body.deck.teacher_user_id, teacherA.id);
    assert.deepEqual(
      created.body.deck.entries.map((entry: any) => [entry.prompt, entry.answer, entry.sort_order]),
      [[null, "invoice", 0], ["Please review this document", "memo", 1], [null, "ledger", 2]],
    );

    const duplicateOrder = await request("/custom-decks", "POST", teacherA.token, {
      name: "Duplicate Order",
      practiceFormat: "word-phrase",
      entries: [
        { answer: "first", sort_order: 1 },
        { answer: "second", sort_order: 1 },
      ],
    });
    assert.equal(duplicateOrder.status, 400);

    const bCreated = await request("/custom-decks", "POST", teacherB.token, {
      name: "Teacher B Deck",
      practiceFormat: "full-sentence",
      entries: [{ answer: "Teacher B owns this sentence." }],
    });
    assert.equal(bCreated.status, 201);
    const bDeckId = bCreated.body.deck.id as number;

    const listed = await request("/custom-decks", "GET", teacherA.token);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.decks.length, 1);
    assert.equal(listed.body.decks[0].id, deckId);
    assert.equal(listed.body.decks[0].entry_count, 3);

    assert.equal((await request(`/custom-decks/${bDeckId}`, "GET", teacherA.token)).status, 404);
    assert.equal((await request(`/custom-decks/${bDeckId}`, "PUT", teacherA.token, {
      name: "Unauthorized Edit",
    })).status, 404);
    assert.equal((await request(`/custom-decks/${bDeckId}/archive`, "POST", teacherA.token)).status, 404);
    assert.equal((await request(`/custom-decks/${bDeckId}`, "DELETE", teacherA.token)).status, 404);

    const retrieved = await request(`/custom-decks/${deckId}`, "GET", teacherA.token);
    assert.equal(retrieved.status, 200);
    assert.deepEqual(
      retrieved.body.deck.entries.map((entry: any) => entry.answer),
      ["invoice", "memo", "ledger"],
    );

    const snapshot = JSON.stringify({
      name: "Office Terms",
      practiceFormat: "word-phrase",
      entries: ["invoice", "memo", "ledger"],
    });
    const matchId = (await db.run(
      "INSERT INTO matches(mode,difficulty,round_time,word_set,status,practice_format,owner_user_id,custom_deck_id,custom_deck_snapshot) VALUES(?,?,?,?,?,?,?,?,?)",
      ["LAN Match", "Normal", 90, "Custom", "active", "word-phrase", teacherA.id, deckId, snapshot],
    )).lastID!;

    const updated = await request(`/custom-decks/${deckId}`, "PUT", teacherA.token, {
      name: "Renamed Office Terms",
      practiceFormat: "full-sentence",
      entries: [
        { answer: "The third entry is first.", sort_order: 3 },
        { answer: "The first entry is second.", sort_order: 1 },
        { answer: "The second entry is third.", sort_order: 2 },
      ],
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(
      updated.body.deck.entries.map((entry: any) => [entry.answer, entry.sort_order]),
      [
        ["The first entry is second.", 0],
        ["The second entry is third.", 1],
        ["The third entry is first.", 2],
      ],
    );

    assert.equal((await db.get("SELECT custom_deck_snapshot FROM matches WHERE id=?", matchId))?.custom_deck_snapshot, snapshot);

    const archived = await request(`/custom-decks/${deckId}/archive`, "POST", teacherA.token);
    assert.equal(archived.status, 200);
    assert.equal(archived.body.deck.status, "archived");
    assert.equal((await db.get("SELECT custom_deck_snapshot FROM matches WHERE id=?", matchId))?.custom_deck_snapshot, snapshot);

    assert.equal((await request(`/custom-decks/not-a-number`, "GET", teacherA.token)).status, 400);
    assert.equal((await request(`/custom-decks/${deckId}`, "PATCH", teacherA.token, {})).status, 400);

    const deleted = await request(`/custom-decks/${deckId}`, "DELETE", teacherA.token);
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.deleted, true);
    assert.equal((await db.get("SELECT id FROM custom_decks WHERE id=?", deckId)), undefined);
    assert.equal((await db.get("SELECT COUNT(*) AS count FROM custom_deck_items WHERE deck_id=?", deckId))?.count, 0);
    assert.equal((await db.get("SELECT custom_deck_id FROM matches WHERE id=?", matchId))?.custom_deck_id, null);
    assert.equal((await db.get("SELECT custom_deck_snapshot FROM matches WHERE id=?", matchId))?.custom_deck_snapshot, snapshot);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});
