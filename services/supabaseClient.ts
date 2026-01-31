import { createClient } from '@supabase/supabase-js';

// Initialize with your specific credentials to ensure connection works
// regardless of environment variable loading quirks.
let supabaseUrl = 'https://frpiqitlzansiipkcknl.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycGlxaXRsemFuc2lpcGtja25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDE3MTIsImV4cCI6MjA4NTI3NzcxMn0.TsgvYYrXWGt9uMBkvzALh_JqQYd3sqGJtv4NPSuokuk';

// Attempt to read from process.env (Standard/CRA) - Overrides defaults if present
try {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_SUPABASE_URL) {
      supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    }
    if (process.env.REACT_APP_SUPABASE_ANON_KEY) {
      supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    }
  }
} catch (e) {
  // Ignore
}

// Attempt to read from import.meta.env (Vite) - Overrides defaults if present
try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_URL) {
      // @ts-ignore
      supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    }
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // @ts-ignore
      supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  }
} catch (e) {
  // Ignore
}

// Validation & Debugging
const isPlaceholder = supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder');

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.warn('Invalid or missing Supabase URL.');
}

const supabaseProjectRef = (() => {
  try {
    const m = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
})();
if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV && supabaseProjectRef) {
  console.log('[Dropam] Supabase project:', supabaseProjectRef);
}

if (isPlaceholder) {
    console.error(
        "%c Supabase Not Connected! ", 
        "background: #FF3B30; color: white; font-weight: bold; padding: 4px; border-radius: 4px;"
    );
    console.error("Please update your .env file with the credentials from your Supabase Dashboard.");
} else {
    console.log(
        "%c Supabase Connected ", 
        "background: #34C759; color: white; font-weight: bold; padding: 4px; border-radius: 4px;",
        supabaseUrl
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/** Single source of truth for Supabase URL. Use for Edge Function base URL so client and verify never diverge. */
export function getSupabaseUrl(): string {
  return supabaseUrl;
}