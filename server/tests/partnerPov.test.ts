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
import { attachLanServer, buildPartnerPairs } from "../src/lan.js";
import { socketOptions } from "./cookieFixtures.js";

class Peer {
  readonly messages: any[] = [];
  private constructor(readonly socket: WebSocket) {
    socket.on("message", raw => this.messages.push(JSON.parse(raw.toString())));
  }
  static async open(url: string, token: string) {
    const peer = new Peer(new WebSocket(url, socketOptions(token)));
    await once(peer.socket, "open");
    return peer;
  }
  send(message: object) { this.socket.send(JSON.stringify(message)); }
  async wait(type: string, predicate: (message: any) => boolean = () => true) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const index = this.messages.findIndex(message => message.type === type && predicate(message));
      if (index >= 0) return this.messages.splice(index, 1)[0];
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Missing ${type}`);
  }
}

test("partner pairing uses stable consecutive join order and leaves an odd student unpaired", () => {
  assert.deepEqual([...buildPartnerPairs([101, 102, 103, 104])], [[101, 102], [102, 101], [103, 104], [104, 103]]);
  const pairs = buildPartnerPairs([101, 102, 103]);
  assert.equal(pairs.has(103), false);
  assert.equal(pairs.get(101), 102);
  assert.equal(pairs.get(102), 101);
});

test("rapid classroom cancellation and recreation keeps room codes isolated", { timeout: 60_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-room-recreate-"));
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();
  const peers: Peer[] = [];
  const createUser = async (username: string, role: "teacher" | "student") => {
    const id = (await db.run(
      "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
      username, `${username}@example.test`, "test-only", username, role,
    )).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", id);
    return { id, token: generateToken({ userId: id, username, role }) };
  };
  const host = await createUser("recreate-host", "teacher");
  const student = await createUser("recreate-student", "student");
  const server = createServer();
  const lan = attachLanServer(server);
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert(address && typeof address !== "string");
    const url = `ws://127.0.0.1:${address.port}/ws`;
    const hostPeer = await Peer.open(url, host.token);
    const studentPeer = await Peer.open(url, student.token);
    peers.push(hostPeer, studentPeer);

    hostPeer.send({ type: "create_room", wordSet: "general", practiceFormat: "word-phrase", difficulty: "Normal", roundTime: 30, background: "blues" });
    const roomA = (await hostPeer.wait("room_created")).roomCode;
    studentPeer.send({ type: "join_room", roomCode: roomA }); await studentPeer.wait("room_joined");
    hostPeer.send({ type: "cancel_room" }); await hostPeer.wait("room_cancelled");

    hostPeer.send({ type: "create_room", wordSet: "general", practiceFormat: "word-phrase", difficulty: "Normal", roundTime: 30, background: "blues" });
    const roomB = (await hostPeer.wait("room_created")).roomCode;
    assert.notEqual(roomB, roomA);
    const reconnectedStudent = await Peer.open(url, student.token);
    peers.push(reconnectedStudent);
    reconnectedStudent.send({ type: "join_room", roomCode: roomB });
    await reconnectedStudent.wait("room_joined");
    reconnectedStudent.send({ type: "join_room", roomCode: roomA });
    await reconnectedStudent.wait("error", message => /Room not found/.test(message.message));
  } finally {
    for (const peer of peers) peer.socket.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});

test("partner POV updates reach only assigned partners and reject oversized updates", { timeout: 60_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "typetiles-partner-pov-"));
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_PATH = join(directory, "test.db");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const db = await initializeDatabase();
  const peers: Peer[] = [];
  const createUser = async (username: string, role: "teacher" | "student") => {
    const id = (await db.run(
      "INSERT INTO users(username,email,password_hash,display_name,role,email_verified) VALUES(?,?,?,?,?,1)",
      username, `${username}@example.test`, "test-only", username, role,
    )).lastID!;
    await db.run("INSERT INTO user_stats(user_id) VALUES(?)", id);
    return { id, token: generateToken({ userId: id, username, role }) };
  };
  const host = await createUser("pov-host", "teacher");
  const studentOne = await createUser("pov-one", "student");
  const studentTwo = await createUser("pov-two", "student");
  const studentThree = await createUser("pov-three", "student");
  const server = createServer();
  const lan = attachLanServer(server);
  let restoreDatabaseRun: (() => void) | undefined;
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert(address && typeof address !== "string");
    const url = `ws://127.0.0.1:${address.port}/ws`;
    const hostPeer = await Peer.open(url, host.token);
    const peerOne = await Peer.open(url, studentOne.token);
    const peerTwo = await Peer.open(url, studentTwo.token);
    const peerThree = await Peer.open(url, studentThree.token);
    peers.push(hostPeer, peerOne, peerTwo, peerThree);

    hostPeer.send({ type: "create_room", wordSet: "general", practiceFormat: "word-phrase", difficulty: "Normal", roundTime: 30, background: "blues" });
    const roomCode = (await hostPeer.wait("room_created")).roomCode;
    for (const peer of [peerOne, peerTwo, peerThree]) {
      peer.send({ type: "join_room", roomCode });
      await peer.wait("room_joined");
      peer.send({ type: "ready" });
    }
    await hostPeer.wait("room_state", message => message.players.filter((player: any) => !player.isHost).every((player: any) => player.ready));
    hostPeer.send({ type: "start_game" });
    await hostPeer.wait("room_started");
    const startedOne = await peerOne.wait("room_started");
    const startedTwo = await peerTwo.wait("room_started");
    assert.equal(startedOne.startAt, startedTwo.startAt);
    const assignmentOne = await peerOne.wait("partner_assignment");
    const assignmentTwo = await peerTwo.wait("partner_assignment");
    const assignmentThree = await peerThree.wait("partner_assignment");
    assert.equal(assignmentOne.partner.userId, studentTwo.id);
    assert.equal(assignmentTwo.partner.userId, studentOne.id);
    assert.equal(assignmentThree.partner, null);

    const latencySamples: number[] = [];
    const messageSizes: number[] = [];
    const sentTimestamps: number[] = [];
    const startedAt = Date.now();
    let partnerUpdate: any;
    for (let index = 0; index < 10; index += 1) {
      if (index > 0) {
        const targetSendAt = startedAt + index * 100;
        const waitMs = targetSendAt - Date.now();
        if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      const sentAt = Date.now();
      sentTimestamps.push(sentAt);
      const update = {
        type: "partner_pov_update",
        roomCode,
        sentAt,
        target: "invoice",
        typedPrefix: "inv",
        score: index * 10,
        wpm: 24,
        accuracy: 99,
        lives: 2,
        completedWords: index,
        tileX: 0.25,
        tileY: 0.6 + index * 0.001,
        remainingTime: 25,
        status: "playing",
        tiles: [{
          id: "tile-1",
          text: "invoice",
          typedPrefix: "inv",
          x: 0.25,
          y: 0.6 + index * 0.001,
          speed: 0.08,
          state: "active",
        }],
      };
      messageSizes.push(Buffer.byteLength(JSON.stringify(update)));
      peerOne.send(update);
      partnerUpdate = await peerTwo.wait("partner_pov_update", message => message.state.sentAt === sentAt);
      latencySamples.push(Date.now() - sentAt);
    }
    const measuredHz = 9 / ((sentTimestamps[sentTimestamps.length - 1] - sentTimestamps[0]) / 1000);
    const averageMessageBytes = Math.round(messageSizes.reduce((sum, size) => sum + size, 0) / messageSizes.length);
    const averageRelayLatencyMs = Math.round(latencySamples.reduce((sum, latency) => sum + latency, 0) / latencySamples.length);
    assert.ok(measuredHz >= 7 && measuredHz <= 12, `Expected approximately 10 updates/sec, received ${measuredHz.toFixed(1)}`);
    assert.ok(averageMessageBytes < 4096);
    console.log("[PartnerPOV perf test]", {
      updateHz: Number(measuredHz.toFixed(1)),
      averageMessageBytes,
      averageSenderToReceiverMs: averageRelayLatencyMs,
    });
    assert.equal(partnerUpdate.state.userId, studentOne.id);
    assert.equal(partnerUpdate.state.target, "invoice");
    assert.equal(partnerUpdate.state.score, 90);
    assert.equal(partnerUpdate.state.wpm, 24);
    assert.equal(partnerUpdate.state.accuracy, 99);
    assert.equal(partnerUpdate.state.lives, 2);
    assert.equal(partnerUpdate.state.completedWords, 9);
    assert.equal(partnerUpdate.state.remainingTime, 25);
    assert.equal(partnerUpdate.state.tiles[0].id, "tile-1");
    assert.equal(partnerUpdate.state.tiles[0].typedPrefix, "inv");
    assert.ok(Number.isFinite(partnerUpdate.state.relayedAt));
    assert.ok(partnerUpdate.state.relayedAt >= partnerUpdate.state.sentAt);
    assert.equal(peerThree.messages.some(message => message.type === "partner_pov_update"), false);

    peerTwo.socket.close();
    await once(peerTwo.socket, "close");
    const reconnectedPeerTwo = await Peer.open(url, studentTwo.token);
    peers.push(reconnectedPeerTwo);
    reconnectedPeerTwo.send({ type: "join_room", roomCode });
    await reconnectedPeerTwo.wait("room_joined");
    await reconnectedPeerTwo.wait("room_started");
    const restoredAssignment = await reconnectedPeerTwo.wait("partner_assignment");
    const restoredState = await reconnectedPeerTwo.wait("partner_pov_update");
    assert.equal(restoredAssignment.partner.userId, studentOne.id);
    assert.equal(restoredState.state.userId, studentOne.id);
    assert.equal(restoredState.state.tiles[0].y, 0.609);
    await new Promise(resolve => setTimeout(resolve, 70));

    const originalRun = db.run.bind(db);
    let markDelayedWriteStarted!: () => void;
    const delayedWriteStarted = new Promise<void>(resolve => { markDelayedWriteStarted = resolve; });
    let delayedWrite = false;
    let delayedWriteCompleted = false;
    db.run = async (sql, ...params) => {
      if (!delayedWrite && sql.includes("UPDATE match_participants")) {
        delayedWrite = true;
        markDelayedWriteStarted();
        await new Promise(resolve => setTimeout(resolve, 400));
        delayedWriteCompleted = true;
      }
      return originalRun(sql, ...params);
    };
    restoreDatabaseRun = () => { db.run = originalRun; };
    peerOne.send({ type: "score_update", roomCode, score: 100, wpm: 25, accuracy: 99, lives: 2, completedWords: 10, finished: false });
    await delayedWriteStarted;
    const delayedSnapshotSentAt = Date.now();
    peerOne.send({
      type: "partner_pov_update",
      roomCode,
      sentAt: delayedSnapshotSentAt,
      target: "appointment",
      typedPrefix: "app",
      score: 120,
      wpm: 26,
      accuracy: 99,
      lives: 2,
      completedWords: 12,
      tileX: 0.4,
      tileY: 0.7,
      remainingTime: 24,
      status: "playing",
      tiles: [{
        id: "tile-2",
        text: "appointment",
        typedPrefix: "app",
        x: 0.4,
        y: 0.7,
        speed: 0.08,
        state: "active",
      }],
    });
    const duringDatabaseWrite = await reconnectedPeerTwo.wait(
      "partner_pov_update",
      message => message.state.sentAt === delayedSnapshotSentAt,
    );
    assert.equal(duringDatabaseWrite.state.tiles[0].text, "appointment");
    assert.equal(duringDatabaseWrite.state.score, 120);
    assert.equal(duringDatabaseWrite.state.remainingTime, 24);
    assert.equal(delayedWriteCompleted, false, "Partner updates must not wait behind database score writes.");
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(delayedWriteCompleted, true);
    restoreDatabaseRun();
    restoreDatabaseRun = undefined;

    const reverseSentAt = Date.now();
    reconnectedPeerTwo.send({
      type: "partner_pov_update",
      roomCode,
      sentAt: reverseSentAt,
      target: "greeting",
      typedPrefix: "g",
      score: 34,
      wpm: 17,
      accuracy: 95,
      lives: 1,
      completedWords: 4,
      tileX: 0.6,
      tileY: 0.3,
      remainingTime: 23,
      status: "playing",
      tiles: [{
        id: "tile-3",
        text: "greeting",
        typedPrefix: "g",
        x: 0.6,
        y: 0.3,
        speed: 0.1,
        state: "active",
      }],
    });
    const reverseUpdate = await peerOne.wait(
      "partner_pov_update",
      message => message.state.sentAt === reverseSentAt,
    );
    assert.equal(reverseUpdate.state.userId, studentTwo.id);
    assert.equal(reverseUpdate.state.score, 34);
    assert.equal(reverseUpdate.state.tiles[0].text, "greeting");

    peerOne.send({ type: "partner_pov_update", roomCode, sentAt: Date.now(), target: "x".repeat(600), typedPrefix: "", tileX: 0.2, tileY: 0.2, remainingTime: 20, status: "playing" });
    await peerOne.wait("error", message => /Invalid partner preview update/.test(message.message));
  } finally {
    restoreDatabaseRun?.();
    for (const peer of peers) peer.socket.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});
