import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check, Copy, Users, Wifi } from "lucide-react";

type Player = { id: string; name: string; ready: boolean; isHost: boolean };
type RoomState = { roomCode: string; started: boolean; maxPlayers: number; players: Player[] };
type SocketMessage = RoomState & { type: string; message?: string; playerId?: string };

const defaultHost = "localhost:3001";

export default function Lobby() {
  const socketRef = useRef<WebSocket | null>(null);
  const [hostAddress, setHostAddress] = useState(defaultHost);
  const [playerName, setPlayerName] = useState("Player");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");

  const connect = () => {
    socketRef.current?.close();
    setError("");
    setStatus("connecting");
    const socket = new WebSocket(`ws://${hostAddress.replace(/^https?:\/\//, "")}/ws`);
    socketRef.current = socket;
    socket.onopen = () => setStatus("connected");
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as SocketMessage;
      if (message.type === "room_state") setRoom(message);
      if (message.type === "room_created" || message.type === "room_joined") setRoomCode(message.roomCode);
      if (message.type === "error") setError(message.message || "Unable to connect to the room.");
    };
    socket.onerror = () => {
      setStatus("idle");
      setError("Unable to reach the host. Check the host IP and port.");
    };
    socket.onclose = () => setStatus("idle");
  };

  useEffect(() => () => socketRef.current?.close(), []);

  const send = (message: object) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      connect();
      setError("Connecting to the host. Try again when the connection indicator is green.");
      return;
    }
    socketRef.current.send(JSON.stringify(message));
  };

  const createRoom = () => {
    send({ type: "create_room", playerName, mode: "LAN Match", difficulty: "Normal", wordSet: "General", roundTime: 90 });
  };

  const joinRoom = (event: FormEvent) => {
    event.preventDefault();
    if (!roomCode.trim()) {
      setError("Enter a room code first.");
      return;
    }
    send({ type: "join_room", roomCode, playerName });
  };

  const currentPlayer = room?.players.find((player) => player.name === playerName);
  const playerColors = useMemo(() => ["bg-sky-500", "bg-lime-400", "bg-fuchsia-500", "bg-amber-400", "bg-cyan-400", "bg-rose-400", "bg-indigo-400", "bg-emerald-400"], []);

  return (
    <section className="h-full overflow-y-auto pb-6">
      {!room ? (
        <>
          <article className="rounded-[9px] bg-[#11163d] px-6 py-10 shadow-[0_22px_46px_rgba(4,8,25,0.25)] sm:px-14">
            <div className="mx-auto grid max-w-[920px] items-center gap-8 md:grid-cols-[210px_1fr]">
              <div className="flex justify-center text-[#a5a8bb]"><Users className="h-[110px] w-[190px] stroke-[1.3]" /></div>
              <div>
                <h1 className="text-[1.55rem] font-semibold text-white sm:text-[1.85rem]">Enter Room Code</h1>
                <p className="mt-1 text-[1rem] text-white/70">Use the room code to join the game</p>
                <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_230px]" onSubmit={joinRoom}>
                  <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} className="h-[50px] rounded-[8px] border-0 bg-[#d7d7df] px-4 text-lg font-semibold tracking-[0.2em] text-[#161a3b] outline-none ring-sky-400 focus:ring-2" placeholder="ROOM CODE" aria-label="Room code" />
                  <button type="submit" className="inline-flex h-[50px] items-center justify-center gap-5 rounded-[8px] bg-[#2948aa] text-lg font-semibold text-white transition hover:bg-[#3558c5]">Join Room <ArrowRight className="h-7 w-7" /></button>
                </form>
              </div>
            </div>
          </article>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="min-h-[136px] rounded-[9px] bg-[#1c2451] px-8 py-7">
              <h2 className="text-[1.3rem] font-semibold text-[#00ed8a]">LAN Connected</h2>
              <p className="mt-2 max-w-[320px] text-[0.95rem] leading-5 text-white/75">You are connected to the school network.<br />You can join a session.</p>
            </article>
            <article className="min-h-[136px] rounded-[9px] bg-[#1c2451] px-8 py-7">
              <h2 className="text-[1.3rem] font-semibold text-[#6f9fff]">How to join</h2>
              <ol className="mt-2 list-decimal pl-5 text-[0.95rem] leading-5 text-white/75"><li>Ask for the room code</li><li>Enter the code above</li><li>Wait for the game to begin</li></ol>
            </article>
          </div>

          <article className="mt-6 rounded-[9px] bg-[#11163d] p-6 sm:p-8">
            <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="text-sm text-white/70">Your player name<input value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="mt-2 h-11 w-full rounded-[7px] border border-white/10 bg-[#d7d7df] px-3 font-semibold text-[#161a3b] outline-none" /></label>
              <label className="text-sm text-white/70">Host address<input value={hostAddress} onChange={(event) => setHostAddress(event.target.value)} className="mt-2 h-11 w-full rounded-[7px] border border-white/10 bg-[#d7d7df] px-3 font-semibold text-[#161a3b] outline-none" /></label>
              <button type="button" onClick={connect} className="h-11 rounded-[7px] border border-[#3150b3] px-5 font-semibold text-white hover:bg-white/10">{status === "connecting" ? "Connecting..." : "Connect"}</button>
            </div>
            <button type="button" onClick={createRoom} className="mt-5 text-sm font-semibold text-[#6f9fff] hover:text-white">Host a new room instead</button>
          </article>
        </>
      ) : (
        <article className="rounded-[9px] bg-[#11163d] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_555px]">
            <div className="flex min-h-[380px] flex-col justify-between">
              <div><div className="text-sm text-white/70">You have joined the session.</div><h1 className="mt-1 text-[1.55rem] font-semibold text-white sm:text-[1.85rem]">Waiting Room</h1></div>
              <div><h2 className="text-[1.45rem] font-semibold text-[#6f9fff]">Waiting for the admin</h2><p className="mt-2 text-white/75">The game will start when the admin begins</p></div>
              <div className="flex flex-wrap gap-3"><button type="button" onClick={() => send({ type: "ready" })} className="inline-flex items-center gap-2 rounded-[7px] bg-[#2948aa] px-5 py-3 font-semibold text-white"><Check className="h-5 w-5" />{currentPlayer?.ready ? "Ready" : "Mark Ready"}</button>{currentPlayer?.isHost ? <button type="button" onClick={() => send({ type: "start_game" })} className="rounded-[7px] border border-[#00d77c] px-5 py-3 font-semibold text-[#00ed8a]">Start Game</button> : null}</div>
            </div>
            <div><div className="flex items-center gap-2 text-sm text-white"><span className="h-3 w-3 rounded-full bg-[#11c77a]" />Room Lobby</div><div className="mt-1 text-xs text-white/80">Room Code: <span className="font-bold tracking-[0.18em]">{room.roomCode}</span><button type="button" onClick={() => navigator.clipboard?.writeText(room.roomCode)} className="ml-2 text-[#6f9fff]" aria-label="Copy room code"><Copy className="inline h-3.5 w-3.5" /></button></div><div className="mt-3 overflow-hidden rounded-[8px] border border-[#2c6db2] bg-[#1c2451]"><div className="border-b border-[#2c6db2] px-7 py-3"><div className="font-semibold text-white">Connected Players</div><div className="text-xs text-white/75">{room.players.length}/{room.maxPlayers} players in the room</div></div>{room.players.map((player, index) => <div key={player.id} className="flex items-center gap-3 border-b border-[#2c6db2] px-7 py-2 last:border-0"><div className={`grid h-11 w-11 place-items-center rounded-full ${playerColors[index]}`}><Users className="h-7 w-7 text-white" /></div><div><div className="text-sm font-semibold text-white">{player.name}{player.isHost ? " (HOST)" : ""}</div><div className="text-xs text-[#00ed8a]">{player.ready ? "Ready" : "Waiting"}</div></div></div>)}</div></div>
          </div>
        </article>
      )}
      <div className="mt-4 flex items-center gap-2 text-sm text-white/60"><Wifi className={`h-4 w-4 ${status === "connected" ? "text-[#00ed8a]" : "text-white/40"}`} />{status === "connected" ? `Connected to ${hostAddress}` : "Not connected to a host"}{error ? <span className="text-red-300">• {error}</span> : null}</div>
    </section>
  );
}
