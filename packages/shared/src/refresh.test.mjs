import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRefreshGate, refreshTogether } from './refresh.ts';
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('repeated synchronous refresh taps share one request and busy lasts until completion', async () => {
  const gate = createRefreshGate(), request = deferred(); let calls = 0;
  const states = []; const unsubscribe = gate.subscribe(() => states.push(gate.getSnapshot()));
  const first = gate.run(() => { calls++; return request.promise; });
  assert.equal(gate.getSnapshot(), true);
  assert.equal(gate.run(() => { calls++; }), first);
  await Promise.resolve(); assert.equal(calls, 1);
  request.resolve('data'); assert.equal(await first, 'data');
  assert.equal(gate.getSnapshot(), false); assert.deepEqual(states, [true, false]); unsubscribe();
  await gate.run(() => { calls++; }); assert.equal(calls, 2); assert.deepEqual(states, [true, false]);
});
test('failed requests and synchronous exceptions unlock refresh for a retry', async () => {
  const gate = createRefreshGate();
  await assert.rejects(gate.run(() => { throw new Error('offline'); }), /offline/);
  assert.equal(gate.getSnapshot(), false);
  await assert.rejects(gate.run(() => Promise.reject(new Error('API error'))), /API error/);
  assert.equal(gate.getSnapshot(), false);
  assert.equal(await gate.run(() => 'recovered'), 'recovered');
});
test('a failed parallel read cannot unlock while its sibling is still calling the API', async () => {
  const gate = createRefreshGate(), slow = deferred();
  const pending = gate.run(() => refreshTogether([Promise.reject(new Error('summary failed')), slow.promise]));
  const rejection = assert.rejects(pending, /summary failed/);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(gate.getSnapshot(), true);
  slow.resolve('list'); await rejection; assert.equal(gate.getSnapshot(), false);
});
test('parallel refresh preserves result ordering and values', async () => {
  assert.deepEqual(await refreshTogether([Promise.resolve('list'), Promise.resolve('summary')]), ['list', 'summary']);
});
