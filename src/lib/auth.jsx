import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Fetch profile from profiles table, auto-create if missing
  // Wrapped with a timeout to prevent indefinite hangs from RLS/DB issues
  const fetchProfile = async (userId) => {
    const timeoutMs = 8000;
    const profilePromise = (async () => {
      try {
        console.log('[auth] Fetching profile for', userId);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          // If profile doesn't exist (trigger may not have fired), create it
          if (error.code === 'PGRST116') {
            console.warn('[auth] Profile not found, creating one...');
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const email = authUser?.email || '';
            const displayName = authUser?.user_metadata?.display_name || email.split('@')[0];

            const { data: newProfile, error: insertErr } = await supabase
              .from('profiles')
              .insert({ id: userId, email, display_name: displayName })
              .select()
              .single();

            if (insertErr) {
              console.error('[auth] Failed to create profile:', insertErr);
              return null;
            }
            console.log('[auth] Profile created successfully');
            return newProfile;
          }
          console.error('[auth] Error fetching profile:', error);
          return null;
        }
        console.log('[auth] Profile fetched:', data?.email, 'superuser:', data?.is_superuser);
        return data;
      } catch (err) {
        console.error('[auth] fetchProfile exception:', err);
        return null;
      }
    })();

    // Race against a timeout to prevent infinite hangs
    const timeout = new Promise((resolve) => {
      setTimeout(() => {
        console.error(`[auth] fetchProfile timed out after ${timeoutMs}ms`);
        resolve(null);
      }, timeoutMs);
    });

    return Promise.race([profilePromise, timeout]);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Initialize auth state
    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (mountedRef.current) setProfile(p);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('initAuth error:', err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    initAuth();

    // Listen for subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION since initAuth handles it
      if (event === 'INITIAL_SESSION') return;

      if (!mountedRef.current) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        if (mountedRef.current) setProfile(p);
      } else {
        setProfile(null);
      }
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] }
      }
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  };

  const signInWithDiscord = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin
      }
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithDiscord,
    signOut,
    refreshProfile,
    isSuperuser: profile?.is_superuser ?? false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
