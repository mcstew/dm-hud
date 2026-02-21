import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Direct fetch to PostgREST with a hard timeout via AbortController
// accessToken is passed in directly to avoid re-calling getSession()
async function fetchProfileDirect(userId, accessToken, timeoutMs = 4000) {
  if (!accessToken) {
    console.warn('[auth] No access token for profile fetch');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.warn(`[auth] Profile fetch aborted after ${timeoutMs}ms`);
    controller.abort();
  }, timeoutMs);

  try {
    console.log('[auth] Fetching profile for', userId);
    const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.pgrst.object+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      console.error('[auth] Profile fetch HTTP error:', res.status, text);
      return null;
    }

    const data = await res.json();
    console.log('[auth] Profile fetched:', data?.email, 'superuser:', data?.is_superuser);
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn(`[auth] Profile fetch timed out after ${timeoutMs}ms`);
    } else {
      console.error('[auth] Profile fetch error:', err);
    }
    return null;
  }
}

// Auto-create profile if it doesn't exist
async function createProfile(userId) {
  try {
    console.log('[auth] Creating profile for', userId);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const email = authUser?.email || '';
    const displayName = authUser?.user_metadata?.display_name || email.split('@')[0];

    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId, email, display_name: displayName })
      .select()
      .single();

    if (error) {
      console.error('[auth] Failed to create profile:', error);
      return null;
    }
    console.log('[auth] Profile created successfully');
    return data;
  } catch (err) {
    console.error('[auth] createProfile exception:', err);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Fetch profile with retry — pass accessToken directly
  const fetchProfile = async (userId, accessToken) => {
    const attempts = [4000, 4000, 6000];
    for (let i = 0; i < attempts.length; i++) {
      if (!mountedRef.current) return null;
      if (i > 0) {
        console.log(`[auth] Retry ${i}/${attempts.length - 1}...`);
        await new Promise(r => setTimeout(r, 500));
      }
      const result = await fetchProfileDirect(userId, accessToken, attempts[i]);
      if (result) return result;
    }
    console.error('[auth] All profile fetch attempts failed');
    return null;
  };

  useEffect(() => {
    mountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      console.log('[auth] onAuthStateChange:', event);

      const currentUser = session?.user ?? null;
      const accessToken = session?.access_token ?? null;
      setUser(currentUser);

      if (currentUser && accessToken) {
        let p = await fetchProfile(currentUser.id, accessToken);
        if (!p && mountedRef.current) {
          p = await createProfile(currentUser.id);
        }
        if (mountedRef.current) setProfile(p);
      } else {
        setProfile(null);
      }

      if (mountedRef.current) setLoading(false);
    });

    // Safety: if loading hasn't resolved after 15s, force it
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('[auth] Safety timeout — forcing loading to false');
        setLoading(false);
      }
    }, 15000);

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
    }
    return { error };
  };

  const refreshProfile = async () => {
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      const p = await fetchProfile(user.id, session?.access_token);
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
