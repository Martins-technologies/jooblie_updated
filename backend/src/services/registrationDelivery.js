import { createHash } from 'node:crypto';

export function registrationReceipt(firstName) {
  const name = String(firstName || 'there').replace(/[\r\n]/g, '').slice(0, 120);
  return {
    subject: 'Your Jooblie Registration Has Been Received',
    text: `Hi ${name},\n\nThank you for registering with Jooblie!\n\nWe’ve received your job seeker registration for our Mississauga location. Our recruitment team will review the details you submitted and contact you about the next steps.\n\nJooblie’s recruitment and job-placement assistance is completely free for job seekers. There are no recruitment fees.\n\nPlease keep an eye on your email and phone for communication from our team.\n\nThank you,\nThe Jooblie Team\njooblie.com\n\nEmployment opportunities depend on availability, employer requirements and individual eligibility. Job placement and immigration outcomes are not guaranteed.`,
  };
}

function httpsEndpoint(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function deliveryConfiguration(env) {
  const crm = env.MISSISSAUGA_CRM_ENABLED === 'true' && httpsEndpoint(env.MISSISSAUGA_CRM_WEBHOOK_URL) && env.MISSISSAUGA_CRM_WEBHOOK_TOKEN;
  const receipt = env.MISSISSAUGA_RECEIPT_ENABLED === 'true' && env.RESEND_API_KEY && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.MISSISSAUGA_FROM_EMAIL || '');
  return [crm ? 'crm' : null, receipt ? 'receipt' : null].filter(Boolean);
}

export async function runRegistrationDeliveries({ db, env = process.env, fetcher = fetch, now = Date.now, limit = 5 }) {
  const kinds = deliveryConfiguration(env);
  const summary = { configured: kinds, claimed: 0, delivered: 0, failed: 0 };
  if (!kinds.length) return summary;
  const { data: jobs, error } = await db.rpc('claim_mississauga_deliveries', { p_kinds: kinds, p_limit: limit });
  if (error) throw new Error('DELIVERY_QUEUE_UNAVAILABLE');
  for (const job of jobs || []) {
    summary.claimed++;
    let success = false, code = 'DELIVERY_FAILED', providerId = null;
    try {
      let url, headers, body;
      const idempotencyKey = `mississauga/${job.kind}/${job.id}`;
      if (job.kind === 'receipt') {
        // Resend keeps keys for 24 hours. Ambiguous sends outside that window
        // require reconciliation instead of risking another receipt.
        if (now() - Date.parse(job.first_attempt_at) >= 23 * 60 * 60 * 1000) throw new Error('RECEIPT_REVIEW_REQUIRED');
        const message = registrationReceipt(job.payload.first_name);
        url = 'https://api.resend.com/emails';
        headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Idempotency-Key': idempotencyKey };
        body = { from: env.MISSISSAUGA_FROM_EMAIL, to: [job.payload.email], ...message,
          html: `<span style="display:none">Thank you for registering with Jooblie Mississauga.</span><div style="white-space:pre-wrap">${message.text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c])}</div>` };
      } else {
        const { data: lead, error: leadError } = await db.from('mississauga_registrations').select('*').eq('id', job.registration_id).single();
        if (leadError || !lead) throw new Error('REGISTRATION_LOOKUP_FAILED');
        url = httpsEndpoint(env.MISSISSAUGA_CRM_WEBHOOK_URL);
        headers = { Authorization: `Bearer ${env.MISSISSAUGA_CRM_WEBHOOK_TOKEN}`, 'Idempotency-Key': idempotencyKey };
        const { id, full_name, email, phone_e164, current_city, employment_goal, preferred_industry, privacy_acknowledged, privacy_acknowledged_at, employer_sharing_consent, employer_sharing_consent_at, marketing_consent, marketing_consent_at, consent_version, source_context, created_at, updated_at } = lead;
        body = { schema_version: 1, delivery_id: job.id, event_id: createHash('sha256').update(`mississauga-registration:${id}`).digest('hex'),
          tags: ['Mississauga Launch', 'Job Seeker'],
          routing: { pipeline_id: env.MISSISSAUGA_CRM_PIPELINE_ID || null, stage_id: env.MISSISSAUGA_CRM_STAGE_ID || null, owner_id: env.MISSISSAUGA_CRM_OWNER_ID || null },
          registration: { id, full_name, email, phone_e164, current_city, employment_goal, preferred_industry, privacy_acknowledged, privacy_acknowledged_at, employer_sharing_consent, employer_sharing_consent_at, marketing_consent, marketing_consent_at, consent_version, source_context, created_at, updated_at } };
      }
      const response = await fetcher(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const receipt = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('PROVIDER_REJECTED');
      if (job.kind === 'crm' ? receipt.accepted !== true || typeof receipt.record_id !== 'string' || !receipt.record_id.trim() : typeof receipt.id !== 'string' || !receipt.id.trim()) throw new Error('PROVIDER_RECEIPT_INVALID');
      success = true; providerId = job.kind === 'crm' ? receipt.record_id : receipt.id;
    } catch (error) {
      const allowed = ['RECEIPT_REVIEW_REQUIRED', 'REGISTRATION_LOOKUP_FAILED', 'PROVIDER_REJECTED', 'PROVIDER_RECEIPT_INVALID'];
      code = allowed.includes(error.message) ? error.message : 'DELIVERY_FAILED';
    }
    const { data: finished, error: finishError } = await db.rpc('finish_mississauga_delivery', { p_id: job.id, p_token: job.lock_token, p_success: success, p_code: success ? null : code, p_provider_id: providerId });
    if (finishError || finished !== true) throw new Error('DELIVERY_ACKNOWLEDGMENT_FAILED');
    summary[success ? 'delivered' : 'failed']++;
  }
  return summary;
}
