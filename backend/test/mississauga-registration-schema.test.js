import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mississaugaRegistrationSchema } from '../src/schemas.js';

const validPayload = {
  full_name: '  Jane Candidate ',
  email: ' JANE@example.com ',
  phone_e164: '+14165550123',
  current_city: 'Mississauga',
  employment_goal: 'Find a job',
  terms_accepted: true,
};

test('normalizes public registrations and defaults optional consent to false', () => {
  const parsed = mississaugaRegistrationSchema.parse(validPayload);
  assert.equal(parsed.full_name, 'Jane Candidate');
  assert.equal(parsed.email, 'jane@example.com');
  assert.equal(parsed.employer_sharing_consent, false);
  assert.equal(parsed.sms_marketing_consent, false);
  assert.equal(parsed.email_marketing_consent, false);
  assert.deepEqual(parsed.source_context, {});
});

test('requires legal acceptance and a valid E.164 phone', () => {
  assert.equal(mississaugaRegistrationSchema.safeParse({ ...validPayload, terms_accepted: false }).success, false);
  assert.equal(mississaugaRegistrationSchema.safeParse({ ...validPayload, phone_e164: '4165550123' }).success, false);
});

test('keeps optional consent independent and rejects unexpected fields', () => {
  const parsed = mississaugaRegistrationSchema.parse({
    ...validPayload,
    employer_sharing_consent: true,
    source_context: { utm_source: 'instagram', referrer: 'https://example.com/campaign?email=private@example.com' },
  });
  assert.equal(parsed.employer_sharing_consent, true);
  assert.equal(parsed.sms_marketing_consent, false);
  assert.equal(parsed.email_marketing_consent, false);
  assert.equal(mississaugaRegistrationSchema.safeParse({ ...validPayload, password: 'not-needed' }).success, false);
});
