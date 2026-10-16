import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiRequester, ApiClientError } from '../src/shared/lib/request.js';
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
function setup(fetchImpl, extra = {}) {
  const reports = [];
  return { reports, request: createApiRequester({ baseUrl: 'https://api.example.test/api/v1', siteSlug: 'jooblie', getAccessToken: async () => 'session-token', reportError: error => reports.push(error), fetchImpl, ...extra }) };
}
test('requests retain portal, authentication, headers and JSON body', async () => {
  let call;
  const { request } = setup(async (...args) => { call = args; return json({ ok: true }); });
  assert.deepEqual(await request('/company', { method: 'PATCH', auth: true, headers: { 'X-Custom': 'yes' }, body: { description: 'Updated' } }), { ok: true });
  assert.equal(call[0], 'https://api.example.test/api/v1/company');
  assert.equal(call[1].headers.Authorization, 'Bearer session-token');
  assert.equal(call[1].headers['X-Site-Slug'], 'jooblie');
  assert.equal(call[1].headers['X-Custom'], 'yes');
  assert.deepEqual(JSON.parse(call[1].body), { description: 'Updated' });
});
test('API details, request ID and friendly immutable-name message survive the request layer', async () => {
  const { request, reports } = setup(async () => json({ error: { code: 'COMPANY_UPDATE_FAILED', message: 'The company could not be updated.', requestId: 'request-123', details: 'Action Denied: Company name cannot be changed once created!' } }, 400));
  await assert.rejects(request('/company'), error => error instanceof ApiClientError && error.requestId === 'request-123' && /cannot be changed after creation/.test(error.message) && error.details.includes('Action Denied'));
  assert.equal(reports.length, 1);
});
test('field validation remains available for inline fields and messages are readable', async () => {
  const { request } = setup(async () => json({ error: { code: 'VALIDATION_ERROR', details: { fieldErrors: { registration_number: ['String must contain at least 2 character(s)'] } } } }, 422));
  await assert.rejects(request('/company'), error => /Registration \/ tax number: Use at least 2/.test(error.message) && Boolean(error.details.fieldErrors.registration_number));
});
test('missing authentication fails visibly before fetching', async () => {
  let calls = 0;
  const { request, reports } = setup(async () => { calls++; }, { getAccessToken: async () => null });
  await assert.rejects(request('/private', { auth: true }), { code: 'AUTH_REQUIRED' });
  assert.equal(calls, 0); assert.equal(reports.length, 1);
});
test('204, 205 and HEAD successes do not try to parse JSON', async () => {
  for (const [status, method] of [[204, 'DELETE'], [205, 'POST'], [200, 'HEAD']]) {
    const { request } = setup(async () => new Response(null, { status }));
    assert.equal(await request('/item', { method }), null);
  }
});
test('malformed success and HTML proxy errors never expose response contents', async () => {
  for (const status of [200, 502]) {
    const { request, reports } = setup(async () => new Response('<html>internal proxy details</html>', { status }));
    await assert.rejects(request('/item'), error => error instanceof ApiClientError && !error.message.includes('<html>') && !error.message.includes('internal proxy'));
    assert.equal(reports.length, 1);
  }
});
test('error envelope is caught even with a successful HTTP status', async () => {
  const { request } = setup(async () => json({ error: { code: 'BUSINESS_ERROR', message: 'This action is no longer available.' } }));
  await assert.rejects(request('/item'), { code: 'BUSINESS_ERROR' });
});
test('null and primitive success bodies fail visibly instead of crashing a consuming page', async () => {
  for (const payload of [null, 'not an API object', 42, true]) {
    const { request, reports } = setup(async () => json(payload));
    await assert.rejects(request('/item'), { code: 'INVALID_RESPONSE' });
    assert.equal(reports.length, 1);
  }
});
test('rate limit includes Retry-After and header request reference', async () => {
  const { request } = setup(async () => json({}, 429, { 'Retry-After': '30', 'X-Request-Id': 'header-id' }));
  await assert.rejects(request('/item'), error => error.retryAfter === 30 && error.requestId === 'header-id' && /Too many requests/.test(error.message));
});
test('network and offline failures are distinct and POST is never automatically retried', async () => {
  for (const online of [true, false]) {
    let calls = 0;
    const { request, reports } = setup(async () => { calls++; throw new TypeError('Failed to fetch'); }, { isOnline: () => online });
    await assert.rejects(request('/item', { method: 'POST' }), { code: online ? 'API_UNAVAILABLE' : 'OFFLINE' });
    assert.equal(calls, 1); assert.equal(reports.length, 1);
  }
});
test('pre-aborted requests and in-flight navigation cancellation produce no notification', async () => {
  const early = new AbortController(); early.abort();
  const first = setup(async () => { throw new Error('Must not fetch'); });
  await assert.rejects(first.request('/item', { signal: early.signal }), { name: 'AbortError' });
  assert.equal(first.reports.length, 0);
  const active = new AbortController();
  const second = setup(async (_url, { signal }) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))); active.abort(); }));
  await assert.rejects(second.request('/item', { signal: active.signal }), { name: 'AbortError' });
  assert.equal(second.reports.length, 0);
});
test('timeouts are visible and warn users to check saved state before retrying', async () => {
  const { request, reports } = setup(async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')))));
  await assert.rejects(request('/item', { method: 'POST', timeoutMs: 5 }), error => error.code === 'REQUEST_TIMEOUT' && /Check whether your changes were saved/.test(error.message));
  assert.equal(reports.length, 1);
});
test('explicitly silent callers still receive errors without a toast', async () => {
  const { request, reports } = setup(async () => json({}, 500));
  await assert.rejects(request('/item', { notifyError: false })); assert.equal(reports.length, 0);
});
test('circular request data fails without making a network call', async () => {
  const body = {}; body.self = body;
  const { request } = setup(async () => { throw new Error('Must not fetch'); });
  await assert.rejects(request('/item', { method: 'POST', body }), { code: 'INVALID_REQUEST' });
});
test('notification failures never replace the original API error', async () => {
  const { request } = setup(async () => json({ error: { code: 'KNOWN_FAILURE' } }, 400), { reportError: () => { throw new Error('Toast unavailable'); } });
  await assert.rejects(request('/item'), { code: 'KNOWN_FAILURE' });
});
