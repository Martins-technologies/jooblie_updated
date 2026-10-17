import { ApiError } from './http.js';

// Some existing databases create this row in a company INSERT trigger.
// A unique violation is safe only when the exact owner relationship exists.
export async function ensureCompanyOwnership(db, companyId, userId) {
  const { error } = await db.from('company_members').insert({
    company_id: companyId, user_id: userId, role: 'owner',
  });
  if (!error) return;
  if (error.code !== '23505') {
    throw new ApiError(400, 'Company ownership could not be created.', 'COMPANY_MEMBER_FAILED');
  }
  const { data: owner, error: lookupError } = await db.from('company_members')
    .select('company_id,user_id,role')
    .eq('company_id', companyId).eq('user_id', userId).eq('role', 'owner')
    .maybeSingle();
  if (lookupError) {
    // Do not delete a potentially valid company when verification is unavailable.
    throw new ApiError(503, 'Company ownership could not be confirmed. Refresh before trying again.', 'COMPANY_OWNER_CHECK_FAILED');
  }
  if (!owner || owner.company_id !== companyId || owner.user_id !== userId || owner.role !== 'owner') {
    throw new ApiError(409, 'Your account already has another company ownership or its membership needs administrator review.', 'COMPANY_OWNER_CONFLICT');
  }
}
