export function notificationPreferencesPayload(preferences) {
  return {
    email_new_applicant: preferences.email_new_applicant,
    email_daily_summary: preferences.email_daily_summary,
    email_marketing: preferences.email_marketing,
  };
}
