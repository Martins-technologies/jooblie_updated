import { randomUUID } from 'node:crypto';
import { createAnonDb, serviceDb } from '../config/supabase.js';
import { getNotificationPreferences, setNotificationPreferences } from '../utils/notificationPreferences.js';
import { logger } from '../config/logger.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { writeAuditLog, writeSecurityEvent } from '../utils/audit.js';
import { COMPANY_DOCUMENT_BUCKET, parseCompanyDocuments, uploadCompanyDocuments } from '../utils/companyDocuments.js';

const mainSignupRedirect = 'https://www.jooblie.com/sign-in';

function signUpFailure(error) {
  const raw = String(error?.message || error?.code || '').toLowerCase();
  const details = {
    supabaseCode: error?.code || null,
    supabaseMessage: error?.message || null,
    supabaseStatus: error?.status || null,
  };

  if (raw.includes('already registered') || raw.includes('already been registered') || raw.includes('user already exists')) {
    return new ApiError(409, 'An account with this email already exists. Please sign in.', 'EMAIL_ALREADY_REGISTERED', details);
  }
  if (raw.includes('signups not allowed') || raw.includes('signup is disabled')) {
    return new ApiError(403, 'New account registration is disabled in Supabase Auth.', 'SIGN_UP_DISABLED', details);
  }
  if (raw.includes('rate limit') || raw.includes('email rate')) {
    return new ApiError(429, 'Too many signup attempts. Please wait and try again.', 'SIGN_UP_RATE_LIMITED', details);
  }
  if (raw.includes('database error saving new user')) {
    return new ApiError(500, 'Registration could not be completed. Please try again or contact support.', 'SIGN_UP_DB_TRIGGER_FAILED', details);
  }
  if (raw.includes('error sending confirmation email') || raw.includes('error sending recovery email')) {
    return new ApiError(502, 'The confirmation email could not be sent. Please try again or contact support.', 'SIGN_UP_EMAIL_FAILED', details);
  }

  return new ApiError(400, 'The account could not be created.', 'SIGN_UP_FAILED', details);
}

// 🔥 CHANGE: experience aur education is list mein add kar diye hain
const profileSelect = 'id,role,status,email,full_name,phone,headline,location_province,location_city,skills,experience,education,default_resume_path,signup_site_id,recruiter_company_id';

export const signIn = asyncHandler(async (req, res) => {
  const authDb = createAnonDb();
  const { data, error } = await authDb.auth.signInWithPassword({
    email: req.body.email,
    password: req.body.password,
  });

  if (error || !data?.session) {
    if (error?.code === 'email_not_confirmed' || /^email not confirmed$/i.test(error?.message || '')) {
      throw new ApiError(403, 'Please confirm your email before signing in.', 'EMAIL_NOT_CONFIRMED');
    }
    await writeSecurityEvent(req, {
      eventType: 'sign_in_failed',
      severity: 'medium',
      metadata: { email: req.body.email },
    });
    throw new ApiError(401, 'Email or password is incorrect.', 'SIGN_IN_FAILED');
  }

  const { data: profile, error: profileError } = await serviceDb
    .from('profiles')
    .select('id,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await authDb.auth.signOut({ scope: 'local' }).catch(() => null);
    throw new ApiError(503, 'Your profile could not be loaded. Please try again.', 'PROFILE_LOAD_FAILED');
  }

  if (profile.status !== 'active') {
    await authDb.auth.signOut().catch(() => null);
    req.user = data.user;
    await writeSecurityEvent(req, {
      eventType: 'inactive_account_sign_in',
      severity: 'medium',
      metadata: { profileStatus: profile.status },
    });
    throw new ApiError(403, 'Your account is not active.', 'ACCOUNT_INACTIVE');
  }

  req.user = data.user;
  await writeAuditLog(req, {
    action: 'auth.sign_in',
    entityType: 'profile',
    entityId: data.user.id,
  });

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
    },
  });
});

export const signUp = asyncHandler(async (req, res) => {
  const signupSiteId = req.site?.id;
  if (!signupSiteId) {
    throw new ApiError(400, 'Signup site is not configured.', 'SIGNUP_SITE_REQUIRED');
  }
  const isSeeker = req.body.role === 'job_seeker';
  const isMainSite = req.site.slug === 'jooblie';
  if (isMainSite && isSeeker && req.body.terms_accepted !== true) {
    throw new ApiError(400, 'Please agree to the Terms and acknowledge the Privacy Policy.', 'TERMS_ACCEPTANCE_REQUIRED');
  }

  const companyName = isSeeker ? null : req.body.company_name.trim();
  const companyTaken = async () => {
    if (!companyName) return false;
    const { data, error } = await serviceDb.from('companies').select('id')
      .is('deleted_at', null).ilike('name', companyName.replace(/[\\%_]/g, '\\$&'))
      .limit(1).maybeSingle();
    if (error) throw new ApiError(503, 'Company availability could not be checked. Please try again.', 'COMPANY_AVAILABILITY_CHECK_FAILED');
    return Boolean(data);
  };
  const duplicateCompany = () => new ApiError(409, 'That company name is already registered. Please use the existing company or choose a different name.', 'COMPANY_NAME_TAKEN');
  if (await companyTaken()) throw duplicateCompany();

  const attemptId = randomUUID();
  const documents = isSeeker ? [] : parseCompanyDocuments(req.body, attemptId, isMainSite);

  const bucket = documents.length ? serviceDb.storage.from(COMPANY_DOCUMENT_BUCKET) : null;
  const removeUploadedDocuments = async () => {
    if (!bucket) return;
    const { error } = await bucket.remove(documents.map(({ path }) => path)).catch(() => ({ error: true }));
    if (error) logger.warn({ requestId: req.requestId }, 'Signup document cleanup failed');
  };
  if (bucket) {
    try {
      await uploadCompanyDocuments(bucket, documents);
    } catch (error) {
      await removeUploadedDocuments();
      throw error;
    }
  }

  const { error: prepareError } = await serviceDb.rpc('prepare_jooblie_signup', {
    p_id: attemptId,
    p_site_id: signupSiteId,
    p_payload: {
      email: req.body.email,
      name: req.body.name,
      role: req.body.role,
      company_name: companyName,
      company_website: req.body.company_website,
      company_registration_number: req.body.company_registration_number,
      business_document_path: documents[0]?.path,
      address_document_path: documents[1]?.path,
      terms_accepted: isSeeker && req.body.terms_accepted === true,
      terms_version: '2026-10-30',
      consent_copy: 'I have read and agree to Jooblie’s Terms and Conditions and acknowledge the Privacy Policy. I understand that Jooblie does not charge job seekers for recruitment or employer introductions and does not guarantee employment, interviews, work permits, LMIAs or permanent residence.',
    },
  });
  if (prepareError) {
    await removeUploadedDocuments();
    logger.warn({ requestId: req.requestId, code: prepareError.code }, 'Signup preparation failed');
    throw new ApiError(503, 'Registration is temporarily unavailable. Please try again.', 'SIGN_UP_PREPARATION_FAILED');
  }

  const authDb = createAnonDb();
  const { data, error } = await authDb.auth.signUp({
    email: req.body.email,
    password: req.body.password,
    options: {
      data: { jooblie_signup_intent: attemptId },
      ...(isMainSite && { emailRedirectTo: mainSignupRedirect }),
    },
  });
  if (error || !data?.user) {
    if ((error?.status >= 400 && error.status < 500) || error?.message?.includes('Database error saving new user')) {
      await removeUploadedDocuments();
    }
    // A competing registration may have claimed the company after the preflight.
    if (error?.code === 'unexpected_failure' && companyName && await companyTaken()) throw duplicateCompany();
    logger.warn({ requestId: req.requestId, code: error?.code }, 'Supabase sign-up failed');
    throw signUpFailure(error || { message: 'Supabase did not return a user.' });
  }
  if (data.user.identities?.length === 0 || data.user.user_metadata?.jooblie_signup_intent !== attemptId) {
    await removeUploadedDocuments();
    throw new ApiError(409, 'An account with this email already exists. Please sign in.', 'EMAIL_ALREADY_REGISTERED');
  }

  // The Auth trigger commits the profile and company together with the new user.
  const { data: profile, error: profileError } = await serviceDb.from('profiles')
    .select('id,recruiter_company_id').eq('id', data.user.id).maybeSingle();
  if (profileError || !profile || (!isSeeker && !profile.recruiter_company_id)) {
    throw new ApiError(503, 'Your account could not be confirmed. Please try signing in or contact support.', 'PROFILE_BOOTSTRAP_FAILED');
  }
  const companyId = profile.recruiter_company_id;
  req.user = data.user;
  await writeAuditLog(req, {
    action: 'auth.sign_up',
    entityType: 'profile',
    entityId: data.user.id,
    metadata: { role: req.body.role, signup_site: req.site.slug, recruiter_company_id: companyId },
  });

  res.status(201).json({
    user: { id: data.user.id, email: data.user.email },
    company: companyId ? { id: companyId, name: companyName } : null,
    session: data.session
      ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at, token_type: data.session.token_type }
      : null,
    confirmationRequired: !data.session,
  });
});

export const notificationPreferences = asyncHandler(async (req, res) => {
  res.json(await getNotificationPreferences(serviceDb, req.user.id));
});

export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  res.json(await setNotificationPreferences(serviceDb, req.user.id, req.body));
});

export const me = asyncHandler(async (req, res) => {
  const { data: profile, error } = await serviceDb
    .from('profiles')
    .select(profileSelect)
    .eq('id', req.user.id)
    .single();

  if (error) throw new ApiError(500, 'Your profile could not be loaded.', 'PROFILE_LOAD_FAILED');

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      createdAt: req.user.created_at,
    },
    profile,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  // Prevent any privilege escalation or immutable field modification
  const { role, status, id, email, recruiter_company_id, ...updates } = req.body;

  const { data, error } = await req.db
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select(profileSelect)
    .single();

  if (error) {
    console.error("🔥 SUPABASE PROFILE UPDATE ERROR:", error);
    throw new ApiError(400, 'Your profile could not be updated.', 'PROFILE_UPDATE_FAILED', error.message);
  }

  await writeAuditLog(req, {
    action: 'profile.update',
    entityType: 'profile',
    entityId: req.user.id,
  });

  res.json({ profile: data });
});

