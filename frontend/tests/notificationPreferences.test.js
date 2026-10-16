import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationPreferencesPayload } from '../src/shared/lib/notificationPreferences.js';

test('GET metadata is excluded from strict preference PATCH payload after repeated saves', () => {
  const saved = {
    email_new_applicant: false, email_daily_summary: true, email_marketing: false,
    updated_at: '2026-10-16T00:00:00Z', user_id: 'server-owned-user-id',
  };
  const payload = notificationPreferencesPayload(saved);
  assert.deepEqual(payload, { email_new_applicant: false, email_daily_summary: true, email_marketing: false });
  assert.deepEqual(notificationPreferencesPayload({ ...payload, updated_at: 'new-server-timestamp' }), payload);
});
