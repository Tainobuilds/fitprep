// Sample content only -- clearly fictional, per the PRD's prototype dependency:
// "Use clearly identified sample meals and nutrition data. Live Fitia APIs,
// account access, and production recommendation infrastructure are not assumed available."
import type { Meal, Routine } from "./schedule";

export const startDate = "2026-09-29";

// Before Meal Schedule is turned on: the standard planner, generic
// breakfast/lunch/dinner labels with no time-of-day context.
export const baselineMeals: Meal[] = [
  {
    id: "m1",
    slot: "breakfast",
    time: "08:00",
    calories: 420,
    protein: 24,
    carbs: 46,
    fat: 15,
    foods: [
      { name: "Rolled oats", qty: "1 cup", kcal: 150 },
      { name: "Banana", qty: "1 medium", kcal: 105 },
      { name: "Peanut butter", qty: "1 tbsp", kcal: 95 },
      { name: "Whole milk", qty: "1 cup", kcal: 70 },
    ],
  },
  {
    id: "m2",
    slot: "lunch",
    time: "13:00",
    calories: 512,
    protein: 42,
    carbs: 55,
    fat: 14,
    foods: [
      { name: "Grilled chicken breast", qty: "150 g", kcal: 248 },
      { name: "White rice", qty: "1 cup", kcal: 206 },
      { name: "Steamed broccoli", qty: "1 cup", kcal: 31 },
    ],
  },
  {
    id: "m3",
    slot: "dinner",
    time: "19:00",
    calories: 430,
    protein: 28,
    carbs: 38,
    fat: 16,
    foods: [
      { name: "Turkey breast", qty: "120 g", kcal: 178 },
      { name: "Whole-wheat wrap", qty: "1", kcal: 130 },
      { name: "Avocado", qty: "1/2", kcal: 120 },
    ],
  },
];

// The user's real routine, taken directly from the PRD's own acceptance scenario:
// "A user wakes at 3 p.m. on September 29, works from 7 p.m. to 7 a.m., and plans
// to sleep at 8 a.m. on September 30."
export const sampleRoutine: Routine = { wake: "15:00", sleep: "08:00" };
export const sampleWorkHours = { start: "19:00", end: "07:00" };

// After Meal Schedule: the same three meals, retimed to the acceptance scenario's
// "5 p.m., 11 p.m., and 4 a.m." -- content and nutrition unchanged, only the time
// and an optional custom label change.
export const scheduledMeals: Meal[] = [
  { ...baselineMeals[1], time: "17:00", label: "Before work" },
  { ...baselineMeals[2], time: "23:00", label: "Dinner break" },
  { ...baselineMeals[0], time: "04:00", label: "Before bed" },
];
