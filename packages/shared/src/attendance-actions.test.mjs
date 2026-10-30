import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attendancePeriodIssue, attendanceRowActions } from './attendance-actions.ts';

const read = ['attendance:read'];
const all = [...read, 'attendance:mark', 'attendance:update'];
const row = (state, exception = null) => ({ date: '2026-10-28', state, exception });
const none = { mark: false, edit: false, restore: false };

test('period validation matches the API inclusive 366-day boundary', () => {
  assert.equal(attendancePeriodIssue('2026-01-01', '2027-01-01'), undefined);
  assert.equal(attendancePeriodIssue('2026-01-01', '2027-01-02'), 'limit');
  assert.equal(attendancePeriodIssue('2026-02-30', '2026-03-01'), 'date');
  assert.equal(attendancePeriodIssue('2026-10-28', '2026-10-27'), 'order');
});

test('both clients use the same absence lifecycle actions', () => {
  assert.deepEqual(attendanceRowActions(row('PRESENT'), all), { mark: true, edit: false, restore: false });
  for (const state of ['ABSENT', 'HALF_DAY']) {
    assert.deepEqual(attendanceRowActions(row(state, { id: 'exception' }), all), { mark: false, edit: true, restore: true });
  }
  assert.deepEqual(attendanceRowActions(row('PRESENT'), all), { mark: true, edit: false, restore: false });
});
test('read, mark and update permissions are independent', () => {
  assert.deepEqual(attendanceRowActions(row('ABSENT', {}), read), none);
  assert.deepEqual(attendanceRowActions(row('ABSENT', {}), [...read, 'attendance:mark']), none);
  assert.deepEqual(attendanceRowActions(row('ABSENT', {}), [...read, 'attendance:update']), { mark: false, edit: true, restore: true });
  assert.deepEqual(attendanceRowActions(row('PRESENT'), [...read, 'attendance:update']), none);
  assert.deepEqual(attendanceRowActions(row('ABSENT', {}), ['attendance:update']), none);
});
test('unavailable, non-working and inconsistent rows do not offer new absences', () => {
  assert.deepEqual(attendanceRowActions(undefined, all), none);
  assert.deepEqual(attendanceRowActions(row('NON_WORKING'), all), none);
  assert.deepEqual(attendanceRowActions(row('ABSENT'), all), none);
  assert.deepEqual(attendanceRowActions(row('NON_WORKING', {}), all), { mark: false, edit: false, restore: true });
});
