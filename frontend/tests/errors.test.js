import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeError, extractErrorMessage, isAbortError } from '../src/shared/lib/errors.js';

test('company immutable-name detail overrides generic API message and preserves support reference', () => {
  const result = normalizeError({ error: { code: 'COMPANY_UPDATE_FAILED', message: 'The company could not be updated.', requestId: '9499a12b-d37d-43cb-a08e-8e77ac10bc00', details: 'Action Denied: Company name cannot be changed once created!' } });
  assert.equal(result.title, 'Company name is locked');
  assert.match(result.message, /cannot be changed after creation/);
  assert.ok(result.fieldErrors.name);
  assert.equal(result.requestId, '9499a12b-d37d-43cb-a08e-8e77ac10bc00');
});
test('Zod field and form errors become readable, deduplicated validation messages', () => {
  const error = { error: { code: 'VALIDATION_ERROR', details: { formErrors: ['Please review the form.'], fieldErrors: { registration_number: ['String must contain at least 2 character(s)', 'String must contain at least 2 character(s)'], website: ['Invalid url'] } } } };
  assert.deepEqual(normalizeError(error).fieldErrors.registration_number, ['Use at least 2 characters.']);
  assert.match(extractErrorMessage(error), /Registration \/ tax number: Use at least 2 characters/);
  assert.match(extractErrorMessage(error), /Website: Enter a valid website URL/);
});
test('malformed errors, nested Axios envelopes and circular details never render objects', () => {
  const circular = {}; circular.self = circular;
  for (const value of [null, undefined, {}, [], 42, { message: circular, details: circular }, { details: { fieldErrors: { email: [{ message: 'bad' }, null] } } }]) {
    assert.equal(typeof extractErrorMessage(value), 'string');
    assert.doesNotMatch(extractErrorMessage(value), /\[object Object\]/);
  }
  assert.equal(normalizeError({ response: { status: 401, data: { error: { code: 'AUTH_REQUIRED' } } } }).title, 'Please sign in again');
});
test('sign-in credentials are distinguished from an expired session', () => {
  assert.match(extractErrorMessage({ code: 'SIGN_IN_FAILED', status: 401 }), /Incorrect email or password/);
  assert.match(extractErrorMessage({ status: 401 }), /session has expired/);
  assert.match(extractErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }), /Incorrect email or password/);
});
test('retry limits, timeout, offline, permissions and unavailable services have actionable messages', () => {
  for (const [error, pattern] of [
    [{ status: 429 }, /Too many requests/], [{ code: 'REQUEST_TIMEOUT' }, /Check whether your changes were saved/],
    [{ code: 'OFFLINE' }, /Reconnect/], [{ code: 'API_UNAVAILABLE' }, /Check your connection/],
    [{ status: 403 }, /permission/], [{ status: 404 }, /could not be found/], [{ status: 502 }, /try again shortly/],
    [{ statusCode: '413' }, /smaller file/], [{ status: 415 }, /file types/], [{ code: 'INVALID_RESPONSE' }, /unreadable/],
  ]) assert.match(extractErrorMessage(error), pattern);
});
test('HTML, SQL internals and programming exceptions are hidden from users', () => {
  for (const error of [{ message: '<!DOCTYPE html><html>gateway</html>' }, { message: 'duplicate key violates unique constraint private_table' }, { status: 409, message: 'duplicate key violates constraint' }, { status: 500, message: 'secret internal table' }, new TypeError('Cannot read properties of null')]) {
    assert.doesNotMatch(extractErrorMessage(error), /gateway|private_table|violates|secret internal|properties/);
  }
});
test('intentional cancellation is identifiable', () => {
  assert.equal(isAbortError(new DOMException('Cancelled', 'AbortError')), true);
  assert.equal(isAbortError({ code: 'REQUEST_ABORTED' }), true);
  assert.equal(isAbortError(new Error('Failure')), false);
});
