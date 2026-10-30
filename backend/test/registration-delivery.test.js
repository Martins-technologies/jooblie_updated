import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deliveryConfiguration, registrationReceipt, runRegistrationDeliveries } from '../src/services/registrationDelivery.js';

const env = { MISSISSAUGA_CRM_ENABLED: 'true', MISSISSAUGA_CRM_WEBHOOK_URL: 'https://approved.example.test/intake', MISSISSAUGA_CRM_WEBHOOK_TOKEN: 'test-token', MISSISSAUGA_RECEIPT_ENABLED: 'true', MISSISSAUGA_FROM_EMAIL: 'registration@example.test', RESEND_API_KEY: 'test-key' };
const now = Date.parse('2026-10-25T00:00:00Z');
const job = kind => ({ id: 'job-1', registration_id: 'lead-1', lock_token: 'lease-1', kind, first_attempt_at: new Date(now).toISOString(), payload: { email: 'test@example.test', first_name: 'Test' } });
function database(jobs) {
  const finished = [];
  return {
    finished,
    async rpc(name, args) { if (name === 'claim_mississauga_deliveries') return { data: jobs }; finished.push(args); return { data: true }; },
    from() { return { select() { return this; }, eq() { return this; }, async single() { return { data: { id: 'lead-1', full_name: 'Test Person', email: 'test@example.test', employer_sharing_consent: false, sms_marketing_consent: false, email_marketing_consent: false, updated_at: new Date(now).toISOString() } }; } }; },
  };
}

test('unconfigured or unapproved deliveries do not claim jobs or send anything', async () => {
  assert.deepEqual(deliveryConfiguration({ ...env, MISSISSAUGA_CRM_ENABLED: 'false', MISSISSAUGA_RECEIPT_ENABLED: 'false' }), []);
  assert.deepEqual(deliveryConfiguration({ ...env, MISSISSAUGA_CRM_WEBHOOK_URL: 'http://insecure.test', MISSISSAUGA_FROM_EMAIL: 'invalid' }), []);
  const result = await runRegistrationDeliveries({ db: { rpc() { throw new Error('must not claim'); } }, env: {}, fetcher() { throw new Error('must not send'); } });
  assert.equal(result.claimed, 0);
});

test('CRM webhook requires a durable receipt and carries separate false consent signals', async () => {
  const db = database([job('crm')]);
  let payload;
  const result = await runRegistrationDeliveries({ db, env, now: () => now, fetcher: async (_url, request) => {
    payload = JSON.parse(request.body);
    assert.equal(request.headers['Idempotency-Key'], 'mississauga/crm/job-1');
    return Response.json({ accepted: true, record_id: 'crm-record' });
  } });
  assert.equal(result.delivered, 1);
  assert.deepEqual(payload.tags, ['Mississauga Launch', 'Job Seeker']);
  assert.equal(payload.registration.employer_sharing_consent, false);
  assert.equal(payload.registration.sms_marketing_consent, false);
  assert.equal(payload.registration.email_marketing_consent, false);
  assert.match(payload.event_id, /^[a-f0-9]{64}$/);
  assert.equal(db.finished[0].p_provider_id, 'crm-record');
});

test('provider failures are retryable and private response data is never persisted in error codes', async () => {
  for (const response of [Response.json({ private: 'contact@example.test' }, { status: 503 }), Response.json({ ok: true })]) {
    const db = database([job('crm')]);
    const result = await runRegistrationDeliveries({ db, env, now: () => now, fetcher: async () => response });
    assert.equal(result.failed, 1);
    assert.equal(db.finished[0].p_success, false);
    assert.doesNotMatch(JSON.stringify(db.finished), /contact@example|private/);
  }
});

test('receipt uses approved template independently of marketing consent, escapes HTML and keeps a stable key', async () => {
  const db = database([{ ...job('receipt'), payload: { email: 'test@example.test', first_name: '<Test>' } }]);
  await runRegistrationDeliveries({ db, env, now: () => now, fetcher: async (_url, request) => {
    const body = JSON.parse(request.body);
    assert.equal(request.headers['Idempotency-Key'], 'mississauga/receipt/job-1');
    assert.equal(body.subject, 'Your Jooblie Registration Has Been Received');
    assert.match(body.text, /Hi <Test>,/);
    assert.doesNotMatch(body.html, /Hi <Test>/);
    assert.match(body.html, /Hi &lt;Test&gt;/);
    assert.match(body.html, /Thank you for registering with Jooblie Mississauga/);
    return Response.json({ id: 'email-1' });
  } });
  assert.equal(db.finished[0].p_success, true);
  assert.equal(registrationReceipt('Test').text.includes('promotional'), false);
});

test('ambiguous receipt after provider deduplication window is held for review instead of sent again', async () => {
  const db = database([job('receipt')]);
  await runRegistrationDeliveries({ db, env, now: () => now + 24 * 60 * 60 * 1000, fetcher() { throw new Error('must not send'); } });
  assert.equal(db.finished[0].p_code, 'RECEIPT_REVIEW_REQUIRED');
});

test('failed persistence acknowledgment fails the worker so it cannot falsely report completion', async () => {
  const db = database([job('receipt')]);
  const rpc = db.rpc;
  db.rpc = async (name, args) => name.startsWith('finish_') ? { error: { code: 'offline' } } : rpc(name, args);
  await assert.rejects(runRegistrationDeliveries({ db, env, now: () => now, fetcher: async () => Response.json({ id: 'sent' }) }), /DELIVERY_ACKNOWLEDGMENT_FAILED/);
});
