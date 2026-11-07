import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { CLASSROOM_ROOM_KEY, CLASSROOM_ENDPOINT_KEY } from "../../src/lib/endpoints.js";

// Run the actual Lobby/Game effects and handlers, with only browser transport,
// rendering and the existing auth context replaced. No browser/Phaser dependency is added.
async function loadComponents(apiUrl?: string) {
  const stubs: Record<string, string> = {
    react: `
      const h = () => globalThis.__endpointHarness;
      export function useState(initial) {
        const state=h(), index=state.cursor++;
        if (!(index in state.slots)) state.slots[index]=typeof initial==='function'?initial():initial;
        return [state.slots[index], value => {state.slots[index]=typeof value==='function'?value(state.slots[index]):value}];
      }
      export function useRef(value){return useState(()=>({current:value}))[0]}
      export function useMemo(callback){h().cursor++; return callback()}
      export function useEffect(callback,deps){
        const state=h(), index=state.cursor++, old=state.slots[index];
        if(!old || deps.some((value,i)=>!Object.is(value,old.deps[i]))) state.effects.push(()=>{
          old?.cleanup?.();state.slots[index]={deps,cleanup:callback()};
        });
      }`,
    "react/jsx-runtime": `export const Fragment='fragment';export function jsx(type,props){return {type,props:props||{}}}export const jsxs=jsx;`,
    "react-router-dom": `export const useNavigate=()=>globalThis.__endpointHarness.navigate;`,
    "lucide-react": `export const ArrowRight=()=>null, Check=()=>null, Copy=()=>null, Users=()=>null, Wifi=()=>null;`,
    PlayerAuthContext: `export const usePlayerAuth=()=>({user:{id:2,username:'student',displayName:'Student',role:'student'}});`,
    GameMount: `export function GameMount(){return null}`,
    ClassroomLeaderboard: `export function ClassroomLeaderboard(){return null}`,
    ClassroomFormatSelect: `export function ClassroomFormatSelect(){return null}`,
    profileAssets: `export const PROFILE_BACKGROUNDS={blues:{label:'Blues'}};export const getProfileBackground=()=>({source:''});`,
  };
  const result = await build({
    stdin: { contents: 'export {default as Lobby} from "./src/pages/Lobby";export {default as Game} from "./src/pages/Game";export {loginPlayer} from "./src/lib/playerApi";',
      resolveDir: fileURLToPath(new URL("../../", import.meta.url)), loader: "ts" },
    bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
    define: {
      "import.meta.env.VITE_API_URL": apiUrl === undefined ? "undefined" : JSON.stringify(apiUrl),
      window: "globalThis.__endpointHarness.window", localStorage: "globalThis.__endpointHarness.storage",
      WebSocket: "globalThis.__endpointHarness.WebSocket", fetch: "globalThis.__endpointHarness.fetch",
      setTimeout: "globalThis.__endpointHarness.setTimeout", clearTimeout: "globalThis.__endpointHarness.clearTimeout",
    },
    plugins: [{ name: "component-browser-harness", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        const name = args.path.split("/").pop()!;
        const key = args.path in stubs ? args.path : name in stubs ? name : undefined;
        return key ? { path: key, namespace: "harness" } : undefined;
      });
      builder.onLoad({ filter: /.*/, namespace: "harness" }, args => ({ contents: stubs[args.path] }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

function harness(protocol: string, hostname: string) {
  const values = new Map<string, string>([["player_token", "test-token"]]);
  const h: any = {
    slots: [], cursor: 0, effects: [], sockets: [], timers: [], navigations: [], requests: [],
    storage: { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
    window: { location: { protocol, hostname }, setInterval: () => 1, clearInterval() {}, confirm: () => true },
    navigate: (path: string, options: any) => h.navigations.push({ path, ...options }),
    setTimeout: (callback: () => void) => { h.timers.push(callback); return h.timers.length; }, clearTimeout() {},
    fetch: async (url: string) => { h.requests.push(url); return { ok: true, json: async () => ({ token: "test-token" }) }; },
    render(component: () => any) {
      h.cursor = 0; h.effects = []; const tree = component(); for (const effect of h.effects) effect(); return tree;
    },
    unmount() { for (const slot of h.slots) slot?.cleanup?.(); h.slots = []; },
  };
  h.WebSocket = class {
    static OPEN = 1;
    readyState = 0; sent: any[] = [];
    onopen?: () => void; onmessage?: (event: any) => void; onclose?: (event: any) => void;
    constructor(readonly url: string) { h.sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.(); }
    send(value: string) { this.sent.push(JSON.parse(value)); }
    message(value: object) { this.onmessage?.({ data: JSON.stringify(value) }); }
    close() { this.disconnect(1000); }
    disconnect(code: number) { this.readyState = 3; this.onclose?.({ code, reason: "" }); }
  };
  (globalThis as any).__endpointHarness = h;
  return h;
}

function nodes(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  const children = tree.props?.children;
  return [tree, ...(Array.isArray(children) ? children : [children]).flat(Infinity).flatMap(nodes)];
}
function text(tree: any): string {
  if (typeof tree === "string") return tree;
  if (!tree || typeof tree !== "object") return "";
  const children = tree.props?.children;
  return (Array.isArray(children) ? children : [children]).flat(Infinity).map(text).join(" ");
}
const config = { wordSet: "general", difficulty: "Easy", roundTime: 30, practiceFormat: "full-sentence", background: "blues", opponents: [] };

for (const setup of [
  { name: "HTTPS online", apiUrl: "https://typetiles.onrender.com/api", protocol: "https:", hostname: "playtypetiles.com", origin: "https://typetiles.onrender.com", socketUrl: "wss://typetiles.onrender.com/ws" },
  { name: "HTTP LAN", apiUrl: undefined, protocol: "http:", hostname: "192.168.1.20", origin: "http://192.168.1.20:3001", socketUrl: "ws://192.168.1.20:3001/ws" },
]) test(`${setup.name}: REST, Lobby navigation, saved-room restore and Game reconnect use one backend`, async () => {
  const h = harness(setup.protocol, setup.hostname); const components = await loadComponents(setup.apiUrl);
  try {
    await components.loginPlayer("student", "test-only"); assert.equal(h.requests[0], `${setup.origin}/api/auth/login`);
    let tree = h.render(components.Lobby);
    const code = nodes(tree).find(node => node.type === "input" && node.props["aria-label"] === "Room code");
    code.props.onChange({ target: { value: "ABCD" } }); tree = h.render(components.Lobby);
    nodes(tree).find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(h.sockets.length, 1); const lobbySocket = h.sockets[0]; assert.equal(lobbySocket.url, setup.socketUrl);
    lobbySocket.open(); assert.equal(lobbySocket.sent[0].roomCode, "ABCD");
    const state = { type: "room_state", roomCode: "ABCD", started: false, maxPlayers: 51, maxStudents: 50, studentCount: 1,
      matchConfig: config, players: [{ id: "student", userId: 2, name: "student", isHost: false, ready: true }] };
    lobbySocket.message(state); h.render(components.Lobby);
    assert.equal(h.storage.getItem(CLASSROOM_ENDPOINT_KEY), setup.origin);
    // Simulate leaving/reloading the lobby with the saved room and backend.
    h.unmount(); h.render(components.Lobby);
    const restored = h.sockets.at(-1); assert.equal(restored.url, setup.socketUrl); restored.open();
    assert.equal(restored.sent[0].type, "join_room"); assert.equal(restored.sent[0].roomCode, "ABCD");
    restored.message(state); h.render(components.Lobby);
    restored.message({ type: "room_started", matchConfig: config, wordSequence: ["Type this sentence."], startAt: Date.now() - 100 });
    h.render(components.Lobby);
    const route = h.navigations.at(-1); assert.equal(route.path, "/app/game");
    assert.equal(route.state.hostAddress, setup.origin); assert.deepEqual(route.state.matchConfig, config);
    h.unmount();
    let gameTree = h.render(() => components.Game(route.state));
    const gameSocket = h.sockets.at(-1); assert.equal(gameSocket.url, setup.socketUrl); gameSocket.open();
    assert.equal(gameSocket.sent[0].roomCode, "ABCD"); gameSocket.message({ type: "room_joined" });
    gameTree = h.render(() => components.Game(route.state));
    const mount = nodes(gameTree).find(node => node.type?.name === "GameMount");
    const performance = { score: 10, wpm: 25, accuracy: 90, completedWords: 1, lives: 3, finished: false };
    mount.props.onPerformance(performance);
    gameSocket.disconnect(1006); assert.equal(h.timers.length, 1); h.timers.shift()();
    const reconnect = h.sockets.at(-1); assert.notEqual(reconnect, gameSocket); assert.equal(reconnect.url, setup.socketUrl);
    reconnect.open(); reconnect.message({ type: "room_joined" });
    assert.equal(reconnect.sent[0].type, "join_room");
    assert.deepEqual(reconnect.sent[1], { type: "score_update", roomCode: "ABCD", ...performance });
  } finally { h.unmount(); delete (globalThis as any).__endpointHarness; }
});

test("components reject a different classroom backend without opening a socket or masking the error", async () => {
  const h = harness("https:", "playtypetiles.com"); const components = await loadComponents("https://typetiles.onrender.com/api");
  try {
    let tree = h.render(components.Lobby);
    nodes(tree).find(node => node.type === "input" && node.props["aria-label"] === "Room code")
      .props.onChange({ target: { value: "ABCD" } });
    nodes(tree).find(node => node.type === "input" && node.props.value === "https://typetiles.onrender.com")
      .props.onChange({ target: { value: "https://another-server.test" } });
    tree = h.render(components.Lobby);
    nodes(tree).find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    tree = h.render(components.Lobby);
    assert.equal(h.sockets.length, 0); assert.match(text(tree), /must match the login API/);
    assert(!text(tree).includes("Connecting to the classroom host..."));
    h.unmount();
    h.render(() => components.Game({ mode: "multiplayer", roomCode: "ABCD", hostAddress: "https://another-server.test", matchConfig: config }));
    tree = h.render(() => components.Game({ mode: "multiplayer", roomCode: "ABCD", hostAddress: "https://another-server.test", matchConfig: config }));
    assert.equal(h.sockets.length, 0); assert.match(text(tree), /must match the login API/);
    h.unmount();
    h.storage.setItem(CLASSROOM_ROOM_KEY, "ABCD"); h.storage.setItem(CLASSROOM_ENDPOINT_KEY, "https://another-server.test");
    h.render(components.Lobby); tree = h.render(components.Lobby);
    assert.equal(h.sockets.length, 0); assert.equal(h.storage.getItem(CLASSROOM_ROOM_KEY), null);
    assert.match(text(tree), /saved classroom belongs to a different/);
  } finally { h.unmount(); delete (globalThis as any).__endpointHarness; }
});

test("HTTPS with missing API configuration shows an error before login fetch or classroom sockets", async () => {
  const h = harness("https:", "playtypetiles.com"); const components = await loadComponents();
  try {
    await assert.rejects(() => components.loginPlayer("student", "test-only"), /Configure VITE_API_URL/);
    assert.equal(h.requests.length, 0);
    let tree = h.render(components.Lobby);
    nodes(tree).find(node => node.type === "button" && text(node).trim() === "Connect").props.onClick();
    tree = h.render(components.Lobby);
    assert.equal(h.sockets.length, 0); assert.match(text(tree), /Configure VITE_API_URL/);
  } finally { h.unmount(); delete (globalThis as any).__endpointHarness; }
});
