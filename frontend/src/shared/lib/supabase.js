import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isBackendConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// The signup link confirms the email at Supabase before redirecting here.
// Discard the session in that redirect so the user signs in with their password.
if (typeof window !== 'undefined' && ['jooblie.com', 'www.jooblie.com'].includes(window.location.hostname)) {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (fragment.get('type') === 'signup' && fragment.has('access_token')) {
    window.history.replaceState(window.history.state, '', '/sign-in');
  }
}

export const supabase = isBackendConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function createPasswordVerificationClient() {
  if (!isBackendConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `password-verification-${crypto.randomUUID()}`,
    },
  });
}
