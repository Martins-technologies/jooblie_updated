import test from 'node:test';
import assert from 'node:assert/strict';
import { getFieldValidationMessage, validateForm, applyFormErrors, getSubmittedForm } from '../src/shared/lib/formValidation.js';

function field(overrides = {}) {
  return { tagName: 'INPUT', type: 'text', value: '', required: false, disabled: false, readOnly: false, willValidate: true, minLength: -1, maxLength: -1, validity: { valid: true }, ...overrides };
}

test('required text rejects whitespace before an API submit', () => {
  assert.equal(getFieldValidationMessage(field({ required: true, value: '   ' })), 'This field is required.');
  assert.equal(getFieldValidationMessage(field({ required: true, value: 'Value' })), '');
});

test('length constraints apply even when native validity misses React-assigned values', () => {
  assert.equal(getFieldValidationMessage(field({ value: ' ab ', minLength: 3 })), 'Use at least 3 characters.');
  assert.equal(getFieldValidationMessage(field({ value: ' abc ', minLength: 3 })), '');
  assert.equal(getFieldValidationMessage(field({ value: 'abcde', maxLength: 4 })), 'Use no more than 4 characters.');
  assert.equal(getFieldValidationMessage(field({ value: '', minLength: 3 })), '');
});

test('password spaces remain significant with the visibility toggle on or off', () => {
  for (const attributes of [{ type: 'password' }, { type: 'text', id: 'signin-password' }, { type: 'text', name: 'confirmPassword' }, { type: 'text', autocomplete: 'current-password' }]) {
    assert.equal(getFieldValidationMessage(field({ ...attributes, required: true, value: ' abcdef ', minLength: 8 })), '');
    assert.equal(getFieldValidationMessage(field({ ...attributes, required: true, value: '        ', minLength: 8 })), '');
    assert.equal(getFieldValidationMessage(field({ ...attributes, required: true, value: ' abc ', minLength: 8 })), 'Use at least 8 characters.');
    assert.equal(getFieldValidationMessage(field({ ...attributes, required: true, value: '', minLength: 8 })), 'This field is required.');
  }
});

test('disabled, readonly, unchanged legacy and nonvalidating controls do not block submission', () => {
  for (const overrides of [{ disabled: true }, { readOnly: true }, { willValidate: false }, { getAttribute: name => name === 'data-skip-validation' ? 'true' : null }]) {
    assert.equal(getFieldValidationMessage(field({ required: true, ...overrides })), '');
  }
  assert.equal(getFieldValidationMessage({ tagName: 'BUTTON', required: true }), '');
});

test('email and URL errors are short and contextual', () => {
  assert.equal(getFieldValidationMessage(field({ type: 'email', value: 'bad', validity: { typeMismatch: true } })), 'Enter a valid email address.');
  assert.equal(getFieldValidationMessage(field({ type: 'url', value: 'bad', validity: { typeMismatch: true } })), 'Enter a valid URL including https://.');
});

test('number and range constraints are checked before network requests', () => {
  assert.equal(getFieldValidationMessage(field({ type: 'number', validity: { badInput: true } })), 'Enter a valid number.');
  assert.equal(getFieldValidationMessage(field({ value: '-1', min: '0', validity: { rangeUnderflow: true } })), 'Enter 0 or more.');
  assert.equal(getFieldValidationMessage(field({ value: '11', max: '10', validity: { rangeOverflow: true } })), 'Enter 10 or less.');
  assert.equal(getFieldValidationMessage(field({ value: '2.5', validity: { stepMismatch: true } })), 'Use a value that matches the allowed increment.');
});

test('file, format and custom validation retain useful messages', () => {
  assert.equal(getFieldValidationMessage(field({ type: 'file', required: true, files: [] })), 'Choose a file.');
  assert.equal(getFieldValidationMessage(field({ value: 'no', validity: { patternMismatch: true }, getAttribute: () => 'Enter a Canadian postal code.' })), 'Enter a Canadian postal code.');
  assert.equal(getFieldValidationMessage(field({ validity: { customError: true }, validationMessage: 'Maximum salary must be at least minimum salary.' })), 'Maximum salary must be at least minimum salary.');
});

test('valid form and unmapped server errors fail safely without DOM globals', () => {
  assert.equal(validateForm({ elements: [field({ value: 'Valid' })] }), true);
  assert.equal(validateForm(null), true);
  assert.equal(applyFormErrors(null, { code: 'VALIDATION_ERROR' }), false);
  assert.equal(applyFormErrors({ elements: [] }, { code: 'VALIDATION_ERROR', details: { fieldErrors: { unknown: ['Required'] } } }), false);
  assert.equal(getSubmittedForm(), null);
});
