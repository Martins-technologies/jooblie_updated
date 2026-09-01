import { serviceDb } from '../config/supabase.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../utils/http.js';

export const siteContext = asyncHandler(async (req, _res, next) => {
  const raw = req.get('x-site-slug') || req.query.site || env.DEFAULT_SITE_SLUG;
  const slug = String(raw).trim().toLowerCase().slice(0, 80);

  const { data, error } = await serviceDb
    .from('sites')
    .select('id,slug,name,domain,site_type,sector_id,is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(404, 'This Jooblie site is not configured.', 'SITE_NOT_FOUND');
  }

  req.site = data;
  next();
});
