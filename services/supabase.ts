import { createClient } from '@supabase/supabase-js';

// Safe environment variable retrieval
const getEnv = (key: string, viteKey?: string) => {
  let value = '';
  
  // Try process.env first (safe check)
  if (typeof process !== 'undefined' && process.env) {
    value = process.env[key] || '';
  }

  // Try import.meta.env (Vite)
  if (!value && viteKey) {
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        value = import.meta.env[viteKey] || '';
      }
    } catch (e) {
      // ignore
    }
  }

  return value;
};

const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseKey = getEnv('REACT_APP_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

// If URL is missing or is the placeholder, we are in demo mode
export const isDemoMode = !supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey;

if (isDemoMode) {
  console.warn('Running in DEMO MODE. No backend connection.');
}

// Initialize with fallback to prevent "supabaseUrl is required" crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

export const getPublicUrl = (path: string) => {
  if (isDemoMode) return path; // In demo mode, path is the url
  const { data } = supabase.storage.from('gallery-files').getPublicUrl(path);
  return data.publicUrl;
};
