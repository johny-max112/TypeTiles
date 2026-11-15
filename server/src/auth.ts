import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const developmentSecret = randomBytes(32).toString("hex");
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  const strong = Boolean(secret && secret.length >= 32 && !/change.this|replace|your.*secret/i.test(secret));
  if (process.env.NODE_ENV === "production" && !strong) {
    throw new Error("Production requires a strong configured JWT_SECRET of at least 32 characters.");
  }
  return strong ? secret! : developmentSecret;
}
const JWT_EXPIRY = "15m";

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  sessionVersion?: number;
}

export type AppRole = "student" | "teacher" | "admin";

export function normalizeRole(role: string | undefined): AppRole {
  if (role === "admin" || role === "teacher") return role;
  return "student";
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign({ ...payload, sessionVersion: payload.sessionVersion ?? 0 }, jwtSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret(), { algorithms: ["HS256"], maxAge: "15m" }) as JWTPayload;
    if (!Number.isInteger(payload.userId) || !Number.isInteger(payload.sessionVersion) || payload.sessionVersion! < 0 || typeof (payload as any).exp !== "number") return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}
