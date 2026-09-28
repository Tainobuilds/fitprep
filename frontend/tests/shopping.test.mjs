import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from '../src/planner.ts';
import { pounds, storeQuantity } from '../src/shopping.ts';

test('pounds rounds UP to the next quarter pound and never returns zero', () => {
  assert.equal(pounds(1), '¼ lb');
  assert.equal(pounds(113), '¼ lb'); // 0.249 lb
  assert.equal(pounds(114), '½ lb'); // just over ¼ lb
  assert.equal(pounds(453), '1 lb'); // 0.9987 lb fits within 1 lb
  assert.equal(pounds(454), '1¼ lb'); // 1.0009 lb is over, so round up (1 lb = 453.592 g)
  assert.equal(pounds(469), '1¼ lb'); // the salmon example from the demo
  assert.equal(pounds(1301), '3 lb'); // chicken for the week
  assert.equal(pounds(1406), '3¼ lb');
});

test('weight items show pounds and keep the exact grams as detail', () => {
  assert.deepEqual(storeQuantity('Salmon, raw', 469), { buy: '1¼ lb', detail: '469 g needed' });
  assert.equal(storeQuantity('Broccoli', 1740).buy, '4 lb');
});

test('eggs are counted and bought by the dozen', () => {
  const q = storeQuantity('Eggs, edible portion', 902);
  assert.equal(q.buy, '2 dozen eggs');
  assert.equal(q.detail, '≈ 19 eggs · 902 g');
  assert.equal(storeQuantity('Eggs, edible portion', 300).buy, '1 dozen eggs'); // 6 eggs still means a carton
  assert.equal(storeQuantity('Eggs, edible portion', 600).buy, '1 dozen eggs'); // exactly 12
  assert.equal(storeQuantity('Eggs, edible portion', 650).buy, '2 dozen eggs'); // 13 eggs
});

test('counted produce rounds up and pluralizes', () => {
  assert.equal(storeQuantity('Avocado', 100).buy, '1 avocado');
  assert.equal(storeQuantity('Avocado', 586).buy, '5 avocados'); // 4.19 -> 5
  assert.equal(storeQuantity('Sweet potato', 300).buy, '2 sweet potatoes');
});

test('packaged items round up to whole packages, with 5% slack', () => {
  assert.equal(storeQuantity('Greek yogurt', 1220).buy, '2 × 32 oz tub');
  assert.equal(storeQuantity('Rolled oats, dry', 382).buy, '1 × 18 oz canister');
  assert.equal(storeQuantity('Greek yogurt', 940).buy, '1 × 32 oz tub'); // 3.6% over one tub: not worth a second
  assert.equal(storeQuantity('Greek yogurt', 1000).buy, '2 × 32 oz tub'); // 10% over: buy the second
});

test('the exact amount is always shown so nothing is hidden by rounding', () => {
  assert.equal(storeQuantity('Greek yogurt', 1220).detail, '1.22 kg needed');
  assert.equal(storeQuantity('Chia seeds', 66).detail, '66 g needed');
});

test('unknown ingredients fall back to plain grams instead of breaking', () => {
  assert.deepEqual(storeQuantity('Dragonfruit', 250), { buy: '250 g', detail: '' });
  assert.deepEqual(storeQuantity('Dragonfruit', 1500), { buy: '1.50 kg', detail: '' });
});

test('every ingredient in every built-in recipe has a store rule', () => {
  const names = new Set(recipes.flatMap(r => r.ingredients.map(i => i.name)));
  assert.ok(names.size >= 29, `expected at least 29 ingredients, found ${names.size}`);
  const missing = [...names].filter(name => storeQuantity(name, 100).detail === '' );
  assert.deepEqual(missing, [], `no store rule for: ${missing.join(', ')}`);
});

test('a realistic week never asks for zero or negative amounts', () => {
  for (const recipe of recipes) for (const item of recipe.ingredients) {
    const q = storeQuantity(item.name, item.grams * 2.2);
    assert.match(q.buy, /^[1-9¼½¾]/, `${item.name} -> "${q.buy}"`);
  }
});
