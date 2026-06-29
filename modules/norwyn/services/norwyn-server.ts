import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NorwynContext } from "@/modules/norwyn/types";

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

async function getAllowedModules(tenantId: string, role: string) {
  if (role === "ADMIN") return allModules;

  const dataClient = createAdminClient() ?? (await createClient());
  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item) => item.module as string);
}

function emptyContext(partial?: Partial<NorwynContext>): NorwynContext {
  return {
    role: null,
    tenant: null,
    allowedModules: [],
    diagnostic: null,
    updatedAt: null,
    posts: [],
    interactions: [],
    commercialSales: [],
    adsRows: [],
    contentEvents: [],
    agendaEvents: [],
    atividades: [],
    ocorrencias: [],
    objetivos: [],
    signals: [],
    ...partial,
  };
}

export async function getNorwynContext(): Promise<NorwynContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const dataClient = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();

  if (!currentUser) redirect("/login");

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const {
    membership,
    error: membershipError,
    source,
  } = localMembership
    ? { membership: localMembership, error: null, source: "local_bypass" }
    : await getMembershipByUserId(currentUser.id);

  if (membershipError) {
    return emptyContext({ diagnostic: `${source}: ${membershipError.message}` });
  }

  if (!membership) {
    return emptyContext({ diagnostic: "Nenhum tenant ativo encontrado para este usuario." });
  }

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role);
  const canReadNorwyn = membership.role === "ADMIN" || allowedModules.includes("norwyn");

  if (!canReadNorwyn) {
    return emptyContext({
      role: membership.role,
      allowedModules,
      diagnostic: "Seu perfil nao possui acesso ao modulo Norwyn.",
    });
  }

  const { data: tenant } = await dataClient
    .from("tenants")
    .select("id, nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const { data: account } = await dataClient
    .from("instagram_accounts")
    .select("id")
    .eq("tenant_id", membership.tenant_id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  const postQuery = dataClient
    .from("instagram_posts")
    .select("id, post_id, data_postagem, hora_postagem, tipo, legenda, permalink")
    .eq("tenant_id", membership.tenant_id)
    .order("data_postagem", { ascending: false })
    .limit(500);

  if (account?.id) postQuery.eq("account_id", account.id);

  const [
    postsResult,
    interactionsResult,
    followerMetricsResult,
    salesResult,
    adsResult,
    agendaResult,
    atividadesResult,
    ocorrenciasResult,
    objetivosResult,
    signalsResult,
    contentEventsResult,
  ] = await Promise.all([
    postQuery,
    dataClient
      .from("instagram_interactions")
      .select("id, source, marketing_type, external_id, post_id, origem, profile_username, profile_name, message_text, media_id, post_permalink, interaction_at, status, potential, product_topic, next_action")
      .eq("tenant_id", membership.tenant_id)
      .order("interaction_at", { ascending: false })
      .limit(500),
    dataClient
      .from("instagram_metrics")
      .select("post_id, likes, comentarios, alcance, salvos, compartilhamentos, engajamento_score, engajamento_classificacao, imported_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .limit(800),
    dataClient
      .from("comercial_vendas")
      .select("id, transaction_id, produto_nome, comprador_email, status_original, status_normalizado, grupo_comercial, forma_pagamento, valor_bruto, data_compra, data_aprovacao, source_sck, imported_at, last_event_at")
      .eq("tenant_id", membership.tenant_id)
      .order("data_compra", { ascending: false, nullsFirst: false })
      .limit(3000),
    dataClient
      .from("instagram_ads_daily")
      .select("id, data_referencia, campanha, conjunto, anuncio, status, alcance, impressoes, cliques, ctr, cpc, cpm, frequencia, valor_gasto, conversoes, leads, performance_status, performance_score")
      .eq("tenant_id", membership.tenant_id)
      .order("data_referencia", { ascending: false })
      .limit(3000),
    dataClient
      .from("agenda_eventos")
      .select("id, titulo, tipo, inicio, fim, status")
      .eq("tenant_id", membership.tenant_id)
      .order("inicio", { ascending: true })
      .limit(200),
    dataClient
      .from("atividades_tarefas")
      .select("id, titulo, time_responsavel, status, prioridade, prazo")
      .eq("tenant_id", membership.tenant_id)
      .order("prazo", { ascending: true, nullsFirst: false })
      .limit(300),
    dataClient
      .from("ocorrencias_chamados")
      .select("id, erro_motivo, categoria, prioridade, status, impacto_cliente")
      .eq("tenant_id", membership.tenant_id)
      .order("data_chamado", { ascending: false })
      .limit(200),
    dataClient
      .from("objetivos_metas")
      .select("id, titulo, indicador_key, status, percentual, plano_acao_padrao")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_signals")
      .select("id, tenant_id, provider, category, subcategory, title, description, starts_at, ends_at, priority, impact_score, compatibility_score, urgency_score, confidence_score, final_score, status, suggested_angle, suggested_action, recommended_tone, avoid_tone, mission_tags, product_tags, audience_tags, content_format_suggestions, source_name, source_url, metadata, created_by, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .neq("status", "archived")
      .order("final_score", { ascending: false })
      .limit(500),
    dataClient
      .from("norwyn_content_events")
      .select("id, tenant_id, source, source_id, event_type, subtype, title, caption, published_at, influence_hours, mission_id, campaign_id, product_tags, theme_tags, objective, funnel_stage, cta, performance_snapshot, metadata, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("published_at", { ascending: false })
      .limit(800),
  ]);

  const metricsByPost = new Map((followerMetricsResult.data ?? []).map((metric: any) => [metric.post_id, metric]));
  const posts = (postsResult.data ?? []).map((post: any) => {
    const metric = metricsByPost.get(post.id) as any;
    return {
      id: post.id,
      post_id: post.post_id,
      data_postagem: post.data_postagem,
      hora_postagem: post.hora_postagem,
      tipo: post.tipo,
      legenda: post.legenda,
      permalink: post.permalink,
      likes: metric?.likes ?? 0,
      comentarios: metric?.comentarios ?? 0,
      alcance: metric?.alcance ?? null,
      salvos: metric?.salvos ?? null,
      compartilhamentos: metric?.compartilhamentos ?? null,
      engajamento_score: metric?.engajamento_score ?? null,
      engajamento_classificacao: metric?.engajamento_classificacao ?? "N/A",
    };
  });

  const updatedAt = [
    ...(followerMetricsResult.data ?? []).map((metric: any) => metric.imported_at ?? metric.updated_at),
    ...(salesResult.data ?? []).map((sale: any) => sale.imported_at ?? sale.last_event_at),
    ...(adsResult.data ?? []).map((row: any) => row.data_referencia),
    ...(signalsResult.data ?? []).map((signal: any) => signal.updated_at),
    ...(contentEventsResult.data ?? []).map((event: any) => event.updated_at ?? event.published_at),
  ]
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const objetivos = (objetivosResult.data ?? []).map((meta: any) => ({
    id: meta.id,
    titulo: meta.titulo,
    indicador_key: meta.indicador_key ?? null,
    status: meta.status ?? null,
    percentual_atingido: meta.percentual ?? null,
    plano_acao: meta.plano_acao_padrao ?? null,
  }));

  return {
    role: membership.role,
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    allowedModules,
    diagnostic: null,
    updatedAt,
    posts,
    interactions: interactionsResult.data ?? [],
    commercialSales: salesResult.data ?? [],
    adsRows: adsResult.data ?? [],
    contentEvents: contentEventsResult.data ?? [],
    agendaEvents: agendaResult.data ?? [],
    atividades: atividadesResult.data ?? [],
    ocorrencias: ocorrenciasResult.data ?? [],
    objetivos,
    signals: signalsResult.data ?? [],
  };
}
