import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    !supabaseUrl.includes("your-project") &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes("your-anon")
);

function initializeSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  try {
    const { createClient } = require("@supabase/supabase-js");
    return createClient(supabaseUrl!, supabaseAnonKey!);
  } catch (e) {
    return null;
  }
}

export const supabase: SupabaseClient | null = isSupabaseConfigured ? initializeSupabase() : null;
