// Entry point for the FitPrep API server.
// Loads environment variables from the repo-root .env (one .env for the
// whole project, shared by frontend and backend) rather than a separate
// backend/.env.
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import healthRouter from "./routes/health.js";
import profileRouter from "./routes/profile.js";

// Re-load .env explicitly from the repo root, since this file runs from
// inside backend/ and dotenv's default only looks in the current folder.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 4000;

// --- Security middleware (from the Secure Build Checklist) ---

// Security headers (also removes the "X-Powered-By: Express" fingerprint).
app.use(helmet());

// CORS: only our own frontend may call this API from a browser. Set
// CORS_ORIGIN in .env (comma-separated for multiple origins). Requests with
// no Origin header (curl, server-to-server) are unaffected.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins }));

// Rate limit: 100 requests per 15 minutes per IP, so nobody can hammer the
// API (or, later, burn through our nutrition-API quota).
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  })
);

// Cap request bodies — the biggest legitimate payload here is a tiny profile.
app.use(express.json({ limit: "10kb" }));

app.use("/api", healthRouter);
app.use("/api", profileRouter);

// Last-resort error handler: JSON responses, never a stack trace.
app.use((err, _req, res, _next) => {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500 ? "Unexpected server error" : "Bad request",
  });
});

app.listen(PORT, () => {
  console.log(`FitPrep backend running on http://localhost:${PORT}`);
});
