import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  user_id: string;
  telefone: string;
  nome: string | null;
  cpf: string | null;
  email: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileLoaded: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, profile: null, profileLoaded: false, loading: true,
  refreshProfile: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); setProfileLoaded(true); return; }
    const { data } = await supabase
      .from('profiles')
      .select('user_id, telefone, nome, cpf, email')
      .eq('user_id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      // adia para evitar deadlock no callback
      setTimeout(() => { loadProfile(s?.user?.id); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      loadProfile(data.session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        profileLoaded,
        loading,
        refreshProfile: async () => { await loadProfile(session?.user?.id); },
        signOut: async () => { await supabase.auth.signOut(); setProfile(null); setProfileLoaded(false); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() { return useContext(Ctx); }
