import test from 'node:test';
import assert from 'node:assert/strict';
import { batches, defaults, generate, groceries, monday, parsePlan, recipeFor, swap, totals } from '../src/planner.ts';

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
test('swap updates only selected meal, preserves targets, and invalidates checklists', () => {
  const p = generate(defaults); p.checked = ['Chicken breast, raw']; p.prepped = ['chicken-bowl'];
  const next = swap(p, 0, 1, 'tofu-bowl');
  assert.equal(next.days[0][1].recipeId, 'tofu-bowl');
  assert.deepEqual(next.days.slice(1), p.days.slice(1));
  assert.deepEqual(next.days[0][0], p.days[0][0]);
  near(totals(next.days[0]).calories, 2000);
  assert.deepEqual(next.checked, []); assert.deepEqual(next.prepped, []);
  assert.notDeepEqual(groceries(next), groceries(p));
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
