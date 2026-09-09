import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adsAnalyticsSelect, normalizeAdsDailyRow } from "@/modules/ads/services/ads-analytics";
import type { NorwynContext } from "@/modules/norwyn/types";
const commercialSalesSelect = "id, transaction_id, produto_id, hotmart_product_id, produto_nome, comprador_nome, comprador_email, status_original, status_normalizado, grupo_comercial, commercial_transaction, sale_confirmed, revenue_eligible, student_eligible, sale_comparable, event_class, forma_pagamento, moeda, valor_bruto, data_compra, data_aprovacao, data_reembolso, source_sck, imported_at, last_event_at, metadata";

type SupabaseResult<T = any> = { data: T[] | null; error: any; pagination?: { pageSize: number; pages: number; rows: number } };

async function fetchCommercialSales(dataClient: any, tenantId: string): Promise<SupabaseResult> {
  const pageSize = 1000;
  const rows: any[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await dataClient
      .from("comercial_vendas")
      .select(commercialSalesSelect)
      .eq("tenant_id", tenantId)
      .order("data_compra", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error) return { data: rows, error, pagination: { pageSize, pages: Math.ceil(rows.length / pageSize), rows: rows.length } };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return { data: rows, error: null, pagination: { pageSize, pages: Math.ceil(rows.length / pageSize), rows: rows.length } };
}

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
    user: null,
    tenant: null,
    allowedModules: [],
    diagnostic: null,
    updatedAt: null,
    posts: [],
    interactions: [],
    instagramFollowerGrowthSummary: null,
    instagramFollowerDailyMetrics: [],
    commercialSales: [],
    products: [],
    businessProfile: null,
    taxRules: [],
    adsRows: [],
    funnelEvents: [],
    contentEvents: [],
    agendaEvents: [],
    atividades: [],
    ocorrencias: [],
    objetivos: [],
    signals: [],
    campaigns: [],
    landingRegistry: [],
    growthIncidents: [],
    growthPlaybookRules: [],
    campaignMaterials: [],
    campaignMaterialVersions: [],
    campaignApprovals: [],
    marketingQAReviews: [],
    marketingQAReviewItems: [],
    contentCaptures: [],
    productExternalIdentities: [],
    timelineEvents: [],
    campaignLearnings: [],
    financeLancamentos: [],
    relationshipReviews: [],
    supportTickets: [],
    certificateRequests: [],
    partnerRules: [],
    financialSettlements: [],
    studentJourneys: [],
    productJourneyEdges: [],
    lifecycleEligibilityRules: [],
    lifecycleEligibilityRuns: [],
    lifecycleEligibilityMembers: [],
    customerOfferEvents: [],
    lifecycleExperiments: [],
    customerChannelStatuses: [],
    lifecycleExposureRules: [],
    lifecycleExecutionApprovals: [],
    channelContactPolicies: [],
    lifecycleMessageDrafts: [],
    lifecycleInternalTestContacts: [],
    manychatSummary: null,
    telegramSchedules: [],
    telegramSends: [],
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

  const userMetadata = ("user_metadata" in currentUser && currentUser.user_metadata && typeof currentUser.user_metadata === "object" ? currentUser.user_metadata : {}) as Record<string, unknown>;
  const userName = [userMetadata.preferred_name, userMetadata.nome_preferido, userMetadata.full_name, userMetadata.name, userMetadata.nome]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;
  const preferredName = [userMetadata.preferred_name, userMetadata.nome_preferido, userMetadata.given_name]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;
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
    funnelEventsResult,
    agendaResult,
    atividadesResult,
    ocorrenciasResult,
    objetivosResult,
    signalsResult,
    contentEventsResult,
    productsResult,
    businessProfileResult,
    taxRulesResult,
    campaignsResult,
    landingRegistryResult,
    growthIncidentsResult,
    growthPlaybookRulesResult,
    campaignMaterialsResult,
    campaignMaterialVersionsResult,
    campaignApprovalsResult,
    marketingQAReviewsResult,
    marketingQAReviewItemsResult,
    contentCapturesResult,
    productExternalIdentitiesResult,
    timelineEventsResult,
    campaignLearningsResult,
    financeLancamentosResult,
    relationshipReviewsResult,
    supportTicketsResult,
    certificateRequestsResult,
    partnerRulesResult,
    financialSettlementsResult,
    studentJourneysResult,
    productJourneyEdgesResult,
    lifecycleEligibilityRulesResult,
    lifecycleEligibilityRunsResult,
    lifecycleEligibilityMembersResult,
    customerOfferEventsResult,
    lifecycleExperimentsResult,
    customerChannelStatusesResult,
    lifecycleExposureRulesResult,
    lifecycleExecutionApprovalsResult,
    channelContactPoliciesResult,
    lifecycleMessageDraftsResult,
    lifecycleInternalTestContactsResult,
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
    fetchCommercialSales(dataClient, membership.tenant_id),
    dataClient
      .from("instagram_ads_daily")
      .select(adsAnalyticsSelect)
      .eq("tenant_id", membership.tenant_id)
      .order("data_referencia", { ascending: false })
      .limit(5000),
    dataClient
      .from("growth_funnel_events")
      .select("id, tenant_id, funnel_session_id, event_type, environment, occurred_at, product_id, campaign_id, meta_campaign_id, meta_adset_id, meta_ad_id, meta_creative_id, campaign_key, audience_key, creative_key, source_sck, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, click_id, page_url, provider, metadata, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("occurred_at", { ascending: false })
      .limit(5000),
    dataClient
      .from("agenda_eventos")
      .select("id, titulo, tipo, inicio, fim, status")
      .eq("tenant_id", membership.tenant_id)
      .order("inicio", { ascending: true })
      .limit(200),
    dataClient
      .from("atividades_tarefas")
      .select("id, titulo, time_responsavel, status, prioridade, prazo, source_module, source_event, product_id, campaign_id, person_id, student_id, content_id, incident_id, due_at, approval_required, blocked_reason, waiting_on, metadata")
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
    dataClient
      .from("products")
      .select("id, tenant_id, nome_oficial, produto_base, categoria, fiscal_category, financial_notes, descricao, status, tipo, preco_oficial, duracao, unidade_duracao, link_oferta, percentual_coproducao, percentual_hotmart, percentual_gateway, percentual_imposto, receita_liquida_estimada_pct, observacoes, ativo, source, manually_edited_at, metadata, product_aliases(id, alias, produto_base, origem, confianca, principal, ativo, source, manually_edited_at), product_components(id, componente, categoria, ordem, duracao, unidade_duracao, link, observacoes, ativo, source, manually_edited_at), product_batches(id, turma, inicio, fim, status, meta_alunos, alunos, receita_meta, receita_real, observacoes, ativo, source, manually_edited_at)")
      .eq("tenant_id", membership.tenant_id)
      .order("produto_base", { ascending: true })
      .limit(500),
    dataClient
      .from("business_profile")
      .select("id, tenant_id, company_name, cnpj, tax_regime, default_coproduction_percent, hotmart_percent_fee, hotmart_fixed_fee, hotmart_withdraw_fee, gateway_percent_fee, observations, starts_at, ends_at, status, source, source_key, manually_edited_at")
      .eq("tenant_id", membership.tenant_id)
      .eq("status", "current")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    dataClient
      .from("business_tax_rules")
      .select("id, tenant_id, business_profile_id, category, cnae, tax_percent, description, starts_at, ends_at, status, observations, source, source_key, manually_edited_at")
      .eq("tenant_id", membership.tenant_id)
      .order("category", { ascending: true })
      .order("starts_at", { ascending: false })
      .limit(100),
    dataClient
      .from("campaigns")
      .select("id, tenant_id, name, type, objective_id, mission_external_key, product_id, status, starts_at, ends_at, target_sales, target_revenue, plan_json, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(100),
    dataClient
      .from("norwyn_landing_registry")
      .select("id, tenant_id, campaign_key, landing_key, landing_name, landing_version, url, product_id, hotmart_product_id, environment, status, operation_mode, external_owner, next_check_at, monitor_frequency_minutes, metadata, last_checked_at, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(500),
    dataClient
      .from("norwyn_growth_incidents")
      .select("id, tenant_id, incident_key, title, severity, status, operation_mode, external_owner, detected_at, first_observed_at, last_observed_at, confirmed_impact, potential_impact_data, unknowns, prevention_rule, preflight_rule, automation_opportunity")
      .eq("tenant_id", membership.tenant_id)
      .order("detected_at", { ascending: false })
      .limit(300),
    dataClient
      .from("norwyn_growth_playbook_rules")
      .select("id, tenant_id, rule_key, category, severity, title, rule, source_incident_id, evidence, status, version, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(300),
    dataClient
      .from("campaign_materials")
      .select("id, tenant_id, campaign_id, material_type, title, status, channel, current_version_id, metadata, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(300),
    dataClient
      .from("campaign_material_versions")
      .select("id, tenant_id, campaign_id, material_id, version_number, title, content, change_note, source, metadata, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(500),
    dataClient
      .from("campaign_approvals")
      .select("id, tenant_id, campaign_id, material_id, version_id, approver_id, approver_name, status, decided_at, observation, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(300),
    dataClient
      .from("marketing_qa_reviews")
      .select("id, tenant_id, campaign_id, material_id, material_version_id, reviewer_type, provider, model, status, overall_score, summary, blocking_reasons, warnings, suggested_content, input_size, duration_ms, success, error_message, usage_json, metadata, created_by, created_at, completed_at")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(300),
    dataClient
      .from("marketing_qa_review_items")
      .select("id, tenant_id, review_id, category, severity, status, title, description, evidence, suggested_fix, field_reference, resolution_note, resolved_by, resolved_at, metadata, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(1000),
    dataClient
      .from("content_capture")
        .select("id, tenant_id, title, capture_type, drive_url, status, product_id, mission_id, campaign_id, objective_id, description, summary, transcript, transcript_source, transcript_status, transcript_segments, source_title, source_description, source_chapters, transcript_full_text, transcript_quality, file_id, file_name, file_type, file_size, duration_seconds, topics, pain_points, objections, cases, quotes, cta, products_detected, related_missions, tags, knowledge_generated, similar_content, similar_campaigns, winning_plays, provider, model, duration_ms, success, error_message, usage_json, metadata, processing_metadata, result_version, result_versions, primary_product_id, manually_selected_product_id, confidence, processing_started_at, processing_completed_at, created_by, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_product_external_identities")
      .select("id, tenant_id, product_id, product_key, source, external_id, external_name, relationship, revenue_scope, confidence, evidence, status, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .eq("status", "active")
      .order("product_key", { ascending: true })
      .limit(1000),
    dataClient
      .from("norwyn_timeline_events")
      .select("id, tenant_id, event_type, title, occurred_at, source_module, source_id, product_id, campaign_id, person_id, student_id, activity_id, content_id, metadata, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("occurred_at", { ascending: false, nullsFirst: false })
      .limit(500),
    dataClient
      .from("norwyn_campaign_learnings")
      .select("id, tenant_id, campaign_id, product_id, content_id, learning_type, title, detail, evidence, confidence, status, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(500),
    dataClient
      .from("fin_lancamentos")
      .select("id, tenant_id, data_pagamento, mes_competencia, tipo, status, centro_resultado_id, centro:fin_centros_resultado(nome), curso_id, curso:fin_cursos(nome), descricao, valor, origem, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("data_pagamento", { ascending: false })
      .limit(1000),
    dataClient
      .from("norwyn_relationship_reviews")
      .select("id, tenant_id, source, external_id, external_value, suggested_product_id, confidence, evidence, cause, recoverable, status, resolved_product_id, resolved_at, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(1000),
    dataClient
      .from("norwyn_support_tickets")
      .select("id, tenant_id, person_key, student_email, student_id, product_id, topic, status, priority, assigned_to, opened_at, resolved_at, resolution, activity_id, metadata, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(500),
    dataClient
      .from("norwyn_certificate_requests")
      .select("id, tenant_id, person_key, student_email, student_id, product_id, request_date, evidence_reference, status, activity_id, metadata, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(500),
    dataClient
      .from("norwyn_partner_rules")
      .select("id, tenant_id, partner, scope_type, product_id, campaign_id, valid_from, valid_to, calculation_type, percentage, fixed_amount, calculation_basis, status, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(300),
    dataClient
      .from("norwyn_financial_settlements")
      .select("id, tenant_id, finance_lancamento_id, provider, period_start, period_end, settlement_reference, value, status, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(500),
    dataClient
      .from("norwyn_student_journeys")
      .select("id, tenant_id, person_key, student_email, student_id, product_id, first_purchase_id, purchase_status, access_status, onboarding_status, progress_status, support_status, nps_status, certificate_status, next_purchase_status, ltv_commercial, metadata, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(1000),
    dataClient
      .from("norwyn_product_journey_edges")
      .select("id, tenant_id, from_product_id, to_product_id, relationship_type, status, observed_buyers, median_days_to_next, avg_days_to_next, revenue_after, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("observed_buyers", { ascending: false })
      .limit(500),
    dataClient
      .from("norwyn_lifecycle_eligibility_rules")
      .select("id, tenant_id, rule_key, version, name, source_product_id, target_product_id, exclusion_days, include_with_formation, status, rules, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_lifecycle_eligibility_runs")
      .select("id, tenant_id, rule_id, run_key, status, total, eligible, excluded, needs_review, summary, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(100),
    dataClient
      .from("norwyn_lifecycle_eligibility_members")
      .select("id, tenant_id, run_id, person_key, customer_hash, status, owned_product_ids, source_product_id, target_product_id, first_purchase_at, last_purchase_at, ltv_commercial, has_formation, eligibility_reasons, exclusion_reasons, confidence, evidence, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(1000),
    dataClient
      .from("norwyn_customer_offer_events")
      .select("id, tenant_id, person_key, customer_hash, journey_key, offer_key, channel, event_type, product_id, campaign_id, source_event_id, occurred_at, metadata, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    dataClient
      .from("norwyn_lifecycle_experiments")
      .select("id, tenant_id, experiment_key, name, hypothesis, target_cohort, offer, source_product_id, target_product_id, control_variant, test_variant, status, start_at, end_at, sample_size, eligibility_rule_id, exclusions, channels, metrics, result, confidence, conclusion, decision, learning_id, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_customer_channel_statuses")
      .select("id, tenant_id, person_key, customer_hash, email_status, whatsapp_status, instagram_manychat_status, commercial_block, commercial_block_reason, activecampaign_contact_id, activecampaign_status, email_policy_decision, email_policy_evidence, last_synced_at, sync_status, source, evidence, updated_at, created_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(2000),
    dataClient
      .from("norwyn_lifecycle_exposure_rules")
      .select("id, tenant_id, rule_key, journey_key, offer_key, version, cooldown_days, max_exposures, exit_on_purchase, exit_on_optout, exit_on_block, status, requires_human_approval, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_lifecycle_execution_approvals")
      .select("id, tenant_id, experiment_id, run_id, approval_key, status, channel, offer_key, sequence_key, total, eligible, ready_to_send, opted_out, commercial_blocked, unknown_consent, already_exposed, risks, exclusions, tracking, copy_status, approved_by, approved_at, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_channel_contact_policies")
      .select("id, tenant_id, policy_key, channel, version, status, allowed_statuses, blocked_statuses, review_required_statuses, requires_human_approval, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_lifecycle_message_drafts")
      .select("id, tenant_id, experiment_id, campaign_id, product_id, draft_key, journey_key, offer_key, channel, message_step, day_label, objective, subject, copy, cta, approval_status, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
    dataClient
      .from("norwyn_lifecycle_internal_test_contacts")
      .select("id, tenant_id, list_key, email, name, authorized, source, evidence, created_at, updated_at")
      .eq("tenant_id", membership.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(200),
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

  const { data: manychatCurrent } = await dataClient
    .from("manychat_inventory_current")
    .select("account_name, account_username, is_pro, timezone, collected_at, flows_count, growth_tools_count, tags_count, custom_fields_count")
    .eq("tenant_id", membership.tenant_id)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: telegramSchedules } = await dataClient
    .from("relatorio_agendamentos")
    .select("id, tenant_id, destinatario_id, nome, tipo_resumo, canal, frequencia, horario, timezone, ativo, updated_at")
    .eq("tenant_id", membership.tenant_id)
    .eq("canal", "telegram")
    .order("updated_at", { ascending: false })
    .limit(50);

  const { data: telegramSends } = await dataClient
    .from("relatorio_envios")
    .select("id, tenant_id, agendamento_id, destinatario_id, tipo_resumo, canal, status, assunto, erro, sent_at, created_at, updated_at")
    .eq("tenant_id", membership.tenant_id)
    .eq("canal", "telegram")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: instagramFollowerGrowthSummary } = account?.id
    ? await dataClient
        .from("instagram_follower_growth_summary")
        .select("tenant_id, account_id, latest_date, followers_current, net_growth_day, net_growth_7d, net_growth_30d, gain_days_30d, loss_days_30d, max_gain_day_30d, max_loss_day_30d, trend_followers_per_day_30d, trend_status, updated_at")
        .eq("tenant_id", membership.tenant_id)
        .eq("account_id", account.id)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: instagramFollowerDailyMetrics } = account?.id
    ? await dataClient
        .from("instagram_follower_daily_metrics")
        .select("tenant_id, account_id, snapshot_date, followers_total, followers_previous_day, net_change_day, source, updated_at")
        .eq("tenant_id", membership.tenant_id)
        .eq("account_id", account.id)
        .order("snapshot_date", { ascending: true })
        .limit(1000)
    : { data: [] };

  const updatedAt = [
    instagramFollowerGrowthSummary?.updated_at,
    instagramFollowerGrowthSummary?.latest_date,
    manychatCurrent?.collected_at,
    ...(telegramSchedules ?? []).map((item: any) => item.updated_at),
    ...(telegramSends ?? []).map((item: any) => item.sent_at ?? item.created_at ?? item.updated_at),
    ...(instagramFollowerDailyMetrics ?? []).map((metric: any) => metric.updated_at ?? metric.snapshot_date),
    ...(followerMetricsResult.data ?? []).map((metric: any) => metric.imported_at ?? metric.updated_at),
    ...(salesResult.data ?? []).map((sale: any) => sale.imported_at ?? sale.last_event_at),
    ...(adsResult.data ?? []).map((row: any) => row.imported_at ?? row.data_referencia),
    ...(funnelEventsResult.data ?? []).map((event: any) => event.occurred_at ?? event.created_at),
    ...(signalsResult.data ?? []).map((signal: any) => signal.updated_at),
    ...(contentEventsResult.data ?? []).map((event: any) => event.updated_at ?? event.published_at),
    ...(campaignsResult.data ?? []).map((campaign: any) => campaign.updated_at),
    ...(landingRegistryResult.data ?? []).map((landing: any) => landing.updated_at ?? landing.last_checked_at),
    ...(growthIncidentsResult.data ?? []).map((incident: any) => incident.last_observed_at ?? incident.detected_at),
    ...(growthPlaybookRulesResult.data ?? []).map((rule: any) => rule.updated_at),
    ...(campaignMaterialsResult.data ?? []).map((material: any) => material.updated_at),
    ...(contentCapturesResult.data ?? []).map((capture: any) => capture.updated_at ?? capture.created_at),
    ...(productExternalIdentitiesResult.data ?? []).map((identity: any) => identity.updated_at ?? identity.created_at),
    ...(timelineEventsResult.data ?? []).map((event: any) => event.occurred_at ?? event.created_at),
    ...(campaignLearningsResult.data ?? []).map((learning: any) => learning.updated_at ?? learning.created_at),
    ...(financeLancamentosResult.data ?? []).map((entry: any) => entry.updated_at ?? entry.data_pagamento),
    ...(relationshipReviewsResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(supportTicketsResult.data ?? []).map((item: any) => item.updated_at ?? item.opened_at),
    ...(certificateRequestsResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(partnerRulesResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(financialSettlementsResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(studentJourneysResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(productJourneyEdgesResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(lifecycleEligibilityRulesResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(lifecycleEligibilityRunsResult.data ?? []).map((item: any) => item.created_at),
    ...(lifecycleEligibilityMembersResult.data ?? []).map((item: any) => item.created_at),
    ...(customerOfferEventsResult.data ?? []).map((item: any) => item.occurred_at ?? item.created_at),
    ...(lifecycleExperimentsResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(customerChannelStatusesResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(lifecycleExposureRulesResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(lifecycleExecutionApprovalsResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(channelContactPoliciesResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(lifecycleMessageDraftsResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
    ...(lifecycleInternalTestContactsResult.data ?? []).map((item: any) => item.updated_at ?? item.created_at),
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
    user: {
      id: currentUser.id,
      email: currentUser.email ?? null,
      name: userName ?? currentUser.email ?? null,
      preferredName: preferredName ?? userName ?? currentUser.email ?? null,
    },
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    allowedModules,
    diagnostic: null,
    updatedAt,
    posts,
    interactions: interactionsResult.data ?? [],
    instagramFollowerGrowthSummary: instagramFollowerGrowthSummary ?? null,
    instagramFollowerDailyMetrics: instagramFollowerDailyMetrics ?? [],
    manychatSummary: manychatCurrent ?? null,
    telegramSchedules: telegramSchedules ?? [],
    telegramSends: telegramSends ?? [],
    commercialSales: salesResult.data ?? [],
    products: productsResult.data ?? [],
    businessProfile: businessProfileResult.data ?? null,
    taxRules: taxRulesResult.data ?? [],
    adsRows: (adsResult.data ?? []).map((row: any) => normalizeAdsDailyRow(row)),
    funnelEvents: funnelEventsResult.data ?? [],
    contentEvents: contentEventsResult.data ?? [],
    agendaEvents: agendaResult.data ?? [],
    atividades: atividadesResult.data ?? [],
    ocorrencias: ocorrenciasResult.data ?? [],
    objetivos,
    signals: signalsResult.data ?? [],
    campaigns: campaignsResult.data ?? [],
    landingRegistry: landingRegistryResult.data ?? [],
    growthIncidents: growthIncidentsResult.data ?? [],
    growthPlaybookRules: growthPlaybookRulesResult.data ?? [],
    campaignMaterials: campaignMaterialsResult.data ?? [],
    campaignMaterialVersions: campaignMaterialVersionsResult.data ?? [],
    campaignApprovals: campaignApprovalsResult.data ?? [],
    marketingQAReviews: marketingQAReviewsResult.data ?? [],
    marketingQAReviewItems: marketingQAReviewItemsResult.data ?? [],
    contentCaptures: contentCapturesResult.data ?? [],
    productExternalIdentities: productExternalIdentitiesResult.data ?? [],
    timelineEvents: timelineEventsResult.data ?? [],
    campaignLearnings: campaignLearningsResult.data ?? [],
    financeLancamentos: (financeLancamentosResult.data ?? []).map((entry: any) => ({
      id: entry.id,
      tenant_id: entry.tenant_id,
      data_pagamento: entry.data_pagamento,
      mes_competencia: entry.mes_competencia,
      tipo: entry.tipo,
      status: entry.status,
      centro_resultado_id: entry.centro_resultado_id,
      centro_resultado_nome: entry.centro?.nome ?? null,
      curso_id: entry.curso_id,
      curso_nome: entry.curso?.nome ?? null,
      descricao: entry.descricao,
      valor: Number(entry.valor ?? 0),
      origem: entry.origem,
      updated_at: entry.updated_at,
    })),
    relationshipReviews: relationshipReviewsResult.data ?? [],
    supportTickets: supportTicketsResult.data ?? [],
    certificateRequests: certificateRequestsResult.data ?? [],
    partnerRules: (partnerRulesResult.data ?? []).map((rule: any) => ({
      ...rule,
      percentage: rule.percentage == null ? null : Number(rule.percentage),
      fixed_amount: rule.fixed_amount == null ? null : Number(rule.fixed_amount),
    })),
    financialSettlements: (financialSettlementsResult.data ?? []).map((settlement: any) => ({
      ...settlement,
      value: Number(settlement.value ?? 0),
    })),
    studentJourneys: (studentJourneysResult.data ?? []).map((journey: any) => ({
      ...journey,
      ltv_commercial: Number(journey.ltv_commercial ?? 0),
    })),
    productJourneyEdges: (productJourneyEdgesResult.data ?? []).map((edge: any) => ({
      ...edge,
      observed_buyers: Number(edge.observed_buyers ?? 0),
      median_days_to_next: edge.median_days_to_next == null ? null : Number(edge.median_days_to_next),
      avg_days_to_next: edge.avg_days_to_next == null ? null : Number(edge.avg_days_to_next),
      revenue_after: Number(edge.revenue_after ?? 0),
    })),
    lifecycleEligibilityRules: lifecycleEligibilityRulesResult.data ?? [],
    lifecycleEligibilityRuns: (lifecycleEligibilityRunsResult.data ?? []).map((run: any) => ({
      ...run,
      total: Number(run.total ?? 0),
      eligible: Number(run.eligible ?? 0),
      excluded: Number(run.excluded ?? 0),
      needs_review: Number(run.needs_review ?? 0),
    })),
    lifecycleEligibilityMembers: (lifecycleEligibilityMembersResult.data ?? []).map((member: any) => ({
      ...member,
      ltv_commercial: Number(member.ltv_commercial ?? 0),
    })),
    customerOfferEvents: customerOfferEventsResult.data ?? [],
    lifecycleExperiments: (lifecycleExperimentsResult.data ?? []).map((experiment: any) => ({
      ...experiment,
      sample_size: experiment.sample_size == null ? null : Number(experiment.sample_size),
    })),
    customerChannelStatuses: customerChannelStatusesResult.data ?? [],
    lifecycleExposureRules: (lifecycleExposureRulesResult.data ?? []).map((rule: any) => ({
      ...rule,
      version: Number(rule.version ?? 1),
      cooldown_days: rule.cooldown_days == null ? null : Number(rule.cooldown_days),
      max_exposures: rule.max_exposures == null ? null : Number(rule.max_exposures),
    })),
    lifecycleExecutionApprovals: (lifecycleExecutionApprovalsResult.data ?? []).map((approval: any) => ({
      ...approval,
      total: Number(approval.total ?? 0),
      eligible: Number(approval.eligible ?? 0),
      ready_to_send: Number(approval.ready_to_send ?? 0),
      opted_out: Number(approval.opted_out ?? 0),
      commercial_blocked: Number(approval.commercial_blocked ?? 0),
      unknown_consent: Number(approval.unknown_consent ?? 0),
      already_exposed: Number(approval.already_exposed ?? 0),
    })),
    channelContactPolicies: (channelContactPoliciesResult.data ?? []).map((policy: any) => ({
      ...policy,
      version: Number(policy.version ?? 1),
    })),
    lifecycleMessageDrafts: lifecycleMessageDraftsResult.data ?? [],
    lifecycleInternalTestContacts: lifecycleInternalTestContactsResult.data ?? [],
  };
}





