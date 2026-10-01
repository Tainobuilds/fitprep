import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { applyMealSchedule, batches, dateAt, defaults, eligible, generate, groceries, kcal, monday, parsePlan, quantity, recipeFor, scheduleDay, setRoutine, slots, swap, totals } from './planner';
import type { Plan, Recipe, Settings } from './planner';
import { formatTime, nextUpcoming, validateRoutine } from './schedule';
import { storeQuantity } from './shopping';

const STORAGE = 'fitprep-plan-v1';
const number = (n: number) => Math.round(n).toLocaleString();
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function initialPlan() { try { return parsePlan(localStorage.getItem(STORAGE)); } catch { return null; } }
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M8 15h2m4 0h2m-8 3h2"/></>,
    bag: <><path d="M5 7h14l2 14H3L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
    chef: <><path d="M7 15a5 5 0 1 1 1-10 5 5 0 0 1 8 0 5 5 0 1 1 1 10v6H7v-6Zm0 2h10"/></>,
    leaf: <><path d="M20 3C9 2 2 7 5 15s16 4 15-12ZM5 20l10-11"/></>,
    swap: <><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/></>,
    tune: <><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,
    check: <path d="m5 12 4 4L19 6"/>, arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.leaf}</svg>;
}
function Amount({ name, grams }: { name: string; grams: number }) {
  const q = storeQuantity(name, grams);
  return <strong>{q.buy}{q.detail && <small>{q.detail}</small>}</strong>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="modal-title"><div className="dialog-body"><div className="dialog-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>{children}</div></dialog>;
}
function Preferences({ settings, start, onSubmit, onClose }: { settings: Settings; start: string; onSubmit: (s: Settings, start: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(settings);
  const [weekStart, setWeekStart] = useState(start);
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); try { onSubmit(draft, weekStart); } catch (err) { setError(err instanceof Error ? err.message : 'Please review your preferences.'); } };
  return <Modal title="Make this week yours" onClose={onClose}><form onSubmit={submit}>
    <p className="muted">Choose your routine. We’ll scale three daily meals to your calorie target.</p>
    <label className="field">Week starting<span className="input-unit"><input type="date" required value={weekStart} onInput={e => setWeekStart(e.currentTarget.value)} onChange={e => setWeekStart(e.target.value)}/></span></label>
    <label className="field">Your daily calorie target<span className="input-unit"><input autoFocus type="number" min="1000" max="5000" step="1" required value={draft.calories || ''} onChange={e => setDraft({ ...draft, calories: e.target.valueAsNumber })}/><span>kcal / day</span></span></label>
    <p className="field-help">Use your own target. The sample 2,000 kcal value is a starting placeholder.</p>
    <label className="toggle-row"><span><strong>Cooking for two</strong><small>Same recipes, individually scaled portions.</small></span><input type="checkbox" checked={draft.household} onChange={e => setDraft({ ...draft, household: e.target.checked })}/></label>
    {draft.household && <label className="field">Partner’s daily calorie target<span className="input-unit"><input type="number" min="1000" max="5000" required value={draft.partnerCalories || ''} onChange={e => setDraft({ ...draft, partnerCalories: e.target.valueAsNumber })}/><span>kcal / day</span></span></label>}
    <label className="field">Food preference<select value={draft.vegetarian ? 'vegetarian' : 'all'} onChange={e => setDraft({ ...draft, vegetarian: e.target.value === 'vegetarian' })}><option value="all">All foods</option><option value="vegetarian">Vegetarian (includes eggs & dairy)</option></select></label>
    <label className="field">How much variety?<select value={draft.variety} onChange={e => setDraft({ ...draft, variety: e.target.value as Settings['variety'] })}><option value="minimal">Keep it simple · repeat meals all week</option><option value="balanced">A little variety · rotate every 3 days</option><option value="high">Mix it up · rotate daily</option></select></label>
    <div className="info-note">Nutrition is estimated from our starter recipes. Review ingredients for your dietary needs. Changing preferences replaces the current plan and resets its checklists.</div>
    {error && <p role="alert">{error}</p>}
    <button className="primary full" type="submit">Generate my week <Icon name="arrow"/></button>
  </form></Modal>;
}
function ScheduleSetup({ plan, day, onSave, onClose }: { plan: Plan; day: number; onSave: (p: Plan) => void; onClose: () => void }) {
  const existing = plan.settings.routine;
  const [wake, setWake] = useState(existing?.wake ?? '07:00');
  const [sleep, setSleep] = useState(existing?.sleep ?? '23:00');
  const [meals, setMeals] = useState(() => plan.days[day].map(m => ({ time: m.time, label: m.label ?? '' })));
  const [scope, setScope] = useState<'day' | 'week' | 'selected'>('day');
  const [selectedDays, setSelectedDays] = useState<number[]>([day]);
  const targetDays = scope === 'week' ? plan.days.map((_, i) => i) : scope === 'day' ? [day] : selectedDays;
  const dayName = (i: number) => dateAt(plan.start, i).toLocaleDateString('en-US', { weekday: 'short' });
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  useEffect(() => { setConfirmed(new Set()); }, [wake, sleep, meals, scope, selectedDays]);
  const [error, setError] = useState('');
  const dayDate = isoDate(dateAt(plan.start, day));
  const routineErrors = validateRoutine({ wake, sleep });
  const draft: Plan = { ...plan, settings: { ...plan.settings, routine: routineErrors.length ? null : { wake, sleep } }, days: plan.days.map((meals_, i) => i === day ? meals_.map((m, s) => ({ ...m, time: meals[s].time, label: meals[s].label || undefined })) : meals_) };
  const scheduled = routineErrors.length ? [] : (scheduleDay(draft, day) ?? []);
  const flagged = scheduled.filter(m => m.outsideWakingWindow);
  const canSave = targetDays.length > 0 && routineErrors.length === 0 && flagged.every(m => confirmed.has(m.slot));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      if (!canSave) return;
      const next = applyMealSchedule(setRoutine(plan, { wake, sleep }), targetDays, meals);
      onSave(next);
    } catch (err) { setError(err instanceof Error ? err.message : 'Please review your schedule.'); }
  };
  return <Modal title="Plan around your real routine" onClose={onClose}><form onSubmit={submit}>
    <p className="muted">Set your meal times once, then choose the days they fit. Meals after midnight stay part of your waking day.</p>
    <div className="field-row">
      <label className="field">Wake time<span className="input-unit"><input type="time" required value={wake} onChange={e => setWake(e.target.value)}/></span></label>
      <label className="field">Sleep time<span className="input-unit"><input type="time" required value={sleep} onChange={e => setSleep(e.target.value)}/></span></label>
    </div>
    <p className="field-help">Wake and sleep times apply to the whole week.</p>
    {routineErrors.length > 0 && <p role="alert">{routineErrors[0].message}</p>}
    <fieldset className="schedule-scope">
      <legend>Apply these meal times and labels to</legend>
      <div className="scope-options">
        {([['day', `Only ${dayName(day)}`], ['week', 'Whole week'], ['selected', 'Choose days']] as const).map(([value, label]) => <label key={value} className={scope === value ? 'active' : ''}><input type="radio" name="schedule-scope" value={value} checked={scope === value} onChange={() => setScope(value)}/>{label}</label>)}
      </div>
      {scope === 'selected' && <div className="schedule-days" aria-label="Days to update">{plan.days.map((_, i) => <button type="button" key={i} aria-pressed={selectedDays.includes(i)} onClick={() => setSelectedDays(days => days.includes(i) ? days.filter(d => d !== i) : [...days, i].sort())}>{dayName(i)}<small>{dateAt(plan.start, i).getDate()}</small></button>)}</div>}
      <p className="scope-summary" aria-live="polite">{targetDays.length ? `Meal times and labels will be saved for ${scope === 'week' ? 'all 7 days' : targetDays.map(dayName).join(', ')}. You can adjust any day later.` : 'Choose at least one day to continue.'}</p>
      {targetDays.length > 1 && <p className="field-help">This replaces existing meal times and labels on those days.</p>}
    </fieldset>
    {slots.map((slotName, s) => <div className="field-row" key={slotName}>
      <label className="field">{slotName} time<span className="input-unit"><input type="time" required value={meals[s].time} onChange={e => setMeals(m => m.map((x, i) => i === s ? { ...x, time: e.target.value } : x))}/></span></label>
      <label className="field">{slotName} label (optional)<span className="input-unit"><input type="text" maxLength={40} placeholder="e.g. Before shift" value={meals[s].label} onChange={e => setMeals(m => m.map((x, i) => i === s ? { ...x, label: e.target.value } : x))}/></span></label>
    </div>)}
    {flagged.length > 0 && <div className="confirm-box">
      <strong>These meals fall outside your waking hours</strong>
      <p>Nothing was moved automatically — confirm each one below, or change its time above.</p>
      {flagged.map(m => <label key={m.slot}><input type="checkbox" checked={confirmed.has(m.slot)} onChange={e => setConfirmed(c => { const next = new Set(c); if (e.target.checked) next.add(m.slot); else next.delete(m.slot); return next; })}/><span>Keep {m.slot} at {formatTime(m.time)}{m.date !== dayDate ? ', next day' : ''}</span></label>)}
    </div>}
    {error && <p role="alert">{error}</p>}
    <div className="schedule-actions">
      {existing && <button type="button" className="secondary" onClick={() => onSave(setRoutine(plan, null))}>Turn off</button>}
      <button className="primary" type="submit" disabled={!canSave}>Save {targetDays.length === 1 ? dayName(targetDays[0]) : `${targetDays.length} days`} <Icon name="arrow"/></button>
    </div>
  </form></Modal>;
}
export default function App() {
  const [plan, setPlan] = useState<Plan | null>(initialPlan);
  const [tab, setTab] = useState('plan');
  const [day, setDay] = useState(0);
  const [person, setPerson] = useState('you');
  const [preferences, setPreferences] = useState(false);
  const [scheduleSetup, setScheduleSetup] = useState(false);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ recipe: Recipe; factor: number; label: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { if (plan) { try { localStorage.setItem(STORAGE, JSON.stringify(plan)); setStorageError(false); } catch { setStorageError(true); } } }, [plan]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); } }, [notice]);
  const shopping = plan ? groceries(plan) : [];
  const prep = plan ? batches(plan) : [];
  const multiplier = plan?.settings.household && person === 'partner' ? plan.settings.partnerCalories / plan.settings.calories : 1;
  const nutrition = plan ? totals(plan.days[day], multiplier) : null;
  const target = plan ? plan.settings.calories * multiplier : 0;
  const scheduled = plan?.settings.routine ? scheduleDay(plan, day) : null;
  const dayDate = plan ? isoDate(dateAt(plan.start, day)) : '';
  const nextSlot = (() => {
    if (!scheduled || !plan?.settings.routine || dayDate !== isoDate(new Date())) return null;
    const [wh, wm] = plan.settings.routine.wake.split(':').map(Number);
    const wakeMinutes = wh * 60 + wm;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const nowSinceWake = currentMinutes >= wakeMinutes ? currentMinutes - wakeMinutes : 24 * 60 - wakeMinutes + currentMinutes;
    return nextUpcoming(scheduled, nowSinceWake)?.slot ?? null;
  })();
  const setNewPlan = (settings: Settings, start: string) => { setPlan(generate(settings, plan ? plan.generation + 1 : 0, start)); setPreferences(false); setDay(0); setPerson('you'); setTab('plan'); setNotice('Your week is ready. Let’s make it a good one.'); };
  const toggle = (key: 'checked' | 'prepped', id: string) => setPlan(p => p ? { ...p, [key]: p[key].includes(id) ? p[key].filter(v => v !== id) : [...p[key], id] } : p);
  const exportList = () => {
    if (!plan) return;
    const content = `FitPrep grocery list · week of ${plan.start}\nQuantities for ${plan.settings.household ? 'two people' : 'one person'}, 7 days.\n\n` + shopping.map(i => `${plan.checked.includes(i.name) ? '[x]' : '[ ]'} ${i.name}: ${storeQuantity(i.name, i.grams).buy}${storeQuantity(i.name, i.grams).detail ? ` (${storeQuantity(i.name, i.grams).detail})` : ''}`).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = `fitprep-groceries-${plan.start}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Grocery list downloaded.');
  };
  return <div className="app">
    <p className="disclaimer">A class project inspired by Fitia — not affiliated with or endorsed by Fitia.</p>
    <header className="topbar">
      <span className="brand"><span className="brand-mark">F</span>fitprep</span>
      <button className="pill-btn outline" onClick={() => setPreferences(true)}>Preferences</button>
    </header>
    <main>
      {!plan && tab === 'plan' ? <section>
        <div className="stage-header"><div className="stage-eyebrow">A small habit. A better week.</div><h1 className="stage-title">Your week of “what’s for dinner?” Sorted.</h1></div>
        <p className="muted">Pick your preferences. Get seven days of meals, a ready-to-shop list, and a simpler way to prep.</p>
        <div className="hero-bowl">🥗</div>
        <button className="pill-btn yellow full" onClick={() => setPreferences(true)}>Plan my week <Icon name="arrow"/></button>
        <div className="welcome-points"><span>✓ Portions that fit</span><span>✓ Less daily cooking</span><span>✓ One shared grocery list</span></div>
      </section> : !plan ? <p className="empty-hint">Generate your first week to fill your {tab === 'groceries' ? 'grocery list' : 'prep kitchen'}.</p> : <>
        {tab === 'plan' && <>
          <p className="save-note"><span className={storageError ? 'status-dot error' : 'status-dot'}/>{storageError ? 'Unable to save in this browser' : 'Saved in this browser'}</p>
          <div className="week-line"><strong>{dateAt(plan.start, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {dateAt(plan.start, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong><button className="secondary" onClick={() => setPreferences(true)}><Icon name="swap" size={14}/>Replan</button></div>
          {plan.settings.household && <div className="person-switch" aria-label="View portions for"><button className={person === 'you' ? 'selected' : ''} onClick={() => setPerson('you')} aria-pressed={person === 'you'}>For you</button><button className={person === 'partner' ? 'selected' : ''} onClick={() => setPerson('partner')} aria-pressed={person === 'partner'}>For partner</button></div>}
          <div className="day-row" aria-label="Choose a day">{plan.days.map((_, index) => <button key={index} className="day-cell" onClick={() => setDay(index)} aria-pressed={day === index}><span className={day === index ? 'today-circle' : ''}>{dateAt(plan.start, index).toLocaleDateString('en-US', { weekday: 'narrow' })}</span><strong className={day === index ? 'accent-num' : ''}>{dateAt(plan.start, index).getDate()}</strong></button>)}</div>
          <div className="stat-grid">
            <div className="stat-col"><span className="stat-label">kcal</span><span className="stat-value">{number(nutrition!.calories)}<small> / {number(target)}</small></span><div className="stat-bar"><div style={{ width: `${Math.min(100, (nutrition!.calories / target) * 100)}%` }}/></div></div>
            <div className="stat-col"><span className="stat-label">Protein</span><span className="stat-value">{number(nutrition!.protein)}<small> g</small></span></div>
            <div className="stat-col"><span className="stat-label">Carbs</span><span className="stat-value">{number(nutrition!.carbs)}<small> g</small></span></div>
            <div className="stat-col"><span className="stat-label">Fats</span><span className="stat-value">{number(nutrition!.fat)}<small> g</small></span></div>
          </div>
          {plan.days[day].map((meal, index) => { const recipe = recipeFor(meal); const sched = scheduled?.find(s => s.slot === slots[index]); const isNextUp = Boolean(sched && nextSlot === sched.slot); const show = () => setDetail({ recipe, factor: meal.factor * multiplier, label: person === 'partner' ? 'Partner’s portion' : 'Your portion' }); return <div className={`meal-section ${isNextUp ? 'next' : ''}`} key={`${day}-${index}`}>
            <div className="meal-section-head">
              <div>
                <h3>{slots[index]}</h3>
                <div className="meal-sched-line">
                  <b>{sched ? formatTime(sched.time) : 'Not scheduled'}</b>
                  {sched?.label && <span>· {sched.label}</span>}
                  {isNextUp && <span className="next-badge">NEXT UP</span>}
                  {sched && !sched.outsideWakingWindow && sched.date !== dayDate && <span className="date-chip next-day">NEXT DAY</span>}
                  {sched?.outsideWakingWindow && <span className="date-chip next-day">OUTSIDE ROUTINE</span>}
                </div>
              </div>
              <span className="mini-brand"><span className="brand-mark">F</span>fitprep</span>
            </div>
            <p className="meal-section-summary">🔥 {number(kcal(recipe) * meal.factor * multiplier)} kcal • {number(recipe.protein * meal.factor * multiplier)}P | {number(recipe.carbs * meal.factor * multiplier)}C | {number(recipe.fat * meal.factor * multiplier)}F</p>
            <button className="food-row" onClick={show} aria-label={`View ${recipe.name} recipe`}>
              <span className="meal-icon">{recipe.emoji}</span>
              <span className="food-name">{recipe.name}</span>
              <span className="food-meta"><b>1 serving</b><small>{number(kcal(recipe) * meal.factor * multiplier)} kcal</small></span>
              <span className="food-radio" aria-hidden="true"/>
            </button>
            <button className="add-pill" onClick={() => setSwapping(index)} aria-label={`Swap ${slots[index].toLowerCase()}`}><Icon name="swap" size={14}/>Swap this meal</button>
          </div>; })}
          <div className="settings-row"><div><div className="label">Meal Schedule</div><div className="desc">{plan.settings.routine ? `On · wake ${formatTime(plan.settings.routine.wake)}, sleep ${formatTime(plan.settings.routine.sleep)}` : 'Organize meals around your real wake and sleep times, not the clock.'}</div></div><button className="pill-btn outline" onClick={() => setScheduleSetup(true)}>{plan.settings.routine ? 'Edit' : 'Set up'}</button></div>
          <div className="settings-row"><div><div className="label">Grocery list</div><div className="desc">{shopping.length} ingredients, automatically combined.</div></div><button className="pill-btn outline" onClick={() => setTab('groceries')}>Open</button></div>
          <div className="settings-row"><div><div className="label">Prep kitchen</div><div className="desc">{prep.length} recipes to organize your week.</div></div><button className="pill-btn outline" onClick={() => setTab('prep')}>Open</button></div>
        </>}
        {tab === 'groceries' && <section>
          <div className="stage-header"><div className="stage-eyebrow">Grocery list</div><h1 className="stage-title">Let’s stock the kitchen.</h1></div>
          <div className="week-line"><span className="muted">{shopping.filter(i => plan.checked.includes(i.name)).length} of {shopping.length} items checked</span><button className="secondary" onClick={exportList}><Icon name="download" size={14}/>Download</button></div>
          {[...new Set(shopping.map(i => i.category))].map(category => <section className="grocery-category" key={category}><h3>{category}<span>{shopping.filter(i => i.category === category).length}</span></h3>{shopping.filter(i => i.category === category).map(item => <label className={`grocery-item ${plan.checked.includes(item.name) ? 'done' : ''}`} key={item.name}><input type="checkbox" checked={plan.checked.includes(item.name)} onChange={() => toggle('checked', item.name)}/><span>{item.name}</span><Amount name={item.name} grams={item.grams}/></label>)}</section>)}
          <p className="footnote">Amounts are rounded up to what you’d actually buy, using typical US package sizes — check your store’s. The smaller line is the exact amount the plan needs. Dry grains, drained beans, and raw proteins are weighed in that state. Seasonings and water are pantry extras.</p>
        </section>}
        {tab === 'prep' && <section>
          <div className="stage-header"><div className="stage-eyebrow">Prep kitchen</div><h1 className="stage-title">A little prep goes a long way.</h1></div>
          <p className="muted">{prep.filter(b => plan.prepped.includes(b.recipe.id)).length} of {prep.length} recipes prepared</p>
          <div className="info-note">These are whole-week batch totals. Split cooking across the week or freeze later portions; don’t keep a full week of cooked food in the fridge. Assemble toast and fresh toppings at serving time.</div>
          {prep.map(batch => <div className={`meal-card ${plan.prepped.includes(batch.recipe.id) ? 'done-prep' : ''}`} key={batch.recipe.id}>
            <button className="meal-tap" onClick={() => setDetail({ recipe: batch.recipe, factor: batch.factor, label: `Whole-week batch · ${batch.portions} portions` })}>
              <span className="meal-icon">{batch.recipe.emoji}</span>
              <span className="meal-info"><span className="top-line"><b>{batch.recipe.slot}</b><span>· {batch.portions} portions · {batch.days.map(d => dateAt(plan.start, d).toLocaleDateString('en-US', { weekday: 'short' })).join(', ')}</span></span><span className="name">{batch.recipe.name}</span></span>
            </button>
            <label className="prep-check"><input aria-label={`Mark ${batch.recipe.name} prepared`} type="checkbox" checked={plan.prepped.includes(batch.recipe.id)} onChange={() => toggle('prepped', batch.recipe.id)}/></label>
          </div>)}
        </section>}
      </>}
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">
      {[['plan', 'calendar', 'My week'], ['groceries', 'bag', 'Grocery'], ['prep', 'chef', 'Prep']].map(([id, icon, label]) => <button key={id} className={`bottom-nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}><span className="nav-icon"><Icon name={icon} size={19}/>{id === 'groceries' && shopping.length > 0 && <span className="nav-count">{shopping.length}</span>}</span><small>{label}</small></button>)}
      <a className="bottom-nav-item" href="http://localhost:3000/" target="_blank" rel="noopener noreferrer" aria-label="Open Measure/Match in a new tab"><span className="nav-icon"><Icon name="arrow" size={19}/></span><small>Measure</small></a>
    </nav>
    {preferences && <Preferences settings={plan?.settings ?? defaults} start={plan?.start ?? monday()} onSubmit={setNewPlan} onClose={() => setPreferences(false)}/>}
    {scheduleSetup && plan && <ScheduleSetup plan={plan} day={day} onSave={p => { setPlan(p); setScheduleSetup(false); setNotice(p.settings.routine ? 'Meal Schedule saved.' : 'Meal Schedule turned off.'); }} onClose={() => setScheduleSetup(false)}/>}
    {swapping !== null && plan && <Modal title={`A fresh take on ${slots[swapping].toLowerCase()}`} onClose={() => setSwapping(null)}><p className="muted">Swap this meal for {dateAt(plan.start, day).toLocaleDateString('en-US', { weekday: 'long' })}. Portions adjust to your target.</p><div className="swap-list">{eligible(slots[swapping], plan.settings).map(recipe => { const current = plan.days[day][swapping].recipeId === recipe.id; return <button className="swap-option" key={recipe.id} disabled={current} onClick={() => { setPlan(swap(plan, day, swapping, recipe.id)); setSwapping(null); setNotice('Meal swapped. Unchanged progress kept; review unchecked groceries and prep.'); }}><span className="meal-icon small">{recipe.emoji}</span><span><strong>{recipe.name}</strong><small>{recipe.minutes} min · {current ? 'Currently planned' : 'Choose this meal'}</small></span>{current ? <Icon name="check"/> : <Icon name="arrow"/>}</button>; })}</div></Modal>}
    {detail && <Modal title={detail.recipe.name} onClose={() => setDetail(null)}><div className="recipe-summary"><span className="pill">{detail.label}</span><span><Icon name="clock" size={16}/>{detail.recipe.minutes} min per recipe</span></div><p className="muted">{number(kcal(detail.recipe) * detail.factor)} kcal · {number(detail.recipe.protein * detail.factor)}g protein · {number(detail.recipe.carbs * detail.factor)}g carbs · {number(detail.recipe.fat * detail.factor)}g fats</p><h3>What you’ll need</h3><ul className="ingredient-list">{detail.recipe.ingredients.map(item => <li key={item.name}><span>{item.name}</span><strong>{quantity(item.grams * detail.factor)}</strong></li>)}</ul><h3>Let’s make it</h3><ol className="steps">{detail.recipe.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="footnote">Estimated nutrition. Larger batches may take longer. Portion weights include the ingredient state shown above.</p></Modal>}
    <div className={`toast ${notice ? 'visible' : ''}`} role="status">{notice && <><Icon name="check" size={18}/>{notice}</>}</div>
  </div>;
}
