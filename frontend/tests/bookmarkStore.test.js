import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookmarkStore } from '../src/shared/lib/bookmarkStore.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('cards batch saved status and remove an existing account bookmark using DELETE', async () => {
  const calls = [];
  const store = createBookmarkStore(async (path, options) => {
    calls.push({ path, ...options });
    return { savedJobIds: ['job-a'] };
  });
  let first;
  let second;
  store.subscribe('account-a', 'job-a', (state) => { first = state; }, 'token-a');
  store.subscribe('account-a', 'job-b', (state) => { second = state; }, 'token-a');
  await settle();
  assert.equal(calls.length, 1);
  assert.match(calls[0].path, /jobIds=job-a%2Cjob-b/);
  assert.equal(first.saved, true);
  assert.equal(second.saved, false);
  await store.toggle('account-a', 'job-a');
  assert.equal(calls[1].method, 'DELETE');
  assert.equal(calls[1].accessToken, 'token-a');
  assert.equal(first.saved, false);
});

test('account status is isolated and uses each account session', async () => {
  const store = createBookmarkStore(async (_path, options) => ({ savedJobIds: options.accessToken === 'token-a' ? ['job-a'] : [] }));
  let first;
  let second;
  store.subscribe('account-a', 'job-a', (state) => { first = state; }, 'token-a');
  store.subscribe('account-b', 'job-a', (state) => { second = state; }, 'token-b');
  await settle();
  assert.equal(first.saved, true);
  assert.equal(second.saved, false);
});

test('failed save preserves the previous bookmark state and allows retry', async () => {
  let fail = true;
  let state;
  const store = createBookmarkStore(async (_path, options) => {
    if (options.method && fail) throw new Error('Network unavailable');
    return { savedJobIds: [] };
  });
  store.subscribe('account-a', 'job-a', (next) => { state = next; }, 'token-a');
  await settle();
  await assert.rejects(store.toggle('account-a', 'job-a'), /Network unavailable/);
  assert.equal(state.saved, false);
  assert.equal(state.loading, false);
  fail = false;
  await store.toggle('account-a', 'job-a');
  assert.equal(state.saved, true);
});

test('duplicate subscribers during status loading share one request', async () => {
  let resolveStatus;
  let calls = 0;
  const store = createBookmarkStore(() => { calls += 1; return new Promise((resolve) => { resolveStatus = resolve; }); });
  const unsubscribe = store.subscribe('account-a', 'job-a', () => {}, 'token-a');
  await settle();
  unsubscribe();
  store.subscribe('account-a', 'job-a', () => {}, 'token-a');
  await settle();
  assert.equal(calls, 1);
  resolveStatus({ savedJobIds: ['job-a'] });
  await settle();
});
