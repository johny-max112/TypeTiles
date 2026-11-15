import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload, normalizeRole } from "./auth.js";
import { getDatabase } from "./db.js";
import { readSessionCookie } from "./cookieSecurity.js";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  res.set("Cache-Control", "no-store");
  const token = readSessionCookie(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const user = await getDatabase().get(
      "SELECT id, username, role, is_banned, session_version, email_verified FROM users WHERE id = ?",
      [payload.userId],
    );

    if (!user || user.is_banned || user.email_verified !== 1 || (payload.sessionVersion ?? 0) !== user.session_version) {
      return res.status(401).json({ error: "Invalid or inactive account" });
    }

    req.user = {
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
      sessionVersion: user.session_version,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function roleMiddleware(...roles: Array<"student" | "teacher" | "admin">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as "student" | "teacher" | "admin")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
