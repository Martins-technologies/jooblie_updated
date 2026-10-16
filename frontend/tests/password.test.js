import test from 'node:test';
import assert from 'node:assert/strict';
import { changeAccountPassword } from '../src/shared/lib/password.js';

function clients({ verificationError = null, updateError = null } = {}) {
  const calls = [];
  return {
    calls,
    authClient: { auth: { updateUser: async (body) => { calls.push(['update', body]); return { error: updateError }; } } },
    verificationClient: { auth: {
      signInWithPassword: async (body) => { calls.push(['verify', body]); return { error: verificationError }; },
      signOut: async (options) => { calls.push(['temporary-signout', options]); },
    } },
    email: 'recruiter@example.test', currentPassword: 'current-password', newPassword: 'updated-password',
  };
}

test('password update verifies current credentials first and revokes only temporary session', async () => {
  const scenario = clients();
  await changeAccountPassword(scenario);
  assert.deepEqual(scenario.calls.map(([name]) => name), ['verify', 'update', 'temporary-signout']);
  assert.deepEqual(scenario.calls[2][1], { scope: 'local' });
  assert.deepEqual(scenario.calls[1][1], { password: 'updated-password' });
});

test('incorrect current password never updates the real account password', async () => {
  const scenario = clients({ verificationError: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
  await assert.rejects(changeAccountPassword(scenario), /current password is incorrect/);
  assert.deepEqual(scenario.calls.map(([name]) => name), ['verify']);
});

test('Supabase update failure reaches the caller and still cleans up verification session', async () => {
  const scenario = clients({ updateError: new Error('Reauthentication required') });
  await assert.rejects(changeAccountPassword(scenario), /Reauthentication required/);
  assert.equal(scenario.calls.at(-1)[0], 'temporary-signout');
});
