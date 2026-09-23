// Sub-journey 1 (Profile & Goals), P0 requirements:
// "User can input age, weight, height, activity level, and fitness goal"
// "User can set custom target macros (Calories, Protein, Carbs, Fats)"
//
// This route covers the first requirement: given a profile, calculate
// suggested target macros. The second requirement (letting a user override
// the calculated numbers with their own custom values) is a small follow-up
// once this is wired into the frontend and there's somewhere to save it.
import { Router } from "express";
import { calculateMacroTargets } from "../lib/macros.js";

const router = Router();

router.post("/profile/macros", (req, res) => {
  try {
    const targets = calculateMacroTargets(req.body);
    res.json(targets);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
