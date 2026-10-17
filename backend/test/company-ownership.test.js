import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureCompanyOwnership } from '../src/utils/companyOwnership.js';

function database(insertError, owner, lookupError = null) {
  const filters = [];
  return { filters, from(table) {
    assert.equal(table, 'company_members');
    return {
      async insert(payload) {
        assert.deepEqual(payload, { company_id: 'new-company', user_id: 'converted-recruiter', role: 'owner' });
        return { error: insertError };
      },
      select() { return this; },
      eq(...args) { filters.push(args); return this; },
      async maybeSingle() { return { data: owner, error: lookupError }; },
    };
  } };
}

test('converted recruiter receives owner membership when no database trigger creates it', async () => {
  const db = database(null);
  await ensureCompanyOwnership(db, 'new-company', 'converted-recruiter');
  assert.deepEqual(db.filters, []);
});
test('trigger-created exact ownership is accepted without deleting the company', async () => {
  const db = database({ code: '23505' }, { company_id: 'new-company', user_id: 'converted-recruiter', role: 'owner' });
  await ensureCompanyOwnership(db, 'new-company', 'converted-recruiter');
  assert.deepEqual(db.filters, [['company_id', 'new-company'], ['user_id', 'converted-recruiter'], ['role', 'owner']]);
});
test('unrelated ownership uniqueness and non-owner membership never grant company access', async () => {
  for (const owner of [null, { company_id: 'other-company', user_id: 'converted-recruiter', role: 'owner' }, { company_id: 'new-company', user_id: 'other-user', role: 'owner' }, { company_id: 'new-company', user_id: 'converted-recruiter', role: 'member' }]) {
    await assert.rejects(ensureCompanyOwnership(database({ code: '23505' }, owner), 'new-company', 'converted-recruiter'), error => error.status === 409 && error.code === 'COMPANY_OWNER_CONFLICT');
  }
});
test('failed ownership verification stays distinguishable from a failed insert', async () => {
  await assert.rejects(ensureCompanyOwnership(database({ code: '23505' }, null, { message: 'offline' }), 'new-company', 'converted-recruiter'), error => error.status === 503 && error.code === 'COMPANY_OWNER_CHECK_FAILED');
  await assert.rejects(ensureCompanyOwnership(database({ code: '42501' }), 'new-company', 'converted-recruiter'), error => error.code === 'COMPANY_MEMBER_FAILED');
});
