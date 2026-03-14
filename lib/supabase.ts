import { createClient } from '@supabase/supabase-js';

// Vercel/Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing! Check Vercel Dashboard -> Settings -> Environment Variables.');
}

// Create client - note: if URL is empty, this instance will fail at runtime when called, 
// but it won't crash the entire JS bundle loading process.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
