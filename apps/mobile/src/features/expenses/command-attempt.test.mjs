import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('./command-attempt.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
new Function('exports', code)(exports);

test('lost response retries original amount, version and key; simultaneous taps send once', () => {
  const command = new exports.ExpenseAttempt();
  const original = { amount: 250, expectedVersion: 3, idempotencyKey: 'original-key' };
  assert.equal(command.start(original), original);
  assert.equal(command.start({ amount: 500 }), null);
  command.finish(true);
  assert.equal(command.start({ amount: 600, expectedVersion: 4, idempotencyKey: 'changed-key' }), original);
  command.finish();
  const reviewed = { amount: 100, expectedVersion: 5, idempotencyKey: 'reviewed-key' };
  assert.equal(command.start(reviewed), reviewed);
});

test('timeouts remain uncertain, stale writes require review and denied writes stop', () => {
  for (const status of [undefined, 408, 500, 503]) assert.equal(exports.expenseFailure(status), 'uncertain');
  assert.equal(exports.expenseFailure(409), 'stale');
  assert.equal(exports.expenseFailure(400, 'EXPENSE_ACTION_NOT_ALLOWED'), 'stale');
  assert.equal(exports.expenseFailure(403), 'denied');
  assert.equal(exports.expenseFailure(401), 'denied');
  assert.equal(exports.expenseFailure(400), 'rejected');
});
