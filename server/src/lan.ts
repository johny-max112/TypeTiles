import { randomBytes } from "crypto";
import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { getDatabase } from "./db.js";
import { verifyToken } from "./auth.js";

const MAX_PLAYERS = 8;

type ClientMessage = {
  type: "create_room" | "join_room" | "leave_room" | "ready" | "start_game" | "score_update";
  roomCode?: string;
  playerName?: string;
  token?: string;
  score?: number;
  wpm?: number;
  accuracy?: number;
  mode?: string;
  difficulty?: string;
  wordSet?: string;
  roundTime?: number;
};

type Player = {
  id: string;
  name: string;
  userId?: number;
  ready: boolean;
  isHost: boolean;
  socket: WebSocket;
};

type Room = {
  code: string;
  dbMatchId?: number;
  mode: string;
  difficulty: string;
  wordSet: string;
  roundTime: number;
  started: boolean;
  players: Map<string, Player>;
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
    started: room.started,
    maxPlayers: MAX_PLAYERS,
    players: [...room.players.values()].map(({ id, name, userId, ready, isHost }) => ({ id, name, userId, ready, isHost })),
  };
}

function broadcast(room: Room) {
  const state = roomState(room);
  for (const player of room.players.values()) send(player.socket, state);
}

function makeRoomCode() {
  let code = "";
  do {
    code = randomBytes(2).toString("hex").toUpperCase();
  } while (rooms.has(code));
  return code;
}

async function createDatabaseMatch(message: ClientMessage) {
  const db = getDatabase();
  const result = await db.run(
    `INSERT INTO matches (mode, difficulty, round_time, word_set, status) VALUES (?, ?, ?, ?, ?)`,
    [message.mode || "LAN Match", message.difficulty || "Normal", message.roundTime || 90, message.wordSet || "General", "active"],
  );
  return result.lastID;
}

function leaveRoom(player: Player) {
  for (const room of rooms.values()) {
    if (!room.players.delete(player.id)) continue;

    if (player.isHost || room.players.size === 0) {
      for (const remaining of room.players.values()) send(remaining.socket, { type: "room_closed", reason: "Host disconnected" });
      rooms.delete(room.code);
    } else {
      broadcast(room);
    }
    return;
  }
}

export function attachLanServer(server: import("http").Server) {
  const webSocketServer = new WebSocketServer({ server, path: "/ws" });

  webSocketServer.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    const player: Player = {
      id: randomBytes(8).toString("hex"),
      name: "Player",
      ready: false,
      isHost: false,
      socket,
    };

    socket.on("message", async (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(socket, { type: "error", message: "Message must be valid JSON" });
        return;
      }

      try {
        if (message.type === "create_room") {
          if (player.isHost || [...rooms.values()].some((room) => room.players.has(player.id))) {
            send(socket, { type: "error", message: "You are already in a room" });
            return;
          }
          player.name = message.playerName?.trim() || "Host";
          player.isHost = true;
          player.userId = message.token ? verifyToken(message.token)?.userId : undefined;
          const room: Room = {
            code: makeRoomCode(),
            dbMatchId: await createDatabaseMatch(message),
            mode: message.mode || "LAN Match",
            difficulty: message.difficulty || "Normal",
            wordSet: message.wordSet || "General",
            roundTime: message.roundTime || 90,
            started: false,
            players: new Map([[player.id, player]]),
          };
          rooms.set(room.code, room);
          send(socket, { type: "room_created", roomCode: room.code, playerId: player.id });
          broadcast(room);
          return;
        }

        if (message.type === "join_room") {
          const room = message.roomCode ? rooms.get(message.roomCode.trim().toUpperCase()) : undefined;
          if (!room) {
            send(socket, { type: "error", message: "Room not found. Check the room code." });
            return;
          }
          if (room.players.size >= MAX_PLAYERS) {
            send(socket, { type: "error", message: "This room is full (8 players maximum)." });
            return;
          }
          player.name = message.playerName?.trim() || `Player ${room.players.size + 1}`;
          player.userId = message.token ? verifyToken(message.token)?.userId : undefined;
          room.players.set(player.id, player);
          if (room.dbMatchId && player.userId) {
            await getDatabase().run(`INSERT INTO match_participants (match_id, user_id) VALUES (?, ?)`, [room.dbMatchId, player.userId]);
          }
          send(socket, { type: "room_joined", roomCode: room.code, playerId: player.id });
          broadcast(room);
          return;
        }

        const room = [...rooms.values()].find((candidate) => candidate.players.has(player.id));
        if (!room) {
          send(socket, { type: "error", message: "Join or create a room first." });
          return;
        }

        if (message.type === "leave_room") {
          leaveRoom(player);
        } else if (message.type === "ready") {
          player.ready = true;
          broadcast(room);
        } else if (message.type === "start_game") {
          if (!player.isHost) {
            send(socket, { type: "error", message: "Only the host can start the game." });
            return;
          }
          room.started = true;
          broadcast(room);
        } else if (message.type === "score_update") {
          if (!player.userId || !room.dbMatchId) return;
          await getDatabase().run(
            `UPDATE match_participants SET score = ?, wpm = ?, accuracy = ? WHERE match_id = ? AND user_id = ?`,
            [message.score || 0, message.wpm || 0, message.accuracy || 0, room.dbMatchId, player.userId],
          );
        }
      } catch (error) {
        console.error("LAN message error:", error);
        send(socket, { type: "error", message: "The host could not process that request." });
      }
    });

    socket.on("close", () => leaveRoom(player));
  });

  return webSocketServer;
}