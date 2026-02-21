import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  // Track whether we've successfully loaded a profile to prevent overwrites
  const profileLoadedRef = useRef(false);

  // Fetch profile with timeout and retry
  const fetchProfileOnce = async (userId, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log('[auth] Fetching profile for', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal);

      clearTimeout(timer);

      if (error) {
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
      clearTimeout(timer);
      if (err.name === 'AbortError' || err.message?.includes('abort')) {
        console.warn(`[auth] fetchProfile timed out after ${timeoutMs}ms`);
      } else {
        console.error('[auth] fetchProfile exception:', err);
      }
      return null;
    }
  };

  // Fetch with retry: try once, if null retry after a short delay
  const fetchProfile = async (userId) => {
    let result = await fetchProfileOnce(userId, 5000);
    if (!result && mountedRef.current) {
      console.log('[auth] Retrying profile fetch...');
      await new Promise(r => setTimeout(r, 500));
      result = await fetchProfileOnce(userId, 5000);
    }
    return result;
  };

  useEffect(() => {
    mountedRef.current = true;
    profileLoadedRef.current = false;

    // Listen for auth changes — this is now the SOLE source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      console.log('[auth] onAuthStateChange:', event);

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        if (mountedRef.current) {
          setProfile(p);
          if (p) profileLoadedRef.current = true;
        }
      } else {
        setProfile(null);
        profileLoadedRef.current = false;
      }

      if (mountedRef.current) setLoading(false);
    });

    // Safety net: if onAuthStateChange hasn't resolved loading after 10s, force it
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('[auth] Safety timeout — forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
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
      profileLoadedRef.current = false;
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
