import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ObjetivosContext, ObjetivosMeta } from "@/modules/objetivos/types";

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

  return { membership: data, error, source: admin ? "service_role" : "rls" };
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules;

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module, can_write")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item: { module: string }) => item.module);
}

function toNumber<T extends Record<string, unknown>>(rows: T[] | null | undefined) {
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

function periodLabel(meta: Pick<ObjetivosMeta, "periodo_tipo" | "mes" | "quarter" | "semestre" | "ano">) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const yy = String(meta.ano).slice(-2);
  if (meta.periodo_tipo === "mensal" && meta.mes) return `${meses[meta.mes - 1]}/${yy}`;
  if (meta.periodo_tipo === "quarter" && meta.quarter) return `Q${meta.quarter}/${yy}`;
  if (meta.periodo_tipo === "semestral" && meta.semestre) return `S${meta.semestre}/${yy}`;
  return `${meta.ano}`;
}

function inMetaPeriod(rowDate: string | null | undefined, meta: Pick<ObjetivosMeta, "periodo_tipo" | "ano" | "mes" | "quarter" | "semestre">) {
  if (!rowDate) return false;
  const date = new Date(`${rowDate}T00:00:00`);
  if (date.getFullYear() !== meta.ano) return false;
  const month = date.getMonth() + 1;
  if (meta.periodo_tipo === "mensal") return month === meta.mes;
  if (meta.periodo_tipo === "quarter") return Math.ceil(month / 3) === meta.quarter;
  if (meta.periodo_tipo === "semestral") return (month <= 6 ? 1 : 2) === meta.semestre;
  return true;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weeksInPeriod(meta: Pick<ObjetivosMeta, "periodo_tipo" | "mes" | "quarter" | "semestre">) {
  if (meta.periodo_tipo === "mensal") return 4.33;
  if (meta.periodo_tipo === "quarter") return 13;
  if (meta.periodo_tipo === "semestral") return 26;
  return 52;
}

function calculateAtual(meta: ObjetivosMeta, sources: { instagram: any[]; ads: any[]; financeiro: any[] }) {
  if (meta.tipo_origem === "estrategica") return Number(meta.atual_manual ?? 0);

  if (meta.indicador_key === "faturamento_bruto") {
    return sources.financeiro
      .filter((row) => row.tipo === "entrada" && row.status === "realizado")
      .filter((row) => inMetaPeriod(row.mes_competencia ?? row.data_pagamento, meta))
      .reduce((sum, row) => sum + Number(row.valor ?? 0), 0);
  }

  const instagramRows = sources.instagram.filter((row) => inMetaPeriod(row.data_postagem, meta));
  if (meta.indicador_key === "instagram_alcance_total") {
    return instagramRows.reduce((sum, row) => sum + Number(row.alcance ?? 0), 0);
  }
  if (meta.indicador_key === "instagram_posts_semana") {
    return instagramRows.length / weeksInPeriod(meta);
  }
  if (meta.indicador_key === "instagram_reels") {
    return instagramRows.filter((row) => row.tipo === "Reels").length;
  }
  if (meta.indicador_key === "instagram_carrosseis") {
    return instagramRows.filter((row) => row.tipo === "Carrossel").length;
  }
  if (meta.indicador_key === "instagram_bom_engajamento_pct") {
    if (!instagramRows.length) return 0;
    const good = instagramRows.filter((row) => row.engajamento_classificacao === "Bom").length;
    return (good / instagramRows.length) * 100;
  }
  if (meta.indicador_key === "instagram_salvos") {
    return instagramRows.reduce((sum, row) => sum + Number(row.salvos ?? 0), 0);
  }
  if (meta.indicador_key === "instagram_compartilhamentos") {
    return instagramRows.reduce((sum, row) => sum + Number(row.compartilhamentos ?? 0), 0);
  }

  const adsRows = sources.ads.filter((row) => inMetaPeriod(row.data_referencia, meta));
  if (meta.indicador_key === "ads_ctr_medio") return average(adsRows.map((row) => Number(row.ctr ?? 0)));
  if (meta.indicador_key === "ads_cpc_medio") return average(adsRows.map((row) => Number(row.cpc ?? 0)));
  if (meta.indicador_key === "ads_cpm_medio") return average(adsRows.map((row) => Number(row.cpm ?? 0)));
  if (meta.indicador_key === "ads_frequencia_media") return average(adsRows.map((row) => Number(row.frequencia ?? 0)));
  if (meta.indicador_key === "ads_investimento") return adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  if (meta.indicador_key === "ads_leads") return adsRows.reduce((sum, row) => sum + Number(row.leads ?? 0), 0);
  if (meta.indicador_key === "ads_cpl_medio") {
    const spent = adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
    const leads = adsRows.reduce((sum, row) => sum + Number(row.leads ?? 0), 0);
    return leads > 0 ? spent / leads : spent;
  }
  if (meta.indicador_key === "ads_conversoes") return adsRows.reduce((sum, row) => sum + Number(row.conversoes ?? 0), 0);

  return Number(meta.atual_manual ?? 0);
}

function enrichMeta(meta: ObjetivosMeta, sources: { instagram: any[]; ads: any[]; financeiro: any[] }): ObjetivosMeta {
  const atual = calculateAtual(meta, sources);
  const target = Number(meta.meta_alcancavel || 0);
  const percentual = target > 0 ? (meta.direcao === "menor_melhor" ? (target / Math.max(atual, 0.01)) * 100 : (atual / target) * 100) : 0;
  const superTarget = Number(meta.meta_super ?? 0);
  const altaTarget = Number(meta.meta_alta ?? 0);
  const gap = meta.direcao === "menor_melhor" ? atual - target : target - atual;
  let status: ObjetivosMeta["status"] = "critico";

  if (meta.direcao === "menor_melhor") {
    if (superTarget && atual <= superTarget) status = "supermeta";
    else if (altaTarget && atual <= altaTarget) status = "dentro";
    else if (atual <= target) status = "dentro";
    else if (percentual >= 70) status = "atencao";
  } else {
    if (superTarget && atual >= superTarget) status = "supermeta";
    else if (atual >= target) status = "dentro";
    else if (percentual >= 70) status = "atencao";
  }

  return { ...meta, atual, percentual, status, gap, periodoLabel: periodLabel(meta) };
}

export async function getObjetivosContext(): Promise<ObjetivosContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) redirect("/login");

  const { membership, error, source } = await getMembershipByUserId(user.id);
  if (error) {
    return { tenant: null, allowedModules: [], diagnostic: `${source}: ${error.message}`, canWrite: false, metas: [], okrs: [], planos: [], updatedAt: null };
  }
  if (!membership) {
    return { tenant: null, allowedModules: [], diagnostic: "Nenhum tenant ativo encontrado para este usuario.", canWrite: false, metas: [], okrs: [], planos: [], updatedAt: null };
  }

  const dataClient: SupabaseAny = createAdminClient() ?? userClient;
  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, dataClient);
  if (!allowedModules.includes("objetivos")) {
    return { tenant: null, allowedModules, diagnostic: "Seu perfil nao possui acesso ao modulo Objetivos.", canWrite: false, metas: [], okrs: [], planos: [], updatedAt: null };
  }

  const [{ data: tenant }, metasResult, okrsResult, krsResult, planosResult, instagramResult, adsResult, financeiroResult, permissionResult] =
    await Promise.all([
      dataClient.from("tenants").select("id, nome").eq("id", membership.tenant_id).maybeSingle(),
      dataClient.from("objetivos_metas").select("*").eq("tenant_id", membership.tenant_id).eq("ativo", true).order("ano", { ascending: false }),
      dataClient.from("objetivos_okrs").select("*").eq("tenant_id", membership.tenant_id).eq("ativo", true).order("created_at", { ascending: false }),
      dataClient.from("objetivos_key_results").select("*").eq("tenant_id", membership.tenant_id),
      dataClient.from("objetivos_planos_acao").select("*").eq("tenant_id", membership.tenant_id).order("created_at", { ascending: false }).limit(100),
      dataClient
        .from("instagram_posts")
        .select("id, data_postagem, instagram_metrics(alcance, salvos, compartilhamentos, engajamento_classificacao)")
        .eq("tenant_id", membership.tenant_id),
      dataClient.from("instagram_ads_daily").select("data_referencia, ctr, cpc, cpm, frequencia, valor_gasto, leads, conversoes").eq("tenant_id", membership.tenant_id),
      dataClient.from("fin_lancamentos").select("tipo, status, valor, data_pagamento, mes_competencia").eq("tenant_id", membership.tenant_id),
      membership.role === "ADMIN"
        ? Promise.resolve({ data: [{ can_write: true }] })
        : dataClient
            .from("tenant_module_permissions")
            .select("can_write")
            .eq("tenant_id", membership.tenant_id)
            .eq("role", membership.role)
            .eq("module", "objetivos")
            .maybeSingle(),
    ]);

  const instagram = (instagramResult.data ?? []).map((row: any) => ({
    ...row,
    alcance: row.instagram_metrics?.[0]?.alcance ?? 0,
    salvos: row.instagram_metrics?.[0]?.salvos ?? 0,
    compartilhamentos: row.instagram_metrics?.[0]?.compartilhamentos ?? 0,
    engajamento_classificacao: row.instagram_metrics?.[0]?.engajamento_classificacao ?? "N/A",
  }));
  const sources = {
    instagram,
    ads: toNumber(adsResult.data),
    financeiro: toNumber(financeiroResult.data),
  };
  const metas = toNumber(metasResult.data).map((meta) => enrichMeta(meta as ObjetivosMeta, sources));
  const krsByOkr = new Map<string, any[]>();
  toNumber(krsResult.data).forEach((kr: any) => {
    const progresso = kr.meta > 0 ? (kr.direcao === "menor_melhor" ? (kr.meta / Math.max(kr.atual_manual, 0.01)) * 100 : (kr.atual_manual / kr.meta) * 100) : 0;
    krsByOkr.set(kr.okr_id, [...(krsByOkr.get(kr.okr_id) ?? []), { ...kr, progresso }]);
  });
  const okrs = toNumber(okrsResult.data).map((okr: any) => ({ ...okr, keyResults: krsByOkr.get(okr.id) ?? [] }));
  const latest = [...metas.map((item) => item.updated_at), ...(planosResult.data ?? []).map((item: any) => item.updated_at)].filter(Boolean).sort().at(-1) ?? null;

  return {
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    allowedModules,
    diagnostic: null,
    canWrite: membership.role === "ADMIN" || Boolean((permissionResult.data as any)?.can_write),
    metas,
    okrs,
    planos: planosResult.data ?? [],
    updatedAt: latest,
  };
}
