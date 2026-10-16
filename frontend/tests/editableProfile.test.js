import test from 'node:test';
import assert from 'node:assert/strict';
import { accountPayload, samePayload, seekerProfileForm, seekerProfilePayload, validateAccount, validatePassword, validateSeekerProfile } from '../src/shared/lib/editableProfile.js';

test('account dirty comparison ignores trim and empty/null optional differences', () => {
  assert.ok(samePayload(accountPayload({ full_name: ' Alice ', phone: '' }), accountPayload({ full_name: 'Alice', phone: null })));
  assert.ok(!samePayload(accountPayload({ full_name: 'Alice' }), accountPayload({ full_name: 'Alicia' })));
  assert.deepEqual(validateAccount({ full_name: ' ', phone: '1'.repeat(51) }), { full_name: 'Enter at least 2 characters.', phone: 'Use 50 characters or fewer.' });
});

test('password validation is local and maps each problem to its own field', () => {
  assert.deepEqual(validatePassword({}), { currentPassword: 'Enter your current password.', newPassword: 'Use at least 8 characters.', confirmPassword: 'Confirm your new password.' });
  assert.equal(validatePassword({ currentPassword: 'oldpass12', newPassword: 'newpass12', confirmPassword: 'different' }).confirmPassword, 'Passwords do not match.');
  assert.ok(validatePassword({ currentPassword: 'samepass12', newPassword: 'samepass12', confirmPassword: 'samepass12' }).newPassword);
  assert.deepEqual(validatePassword({ currentPassword: 'oldpass12', newPassword: 'newpass12', confirmPassword: 'newpass12' }), {});
});

test('seeker dirty comparison ignores presentation flags and empty skill rows', () => {
  const initial = { full_name: 'Alice', experience: [{ title: 'Developer', company: 'Company', current: true, endDate: '2020-01-01' }], skills: ['React'] };
  const edited = seekerProfileForm(initial);
  edited.experience[0].isEditing = true;
  edited.skills.push(' ');
  assert.ok(samePayload(seekerProfilePayload(initial), seekerProfilePayload(edited)));
  edited.experience[0].title = 'Senior Developer';
  assert.ok(!samePayload(seekerProfilePayload(initial), seekerProfilePayload(edited)));
});

test('seeker validates hidden tab entries, limits and date order before saving', () => {
  const errors = validateSeekerProfile({ full_name: 'Alice', experience: [{ title: '', company: '', startDate: '2024-02-01', endDate: '2024-01-01' }], education: [{ degree: '', institution: '', startDate: '2030-01-01' }], skills: ['x'.repeat(81)] }, null, '2026-01-01');
  for (const key of ['experience.0.title', 'experience.0.company', 'experience.0.endDate', 'education.0.degree', 'education.0.institution', 'education.0.startDate', 'skills.0']) assert.ok(errors[key], key);
});

test('resume validation rejects empty, oversize and disguised non-PDF before upload', () => {
  const profile = { full_name: 'Alice' };
  assert.ok(validateSeekerProfile(profile, { name: 'resume.pdf', size: 0, type: 'application/pdf' }).resume);
  assert.ok(validateSeekerProfile(profile, { name: 'resume.pdf', size: 5 * 1024 * 1024 + 1, type: 'application/pdf' }).resume);
  assert.ok(validateSeekerProfile(profile, { name: 'resume.pdf', size: 10, type: 'image/png' }).resume);
  assert.deepEqual(validateSeekerProfile(profile, { name: 'resume.pdf', size: 10, type: '' }), {});
});

test('server JSON experience and education hydrate into safe editable arrays', () => {
  const profile = seekerProfileForm({ full_name: 'Alice', experience: '[{"title":"Developer","company":"Company"}]', education: '{bad json}' });
  assert.equal(profile.experience[0].isEditing, false);
  assert.deepEqual(profile.education, []);
  assert.equal(profile.phone, '');
});
