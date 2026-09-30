import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoutine, wakingWindowMinutes, attributeDates, nextUpcoming, formatTime, formatDate } from '../src/schedule.ts';

const meal = (id, slot, time) => ({ id, slot, time, calories: 400, protein: 20, carbs: 40, fat: 10, foods: [] });

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
  // wake 3pm, sleep 8am next day = 17 hours awake
  assert.equal(wakingWindowMinutes({ wake: '15:00', sleep: '08:00' }), 17 * 60);
  // wake 7am, sleep 11pm same day = 16 hours awake
  assert.equal(wakingWindowMinutes({ wake: '07:00', sleep: '23:00' }), 16 * 60);
});

test("the PRD's own acceptance scenario: wake 3pm Sep 29, sleep 8am Sep 30, meals at 5pm/11pm/4am", () => {
  const routine = { wake: '15:00', sleep: '08:00' };
  const meals = [meal('m1', 'dinner', '17:00'), meal('m2', 'dinner', '23:00'), meal('m3', 'breakfast', '04:00')];
  const scheduled = attributeDates(meals, routine, '2026-09-29');

  // All three meals appear together, in chronological order
  assert.deepEqual(scheduled.map(m => m.id), ['m1', 'm2', 'm3']);

  // 5pm and 11pm are on the starting date
  assert.equal(scheduled[0].date, '2026-09-29');
  assert.equal(scheduled[1].date, '2026-09-29');

  // The 4am meal is explicitly dated the NEXT day, per the PRD's exact example
  assert.equal(scheduled[2].date, '2026-09-30');

  // All three fall within the 17-hour waking window (5pm-8am), none need confirmation
  assert.ok(scheduled.every(m => !m.outsideWakingWindow));
});

test('a meal scheduled during the sleep window is flagged for explicit confirmation, not silently moved', () => {
  const routine = { wake: '07:00', sleep: '23:00' }; // 16h window
  const meals = [meal('m1', 'breakfast', '08:00'), meal('m2', 'dinner', '02:00')]; // 2am is during sleep
  const scheduled = attributeDates(meals, routine, '2026-09-29');
  const late = scheduled.find(m => m.id === 'm2');
  assert.equal(late.outsideWakingWindow, true, 'a 2am meal on a 7am-11pm routine should need confirmation');
  assert.equal(late.date, '2026-09-30');
});

test('moving one meal only changes that meal, not the others -- no silent reassignment', () => {
  const routine = { wake: '15:00', sleep: '08:00' };
  const meals = [meal('m1', 'dinner', '17:00'), meal('m2', 'dinner', '23:00'), meal('m3', 'breakfast', '04:00')];
  const before = attributeDates(meals, routine, '2026-09-29');
  const edited = meals.map(m => (m.id === 'm3' ? { ...m, time: '03:30' } : m));
  const after = attributeDates(edited, routine, '2026-09-29');

  assert.equal(before.find(m => m.id === 'm1').time, after.find(m => m.id === 'm1').time);
  assert.equal(before.find(m => m.id === 'm2').time, after.find(m => m.id === 'm2').time);
  assert.equal(after.find(m => m.id === 'm3').time, '03:30');
  assert.equal(after.find(m => m.id === 'm3').date, '2026-09-30');
});

test('nextUpcoming finds the first meal that has not happened yet, without needing color', () => {
  const routine = { wake: '15:00', sleep: '08:00' };
  const meals = [meal('m1', 'dinner', '17:00'), meal('m2', 'dinner', '23:00'), meal('m3', 'breakfast', '04:00')];
  const scheduled = attributeDates(meals, routine, '2026-09-29');
  // 1 hour after wake (4pm) -> next meal is still 5pm
  assert.equal(nextUpcoming(scheduled, 60).id, 'm1');
  // just after the 5pm meal (3 hours after wake = 6pm) -> next is 11pm
  assert.equal(nextUpcoming(scheduled, 3 * 60).id, 'm2');
  // after everything -> none left
  assert.equal(nextUpcoming(scheduled, 20 * 60), null);
});

test('formatting helpers', () => {
  assert.equal(formatTime('04:00'), '4:00 AM');
  assert.equal(formatTime('15:00'), '3:00 PM');
  assert.equal(formatTime('00:05'), '12:05 AM');
  assert.equal(formatDate('2026-09-30'), 'Sep 30');
});
