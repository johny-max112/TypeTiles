import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBackendEndpoints, getSavedClassroomConnection, CLASSROOM_ROOM_KEY, CLASSROOM_ENDPOINT_KEY } from "../../src/lib/endpoints.js";

const online = { apiUrl: "https://typetiles.onrender.com/api", pageProtocol: "https:", pageHostname: "playtypetiles.com" };

test("online endpoints derive WSS from the login API on local and public frontends", () => {
  for (const pageProtocol of ["http:", "https:"]) for (const suffix of ["", "/", "/api", "/api/"]) {
    const endpoints = resolveBackendEndpoints({ ...online, pageProtocol, apiUrl: `https://typetiles.onrender.com${suffix}` });
    assert.deepEqual(endpoints, {
      apiUrl: "https://typetiles.onrender.com/api", webSocketUrl: "wss://typetiles.onrender.com/ws", backendOrigin: "https://typetiles.onrender.com",
    });
  }
  for (const hostAddress of ["typetiles.onrender.com", "https://typetiles.onrender.com", "https://typetiles.onrender.com/api/", "wss://typetiles.onrender.com/ws", "https://TYPETILES.onrender.com:443/"]) {
    assert.equal(resolveBackendEndpoints({ ...online, hostAddress }).webSocketUrl, "wss://typetiles.onrender.com/ws");
  }
});

test("local and LAN defaults preserve port 3001, IPv4/IPv6 and explicit ports", () => {
  for (const pageHostname of ["localhost", "127.0.0.1", "192.168.1.20", "10.1.2.3", "[::1]"]) {
    const result = resolveBackendEndpoints({ pageProtocol: "http:", pageHostname });
    assert.equal(result.apiUrl, `http://${pageHostname}:3001/api`);
    assert.equal(result.webSocketUrl, `ws://${pageHostname}:3001/ws`);
  }
  for (const hostAddress of ["192.168.1.20:3001", "http://192.168.1.20:3001/api", "ws://192.168.1.20:3001/ws"]) {
    assert.equal(resolveBackendEndpoints({ pageProtocol: "http:", pageHostname: "192.168.1.20", hostAddress }).backendOrigin, "http://192.168.1.20:3001");
  }
  assert.equal(resolveBackendEndpoints({ pageProtocol: "http:", pageHostname: "localhost", apiUrl: "http://192.168.1.20:4000/api", hostAddress: "192.168.1.20:4000" }).webSocketUrl, "ws://192.168.1.20:4000/ws");
});

test("invalid and insecure endpoint configurations fail before network requests", () => {
  for (const apiUrl of ["", " ", "not-a-url", "//backend.test/api", "https:backend.test/api", "https:///backend.test/api", "ws://backend.test/api", "ftp://backend.test/api", "javascript:alert(1)", "https://user:secret@backend.test/api", "https://backend.test/api?token=secret", "https://backend.test/api#fragment", "https://backend.test/other", "https://backend.test:0/api", "https://backend.test:99999/api", "https://back end.test/api", "https://backend.test\\evil/api"]) {
    assert.throws(() => resolveBackendEndpoints({ ...online, apiUrl }), undefined, apiUrl);
  }
  assert.throws(() => resolveBackendEndpoints({ pageProtocol: "https:", pageHostname: "playtypetiles.com" }), /Configure VITE_API_URL/);
  assert.throws(() => resolveBackendEndpoints({ ...online, apiUrl: "http://localhost:3001/api" }), /HTTPS frontend/);
  assert.throws(() => resolveBackendEndpoints({ ...online, pageProtocol: "file:" }), /HTTP or HTTPS/);
  for (const hostAddress of ["", "/ws", "other-server.test", "https://other-server.test/ws", "wss://other-server.test/ws", "https://typetiles.onrender.com:3001", "https://typetiles.onrender.com/other", "https://user:secret@typetiles.onrender.com/ws", "wss://typetiles.onrender.com/ws?token=secret", "javascript:alert(1)"]) {
    assert.throws(() => resolveBackendEndpoints({ ...online, hostAddress }), undefined, hostAddress);
  }
  assert.throws(() => resolveBackendEndpoints({ ...online, hostAddress: "ws://typetiles.onrender.com/ws" }), /insecure LAN socket/);
  assert.throws(() => resolveBackendEndpoints({ ...online, pageProtocol: "http:", hostAddress: "192.168.1.20:3001" }), /match the login API/);
});

test("saved rooms require a backend identity; canonical endpoint survives JSON route state and reconnect resolution", () => {
  const data = new Map<string, string>(); const storage = { getItem: (key: string) => data.get(key) ?? null };
  data.set(CLASSROOM_ROOM_KEY, "ABCD"); assert.equal(getSavedClassroomConnection(storage), null);
  const lobby = resolveBackendEndpoints(online);
  data.set(CLASSROOM_ENDPOINT_KEY, lobby.backendOrigin);
  const saved = getSavedClassroomConnection(storage)!;
  const route = JSON.parse(JSON.stringify(saved));
  for (let reconnect = 0; reconnect < 3; reconnect++) {
    assert.deepEqual(resolveBackendEndpoints({ ...online, hostAddress: route.hostAddress }), lobby);
  }
  assert.throws(() => resolveBackendEndpoints({ pageProtocol: "http:", pageHostname: "localhost", hostAddress: saved.hostAddress }), /match the login API/);
});
