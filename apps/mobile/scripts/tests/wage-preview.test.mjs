import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareWagePreview } from '../../src/features/wages/prepare-wage-preview.ts';

const batch = { status: 'CONFIRMED', periodStart: '2026-09-10', periodEnd: '2026-09-20' };
const preview = { items: [], totals: {} };

test('Generate stops before calculating for overlapping active batches', async () => {
  for (const status of ['DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID']) {
    for (const [start, end] of [['2026-09-01', '2026-09-10'], ['2026-09-20', '2026-09-28'], ['2026-09-12', '2026-09-15'], ['2026-09-01', '2026-09-28']]) {
      const result = await prepareWagePreview(start, end, async () => [{ ...batch, status }], async () => { assert.fail('Blocked period must never request a preview'); }, () => true);
      assert.equal(result.preview, null);
    }
  }
});

test('Generate checks fresh batches first and allows cancelled or non-overlapping periods', async () => {
  for (const rows of [[], [{ ...batch, status: 'CANCELLED' }], [{ ...batch, periodEnd: '2026-09-09', periodStart: '2026-09-01' }]]) {
    const calls = [];
    const result = await prepareWagePreview('2026-09-10', '2026-09-20', async () => { calls.push('batches'); return rows; }, async () => { calls.push('preview'); return preview; }, () => true);
    assert.deepEqual(calls, ['batches', 'preview']);
    assert.equal(result.preview, preview);
    assert.equal(result.batches, rows);
  }
});

test('Failed batch validation never falls through to a preview', async () => {
  await assert.rejects(prepareWagePreview('2026-09-10', '2026-09-20', async () => { throw new Error('offline'); }, async () => { assert.fail('Cannot calculate without checking current batches'); }, () => true), /offline/);
});

test('Changed date or workspace discards a pending batch check', async () => {
  const result = await prepareWagePreview('2026-09-10', '2026-09-20', async () => [], async () => { assert.fail('Obsolete request must not calculate'); }, () => false);
  assert.equal(result, null);
});

test('Changed date or workspace discards a pending preview response', async () => {
  let current = true;
  const result = await prepareWagePreview('2026-09-10', '2026-09-20', async () => [], async () => { current = false; return preview; }, () => current);
  assert.equal(result, null);
});
