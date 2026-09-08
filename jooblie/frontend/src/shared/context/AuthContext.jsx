import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

export function dashboardPathForRole(role) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'recruiter') return '/dashboard/recruiter';
  return '/dashboard/job-seeker';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (nextSession = session) => {
    if (!nextSession) {
      setProfile(null);
      return null;
    }

    try {
      const result = await apiRequest('/auth/me', { auth: true, accessToken: nextSession.access_token });
      setProfile(result.profile || null);
      return result.profile || null;
    } catch {
      setProfile(null);
      return null;
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!supabase) {
        if (mounted) setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session || null);

      if (data.session) {
        try {
          const result = await apiRequest('/auth/me', { auth: true, accessToken: data.session.access_token });
          if (mounted) setProfile(result.profile || null);
        } catch {
          if (mounted) setProfile(null);
        }
      }

      if (mounted) setLoading(false);
    }

    bootstrap();

    const subscription = supabase?.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        try {
          const result = await apiRequest('/auth/me', { auth: true, accessToken: nextSession.access_token });
          setProfile(result.profile || null);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.data?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || null,
    loading,
    refreshProfile,
    signOut,
    dashboardPath: dashboardPathForRole(profile?.role),
  }), [session, profile, loading, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
