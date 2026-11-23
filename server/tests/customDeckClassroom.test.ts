import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";
import { initializeDatabase, closeDatabase } from "../src/db.js";
import { generateToken } from "../src/auth.js";
import { attachLanServer } from "../src/lan.js";
import { socketOptions } from "./cookieFixtures.js";

class Peer {
  readonly messages: any[] = [];
  private constructor(readonly socket: WebSocket) {
    socket.on("message", (raw) => this.messages.push(JSON.parse(raw.toString())));
  }
  static async open(url: string, token: string) {
    const peer = new Peer(new WebSocket(url, socketOptions(token)));
    await once(peer.socket, "open");
    return peer;
  }
  send(message: object) {
    this.socket.send(JSON.stringify(message));
  }
  async wait(type: string, predicate: (message: any) => boolean = () => true) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const index = this.messages.findIndex((message) => message.type === type && predicate(message));
      if (index >= 0) return this.messages.splice(index, 1)[0];
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Missing ${type}`);
  }
}

test("custom deck classroom selection is private, snapshot-based and shared by students", { timeout: 60_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-custom-deck-classroom-"));
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();

  const createUser = async (username: string, role: "teacher" | "student") => {
    const id = (await db.run(
      "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
      username,
      `${username}@example.test`,
      "test-only",
      username,
      role,
    )).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", id);
    return { id, token: generateToken({ userId: id, username, role }) };
  };

  const owner = await createUser("deck-host", "teacher");
  const otherTeacher = await createUser("deck-other", "teacher");
  const studentA = await createUser("deck-student-a", "student");
  const studentB = await createUser("deck-student-b", "student");

  const ownedDeck = (await db.run(
    "INSERT INTO custom_decks(teacher_user_id,name,practice_format,status) VALUES(?,?,?,?)",
    owner.id,
    "Classroom Office",
    "word-phrase",
    "active",
  )).lastID!;
  await db.run("INSERT INTO custom_deck_items(deck_id,prompt,answer,sort_order) VALUES(?,?,?,?)", ownedDeck, null, "invoice", 0);
  await db.run("INSERT INTO custom_deck_items(deck_id,prompt,answer,sort_order) VALUES(?,?,?,?)", ownedDeck, "Review this", "memo", 1);

  const foreignDeck = (await db.run(
    "INSERT INTO custom_decks(teacher_user_id,name,practice_format,status) VALUES(?,?,?,?)",
    otherTeacher.id,
    "Private Teacher Deck",
    "full-sentence",
    "active",
  )).lastID!;
  await db.run("INSERT INTO custom_deck_items(deck_id,prompt,answer,sort_order) VALUES(?,?,?,?)", foreignDeck, null, "Only the other teacher should use this.", 0);

  const archivedDeck = (await db.run(
    "INSERT INTO custom_decks(teacher_user_id,name,practice_format,status) VALUES(?,?,?,?)",
    owner.id,
    "Archived Deck",
    "word-phrase",
    "archived",
  )).lastID!;
  await db.run("INSERT INTO custom_deck_items(deck_id,prompt,answer,sort_order) VALUES(?,?,?,?)", archivedDeck, null, "archived", 0);

  const server = createServer();
  const lan = attachLanServer(server);
  const peers: Peer[] = [];
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    const url = `ws://127.0.0.1:${address.port}/ws`;

    const host = await Peer.open(url, owner.token);
    const studentOne = await Peer.open(url, studentA.token);
    const studentTwo = await Peer.open(url, studentB.token);
    peers.push(host, studentOne, studentTwo);

    host.send({ type: "create_room", mode: "LAN Match", wordSet: "general", practiceFormat: "word-phrase", difficulty: "Normal", roundTime: 30, background: "blues" });
    const roomCode = (await host.wait("room_created")).roomCode;
    for (const student of [studentOne, studentTwo]) {
      student.send({ type: "join_room", roomCode });
      await student.wait("room_joined");
    }

    host.send({ type: "update_match_config", wordSet: "general", practiceFormat: "word-phrase", customDeckId: foreignDeck });
    await host.wait("error", (message) => /belongs to another teacher/.test(message.message));

    host.send({ type: "update_match_config", wordSet: "general", practiceFormat: "word-phrase", customDeckId: archivedDeck });
    await host.wait("error", (message) => /Archived/.test(message.message));

    host.send({ type: "update_match_config", wordSet: "general", practiceFormat: "word-phrase", customDeckId: 999999 });
    await host.wait("error", (message) => /not found/.test(message.message));

    host.send({
      type: "update_match_config",
      wordSet: "general",
      practiceFormat: "word-phrase",
      customDeckId: ownedDeck,
    });
    const selectedState = await studentOne.wait("room_state", (message) => message.matchConfig?.customDeckId === ownedDeck);
    assert.equal(selectedState.matchConfig.customDeckName, "Classroom Office");

    studentOne.send({ type: "update_match_config", customDeckId: foreignDeck });
    await studentOne.wait("error", (message) => /Only the teacher/.test(message.message));

    for (const student of [studentOne, studentTwo]) student.send({ type: "ready" });
    await host.wait("room_state", (message) => message.players.filter((player: any) => !player.isHost).every((player: any) => player.ready));
    host.send({ type: "start_game" });

    const hostStart = await host.wait("room_started");
    const studentOneStart = await studentOne.wait("room_started");
    const studentTwoStart = await studentTwo.wait("room_started");
    assert.deepEqual(hostStart.wordSequence, ["invoice", "memo"]);
    assert.deepEqual(studentOneStart.wordSequence, hostStart.wordSequence);
    assert.deepEqual(studentTwoStart.wordSequence, hostStart.wordSequence);
    assert.equal(hostStart.matchConfig.customDeckName, "Classroom Office");

    const match = await db.get("SELECT id, custom_deck_id, custom_deck_snapshot FROM matches WHERE owner_user_id=? ORDER BY id DESC LIMIT 1", owner.id);
    assert.equal(match.custom_deck_id, ownedDeck);
    const snapshotBeforeEdit = match.custom_deck_snapshot;
    assert(snapshotBeforeEdit);
    assert(snapshotBeforeEdit.includes('"answer":"invoice"'));

    await db.run("UPDATE custom_deck_items SET answer='changed-after-start' WHERE deck_id=? AND sort_order=0", ownedDeck);
    await db.run("DELETE FROM custom_decks WHERE id=?", ownedDeck);
    const matchAfterDelete = await db.get("SELECT custom_deck_id, custom_deck_snapshot FROM matches WHERE id=?", match.id);
    assert.equal(matchAfterDelete.custom_deck_id, null);
    assert.equal(matchAfterDelete.custom_deck_snapshot, snapshotBeforeEdit);

    host.send({ type: "cancel_room" });
    await host.wait("room_cancelled");
  } finally {
    for (const peer of peers) peer.socket.terminate();
    await new Promise<void>((resolve) => lan.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});
