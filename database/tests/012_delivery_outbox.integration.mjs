import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Run with PGLITE_MODULE pointing at a local PGlite installation. All data is
// fictional and ephemeral; this test never connects to Supabase.
test('delivery outbox migration executes and preserves intake, consent updates, leases, retries and access isolation', async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
  const db = await PGlite.create();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role; create table public.profiles(id uuid primary key);');
    for (const file of ['008_mississauga_registration_intake.sql','011_mississauga_registration_deduplication.sql','012_mississauga_delivery_outbox.sql']) {
      await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
    }
    const payload = { full_name: 'Test Candidate', email: 'test@example.invalid', phone_e164: '+14165550123', current_city: 'Mississauga', employment_goal: 'Find a job', employer_sharing_consent: false, marketing_consent: false };
    const register = async data => (await db.query('select * from public.upsert_mississauga_registration($1)', [JSON.stringify(data)])).rows[0];
    const claim = async kind => (await db.query('select * from public.claim_mississauga_deliveries($1, 5)', [[kind]])).rows;
    const finish = async (job, success, token = job.lock_token) => (await db.query('select public.finish_mississauga_delivery($1,$2,$3,$4,$5) as finished', [job.id, token, success, success ? null : 'PROVIDER_REJECTED', success ? 'provider-test' : null])).rows[0].finished;
    const first = await register(payload);
    assert.equal(first.duplicate, false);
    assert.equal((await db.query('select * from public.mississauga_delivery_jobs')).rows.length, 2);
    const duplicate = await register({ ...payload, employer_sharing_consent: true });
    assert.equal(duplicate.duplicate, true); assert.equal(duplicate.registration_id, first.registration_id);
    assert.equal((await db.query("select * from public.mississauga_delivery_jobs where kind='receipt'")).rows.length, 1);
    const [running] = await claim('crm');
    assert.equal(running.attempts, 1);
    await register(payload); // Revoke permission while previous CRM delivery runs.
    assert.equal((await claim('crm')).length, 0, 'a running revision blocks a second delivery for the same lead');
    assert.equal(await finish(running, true, '00000000-0000-4000-8000-000000000000'), false, 'stale worker cannot acknowledge');
    await db.query("update public.mississauga_delivery_jobs set locked_until=now()-interval '1 minute' where id=$1", [running.id]);
    const [reclaimed] = await claim('crm');
    assert.equal(reclaimed.id, running.id); assert.notEqual(reclaimed.lock_token, running.lock_token);
    assert.equal(await finish(running, true), false, 'reclaimed lease invalidates original worker token');
    assert.equal(await finish(reclaimed, false), true);
    assert.equal((await db.query('select status from public.mississauga_delivery_jobs where id=$1', [running.id])).rows[0].status, 'superseded');
    const [current] = await claim('crm');
    assert.ok(current);
    assert.equal(await finish(current, true), true);
    assert.equal((await claim('crm')).length, 0);
    assert.equal((await db.query('select employer_sharing_consent from public.mississauga_registrations')).rows[0].employer_sharing_consent, false);
    const [receipt] = await claim('receipt');
    assert.equal(await finish(receipt, true), true);
    assert.equal((await claim('receipt')).length, 0, 'receipt is not sent twice');
    await register({ ...payload, current_city: 'Toronto' });
    for (let attempt = 1; attempt <= 8; attempt++) {
      const [retry] = await claim('crm');
      assert.equal(retry.attempts, attempt);
      assert.equal(await finish(retry, false), true);
      if (attempt < 8) {
        assert.equal((await claim('crm')).length, 0, 'backoff is respected');
        await db.exec("update public.mississauga_delivery_jobs set available_at=now()-interval '1 minute' where status='pending'");
      }
    }
    assert.equal((await db.query("select count(*)::int as count from public.mississauga_delivery_jobs where status='dead'")).rows[0].count, 1);
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from public.mississauga_delivery_jobs'), /permission denied/);
      await assert.rejects(db.query("select * from public.claim_mississauga_deliveries(array['crm'],5)"), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('delete from public.mississauga_registrations');
    assert.equal((await db.query('select count(*)::int as count from public.mississauga_delivery_jobs')).rows[0].count, 0, 'deletion cascades to private receipt snapshots');
  } finally { await db.close(); }
});
