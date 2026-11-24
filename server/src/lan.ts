import { allowedOrigin, readSessionCookie } from "./cookieSecurity.js";
import { randomBytes } from "crypto";
import { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { classroomTickets } from "./classroomTickets.js";
import { WebSocket, WebSocketServer } from "ws";
import { getDatabase } from "./db.js";
import { normalizeRole, verifyToken, type AppRole } from "./auth.js";
import { ClassroomConfigError, validateClassroomConfig, createClassroomSequence, type ClassroomMatchConfig } from "./classroomConfig.js";
import { sessionEvents } from "./sessionEvents.js";
import { completeClassroomMatch, cancelClassroomMatch } from "./classroomPersistence.js";

export const DEFAULT_MAX_STUDENTS = 50;
const STANDINGS_INTERVAL_MS = 250;
const COUNTDOWN_DELAY_MS = 3000;

type ClientMessage = {
  type: "create_room" | "join_room" | "leave_room" | "cancel_room" | "update_match_config" | "ready" | "start_game" | "score_update" | "partner_pov_update";
  roomCode?: string;
  ticket?: string;
  playerName?: string;
  score?: number;
  wpm?: number;
  accuracy?: number;
  lives?: number;
  completedWords?: number;
  finished?: boolean;
  mode?: string;
  difficulty?: string;
  wordSet?: string;
  roundTime?: number;
  background?: string;
  practiceFormat?: string;
  greggSubmode?: string;
  customDeckId?: number | null;
  target?: string;
  typedPrefix?: string;
  tileX?: number;
  tileY?: number;
  remainingTime?: number;
  status?: "playing" | "paused" | "completed";
  tiles?: unknown[];
};

type Player = {
  id: string;
  name: string;
  displayName?: string;
  userId?: number;
  role?: AppRole;
  ready: boolean;
  isHost: boolean;
  socket: WebSocket;
  token?: string;
  pendingToken?: string;
  performance?: PlayerPerformance;
};

type PlayerPerformance = {
  score: number;
  wpm: number;
  accuracy: number;
  lives: number;
  completedWords: number;
  finished: boolean;
};

type PartnerPovState = {
  userId: number;
  displayName: string;
  target: string;
  typedPrefix: string;
  tileX: number;
  tileY: number;
  tiles: Array<{
    id: string;
    text: string;
    typedPrefix: string;
    x: number;
    y: number;
    speed: number;
    state: "active" | "cleared" | "missed";
  }>;
  lives: number;
  score: number;
  wpm: number;
  accuracy: number;
  remainingTime: number;
  completedWords: number;
  status: "playing" | "paused" | "completed" | "disconnected";
};

type Room = {
  code: string;
  dbMatchId?: number;
  mode: string;
  difficulty: string;
  wordSet: string;
  roundTime: number;
  started: boolean;
  ownerUserId: number;
  matchConfig: ClassroomMatchConfig;
  wordSequence?: string[];
  startAt?: number;
  classroomResultsSent: boolean;
  players: Map<string, Player>;
  students: Map<number, Player>;
  maxStudents: number;
  participantWrites: Map<number, Promise<void>>;
  standingsTimer?: NodeJS.Timeout;
  deadlineTimer?: NodeJS.Timeout;
  idleTimer?: NodeJS.Timeout;
  finalization?: Promise<void>;
  writeQueue?: Promise<void>;
  closing?: boolean;
  partnerByUserId: Map<number, number>;
  partnerStates: Map<number, PartnerPovState>;
};

const rooms = new Map<string, Room>();

function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function roomState(room: Room) {
  return {
    type: "room_state",
    roomCode: room.code,
    mode: room.mode,
    difficulty: room.difficulty,
    wordSet: room.wordSet,
    roundTime: room.roundTime,
    matchConfig: room.matchConfig,
    startAt: room.startAt,
    started: room.started,
    completed: room.classroomResultsSent,
    maxPlayers: room.maxStudents + 1,
    maxStudents: room.maxStudents,
    studentCount: room.students.size,
    players: [
      ...[...room.players.values()].filter(player => player.isHost),
      ...room.students.values(),
    ].map(({ id, name, displayName, userId, ready, isHost, socket }) => ({
      id, name, displayName, userId, ready, isHost,
      connected: room.players.has(id) && socket.readyState === WebSocket.OPEN,
    })),
  };
}

function broadcast(room: Room) {
  const state = roomState(room);
  for (const player of room.players.values()) send(player.socket, state);
}

function broadcastStandings(room: Room, players = getStudentResults(room)) {
  const byUser = new Map(players.map(result => [result.userId, result]));
  for (const player of room.players.values()) {
    if (player.isHost) send(player.socket, { type: "standings_update", players, totalStudents: players.length });
    else {
      const standing = byUser.get(player.userId);
      if (standing) send(player.socket, {
        type: "rank_update", ...standing,
        totalStudents: players.length, maxStudents: room.maxStudents,
      });
    }
  }
}

function queueStandings(room: Room) {
  if (room.standingsTimer || room.classroomResultsSent) return;
  room.standingsTimer = setTimeout(() => {
    room.standingsTimer = undefined;
    if (rooms.get(room.code) === room && !room.classroomResultsSent) broadcastStandings(room);
  }, STANDINGS_INTERVAL_MS);
  room.standingsTimer.unref();
}

type RankedMetric = { score: number; wpm: number; accuracy: number; joinOrder: number };
export function compareClassroomResults(left: RankedMetric, right: RankedMetric): number {
  return right.score - left.score || right.wpm - left.wpm
    || right.accuracy - left.accuracy || left.joinOrder - right.joinOrder;
}

function getStudentResults(room: Room) {
  return [...room.students.values()]
    .filter((player) => player.role === "student" && player.userId !== undefined)
    .map((player, joinOrder) => ({
      userId: player.userId,
      username: player.name,
      displayName: player.displayName || player.name,
      score: player.performance?.score || 0,
      wpm: player.performance?.wpm || 0,
      accuracy: player.performance?.accuracy || 0,
      lives: player.performance?.lives ?? 3,
      completedWords: player.performance?.completedWords || 0,
      finished: player.performance?.finished || false,
      connected: room.players.has(player.id) && player.socket.readyState === WebSocket.OPEN,
      joinOrder,
    }))
    .sort(compareClassroomResults)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

export function buildPartnerPairs(userIds: number[]): Map<number, number> {
  const pairs = new Map<number, number>();
  for (let index = 0; index + 1 < userIds.length; index += 2) {
    pairs.set(userIds[index], userIds[index + 1]);
    pairs.set(userIds[index + 1], userIds[index]);
  }
  return pairs;
}

function partnerAssignment(room: Room, userId: number) {
  const partnerId = room.partnerByUserId.get(userId);
  if (!partnerId) return null;
  const partner = room.students.get(partnerId);
  if (!partner) return null;
  return {
    userId: partnerId,
    displayName: partner.displayName || partner.name,
  };
}

function sendPartnerAssignment(room: Room, student: Player) {
  if (!student.userId) return;
  const partner = partnerAssignment(room, student.userId);
  if (process.env.NODE_ENV !== "production") console.debug("[PartnerPOV] assignment", room.code, student.userId, partner?.userId ?? null);
  send(student.socket, {
    type: "partner_assignment",
    partner: partnerAssignment(room, student.userId),
  });
  if (room.partnerStates.has(student.userId)) {
    const partnerId = room.partnerByUserId.get(student.userId);
    if (partnerId) {
      const state = room.partnerStates.get(partnerId);
      if (state) send(student.socket, { type: "partner_pov_update", state });
    }
  }
}

function forwardPartnerStatus(room: Room, player: Player, status: "disconnected" | "playing") {
  if (room.classroomResultsSent || !player.userId || !room.partnerByUserId.has(player.userId)) return;
  const partnerId = room.partnerByUserId.get(player.userId);
  const partner = partnerId ? room.students.get(partnerId) : undefined;
  if (!partnerId || !partner) return;
  const previous = room.partnerStates.get(player.userId);
  if (status === "disconnected") {
    const disconnected: PartnerPovState = previous
      ? { ...previous, status: "disconnected" }
      : {
          userId: player.userId,
          displayName: player.displayName || player.name,
          target: "",
          typedPrefix: "",
          tileX: 0,
          tileY: 0,
          tiles: [],
          lives: player.performance?.lives ?? 3,
          score: player.performance?.score ?? 0,
          wpm: player.performance?.wpm ?? 0,
          accuracy: player.performance?.accuracy ?? 0,
          remainingTime: room.roundTime,
          completedWords: player.performance?.completedWords ?? 0,
          status: "disconnected",
        };
    room.partnerStates.set(player.userId, disconnected);
  }
  if (status === "playing") {
    const current = room.partnerStates.get(player.userId);
    if (current?.status === "disconnected") {
      room.partnerStates.set(player.userId, { ...current, status: "playing" as const });
    }
  }
  const state = room.partnerStates.get(player.userId);
  if (partner.socket.readyState === WebSocket.OPEN && state) {
    send(partner.socket, { type: "partner_pov_update", state });
  }
}

function serializeRoomWrite<T>(room: Room, operation: () => Promise<T>): Promise<T> {
  const task = (room.writeQueue ?? Promise.resolve()).then(operation);
  room.writeQueue = task.then(() => {}, () => {});
  return task;
}

async function getResultsForFinalization(
  room: Room,
  liveResults: ReturnType<typeof getStudentResults>,
) {
  if (!room.dbMatchId) return liveResults;

  const savedParticipants = await getDatabase().all(
    `SELECT mp.user_id, mp.score, mp.wpm, mp.accuracy, mp.completed_words, mp.remaining_lives,
            mp.end_reason, u.username, u.display_name
     FROM match_participants mp JOIN users u ON u.id = mp.user_id
     WHERE mp.match_id = ? AND mp.user_id <> ? AND u.role IN ('student', 'player')
     ORDER BY mp.id ASC`,
    [room.dbMatchId, room.ownerUserId],
  );
  const liveByUserId = new Map(liveResults.map((result) => [result.userId, result]));

  return savedParticipants
    .map((participant, joinOrder) => {
      const liveResult = liveByUserId.get(participant.user_id as number);
      return liveResult || {
        userId: participant.user_id as number,
        username: participant.username,
        displayName: participant.display_name || participant.username,
        score: Number(participant.score) || 0,
        wpm: Number(participant.wpm) || 0,
        accuracy: Number(participant.accuracy) || 0,
        lives: Number.isInteger(participant.remaining_lives) ? participant.remaining_lives : 3,
        completedWords: Number(participant.completed_words) || 0,
        finished: participant.end_reason !== null,
        connected: false,
        joinOrder,
        rank: 0,
      };
    })
    .sort(compareClassroomResults)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function clearRoomTimers(room: Room) {
  clearTimeout(room.standingsTimer);
  clearTimeout(room.deadlineTimer);
  clearTimeout(room.idleTimer);
}

async function finalizeRoom(room: Room): Promise<void> {
  if (room.classroomResultsSent) return;
  if (room.finalization) return room.finalization;
  room.finalization = serializeRoomWrite(room, async () => {
    await Promise.all(room.participantWrites.values());
    const players = await getResultsForFinalization(room, getStudentResults(room));
    if (!room.dbMatchId) return;
    const status = await completeClassroomMatch(room.dbMatchId, room.ownerUserId, players);
    if (status !== "completed") return;
    const livePlayers = new Map(getStudentResults(room).map(player => [player.userId, player]));
    const positions = await getDatabase().all("SELECT user_id, position FROM match_participants WHERE match_id=?", room.dbMatchId);
    const savedRanks = new Map<number, number>(positions.map((row: any) => [row.user_id, row.position]));
    const savedPlayers = (await getResultsForFinalization(room, [])).map(player => ({ ...player,
      rank: savedRanks.get(player.userId!) ?? player.rank,
      connected: livePlayers.get(player.userId)?.connected ?? false })).sort((left, right) => left.rank - right.rank);
    room.classroomResultsSent = true;
    clearTimeout(room.standingsTimer);
    clearTimeout(room.deadlineTimer);
    broadcastStandings(room, savedPlayers);
    for (const participant of room.players.values()) {
      send(participant.socket, { type: "classroom_results", roomCode: room.code, players: savedPlayers });
    }
  });
  try { await room.finalization; }
  catch (error) { room.finalization = undefined; throw error; }
}

function ensureParticipant(room: Room, userId: number): Promise<void> {
  let pending = room.participantWrites.get(userId);
  if (!pending) {
    pending = (async () => {
      const existing = await getDatabase().get(
        "SELECT id FROM match_participants WHERE match_id = ? AND user_id = ?", room.dbMatchId, userId);
      if (!existing) await getDatabase().run(
        "INSERT INTO match_participants (match_id, user_id) VALUES (?, ?)", room.dbMatchId, userId);
    })();
    room.participantWrites.set(userId, pending);
    void pending.catch(() => { if (room.participantWrites.get(userId) === pending) room.participantWrites.delete(userId); });
  }
  return pending;
}

function makeRoomCode() {
  let code = "";
  do {
    code = randomBytes(2).toString("hex").toUpperCase();
  } while (rooms.has(code));
  return code;
}

async function createDatabaseMatch(message: ClientMessage, ownerUserId: number) {
  const db = getDatabase();
  const result = await db.run(
    `INSERT INTO matches (mode, difficulty, round_time, word_set, background, status, practice_format, owner_user_id, custom_deck_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [message.mode || "LAN Match", message.difficulty || "Normal", message.roundTime || 90, message.wordSet || "General", message.background || "blues", "active", message.practiceFormat ?? "word-phrase", ownerUserId, message.customDeckId ?? null],
  );
  return result.lastID;
}

async function persistRoomConfig(room: Room) {
  if (!room.dbMatchId) return;

  await getDatabase().run(
    `UPDATE matches
     SET mode = ?, word_set = ?, difficulty = ?, round_time = ?, background = ?, practice_format = ?, custom_deck_id = ?, custom_deck_snapshot = NULL
     WHERE id = ?`,
    [
      room.mode,
      room.wordSet,
      room.difficulty,
      room.roundTime,
      room.matchConfig.background,
      room.matchConfig.practiceFormat,
      room.matchConfig.customDeckId ?? null,
      room.dbMatchId,
    ],
  );
}

async function authenticatePlayer(token: string | undefined) {
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;

  const user = await getDatabase().get(
    "SELECT id, username, display_name, role, is_banned, session_version, email_verified FROM users WHERE id = ?",
    [payload.userId],
  );
  if (!user || user.is_banned || user.email_verified !== 1 || (payload.sessionVersion ?? 0) !== user.session_version) return null;

  return {
    userId: user.id as number,
    username: user.username as string,
    displayName: user.display_name as string,
    role: normalizeRole(user.role),
  };
}

async function resolveCustomDeck(ownerUserId: number, deckId: number | null | undefined) {
  if (deckId === null || deckId === undefined) return null;
  if (!Number.isSafeInteger(deckId) || deckId < 1) {
    throw new ClassroomConfigError("Invalid custom deck selection.");
  }
  const deck = await getDatabase().get(
    `SELECT id, teacher_user_id, name, practice_format, status
     FROM custom_decks WHERE id=?`,
    deckId,
  );
  if (!deck) throw new ClassroomConfigError("Custom deck not found.");
  if (deck.teacher_user_id !== ownerUserId) throw new ClassroomConfigError("This custom deck belongs to another teacher.");
  if (deck.status !== "active") throw new ClassroomConfigError("Archived custom decks cannot be selected.");
  if (deck.practice_format !== "word-phrase" && deck.practice_format !== "full-sentence") {
    throw new ClassroomConfigError("The custom deck has an invalid practice format.");
  }
  const entries = await getDatabase().all(
    `SELECT prompt, answer, sort_order
     FROM custom_deck_items WHERE deck_id=? ORDER BY sort_order ASC, id ASC`,
    deckId,
  );
  if (entries.length === 0) throw new ClassroomConfigError("The selected custom deck has no entries.");
  return {
    id: deck.id as number,
    name: deck.name as string,
    practiceFormat: deck.practice_format as "word-phrase" | "full-sentence",
    entries: entries.map((entry) => ({
      prompt: entry.prompt === null || entry.prompt === undefined ? null : String(entry.prompt),
      answer: String(entry.answer),
      sortOrder: Number(entry.sort_order),
    })),
  };
}

function leaveRoom(player: Player, releaseSlot = false) {
  for (const room of rooms.values()) {
    if (room.started) forwardPartnerStatus(room, player, "disconnected");
    if (!room.players.delete(player.id)) continue;

    if (releaseSlot && !room.started && player.userId !== undefined
      && room.students.get(player.userId) === player) {
      room.students.delete(player.userId);
      room.participantWrites.delete(player.userId);
    }
    broadcast(room);
    if (room.started) queueStandings(room);
    // Allow navigation/socket replacement without losing the room or roster.
    // Empty rooms expire after a two-minute reconnect window.
    if (room.players.size === 0 && !room.idleTimer) {
      room.idleTimer = setTimeout(() => {
        if (room.players.size === 0) {
          clearRoomTimers(room);
          rooms.delete(room.code);
        }
      }, 120_000);
      room.idleTimer.unref();
    }
    return;
  }
}

export function attachLanServer(server: import("http").Server,
  options: { maxStudents?: number } = {}) {
  const maxStudents = options.maxStudents ?? Number(process.env.LAN_MAX_STUDENTS || DEFAULT_MAX_STUDENTS);
  if (!Number.isInteger(maxStudents) || maxStudents < 1 || maxStudents > 50) {
    throw new Error("LAN_MAX_STUDENTS must be an integer between 1 and 50 (teacher excluded).");
  }
  const webSocketServer = new WebSocketServer({ noServer: true });
  const upgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url !== "/ws" || !allowedOrigin(request.headers.origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"); socket.destroy(); return;
    }
    webSocketServer.handleUpgrade(request, socket, head, ws => webSocketServer.emit("connection", ws, request));
  };
  server.on("upgrade", upgrade);
  const connections = new Set<Player>();
  const ownedRooms = new Set<Room>();
  const invalidate = (userId: number) => {
    for (const player of connections) {
      const payload = player.token ? verifyToken(player.token) : null;
      const pending = player.pendingToken ? verifyToken(player.pendingToken) : null;
      if (player.userId !== userId && payload?.userId !== userId && pending?.userId !== userId) continue;
      leaveRoom(player);
      player.socket.close(4001, "Session expired. Please log in again.");
    }
  };
  sessionEvents.on("invalidate", invalidate);
  const deleted = (userId: number) => {
    for (const room of ownedRooms) {
      if (room.ownerUserId === userId) {
        clearRoomTimers(room);
        rooms.delete(room.code);
        ownedRooms.delete(room);
        for (const participant of room.players.values()) {
          send(participant.socket, { type: "room_cancelled", roomCode: room.code, message: "The classroom host account was deleted." });
          participant.socket.close(4001, "Classroom closed.");
        }
      } else if (room.students.delete(userId)) {
        room.participantWrites.delete(userId);
        for (const participant of room.players.values()) {
          if (participant.userId === userId) leaveRoom(participant, true);
        }
        broadcast(room);
        if (room.started) queueStandings(room);
      }
    }
    invalidate(userId);
  };
  sessionEvents.on("delete", deleted);
  // Also detects resets from another backend process; every message is revalidated below.
  const sweep = setInterval(() => {
    for (const player of connections) {
      if (!player.token) continue;
      void authenticatePlayer(player.token).then((identity) => {
        if (!identity) {
          leaveRoom(player);
          player.socket.close(4001, "Session expired. Please log in again.");
        }
      }).catch(() => player.socket.close(4001, "Session unavailable."));
    }
  }, 5000);
  sweep.unref();
  webSocketServer.on("close", () => {
    server.off("upgrade", upgrade);
    clearInterval(sweep);
    sessionEvents.off("invalidate", invalidate);
    sessionEvents.off("delete", deleted);
    for (const room of ownedRooms) {
      clearRoomTimers(room);
      if (rooms.get(room.code) === room) rooms.delete(room.code);
    }
  });

  webSocketServer.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    const handshakeToken = readSessionCookie(request);
    const player: Player = {
      id: randomBytes(8).toString("hex"),
      name: "Player",
      ready: false,
      isHost: false,
      socket,
    };
    connections.add(player);

    let messageQueue = Promise.resolve();
    socket.on("message", (raw) => {
      messageQueue = messageQueue.then(async () => {
      let message: ClientMessage;
      const rawText = raw.toString();
      if (rawText.length > 4096) {
        send(socket, { type: "error", message: "Message is too large." });
        return;
      }
      try {
        message = JSON.parse(rawText) as ClientMessage;
      } catch {
        send(socket, { type: "error", message: "Message must be valid JSON" });
        return;
      }

      try {
        if (socket.readyState !== WebSocket.OPEN) return;
        if (player.token && !await authenticatePlayer(player.token)) {
          leaveRoom(player);
          socket.close(4001, "Session expired. Please log in again.");
          return;
        }
        if (socket.readyState !== WebSocket.OPEN) return;
        let connectionToken = player.token || handshakeToken;
        if (message.type === "create_room" || message.type === "join_room") {
          if (!player.token && message.ticket !== undefined) connectionToken = classroomTickets.consume(message.ticket, request.headers.origin);
          player.pendingToken = connectionToken;
        }
        if (message.type === "create_room") {
          if (player.isHost || [...rooms.values()].some((room) => room.players.has(player.id))) {
            send(socket, { type: "error", message: "You are already in a room" });
            return;
          }
          const identity = await authenticatePlayer(connectionToken);
          if (socket.readyState !== WebSocket.OPEN) return;
          if (!identity) {
            send(socket, { type: "error", message: "Authentication is required to create a room." });
            return;
          }
          if (identity.role !== "teacher") {
            send(socket, { type: "error", message: "Only teachers can create classroom rooms." });
            return;
          }

          const customDeck = await resolveCustomDeck(identity.userId, message.customDeckId);
          const matchConfig = validateClassroomConfig({
            wordSet: message.wordSet ?? "General",
            practiceFormat: customDeck?.practiceFormat ?? message.practiceFormat,
            greggSubmode: message.greggSubmode,
            difficulty: message.difficulty || "Normal",
            roundTime: message.roundTime || 90,
            background: message.background || "blues",
            customDeckId: customDeck?.id,
            customDeckName: customDeck?.name,
          });
          const selectedMatchConfig: ClassroomMatchConfig = customDeck
            ? { ...matchConfig, wordSet: "general", customDeckId: customDeck.id, customDeckName: customDeck.name }
            : matchConfig;

          player.name = identity.username;
          player.token = connectionToken;
          player.displayName = identity.displayName;
          player.isHost = true;
          player.userId = identity.userId;
          player.role = identity.role;
          const room: Room = {
            code: makeRoomCode(),
            dbMatchId: await createDatabaseMatch({
              ...message,
              wordSet: matchConfig.wordSet,
              difficulty: matchConfig.difficulty,
              roundTime: matchConfig.roundTime,
              background: matchConfig.background,
              practiceFormat: matchConfig.practiceFormat,
              customDeckId: selectedMatchConfig.customDeckId,
            }, identity.userId),
            mode: message.mode || "LAN Match",
            difficulty: matchConfig.difficulty,
            wordSet: matchConfig.wordSet,
            roundTime: matchConfig.roundTime,
            started: false,
            ownerUserId: identity.userId,
            matchConfig: selectedMatchConfig,
            classroomResultsSent: false,
            players: new Map([[player.id, player]]),
            students: new Map(),
            maxStudents,
            participantWrites: new Map(),
            partnerByUserId: new Map(),
            partnerStates: new Map(),
          };
          if (!await authenticatePlayer(player.token) || socket.readyState !== WebSocket.OPEN) return;
          rooms.set(room.code, room);
          ownedRooms.add(room);
          await ensureParticipant(room, identity.userId);
          send(socket, { type: "room_created", roomCode: room.code, playerId: player.id });
          broadcast(room);
          return;
        }

        if (message.type === "join_room") {
          const room = message.roomCode ? rooms.get(message.roomCode.trim().toUpperCase()) : undefined;
          if (!room) {
            send(socket, { type: "error", roomCode: message.roomCode?.trim().toUpperCase(), message: "Room not found. Check the room code." });
            return;
          }
          const identity = await authenticatePlayer(connectionToken);
          if (socket.readyState !== WebSocket.OPEN) return;
          if (!identity) {
            send(socket, { type: "error", message: "Authentication is required to join a room." });
            return;
          }

          if (rooms.get(room.code) !== room) {
            send(socket, { type: "error", message: "Room not found. Check the room code." });
            return;
          }
          if (room.closing) {
            send(socket, { type: "error", message: "This classroom is closing." });
            return;
          }
          const otherRoom = [...rooms.values()].find(candidate => candidate.players.has(player.id));
          if ((otherRoom && otherRoom !== room) || (player.userId !== undefined && player.userId !== identity.userId)) {
            send(socket, { type: "error", message: "Leave your current room before joining another account or room." });
            return;
          }
          const reconnectingHost = identity.userId === room.ownerUserId;
          if (reconnectingHost && identity.role !== "teacher") {
            send(socket, { type: "error", code: "ROLE_NOT_ALLOWED", message: "A current teacher role is required to reconnect as classroom host." });
            return;
          }
          if (!reconnectingHost && identity.role !== "student") {
            send(socket, { type: "error", code: "ROLE_NOT_ALLOWED", message: "Only students and this classroom's teacher can join." });
            return;
          }
          const previousStudent = room.students.get(identity.userId);
          // Reservation and replacement below are synchronous: concurrent joins
          // cannot pass a stale count across a database await.
          if (!reconnectingHost && !previousStudent && room.students.size >= room.maxStudents) {
            send(socket, { type: "error", code: "ROOM_FULL", message: `This classroom is full (${room.maxStudents} students maximum; teacher separate).` });
            return;
          }
          if (room.started && !reconnectingHost && !previousStudent) {
            send(socket, { type: "error", code: "MATCH_STARTED", message: "This match has started. Only existing participants can reconnect." });
            return;
          }

          let previousReady = previousStudent?.ready ?? false;
          let previousPerformance = previousStudent?.performance;
          for (const [playerId, existingPlayer] of room.players) {
            if (existingPlayer.userId !== identity.userId) continue;
            previousReady = existingPlayer.ready;
            previousPerformance = existingPlayer.performance;
            room.players.delete(playerId);
            if (existingPlayer !== player) existingPlayer.socket.close(4002, "Continued on another connection.");
            break;
          }

          player.name = identity.username;
          player.token = connectionToken;
          player.displayName = identity.displayName;
          player.userId = identity.userId;
          player.role = identity.role;
          player.isHost = reconnectingHost;
          player.ready = previousReady;
          player.performance = previousPerformance;
          room.players.set(player.id, player);
          if (!reconnectingHost) room.students.set(identity.userId, player);
          clearTimeout(room.idleTimer); room.idleTimer = undefined;
          await ensureParticipant(room, identity.userId);
          if (socket.readyState !== WebSocket.OPEN || room.players.get(player.id) !== player) return;
          send(socket, { type: "room_joined", roomCode: room.code, playerId: player.id });
          broadcast(room);
          if (room.started && !room.classroomResultsSent) {
            send(socket, { type: "room_started", roomCode: room.code,
              matchConfig: room.matchConfig, wordSequence: room.wordSequence, startAt: room.startAt });
            sendPartnerAssignment(room, player);
            forwardPartnerStatus(room, player, "playing");
            queueStandings(room);
          }
          if (room.classroomResultsSent) {
            send(socket, { type: "classroom_results", roomCode: room.code, players: getStudentResults(room) });
          }
          return;
        }

        const room = [...rooms.values()].find((candidate) => candidate.players.has(player.id));
        if (!room) {
          send(socket, { type: "error", message: "Join or create a room first." });
          return;
        }

        if (message.type === "update_match_config") {
          const identity = await authenticatePlayer(player.token);
          if (socket.readyState !== WebSocket.OPEN) return;
          if (!identity || identity.role !== "teacher" || identity.userId !== room.ownerUserId || player.userId !== room.ownerUserId) {
            send(socket, { type: "error", message: "Only the teacher who owns this classroom can update match settings." });
            return;
          }
          if (room.started) {
            send(socket, { type: "error", message: "Match settings cannot change after the classroom starts." });
            return;
          }

          const hasDeckSelection = Object.prototype.hasOwnProperty.call(message, "customDeckId");
          const requestedDeckId = hasDeckSelection ? message.customDeckId : room.matchConfig.customDeckId;
          const customDeck = await resolveCustomDeck(identity.userId, requestedDeckId);
          const matchConfig = validateClassroomConfig({
            ...room.matchConfig,
            ...message,
            customDeckId: customDeck?.id ?? null,
            customDeckName: customDeck?.name,
            wordSet: customDeck ? "general" : (message.wordSet ?? room.matchConfig.wordSet),
            practiceFormat: customDeck?.practiceFormat ?? message.practiceFormat ?? room.matchConfig.practiceFormat,
          });
          room.matchConfig = customDeck
            ? { ...matchConfig, wordSet: "general", customDeckId: customDeck.id, customDeckName: customDeck.name }
            : { ...matchConfig, customDeckId: undefined, customDeckName: undefined };
          room.wordSet = room.matchConfig.wordSet;
          room.difficulty = room.matchConfig.difficulty;
          room.roundTime = room.matchConfig.roundTime;
          room.wordSequence = undefined;
          await persistRoomConfig(room);
          broadcast(room);
        } else if (message.type === "cancel_room") {
          const identity = await authenticatePlayer(player.token);
          if (socket.readyState !== WebSocket.OPEN) return;
          if (!identity || identity.role !== "teacher" || identity.userId !== room.ownerUserId || player.userId !== room.ownerUserId) {
            send(socket, { type: "error", message: "Only the teacher who owns this classroom can cancel it." });
            return;
          }

          room.closing = true;
          let terminalStatus: string;
          try {
            terminalStatus = await serializeRoomWrite(room, () => room.dbMatchId
              ? cancelClassroomMatch(room.dbMatchId, room.ownerUserId) : Promise.resolve("unavailable"));
            if (terminalStatus === "unavailable") throw new Error("Classroom cancellation is unavailable");
          } catch (error) { room.closing = false; throw error; }

          for (const participant of room.players.values()) {
            send(participant.socket, { type: "room_cancelled", roomCode: room.code, message: terminalStatus === "cancelled" ? "The teacher cancelled this classroom." : "The teacher closed this classroom." });
          }
          rooms.delete(room.code);
          clearRoomTimers(room);
          ownedRooms.delete(room);
          for (const participant of room.players.values()) {
            if (participant.isHost) {
              room.players.delete(participant.id);
              participant.isHost = false;
              participant.ready = false;
            } else {
              leaveRoom(participant, true);
              participant.socket.close();
            }
          }
        } else if (message.type === "leave_room") {
          if (player.isHost && room.started && room.dbMatchId) {
            const identity = await authenticatePlayer(player.token);
            if (!identity || identity.role !== "teacher" || identity.userId !== room.ownerUserId) {
              leaveRoom(player, true);
              return;
            }
            const results = await getResultsForFinalization(room, getStudentResults(room));
            if (results.some((result) => result.score !== 0 || result.wpm !== 0 || result.accuracy !== 0 || result.finished)) {
              await finalizeRoom(room);
            }
          }
          if (!room.started && !player.isHost && player.userId !== undefined) {
            await getDatabase().run("DELETE FROM match_participants WHERE match_id = ? AND user_id = ?", room.dbMatchId, player.userId);
          }
          leaveRoom(player, true);
        } else if (message.type === "ready") {
          player.ready = true;
          broadcast(room);
        } else if (message.type === "start_game") {
          const identity = await authenticatePlayer(player.token);
          if (socket.readyState !== WebSocket.OPEN) return;
          if (!identity || identity.role !== "teacher" || !player.isHost || identity.userId !== room.ownerUserId || player.userId !== room.ownerUserId) {
            send(socket, { type: "error", message: "Only the host can start the game." });
            return;
          }
          if (room.started) {
            send(socket, { type: "error", code: "MATCH_STARTED", message: "This match has already started." });
            return;
          }
          const participantsReady = room.students.size > 0 && [...room.students.values()].every(
            participant => participant.ready && room.players.has(participant.id) && participant.socket.readyState === WebSocket.OPEN);
          if (!participantsReady) {
            send(socket, { type: "error", message: "All students must be ready before the teacher starts the session." });
            return;
          }
          if (!room.matchConfig) {
            send(socket, { type: "error", message: "A valid classroom match configuration is required." });
            return;
          }
          const customDeck = await resolveCustomDeck(identity.userId, room.matchConfig.customDeckId);
          if (room.matchConfig.customDeckId && (!customDeck
            || customDeck.practiceFormat !== room.matchConfig.practiceFormat)) {
            send(socket, { type: "error", code: "INVALID_MATCH_CONFIG", message: "The selected custom deck is unavailable or incompatible." });
            return;
          }
          if (customDeck) {
            room.matchConfig = {
              ...room.matchConfig,
              customDeckId: customDeck.id,
              customDeckName: customDeck.name,
              practiceFormat: customDeck.practiceFormat,
              wordSet: "general",
            };
          }
          await persistRoomConfig(room);
          if (customDeck) {
            const snapshot = JSON.stringify({
              name: customDeck.name,
              practiceFormat: customDeck.practiceFormat,
              entries: customDeck.entries,
            });
            await serializeRoomWrite(room, () => getDatabase().run(
              `UPDATE matches SET custom_deck_id=?, custom_deck_snapshot=?, practice_format=? WHERE id=?`,
              customDeck.id,
              snapshot,
              customDeck.practiceFormat,
              room.dbMatchId,
            ));
          }
          room.started = true;
          room.startAt = Date.now() + COUNTDOWN_DELAY_MS;
          room.wordSequence = customDeck
            ? customDeck.entries.map((entry) => entry.answer)
            : createClassroomSequence(room.matchConfig);
          room.partnerByUserId = buildPartnerPairs(
            [...room.students.values()]
              .filter((student) => student.role === "student" && student.userId !== undefined)
              .map((student) => student.userId as number),
          );
          room.partnerStates.clear();
          room.deadlineTimer = setTimeout(() => {
            void finalizeRoom(room).catch(() => {
              for (const participant of room.players.values()) send(participant.socket,
                { type: "error", code: "RESULT_SAVE_FAILED", message: "Results could not be saved. Keep the classroom open and retry the final update." });
            });
          }, COUNTDOWN_DELAY_MS + room.roundTime * 1000 + 1500);
          room.deadlineTimer.unref();
          for (const participant of room.players.values()) {
            send(participant.socket, {
              type: "room_started",
              roomCode: room.code,
              matchConfig: room.matchConfig,
              wordSequence: room.wordSequence,
              startAt: room.startAt,
              partner: participant.userId !== undefined ? partnerAssignment(room, participant.userId) : null,
            });
            if (!participant.isHost) sendPartnerAssignment(room, participant);
          }
          broadcast(room);
          broadcastStandings(room);
        } else if (message.type === "partner_pov_update") {
          if (player.role !== "student" || !player.userId || !room.started || room.classroomResultsSent || room.finalization) return;
          if (message.roomCode && message.roomCode !== room.code) return;
          const partnerId = room.partnerByUserId.get(player.userId);
          if (!partnerId) return;
          const partner = room.students.get(partnerId);
          if (!partner || partner.userId !== partnerId) return;
          if (typeof message.target !== "string" || typeof message.typedPrefix !== "string"
            || message.target.length > 500 || message.typedPrefix.length > 500) {
            send(socket, { type: "error", message: "Invalid partner preview update." });
            return;
          }
          const target = message.target;
          const typedPrefix = message.typedPrefix;
          const tileX = message.tileX;
          const tileY = message.tileY;
          const remainingTime = message.remainingTime;
          if (typeof tileX !== "number" || typeof tileY !== "number" || typeof remainingTime !== "number"
            || !Number.isFinite(tileX) || !Number.isFinite(tileY) || tileX < 0 || tileX > 1 || tileY < 0 || tileY > 1
            || !Number.isInteger(remainingTime) || remainingTime < 0 || remainingTime > room.roundTime
            || typeof message.status !== "string" || !["playing", "paused", "completed"].includes(message.status)) {
            send(socket, { type: "error", message: "Invalid partner preview update." });
            return;
          }
          if (!Array.isArray(message.tiles) || message.tiles.length > 4) {
            send(socket, { type: "error", message: "Invalid partner preview tiles." });
            return;
          }
          const tiles: PartnerPovState["tiles"] = [];
          for (const rawTile of message.tiles as unknown[]) {
            if (!rawTile || typeof rawTile !== "object") {
              send(socket, { type: "error", message: "Invalid partner preview tile." });
              return;
            }
            const tile = rawTile as Record<string, unknown>;
            if (typeof tile.id !== "string" || tile.id.length > 64
              || typeof tile.text !== "string" || tile.text.length > 500
              || typeof tile.typedPrefix !== "string" || tile.typedPrefix.length > 500
              || typeof tile.x !== "number" || typeof tile.y !== "number" || typeof tile.speed !== "number"
              || !Number.isFinite(tile.x) || !Number.isFinite(tile.y) || !Number.isFinite(tile.speed)
              || tile.x < 0 || tile.x > 1 || tile.y < 0 || tile.y > 1 || tile.speed < 0 || tile.speed > 2
              || typeof tile.state !== "string" || !["active", "cleared", "missed"].includes(tile.state)) {
              send(socket, { type: "error", message: "Invalid partner preview tile." });
              return;
            }
            tiles.push({
              id: tile.id,
              text: tile.text,
              typedPrefix: tile.typedPrefix,
              x: tile.x,
              y: tile.y,
              speed: tile.speed,
              state: tile.state as "active" | "cleared" | "missed",
            });
          }
          const performance = player.performance;
          const state: PartnerPovState = {
            userId: player.userId,
            displayName: player.displayName || player.name,
            target,
            typedPrefix,
            tileX,
            tileY,
            tiles,
            lives: performance?.lives ?? 3,
            score: performance?.score ?? 0,
            wpm: performance?.wpm ?? 0,
            accuracy: performance?.accuracy ?? 0,
            remainingTime,
            completedWords: performance?.completedWords ?? 0,
            status: message.status,
          };
          room.partnerStates.set(player.userId, state);
          if (partner.socket.readyState === WebSocket.OPEN) {
            if (process.env.NODE_ENV !== "production") console.debug("[PartnerPOV] relay", room.code, player.userId, partnerId);
            send(partner.socket, { type: "partner_pov_update", state });
          }
        } else if (message.type === "score_update") {
          if (player.role !== "student" || !player.userId || !room.started) return;
          if (room.classroomResultsSent || room.finalization || room.closing) return;
          if (player.performance?.finished) {
            if ([...room.students.values()].every(student => student.performance?.finished)) await finalizeRoom(room);
            return;
          }
          if (message.roomCode && message.roomCode !== room.code) {
            send(socket, { type: "error", message: "Performance room does not match the active room." });
            return;
          }

          const score = message.score;
          const wpm = message.wpm;
          const accuracy = message.accuracy;
          const lives = message.lives;
          const completedWords = message.completedWords;
          const finished = message.finished;
          if (typeof score !== "number" || typeof wpm !== "number" || typeof accuracy !== "number" || typeof lives !== "number" || typeof completedWords !== "number" || typeof finished !== "boolean" || !Number.isFinite(score) || !Number.isFinite(wpm) || !Number.isFinite(accuracy) || !Number.isFinite(lives) || !Number.isFinite(completedWords) || !Number.isInteger(lives) || !Number.isInteger(completedWords) || wpm < 0 || accuracy < 0 || accuracy > 100 || lives < 0 || lives > 3 || completedWords < 0) {
            send(socket, { type: "error", message: "Invalid performance update." });
            return;
          }

          player.performance = { score, wpm, accuracy, lives, completedWords, finished };
          if (room.dbMatchId && player.userId) {
            await serializeRoomWrite(room, () => getDatabase().run(
              `UPDATE match_participants
               SET score = ?, wpm = ?, accuracy = ?, completed_words = ?, remaining_lives = ?, end_reason = ?, error_rate = ?
               WHERE match_id = ? AND user_id = ?
                 AND EXISTS (SELECT 1 FROM matches WHERE id = ? AND status = 'active' AND owner_user_id = ?)`,
              [
                score,
                wpm,
                accuracy,
                completedWords,
                lives,
                finished ? (lives === 0 ? "health" : "time") : null,
                completedWords === 0 && accuracy === 0 ? 0 : 100 - accuracy,
                room.dbMatchId,
                player.userId,
                room.dbMatchId,
                room.ownerUserId,
              ],
            ));
          }
          queueStandings(room);

          const students = [...room.students.values()].filter(
            (participant) => participant.role === "student" && participant.userId !== undefined,
          );
          if (
            !room.classroomResultsSent &&
            students.length > 0 &&
            students.every((student) => student.performance?.finished === true)
          ) {
            await finalizeRoom(room);
          }
        }
      } catch (error) {
        if (error instanceof ClassroomConfigError) {
          send(socket, { type: "error", code: "INVALID_MATCH_CONFIG", message: error.message });
          return;
        }
        console.error("LAN message error:", error);
        send(socket, { type: "error", message: "The host could not process that request." });
      } finally {
        player.pendingToken = undefined;
      }
      }).catch(() => send(socket, { type: "error", message: "The host could not process that request." }));
    });

    socket.on("close", () => {
      connections.delete(player);
      leaveRoom(player);
    });
  });

  return webSocketServer;
}
