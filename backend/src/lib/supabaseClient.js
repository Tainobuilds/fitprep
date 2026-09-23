// Shared Supabase client for the backend. Import this wherever you need
// to read/write data instead of creating a new client in every route.
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "SUPABASE_URL / SUPABASE_ANON_KEY are not set — fill them in in .env before hitting real data."
  );
}

export const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "");
