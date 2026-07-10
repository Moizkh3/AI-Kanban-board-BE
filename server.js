require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const boardRoutes = require("./routes/board.routes");
const columnRoutes = require("./routes/column.routes");
const taskRoutes = require("./routes/task.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── DB Connection Middleware ──────────────────────────────────────────────────
// On Vercel serverless each invocation may be a cold start where the module-level
// dbConnected flag is reset. We use mongoose.connection.readyState to check the
// *real* connection state and reconnect if needed before every request.
// readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
let dbConnectionPromise = null;

app.use(async (req, res, next) => {
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      // Already connected
      return next();
    }
    if (state === 2 && dbConnectionPromise) {
      // In the middle of connecting – wait for it
      await dbConnectionPromise;
      return next();
    }
    // Not connected at all – initiate and cache the promise so concurrent
    // cold-start requests share a single connection attempt.
    dbConnectionPromise = connectDB();
    await dbConnectionPromise;
    dbConnectionPromise = null;
    return next();
  } catch (err) {
    console.error("❌ DB connection error in middleware:", err.message);
    dbConnectionPromise = null;
    return res.status(503).json({ error: "Database unavailable. Please try again." });
  }
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",                      authRoutes);
app.use("/api/users",                     userRoutes);
app.use("/api/boards",                    boardRoutes);
app.use("/api/boards/:boardId/columns",   columnRoutes);
app.use("/api/boards/:boardId/tasks",     taskRoutes);
app.use("/api/boards/:boardId/ai",        aiRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root
app.get("/", (req, res) => {
  res.json({ message: "Flowboard API Server is running 🚀" });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

// ── Local dev server (ignored by Vercel) ─────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5050;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ── Vercel requires this export ───────────────────────────────────────────────
module.exports = app;

