import express from "express";
import cors from "cors";
import { createServer } from "http";
import "dotenv/config";
import { initializeDatabase, closeDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";
import matchesRoutes from "./routes/matches.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import adminRoutes from "./routes/admin.js";
import { attachLanServer } from "./lan.js";

const app = express();
const httpServer = createServer(app);
const lanServer = attachLanServer(httpServer);
const PORT = Number(process.env.PORT || 3001);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", matchesRoutes);
app.use("/api", leaderboardRoutes);
app.use("/api/admin", adminRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    console.log("✓ Database initialized");

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🎮 TypeTiles Server running on http://localhost:${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`📡 LAN WebSocket: ws://<HOST_IP>:${PORT}/ws`);
      console.log(`🛡️  Admin: http://localhost:${PORT}/api/admin`);
      console.log("\n💡 Tip: Make sure CLIENT_URL env matches your frontend URL\n");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⏸️  Shutting down...");
  lanServer.close();
  httpServer.close();
  await closeDatabase();
  process.exit(0);
});

start();
