import { serviceDb } from '../config/supabase.js';
import { adminQuery, pageInfo } from '../utils/adminQuery.js';
import { ApiError, asyncHandler } from '../utils/http.js';

function safeReferrer(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return `${url.origin}${url.pathname}`.slice(0, 1000);
  } catch {
    return null;
  }
}

export const createMississaugaRegistration = asyncHandler(async (req, res) => {
  if (req.site?.slug !== 'jooblie') throw new ApiError(404, 'This registration page is unavailable.', 'SITE_NOT_FOUND');
  const form = req.body;
  const { data: prior, error: lookupError } = await serviceDb
    .from('mississauga_registrations')
    .select('id')
    .eq('email', form.email)
    .eq('phone_e164', form.phone_e164)
    .limit(1);
  if (lookupError) throw new ApiError(503, 'Registration is temporarily unavailable. Please try again.', 'REGISTRATION_UNAVAILABLE');

  const now = new Date().toISOString();
  const employerSharing = form.employer_sharing_consent === true;
  const marketing = form.marketing_consent === true;
  const { data, error } = await serviceDb.from('mississauga_registrations').insert({
    full_name: form.full_name,
    email: form.email,
    phone_e164: form.phone_e164,
    current_city: form.current_city,
    employment_goal: form.employment_goal,
    preferred_industry: form.preferred_industry || null,
    privacy_acknowledged: true,
    privacy_acknowledged_at: now,
    employer_sharing_consent: employerSharing,
    employer_sharing_consent_at: employerSharing ? now : null,
    marketing_consent: marketing,
    marketing_consent_at: marketing ? now : null,
    consent_version: 'mississauga-registration-v1',
    source_context: {
      ...form.source_context,
      referrer: safeReferrer(form.source_context?.referrer),
      page_path: form.source_context?.page_path || '/mississauga/register',
    },
  }).select('id').single();
  if (error || !data?.id) throw new ApiError(503, 'Registration is temporarily unavailable. Please try again.', 'REGISTRATION_UNAVAILABLE');

  res.status(201).json({ accepted: true, record_id: data.id, duplicate: Boolean(prior?.length) });
});

export const listMississaugaRegistrations = asyncHandler(async (req, res) => {
  const { page, limit, from, to, search, sort, ascending } = adminQuery(
    req.query,
    ['full_name', 'email', 'current_city', 'status', 'created_at'],
    'created_at',
  );
  let query = serviceDb
    .from('mississauga_registrations')
    .select('id,full_name,email,phone_e164,current_city,employment_goal,preferred_industry,privacy_acknowledged,privacy_acknowledged_at,employer_sharing_consent,employer_sharing_consent_at,marketing_consent,marketing_consent_at,consent_version,source_context,status,assigned_to,created_at,updated_at,assignee:profiles!mississauga_registrations_assigned_to_fkey(id,full_name,email)', { count: 'exact' })
    .order(sort, { ascending })
    .order('id');
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,current_city.ilike.%${search}%`);
  if (req.query.status && req.query.status !== 'all') query = query.eq('status', String(req.query.status).slice(0, 30));
  const { data, error, count } = await query.range(from, to);
  if (error) throw new ApiError(500, 'Registrations could not be loaded.', 'REGISTRATIONS_FAILED');
  res.json({ items: data || [], pagination: pageInfo(page, limit, count) });
});

export const updateMississaugaRegistration = asyncHandler(async (req, res) => {
  const { registrationId } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(registrationId)) throw new ApiError(404, 'Registration not found.', 'REGISTRATION_NOT_FOUND');
  if (req.body.assigned_to) {
    const { data: owner, error: ownerError } = await serviceDb
      .from('profiles').select('id').eq('id', req.body.assigned_to).eq('role', 'admin').eq('status', 'active').maybeSingle();
    if (ownerError || !owner) throw new ApiError(400, 'Choose an active Jooblie administrator.', 'INVALID_REGISTRATION_OWNER');
  }
  const { data, error } = await serviceDb
    .from('mississauga_registrations')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', registrationId)
    .select('id,status,assigned_to,updated_at')
    .maybeSingle();
  if (error) throw new ApiError(500, 'Registration could not be updated.', 'REGISTRATION_UPDATE_FAILED');
  if (!data) throw new ApiError(404, 'Registration not found.', 'REGISTRATION_NOT_FOUND');
  res.json({ registration: data });
});

export const listRegistrationOwners = asyncHandler(async (_req, res) => {
  const { data, error } = await serviceDb.from('profiles')
    .select('id,full_name,email').eq('role', 'admin').eq('status', 'active').order('full_name').limit(100);
  if (error) throw new ApiError(500, 'Registration owners could not be loaded.', 'REGISTRATION_OWNERS_FAILED');
  res.json({ items: data || [] });
});
