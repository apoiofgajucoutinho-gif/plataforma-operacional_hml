import type { InstagramFollowerDailyMetric, InstagramFollowerGrowthSummary, InstagramInteraction, InstagramPostMetric } from "@/modules/instagram/types";
import type { ContentCaptureStatus } from "./content-capture-status";
import type { LandingApprovalSummary } from "@/modules/landing-pages/types";

export type NorwynCommercialSale = {
  id: string;
  transaction_id: string | null;
  produto_id: string | null;
  hotmart_product_id: string | null;
  produto_nome: string | null;
  comprador_nome?: string | null;
  comprador_email: string | null;
  status_original: string | null;
  status_normalizado: string | null;
  grupo_comercial: string | null;
  commercial_transaction?: boolean | null;
  sale_confirmed?: boolean | null;
  revenue_eligible?: boolean | null;
  student_eligible?: boolean | null;
  sale_comparable?: boolean | null;
  event_class?: string | null;
  forma_pagamento: string | null;
  moeda?: string | null;
  valor_bruto: number | null;
  data_compra: string | null;
  data_aprovacao: string | null;
  data_reembolso?: string | null;
  source_sck: string | null;
  imported_at: string | null;
  last_event_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type NorwynAdsRow = {
  id: string;
  data_referencia: string;
  campanha: string | null;
  conjunto: string | null;
  anuncio: string | null;
  status: string | null;
  alcance: number | null;
  impressoes: number | null;
  cliques: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  frequencia: number | null;
  valor_gasto: number | null;
  conversoes: number | null;
  leads: number | null;
  performance_status: string | null;
  performance_score: number | null;
  imported_at?: string | null;
  raw_payload?: Record<string, unknown> | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  creative_id?: string | null;
  creative_name?: string | null;
  placement?: string | null;
  publisher_platform?: string | null;
  device_platform?: string | null;
  link_clicks?: number | null;
  landing_page_views?: number | null;
  initiate_checkouts?: number | null;
  meta_purchases?: number | null;
  meta_purchase_value?: number | null;
  cost_per_result?: number | null;
  video_views?: number | null;
  video_plays_3s?: number | null;
  video_p25?: number | null;
  video_p50?: number | null;
  video_p75?: number | null;
  video_p95?: number | null;
  video_p100?: number | null;
  thruplays?: number | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  destination_url?: string | null;
  destination_domain?: string | null;
  url_tags?: string | null;
  landing_key?: string | null;
};

export type NorwynFunnelEventType =
  | "LANDING_VIEW"
  | "CTA_VIEW"
  | "CTA_CLICK"
  | "CHECKOUT_REDIRECT"
  | "VSL_PLAY"
  | "VSL_PROGRESS_25"
  | "VSL_PROGRESS_50"
  | "VSL_PROGRESS_75"
  | "VSL_PROGRESS_90"
  | "CTA"
  | "VSL_CTA_VIEW"
  | "VSL_CTA_CLICK"
  | "CHECKOUT"
  | "CHECKOUT_VIEW"
  | "PURCHASE"
  | "ORDER_BUMP"
  | "UPSELL"
  | "DOWNSELL"
  | "TEST_DESTINATION_VIEW";

export type NorwynFunnelEvent = {
  id: string;
  tenant_id: string;
  funnel_session_id: string;
  event_type: NorwynFunnelEventType;
  environment: "production" | "test";
  occurred_at: string;
  product_id: string | null;
  campaign_id: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  meta_creative_id: string | null;
  campaign_key: string | null;
  audience_key: string | null;
  creative_key: string | null;
  source_sck: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  click_id: string | null;
  page_url: string | null;
  provider: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NorwynContentEvent = {
  id: string;
  tenant_id: string;
  source: string;
  source_id: string;
  event_type: string;
  subtype: string | null;
  title: string | null;
  caption: string | null;
  published_at: string;
  influence_hours: number;
  mission_id: string | null;
  campaign_id: string | null;
  product_tags: string[] | null;
  theme_tags: string[] | null;
  objective: string | null;
  funnel_stage: string | null;
  cta: string | null;
  performance_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type NorwynProductAlias = {
  id: string;
  alias: string;
  produto_base: string | null;
  origem: string | null;
  confianca: number | null;
  principal: boolean | null;
  ativo: boolean | null;
  source: string | null;
  manually_edited_at: string | null;
};

export type NorwynProductComponent = {
  id: string;
  componente: string;
  categoria: string | null;
  ordem: number | null;
  duracao: number | null;
  unidade_duracao: string | null;
  link: string | null;
  observacoes: string | null;
  ativo: boolean | null;
  source: string | null;
  manually_edited_at: string | null;
};

export type NorwynProductBatch = {
  id: string;
  turma: string;
  inicio: string | null;
  fim: string | null;
  status: string | null;
  meta_alunos: number | null;
  alunos: number | null;
  receita_meta: number | null;
  receita_real: number | null;
  observacoes: string | null;
  ativo: boolean | null;
  source: string | null;
  manually_edited_at: string | null;
};

export type NorwynProduct = {
  id: string;
  tenant_id: string;
  nome_oficial: string;
  produto_base: string;
  categoria: string | null;
  fiscal_category: string | null;
  financial_notes: string | null;
  descricao: string | null;
  status: string | null;
  tipo: string | null;
  preco_oficial: number | null;
  duracao: number | null;
  unidade_duracao: string | null;
  link_oferta: string | null;
  percentual_coproducao: number | null;
  percentual_hotmart: number | null;
  percentual_gateway: number | null;
  percentual_imposto: number | null;
  receita_liquida_estimada_pct: number | null;
  observacoes: string | null;
  ativo: boolean | null;
  source: string | null;
  manually_edited_at: string | null;
  metadata: Record<string, unknown> | null;
  product_aliases?: NorwynProductAlias[];
  product_components?: NorwynProductComponent[];
  product_batches?: NorwynProductBatch[];
};

export type NorwynBusinessProfile = {
  id: string;
  tenant_id: string;
  company_name: string;
  cnpj: string | null;
  tax_regime: string | null;
  default_coproduction_percent: number | null;
  hotmart_percent_fee: number | null;
  hotmart_fixed_fee: number | null;
  hotmart_withdraw_fee: number | null;
  gateway_percent_fee: number | null;
  observations: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  source: string | null;
  source_key: string | null;
  manually_edited_at: string | null;
};

export type NorwynBusinessTaxRule = {
  id: string;
  tenant_id: string;
  business_profile_id: string;
  category: string;
  cnae: string | null;
  tax_percent: number | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  observations: string | null;
  source: string | null;
  source_key: string | null;
  manually_edited_at: string | null;
};

export type NorwynEvidenceCard = {
  id: string;
  title: string;
  source: "Instagram" | "Comercial" | "Ads" | "Signals" | "Shadow Mode" | "Knowledge Base" | "Launch Pattern";
  description: string;
  details: string[];
  confidence: number;
  impact: "Baixo" | "Medio" | "Alto" | "Influencia Potencial";
  metricLabel?: string;
  metricValue?: string;
  relatedProduct?: string | null;
  relatedContentId?: string | null;
};

export type NorwynEvidenceInsight = {
  id: string;
  title: string;
  interpretation: string;
  confidence: number;
  sourceCount: number;
  action: string;
  relatedRecommendationId?: string | null;
  evidenceCards: NorwynEvidenceCard[];
};

export type NorwynLaunchPattern = {
  id: string;
  contentEventId: string;
  contentTitle: string;
  contentCaption: string | null;
  permalink: string | null;
  imageUrl: string | null;
  missionId: string | null;
  campaignId: string | null;
  format: string;
  publishedAt: string;
  influenceHours: number;
  normalizedProductId?: string | null;
  productBaseName?: string | null;
  productName: string | null;
  associatedProducts: string[];
  themeTags?: string[];
  funnelStage?: string | null;
  transactionIds: string[];
  transactionRevenue: Array<{ id: string; value: number }>;
  productMatchScore: number;
  influenceScore: number;
  influenceLevel: "Baixa" | "Media" | "Alta" | "Influencia Potencial";
  salesInWindow: number;
  revenueInWindow: number;
  performanceSnapshot: Record<string, unknown> | null;
  evidenceCards: NorwynEvidenceCard[];
};

export type NorwynEvidenceRecommendation = {
  id: string;
  title: string;
  objective: string;
  relatedMission: string | null;
  expectedImpact: string;
  confidence: number;
  priority: "Baixa" | "Media" | "Alta";
  nextStep: string;
  kpis: string[];
  evidenceCards: NorwynEvidenceCard[];
  productName: string | null;
  suggestedFormat: string;
};

export type StrategyAgendaEvent = {
  id: string;
  titulo: string;
  tipo: string | null;
  inicio: string;
  fim: string;
  status: string | null;
};

export type StrategyAtividadeTask = {
  id: string;
  titulo: string;
  time_responsavel: string | null;
  status: string | null;
  prioridade: string | null;
  prazo: string | null;
  campaign_id?: string | null;
  source_module?: string | null;
  source_event?: string | null;
  product_id?: string | null;
  person_id?: string | null;
  student_id?: string | null;
  content_id?: string | null;
  incident_id?: string | null;
  due_at?: string | null;
  approval_required?: boolean | null;
  blocked_reason?: string | null;
  waiting_on?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type StrategyOcorrencia = {
  id: string;
  erro_motivo: string;
  categoria: string | null;
  prioridade: string | null;
  status: string | null;
  impacto_cliente: string | null;
};

export type StrategyObjetivo = {
  id: string;
  titulo: string;
  indicador_key: string | null;
  status: string | null;
  percentual_atingido: number | null;
  plano_acao: string | null;
};

export type NorwynSignalProvider =
  | "manual"
  | "calendar"
  | "instagram"
  | "hotmart"
  | "ads"
  | "shadow"
  | "news"
  | "google_trends"
  | "youtube"
  | "tiktok"
  | "system";

export type NorwynSignalStatus = "draft" | "active" | "upcoming" | "expired" | "ignored" | "used" | "archived";
export type NorwynSignalPriority = "low" | "medium" | "high" | "critical";

export type NorwynSignal = {
  id: string;
  tenant_id: string;
  provider: NorwynSignalProvider;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: NorwynSignalPriority;
  impact_score: number;
  compatibility_score: number;
  urgency_score: number;
  confidence_score: number;
  final_score: number;
  status: NorwynSignalStatus;
  suggested_angle: string | null;
  suggested_action: string | null;
  recommended_tone: string | null;
  avoid_tone: string | null;
  mission_tags: string[];
  product_tags: string[];
  audience_tags: string[];
  content_format_suggestions: string[];
  source_name: string | null;
  source_url: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NorwynCampaign = {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  objective_id: string | null;
  mission_external_key: string | null;
  product_id: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  target_sales: number | null;
  target_revenue: number | null;
  plan_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynCampaignMaterial = {
  id: string;
  tenant_id: string;
  campaign_id: string;
  material_type: string;
  title: string;
  status: string;
  channel: string | null;
  current_version_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynCampaignMaterialVersion = {
  id: string;
  tenant_id: string;
  campaign_id: string;
  material_id: string;
  version_number: number;
  title: string;
  content: string;
  change_note: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NorwynCampaignApproval = {
  id: string;
  tenant_id: string;
  campaign_id: string;
  material_id: string;
  version_id: string;
  approver_id: string | null;
  approver_name: string | null;
  status: string;
  decided_at: string | null;
  observation: string | null;
  created_at: string;
  updated_at: string;
};

export type NorwynLandingRegistry = {
  id: string;
  tenant_id: string;
  campaign_key: string;
  landing_key: string;
  landing_name: string;
  landing_version: string;
  url: string;
  product_id: string | null;
  hotmart_product_id: string | null;
  environment: string;
  status: string;
  operation_mode?: "SHADOW" | "ASSISTED" | "NORWYN_OWNED" | null;
  external_owner?: string | null;
  next_check_at?: string | null;
  monitor_frequency_minutes?: number | null;
  metadata: Record<string, unknown>;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NorwynGrowthIncident = {
  id: string;
  tenant_id: string;
  incident_key: string;
  title: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "BLOCKER";
  status: string;
  operation_mode: string;
  external_owner: string | null;
  detected_at: string;
  first_observed_at: string | null;
  last_observed_at: string | null;
  confirmed_impact: Record<string, unknown>;
  potential_impact_data: Record<string, unknown>;
  unknowns: unknown[];
  prevention_rule: string | null;
  preflight_rule: string | null;
  automation_opportunity: string | null;
};

export type NorwynGrowthPlaybookRule = {
  id: string;
  tenant_id: string;
  rule_key: string;
  category: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "BLOCKER";
  title: string;
  rule: string;
  source_incident_id: string | null;
  evidence: Record<string, unknown>;
  status: string;
  version: string;
  created_at: string;
  updated_at: string;
};

export type NorwynMarketingQAReviewStatus =
  | "pending"
  | "processing"
  | "approved"
  | "approved_with_warnings"
  | "changes_required"
  | "blocked"
  | "failed";

export type NorwynMarketingQAReview = {
  id: string;
  tenant_id: string;
  campaign_id: string;
  material_id: string;
  material_version_id: string;
  reviewer_type: "ai" | "human" | "hybrid";
  provider: string;
  model: string | null;
  status: NorwynMarketingQAReviewStatus;
  overall_score: number | null;
  summary: string | null;
  blocking_reasons: string[];
  warnings: string[];
  suggested_content: string | null;
  input_size: number;
  duration_ms: number | null;
  success: boolean;
  error_message: string | null;
  usage_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

export type NorwynMarketingQAReviewItem = {
  id: string;
  tenant_id: string;
  review_id: string;
  category: string;
  severity: "info" | "warning" | "critical";
  status: "passed" | "failed" | "not_applicable";
  title: string;
  description: string | null;
  evidence: string | null;
  suggested_fix: string | null;
  field_reference: string | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NorwynContentCapture = {
  id: string;
  tenant_id: string;
  title: string;
  capture_type: "video" | "audio";
  drive_url: string;
  status: ContentCaptureStatus;
  product_id: string | null;
  mission_id: string | null;
  campaign_id: string | null;
  objective_id: string | null;
  description: string | null;
  summary: string | null;
  transcript: string | null;
  transcript_source: string | null;
  transcript_status: string | null;
  transcript_segments: Array<Record<string, unknown>>;
  source_title: string | null;
  source_description: string | null;
  source_chapters: Array<Record<string, unknown>>;
  transcript_full_text: string | null;
  transcript_quality: Record<string, unknown>;
  file_id: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  topics: string[];
  pain_points: string[];
  objections: string[];
  cases: string[];
  quotes: string[];
  cta: string[];
  products_detected: Array<Record<string, unknown>>;
  related_missions: string[];
  tags: string[];
  knowledge_generated: Record<string, unknown>;
  similar_content: Array<Record<string, unknown>>;
  similar_campaigns: Array<Record<string, unknown>>;
  winning_plays: Array<Record<string, unknown>>;
  provider: string | null;
  model: string | null;
  duration_ms: number | null;
  success: boolean;
  error_message: string | null;
  usage_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  processing_metadata: Record<string, unknown>;
  result_version: number | null;
  result_versions: Array<Record<string, unknown>>;
  primary_product_id: string | null;
  manually_selected_product_id: string | null;
  confidence: number | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NorwynProductExternalIdentity = {
  id: string;
  tenant_id: string;
  product_id: string | null;
  product_key: string;
  source: string;
  external_id: string | null;
  external_name: string | null;
  relationship: "MAIN_PRODUCT" | "BUNDLE" | "ORDER_BUMP" | "UPSELL" | "DOWNSELL" | "RELATED_PRODUCT" | "LEGACY_PRODUCT";
  revenue_scope: "REVENUE_DIRECT" | "REVENUE_RELATED" | "EXCLUDED";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  evidence: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
};

export type NorwynTimelineEvent = {
  id: string;
  tenant_id: string;
  event_type: string;
  title: string;
  occurred_at: string | null;
  source_module: string;
  source_id: string | null;
  product_id: string | null;
  campaign_id: string | null;
  person_id: string | null;
  student_id: string | null;
  activity_id: string | null;
  content_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NorwynCampaignLearning = {
  id: string;
  tenant_id: string;
  campaign_id: string | null;
  product_id: string | null;
  content_id: string | null;
  learning_type: "WHAT_WORKED" | "WHAT_DID_NOT" | "WHAT_TO_REPEAT" | "WHAT_TO_TEST";
  title: string;
  detail: string | null;
  evidence: Record<string, unknown>;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  status: string;
  created_at: string;
  updated_at: string;
};

export type NorwynFinanceLancamento = {
  id: string;
  tenant_id: string;
  data_pagamento: string;
  mes_competencia: string;
  tipo: "entrada" | "saida";
  status: string;
  centro_resultado_id: string;
  centro_resultado_nome: string | null;
  curso_id: string | null;
  curso_nome: string | null;
  descricao: string;
  valor: number;
  origem: string;
  updated_at: string;
};

export type NorwynRelationshipReview = {
  id: string;
  tenant_id: string;
  source: "hotmart" | "ads" | "directs" | "content" | "support";
  external_id: string | null;
  external_value: string;
  suggested_product_id: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  evidence: Record<string, unknown>;
  cause: string;
  recoverable: boolean;
  status: "pending" | "confirmed" | "changed" | "kept_unknown" | "auto_resolved";
  resolved_product_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NorwynSupportTicket = {
  id: string;
  tenant_id: string;
  person_key: string | null;
  student_email: string | null;
  student_id: string | null;
  product_id: string | null;
  topic: string;
  status: "open" | "waiting_student" | "waiting_third_party" | "resolved" | "closed";
  priority: "critical" | "high" | "medium" | "low";
  assigned_to: string | null;
  opened_at: string;
  resolved_at: string | null;
  resolution: string | null;
  activity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynCertificateRequest = {
  id: string;
  tenant_id: string;
  person_key: string | null;
  student_email: string | null;
  student_id: string | null;
  product_id: string | null;
  request_date: string;
  evidence_reference: string | null;
  status: "REQUEST_RECEIVED" | "TASK_RYAN_CREATED" | "WAITING_UNIVERSITY" | "READY_TO_SEND" | "SENT" | "CLOSED";
  activity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynPartnerRule = {
  id: string;
  tenant_id: string;
  partner: string;
  scope_type: "product" | "campaign" | "global";
  product_id: string | null;
  campaign_id: string | null;
  valid_from: string;
  valid_to: string | null;
  calculation_type: "percentage" | "fixed_amount" | "manual";
  percentage: number | null;
  fixed_amount: number | null;
  calculation_basis: string;
  status: "draft" | "active" | "inactive" | "expired";
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynFinancialSettlement = {
  id: string;
  tenant_id: string;
  finance_lancamento_id: string | null;
  provider: string;
  period_start: string | null;
  period_end: string | null;
  settlement_reference: string | null;
  value: number;
  status: "RECONCILED" | "PARTIAL" | "UNRECONCILED";
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynStudentJourney = {
  id: string;
  tenant_id: string;
  person_key: string;
  student_email: string | null;
  student_id: string | null;
  product_id: string | null;
  first_purchase_id: string | null;
  purchase_status: string;
  access_status: string;
  onboarding_status: string;
  progress_status: string;
  support_status: string;
  nps_status: string;
  certificate_status: string;
  next_purchase_status: string;
  ltv_commercial: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynProductJourneyEdge = {
  id: string;
  tenant_id: string;
  from_product_id: string | null;
  to_product_id: string | null;
  relationship_type: "cross_sell" | "ascension" | "retention" | "bundle" | "unknown";
  status: "OBSERVED" | "HYPOTHESIS" | "APPROVED_STRATEGY";
  observed_buyers: number;
  median_days_to_next: number | null;
  avg_days_to_next: number | null;
  revenue_after: number;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynLifecycleEligibilityRule = {
  id: string;
  tenant_id: string;
  rule_key: string;
  version: number;
  name: string;
  source_product_id: string | null;
  target_product_id: string | null;
  exclusion_days: number;
  include_with_formation: boolean;
  status: "draft" | "active" | "paused" | "archived";
  rules: Record<string, unknown>;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynLifecycleEligibilityRun = {
  id: string;
  tenant_id: string;
  rule_id: string | null;
  run_key: string;
  status: "DRY_RUN" | "APPROVED" | "EXECUTED" | "CANCELLED";
  total: number;
  eligible: number;
  excluded: number;
  needs_review: number;
  summary: Record<string, unknown>;
  created_at: string;
};

export type NorwynLifecycleEligibilityMember = {
  id: string;
  tenant_id: string;
  run_id: string;
  person_key: string;
  customer_hash: string;
  status: "ELIGIBLE" | "EXCLUDED" | "NEEDS_REVIEW";
  owned_product_ids: string[];
  source_product_id: string | null;
  target_product_id: string | null;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  ltv_commercial: number;
  has_formation: boolean;
  eligibility_reasons: unknown[];
  exclusion_reasons: unknown[];
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  evidence: Record<string, unknown>;
  created_at: string;
};

export type NorwynCustomerOfferEvent = {
  id: string;
  tenant_id: string;
  person_key: string;
  customer_hash: string;
  journey_key: string | null;
  offer_key: string | null;
  channel: string | null;
  event_type: string;
  product_id: string | null;
  campaign_id: string | null;
  source_event_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NorwynLifecycleExperiment = {
  id: string;
  tenant_id: string;
  experiment_key: string;
  name: string;
  hypothesis: string;
  target_cohort: string;
  offer: string;
  source_product_id: string | null;
  target_product_id: string | null;
  control_variant: string | null;
  test_variant: string | null;
  status: "planned" | "approved" | "running" | "completed" | "inconclusive" | "cancelled";
  start_at: string | null;
  end_at: string | null;
  sample_size: number | null;
  eligibility_rule_id: string | null;
  exclusions: unknown[];
  channels: unknown[];
  metrics: Record<string, unknown>;
  result: Record<string, unknown>;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  conclusion: string | null;
  decision: string | null;
  learning_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NorwynCustomerChannelStatus = {
  id: string;
  tenant_id: string;
  person_key: string;
  customer_hash: string;
  email_status: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN";
  whatsapp_status: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN";
  instagram_manychat_status: "AVAILABLE" | "BLOCKED" | "UNKNOWN";
  commercial_block: boolean;
  commercial_block_reason: string | null;
  activecampaign_contact_id: string | null;
  activecampaign_status: "ACTIVE_SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "SUPPRESSED" | "NOT_FOUND" | "UNKNOWN" | "NOT_SYNCED";
  email_policy_decision: "ALLOWED" | "BLOCKED" | "REVIEW_REQUIRED";
  email_policy_evidence: Record<string, unknown>;
  last_synced_at: string | null;
  sync_status: "OK" | "ERROR" | "NOT_CONFIGURED" | "PARTIAL" | "TEST_ONLY";
  source: string;
  evidence: Record<string, unknown>;
  updated_at: string;
  created_at: string;
};

export type NorwynLifecycleExposureRule = {
  id: string;
  tenant_id: string;
  rule_key: string;
  journey_key: string;
  offer_key: string;
  version: number;
  cooldown_days: number | null;
  max_exposures: number | null;
  exit_on_purchase: boolean;
  exit_on_optout: boolean;
  exit_on_block: boolean;
  status: "draft" | "active" | "paused" | "archived";
  requires_human_approval: boolean;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynLifecycleExecutionApproval = {
  id: string;
  tenant_id: string;
  experiment_id: string | null;
  run_id: string | null;
  approval_key: string;
  status: "review_required" | "ready_to_approve" | "approved" | "rejected" | "executed" | "cancelled";
  channel: string;
  offer_key: string;
  sequence_key: string | null;
  total: number;
  eligible: number;
  ready_to_send: number;
  opted_out: number;
  commercial_blocked: number;
  unknown_consent: number;
  already_exposed: number;
  risks: unknown[];
  exclusions: unknown[];
  tracking: Record<string, unknown>;
  copy_status: "draft_required" | "draft_ready" | "juliana_approved";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NorwynChannelContactPolicy = {
  id: string;
  tenant_id: string;
  policy_key: string;
  channel: string;
  version: number;
  status: "draft" | "active" | "paused" | "archived";
  allowed_statuses: string[];
  blocked_statuses: string[];
  review_required_statuses: string[];
  requires_human_approval: boolean;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynLifecycleMessageDraft = {
  id: string;
  tenant_id: string;
  experiment_id: string | null;
  campaign_id: string | null;
  product_id: string | null;
  draft_key: string;
  journey_key: string;
  offer_key: string;
  channel: string;
  message_step: string;
  day_label: string;
  objective: string;
  subject: string | null;
  copy: string;
  cta: string | null;
  approval_status: "DRAFT" | "READY_FOR_REVIEW" | "JULIANA_APPROVED" | "REJECTED";
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynLifecycleInternalTestContact = {
  id: string;
  tenant_id: string;
  list_key: string;
  email: string;
  name: string | null;
  authorized: boolean;
  source: string;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NorwynContext = {
  role?: string | null;
  user: { id: string; email: string | null; name: string | null; preferredName: string | null } | null;
  tenant: { id: string; nome: string } | null;
  allowedModules: string[];
  diagnostic: string | null;
  updatedAt: string | null;
  posts: InstagramPostMetric[];
  interactions: InstagramInteraction[];
  instagramFollowerGrowthSummary: InstagramFollowerGrowthSummary | null;
  instagramFollowerDailyMetrics: InstagramFollowerDailyMetric[];
  commercialSales: NorwynCommercialSale[];
  products: NorwynProduct[];
  businessProfile: NorwynBusinessProfile | null;
  taxRules: NorwynBusinessTaxRule[];
  adsRows: NorwynAdsRow[];
  funnelEvents: NorwynFunnelEvent[];
  contentEvents: NorwynContentEvent[];
  agendaEvents: StrategyAgendaEvent[];
  atividades: StrategyAtividadeTask[];
  ocorrencias: StrategyOcorrencia[];
  objetivos: StrategyObjetivo[];
  signals: NorwynSignal[];
  campaigns: NorwynCampaign[];
  landingRegistry: NorwynLandingRegistry[];
  landingApprovals: LandingApprovalSummary[];
  growthIncidents: NorwynGrowthIncident[];
  growthPlaybookRules: NorwynGrowthPlaybookRule[];
  campaignMaterials: NorwynCampaignMaterial[];
  campaignMaterialVersions: NorwynCampaignMaterialVersion[];
  campaignApprovals: NorwynCampaignApproval[];
  marketingQAReviews: NorwynMarketingQAReview[];
  marketingQAReviewItems: NorwynMarketingQAReviewItem[];
  contentCaptures: NorwynContentCapture[];
  productExternalIdentities: NorwynProductExternalIdentity[];
  timelineEvents: NorwynTimelineEvent[];
  campaignLearnings: NorwynCampaignLearning[];
  financeLancamentos: NorwynFinanceLancamento[];
  relationshipReviews: NorwynRelationshipReview[];
  supportTickets: NorwynSupportTicket[];
  certificateRequests: NorwynCertificateRequest[];
  partnerRules: NorwynPartnerRule[];
  financialSettlements: NorwynFinancialSettlement[];
  studentJourneys: NorwynStudentJourney[];
  productJourneyEdges: NorwynProductJourneyEdge[];
  lifecycleEligibilityRules: NorwynLifecycleEligibilityRule[];
  lifecycleEligibilityRuns: NorwynLifecycleEligibilityRun[];
  lifecycleEligibilityMembers: NorwynLifecycleEligibilityMember[];
  customerOfferEvents: NorwynCustomerOfferEvent[];
  lifecycleExperiments: NorwynLifecycleExperiment[];
  customerChannelStatuses: NorwynCustomerChannelStatus[];
  lifecycleExposureRules: NorwynLifecycleExposureRule[];
  lifecycleExecutionApprovals: NorwynLifecycleExecutionApproval[];
  channelContactPolicies: NorwynChannelContactPolicy[];
  lifecycleMessageDrafts: NorwynLifecycleMessageDraft[];
  lifecycleInternalTestContacts: NorwynLifecycleInternalTestContact[];
  manychatSummary: Record<string, any> | null;
  telegramSchedules: Array<Record<string, any>>;
  telegramSends: Array<Record<string, any>>;
};




