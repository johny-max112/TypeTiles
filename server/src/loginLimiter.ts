import { createHash } from "crypto";
import type { Request, Response } from "express";

// Single-process deployment: synchronous reservations protect concurrent bcrypt requests.
// Bounded storage; restart resets the limits. Multi-instance deployments need a shared store.
export class LoginLimiter {
  private buckets = new Map<string, { count: number; until: number }>();
  constructor(private now = Date.now, private windowMs = 15 * 60_000, private capacity = 20_000) {}
  reserve(ip: string, username: string): { retryAfter: number; finish: (success: boolean) => void } {
    const now = this.now();
    for (const [key, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(key);
    const digest = (value: string) => createHash("sha256").update(value).digest("hex");
    const keys = [`ip:${digest(ip)}`, `account:${digest(username.trim().toLowerCase())}`];
    const limits = [300, 5]; // Shared school IP permits many distinct students.
    const existing = keys.map(key => this.buckets.get(key));
    const blocked = existing.filter((bucket, i) => bucket && bucket.count >= limits[i]);
    if (blocked.length) return { retryAfter: Math.max(...blocked.map(b => Math.ceil((b!.until - now) / 1000))), finish: () => {} };
    if (this.buckets.size + keys.filter(key => !this.buckets.has(key)).length > this.capacity) {
      return { retryAfter: 60, finish: () => {} }; // Fail closed under attacker-controlled key churn.
    }
    const reserved = keys.map(key => {
      const bucket = this.buckets.get(key) || { count: 0, until: now + this.windowMs };
      bucket.count++; this.buckets.set(key, bucket); return bucket;
    });
    let done = false;
    return { retryAfter: 0, finish: success => {
      if (done) return; done = true;
      if (!success) return;
      // Successful logins are not counted. Keep concurrent/earlier failures intact.
      reserved.forEach(bucket => { bucket.count = Math.max(0, bucket.count - 1); });
    } };
  }
}

export function rejectThrottled(res: Response, seconds: number) {
  return res.status(429).set("Retry-After", String(seconds)).set("Cache-Control", "no-store")
    .json({ error: "Too many login attempts. Please try again later.", code: "LOGIN_RATE_LIMITED", retryAfter: seconds });
}
