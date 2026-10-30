import assert from 'node:assert/strict';
import { test } from 'node:test';
import { constraintError } from './constraint-error.ts';

const field = (props = {}) => ({ value: '', required: false, disabled: false, willValidate: true, validity: {}, validationMessage: '', ...props });
test('required text rejects whitespace and optional empty values remain valid', () => {
  assert.equal(constraintError(field({ required: true, value: ' ' }), 'Name'), 'Name is required.');
  assert.equal(constraintError(field(), 'Email'), undefined);
});
test('disabled and non-validating controls never block submission', () => {
  assert.equal(constraintError(field({ required: true, disabled: true }), 'Name'), undefined);
  assert.equal(constraintError(field({ required: true, willValidate: false }), 'Name'), undefined);
});
test('email, loaded overlong values, short reasons and invalid numbers have readable errors', () => {
  assert.equal(constraintError(field({ value: 'bad', type: 'email', validity: { typeMismatch: true } }), 'Email'), 'Enter a valid email address.');
  assert.equal(constraintError(field({ value: 'abcdef', maxLength: 5 }), 'Name'), 'Use no more than 5 characters.');
  assert.equal(constraintError(field({ value: 'abc', minLength: 8 }), 'Reason'), 'Enter at least 8 characters.');
  assert.equal(constraintError(field({ validity: { badInput: true } }), 'Amount'), 'Enter a valid number.');
});
