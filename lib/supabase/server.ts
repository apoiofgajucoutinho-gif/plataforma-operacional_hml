import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { assertPublicSupabaseEnv, env } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createClient() {
  assertPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl!, env.supabasePublishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}
