import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertPublicSupabaseEnv, env } from "@/lib/env";

export function createAdminClient() {
  assertPublicSupabaseEnv();

  if (!env.supabaseServiceRoleKey) {
    return null;
  }

  return createSupabaseClient(env.supabaseUrl!, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
