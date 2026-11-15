import type { Plugin, ProxyOptions } from "vite";

const localOrigin = "http://localhost:5174";
const sessionNames = new Map([
  ["__Host-typetiles_session", "typetiles_admin_proxy_prod"],
  ["typetiles_session", "typetiles_admin_proxy_dev"],
]);

export function localSessionCookie(cookie: string): string | undefined {
  const parts = cookie.split(";");
  const equals = parts[0].indexOf("=");
  const localName = sessionNames.get(parts[0].slice(0, equals));
  if (!localName) return undefined;
  // Loopback-only development transport. Never modify production response cookies.
  // __Host- cannot be retained after removing Secure, so use a distinct local name.
  return [localName + parts[0].slice(equals), ...parts.slice(1).filter(part => !/^\s*(Secure\s*$|Domain\s*=)/i.test(part))].join(";");
}

export function upstreamSessionCookies(header: string = ""): string {
  const cookies = header.split(";").map(pair => pair.trim());
  return [...sessionNames].flatMap(([upstream, local]) => {
    const matches = cookies.filter(pair => pair.startsWith(local + "="));
    return matches.length === 1 ? [upstream + matches[0].slice(local.length)] : [];
  }).join("; ");
}

export function devApiProxy(target: string): ProxyOptions {
  const url = new URL(target);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !["/api", "/api/", "/"].includes(url.pathname)) {
    throw new Error("Admin VITE_API_URL must be an HTTP(S) backend API URL without credentials, query or fragment.");
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Remote Admin API targets require HTTPS.");
  }
  return {
    target: url.origin,
    changeOrigin: true,
    secure: true,
    configure(proxy) {
      proxy.on("proxyReq", (upstream, req) => {
        // Preserve Origin and CSRF header: Render must explicitly trust localhost.
        // Never forward unrelated localhost cookies or browser Authorization headers.
        const cookie = upstreamSessionCookies(req.headers.cookie);
        upstream.removeHeader("cookie"); upstream.removeHeader("authorization");
        if (cookie) upstream.setHeader("cookie", cookie);
      });
      proxy.on("proxyRes", response => {
        const cookies = response.headers["set-cookie"];
        if (cookies) response.headers["set-cookie"] = cookies.map(localSessionCookie).filter((cookie): cookie is string => Boolean(cookie));
      });
    },
  };
}

export function localAdminGuard(): Plugin {
  return {
    name: "loopback-admin-api-guard",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api")) return next();
        const mutation = !["GET", "HEAD", "OPTIONS"].includes(req.method || "GET");
        // Exact Host prevents DNS rebinding; reject cross-origin callers even on GET.
        if (req.headers.host !== "localhost:5174"
          || (req.headers.origin !== undefined && req.headers.origin !== localOrigin)
          || (mutation && (req.headers.origin !== localOrigin || req.headers["x-typetiles-request"] !== "1"))) {
          res.statusCode = 403; res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Use the local Admin at http://localhost:5174." })); return;
        }
        next();
      });
    },
  };
}
