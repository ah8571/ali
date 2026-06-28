import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_STORAGE_KEY = 'emmaline_supabase_session';

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const storageAdapter = {
  getItem: async (key) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    await SecureStore.deleteItemAsync(key);
  }
};

const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: storageAdapter,
        storageKey: SUPABASE_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  : null;

let appStateSubscription = null;

const getClient = () => {
  if (!supabase) {
    throw new Error('Supabase auth is not configured. Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return supabase;
};

export const initializeSupabaseAuth = () => {
  const client = getClient();

  if (!appStateSubscription) {
    if (AppState.currentState === 'active') {
      client.auth.startAutoRefresh();
    }

    appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
  }

  return () => {
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }

    client.auth.stopAutoRefresh();
  };
};

export const getSupabaseClient = () => getClient();

export const getSession = async () => {
  const { data, error } = await getClient().auth.getSession();

  if (error) {
    throw error;
  }

  return data.session || null;
};

export const getAccessToken = async () => {
  const session = await getSession();
  return session?.access_token || null;
};

export const hasSession = async () => {
  return Boolean(await getSession());
};

export const signUpWithPassword = async ({ email, password }) => {
  const { data, error } = await getClient().auth.signUp({ email, password });

  if (error) {
    throw error;
  }

  if (data.session) {
    return data;
  }

  const loginResult = await signInWithPassword({ email, password });
  return loginResult;
};

export const signInWithPassword = async ({ email, password }) => {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data;
};

export const signInWithIdToken = async ({ provider, idToken }) => {
  const { data, error } = await getClient().auth.signInWithIdToken({
    provider,
    token: idToken
  });

  if (error) {
    throw error;
  }

  return data;
};

export const refreshSession = async () => {
  const { data, error } = await getClient().auth.refreshSession();

  if (error) {
    throw error;
  }

  return data.session || null;
};

export const signOut = async () => {
  const { error } = await getClient().auth.signOut();

  if (error) {
    throw error;
  }
};

export const onAuthStateChange = (callback) => {
  return getClient().auth.onAuthStateChange(callback);
};
