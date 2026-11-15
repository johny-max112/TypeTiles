import { createHash, randomBytes } from "crypto";

// One backend process also owns the in-memory classroom rooms. Tickets never contain JWTs.
export class ClassroomTickets {
  private entries = new Map<string, { token: string; origin: string; userId: number; until: number }>();
  constructor(private now = Date.now) {}
  private prune() { for (const [key, value] of this.entries) if (value.until <= this.now()) this.entries.delete(key); }
  issue(token: string, origin: string, userId: number): string | null {
    this.prune();
    if (this.entries.size >= 5000 || [...this.entries.values()].filter(value => value.userId === userId).length >= 5) return null;
    const ticket = randomBytes(32).toString("base64url");
    this.entries.set(createHash("sha256").update(ticket).digest("hex"), { token, origin, userId, until: this.now() + 30_000 });
    return ticket;
  }
  consume(ticket: unknown, origin: string | undefined): string | undefined {
    this.prune();
    if (typeof ticket !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) return;
    const key = createHash("sha256").update(ticket).digest("hex");
    const entry = this.entries.get(key);
    this.entries.delete(key); // A ticket can be attempted once, including wrong-origin attempts.
    return entry && entry.origin === origin ? entry.token : undefined;
  }
}
export const classroomTickets = new ClassroomTickets();
