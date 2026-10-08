import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createSearchDebouncer } from './search.ts';

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const values = [];
  return { values, search: createSearchDebouncer(value => values.push(value)) };
}
test('typing is coalesced into exactly one latest normalized search after 300 ms', t => {
  const { values, search } = setup(t);
  search.schedule('P'); t.mock.timers.tick(200);
  search.schedule('Pr'); t.mock.timers.tick(200);
  search.schedule('  Prakash  '); t.mock.timers.tick(299);
  assert.deepEqual(values, []);
  t.mock.timers.tick(1); assert.deepEqual(values, ['Prakash']);
});
test('clearing applies immediately and cancels the previous pending search', t => {
  const { values, search } = setup(t);
  search.schedule('old'); search.schedule('   ');
  assert.deepEqual(values, ['']);
  t.mock.timers.tick(1000); assert.deepEqual(values, ['']);
});
test('Enter flushes once; it never sends the trailing timer again', t => {
  const { values, search } = setup(t);
  search.schedule('ગુજરાતી'); search.flush(); search.flush();
  assert.deepEqual(values, ['ગુજરાતી']);
  t.mock.timers.tick(1000); assert.deepEqual(values, ['ગુજરાતી']);
});
test('scope reset, composition and unmount cancellation never commit old text', t => {
  const { values, search } = setup(t);
  search.schedule('old scope'); search.cancel(); t.mock.timers.tick(1000);
  assert.deepEqual(values, []);
  search.schedule('नया'); t.mock.timers.tick(300); assert.deepEqual(values, ['नया']);
});
