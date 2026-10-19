import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { initializeDatabase, closeDatabase } from "../src/db.js";
import { generateToken } from "../src/auth.js";
import { attachLanServer } from "../src/lan.js";
import { validateClassroomConfig, createClassroomSequence } from "../src/classroomConfig.js";
import { SENTENCE_BANK, getCategorySentences, type PracticeFormat } from "../src/sentenceBank.js";
import { WORD_BANK } from "../src/wordBank.js";
import { ClassroomFormatSelect } from "../../src/components/ClassroomFormatSelect.js";

class Peer {
  readonly messages: any[] = [];
  private constructor(readonly socket: WebSocket) {
    socket.on("message", raw => this.messages.push(JSON.parse(raw.toString())));
  }
  static async open(url: string) {
    const peer = new Peer(new WebSocket(url)); await once(peer.socket, "open"); return peer;
  }
  send(message: object) { this.socket.send(JSON.stringify(message)); }
  async wait(type: string, predicate: (message: any) => boolean = () => true) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const index = this.messages.findIndex(message => message.type === type && predicate(message));
      if (index >= 0) return this.messages.splice(index, 1)[0];
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Missing ${type}: ${JSON.stringify(this.messages.filter(m => m.type === "error"))}`);
  }
}

const defaults = { wordSet: "General", difficulty: "Normal", roundTime: 30, background: "blues" };

test("format validation preserves legacy defaults and rejects unknown categories/formats and unverified Gregg crops", () => {
  assert.equal(validateClassroomConfig(defaults).practiceFormat, "word-phrase");
  for (const input of [
    { ...defaults, wordSet: "invented" }, { ...defaults, practiceFormat: "sentences" },
    { ...defaults, practiceFormat: "" }, { ...defaults, wordSet: "Stenography", practiceFormat: "word-phrase" },
    { ...defaults, wordSet: "Stenography", practiceFormat: "full-sentence", greggSubmode: "word-phrase" },
  ]) assert.throws(() => validateClassroomConfig(input));
  const gregg = validateClassroomConfig({ ...defaults, wordSet: "Stenography", practiceFormat: "full-sentence" });
  assert.equal(gregg.wordSet, "stenography"); assert.equal(gregg.greggSubmode, "full-sentence");
  assert.deepEqual(createClassroomSequence(gregg), ["steno-6", "steno-7", "steno-8", "steno-9", "steno-10"]);
  for (const wordSet of Object.keys(SENTENCE_BANK)) for (const difficulty of ["Easy", "Normal", "Hard"]) {
    const word = createClassroomSequence(validateClassroomConfig({ ...defaults, wordSet, difficulty }));
    assert(word.length > 0); assert(word.every(item => WORD_BANK[wordSet as keyof typeof SENTENCE_BANK].includes(item)));
    const sentence = createClassroomSequence(validateClassroomConfig({ ...defaults, wordSet, difficulty, practiceFormat: "full-sentence" }));
    assert.deepEqual(sentence, getCategorySentences(wordSet));
  }
});

test("teacher format selector offers both formats; students cannot edit; Gregg word option is disabled", () => {
  const render = (disabled: boolean, stenography: boolean, value: PracticeFormat) => renderToStaticMarkup(
    createElement(ClassroomFormatSelect, { value, disabled, stenography, onChange: () => {} }));
  const teacher = render(false, false, "word-phrase");
  assert(teacher.includes("Word / Phrase")); assert(teacher.includes("Full Sentence"));
  assert(!teacher.includes("disabled" + '=""'));
  const student = render(true, false, "full-sentence");
  assert.match(student, /<select[^>]*disabled/); assert.match(student, /value="full-sentence" selected/);
  const gregg = render(false, true, "full-sentence");
  assert.match(gregg, /<option[^>]*value="word-phrase"[^>]*disabled/);
  assert.match(gregg, /await verification/);
});

test("classroom formats: real sockets share teacher content, retain format on reconnect, and save ranked SQLite results", { timeout: 90_000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-classroom-formats-"));
  process.env.DATABASE_PROVIDER = "sqlite"; process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();
  const accounts: { id: number; token: string }[] = [];
  for (let index = 0; index < 3; index++) {
    const role = index === 0 ? "teacher" : "student";
    const id = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES (?,?,?,?,?,1)",
      `formats-${index}`, `formats-${index}@example.test`, "test-only", `Formats ${index}`, role)).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES (?)", id);
    accounts.push({ id, token: generateToken({ userId: id, username: `formats-${index}`, role }) });
  }
  const server = createServer(); const lan = attachLanServer(server); const peers: Peer[] = [];
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert(address && typeof address !== "string");
    const open = async () => { const peer = await Peer.open(`ws://127.0.0.1:${address.port}/ws`); peers.push(peer); return peer; };
    await t.test("invalid create returns explicit error without storing a match", async () => {
      const host = await open();
      host.send({ type: "create_room", token: accounts[0].token, ...defaults, wordSet: "Stenography", practiceFormat: "word-phrase" });
      const error = await host.wait("error", m => m.code === "INVALID_MATCH_CONFIG"); assert.match(error.message, /await verification/);
      assert.equal((await db.get("SELECT COUNT(*) AS count FROM matches")).count, 0); host.socket.terminate();
    });
    for (const wordSet of [...Object.keys(SENTENCE_BANK), "stenography"]) {
      const formats: PracticeFormat[] = wordSet === "stenography" ? ["full-sentence"] : ["word-phrase", "full-sentence"];
      for (const practiceFormat of formats) await t.test(`${wordSet}: ${practiceFormat}`, async () => {
        const host = await open(); const student = await open(); let second = await open();
        // Create in the other format, then exercise the teacher's existing update event.
        host.send({ type: "create_room", token: accounts[0].token, ...defaults,
          wordSet: wordSet === "stenography" ? "general" : wordSet,
          practiceFormat: practiceFormat === "word-phrase" ? "full-sentence" : "word-phrase" });
        const roomCode = (await host.wait("room_created")).roomCode;
        const match = await db.get("SELECT id FROM matches ORDER BY id DESC LIMIT 1");
        for (const [peer, index] of [[student, 1], [second, 2]] as const) {
          peer.send({ type: "join_room", roomCode, token: accounts[index].token }); await peer.wait("room_joined");
        }
        host.send({ type: "update_match_config", token: accounts[0].token, ...defaults, wordSet, practiceFormat });
        const state = await student.wait("room_state", m => m.matchConfig.practiceFormat === practiceFormat && m.matchConfig.wordSet === wordSet);
        assert.equal(state.maxStudents, 50);
        student.send({ type: "update_match_config", token: accounts[1].token, ...defaults, practiceFormat: "invented" });
        await student.wait("error", m => /Only the teacher/.test(m.message));
        host.send({ type: "update_match_config", token: accounts[0].token, practiceFormat: "invented" });
        await host.wait("error", m => m.code === "INVALID_MATCH_CONFIG");
        for (const peer of [student, second]) peer.send({ type: "ready" });
        await host.wait("room_state", m => {
          const students = m.players.filter((p: any) => !p.isHost);
          return students.length === 2 && students.every((p: any) => p.ready);
        });
        host.send({ type: "start_game" });
        const start = await host.wait("room_started");
        assert.equal(start.matchConfig.practiceFormat, practiceFormat); assert.equal(start.matchConfig.wordSet, wordSet);
        for (const peer of [student, second]) assert.deepEqual((await peer.wait("room_started")).wordSequence, start.wordSequence);
        assert(start.wordSequence.length > 0);
        if (wordSet === "stenography") {
          assert.equal(start.matchConfig.greggSubmode, "full-sentence");
          assert.deepEqual(start.wordSequence, ["steno-6", "steno-7", "steno-8", "steno-9", "steno-10"]);
        } else if (practiceFormat === "full-sentence") assert.deepEqual(start.wordSequence, getCategorySentences(wordSet));
        else assert(start.wordSequence.every((word: string) => WORD_BANK[wordSet as keyof typeof SENTENCE_BANK].includes(word)));
        host.send({ type: "update_match_config", token: accounts[0].token, practiceFormat: "word-phrase" });
        await host.wait("error", m => /cannot change/.test(m.message));
        second.socket.terminate(); second = await open();
        second.send({ type: "join_room", roomCode, token: accounts[2].token, practiceFormat: "invented" });
        await second.wait("room_joined"); const resumed = await second.wait("room_started");
        assert.deepEqual(resumed.matchConfig, start.matchConfig); assert.deepEqual(resumed.wordSequence, start.wordSequence);
        student.send({ type: "score_update", roomCode, score: 20, wpm: 40, accuracy: 95, completedWords: 1, lives: 3, finished: false });
        const rank = await student.wait("rank_update", m => m.score === 20); assert.equal(rank.rank, 1);
        student.send({ type: "score_update", roomCode, score: 20, wpm: 40, accuracy: 95, completedWords: 1, lives: 3, finished: true });
        second.send({ type: "score_update", roomCode, score: 10, wpm: 30, accuracy: 90, completedWords: 1, lives: 3, finished: true });
        const results = await host.wait("classroom_results"); assert.equal(results.players.length, 2);
        assert.equal(results.players[0].userId, accounts[1].id);
        const saved = await db.get("SELECT practice_format,status FROM matches WHERE id = ?", match.id);
        assert.equal(saved.practice_format, practiceFormat); assert.equal(saved.status, "completed");
        const rows = await db.all("SELECT position FROM match_participants WHERE match_id = ? AND position IS NOT NULL ORDER BY position", match.id);
        assert.deepEqual(rows, [{ position: 1 }, { position: 2 }]);
        host.send({ type: "cancel_room", token: accounts[0].token }); await host.wait("room_cancelled");
      });
    }
  } finally {
    for (const peer of peers) peer.socket.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase(); await rm(directory, { recursive: true, force: true });
  }
});
