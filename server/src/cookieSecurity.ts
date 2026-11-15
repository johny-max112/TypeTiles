import type { CookieOptions, Request, Response, NextFunction } from "express";
import type { IncomingMessage } from "http";

export const SESSION_SECONDS = 15 * 60;
export const sessionCookieName = () => process.env.NODE_ENV === "production" ? "__Host-typetiles_session" : "typetiles_session";

export function sessionCookieOptions(): CookieOptions {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE || "lax";
  if (!["lax", "strict", "none"].includes(sameSite)) throw new Error("AUTH_COOKIE_SAME_SITE must be lax, strict or none.");
  const secure = process.env.NODE_ENV === "production";
  if (sameSite === "none" && !secure) throw new Error("SameSite=None requires production HTTPS.");
  // Host-only: never allow a sibling application to set or receive this cookie.
  return { httpOnly: true, secure, sameSite: sameSite as "lax" | "strict" | "none", path: "/" };
}

export function readSessionCookie(req: Pick<IncomingMessage, "headers">): string | undefined {
  const pairs = (req.headers.cookie || "").split(";").map(pair => pair.trim());
  const matches = pairs.filter(pair => pair.startsWith(sessionCookieName() + "="));
  if (matches.length !== 1) return undefined; // Reject cookie shadowing/ambiguity.
  try { return decodeURIComponent(matches[0].slice(sessionCookieName().length + 1)); } catch { return undefined; }
}

export function setSessionCookie(res: Response, token: string) {
  res.set("Cache-Control", "no-store");
  res.cookie(sessionCookieName(), token, { ...sessionCookieOptions(), maxAge: SESSION_SECONDS * 1000 });
}
export function clearSessionCookie(res: Response) {
  res.set("Cache-Control", "no-store");
  res.clearCookie(sessionCookieName(), sessionCookieOptions());
}

export function allowedOrigin(origin: string | undefined): boolean {
  if (!origin || origin === "null") return false;
  const configured = [process.env.CLIENT_URL, ...(process.env.CLIENT_ORIGINS || "").split(",")].filter(Boolean).map(s => s!.trim());
  if (configured.includes(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || url.protocol !== "http:" || !["5173", "5174"].includes(url.port)) return false;
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return true;
    const parts = url.hostname.split(".").map(Number);
    return parts.length === 4 && parts.every(n => Number.isInteger(n) && n >= 0 && n <= 255)
      && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
  } catch { return false; }
}

// Custom-header CSRF protection with an exact Origin allowlist, including login CSRF.
// Browsers cannot attach this header cross-origin without an allowed CORS preflight.
export function requireBrowserMutation(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (!allowedOrigin(req.get("Origin")) || req.get("X-TypeTiles-Request") !== "1") {
    return res.status(403).json({ error: "Request origin or CSRF protection is invalid." });
  }
  next();
}
