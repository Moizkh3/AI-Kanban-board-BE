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
const corsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin requests (curl, Postman, mobile)
    if (!origin) return callback(null, true);

    const normalise = (o) => o?.replace(/\/$/, ""); // strip trailing slash

    const allowed = [
      "http://localhost:5173",
      process.env.CLIENT_URL,       // set this in Vercel env vars
    ]
      .filter(Boolean)
      .map(normalise);

    if (allowed.includes(normalise(origin))) {
      callback(null, true);
    } else {
      console.warn("🚫 CORS blocked origin:", origin, "| allowed:", allowed);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Handle all preflight OPTIONS requests before any other middleware
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

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
