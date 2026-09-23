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
import healthRouter from "./routes/health.js";

// Re-load .env explicitly from the repo root, since this file runs from
// inside backend/ and dotenv's default only looks in the current folder.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);

app.listen(PORT, () => {
  console.log(`FitPrep backend running on http://localhost:${PORT}`);
});
