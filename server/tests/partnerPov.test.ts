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
    const assignmentOne = await peerOne.wait("partner_assignment");
    const assignmentTwo = await peerTwo.wait("partner_assignment");
    const assignmentThree = await peerThree.wait("partner_assignment");
    assert.equal(assignmentOne.partner.userId, studentTwo.id);
    assert.equal(assignmentTwo.partner.userId, studentOne.id);
    assert.equal(assignmentThree.partner, null);

    peerOne.send({
      type: "partner_pov_update",
      roomCode,
      target: "invoice",
      typedPrefix: "inv",
      tileX: 0.25,
      tileY: 0.6,
      remainingTime: 25,
      status: "playing",
      tiles: [{
        id: "tile-1",
        text: "invoice",
        typedPrefix: "inv",
        x: 0.25,
        y: 0.6,
        speed: 0.08,
        state: "active",
      }],
    });
    const partnerUpdate = await peerTwo.wait("partner_pov_update");
    assert.equal(partnerUpdate.state.userId, studentOne.id);
    assert.equal(partnerUpdate.state.target, "invoice");
    assert.equal(partnerUpdate.state.tiles[0].id, "tile-1");
    assert.equal(partnerUpdate.state.tiles[0].typedPrefix, "inv");
    assert.equal(peerThree.messages.some(message => message.type === "partner_pov_update"), false);

    peerOne.send({ type: "partner_pov_update", roomCode, target: "x".repeat(600), typedPrefix: "", tileX: 0.2, tileY: 0.2, remainingTime: 20, status: "playing" });
    await peerOne.wait("error", message => /Invalid partner preview update/.test(message.message));
  } finally {
    for (const peer of peers) peer.socket.terminate();
    await new Promise<void>(resolve => lan.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});
