import test from 'node:test';
import assert from 'node:assert/strict';
import { profileProgress, salaryLabel, jobLocation } from '../src/shared/lib/dashboardPresentation.js';
test('profile progress uses persisted data including legacy JSON arrays', () => {
  assert.equal(profileProgress({}).percent, 0);
  assert.equal(profileProgress({ full_name: 'A', phone: '1', headline: 'Engineer', location_city: 'Toronto', experience: '[{"title":"Developer"}]', education: [{ degree: 'BSc' }], skills: ['React'], default_resume_path: 'private/resume.pdf' }).percent, 100);
  assert.equal(profileProgress({ experience: 'bad json', skills: '[]' }).experience, false);
});
test('salary formatting does not turn missing salaries into zero or invent a currency amount', () => {
  assert.equal(salaryLabel({}), 'Salary not listed');
  assert.match(salaryLabel({ salary_min: 100000, salary_max: 120000, salary_currency: 'CAD', salary_period: 'yearly' }), /CAD 100,000 – 120,000 \/ year/);
  assert.match(salaryLabel({ salary_max: 50000 }), /Up to 50,000/);
});
test('remote locations and actual office locations are distinct', () => {
  assert.equal(jobLocation({ is_remote: true, city: 'Toronto' }), 'Remote');
  assert.equal(jobLocation({ city: 'Toronto', province: 'ON' }), 'Toronto, ON');
});
