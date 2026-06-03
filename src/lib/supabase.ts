import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment');
}

export const supabase   = createClient(SUPABASE_URL, SUPABASE_ANON);
export const SUPABASE_ANON_KEY = SUPABASE_ANON;
export const CANVAS_PROXY_URL  = `${SUPABASE_URL}/functions/v1/canvas-proxy`;
export const AI_FUNCTION_URL   = `${SUPABASE_URL}/functions/v1/parse-assignment`;
