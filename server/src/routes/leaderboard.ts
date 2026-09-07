import { Router, Request, Response } from "express";
import { getDatabase } from "../db.js";
import { authMiddleware } from "../middleware.js";

const router = Router();

// Get global leaderboard
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const db = getDatabase();

    const leaderboard = await db.all(
      `SELECT 
        u.id, 
        u.username, 
        u.display_name, 
        u.tier, 
        us.total_score,
        us.games_played,
        us.wins,
        us.best_wpm,
        us.avg_accuracy,
        us.top_combo,
        RANK() OVER (ORDER BY us.total_score DESC) as rank
       FROM users u
       JOIN user_stats us ON u.id = us.user_id
       WHERE u.is_banned = 0
       ORDER BY us.total_score DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({ leaderboard });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user stats
router.get("/users/:userId/stats", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = getDatabase();

    const user = await db.get(
      `SELECT u.id, u.username, u.display_name, u.tier, u.avatar 
       FROM users u 
       WHERE u.id = ? AND u.is_banned = 0`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const stats = await db.get(`SELECT * FROM user_stats WHERE user_id = ?`, [userId]);

    res.json({
      user,
      stats,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get leaderboard by tier
router.get("/leaderboard/tier/:tier", async (req: Request, res: Response) => {
  try {
    const { tier } = req.params;
    const { limit = 50 } = req.query;
    const db = getDatabase();

    const validTiers = ["Volt", "Cipher", "Nova"];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }

    const leaderboard = await db.all(
      `SELECT 
        u.id, 
        u.username, 
        u.display_name, 
        u.tier, 
        us.total_score,
        us.best_wpm,
        us.avg_accuracy,
        us.games_played
       FROM users u
       JOIN user_stats us ON u.id = us.user_id
       WHERE u.tier = ? AND u.is_banned = 0
       ORDER BY us.total_score DESC
       LIMIT ?`,
      [tier, limit]
    );

    res.json({ tier, leaderboard });
  } catch (error) {
    console.error("Get tier leaderboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user's rank
router.get("/users/me/rank", authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const rankResult = await db.get(
      `SELECT COUNT(*) as rank FROM user_stats us1
       JOIN user_stats us2 ON us2.user_id = ?
       WHERE us1.total_score > us2.total_score`,
      [req.user!.userId]
    );

    const stats = await db.get(`SELECT * FROM user_stats WHERE user_id = ?`, [req.user!.userId]);

    res.json({
      rank: (rankResult?.rank || 0) + 1,
      stats,
    });
  } catch (error) {
    console.error("Get rank error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
