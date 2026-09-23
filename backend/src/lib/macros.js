// Turns a user's profile into target calories and macros.
//
// PRD note: Section 3's profile inputs list age/weight/height/activity/goal
// but not biological sex. Sex is added here because the standard BMR formula
// (Mifflin-St Jeor) needs it to be accurate — without it, calorie targets
// would be off by ~150-200 calories/day. Worth confirming with the team,
// but this is a real gap the app needs to close either way.
//
// Units: weight in pounds, height in inches (US-facing app) — converted to
// kg/cm internally because Mifflin-St Jeor is defined in metric units.

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, // little to no exercise
  light: 1.375, // light exercise 1-3 days/week
  moderate: 1.55, // moderate exercise 3-5 days/week
  active: 1.725, // hard exercise 6-7 days/week
  very_active: 1.9, // very hard exercise + physical job
};

const GOAL_CALORIE_ADJUSTMENTS = {
  fat_loss: -500, // ~1 lb/week deficit
  maintenance: 0,
  muscle_gain: 300, // modest surplus to limit fat gain
};

export function calculateMacroTargets({ sex, age, weightLbs, heightIn, activityLevel, goal }) {
  const missing = ["sex", "age", "weightLbs", "heightIn", "activityLevel", "goal"].filter(
    (field) => arguments[0][field] === undefined || arguments[0][field] === null
  );
  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }
  if (!(activityLevel in ACTIVITY_MULTIPLIERS)) {
    throw new Error(
      `Invalid activityLevel "${activityLevel}" — expected one of: ${Object.keys(ACTIVITY_MULTIPLIERS).join(", ")}`
    );
  }
  if (!(goal in GOAL_CALORIE_ADJUSTMENTS)) {
    throw new Error(`Invalid goal "${goal}" — expected one of: ${Object.keys(GOAL_CALORIE_ADJUSTMENTS).join(", ")}`);
  }

  const weightKg = weightLbs * 0.453592;
  const heightCm = heightIn * 2.54;

  // Mifflin-St Jeor equation
  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
  const calories = Math.round(tdee + GOAL_CALORIE_ADJUSTMENTS[goal]);

  // Macro split: 1g protein per lb bodyweight, 25% of calories from fat,
  // remaining calories from carbs.
  const proteinG = Math.round(weightLbs * 1);
  const fatCalories = calories * 0.25;
  const fatG = Math.round(fatCalories / 9);
  const proteinCalories = proteinG * 4;
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbsG = Math.max(0, Math.round(carbCalories / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    proteinG,
    carbsG,
    fatG,
  };
}
