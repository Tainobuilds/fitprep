import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Meal, Routine } from "./schedule";
import { attributeDates, formatDate, formatTime, nextUpcoming, validateRoutine, wakingWindowMinutes } from "./schedule";
import { baselineMeals, sampleRoutine, sampleWorkHours, scheduledMeals, startDate } from "./sampleData";

type Stage = "planner-before" | "setup" | "preview" | "planner-after";

const icon: Record<Meal["slot"], string> = { breakfast: "🍳", lunch: "🍗", dinner: "🌯" };

function number(n: number) {
  return Math.round(n);
}

export default function App() {
  const [stage, setStage] = useState<Stage>("planner-before");
  const [scheduleOn, setScheduleOn] = useState(false);
  const [meals, setMeals] = useState<Meal[]>(baselineMeals);

  // Setup-stage draft state
  const [draftRoutine, setDraftRoutine] = useState<Routine>({ wake: "07:00", sleep: "23:00" });
  const [draftMeals, setDraftMeals] = useState<Meal[]>(baselineMeals);
  const [confirmedOutside, setConfirmedOutside] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [previewAsOf, setPreviewAsOf] = useState("18:00"); // "what time is it right now" demo control

  const routineErrors = validateRoutine(draftRoutine);
  const draftScheduled = useMemo(
    () => (routineErrors.length ? [] : attributeDates(draftMeals, draftRoutine, startDate)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draftMeals, draftRoutine, routineErrors.length]
  );
  const needsConfirmation = draftScheduled.filter((m) => m.outsideWakingWindow && !confirmedOutside.has(m.id));
  const canPreview = routineErrors.length === 0 && needsConfirmation.length === 0;

  const savedScheduled = useMemo(
    () => (scheduleOn ? attributeDates(meals, sampleRoutine, startDate) : []),
    [scheduleOn, meals]
  );
  const wakeMinutes = toMinutes(sampleRoutine.wake);
  const nowMinutes = (() => {
    const m = toMinutes(previewAsOf);
    return m >= wakeMinutes ? m - wakeMinutes : 24 * 60 - wakeMinutes + m;
  })();
  const upcoming = nextUpcoming(savedScheduled, nowMinutes);

  function loadOvernightExample() {
    setDraftRoutine(sampleRoutine);
    setDraftMeals(scheduledMeals);
    setConfirmedOutside(new Set());
  }

  function openSetup() {
    setDraftRoutine(scheduleOn ? sampleRoutine : { wake: "07:00", sleep: "23:00" });
    setDraftMeals(scheduleOn ? meals : baselineMeals);
    setConfirmedOutside(new Set());
    setStage("setup");
  }

  function saveSchedule() {
    setMeals(draftMeals);
    setScheduleOn(true);
    setStage("planner-after");
    setPreviewAsOf(sampleRoutine.wake === draftRoutine.wake ? "18:00" : draftRoutine.wake);
    setToast("Schedule saved. Your food preferences and calorie targets are unchanged.");
    setTimeout(() => setToast(""), 3500);
  }

  function turnOff() {
    setScheduleOn(false);
    setMeals(baselineMeals);
    setStage("planner-before");
    setToast("Meal Schedule turned off. Back to the standard planner.");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div className="app">
      <div className="disclaimer">
        Concept prototype recreating Fitia's public meal-planning UI to demonstrate a proposed
        feature. Not affiliated with or endorsed by Fitia.
      </div>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">F</span> fitia
        </div>
        <button className="pill-btn yellow" disabled>
          Get Started
        </button>
      </header>

      <main>
        {stage === "planner-before" && (
          <PlannerView
            title="Plan"
            meals={meals}
            scheduleOn={false}
            onOpenSchedule={openSetup}
          />
        )}

        {stage === "setup" && (
          <SetupStage
            routine={draftRoutine}
            setRoutine={setDraftRoutine}
            routineErrors={routineErrors}
            meals={draftMeals}
            setMeals={setDraftMeals}
            scheduled={draftScheduled}
            confirmedOutside={confirmedOutside}
            setConfirmedOutside={setConfirmedOutside}
            canPreview={canPreview}
            onLoadExample={loadOvernightExample}
            onCancel={() => setStage(scheduleOn ? "planner-after" : "planner-before")}
            onPreview={() => setStage("preview")}
          />
        )}

        {stage === "preview" && (
          <PreviewStage
            scheduled={draftScheduled}
            routine={draftRoutine}
            onBack={() => setStage("setup")}
            onSave={saveSchedule}
          />
        )}

        {stage === "planner-after" && (
          <PlannerView
            title="Plan"
            meals={meals}
            scheduleOn
            routine={sampleRoutine}
            scheduled={savedScheduled}
            upcoming={upcoming}
            previewAsOf={previewAsOf}
            setPreviewAsOf={setPreviewAsOf}
            onOpenSchedule={openSetup}
            onTurnOff={turnOff}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** The real calendar week (Sun-Sat) containing `iso`, with correct month/day rollover --
 * a plain "+27, +28, +29..." offset would overflow past the end of the month. */
function weekAround(iso: string) {
  const anchor = new Date(`${iso}T12:00:00`);
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { label: d.toLocaleDateString("en-US", { weekday: "narrow" }), date, isToday: date === iso };
  });
}

function PlannerView({
  meals,
  scheduleOn,
  routine,
  scheduled,
  upcoming,
  previewAsOf,
  setPreviewAsOf,
  onOpenSchedule,
  onTurnOff,
}: {
  title: string;
  meals: Meal[];
  scheduleOn: boolean;
  routine?: Routine;
  scheduled?: ReturnType<typeof attributeDates>;
  upcoming?: ReturnType<typeof nextUpcoming>;
  previewAsOf?: string;
  setPreviewAsOf?: (v: string) => void;
  onOpenSchedule: () => void;
  onTurnOff?: () => void;
}) {
  const totalKcal = meals.reduce((sum, m) => sum + m.calories, 0);
  const targetKcal = 2100;
  const grouped = scheduled
    ? Object.entries(
        scheduled.reduce<Record<string, typeof scheduled>>((acc, m) => {
          (acc[m.date] ??= []).push(m);
          return acc;
        }, {})
      )
    : null;

  return (
    <div>
      <div className="day-row" aria-label="Choose a day">
        {weekAround(startDate).map(({ label, date, isToday }) => (
          <div key={date} className={`day-cell ${isToday ? "today" : ""}`}>
            {label}
            <strong>{Number(date.slice(-2))}</strong>
          </div>
        ))}
      </div>

      <div className="progress-card">
        <div className="progress-label">
          <span>Planned calories</span>
          <span>
            {number(totalKcal)}/{targetKcal} kcal
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, (totalKcal / targetKcal) * 100)}%` }} />
        </div>
      </div>

      {scheduleOn && routine && (
        <div className="info-note">
          <strong style={{ color: "var(--ink)" }}>Meal Schedule is on.</strong> Planning period starts{" "}
          {formatTime(routine.wake)} on {formatDate(startDate)} and runs to {formatTime(routine.sleep)} the
          next day.
          {setPreviewAsOf && (
            <div style={{ marginTop: 10 }}>
              <label htmlFor="asof" style={{ fontWeight: 700, textTransform: "none", display: "block", marginBottom: 4 }}>
                Preview as if it's currently:
              </label>
              <input
                id="asof"
                type="time"
                value={previewAsOf}
                onChange={(e) => setPreviewAsOf!(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}
              />
            </div>
          )}
        </div>
      )}

      {grouped
        ? grouped.map(([date, dayMeals]) => (
            <div key={date}>
              <div className="section-label">
                {formatDate(date)}
                {date !== startDate && <span className="date-chip next-day">NEXT DAY</span>}
              </div>
              {dayMeals.map((m) => (
                <MealRow key={m.id} meal={m} isNext={upcoming?.id === m.id} showDate={false} />
              ))}
            </div>
          ))
        : (["breakfast", "lunch", "dinner"] as const).map((slot) => {
            const meal = meals.find((m) => m.slot === slot);
            if (!meal) return null;
            return (
              <div key={slot}>
                <div className="section-label">{slot}</div>
                <MealRow meal={meal} isNext={false} showDate={false} />
              </div>
            );
          })}

      <div className="settings-row">
        <div>
          <div className="label">Meal Schedule</div>
          <div className="desc">
            {scheduleOn ? "On — organized around your wake/sleep routine" : "Off — using standard breakfast/lunch/dinner"}
          </div>
        </div>
        <button className="pill-btn outline" onClick={onOpenSchedule}>
          {scheduleOn ? "Edit" : "Set up"}
        </button>
      </div>
      {scheduleOn && onTurnOff && (
        <div className="settings-row">
          <div>
            <div className="label">Turn off Meal Schedule</div>
            <div className="desc">Return to the standard planning view. Your meals and logs are kept.</div>
          </div>
          <button className="pill-btn outline" onClick={onTurnOff}>
            Turn off
          </button>
        </div>
      )}
    </div>
  );
}

function MealRow({ meal, isNext }: { meal: Meal; isNext: boolean; showDate: boolean }) {
  return (
    <div className={`meal-card ${isNext ? "next" : ""}`}>
      <div className="meal-icon" aria-hidden="true">
        {icon[meal.slot]}
      </div>
      <div className="meal-info">
        <div className="top-line">
          {isNext && <span className="next-badge">NEXT UP</span>}
          {"time" in meal && <b>{formatTime((meal as any).time)}</b>}
          {meal.label && <span>· {meal.label}</span>}
        </div>
        <div className="name">{meal.foods[0]?.name ?? meal.slot}</div>
      </div>
      <div className="meal-kcal">
        <strong>{meal.calories}</strong>kcal
      </div>
    </div>
  );
}

function SetupStage({
  routine,
  setRoutine,
  routineErrors,
  meals,
  setMeals,
  scheduled,
  confirmedOutside,
  setConfirmedOutside,
  canPreview,
  onLoadExample,
  onCancel,
  onPreview,
}: {
  routine: Routine;
  setRoutine: (r: Routine) => void;
  routineErrors: { field: string; message: string }[];
  meals: Meal[];
  setMeals: (m: Meal[]) => void;
  scheduled: ReturnType<typeof attributeDates>;
  confirmedOutside: Set<string>;
  setConfirmedOutside: Dispatch<SetStateAction<Set<string>>>;
  canPreview: boolean;
  onLoadExample: () => void;
  onCancel: () => void;
  onPreview: () => void;
}) {
  const sleepError = routineErrors.find((e) => e.field === "sleep");
  const windowHrs = routineErrors.length ? null : (wakingWindowMinutes(routine) / 60).toFixed(1);

  return (
    <div>
      <div className="stage-header">
        <div className="stage-eyebrow">Meal Plan &amp; Foods</div>
        <h1 className="stage-title">Meal Schedule</h1>
      </div>

      <button className="pill-btn outline" style={{ marginBottom: 18 }} onClick={onLoadExample}>
        Load overnight-shift example
      </button>

      <div className={`field ${sleepError ? "invalid" : ""}`}>
        <label htmlFor="wake">Wake time</label>
        <input
          id="wake"
          type="time"
          value={routine.wake}
          onChange={(e) => setRoutine({ ...routine, wake: e.target.value })}
        />
      </div>
      <div className={`field ${sleepError ? "invalid" : ""}`}>
        <label htmlFor="sleep">Sleep time</label>
        <input
          id="sleep"
          type="time"
          value={routine.sleep}
          onChange={(e) => setRoutine({ ...routine, sleep: e.target.value })}
        />
        {sleepError && <div className="error-text">{sleepError.message}</div>}
        {!sleepError && windowHrs && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            That's {windowHrs} hours awake
            {toMinutes(routine.sleep) <= toMinutes(routine.wake) ? ", crossing into the next day" : ""}.
          </div>
        )}
      </div>

      <div className="section-label">Meal times</div>
      {meals.map((meal) => {
        const s = scheduled.find((x) => x.id === meal.id);
        return (
          <div key={meal.id} className="meal-time-row">
            <div className="meal-icon" aria-hidden="true">
              {icon[meal.slot]}
            </div>
            <div className="name-col">
              <div className="name" style={{ textTransform: "capitalize" }}>
                {meal.slot}
              </div>
              <input
                type="text"
                placeholder="Custom label (optional)"
                value={meal.label ?? ""}
                aria-label={`Custom label for ${meal.slot}`}
                onChange={(e) =>
                  setMeals(meals.map((m) => (m.id === meal.id ? { ...m, label: e.target.value } : m)))
                }
              />
            </div>
            <input
              type="time"
              value={meal.time}
              aria-label={`Time for ${meal.slot}`}
              onChange={(e) => setMeals(meals.map((m) => (m.id === meal.id ? { ...m, time: e.target.value } : m)))}
            />
            {s?.outsideWakingWindow && (
              <span className="date-chip next-day" style={{ marginLeft: 8 }}>
                DURING SLEEP
              </span>
            )}
          </div>
        );
      })}

      {scheduled.some((m) => m.outsideWakingWindow) && (
        <div className="confirm-box">
          <div>
            <strong>One or more meals fall during your sleep window.</strong> Confirm each one is
            intentional — nothing will be moved or deleted automatically.
            {scheduled
              .filter((m) => m.outsideWakingWindow)
              .map((m) => (
                <label key={m.id} style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={confirmedOutside.has(m.id)}
                    onChange={(e) => {
                      // Functional update, not `new Set(confirmedOutside)` off the render
                      // closure -- checking two boxes in quick succession both fire before
                      // a re-render, so both must start from the LATEST state, not the
                      // stale snapshot each closure captured, or one confirmation is lost.
                      const checked = e.target.checked;
                      setConfirmedOutside((prev) => {
                        const next = new Set(prev);
                        checked ? next.add(m.id) : next.delete(m.id);
                        return next;
                      });
                    }}
                  />
                  Yes, I mean to have {m.slot} at {formatTime(m.time)} on {formatDate(m.date)}
                </label>
              ))}
          </div>
        </div>
      )}

      <div className="info-note">
        If you have diabetes, follow the meal plan and treatment instructions provided by your
        healthcare team. Consult them before changing meal timing, reducing carbohydrates, or
        fasting, especially if you use medication that can cause low blood sugar. You don't need
        to tell us about any medical condition to use this feature.
      </div>

      <div className="actions-row">
        <button className="pill-btn outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="pill-btn yellow" disabled={!canPreview} onClick={onPreview}>
          Preview schedule
        </button>
      </div>
    </div>
  );
}

function PreviewStage({
  scheduled,
  routine,
  onBack,
  onSave,
}: {
  scheduled: ReturnType<typeof attributeDates>;
  routine: Routine;
  onBack: () => void;
  onSave: () => void;
}) {
  const grouped = Object.entries(
    scheduled.reduce<Record<string, typeof scheduled>>((acc, m) => {
      (acc[m.date] ??= []).push(m);
      return acc;
    }, {})
  );

  return (
    <div>
      <div className="stage-header">
        <div className="stage-eyebrow">Step 2 of 2</div>
        <h1 className="stage-title">Review your schedule</h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        Awake {formatTime(routine.wake)}&nbsp;–&nbsp;{formatTime(routine.sleep)}. Your calorie
        target and macros are unchanged — only meal times and labels are shown below.
      </p>

      {grouped.map(([date, meals]) => (
        <div key={date} className="preview-group">
          <div className="preview-date-label">
            {formatDate(date)}
            {date !== scheduled[0]?.date && <span className="date-chip next-day" style={{ marginLeft: 8 }}>NEXT DAY</span>}
          </div>
          {meals.map((m) => (
            <MealRow key={m.id} meal={m} isNext={false} showDate={false} />
          ))}
        </div>
      ))}

      <div className="actions-row">
        <button className="pill-btn outline" onClick={onBack}>
          Back
        </button>
        <button className="pill-btn yellow" onClick={onSave}>
          Save schedule
        </button>
      </div>
    </div>
  );
}
