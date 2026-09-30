// Meal Schedule: lets a user organize meals around their real wake/sleep
// routine instead of a fixed clock, and correctly labels a meal that falls
// after midnight with the real calendar date it belongs to.
//
// Pure functions only, no UI and no dependency on planner.ts, so this can be
// tested in isolation and added to the app without touching the existing
// plan/grocery/prep logic at all.

export type Routine = {
  /** "HH:MM" -- when the user wakes and starts this planning period. */
  wake: string;
  /** "HH:MM" -- when the user goes to sleep, ending this planning period. */
  sleep: string;
};

export type TimedMeal = {
  id: string;
  /** 24-hour "HH:MM" local time. */
  time: string;
};

export type ScheduledMeal<T extends TimedMeal> = T & {
  /** ISO date (YYYY-MM-DD) this meal actually falls on. */
  date: string;
  /** Minutes after `wake` on the period's start date -- used for chronological sort. */
  minutesSinceWake: number;
  /** True if this meal's time falls outside [wake, sleep) -- needs explicit confirmation, not a silent move. */
  outsideWakingWindow: boolean;
};

export type ScheduleError = { field: 'wake' | 'sleep'; message: string };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Equal wake/sleep times must be corrected explicitly, not silently treated as a 24-hour day. */
export function validateRoutine(routine: Routine): ScheduleError[] {
  const errors: ScheduleError[] = [];
  if (!/^\d{2}:\d{2}$/.test(routine.wake)) errors.push({ field: 'wake', message: 'Enter a wake time.' });
  if (!/^\d{2}:\d{2}$/.test(routine.sleep)) errors.push({ field: 'sleep', message: 'Enter a sleep time.' });
  if (errors.length) return errors;
  if (routine.wake === routine.sleep) {
    errors.push({ field: 'sleep', message: "Wake and sleep times can't be the same. Enter a different sleep time." });
  }
  return errors;
}

/** How long the waking period lasts, in minutes, handling a routine that crosses midnight. */
export function wakingWindowMinutes(routine: Routine): number {
  const wake = toMinutes(routine.wake);
  const sleep = toMinutes(routine.sleep);
  return sleep > wake ? sleep - wake : 24 * 60 - wake + sleep;
}

/**
 * Attaches an explicit calendar date to every meal, given the routine's wake time and the
 * planning period's start date. A meal whose clock time is earlier than `wake` is assumed to
 * fall after midnight, on the next calendar date. Also flags meals that fall outside the
 * [wake, sleep) window, so the caller can ask for explicit confirmation instead of silently
 * moving or dropping them.
 */
export function attributeDates<T extends TimedMeal>(meals: T[], routine: Routine, startDate: string): ScheduledMeal<T>[] {
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

/** The next meal that hasn't happened yet, given the current time-of-day. Paired with a text
 * label in the UI so it never relies on color alone. */
export function nextUpcoming<T extends TimedMeal>(scheduled: ScheduledMeal<T>[], nowMinutesSinceWake: number): ScheduledMeal<T> | null {
  return scheduled.find((m) => m.minutesSinceWake >= nowMinutesSinceWake) ?? null;
}

export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};
