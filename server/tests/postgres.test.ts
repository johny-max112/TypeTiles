import { cookieAuthChecks } from "./cookieAuthChecks.js";
import { socketOptions } from "./cookieFixtures.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import express from "express";
import { WebSocket } from "ws";
import { PGlite } from "@electric-sql/pglite";
import { initializeDatabase, closeDatabase, databaseTransaction } from "../src/db.js";
import { postgresConfig, postgresQuery, postgresTransaction } from "../src/postgresDatabase.js";
import type { DatabasePool, DatabaseQueryResult } from "../src/databaseTypes.js";
import { EmailVerificationService } from "../src/emailVerification.js";
import { PasswordResetService } from "../src/passwordReset.js";
import { createAuthRouter } from "../src/routes/auth.js";
import { createPasswordResetRouter } from "../src/routes/passwordReset.js";
import matchesRoutes from "../src/routes/matches.js";
import leaderboardRoutes from "../src/routes/leaderboard.js";
import adminRoutes from "../src/routes/admin.js";
import feedbackRoutes from "../src/routes/feedback.js";
import { generateToken } from "../src/auth.js";
import { attachLanServer } from "../src/lan.js";
import { authorizationChecks } from "./authorizationChecks.js";
import { registrationRoleChecks } from "./registrationRoleChecks.js";
import { userDeletionChecks } from "./userDeletionChecks.js";
import { resultIntegrityChecks } from "./resultIntegrityChecks.js";
import { teacherProgressChecks } from "./teacherProgressChecks.js";
import { classroomReliabilityChecks } from "./classroomReliabilityChecks.js";
import { adminDashboardChecks } from "./adminDashboardChecks.js";
import customDeckRoutes from "../src/routes/customDecks.js";

test("classroom ownership migration preserves legacy accounts/results and is idempotent", async () => {
  const engine = new PGlite();
  try {
    await engine.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await engine.exec(await readFile(new URL("../../supabase/migrations/20261018000100_initial_type_tiles.sql", import.meta.url), "utf8"));
    await engine.exec(`INSERT INTO users(username,email,password_hash,display_name,role,email_verified)
      VALUES('legacy-teacher','legacy-teacher@example.test','test-only','Teacher','teacher',1),
            ('legacy-admin','legacy-admin@example.test','test-only','Admin','admin',1);
      INSERT INTO matches(mode,difficulty,word_set,status) VALUES('LAN Match','Normal','General','completed');
      INSERT INTO match_participants(match_id,user_id,score,wpm,accuracy) VALUES(1,1,123,45,98);`);
    const users = (await engine.query("SELECT * FROM users ORDER BY id")).rows;
    const participants = (await engine.query("SELECT * FROM match_participants ORDER BY id")).rows;
    const match = (await engine.query("SELECT * FROM matches WHERE id=1")).rows[0];
    const migration = await readFile(new URL("../../supabase/migrations/20261108000100_classroom_ownership.sql", import.meta.url), "utf8");
    await engine.exec(migration); await engine.exec(migration);
    assert.deepEqual((await engine.query("SELECT * FROM users ORDER BY id")).rows, users);
    assert.deepEqual((await engine.query("SELECT * FROM match_participants ORDER BY id")).rows, participants);
    const { owner_user_id, ...preserved } = (await engine.query("SELECT * FROM matches WHERE id=1")).rows[0];
    assert.equal(owner_user_id, null); assert.deepEqual(preserved, match);
  } finally { await engine.close(); }
});

test("custom deck PostgreSQL migration is additive, snapshot-safe and idempotent", async () => {
  const engine = new PGlite();
  try {
    await engine.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await engine.exec(await readFile(new URL("../../supabase/migrations/20261018000100_initial_type_tiles.sql", import.meta.url), "utf8"));
    await engine.exec(await readFile(new URL("../../supabase/migrations/20261108000100_classroom_ownership.sql", import.meta.url), "utf8"));
    await engine.exec(`INSERT INTO users(username,email,password_hash,display_name,role,email_verified)
      VALUES('deck-teacher','deck-teacher@example.test','test-only','Deck Teacher','teacher',1);
      INSERT INTO matches(mode,difficulty,word_set,status)
      VALUES('LAN Match','Normal','General','completed');`);
    const legacyMatch = (await engine.query("SELECT * FROM matches WHERE id=1")).rows[0];

    const migration = await readFile(new URL("../../supabase/migrations/20261123000100_custom_decks.sql", import.meta.url), "utf8");
    await engine.exec(migration);
    await engine.exec(migration);

    const marker = await engine.query(
      "SELECT version FROM public.typetiles_schema_migrations WHERE version='20261123000100'",
    );
    assert.equal(marker.rows.length, 1);

    const teacher = (await engine.query("SELECT id FROM users WHERE username='deck-teacher'")).rows[0].id;
    const deck = (await engine.query(
      "INSERT INTO custom_decks(teacher_user_id,name,practice_format,status) VALUES($1,'Office Terms','word-phrase','active') RETURNING id",
      [teacher],
    )).rows[0].id;
    await engine.query(
      "INSERT INTO custom_deck_items(deck_id,prompt,answer,sort_order) VALUES($1,NULL,'invoice',0),($1,'Review the memo','memo',1)",
      [deck],
    );
    const items = (await engine.query(
      "SELECT prompt,answer,sort_order FROM custom_deck_items WHERE deck_id=$1 ORDER BY sort_order",
      [deck],
    )).rows;
    assert.deepEqual(items, [
      { prompt: null, answer: "invoice", sort_order: 0 },
      { prompt: "Review the memo", answer: "memo", sort_order: 1 },
    ]);

    const snapshot = JSON.stringify({ name: "Office Terms", items: [{ answer: "invoice" }, { answer: "memo" }] });
    await engine.query(
      "UPDATE matches SET custom_deck_id=$1,custom_deck_snapshot=$2::jsonb WHERE id=1",
      [deck, snapshot],
    );
    await engine.query("DELETE FROM custom_decks WHERE id=$1", [deck]);
    const preserved = (await engine.query("SELECT * FROM matches WHERE id=1")).rows[0];
    assert.equal(preserved.custom_deck_id, null);
    assert.equal(preserved.mode, legacyMatch.mode);
    assert.equal(preserved.word_set, legacyMatch.word_set);
    assert.equal(preserved.status, legacyMatch.status);
    assert.deepEqual(preserved.custom_deck_snapshot, JSON.parse(snapshot));
  } finally {
    await engine.close();
  }
});

test("onboarding PostgreSQL migration leaves legacy accounts unenrolled", async () => {
  const engine = new PGlite();
  try {
    await engine.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await engine.exec(await readFile(new URL("../../supabase/migrations/20261018000100_initial_type_tiles.sql", import.meta.url), "utf8"));
    await engine.exec(`INSERT INTO users(username,email,password_hash,display_name,role,email_verified)
      VALUES('legacy-student','legacy-student@example.test','test-only','Legacy Student','student',1)`);
    const migration = await readFile(new URL("../../supabase/migrations/20261124000100_first_time_user_onboarding.sql", import.meta.url), "utf8");
    await engine.exec(migration);
    await engine.exec(migration);
    assert.equal((await engine.query("SELECT count(*)::int AS count FROM user_onboarding")).rows[0].count, 0);
    assert.equal((await engine.query(
      "SELECT version FROM public.typetiles_schema_migrations WHERE version='20261124000100'",
    )).rows.length, 1);
  } finally {
    await engine.close();
  }
});

test("PostgreSQL query binding and TLS configuration preserve API types", () => {
  assert.equal(postgresQuery("SELECT '?' AS literal, \"?\", $$?$$, $tag$?$tag$, ? -- ?\n, ? /* ? /* ? */ ? */"),
    "SELECT '?' AS literal, \"?\", $$?$$, $tag$?$tag$, $1 -- ?\n, $2 /* ? /* ? */ ? */");
  assert.throws(() => postgresConfig({ DATABASE_URL: "psql -h bad" }), /connection URI/);
  const config = postgresConfig({ DATABASE_URL: "postgresql://user:secret@example.test/db?sslmode=require" });
  assert.equal(config.max, 5);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert(!config.connectionString!.includes("sslmode"));
  assert.equal(config.types!.getTypeParser(20)("1780000000000"), 1780000000000);
  assert.equal(config.types!.getTypeParser(20)("50"), 50);
  assert.throws(() => config.types!.getTypeParser(20)("9007199254740993"), /safe range/);
  assert.equal(config.types!.getTypeParser(1184)("2026-10-18 10:00:00+00"), "2026-10-18T10:00:00.000Z");
  assert.throws(() => postgresConfig({ DATABASE_URL: "postgresql://user:secret@example.test/db?sslmode=disable" }), /TLS/);
});

test("PostgreSQL auth transactions use a dedicated client and release after rollback", async () => {
  const commands: string[] = [];
  const pool: DatabasePool = {
    query: async () => { throw new Error("Transaction used pool.query"); },
    end: async () => {},
    connect: async () => ({
      query: async (sql) => { commands.push(sql); return { rows: [], rowCount: 0 }; },
      release: () => { commands.push("RELEASE"); },
    }),
  };
  await assert.rejects(() => postgresTransaction(pool, async (db) => {
    await db.run("UPDATE users SET session_version = session_version + 1 WHERE id = ?", 1);
    throw new Error("intentional rollback");
  }), /intentional rollback/);
  assert.deepEqual(commands, ["BEGIN", "SET LOCAL lock_timeout = '10s'", "SELECT pg_advisory_xact_lock(548911, 2)",
    "UPDATE users SET session_version = session_version + 1 WHERE id = $1", "ROLLBACK", "RELEASE"]);
});

test("PostgreSQL engine: registration, recovery, Solo/history, admin and LAN persistence", { timeout: 60_000 }, async (t) => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.PASSWORD_RESET_SECRET = randomBytes(32).toString("hex");
  process.env.EMAIL_VERIFICATION_SECRET = randomBytes(32).toString("hex");
  const engine = new PGlite();
  await engine.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
  const migration = await readFile(new URL("../../supabase/migrations/20261018000100_initial_type_tiles.sql", import.meta.url), "utf8");
  await engine.exec(migration);
  const ownershipMigration = await readFile(new URL("../../supabase/migrations/20261108000100_classroom_ownership.sql", import.meta.url), "utf8");
  await engine.exec(ownershipMigration);
  await engine.exec(ownershipMigration);
  const customDecksMigration = await readFile(new URL("../../supabase/migrations/20261123000100_custom_decks.sql", import.meta.url), "utf8");
  await engine.exec(customDecksMigration);
  await engine.exec(customDecksMigration);
  const onboardingMigration = await readFile(new URL("../../supabase/migrations/20261124000100_first_time_user_onboarding.sql", import.meta.url), "utf8");
  await engine.exec(onboardingMigration);
  await engine.exec(onboardingMigration);
  // PGlite has one engine connection. Lease it exclusively for auth transactions.
  // Real deployed locking is provided by PostgreSQL's transaction advisory lock.
  let tail = Promise.resolve();
  async function lease() {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    return release;
  }
  async function query(sql: string, values?: any[]): Promise<DatabaseQueryResult> {
    const result = await engine.query<Record<string, any>>(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  }
  const pool: DatabasePool = {
    query: async (sql, values) => { const release = await lease(); try { return await query(sql, values); } finally { release(); } },
    connect: async () => { const release = await lease(); return { query, release }; },
    end: () => engine.close(),
  };
  const db = await initializeDatabase({ postgresPool: pool });
  const mail: { to: string; code: string }[] = [];
  const resetMail: { to: string; code: string }[] = [];
  const verification = new EmailVerificationService(async (to, code) => { mail.push({ to, code }); return { id: "mock" }; });
  const recovery = new PasswordResetService(async (to, code) => { resetMail.push({ to, code }); return { id: "mock" }; });
  const app = express(); app.use(express.json());
  app.use("/api/auth", createPasswordResetRouter(recovery), createAuthRouter(verification));
  app.use("/api", matchesRoutes, leaderboardRoutes);
  app.use("/api", customDeckRoutes);
  app.use("/api/admin", adminRoutes); app.use("/api/feedback", feedbackRoutes);
  const server = createServer(app); const lan = attachLanServer(server); const sockets: WebSocket[] = [];
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const request = async (path: string, body?: object, token?: string, method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE") => {
    const response = await fetch(base + path, { method: method ?? (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173", "X-TypeTiles-Request": "1", ...(token ? { cookie: `typetiles_session=${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json(), sessionToken: response.headers.get("set-cookie")?.match(/(?:^|,\s*)typetiles_session=([^;]+)/)?.[1] };
  };
  let token = "";
  let studentId = 0;
  try {
    await t.test("register pending account, verify once, login; transaction rollback and safe migration re-run", async () => {
      assert.equal((await request("/auth/register", { username: "pg-student", email: "pg-student@example.test", password: "old-password", displayName: "Student" })).status, 201);
      assert.equal(mail.length, 1);
      assert.equal((await request("/auth/login", { username: "pg-student", password: "old-password" })).status, 403);
      assert.equal((await request("/auth/verify-email", { email: mail[0].to, code: mail[0].code })).status, 200);
      assert.equal((await request("/auth/verify-email", { email: mail[0].to, code: mail[0].code })).status, 400);
      const login = await request("/auth/login", { username: "pg-student", password: "old-password" });
      assert.equal(login.status, 200); token = login.sessionToken; studentId = login.body.user.id;
      const profile = await request("/auth/me", undefined, token);
      assert.equal(profile.body.user.onboardingStatus, "eligible");
      const saved = await request("/auth/me/onboarding", { status: "skipped" }, token, "PATCH");
      assert.equal(saved.body.status, "skipped");
      assert.equal((await request("/auth/me", undefined, token)).body.user.onboardingStatus, "skipped");
      const user = await db.get("SELECT * FROM users WHERE id = ?", studentId);
      assert(user.email_verified_at > 1_000_000_000_000);
      await assert.rejects(() => databaseTransaction(async (transaction) => {
        await transaction.run("UPDATE users SET display_name = ? WHERE id = ?", "rolled-back", studentId);
        throw new Error("rollback");
      }), /rollback/);
      assert.equal((await db.get("SELECT display_name FROM users WHERE id = ?", studentId)).display_name, "Student");
      await engine.exec(migration);
      assert.equal((await db.get("SELECT count(*) AS count FROM users")).count, 1);
    });
    await t.test("PostgreSQL custom deck API ownership, ordering, archive and snapshot safety", async () => {
      assert.equal((await request("/custom-decks", undefined, token)).status, 403);
      const teacherId = (await db.run(
        "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
        "pg-deck-owner", "pg-deck-owner@example.test", "unused-test-only", "Deck Owner", "teacher",
      )).lastID!;
      const otherTeacherId = (await db.run(
        "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
        "pg-deck-other", "pg-deck-other@example.test", "unused-test-only", "Other Deck Teacher", "teacher",
      )).lastID!;
      const teacherToken = generateToken({ userId: teacherId, username: "pg-deck-owner", role: "teacher" });
      const otherToken = generateToken({ userId: otherTeacherId, username: "pg-deck-other", role: "teacher" });

      const created = await request("/custom-decks", {
        name: "PostgreSQL Terms",
        practiceFormat: "word-phrase",
        entries: [
          { answer: "invoice" },
          { prompt: "Review the memo", answer: "memo" },
        ],
      }, teacherToken);
      assert.equal(created.status, 201);
      const deckId = created.body.deck.id;
      assert.deepEqual(
        created.body.deck.entries.map((entry: any) => [entry.answer, entry.sort_order]),
        [["invoice", 0], ["memo", 1]],
      );

      assert.equal((await request(`/custom-decks/${deckId}`, undefined, otherToken)).status, 404);
      assert.equal((await request(`/custom-decks/${deckId}`, { name: "Unauthorized" }, otherToken, "PUT")).status, 404);
      assert.equal((await request(`/custom-decks/${deckId}/archive`, undefined, otherToken, "POST")).status, 404);

      const snapshot = { name: "PostgreSQL Terms", entries: ["invoice", "memo"] };
      const matchId = (await db.run(
        "INSERT INTO matches(mode,difficulty,round_time,word_set,status,practice_format,owner_user_id,custom_deck_id,custom_deck_snapshot) VALUES(?,?,?,?,?,?,?,?,?)",
        ["LAN Match", "Normal", 90, "Custom", "active", "word-phrase", teacherId, deckId, JSON.stringify(snapshot)],
      )).lastID!;

      const updated = await request(`/custom-decks/${deckId}`, {
        name: "Updated PostgreSQL Terms",
        entries: [
          { answer: "second", sort_order: 2 },
          { answer: "first", sort_order: 1 },
        ],
      }, teacherToken, "PATCH");
      assert.equal(updated.status, 200);
      assert.deepEqual(
        updated.body.deck.entries.map((entry: any) => [entry.answer, entry.sort_order]),
        [["first", 0], ["second", 1]],
      );

      const archived = await request(`/custom-decks/${deckId}/archive`, undefined, teacherToken, "POST");
      assert.equal(archived.status, 200);
      assert.equal(archived.body.deck.status, "archived");

      const deleted = await request(`/custom-decks/${deckId}`, undefined, teacherToken, "DELETE");
      assert.equal(deleted.status, 200);
      const match = await db.get("SELECT custom_deck_id, custom_deck_snapshot FROM matches WHERE id=?", matchId);
      assert.equal(match?.custom_deck_id, null);
      assert.deepEqual(match?.custom_deck_snapshot, snapshot);
      await db.run("DELETE FROM matches WHERE id=?", matchId);
      await db.run("DELETE FROM users WHERE id IN (?, ?)", teacherId, otherTeacherId);
    });
    await t.test("sentence results, decimal WPM, leaderboard, history and protected teacher/admin views", async () => {
      const created = await request("/matches", { mode: "Solo Practice", difficulty: "Normal", roundTime: 60, wordSet: "General", practiceFormat: "full-sentence" }, token);
      assert.equal(created.status, 201); assert.equal(typeof created.body.matchId, "number");
      assert.equal((await request(`/matches/${created.body.matchId}/submit`, { score: 10, wpm: 48.75, accuracy: 98, completedWords: 1, endReason: "time", remainingLives: 3 }, token)).status, 200);
      const history = await request("/users/history", undefined, token);
      assert.equal(history.body.history.length, 1); assert.equal(history.body.history[0].wpm, 48.75);
      assert.equal(history.body.history[0].practice_format, "full-sentence");
      assert.equal((await request("/leaderboard")).body.leaderboard[0].best_wpm, 48.75);
      assert.equal((await request("/teacher/matches", undefined, token)).status, 403);
      assert.equal((await request("/admin/dashboard/stats", undefined, token)).status, 403);
      const adminId = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)", "pg-admin", "pg-admin@example.test", "unused-test-only", "Admin", "admin")).lastID!;
      const adminToken = generateToken({ userId: adminId, username: "pg-admin", role: "admin" });
      const stats = await request("/admin/dashboard/stats", undefined, adminToken); assert.equal(stats.status, 200); assert.equal(stats.body.totalUsers, 2);
      await adminDashboardChecks(db, base);
      const search = await request("/admin/users?search=PG-STUDENT", undefined, adminToken); assert.equal(search.body.users.length, 1);
      assert.equal((await request("/feedback", { message: "Postgres feedback" }, token)).status, 201);
    });
    await t.test("password recovery preserves single use and invalidates prior tokens", async () => {
      await recovery.forgot("pg-student@example.test", "test-ip"); assert.equal(resetMail.length, 1);
      const results = await Promise.all([
        recovery.reset(resetMail[0].to, resetMail[0].code, "new-password", "test-ip"),
        recovery.reset(resetMail[0].to, resetMail[0].code, "new-password", "test-ip"),
      ]);
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal((await request("/auth/me", undefined, token)).status, 401);
      assert.equal((await request("/auth/login", { username: "pg-student", password: "old-password" })).status, 401);
      const login = await request("/auth/login", { username: "pg-student", password: "new-password" });
      assert.equal(login.status, 200); token = login.sessionToken;
    });
    await t.test("real WebSocket room saves all participants and teacher reports through PostgreSQL", async () => {
      const teacherId = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)", "pg-teacher", "teacher@example.test", "test-only", "Teacher", "teacher")).lastID!;
      const secondId = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)", "pg-second", "second@example.test", "test-only", "Second", "student")).lastID!;
      const teacherToken = generateToken({ userId: teacherId, username: "pg-teacher", role: "teacher" });
      const secondToken = generateToken({ userId: secondId, username: "pg-second", role: "student" });
      const inboxes: any[][] = [];
      const waitFor = async (index: number, type: string, predicate: (message: any) => boolean = () => true) => {
        for (let attempt = 0; attempt < 500; attempt++) {
          const at = inboxes[index].findIndex(message => message.type === type && predicate(message));
          if (at >= 0) return inboxes[index].splice(at, 1)[0];
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw new Error(`Missing ${type} on socket ${index}`);
      };
      for (let index = 0; index < 3; index++) {
        const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`, socketOptions([teacherToken, token, secondToken][index])); inboxes.push([]);
        socket.on("message", raw => inboxes[index].push(JSON.parse(raw.toString())));
        sockets.push(socket); await once(socket, "open");
      }
      const send = (index: number, message: object) => sockets[index].send(JSON.stringify(message));
      send(0, { type: "create_room", token: teacherToken, wordSet: "General", difficulty: "Easy", roundTime: 30 });
      const { roomCode } = await waitFor(0, "room_created");
      for (const [index, studentToken] of [[1, token], [2, secondToken]] as const) {
        send(index, { type: "join_room", roomCode, token: studentToken }); await waitFor(index, "room_joined");
        send(index, { type: "ready" }); await waitFor(index, "room_state", message => message.players.filter((p: any) => p.ready).length === index);
      }
      send(0, { type: "start_game" }); await waitFor(0, "room_started");
      send(1, { type: "score_update", roomCode, score: 20, wpm: 48.75, accuracy: 98, completedWords: 2, lives: 3, finished: true });
      await waitFor(0, "standings_update", message => message.players.some((p: any) => p.finished));
      send(2, { type: "score_update", roomCode, score: 0, wpm: 0, accuracy: 0, completedWords: 0, lives: 0, finished: true });
      const result = await waitFor(0, "classroom_results"); assert.equal(result.players.length, 2);
      const session = (await request("/teacher/matches", undefined, teacherToken)).body.sessions[0]; assert(session);
      const detail = await request(`/teacher/matches/${session.id}`, undefined, teacherToken);
      assert.equal(detail.body.match.status, "completed"); assert.equal(detail.body.participants.length, 2);
      assert(detail.body.participants.every((p: any) => p.participant_status === "Finished"));
      assert.equal((await db.get("SELECT games_played FROM user_stats WHERE user_id = ?", studentId)).games_played, 1);
      assert.equal((await request(`/teacher/matches/${session.id}`, undefined, token)).status, 403);
      await resultIntegrityChecks(db, base, session.id);
    });
    await t.test("PostgreSQL cookie login, CSRF, logout, throttling and WebSocket checks", async () => {
      await cookieAuthChecks(db, base + "/auth", `ws://127.0.0.1:${address.port}/ws`);
    });
    await t.test("PostgreSQL REST/WebSocket security checks", async () => {
      const address = server.address(); assert(address && typeof address !== "string");
      await authorizationChecks(db, `http://127.0.0.1:${address.port}/api`, `ws://127.0.0.1:${address.port}/ws`, sockets);
    });
    await t.test("PostgreSQL direct registration roles and verified classroom access", async () => {
      const address = server.address(); assert(address && typeof address !== "string");
      await registrationRoleChecks(db, `http://127.0.0.1:${address.port}/api`, `ws://127.0.0.1:${address.port}/ws`, sockets, mail);
    });
    await t.test("PostgreSQL Admin deletion, cascades, socket cleanup and re-registration", async () => {
      const address = server.address(); assert(address && typeof address !== "string");
      await userDeletionChecks(db, `http://127.0.0.1:${address.port}/api`, `ws://127.0.0.1:${address.port}/ws`, sockets);
    });
    await t.test("PostgreSQL teacher-specific student progress and isolation", async () => {
      await teacherProgressChecks(db, base);
    });
    await t.test("PostgreSQL cancellation, atomic finalization and retry safety", async () => {
      await classroomReliabilityChecks(db, base, `ws://127.0.0.1:${address.port}/ws`, sockets, "postgres");
    });
  } finally {
    for (const socket of sockets) socket.terminate();
    for (const socket of lan.clients) socket.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase();
  }
});
