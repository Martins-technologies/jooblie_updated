import { serviceDb } from '../config/supabase.js';
import { adminQuery, pageInfo } from '../utils/adminQuery.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { logger } from '../config/logger.js';

export async function notifyAdminsOfMississaugaRegistration(db, registrationId, siteId) {
  const { data: admins, error: adminError } = await db.from('profiles')
    .select('id').eq('role', 'admin').eq('status', 'active');
  if (adminError) {
    logger.warn({ code: adminError.code || 'ADMIN_LOOKUP_FAILED' }, 'Mississauga registration admin notification lookup failed');
    return;
  }

  const now = new Date().toISOString();
  const notifications = (admins || []).filter(admin => admin.id).map(admin => ({
    user_id: admin.id,
    type: 'mississauga_registration',
    entity_type: 'registration',
    entity_id: registrationId,
    site_id: siteId || null,
    data: {
      title: 'New Mississauga registration',
      message: 'A job seeker submitted the Mississauga landing page form. Open registrations to review the lead.',
    },
    created_at: now,
  }));
  if (!notifications.length) return;

  const { error } = await db.from('notifications').insert(notifications);
  if (error) logger.warn({ code: error.code || 'NOTIFICATION_INSERT_FAILED' }, 'Mississauga registration admin notification insert failed');
}

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
  const now = new Date().toISOString();
  const employerSharing = form.employer_sharing_consent === true;
  const marketing = form.marketing_consent === true;
  const payload = {
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
  };
  const { data: result, error } = await serviceDb.rpc('upsert_mississauga_registration', { p_payload: payload });
  const data = Array.isArray(result) ? result[0] : result;
  if (error || !data?.registration_id) {
    logger.error({ code: error?.code || 'REGISTRATION_UPSERT_FAILED' }, 'Mississauga registration save failed');
    throw new ApiError(503, 'Registration is temporarily unavailable. Please try again.', 'REGISTRATION_UNAVAILABLE');
  }
  const duplicate = data.duplicate === true;

  // Only notify for the first record; an existing lead's repeat submission
  // updates that record without creating another alert or queue entry.
  if (!duplicate) {
    try {
      await notifyAdminsOfMississaugaRegistration(serviceDb, data.registration_id, req.site.id);
    } catch (notificationError) {
      logger.warn({ code: notificationError?.code || 'NOTIFICATION_FAILED' }, 'Mississauga registration admin notification failed');
    }
  }

  res.status(201).json({ accepted: true, record_id: data.registration_id, duplicate });
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
