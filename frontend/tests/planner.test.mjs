import test from 'node:test';
import assert from 'node:assert/strict';
import { batches, defaults, generate, groceries, monday, parsePlan, recipeFor, scheduleDay, setMealTime, setRoutine, swap, totals } from '../src/planner.ts';

const near = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} should equal ${b}`);
test('all seven days hit the chosen calorie target, including the partner', () => {
  for (const calories of [1000, 1750, 2300, 5000]) for (const variety of ['minimal', 'balanced', 'high']) {
    const p = generate({ ...defaults, calories, variety, household: true, partnerCalories: 2600 });
    assert.equal(p.days.length, 7);
    for (const day of p.days) {
      assert.equal(day.length, 3);
      near(totals(day).calories, calories);
      near(totals(day, 2600 / calories).calories, 2600);
    }
  }
});
test('vegetarian generation and swaps exclude meat and fish', () => {
  const p = generate({ ...defaults, vegetarian: true }, 2);
  assert.ok(p.days.flat().every(m => recipeFor(m).vegetarian));
  assert.throws(() => swap(p, 0, 1, 'chicken-bowl'));
  assert.throws(() => swap(p, 0, 0, 'tofu-bowl'));
});
test('minimal variety repeats three recipes; high variety rotates', () => {
  const minimal = generate({ ...defaults, variety: 'minimal' });
  assert.equal(new Set(minimal.days.flat().map(m => m.recipeId)).size, 3);
  const high = generate({ ...defaults, variety: 'high' });
  assert.equal(new Set(high.days.flat().map(m => m.recipeId)).size, 9);
});
test('household groceries combine duplicates and match batch ingredients', () => {
  const solo = generate(defaults);
  const duo = generate({ ...defaults, household: true, partnerCalories: 3000 });
  const list = groceries(duo);
  assert.equal(list.length, new Set(list.map(i => i.name)).size);
  for (const item of groceries(solo)) near(list.find(i => i.name === item.name).grams, item.grams * 2.5);
  for (const item of list) {
    const batchAmount = batches(duo).reduce((sum, b) => sum + (b.recipe.ingredients.find(i => i.name === item.name)?.grams ?? 0) * b.factor, 0);
    near(item.grams, batchAmount);
  }
  assert.equal(batches(duo).reduce((sum, b) => sum + b.portions, 0), 42);
});
test('swap updates only selected meal, preserves targets, and clears affected progress', () => {
  const p = generate(defaults); p.checked = ['Chicken breast, raw']; p.prepped = ['chicken-bowl'];
  const next = swap(p, 0, 1, 'tofu-bowl');
  assert.equal(next.days[0][1].recipeId, 'tofu-bowl');
  assert.deepEqual(next.days.slice(1), p.days.slice(1));
  assert.deepEqual(next.days[0][0], p.days[0][0]);
  near(totals(next.days[0]).calories, 2000);
  assert.deepEqual(next.checked, []); assert.deepEqual(next.prepped, []);
  assert.notDeepEqual(groceries(next), groceries(p));
});
test('swaps preserve unrelated progress and recheck changed shared ingredients and batches', () => {
  for (const household of [false, true]) {
    const p = generate({ ...defaults, household, partnerCalories: 3000 });
    p.checked = groceries(p).map(i => i.name);
    p.prepped = batches(p).map(b => b.recipe.id);
    const original = JSON.stringify(p);
    const next = swap(p, 0, 1, 'tofu-bowl');
    assert.ok(next.checked.includes('Rolled oats, dry'));
    assert.ok(next.prepped.includes('berry-oats'));
    for (const name of ['Chicken breast, raw', 'Firm tofu', 'Brown rice, dry', 'Olive oil']) assert.ok(!next.checked.includes(name), name);
    for (const id of ['chicken-bowl', 'tofu-bowl']) assert.ok(!next.prepped.includes(id), id);
    near(totals(next.days[0]).calories, 2000);
    near(totals(next.days[0], 1.5).calories, 3000);
    for (const item of groceries(next)) near(item.grams, batches(next).reduce((sum, b) => sum + (b.recipe.ingredients.find(i => i.name === item.name)?.grams ?? 0) * b.factor, 0));
    assert.deepEqual(parsePlan(JSON.stringify(next)), next);
    assert.equal(JSON.stringify(p), original);
    assert.deepEqual(swap(p, 0, 1, 'chicken-bowl'), p);
  }
});
test('swapping the final occurrence removes obsolete grocery and prep checks', () => {
  let p = generate({ ...defaults, variety: 'minimal' });
  for (let d = 0; d < 6; d++) p = swap(p, d, 1, 'tofu-bowl');
  p.checked = ['Chicken breast, raw', 'Rolled oats, dry'];
  p.prepped = ['chicken-bowl', 'berry-oats'];
  const next = swap(p, 6, 1, 'tofu-bowl');
  assert.deepEqual(next.checked, ['Rolled oats, dry']);
  assert.deepEqual(next.prepped, ['berry-oats']);
  assert.ok(!groceries(next).some(i => i.name === 'Chicken breast, raw'));
});
test('saved factors are rebuilt and affected completion cannot survive corrected quantities', () => {
  for (const factor of [19, -1, null, '19']) {
    const p = generate({ ...defaults, household: true, partnerCalories: 3000 });
    p.days[0][0].factor = factor;
    p.checked = ['Rolled oats, dry', 'not-an-ingredient']; p.prepped = ['berry-oats', 'unknown'];
    const restored = parsePlan(JSON.stringify(p));
    assert.ok(restored);
    near(totals(restored.days[0]).calories, 2000);
    near(totals(restored.days[0], 1.5).calories, 3000);
    assert.deepEqual(restored.checked, []); assert.deepEqual(restored.prepped, []);
  }
});
test('saved dates must be real dates with a complete representable week', () => {
  const p = generate(defaults);
  for (const start of ['2026-02-31', '2026-02-29', '2026-04-31', '0000-01-01', '9999-12-26', '2026-13-01', '2026-01-00']) {
    assert.equal(parsePlan(JSON.stringify({ ...p, start })), null, start);
    assert.throws(() => generate(defaults, 0, start), undefined, start);
  }
  for (const start of ['2028-02-29', '2026-12-31', '9999-12-25']) assert.equal(parsePlan(JSON.stringify(generate(defaults, 0, start))).start, start);
});
test('persistence handles corrupt, missing, and obsolete data', () => {
  const p = generate(defaults);
  assert.deepEqual(parsePlan(JSON.stringify(p)), p);
  for (const raw of [null, '{', '{}', '{"version":0}', JSON.stringify({ ...p, days: [[]] }), JSON.stringify({ ...p, settings: { ...defaults, calories: -10 } })]) assert.equal(parsePlan(raw), null);
  p.days[0][0].recipeId = 'deleted-recipe';
  assert.equal(parsePlan(JSON.stringify(p)), null);
});
test('invalid calorie targets are rejected and Monday respects local calendar dates', () => {
  for (const calories of [0, -1, NaN, Infinity, 5001]) assert.throws(() => generate({ ...defaults, calories }));
  assert.equal(monday(new Date(2026, 8, 23)), '2026-09-21');
  assert.equal(monday(new Date(2026, 8, 27)), '2026-09-21');
});
test('a selected future week survives persistence and replanning', () => {
  const p = generate(defaults, 1, '2026-09-28');
  const saved = parsePlan(JSON.stringify(p));
  assert.equal(saved.start, '2026-09-28');
  const next = generate(saved.settings, saved.generation + 1, saved.start);
  assert.equal(next.start, '2026-09-28');
  assert.notDeepEqual(next.days, p.days);
});
test('a plan saved before Meal Schedule existed still loads unchanged (seamless when off)', () => {
  // Simulates real pre-feature saved JSON: no `routine` on settings, no `time`/`label` on meals.
  const p = generate(defaults);
  const old = JSON.parse(JSON.stringify(p));
  delete old.settings.routine;
  for (const day of old.days) for (const meal of day) { delete meal.time; delete meal.label; }
  const restored = parsePlan(JSON.stringify(old));
  assert.ok(restored, 'an old-format plan must still load');
  assert.equal(restored.settings.routine, null);
  assert.deepEqual(restored.days[0][0].time, '08:00');
  assert.deepEqual(restored.days[0][1].time, '13:00');
  assert.deepEqual(restored.days[0][2].time, '19:00');
});
test('scheduleDay is null until a routine is set, and computed correctly once it is', () => {
  const p = generate(defaults, 0, '2026-09-29');
  assert.equal(scheduleDay(p, 0), null);
  // The PRD's own acceptance scenario: wake 3pm, sleep 8am next day.
  let scheduled = setRoutine(p, { wake: '15:00', sleep: '08:00' });
  scheduled = setMealTime(scheduled, 0, 0, '17:00', 'Before work');   // breakfast slot, retimed
  scheduled = setMealTime(scheduled, 0, 1, '23:00', 'Dinner break');  // lunch slot, retimed
  scheduled = setMealTime(scheduled, 0, 2, '04:00', 'Before bed');    // dinner slot, retimed -> next day
  const day = scheduleDay(scheduled, 0);
  assert.equal(day.length, 3);
  assert.equal(day[0].time, '17:00'); assert.equal(day[0].date, '2026-09-29');
  assert.equal(day[1].time, '23:00'); assert.equal(day[1].date, '2026-09-29');
  assert.equal(day[2].time, '04:00'); assert.equal(day[2].date, '2026-09-30');
  assert.equal(day[2].label, 'Before bed');
});
test('setRoutine validates and rejects equal wake/sleep, and does not touch days or progress', () => {
  const p = generate(defaults);
  p.checked = ['Rolled oats, dry']; p.prepped = ['berry-oats'];
  assert.throws(() => setRoutine(p, { wake: '07:00', sleep: '07:00' }));
  const on = setRoutine(p, { wake: '07:00', sleep: '23:00' });
  assert.deepEqual(on.days, p.days);
  assert.deepEqual(on.checked, p.checked);
  assert.deepEqual(on.prepped, p.prepped);
  const off = setRoutine(on, null);
  assert.equal(off.settings.routine, null);
  assert.deepEqual(off.days, p.days);
});
test('setMealTime validates the time and preserves an existing label when none is passed', () => {
  const p = generate(defaults);
  assert.throws(() => setMealTime(p, 0, 0, 'not-a-time'));
  assert.throws(() => setMealTime(p, 9, 0, '08:00'));
  const labeled = setMealTime(p, 0, 0, '06:30', 'Early shift');
  assert.equal(labeled.days[0][0].label, 'Early shift');
  const retimedOnly = setMealTime(labeled, 0, 0, '06:45');
  assert.equal(retimedOnly.days[0][0].time, '06:45');
  assert.equal(retimedOnly.days[0][0].label, 'Early shift', 'changing only the time must not clear the label');
  // Unrelated meals and progress are untouched.
  assert.deepEqual(retimedOnly.days[0][1], p.days[0][1]);
});
test('swapping a recipe preserves a custom meal time/label instead of resetting it', () => {
  const p = setMealTime(generate(defaults), 0, 1, '14:30', 'Late lunch');
  const swapped = swap(p, 0, 1, 'tofu-bowl');
  assert.equal(swapped.days[0][1].recipeId, 'tofu-bowl');
  assert.equal(swapped.days[0][1].time, '14:30');
  assert.equal(swapped.days[0][1].label, 'Late lunch');
});
