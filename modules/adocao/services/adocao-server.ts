import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCachedAdoptionAnalytics } from "@/modules/adocao/services/adoption-analytics";

export async function getAdocaoContext() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const dataClient = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();

  if (!currentUser) {
    redirect("/login");
  }

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const { data: membershipFromDb } = localMembership
    ? { data: localMembership }
    : await dataClient
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", currentUser.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
  const membership = membershipFromDb;

  if (!membership) {
    return {
      allowedModules: [],
      tenant: null,
      analytics: null,
      role: null,
      updatedAt: null,
      diagnostic: "Nenhum tenant ativo encontrado para este usuario.",
    };
  }

  const allowedModules = membership.role === "ADMIN" ? allModules : [];

  if (!allowedModules.includes("adocao")) {
    return {
      allowedModules,
      tenant: null,
      analytics: null,
      role: membership.role,
      updatedAt: null,
      diagnostic: "Seu perfil nao possui acesso ao modulo Adocao.",
    };
  }

  const { data: tenant } = await dataClient
    .from("tenants")
    .select("id, nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const analytics = await getCachedAdoptionAnalytics(dataClient, membership.tenant_id);

  return {
    allowedModules,
    tenant,
    analytics,
    role: membership.role,
    updatedAt: analytics.updatedAt,
    diagnostic: null,
  };
}
