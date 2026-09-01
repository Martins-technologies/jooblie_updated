import { createUserDb, serviceDb } from '../config/supabase.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { writeSecurityEvent } from '../utils/audit.js';

const profileSelect = 'id,role,status,email,full_name,phone,headline,location_province,location_city,skills,default_resume_path,signup_site_id';

function bearerToken(req) {
  const header = req.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim();
}

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) return next();

  const { data, error } = await serviceDb.auth.getUser(token);

  if (!error && data?.user) {
    req.accessToken = token;
    req.user = data.user;
    req.db = createUserDb(token);

    const { data: profile } = await serviceDb
      .from('profiles')
      .select(profileSelect)
      .eq('id', data.user.id)
      .maybeSingle();

    req.profile = profile || null;
  }

  next();
});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);

  if (!token) {
    await writeSecurityEvent(req, {
      eventType: 'missing_auth_token',
      severity: 'low',
    });
    throw new ApiError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  }

  const { data, error } = await serviceDb.auth.getUser(token);

  if (error || !data?.user) {
    await writeSecurityEvent(req, {
      eventType: 'invalid_auth_token',
      severity: 'medium',
    });
    throw new ApiError(401, 'Your session is invalid or expired.', 'INVALID_SESSION');
  }

  req.accessToken = token;
  req.user = data.user;
  req.db = createUserDb(token);

  const { data: profile, error: profileError } = await serviceDb
    .from('profiles')
    .select(profileSelect)
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new ApiError(403, 'Your account profile is not ready.', 'PROFILE_MISSING');
  }

  if (profile.status !== 'active') {
    await writeSecurityEvent(req, {
      eventType: 'inactive_account_access',
      severity: 'medium',
      metadata: { profileStatus: profile.status },
    });
    throw new ApiError(403, 'Your account is not active.', 'ACCOUNT_INACTIVE');
  }

  req.profile = profile;
  next();
});

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource.', 'FORBIDDEN'));
    }
    return next();
  };
}
