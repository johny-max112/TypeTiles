import assert from "node:assert/strict";
import { generateToken } from "../src/auth.js";
import type { ApplicationDatabase } from "../src/databaseTypes.js";

export async function adminDashboardChecks(db: ApplicationDatabase, base: string) {
  const accounts: { id: number; token: string }[] = [];
  const matches: number[] = [];
  try {
    for (const [index, role] of ["admin", "student", "student", "student"].entries()) {
      const id = (await db.run("INSERT INTO users(username,email,password_hash,display_name,role,email_verified,is_banned) VALUES(?,?,?,?,?,1,?)",
        `dashboard-${index}`, `dashboard-${index}@example.test`, "test-only", `Dashboard ${index}`, role, index === 3 ? 1 : 0)).lastID!;
      accounts.push({ id, token: generateToken({ userId: id, username: `dashboard-${index}`, role }) });
    }
    const get = async (token?: string) => {
      const response = await fetch(`${base}/admin/dashboard/stats`, { headers: token ? { Cookie: `typetiles_session=${token}` } : {} });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await get()).status, 401);
    assert.equal((await get(accounts[1].token)).status, 403);
    const before = (await get(accounts[0].token)).body;
    const addMatch = async (status: string, ageHours: number, users: number[]) => {
      const date = new Date(Date.now() - ageHours * 3600000).toISOString().replace("T", " ").replace("Z", "");
      const id = (await db.run("INSERT INTO matches(mode,difficulty,word_set,status,created_at) VALUES('Solo Practice','Normal','General',?,?)", status, date)).lastID!;
      matches.push(id);
      for (const index of users) await db.run("INSERT INTO match_participants(match_id,user_id) VALUES(?,?)", id, accounts[index].id);
    };
    await addMatch("completed", 1, [1, 1, 3]);
    await addMatch("active", 2, [1]); // Repeat participation counts once.
    await addMatch("active", 48, [2]); // Stale active rows do not imply recent activity.
    await addMatch("cancelled", 48, []);
    await db.run("INSERT INTO user_stats(user_id,total_score,best_wpm,avg_accuracy,games_played) VALUES(?,2000000000,37.333333333,93.585,2)", accounts[1].id);
    await db.run("INSERT INTO user_stats(user_id,total_score,games_played) VALUES(?,2000000001,0)", accounts[2].id);
    await db.run("INSERT INTO user_stats(user_id,total_score,games_played) VALUES(?,2000000002,10)", accounts[3].id);
    const result = await get(accounts[0].token);
    assert.equal(result.status, 200);
    assert.equal(result.body.recentPlayers, before.recentPlayers + 1);
    assert.equal(result.body.totalMatches, before.totalMatches + 4);
    assert.equal(result.body.completedMatches, before.completedMatches + 1);
    assert.equal(result.body.cancelledMatches, before.cancelledMatches + 1);
    assert(Number.isFinite(Date.parse(result.body.generatedAt)));
    const player = result.body.topPlayers.find((row: any) => row.id === accounts[1].id);
    assert(player); assert.equal(player.games_played, 2); assert.equal(player.avg_accuracy, 93.585);
    assert(Math.abs(player.best_wpm - 37.333333333) < .001);
    assert(!result.body.topPlayers.some((row: any) => [accounts[2].id, accounts[3].id].includes(row.id)));
  } finally {
    for (const id of matches) {
      await db.run("DELETE FROM match_participants WHERE match_id=?", id);
      await db.run("DELETE FROM matches WHERE id=?", id);
    }
    for (const account of accounts) await db.run("DELETE FROM users WHERE id=?", account.id);
  }
}
