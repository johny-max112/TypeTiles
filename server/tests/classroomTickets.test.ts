import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { ClassroomTickets } from "../src/classroomTickets.js";

test("classroom tickets: opaque, one use, origin-bound, short-lived and bounded per account", () => {
  let now = 1000; const tickets = new ClassroomTickets(() => now);
  const ticket = tickets.issue("server-only-jwt", "https://frontend.test", 1)!;
  assert.match(ticket, /^[A-Za-z0-9_-]{43}$/); assert(!ticket.includes("jwt"));
  assert.equal(tickets.consume(ticket, "https://frontend.test"), "server-only-jwt");
  assert.equal(tickets.consume(ticket, "https://frontend.test"), undefined);
  const foreign = tickets.issue("jwt", "https://frontend.test", 1)!;
  assert.equal(tickets.consume(foreign, "https://evil.test"), undefined);
  assert.equal(tickets.consume(foreign, "https://frontend.test"), undefined);
  const expired = tickets.issue("jwt", "https://frontend.test", 1)!; now += 30_000;
  assert.equal(tickets.consume(expired, "https://frontend.test"), undefined);
  for (let i = 0; i < 5; i++) assert(tickets.issue("jwt", "https://frontend.test", 1));
  assert.equal(tickets.issue("jwt", "https://frontend.test", 1), null);
  assert(tickets.issue("other-jwt", "https://frontend.test", 2));
  for (const bad of [undefined, null, {}, "", "jwt"]) assert.equal(tickets.consume(bad, "https://frontend.test"), undefined);
  assert.equal(tickets.consume("a".repeat(43), undefined), undefined);
});

test("frontend requests a fresh ticket for each join/reconnect and discards late responses for closed sockets", async () => {
  const harness: any = { calls: 0, request: () => Promise.resolve({ ticket: `ticket-${++harness.calls}` }) };
  (globalThis as any).__classroomTicketHarness = harness;
  try {
    const result = await build({ entryPoints: [fileURLToPath(new URL("../../src/lib/classroomSocket.ts", import.meta.url))],
      bundle: true, write: false, platform: "node", format: "esm", plugins: [{ name: "ticket-api", setup(builder) {
        builder.onResolve({ filter: /playerApi$/ }, () => ({ path: "ticket-api", namespace: "stub" }));
        builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const requestClassroomTicket=()=>globalThis.__classroomTicketHarness.request();" }));
      } }] });
    const { sendClassroomMessage } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
    const sent: any[] = []; const socket: any = { readyState: 1, send: (body: string) => sent.push(JSON.parse(body)) };
    await sendClassroomMessage(socket, { type: "join_room", roomCode: "ABCD" });
    await sendClassroomMessage(socket, { type: "join_room", roomCode: "ABCD" });
    assert.equal(sent[0].ticket, "ticket-1"); assert.equal(sent[1].ticket, "ticket-2");
    assert.equal(sent[0].token, undefined);
    await sendClassroomMessage(socket, { type: "score_update", score: 10 }); assert.equal(harness.calls, 2);
    let resolve!: (value: object) => void; harness.request = () => new Promise(r => { resolve = r; });
    const pending = sendClassroomMessage(socket, { type: "join_room" }); socket.readyState = 3;
    resolve({ ticket: "late-ticket" }); await pending; assert.equal(sent.length, 3);
    harness.request = () => Promise.reject(new Error("Session expired"));
    await assert.rejects(sendClassroomMessage(socket, { type: "join_room" }), /Session expired/);
  } finally { delete (globalThis as any).__classroomTicketHarness; }
});
