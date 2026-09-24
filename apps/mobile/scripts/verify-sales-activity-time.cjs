const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/sales/sales-activity.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, require: () => ({}) });

const base = {
  id: 'activity-1',
  activityType: 'FOLLOW_UP_SCHEDULED',
  summary: 'Follow-up scheduled',
  actorId: 'user-1',
  actorName: 'Sales User',
  occurredAt: '2026-09-24T13:01:00.000Z',
};

assert.equal(
  exportsObject.salesActivityDisplayAt({ ...base, details: { scheduledAt: '2026-09-24T09:45:00.000Z' } }),
  '2026-09-24T09:45:00.000Z',
  'scheduled follow-up activities must display the scheduled time',
);
assert.equal(
  exportsObject.salesActivityDisplayAt({ ...base, details: JSON.stringify({ scheduledAt: '2026-09-24T09:45:00.000Z' }) }),
  '2026-09-24T09:45:00.000Z',
  'JSON activity details must also be supported',
);
assert.equal(
  exportsObject.salesActivityDisplayAt({ ...base, details: null }),
  base.occurredAt,
  'legacy activities without scheduling details must fall back safely',
);
assert.equal(
  exportsObject.salesActivityDisplayAt({ ...base, activityType: 'NOTE_ADDED', details: { scheduledAt: '2026-09-24T09:45:00.000Z' } }),
  base.occurredAt,
  'other activity types must continue to display when the activity occurred',
);

console.log('PASS: scheduled follow-ups display scheduledAt; legacy and non-follow-up activities preserve occurredAt.');
