import { createAnonDb, serviceDb } from '../config/supabase.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { writeAuditLog, writeSecurityEvent } from '../utils/audit.js';

// 🔥 CHANGE: experience aur education is list mein add kar diye hain
const profileSelect = 'id,role,status,email,full_name,phone,headline,location_province,location_city,skills,experience,education,default_resume_path,signup_site_id,recruiter_company_id';

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

  if (req.body.role === 'recruiter') {
    const companyName = req.body.company_name.trim();
    const { data: conflictingCompany, error: companyLookupError } = await serviceDb
      .from('companies')
      .select('id,name')
      .is('deleted_at', null)
      .ilike('name', companyName)
      .limit(1)
      .maybeSingle();

    if (companyLookupError) {
      throw new ApiError(500, 'Company availability could not be checked.', 'COMPANY_AVAILABILITY_CHECK_FAILED');
    }

    if (conflictingCompany) {
      await writeSecurityEvent(req, {
        eventType: 'recruiter_company_name_conflict',
        severity: 'low',
        metadata: { companyNameLength: companyName.length },
      });
      throw new ApiError(409, 'That company name is already registered. Please use the existing company or choose a different name.', 'COMPANY_NAME_TAKEN');
    }
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
        company_name: req.body.company_name || null,
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

  const userId = data.user.id;
  let companyId = null;

  try {
    const { data: existingProfile, error: profileLookupError } = await serviceDb
      .from('profiles')
      .select('id,recruiter_company_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileLookupError) {
      throw new ApiError(500, 'Your account profile could not be initialized.', 'PROFILE_LOOKUP_FAILED');
    }

    if (req.body.role === 'recruiter') {
      const { data: existingCompany } = await serviceDb
        .from('company_members')
        .select('company_id')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .maybeSingle();

      companyId = existingCompany?.company_id || existingProfile?.recruiter_company_id || null;

      if (!companyId) {
        const { data: company, error: companyError } = await serviceDb
          .from('companies')
          .insert({
            name: req.body.company_name.trim(),
            website: req.body.company_website,
            registration_number: req.body.company_registration_number?.trim(),
            created_by: userId,
          })
          .select('id')
          .single();

        if (companyError || !company) {
          console.error("🔥 SUPABASE COMPANY CREATION ERROR:", companyError);
          await writeSecurityEvent(req, {
            eventType: 'recruiter_company_bootstrap_failed',
            severity: 'medium',
            metadata: {
              reason: companyError?.code || 'COMPANY_INSERT_FAILED',
              companyNameLength: req.body.company_name?.trim()?.length || 0,
            },
          });

          if (companyError?.code === '23505' || String(companyError?.message || '').includes('companies_lower_name_live_idx')) {
            throw new ApiError(409, 'That company name is already registered. Please use the existing company or choose a different name.', 'COMPANY_NAME_TAKEN');
          }

          throw new ApiError(400, 'The recruiter account was created, but the company could not be created.', 'COMPANY_BOOTSTRAP_FAILED', companyError?.message);
        }

        companyId = company.id;

        const { error: memberError } = await serviceDb
          .from('company_members')
          .insert({ company_id: companyId, user_id: userId, role: 'owner' });

        // 🔥 FIX: Agar database ne trigger ke zariye pehle hi member bana diya hai (code '23505'), to usay ignore karo
        if (memberError && memberError.code !== '23505') {
          console.error("🔥 SUPABASE MEMBER ERROR:", memberError);
          throw new ApiError(500, 'Company ownership could not be initialized.', 'COMPANY_MEMBER_BOOTSTRAP_FAILED', memberError.message);
        }
      }
    }

    const profilePayload = {
      id: userId,
      role: req.body.role,
      status: 'active',
      email: req.body.email,
      full_name: req.body.name,
      signup_site_id: signupSiteId,
      ...(companyId ? { recruiter_company_id: companyId } : {}),
    };

    if (existingProfile) {
      const { error: profileUpdateError } = await serviceDb
        .from('profiles')
        .update({
          role: profilePayload.role,
          status: profilePayload.status,
          email: profilePayload.email,
          full_name: profilePayload.full_name,
          signup_site_id: profilePayload.signup_site_id,
          ...(companyId ? { recruiter_company_id: companyId } : {}),
        })
        .eq('id', userId);
      if (profileUpdateError) throw new ApiError(500, 'Your account profile could not be initialized.', 'PROFILE_BOOTSTRAP_FAILED');
    } else {
      const { error: profileInsertError } = await serviceDb.from('profiles').insert(profilePayload);
      if (profileInsertError && profileInsertError.code !== '23505') {
        console.error("🔥 SUPABASE PROFILE INSERT ERROR:", profileInsertError);
        throw new ApiError(500, 'Your account profile could not be initialized.', 'PROFILE_BOOTSTRAP_FAILED');
      }
    }
  } catch (bootstrapError) {
    // Safely rolling back if anything fails
    if (companyId) {
      try {
        await serviceDb.from('company_members').delete().eq('company_id', companyId).eq('user_id', userId);
        await serviceDb.from('companies').delete().eq('id', companyId);
      } catch (cleanupError) {
        console.error("Rollback cleanup failed:", cleanupError);
      }
    }
    throw bootstrapError;
  }

  req.user = data.user;
  await writeAuditLog(req, {
    action: 'auth.sign_up',
    entityType: 'profile',
    entityId: userId,
    metadata: { role: req.body.role, signup_site: req.site.slug, recruiter_company_id: companyId },
  });

  res.status(201).json({
    user: { id: userId, email: data.user.email },
    company: companyId ? { id: companyId, name: req.body.company_name } : null,
    session: data.session
      ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at, token_type: data.session.token_type }
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