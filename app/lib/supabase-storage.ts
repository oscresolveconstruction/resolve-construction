
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "resolve-files";

export function getSupabaseStorage() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Supabase Storage is not configured.");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }).storage.from(STORAGE_BUCKET);
}
