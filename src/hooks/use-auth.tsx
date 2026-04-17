import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'learner';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth() {
  const isMountedRef = useRef(true);
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });

  const fetchRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Failed to load role', error.message);
    }

    return (data?.role as AppRole) ?? 'learner';
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const applySession = async (session: Session | null) => {
      if (!isMountedRef.current) return;

      if (!session?.user) {
        setState({ user: null, session: null, role: null, loading: false });
        return;
      }

      const role = await fetchRole(session.user.id);

      if (!isMountedRef.current) return;

      setState({ user: session.user, session, role, loading: false });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session);
      }
    );

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session);
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signIn, signUp, signOut, isAdmin: state.role === 'admin' };
}
