import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { OcorrenciasContext } from "@/modules/ocorrencias/types";

type SupabaseAny = any;

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

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules;

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item: { module: string }) => item.module);
}

function toNumberRows<T extends Record<string, unknown>>(rows: T[] | null | undefined) {
  return (rows ?? []).map((row) => {
    const next = { ...row };
    for (const [key, value] of Object.entries(next)) {
      if (typeof value === "string" && value !== "" && !Number.isNaN(Number(value))) {
        next[key as keyof typeof next] = Number(value) as never;
      }
    }
    return next;
  });
}

function latestDate(rows: Array<{ updated_at?: string | null; created_at?: string | null }>) {
  return rows.reduce<string | null>((latest, row) => {
    const value = row.updated_at ?? row.created_at ?? null;
    if (!value) return latest;
    if (!latest || value > latest) return value;
    return latest;
  }, null);
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function matchesTerm(source: string | null | undefined, term: string | null | undefined) {
  const normalizedTerm = normalizeSearch(term);
  if (!normalizedTerm) return true;
  return normalizeSearch(source).includes(normalizedTerm);
}

function enrichChamadosWithAds(chamados: any[], adsRows: any[]) {
  return chamados.map((chamado) => {
    const hasCampaignReference = Boolean(chamado.campanha_nome || chamado.conjunto_anuncio || chamado.criativo_nome);
    if (!hasCampaignReference) return chamado;

    const windowStart = addDays(chamado.data_chamado, -2);
    const windowEnd = addDays(chamado.data_chamado, 2);
    const matches = adsRows.filter((row) => {
      const inWindow = row.data_referencia >= windowStart && row.data_referencia <= windowEnd;
      return (
        inWindow &&
        matchesTerm(row.campanha, chamado.campanha_nome) &&
        matchesTerm(row.conjunto, chamado.conjunto_anuncio) &&
        matchesTerm(row.anuncio, chamado.criativo_nome)
      );
    });

    if (!matches.length) return chamado;

    const valorGasto = matches.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
    const impressoes = matches.reduce((sum, row) => sum + Number(row.impressoes ?? 0), 0);
    const alcance = matches.reduce((sum, row) => sum + Number(row.alcance ?? 0), 0);
    const resultados = matches.reduce((sum, row) => sum + Number(row.conversoes ?? row.leads ?? 0), 0);

    return {
      ...chamado,
      valor_apurado_ads: chamado.valor_apurado_ads ?? valorGasto,
      impressoes_impactadas: chamado.impressoes_impactadas ?? impressoes,
      alcance_impactado: chamado.alcance_impactado ?? alcance,
      resultados_impactados: chamado.resultados_impactados ?? resultados,
      impacto_financeiro_estimado: chamado.impacto_financeiro_estimado ?? valorGasto,
      impacto_estimativa_criterio:
        chamado.impacto_estimativa_criterio ??
        "Projecao baseada no gasto em Ads da campanha/conjunto/anuncio em janela de 2 dias antes e 2 dias depois da ocorrencia.",
      impacto_estimativa_confianca: chamado.impacto_estimativa_confianca ?? (chamado.campanha_nome ? "media" : "baixa"),
    };
  });
}

export async function getOcorrenciasContext(): Promise<OcorrenciasContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) redirect("/login");

  const { membership, error, source } = await getMembershipByUserId(user.id);
  if (error) {
    return {
      tenant: null,
      allowedModules: [],
      diagnostic: `${source}: ${error.message}`,
      canWrite: false,
      chamados: [],
      cadastros: [],
      planos: [],
      updatedAt: null,
    };
  }

  if (!membership) {
    return {
      tenant: null,
      allowedModules: [],
      diagnostic: "Nenhum tenant ativo encontrado para este usuario.",
      canWrite: false,
      chamados: [],
      cadastros: [],
      planos: [],
      updatedAt: null,
    };
  }

  const dataClient: SupabaseAny = createAdminClient() ?? userClient;
  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, dataClient);

  if (!allowedModules.includes("ocorrencias")) {
    return {
      tenant: null,
      allowedModules,
      diagnostic: "Seu perfil nao possui acesso ao modulo Ocorrencias.",
      canWrite: false,
      chamados: [],
      cadastros: [],
      planos: [],
      updatedAt: null,
    };
  }

  const [tenantResult, chamadosResult, cadastrosResult, planosResult, adsResult, permissionResult] = await Promise.all([
    dataClient.from("tenants").select("id, nome").eq("id", membership.tenant_id).maybeSingle(),
    dataClient
      .from("ocorrencias_chamados")
      .select("*")
      .eq("tenant_id", membership.tenant_id)
      .order("data_chamado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
    dataClient
      .from("ocorrencias_cadastros")
      .select("*")
      .eq("tenant_id", membership.tenant_id)
      .order("tipo", { ascending: true })
      .order("nome", { ascending: true }),
    dataClient
      .from("ocorrencias_planos_acao")
      .select("*")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(500),
    dataClient
      .from("instagram_ads_daily")
      .select("data_referencia, campanha, conjunto, anuncio, alcance, impressoes, valor_gasto, conversoes, leads")
      .eq("tenant_id", membership.tenant_id)
      .gte("data_referencia", addDays(new Date().toISOString().slice(0, 10), -120)),
    membership.role === "ADMIN"
      ? Promise.resolve({ data: { can_write: true } })
      : dataClient
          .from("tenant_module_permissions")
          .select("can_write")
          .eq("tenant_id", membership.tenant_id)
          .eq("role", membership.role)
          .eq("module", "ocorrencias")
          .maybeSingle(),
  ]);

  const chamados = enrichChamadosWithAds(toNumberRows(chamadosResult.data), toNumberRows(adsResult.data));
  const cadastros = cadastrosResult.data ?? [];
  const planos = planosResult.data ?? [];

  return {
    tenant: tenantResult.data,
    allowedModules,
    diagnostic: null,
    canWrite: Boolean(permissionResult.data?.can_write),
    chamados: chamados as OcorrenciasContext["chamados"],
    cadastros: cadastros as OcorrenciasContext["cadastros"],
    planos: planos as OcorrenciasContext["planos"],
    updatedAt: latestDate([...chamados, ...cadastros, ...planos]),
  };
}
