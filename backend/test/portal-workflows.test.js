import test from 'node:test';
import assert from 'node:assert/strict';
import { jobPayload, savePortalJob } from '../src/utils/portalJobs.js';
import { historyPagination, loadSeekerHistory, loadSavedJobStatus } from '../src/utils/seekerHistory.js';
import { changeApplicationStatus } from '../src/utils/applicationStatus.js';
import { getNotificationPreferences, setNotificationPreferences } from '../src/utils/notificationPreferences.js';
import { notificationPreferencesSchema, adminJobUpdateSchema } from '../src/schemas.js';

function database(result = { data: null, error: null }) {
  const calls = [];
  const builder = {};
  for (const name of ['from', 'select', 'eq', 'is', 'in', 'order', 'range', 'update', 'upsert', 'rpc']) {
    builder[name] = (...args) => { calls.push([name, ...args]); return builder; };
  }
  builder.single = builder.maybeSingle = async () => result;
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return { db: builder, calls };
}

test('job payload excludes immutable and audience fields and derives remote location', () => {
  assert.deepEqual(jobPayload({
    title: 'Developer', company_id: 'another-company', origin_site_id: 7,
    created_by: 'another-user', published_at: '2099-01-01', audience_sites: ['newcomers'],
    workplace_type: 'remote', is_remote: false, city: 'Toronto', province: 'Ontario',
    removed_reason: 'untrusted',
  }), { title: 'Developer', workplace_type: 'remote', is_remote: true, city: null, province: null });
});

test('create uses one RPC with actor/source and audience targeting outside job columns', async () => {
  const { db, calls } = database({ data: { id: 'job' }, error: null });
  await savePortalJob(db, { actorId: 'actor', siteId: 3, body: { title: 'Developer', audience_sites: ['newcomers'] } });
  assert.deepEqual(calls, [['rpc', 'save_portal_job', {
    p_actor_id: 'actor', p_job_id: null, p_site_id: 3,
    p_payload: { title: 'Developer' }, p_audience_slugs: ['newcomers'], p_is_admin: false,
  }]]);
});

test('omitted audience settings preserve update mappings, explicit empty clears them', async () => {
  for (const [body, expected] of [[{ title: 'Updated' }, null], [{ audience_sites: [] }, []]]) {
    const { db, calls } = database({ data: { id: 'job' }, error: null });
    await savePortalJob(db, { actorId: 'actor', jobId: 'job', body });
    assert.deepEqual(calls[0][2].p_audience_slugs, expected);
  }
});

test('admin payload supports moderation without client-controlled timestamps', async () => {
  const { db, calls } = database({ data: { id: 'job' }, error: null });
  await savePortalJob(db, { actorId: 'admin', jobId: 'job', admin: true,
    body: { status: 'removed', removed_reason: 'Policy', published_at: '2099-01-01' } });
  assert.deepEqual(calls[0][2].p_payload, { status: 'removed', removed_reason: 'Policy' });
  assert.equal(calls[0][2].p_site_id, null);
  assert.equal(calls[0][2].p_is_admin, true);
});

test('job RPC failures never fall back to non-atomic writes', async () => {
  for (const [code, status] of [['PGRST202', 503], ['42501', 403], ['P0002', 404], ['23514', 400]]) {
    const { db, calls } = database({ data: null, error: { code, message: 'Failure' } });
    await assert.rejects(savePortalJob(db, { actorId: 'actor', body: {} }), (error) => error.status === status);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'rpc');
  }
});

test('application status update requires expected status and nondeleted row', async () => {
  const { db, calls } = database({ data: { id: 'app', status: 'shortlisted' }, error: null });
  await changeApplicationStatus(db, { applicationId: 'app', expectedStatus: 'viewed', status: 'shortlisted' });
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === 'app'));
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'status' && call[2] === 'viewed'));
  assert.ok(calls.some((call) => call[0] === 'is' && call[1] === 'deleted_at' && call[2] === null));
});

test('concurrent application update returns conflict, resume viewing does not overwrite it', async () => {
  const { db } = database();
  await assert.rejects(changeApplicationStatus(db, { applicationId: 'app', expectedStatus: 'viewed', status: 'shortlisted' }),
    (error) => error.status === 409 && error.code === 'APPLICATION_CHANGED');
  assert.equal(await changeApplicationStatus(db, { applicationId: 'app', expectedStatus: 'submitted', status: 'viewed', allowConflict: true }), null);
});

test('resume view status write errors are checked', async () => {
  const { db } = database({ data: null, error: { code: '42501' } });
  await assert.rejects(changeApplicationStatus(db, { applicationId: 'app', expectedStatus: 'submitted', status: 'viewed', allowConflict: true }),
    (error) => error.status === 403);
});

test('history pagination clamps size while retaining backward compatible limit alias', () => {
  assert.deepEqual(historyPagination({ page: 2, pageSize: 1000 }), { page: 2, pageSize: 100, from: 100, to: 199 });
  assert.deepEqual(historyPagination({ page: -1, limit: 10 }), { page: 1, pageSize: 10, from: 0, to: 9 });
});

test('application list scopes owner and returns requested page with total', async () => {
  const { db, calls } = database({ data: [{ id: 'old-application' }], count: 61, error: null });
  const result = await loadSeekerHistory(db, { userId: 'owner', query: { page: 2, pageSize: 25 }, kind: 'applications', jobSelect: 'id,title' });
  assert.deepEqual(result, { items: [{ id: 'old-application' }], page: 2, pageSize: 25, total: 61 });
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'applicant_id' && call[2] === 'owner'));
  assert.ok(calls.some((call) => call[0] === 'range' && call[1] === 25 && call[2] === 49));
});

test('saved list scopes user independently of current portal', async () => {
  const { db, calls } = database({ data: [], count: 0, error: null });
  await loadSeekerHistory(db, { userId: 'owner', query: {}, kind: 'saved', jobSelect: 'id,title' });
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner'));
  assert.ok(!calls.some((call) => call[0] === 'eq' && call[1] === 'saved_via_site_id'));
});

test('batched saved status validates IDs and scopes to user', async () => {
  const id = '068f1706-ae74-418c-8e64-da65fc050963';
  const { db, calls } = database({ data: [{ job_id: id }], error: null });
  assert.deepEqual(await loadSavedJobStatus(db, 'owner', `${id},${id}`), { savedJobIds: [id] });
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner'));
  assert.ok(calls.some((call) => call[0] === 'in' && call[2].length === 1));
  await assert.rejects(loadSavedJobStatus(db, 'owner', 'invalid'), (error) => error.status === 400);
  await assert.rejects(loadSavedJobStatus(db, 'owner', Array(101).fill(id).join(',')), (error) => error.status === 400);
});

test('missing preferences return documented defaults without writing', async () => {
  const { db, calls } = database();
  assert.deepEqual(await getNotificationPreferences(db, 'owner'), { preferences: {
    email_new_applicant: true, email_daily_summary: false, email_marketing: false, updated_at: null,
  } });
  assert.ok(!calls.some((call) => call[0] === 'upsert'));
});

test('saving preferences binds user server-side and excludes unknown fields', async () => {
  const { db, calls } = database({ data: { email_new_applicant: false }, error: null });
  await setNotificationPreferences(db, 'owner', { email_new_applicant: false, email_daily_summary: true,
    email_marketing: false, user_id: 'other-user', role: 'admin' });
  const payload = calls.find((call) => call[0] === 'upsert')[1];
  assert.equal(payload.user_id, 'owner');
  assert.equal(payload.role, undefined);
  assert.equal(payload.email_daily_summary, true);
});

test('preference input requires actual boolean values and admin edits accept removed status', () => {
  assert.equal(notificationPreferencesSchema.safeParse({ email_new_applicant: 'false', email_daily_summary: false, email_marketing: false }).success, false);
  assert.equal(notificationPreferencesSchema.safeParse({ email_new_applicant: true }).success, false);
  assert.equal(adminJobUpdateSchema.safeParse({ status: 'removed', moderation_note: 'Policy' }).success, true);
});
