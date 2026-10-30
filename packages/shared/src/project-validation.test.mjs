import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectValidationIssues } from './project-validation.ts';

test('required name rejects whitespace while optional address and dates may be empty', () => {
  assert.deepEqual(projectValidationIssues({ name: '  ' }), { name: { rule: 'required' } });
  assert.deepEqual(projectValidationIssues({ name: 'Site A' }), {});
});
test('DTO length limits include optional and nested address values', () => {
  const errors = projectValidationIssues({ name: 'a'.repeat(121), city: 'a'.repeat(101), projectCode: 'x'.repeat(41) });
  assert.equal(errors.name.limit, 120);
  assert.equal(errors.city.limit, 100);
  assert.equal(errors.projectCode.limit, 40);
});
test('calendar validity and date ordering match create and edit requirements', () => {
  assert.equal(projectValidationIssues({ name: 'Site', startDate: '2026-02-30' }).startDate.rule, 'date');
  assert.equal(projectValidationIssues({ name: 'Site', startDate: '2026-11-01', expectedCompletionDate: '2026-10-31' }).expectedCompletionDate.rule, 'completionBeforeStart');
  assert.deepEqual(projectValidationIssues({ name: 'Site', startDate: '2028-02-29', expectedCompletionDate: '2028-02-29' }), {});
});
