import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AdsContext, AdsDailyRow } from "@/modules/ads/types";

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return {
    membership: data,
    error,
    source: admin ? "service_role" : "rls",
  };
}

async function getAllowedModules(tenantId: string, role: string) {
  if (role === "ADMIN") {
    return allModules;
  }

  const dataClient = createAdminClient() ?? (await createClient());
  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item) => item.module as string);
}

export async function getAdsContext(): Promise<AdsContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { membership, error: membershipError, source } = await getMembershipByUserId(user.id);

  if (membershipError) {
    return {
      tenant: null,
      rows: [],
      updatedAt: null,
      diagnostic: `${source}: ${membershipError.message}`,
      allowedModules: [],
    };
  }

  if (!membership) {
    return {
      tenant: null,
      rows: [],
      updatedAt: null,
      diagnostic: "Nenhum tenant ativo encontrado para este usuario.",
      allowedModules: [],
    };
  }

  const dataClient = createAdminClient() ?? userClient;
  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role);

  if (membership.role !== "ADMIN" || !allowedModules.includes("ads")) {
    return {
      tenant: null,
      rows: [],
      updatedAt: null,
      diagnostic: "Seu perfil nao possui acesso ao modulo Ads.",
      allowedModules,
    };
  }

  const { data: tenant } = await dataClient
    .from("tenants")
    .select("id, nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const { data, error } = await dataClient
    .from("instagram_ads_daily")
    .select(
      "id, data_referencia, campanha, conjunto, anuncio, status, objetivo, alcance, impressoes, cliques, ctr, cpc, cpm, frequencia, valor_gasto, conversoes, leads, performance_status, performance_score, imported_at",
    )
    .eq("tenant_id", membership.tenant_id)
    .order("data_referencia", { ascending: false })
    .limit(5000);

  if (error) {
    return {
      tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
      rows: [],
      updatedAt: null,
      diagnostic: error.message,
      allowedModules,
    };
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    alcance: Number(row.alcance ?? 0),
    impressoes: Number(row.impressoes ?? 0),
    cliques: Number(row.cliques ?? 0),
    ctr: Number(row.ctr ?? 0),
    cpc: Number(row.cpc ?? 0),
    cpm: Number(row.cpm ?? 0),
    frequencia: Number(row.frequencia ?? 0),
    valor_gasto: Number(row.valor_gasto ?? 0),
    conversoes: Number(row.conversoes ?? 0),
    leads: Number(row.leads ?? 0),
    performance_score: Number(row.performance_score ?? 0),
  })) as AdsDailyRow[];

  return {
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    rows,
    updatedAt: rows.map((row) => row.imported_at).filter(Boolean).sort().at(-1) ?? null,
    diagnostic: null,
    allowedModules,
  };
}
