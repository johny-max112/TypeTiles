import express from "express";
import cors from "cors";
import { createServer } from "http";
import "dotenv/config";
import { initializeDatabase, closeDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";
import matchesRoutes from "./routes/matches.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import adminRoutes from "./routes/admin.js";
import feedbackRoutes from "./routes/feedback.js";
import { attachLanServer } from "./lan.js";
import { jwtSecret } from "./auth.js";
import { resetSecret } from "./passwordReset.js";
import { verificationSecret } from "./emailVerification.js";
import { allowedOrigin, requireBrowserMutation, sessionCookieOptions } from "./cookieSecurity.js";

const app = express();
const httpServer = createServer(app);
const lanServer = attachLanServer(httpServer);
const PORT = Number(process.env.PORT || 3001);
// Set only trusted proxy addresses/hops for the actual deployment topology.
const proxy = process.env.TRUST_PROXY;
if (proxy) app.set("trust proxy", /^\d+$/.test(proxy) ? Number(proxy) : proxy.split(",").map(value => value.trim()));

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigin(origin));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "X-TypeTiles-Request"],
  exposedHeaders: ["Retry-After"],
}));
app.use(express.json({ limit: "3mb" }));
app.use("/api", requireBrowserMutation);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", matchesRoutes);
app.use("/api", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);

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
    jwtSecret();
    sessionCookieOptions();
    if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) throw new Error("Production requires CLIENT_URL.");
    resetSecret();
    verificationSecret();
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
    const code = (error as { code?: string }).code;
    console.error("Failed to start server. Check the environment; for PostgreSQL run npm run db:check.",
      code && /^[A-Z0-9_]+$/.test(code) ? `(${code})` : "");
    process.exit(1);
  }
}

// Render sends SIGTERM during deployments; support local Ctrl+C as well.
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n⏸️  Shutting down...");
  for (const socket of lanServer.clients) socket.close(1001, "Server shutting down");
  lanServer.close();
  httpServer.close();
  await closeDatabase();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start();
