import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer as httpServer, request } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createServer as viteServer } from "vite";
import { devApiProxy, localAdminGuard, localSessionCookie, upstreamSessionCookies } from "../../admin/devApiProxy.js";

test("Admin loopback proxy isolates cookies and validates upstream URL", () => {
  const local = localSessionCookie("__Host-typetiles_session=test; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900")!;
  assert.match(local, /^typetiles_admin_proxy_prod=test;/);
  assert.match(local, /HttpOnly/); assert.match(local, /SameSite=Lax/); assert.doesNotMatch(local, /; Secure/);
  assert.equal(localSessionCookie("unrelated=value; Secure"), undefined);
  assert.equal(upstreamSessionCookies("other=private; typetiles_admin_proxy_prod=test"), "__Host-typetiles_session=test");
  assert.equal(upstreamSessionCookies("typetiles_admin_proxy_prod=a; typetiles_admin_proxy_prod=b"), "");
  for (const url of ["http://remote.test/api", "https://user:pass@backend.test/api", "https://backend.test/other", "https://backend.test/api?secret=value"]) assert.throws(() => devApiProxy(url));
  assert.equal(devApiProxy("https://backend.test/api").secure, true);
});

test("local Admin proxy: session round trip, logout clearing, Origin preservation and hostile request rejection", async () => {
  const seen: any[] = [];
  const upstream = httpServer((req, res) => {
    seen.push({ cookie: req.headers.cookie, auth: req.headers.authorization, origin: req.headers.origin, csrf: req.headers["x-typetiles-request"] });
    if (req.url?.endsWith("/login")) res.setHeader("Set-Cookie", "__Host-typetiles_session=test-session; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900");
    if (req.url?.endsWith("/logout")) res.setHeader("Set-Cookie", "__Host-typetiles_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: true }));
  });
  upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
  const remotePort = (upstream.address() as { port: number }).port;
  const vite = await viteServer({ configFile: false, root: fileURLToPath(new URL("../../admin", import.meta.url)),
    plugins: [localAdminGuard()], server: { host: "127.0.0.1", port: 0, proxy: { "/api": devApiProxy(`http://127.0.0.1:${remotePort}/api`) } }, logLevel: "silent" });
  try {
    await vite.listen(); const port = (vite.httpServer!.address() as { port: number }).port;
    const send = (path: string, headers: Record<string, string> = {}, method = "POST") => new Promise<{ status: number; headers: Headers }>((resolve, reject) => {
      const req = request(`http://127.0.0.1:${port}/api${path}`, {
        method, headers: { Host: "localhost:5174", Origin: "http://localhost:5174", "X-TypeTiles-Request": "1", ...headers },
      }, res => {
        res.resume(); res.on("end", () => resolve({ status: res.statusCode!, headers: new Headers(Object.entries(res.headers).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value.join(", ") : value]])) }));
      }); req.on("error", reject); req.end();
    });
    const login = await send("/auth/login"); assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!;
    assert.match(cookie, /^typetiles_admin_proxy_prod=test-session/); assert.match(cookie, /HttpOnly/);
    await send("/auth/me", { Cookie: cookie.split(";")[0] + "; unrelated=private", Authorization: "Bearer unwanted" }, "GET");
    assert.equal(seen.at(-1).cookie, "__Host-typetiles_session=test-session");
    assert.equal(seen.at(-1).auth, undefined); assert.equal(seen.at(-1).origin, "http://localhost:5174");
    assert.equal(seen.at(-1).csrf, "1");
    const logout = await send("/auth/logout", { Cookie: cookie.split(";")[0] });
    assert.match(logout.headers.get("set-cookie")!, /^typetiles_admin_proxy_prod=;/);
    assert.match(logout.headers.get("set-cookie")!, /Expires=Thu, 01 Jan 1970/);
    const before = seen.length;
    assert.equal((await send("/auth/login", { Origin: "https://evil.test" })).status, 403);
    assert.equal((await send("/auth/me", { Origin: "https://evil.test" }, "GET")).status, 403);
    assert.equal((await send("/auth/login", { Host: "evil.test" })).status, 403);
    assert.equal((await send("/auth/login", { "X-TypeTiles-Request": "" })).status, 403);
    assert.equal(seen.length, before);
  } finally {
    await vite.close(); upstream.closeAllConnections(); await new Promise<void>(resolve => upstream.close(() => resolve()));
  }
});
