import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase project credentials (production default with env override support)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ymtufelczpyiinlwqhbh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdHVmZWxjenB5aWlubHdxaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTcyODMsImV4cCI6MjEwMjE5MzI4M30.XddrPYSr8R0rj-WuG742IIpESxQWHRMwKmQVvo5bbZ0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
