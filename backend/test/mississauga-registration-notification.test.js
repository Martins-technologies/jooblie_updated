import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notifyAdminsOfMississaugaRegistration } from '../src/controllers/registration.controller.js';

function createDb({ admins = [], adminError = null, notificationError = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [], inserted: null };
      calls.push(call);
      const query = {
        select(...args) { call.select = args; return query; },
        eq(...args) { call.filters.push(args); return query; },
        insert(rows) { call.inserted = rows; return Promise.resolve({ error: notificationError }); },
        then(resolve, reject) { return Promise.resolve({ data: admins, error: adminError }).then(resolve, reject); },
      };
      return query;
    },
  };
}

test('new Mississauga leads notify every active admin with a privacy-safe linkable notice', async () => {
  const db = createDb({ admins: [{ id: 'admin-one' }, { id: 'admin-two' }] });
  await notifyAdminsOfMississaugaRegistration(db, '11111111-1111-4111-8111-111111111111', 7);
  assert.equal(db.calls[0].table, 'profiles');
  assert.deepEqual(db.calls[0].filters, [['role', 'admin'], ['status', 'active']]);
  assert.equal(db.calls[1].table, 'notifications');
  assert.deepEqual(db.calls[1].inserted.map(({ user_id, type, entity_type, entity_id, site_id }) => ({ user_id, type, entity_type, entity_id, site_id })), [
    { user_id: 'admin-one', type: 'mississauga_registration', entity_type: 'registration', entity_id: '11111111-1111-4111-8111-111111111111', site_id: 7 },
    { user_id: 'admin-two', type: 'mississauga_registration', entity_type: 'registration', entity_id: '11111111-1111-4111-8111-111111111111', site_id: 7 },
  ]);
  assert.doesNotMatch(JSON.stringify(db.calls[1].inserted), /email|phone|candidate/i);
});

test('admin notification lookup failure safely skips alerts', async () => {
  const db = createDb({ adminError: { code: 'DB_UNAVAILABLE' } });
  await assert.doesNotReject(() => notifyAdminsOfMississaugaRegistration(db, '11111111-1111-4111-8111-111111111111', 7));
  assert.equal(db.calls.length, 1);
});

test('notification insert failure does not invalidate a stored lead', async () => {
  const db = createDb({ admins: [{ id: 'admin-one' }], notificationError: { code: 'DB_UNAVAILABLE' } });
  await assert.doesNotReject(() => notifyAdminsOfMississaugaRegistration(db, '11111111-1111-4111-8111-111111111111', 7));
  assert.equal(db.calls[1].table, 'notifications');
});
