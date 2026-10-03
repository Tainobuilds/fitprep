import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoutine, wakingWindowMinutes, attributeDates, nextUpcoming, formatTime } from '../src/schedule.ts';

const meal = (id, time) => ({ id, time });

test('equal wake and sleep times are rejected, not silently treated as a 24h day', () => {
  const errors = validateRoutine({ wake: '15:00', sleep: '15:00' });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, 'sleep');
});

test('missing/invalid times are rejected', () => {
  assert.equal(validateRoutine({ wake: '', sleep: '08:00' }).length, 1);
  assert.equal(validateRoutine({ wake: '3pm', sleep: '08:00' }).length, 1);
});

test('a normal (non-crossing) routine passes validation', () => {
  assert.deepEqual(validateRoutine({ wake: '07:00', sleep: '23:00' }), []);
});

test('waking window handles a routine that crosses midnight', () => {
  assert.equal(wakingWindowMinutes({ wake: '15:00', sleep: '08:00' }), 17 * 60);
  assert.equal(wakingWindowMinutes({ wake: '07:00', sleep: '23:00' }), 16 * 60);
});

test('an overnight routine: wake 3pm, sleep 8am next day, meals at 5pm/11pm/4am', () => {
  const routine = { wake: '15:00', sleep: '08:00' };
  const meals = [meal('m1', '17:00'), meal('m2', '23:00'), meal('m3', '04:00')];
  const scheduled = attributeDates(meals, routine, '2026-09-29');

  assert.deepEqual(scheduled.map(m => m.id), ['m1', 'm2', 'm3']);
  assert.equal(scheduled[0].date, '2026-09-29');
  assert.equal(scheduled[1].date, '2026-09-29');
  assert.equal(scheduled[2].date, '2026-09-30');
  assert.ok(scheduled.every(m => !m.outsideWakingWindow));
});

test('a meal during the sleep window is flagged, not silently moved', () => {
  const routine = { wake: '07:00', sleep: '23:00' };
  const meals = [meal('m1', '08:00'), meal('m2', '02:00')];
  const scheduled = attributeDates(meals, routine, '2026-09-29');
  const late = scheduled.find(m => m.id === 'm2');
  assert.equal(late.outsideWakingWindow, true);
  assert.equal(late.date, '2026-09-30');
});

test('moving one meal only changes that meal, not the others', () => {
  const routine = { wake: '15:00', sleep: '08:00' };
  const meals = [meal('m1', '17:00'), meal('m2', '23:00'), meal('m3', '04:00')];
  const before = attributeDates(meals, routine, '2026-09-29');
  const edited = meals.map(m => (m.id === 'm3' ? { ...m, time: '03:30' } : m));
  const after = attributeDates(edited, routine, '2026-09-29');

  assert.equal(before.find(m => m.id === 'm1').time, after.find(m => m.id === 'm1').time);
  assert.equal(before.find(m => m.id === 'm2').time, after.find(m => m.id === 'm2').time);
  assert.equal(after.find(m => m.id === 'm3').time, '03:30');
  assert.equal(after.find(m => m.id === 'm3').date, '2026-09-30');
});

test('nextUpcoming finds the first meal that has not happened yet', () => {
  const routine = { wake: '15:00', sleep: '08:00' };
  const meals = [meal('m1', '17:00'), meal('m2', '23:00'), meal('m3', '04:00')];
  const scheduled = attributeDates(meals, routine, '2026-09-29');
  assert.equal(nextUpcoming(scheduled, 60).id, 'm1');
  assert.equal(nextUpcoming(scheduled, 3 * 60).id, 'm2');
  assert.equal(nextUpcoming(scheduled, 20 * 60), null);
});

test('formatTime', () => {
  assert.equal(formatTime('04:00'), '4:00 AM');
  assert.equal(formatTime('15:00'), '3:00 PM');
  assert.equal(formatTime('00:05'), '12:05 AM');
});

test('works directly with a richer meal object (extra fields pass through untouched)', () => {
  const routine = { wake: '07:00', sleep: '23:00' };
  const meals = [{ id: 'x', time: '08:00', recipeId: 'egg-toast', factor: 1.2 }];
  const [scheduled] = attributeDates(meals, routine, '2026-09-29');
  assert.equal(scheduled.recipeId, 'egg-toast');
  assert.equal(scheduled.factor, 1.2);
  assert.equal(scheduled.date, '2026-09-29');
});
