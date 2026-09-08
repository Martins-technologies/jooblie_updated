import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const commonOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export function createAnonDb() {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    commonOptions,
  );
}

export const publicDb = createAnonDb();

export const serviceDb = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  commonOptions,
);

export function createUserDb(accessToken) {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      ...commonOptions,
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}
