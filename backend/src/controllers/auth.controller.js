import { createAnonDb, serviceDb } from '../config/supabase.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { writeAuditLog, writeSecurityEvent } from '../utils/audit.js';

const profileSelect = 'id,role,status,email,full_name,phone,headline,location_province,location_city,skills,default_resume_path,signup_site_id';

export const signIn = asyncHandler(async (req, res) => {
  const authDb = createAnonDb();
  const { data, error } = await authDb.auth.signInWithPassword({
    email: req.body.email,
    password: req.body.password,
  });

  if (error || !data?.session) {
    await writeSecurityEvent(req, {
      eventType: 'sign_in_failed',
      severity: 'medium',
      metadata: { email: req.body.email },
    });
    throw new ApiError(401, 'Email or password is incorrect.', 'SIGN_IN_FAILED');
  }

  const { data: profile } = await serviceDb
    .from('profiles')
    .select('id,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile && profile.status !== 'active') {
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
  const authDb = createAnonDb();
  const signupSiteId = req.site?.id;

  if (!signupSiteId) {
    throw new ApiError(400, 'Signup site is not configured.', 'SIGNUP_SITE_REQUIRED');
  }

  const { data, error } = await authDb.auth.signUp({
    email: req.body.email,
    password: req.body.password,
    options: {
      data: {
        name: req.body.name,
        full_name: req.body.name,
        role: req.body.role,
        signup_site_id: signupSiteId,
        signup_site_slug: req.site.slug,
      },
    },
  });

  if (error || !data?.user) {
    await writeSecurityEvent(req, {
      eventType: 'sign_up_failed',
      severity: 'low',
      metadata: { email: req.body.email },
    });
    throw new ApiError(400, 'The account could not be created.', 'SIGN_UP_FAILED');
  }

  // Existing Supabase projects normally create this row with their auth.users trigger.
  // The fallback keeps this API compatible with projects where that trigger is absent.
  const { data: existingProfile } = await serviceDb
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await serviceDb.from('profiles').insert({
      id: data.user.id,
      role: req.body.role,
      status: 'active',
      email: req.body.email,
      full_name: req.body.name,
      signup_site_id: signupSiteId,
    });

    // If the auth.users profile trigger wins the race, a duplicate-key error is harmless.
    if (profileError && profileError.code !== '23505') {
      await writeSecurityEvent(req, {
        eventType: 'profile_bootstrap_failed',
        severity: 'high',
        metadata: { profileError: profileError.message },
      });
      throw new ApiError(500, 'Your account was created but the profile could not be initialized.', 'PROFILE_BOOTSTRAP_FAILED');
    }
  }

  req.user = data.user;
  await writeAuditLog(req, {
    action: 'auth.sign_up',
    entityType: 'profile',
    entityId: data.user.id,
    metadata: { role: req.body.role, signup_site: req.site.slug },
  });

  res.status(201).json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          token_type: data.session.token_type,
        }
      : null,
    confirmationRequired: !data.session,
  });
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
  const updates = { ...req.body };

  const { data, error } = await req.db
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select(profileSelect)
    .single();

  if (error) throw new ApiError(400, 'Your profile could not be updated.', 'PROFILE_UPDATE_FAILED');

  await writeAuditLog(req, {
    action: 'profile.update',
    entityType: 'profile',
    entityId: req.user.id,
  });

  res.json({ profile: data });
});
