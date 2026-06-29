import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
      events: [],
      updatedAt: null,
      diagnostic: "Nenhum tenant ativo encontrado para este usuario.",
    };
  }

  const allowedModules = membership.role === "ADMIN" ? allModules : [];

  if (!allowedModules.includes("adocao")) {
    return {
      allowedModules,
      tenant: null,
      events: [],
      updatedAt: null,
      diagnostic: "Seu perfil nao possui acesso ao modulo Adocao.",
    };
  }

  const { data: tenant } = await dataClient
    .from("tenants")
    .select("id, nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const { data: events } = await dataClient
    .from("adoption_events")
    .select("id, module, page_path, event_name, user_id, metadata, created_at")
    .eq("tenant_id", membership.tenant_id)
    .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString())
    .order("created_at", { ascending: false })
    .limit(2000);

  const updatedAt =
    events?.reduce<string | null>((latest, event) => {
      if (!latest || event.created_at > latest) return event.created_at;
      return latest;
    }, null) ?? null;

  return {
    allowedModules,
    tenant,
    events: events ?? [],
    updatedAt,
    diagnostic: null,
  };
}
