import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { initializeDatabase, closeDatabase } from "../src/db.js";

test("fresh SQLite custom deck foundation creates owned decks and ordered items", async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-custom-decks-fresh-"));
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  try {
    let db = await initializeDatabase();
    const teacher = (await db.run(
      "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
      "deck-teacher", "deck-teacher@example.test", "test-only", "Deck Teacher", "teacher",
    )).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", teacher);

    const deck = (await db.run(
      "INSERT INTO custom_decks(teacher_user_id,name,practice_format,status) VALUES(?,?,?,?)",
      [teacher, "Office Terms", "word-phrase", "active"],
    )).lastID!;
    await db.run(
      "INSERT INTO custom_deck_items(deck_id,prompt,answer,sort_order) VALUES(?,?,?,?)",
      [deck, null, "invoice", 0],
    );
    await db.run(
      "INSERT INTO custom_deck_items(deck_id,prompt,answer,sort_order) VALUES(?,?,?,?)",
      [deck, "Please review this document", "memo", 1],
    );

    assert.deepEqual(await db.all(
      "SELECT prompt,answer,sort_order FROM custom_deck_items WHERE deck_id=? ORDER BY sort_order",
      deck,
    ), [
      { prompt: null, answer: "invoice", sort_order: 0 },
      { prompt: "Please review this document", answer: "memo", sort_order: 1 },
    ]);
    assert.equal((await db.get(
      "SELECT teacher_user_id FROM custom_decks WHERE id=?",
      deck,
    ))?.teacher_user_id, teacher);

    const snapshot = JSON.stringify({
      name: "Office Terms",
      practiceFormat: "word-phrase",
      items: [
        { prompt: null, answer: "invoice", sortOrder: 0 },
        { prompt: "Please review this document", answer: "memo", sortOrder: 1 },
      ],
    });
    const match = (await db.run(
      "INSERT INTO matches(mode,difficulty,round_time,word_set,status,practice_format,owner_user_id,custom_deck_id,custom_deck_snapshot) VALUES(?,?,?,?,?,?,?,?,?)",
      ["LAN Match", "Normal", 90, "Custom", "active", "word-phrase", teacher, deck, snapshot],
    )).lastID!;
    const saved = await db.get(
      "SELECT custom_deck_id, custom_deck_snapshot FROM matches WHERE id=?",
      match,
    );
    assert.equal(saved?.custom_deck_id, deck);
    assert.equal(saved?.custom_deck_snapshot, snapshot);

    await db.run("UPDATE custom_decks SET name=?, status='archived' WHERE id=?", "Renamed Deck", deck);
    await db.run("DELETE FROM custom_decks WHERE id=?", deck);
    assert.equal((await db.get("SELECT id FROM matches WHERE id=?", match))?.id, match);
    assert.equal((await db.get("SELECT custom_deck_id FROM matches WHERE id=?", match))?.custom_deck_id, null);
    assert.equal((await db.get("SELECT custom_deck_snapshot FROM matches WHERE id=?", match))?.custom_deck_snapshot, snapshot);

    await closeDatabase();
    db = await initializeDatabase();
    assert.equal((await db.get("SELECT COUNT(*) AS count FROM custom_deck_items"))?.count, 0);
    assert.equal((await db.get("SELECT id FROM matches WHERE id=?", match))?.id, match);
  } finally {
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});

test("existing SQLite database upgrades without losing records and initialization is repeatable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-custom-decks-upgrade-"));
  const dbPath = join(directory, "existing.db");
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_PATH = dbPath;
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  try {
    const legacy = await open({ filename: dbPath, driver: sqlite3.Database });
    await legacy.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar TEXT,
        tier TEXT DEFAULT 'Volt',
        role TEXT DEFAULT 'player',
        is_banned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        round_time INTEGER DEFAULT 90,
        word_set TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME
      );
      INSERT INTO users(username,email,password_hash,display_name,role)
      VALUES('legacy-teacher','legacy-teacher@example.test','test-only','Legacy Teacher','teacher');
      INSERT INTO matches(mode,difficulty,round_time,word_set,status)
      VALUES('LAN Match','Normal',90,'General','completed');
    `);
    await legacy.close();

    let db = await initializeDatabase();
    const legacyMatch = await db.get("SELECT id, custom_deck_id, custom_deck_snapshot FROM matches WHERE id=1");
    assert.equal(legacyMatch?.custom_deck_id, null);
    assert.equal(legacyMatch?.custom_deck_snapshot, null);
    assert.equal((await db.get("SELECT username FROM users WHERE id=1"))?.username, "legacy-teacher");

    const matchColumns = await db.all<{ name: string }[]>("PRAGMA table_info(matches)");
    assert(matchColumns.some(column => column.name === "custom_deck_id"));
    assert(matchColumns.some(column => column.name === "custom_deck_snapshot"));
    const deckTable = await db.all<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('custom_decks','custom_deck_items')",
    );
    assert.deepEqual(new Set(deckTable.map(row => row.name)), new Set(["custom_decks", "custom_deck_items"]));

    await closeDatabase();
    db = await initializeDatabase();
    await closeDatabase();
    db = await initializeDatabase();
    assert.equal((await db.get("SELECT id FROM matches WHERE id=1"))?.id, 1);
  } finally {
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});
