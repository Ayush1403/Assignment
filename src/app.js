import express from "express";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";

const app = express();

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // cap request body size

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Tighter limit on auth endpoints to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: "Too many requests, please try again later" },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests, please try again later" },
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/records", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check — useful for load balancers and uptime monitors
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Centralized error handler — must be last ──────────────────────────────────
app.use(errorHandler);

export default app;
