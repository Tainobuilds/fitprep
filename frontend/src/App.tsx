import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { batches, dateAt, defaults, eligible, generate, groceries, kcal, monday, parsePlan, quantity, recipeFor, scheduleDay, setMealTime, setRoutine, slots, swap, totals } from './planner';
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
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const dayDate = isoDate(dateAt(plan.start, day));
  const routineErrors = validateRoutine({ wake, sleep });
  const draft: Plan = { ...plan, settings: { ...plan.settings, routine: routineErrors.length ? null : { wake, sleep } }, days: plan.days.map((meals_, i) => i === day ? meals_.map((m, s) => ({ ...m, time: meals[s].time, label: meals[s].label || undefined })) : meals_) };
  const scheduled = routineErrors.length ? [] : (scheduleDay(draft, day) ?? []);
  const flagged = scheduled.filter(m => m.outsideWakingWindow);
  const canSave = routineErrors.length === 0 && flagged.every(m => confirmed.has(m.slot));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      let next = setRoutine(plan, { wake, sleep });
      meals.forEach((m, s) => { next = setMealTime(next, day, s, m.time, m.label || undefined); });
      onSave(next);
    } catch (err) { setError(err instanceof Error ? err.message : 'Please review your schedule.'); }
  };
  return <Modal title="Plan around your real routine" onClose={onClose}><form onSubmit={submit}>
    <p className="muted">Built for overnight and shift schedules. Tell us when you wake and sleep, and any meal timed before your wake-up is automatically dated as the next calendar day instead of getting lost.</p>
    <div className="field-row">
      <label className="field">Wake time<span className="input-unit"><input type="time" required value={wake} onChange={e => setWake(e.target.value)}/></span></label>
      <label className="field">Sleep time<span className="input-unit"><input type="time" required value={sleep} onChange={e => setSleep(e.target.value)}/></span></label>
    </div>
    {routineErrors.length > 0 && <p role="alert">{routineErrors[0].message}</p>}
    <p className="field-help">Meal times below are for {dateAt(plan.start, day).toLocaleDateString('en-US', { weekday: 'long' })} only — set each day separately from its day card.</p>
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
      <button className="primary" type="submit" disabled={!canSave}>Save schedule <Icon name="arrow"/></button>
    </div>
  </form></Modal>;
}
function FoodArt({ recipe, small = false }: { recipe: Recipe; small?: boolean }) {
  return <div className={`food-art ${recipe.color} ${small ? 'small' : ''}`} aria-hidden="true"><div className="food-orbit"/><div className="plate"><span>{recipe.emoji}</span></div><span className="food-sprig">✳</span></div>;
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
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('plan'); }}><span className="brand-icon">F</span>fitprep<span className="brand-dot">.</span></a><div className="sidebar-label">YOUR KITCHEN, ORGANIZED</div>
      <nav aria-label="Main navigation">{[['plan', 'calendar', 'My week'], ['groceries', 'bag', 'Grocery list'], ['prep', 'chef', 'Prep kitchen']].map(([id, icon, label]) => <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}><Icon name={icon}/>{label}{id === 'groceries' && shopping.length > 0 && <span className="nav-count">{shopping.length}</span>}</button>)}<a className="nav-item measure-match-link" href="http://localhost:3000/" target="_blank" rel="noopener noreferrer" aria-label="Open Measure/Match in a new tab">Measure/Match <Icon name="arrow" size={17}/></a></nav>
      <div className="sidebar-bottom"><div className="kitchen-note"><Icon name="leaf" size={25}/><strong>A little prep.<br/>A lot more living.</strong><p>Make room for everything beyond the kitchen.</p></div><button className="profile" onClick={() => setPreferences(true)}><span className="avatar">Y</span><span><strong>Your household</strong><small>{plan?.settings.household ? 'Cooking for two' : 'Just you, for now'}</small></span><Icon name="tune" size={17}/></button></div>
    </aside>
    <div className="workspace"><header className="topbar"><span>YOUR WEEK, WELL FED</span><div className="save-state"><span className={storageError ? 'status-dot error' : 'status-dot'}/>{storageError ? 'Unable to save in this browser' : plan ? 'Saved in this browser' : 'Your fresh start'}</div></header>
    <main><div className="page-heading"><div><div className="eyebrow">LESS DAILY COOKING. MORE GOOD FOOD.</div><h1>{tab === 'plan' ? 'A good week starts here.' : tab === 'groceries' ? 'One list. One less thing.' : 'Your prep, all together.'}</h1><p>{tab === 'plan' ? 'Meals you’ll look forward to. A plan that fits your life.' : tab === 'groceries' ? 'Everything for your week, combined into one handy list.' : 'Cook in batches, portion with purpose, enjoy your week.'}</p></div><button className="secondary" onClick={() => setPreferences(true)}><Icon name="tune"/>Preferences</button></div>
    {!plan ? <section className="welcome"><div><span className="pill">A SMALL HABIT. A BETTER WEEK.</span><h2>Your week of<br/>“what’s for dinner?”<br/><em>Sorted.</em></h2><p>Pick your preferences. Get seven days of meals, a ready-to-shop list, and a simpler way to prep.</p><button className="primary" onClick={() => setPreferences(true)}>Plan my week <Icon name="arrow"/></button><div className="welcome-points"><span>✓ Portions that fit</span><span>✓ Less daily cooking</span><span>✓ One shared grocery list</span></div></div><div className="welcome-art"><div className="hero-bowl">🥗</div><div className="floating-label top"><Icon name="calendar"/>7 days, taken care of</div><div className="floating-label bottom"><Icon name="check"/>Good food. Less guesswork.</div><span className="art-spark">✳</span></div></section> : <>
      <section className="week-banner"><div className="week-mark"><Icon name="calendar" size={28}/></div><div><span className="eyebrow">YOUR WEEKLY PLAN</span><h2>{dateAt(plan.start, 0).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – {dateAt(plan.start, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h2><p>{plan.settings.household ? '2 people' : '1 person'}<span>·</span>21 meals per person<span>·</span>{plan.settings.vegetarian ? 'Vegetarian' : 'All foods'}</p></div><button className="banner-button" onClick={() => setPreferences(true)}><Icon name="swap" size={17}/>Replan week</button></section>
      {tab === 'plan' && <><div className="section-heading"><h2>On the menu</h2><div className="person-switch" aria-label="View portions for"><button className={person === 'you' ? 'selected' : ''} onClick={() => setPerson('you')} aria-pressed={person === 'you'}>For you</button>{plan.settings.household && <button className={person === 'partner' ? 'selected' : ''} onClick={() => setPerson('partner')} aria-pressed={person === 'partner'}>For partner</button>}</div></div>
      <div className="days" aria-label="Choose a day">{plan.days.map((_, index) => <button key={index} className={day === index ? 'selected' : ''} onClick={() => setDay(index)} aria-pressed={day === index}><span>{dateAt(plan.start, index).toLocaleDateString('en-US', { weekday: 'short' })}</span><strong>{dateAt(plan.start, index).getDate()}</strong><i/></button>)}</div>
      <div className="nutrition"><div className="nutrition-title"><span className="mini-leaf"><Icon name="leaf"/></span><div><strong>Your day at a glance</strong><small>Estimated nutrition · {person === 'partner' ? 'partner’s' : 'your'} portions</small></div></div><div className="macro calories"><strong>{number(nutrition!.calories)}<small> kcal</small></strong><span>{number(plan.settings.calories * multiplier)} daily target</span></div>{(['protein', 'carbs', 'fat'] as const).map(m => <div className={`macro ${m}`} key={m}><strong>{number(nutrition![m])}<small> g</small></strong><span><i/>{m === 'fat' ? 'Fats' : m.charAt(0).toUpperCase() + m.slice(1)}</span></div>)}</div>
      <div className="meal-grid">{plan.days[day].map((meal, index) => { const recipe = recipeFor(meal); const sched = scheduled?.find(s => s.slot === slots[index]); const isNextUp = Boolean(sched && nextSlot === sched.slot); const show = () => setDetail({ recipe, factor: meal.factor * multiplier, label: person === 'partner' ? 'Partner’s portion' : 'Your portion' }); return <article className="meal-card" key={`${day}-${index}`}><button className="art-button" aria-label={`View ${recipe.name} recipe`} onClick={show}><FoodArt recipe={recipe}/><span className="time-tag"><Icon name="clock" size={13}/>{recipe.minutes} min</span></button><div className="meal-content"><div className="meal-label"><span className="meal-label-time">{sched ? formatTime(sched.time) : slots[index]}{sched?.outsideWakingWindow && <span className="schedule-tag warn">Outside routine</span>}{sched && !sched.outsideWakingWindow && sched.date !== dayDate && <span className="schedule-tag">Next day</span>}{isNextUp && <span className="schedule-tag next">Next up</span>}</span><span>{recipe.vegetarian ? 'Vegetarian' : 'Batch friendly'}</span></div>{sched?.label && <p className="meal-custom-label">{sched.label}</p>}<button className="recipe-title" onClick={show}>{recipe.name}</button><div className="meal-macros"><strong>{number(kcal(recipe) * meal.factor * multiplier)} kcal</strong><span>{number(recipe.protein * meal.factor * multiplier)}g protein</span></div><div className="meal-footer"><span>1 personalized portion</span><button className="text-button" onClick={() => setSwapping(index)} aria-label={`Swap ${slots[index].toLowerCase()}`}><Icon name="swap" size={15}/>Swap</button></div></div></article>; })}</div>
      <div className="toggle-row"><span><strong>Meal Schedule</strong><small>{plan.settings.routine ? `On · wake ${formatTime(plan.settings.routine.wake)}, sleep ${formatTime(plan.settings.routine.sleep)}` : 'Organize meals around your real wake and sleep times, not the clock.'}</small></span><button className="secondary" onClick={() => setScheduleSetup(true)}><Icon name="clock" size={17}/>{plan.settings.routine ? 'Edit' : 'Set up'}</button></div>
      <div className="bottom-callouts"><button onClick={() => setTab('groceries')}><span className="callout-icon"><Icon name="bag"/></span><span><strong>Your grocery list is ready</strong><small>{shopping.length} ingredients, automatically combined.</small></span><Icon name="arrow"/></button><button onClick={() => setTab('prep')}><span className="callout-icon peach"><Icon name="chef"/></span><span><strong>Meet your prep game plan</strong><small>{prep.length} recipes to organize your week.</small></span><Icon name="arrow"/></button></div></>}
      {tab === 'groceries' && <section><div className="section-heading"><div><h2>Let’s stock the kitchen</h2><p className="muted">{shopping.filter(i => plan.checked.includes(i.name)).length} of {shopping.length} items checked · quantities for the whole household</p></div><button className="secondary" onClick={exportList}><Icon name="download" size={18}/>Download list</button></div><div className="grocery-grid">{[...new Set(shopping.map(i => i.category))].map(category => <section className="grocery-category" key={category}><h3>{category}<span>{shopping.filter(i => i.category === category).length}</span></h3>{shopping.filter(i => i.category === category).map(item => <label className={`grocery-item ${plan.checked.includes(item.name) ? 'done' : ''}`} key={item.name}><input type="checkbox" checked={plan.checked.includes(item.name)} onChange={() => toggle('checked', item.name)}/><span>{item.name}</span><Amount name={item.name} grams={item.grams}/></label>)}</section>)}</div><p className="footnote">Amounts are rounded up to what you’d actually buy, using typical US package sizes — check your store’s. The smaller line is the exact amount the plan needs. Dry grains, drained beans, and raw proteins are weighed in that state. Seasonings and water are pantry extras.</p></section>}
      {tab === 'prep' && <section><div className="section-heading"><div><h2>A little prep goes a long way</h2><p className="muted">{prep.filter(b => plan.prepped.includes(b.recipe.id)).length} of {prep.length} recipes prepared</p></div><span className="pill">COOK · PORTION · ENJOY</span></div><div className="info-note prep-note">These are whole-week batch totals. Split cooking across the week or freeze later portions; don’t keep a full week of cooked food in the fridge. Assemble toast and fresh toppings at serving time.</div><div className="prep-list">{prep.map(batch => <article className={`prep-card ${plan.prepped.includes(batch.recipe.id) ? 'complete' : ''}`} key={batch.recipe.id}><FoodArt recipe={batch.recipe} small/><div className="prep-info"><span className="eyebrow">{batch.recipe.slot} · {batch.portions} PORTIONS</span><h3>{batch.recipe.name}</h3><p>{batch.days.map(d => dateAt(plan.start, d).toLocaleDateString('en-US', { weekday: 'short' })).join(', ')}</p></div><button className="secondary" onClick={() => setDetail({ recipe: batch.recipe, factor: batch.factor, label: `Whole-week batch · ${batch.portions} portions` })}>Batch recipe</button><label className="prep-check"><input aria-label={`Mark ${batch.recipe.name} prepared`} type="checkbox" checked={plan.prepped.includes(batch.recipe.id)} onChange={() => toggle('prepped', batch.recipe.id)}/><span>Prepared</span></label></article>)}</div></section>}
    </>}
    {!plan && tab !== 'plan' && <p className="empty-hint">Generate your first week to fill your {tab === 'groceries' ? 'grocery list' : 'prep kitchen'}.</p>}
    <footer><span className="footer-brand"><Icon name="leaf" size={15}/>Good food. Made doable.</span><span>Built around your week.</span></footer>
    </main></div>
    {preferences && <Preferences settings={plan?.settings ?? defaults} start={plan?.start ?? monday()} onSubmit={setNewPlan} onClose={() => setPreferences(false)}/>}
    {scheduleSetup && plan && <ScheduleSetup plan={plan} day={day} onSave={p => { setPlan(p); setScheduleSetup(false); setNotice(p.settings.routine ? 'Meal Schedule saved.' : 'Meal Schedule turned off.'); }} onClose={() => setScheduleSetup(false)}/>}
    {swapping !== null && plan && <Modal title={`A fresh take on ${slots[swapping].toLowerCase()}`} onClose={() => setSwapping(null)}><p className="muted">Swap this meal for {dateAt(plan.start, day).toLocaleDateString('en-US', { weekday: 'long' })}. Portions adjust to your target.</p><div className="swap-list">{eligible(slots[swapping], plan.settings).map(recipe => { const current = plan.days[day][swapping].recipeId === recipe.id; return <button className="swap-option" key={recipe.id} disabled={current} onClick={() => { setPlan(swap(plan, day, swapping, recipe.id)); setSwapping(null); setNotice('Meal swapped. Unchanged progress kept; review unchecked groceries and prep.'); }}><FoodArt recipe={recipe} small/><span><strong>{recipe.name}</strong><small>{recipe.minutes} min · {current ? 'Currently planned' : 'Choose this meal'}</small></span>{current ? <Icon name="check"/> : <Icon name="arrow"/>}</button>; })}</div></Modal>}
    {detail && <Modal title={detail.recipe.name} onClose={() => setDetail(null)}><div className="recipe-summary"><span className="pill">{detail.label}</span><span><Icon name="clock" size={16}/>{detail.recipe.minutes} min per recipe</span></div><p className="muted">{number(kcal(detail.recipe) * detail.factor)} kcal · {number(detail.recipe.protein * detail.factor)}g protein · {number(detail.recipe.carbs * detail.factor)}g carbs · {number(detail.recipe.fat * detail.factor)}g fats</p><h3>What you’ll need</h3><ul className="ingredient-list">{detail.recipe.ingredients.map(item => <li key={item.name}><span>{item.name}</span><strong>{quantity(item.grams * detail.factor)}</strong></li>)}</ul><h3>Let’s make it</h3><ol className="steps">{detail.recipe.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="footnote">Estimated nutrition. Larger batches may take longer. Portion weights include the ingredient state shown above.</p></Modal>}
    <div className={`toast ${notice ? 'visible' : ''}`} role="status">{notice && <><Icon name="check" size={18}/>{notice}</>}</div>
  </div>;
}
