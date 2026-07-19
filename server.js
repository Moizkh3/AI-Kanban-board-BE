require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const boardRoutes = require("./routes/board.routes");
const columnRoutes = require("./routes/column.routes");
const taskRoutes = require("./routes/task.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean); // removes undefined if CLIENT_URL isn't set

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server requests (no origin) or whitelisted origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/boards/:boardId/columns", columnRoutes);
app.use("/api/boards/:boardId/tasks", taskRoutes);
app.use("/api/boards/:boardId/ai", aiRoutes);

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

// ── DB Connection ─────────────────────────────────────────────────────────────
// Called at module load — works for both local (nodemon) and Vercel serverless.
let dbConnected = false;
const ensureDB = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};
ensureDB().catch((err) => {
  console.error("❌ Failed to connect to MongoDB on startup:", err.message);
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
