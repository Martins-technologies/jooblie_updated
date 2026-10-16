import test from 'node:test';
import assert from 'node:assert/strict';
import { jobPayload, validateJobForm } from '../src/shared/lib/jobForm.js';
const valid = { title: 'Software developer', category_id: '1', description: 'Build useful software for customers.', skills: 'React, TypeScript', salary_min: '', salary_max: '', city: 'Toronto', province: 'Ontario', workplace_type: 'onsite', audience_sites: [] };
test('empty/whitespace forms report all required fields before any API call', () => {
  const errors = validateJobForm({ ...valid, title: '   ', category_id: '', description: ' ' });
  assert.deepEqual(Object.keys(errors), ['title', 'category_id', 'description']);
});
test('salary validation rejects negative, nonfinite, malformed and reversed ranges', () => {
  for (const salary_min of ['-1', 'Infinity', 'abc']) assert.ok(validateJobForm({ ...valid, salary_min }).salary_min);
  assert.ok(validateJobForm({ ...valid, salary_min: '100', salary_max: '50' }).salary_max);
  assert.deepEqual(validateJobForm({ ...valid, salary_min: '0', salary_max: '0' }), {});
});
test('unknown categories and skill limits produce inline field errors without truncation', () => {
  assert.ok(validateJobForm(valid, [{ id: 2 }]).category_id);
  assert.ok(validateJobForm({ ...valid, skills: 'x'.repeat(81) }).skills);
  assert.ok(validateJobForm({ ...valid, skills: Array(51).fill('React').join(',') }).skills);
});
test('payload trims values, preserves zero salary and ignores remote location', () => {
  const result = jobPayload({ ...valid, title: '  Developer  ', salary_min: '0', workplace_type: 'remote' });
  assert.equal(result.title, 'Developer'); assert.equal(result.salary_min, 0);
  assert.equal(result.salary_max, null); assert.equal(result.city, null); assert.equal(result.province, null);
  assert.deepEqual(result.skills, ['React', 'TypeScript']);
});
