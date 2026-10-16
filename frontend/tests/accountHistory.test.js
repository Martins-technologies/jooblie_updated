import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleHistoryState } from '../src/shared/lib/accountHistory.js';

test('session switch hides previous account history before the next request resolves', () => {
  const loaded = { accountId: 'account-a', items: [{ id: 'private-application-a' }], total: 1, loading: false, error: '' };
  assert.equal(visibleHistoryState(loaded, 'account-a'), loaded);
  const switched = visibleHistoryState(loaded, 'account-b');
  assert.deepEqual(switched.items, []);
  assert.equal(switched.total, 0);
  assert.equal(switched.loading, true);
  assert.deepEqual(visibleHistoryState(loaded, null).items, []);
});
