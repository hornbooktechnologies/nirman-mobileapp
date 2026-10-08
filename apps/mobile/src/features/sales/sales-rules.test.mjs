import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canReadSales, canWriteLead, assignmentPermission, localTime, scheduleInstant, dateRange, callableNumber, uncertainWrite, eligibleBookingUnit, retainBookingAttempt } from './sales-rules.ts';

test('read-only Sales and exact assignment permission do not grant writes', () => {
  assert.equal(canReadSales(['leads:read-own']), true);
  const lead = { assignedTo: 'sales', createdBy: 'other' };
  assert.equal(canWriteLead(['leads:read-own', 'leads:update'], true, 'leads:update', lead, 'sales'), true);
  assert.equal(canWriteLead(['leads:read-own', 'leads:update'], true, 'leads:update', lead, 'foreign'), false);
  assert.equal(canWriteLead(['leads:read-all', 'leads:update'], false, 'leads:update', lead, 'sales'), false);
  assert.equal(assignmentPermission(null), 'leads:assign');
  assert.equal(assignmentPermission('sales'), 'leads:reassign');
});
test('schedules and inclusive date ranges use working timezone, reject impossible dates and DST gaps', () => {
  assert.equal(scheduleInstant('2026-10-08T10:00', 'Asia/Kolkata'), '2026-10-08T04:30:00.000Z');
  assert.equal(localTime('2026-10-08T04:30:00Z', 'Asia/Kolkata'), '2026-10-08T10:00');
  assert.equal(scheduleInstant('2026-02-30T10:00', 'Asia/Kolkata'), null);
  assert.equal(scheduleInstant('2026-03-08T02:30', 'America/New_York'), null);
  assert.deepEqual(dateRange('2026-10-08', '2026-10-08', 'Asia/Kolkata'), { from: '2026-10-07T18:30:00.000Z', to: '2026-10-08T18:29:59.999Z' });
});
test('call links reject invalid content; uncertain writes never imply safe replay', () => {
  assert.equal(callableNumber('+91 98765 43210'), '+919876543210');
  assert.equal(callableNumber('javascript:alert(1)'), null);
  for (const status of [undefined, 408, 500]) assert.equal(uncertainWrite(status), true);
  for (const status of [400, 403, 422]) assert.equal(uncertainWrite(status), false);
});

test('booking retries freeze the original command and exclude foreign/expired/inactive holds', () => {
  const original = retainBookingAttempt(null, { idempotencyKey: 'same', leadId: 'lead', bookingAmount: 0 });
  assert.equal(retainBookingAttempt(original, { idempotencyKey: 'different', leadId: 'other', bookingAmount: 100 }), original);
  assert.throws(() => { original.bookingAmount = 10; }, TypeError);
  const unit = { status: 'BLOCKED', activeBlockId: 'block', blockedForLeadId: 'lead', blockExpiresAt: '2026-10-09T00:00:00Z' };
  const now = Date.parse('2026-10-08T00:00:00Z');
  assert.equal(eligibleBookingUnit(unit, 'lead', now), true);
  assert.equal(eligibleBookingUnit(unit, 'other', now), false);
  assert.equal(eligibleBookingUnit({ ...unit, activeBlockId: null }, 'lead', now), false);
  assert.equal(eligibleBookingUnit(unit, 'lead', now + 86400000), false);
  assert.equal(eligibleBookingUnit({ ...unit, status: 'BOOKED' }, 'lead', now), false);
});
