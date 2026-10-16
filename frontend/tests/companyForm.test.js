import test from 'node:test';
import assert from 'node:assert/strict';
import { companyPayload, companyChanges, validateCompanyForm } from '../src/shared/lib/companyForm.js';
const valid = { name: 'Example Company', website: 'https://example.test', registration_number: 'TX-42', description: '' };
test('updates omit the immutable company name, ID and unsupported fields', () => {
  const form = { ...valid, id: 'company-id', name: 'Changed name', industry: 'Technology', created_by: 'user' };
  assert.deepEqual(companyPayload(form), { website: valid.website, registration_number: 'TX-42', description: null });
  assert.equal(form.name, 'Changed name');
});
test('creates trim required fields and validate the company name', () => {
  assert.equal(companyPayload({ ...valid, name: '  Acme  ' }).name, 'Acme');
  assert.ok(validateCompanyForm({ ...valid, name: ' ' }).name);
  assert.deepEqual(validateCompanyForm({ ...valid, id: 'existing', name: '' }), {});
});
test('registration rejects blank, one character and overlength values', () => {
  for (const registration_number of ['', ' ', '1', 'x'.repeat(181)]) assert.ok(validateCompanyForm({ ...valid, registration_number }).registration_number);
  assert.deepEqual(validateCompanyForm({ ...valid, registration_number: '  AB  ' }), {});
});
test('website requires an HTTP(S) URL and server length limits are respected', () => {
  for (const website of ['', 'example.com', 'javascript:alert(1)', 'ftp://example.test', 'https://']) assert.ok(validateCompanyForm({ ...valid, website }).website);
  assert.ok(validateCompanyForm({ ...valid, description: 'x'.repeat(10001) }).description);
  assert.ok(validateCompanyForm({ ...valid, name: 'x'.repeat(181) }).name);
  assert.deepEqual(validateCompanyForm(valid), {});
});

test('unchanged and whitespace-only edits produce no PATCH fields', () => {
  const baseline = { ...valid, id: 'company-id', description: null };
  assert.deepEqual(companyChanges({ ...baseline }, baseline), {});
  assert.deepEqual(companyChanges({ ...baseline, website: ` ${valid.website} `, registration_number: ' TX-42 ', description: '   ', name: 'Ignored locked name' }, baseline), {});
  assert.deepEqual(baseline, { ...valid, id: 'company-id', description: null });
});

test('PATCH sends only the supported edited fields and normalizes cleared description', () => {
  const baseline = { ...valid, id: 'company-id', description: 'Existing summary' };
  assert.deepEqual(companyChanges({ ...baseline, description: ' New summary ', linkedin_url: 'https://example.test' }, baseline), { description: 'New summary' });
  assert.deepEqual(companyChanges({ ...baseline, description: ' ' }, baseline), { description: null });
  assert.deepEqual(companyChanges({ ...baseline, website: ' https://new.example.test ' }, baseline), { website: 'https://new.example.test' });
});

test('legacy blank fields do not force updates or block an unrelated valid edit', () => {
  const baseline = { id: 'legacy-company', name: 'Legacy', website: null, registration_number: null, description: null };
  assert.deepEqual(companyChanges({ ...baseline, website: '', registration_number: '', description: '' }, baseline), {});
  assert.deepEqual(validateCompanyForm({ ...baseline }, baseline), {});
  assert.deepEqual(validateCompanyForm({ ...baseline, description: 'Updated summary' }, baseline), {});
  assert.deepEqual(companyChanges({ ...baseline, description: 'Updated summary' }, baseline), { description: 'Updated summary' });
  assert.ok(validateCompanyForm({ ...baseline, registration_number: 'x' }, baseline).registration_number);
});

test('reverting edits and resetting the saved baseline clear dirty state', () => {
  const baseline = { ...valid, id: 'company-id' };
  const edited = { ...baseline, registration_number: 'TX-43' };
  assert.deepEqual(companyChanges(edited, baseline), { registration_number: 'TX-43' });
  assert.deepEqual(companyChanges({ ...edited, registration_number: baseline.registration_number }, baseline), {});
  assert.deepEqual(companyChanges(edited, { ...edited }), {});
});

test('creation includes required fields and validates them before a request', () => {
  assert.deepEqual(companyChanges(valid, null), companyPayload(valid));
  assert.deepEqual(Object.keys(validateCompanyForm({ name: ' ', website: '', registration_number: '', description: '' }, null)).sort(), ['name', 'registration_number', 'website']);
});
