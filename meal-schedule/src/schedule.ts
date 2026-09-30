// Core scheduling logic for the "Meal Schedule" feature (see the PRD:
// docs/meal-schedule-prd.pdf). Kept as pure functions, separate from any UI,
// so the date-crossing-midnight math can be tested directly.

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type Meal = {
  id: string;
  slot: MealSlot;
  /** 24-hour "HH:MM" local time, as entered by the user. */
  time: string;
  /** Optional custom display label, e.g. "Before work" — the underlying slot stays the same. */
  label?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: { name: string; qty: string; kcal: number }[];
};

export type Routine = {
  /** "HH:MM" — when the user wakes and starts this planning period. */
  wake: string;
  /** "HH:MM" — when the user goes to sleep, ending this planning period. */
  sleep: string;
};

export type ScheduledMeal = Meal & {
  /** ISO date (YYYY-MM-DD) this meal actually falls on. */
  date: string;
  /** Minutes after `wake` on the period's start date — used for chronological sort. */
  minutesSinceWake: number;
  /** True if this meal's time falls outside [wake, sleep) — needs explicit confirmation, not a silent move. */
  outsideWakingWindow: boolean;
};

export type ScheduleError = { field: "wake" | "sleep" | string; message: string };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Validate a routine before it can be previewed or saved. Mirrors the PRD's P0 requirements:
 * equal wake/sleep must be corrected explicitly, not silently treated as a 24-hour day. */
export function validateRoutine(routine: Routine): ScheduleError[] {
  const errors: ScheduleError[] = [];
  if (!/^\d{2}:\d{2}$/.test(routine.wake)) errors.push({ field: "wake", message: "Enter a wake time." });
  if (!/^\d{2}:\d{2}$/.test(routine.sleep)) errors.push({ field: "sleep", message: "Enter a sleep time." });
  if (errors.length) return errors;
  if (routine.wake === routine.sleep) {
    errors.push({
      field: "sleep",
      message: "Wake and sleep times can't be the same. Enter a sleep time that's different from your wake time.",
    });
  }
  return errors;
}

/** How long the waking period lasts, in minutes, handling the case where sleep crosses midnight. */
export function wakingWindowMinutes(routine: Routine): number {
  const wake = toMinutes(routine.wake);
  const sleep = toMinutes(routine.sleep);
  return sleep > wake ? sleep - wake : 24 * 60 - wake + sleep;
}

/**
 * Attaches an explicit calendar date to every meal, given the routine's wake time and the
 * planning period's start date. A meal whose clock time is earlier than `wake` is assumed to
 * fall after midnight, on the next calendar date -- this is the PRD's core behavior:
 * "a period starting September 29 at 3 p.m. can include a meal on September 30 at 1 a.m."
 *
 * Also flags meals that fall outside the [wake, sleep) window, so the UI can ask the user to
 * confirm an intentional meal during their sleep period rather than silently moving it.
 */
export function attributeDates(meals: Meal[], routine: Routine, startDate: string): ScheduledMeal[] {
  const wake = toMinutes(routine.wake);
  const windowMinutes = wakingWindowMinutes(routine);
  return meals
    .map((meal) => {
      const mealMinutes = toMinutes(meal.time);
      const minutesSinceWake = mealMinutes >= wake ? mealMinutes - wake : 24 * 60 - wake + mealMinutes;
      const date = mealMinutes >= wake ? startDate : addDays(startDate, 1);
      return { ...meal, date, minutesSinceWake, outsideWakingWindow: minutesSinceWake >= windowMinutes };
    })
    .sort((a, b) => a.minutesSinceWake - b.minutesSinceWake);
}

/** The next meal that hasn't happened yet, given the current time-of-day. Used to answer
 * "which meal is next" without relying on color alone (paired with a text label in the UI). */
export function nextUpcoming(scheduled: ScheduledMeal[], nowMinutesSinceWake: number): ScheduledMeal | null {
  return scheduled.find((m) => m.minutesSinceWake >= nowMinutesSinceWake) ?? null;
}

export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
