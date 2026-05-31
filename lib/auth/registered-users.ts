import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const user = data.users.find(
      (item: User) => item.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }

  return null;
}

export async function userHasActiveMembership(userId: string) {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data } = await admin
    .from("tenant_members")
    .select("id")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}
