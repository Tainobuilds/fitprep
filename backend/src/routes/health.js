// Simple health-check route so the frontend (and you) can confirm the
// backend is up and reachable. Add real feature routes as their own files
// in this folder as the app grows.
import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "fitprep-backend" });
});

export default router;
