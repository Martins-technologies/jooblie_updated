import { ApiError } from './http.js';

export const defaultNotificationPreferences = Object.freeze({
  email_new_applicant: true,
  email_daily_summary: false,
  email_marketing: false,
});
const columns = 'email_new_applicant,email_daily_summary,email_marketing,updated_at';

export async function getNotificationPreferences(db, userId) {
  const { data, error } = await db.from('notification_preferences')
    .select(columns).eq('user_id', userId).maybeSingle();
  if (error) throw new ApiError(503, 'Email preferences are temporarily unavailable.', 'PREFERENCES_LOAD_FAILED');
  return { preferences: data || { ...defaultNotificationPreferences, updated_at: null } };
}

export async function setNotificationPreferences(db, userId, preferences) {
  const payload = Object.fromEntries(Object.keys(defaultNotificationPreferences)
    .map((key) => [key, preferences[key]]));
  const { data, error } = await db.from('notification_preferences')
    .upsert({ ...payload, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select(columns).single();
  if (error) throw new ApiError(503, 'Email preferences could not be saved.', 'PREFERENCES_SAVE_FAILED');
  return { preferences: data };
}
