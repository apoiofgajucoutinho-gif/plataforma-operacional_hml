import "server-only";
import { env } from "@/lib/env";

export const confirmedHmlSupabaseProjectRef = "oerdsmgiebquecqwcbox";

export function extractSupabaseProjectRef(url: string | undefined) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function assertExpectedSupabaseWriteTarget(operation: string) {
  const expected = env.expectedSupabaseProjectRef?.trim().toLowerCase();
  if (!expected) return;

  const actual = extractSupabaseProjectRef(env.supabaseUrl);
  if (actual === expected) return;

  console.error("supabase.environment_mismatch", {
    operation,
    expectedProjectRef: expected,
    actualProjectRef: actual ?? "invalid_or_missing",
  });
  throw new Error("A escrita foi bloqueada porque o ambiente de dados não corresponde ao HML esperado.");
}
