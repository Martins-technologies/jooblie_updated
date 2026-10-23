-- Add the in-app notification category used for Mississauga landing-page leads.
-- Keep the existing enum values and all existing notification rows unchanged.
alter type public.notification_type
  add value if not exists 'mississauga_registration';
