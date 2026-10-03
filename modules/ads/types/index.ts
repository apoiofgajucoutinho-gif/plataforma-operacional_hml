export type AdsPerformanceStatus = "OK" | "CTR BAIXO" | "SATURADO" | "PUBLICO RUIM" | "SEM_CLASSIFICACAO_AUTOMATICA" | "UNKNOWN";

export type AdsPeriodKey = "30d" | "90d" | "6m" | "12m" | "custom";
export type AdsGranularity = "day" | "week" | "month";

export type AdsPeriodContext = {
  key: AdsPeriodKey;
  start: string;
  end: string;
  label: string;
  granularity: AdsGranularity;
  isCustom: boolean;
};

export type AdsDailyRow = {
  id: string;
  data_referencia: string;
  campanha: string;
  conjunto: string | null;
  anuncio: string;
  status: string;
  objetivo: string | null;
  alcance: number;
  impressoes: number;
  cliques: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequencia: number;
  valor_gasto: number;
  conversoes: number;
  leads: number;
  performance_status: AdsPerformanceStatus;
  performance_score: number;
  imported_at: string;
  raw_payload?: Record<string, unknown> | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  effective_status?: string | null;
  creative_id?: string | null;
  creative_name?: string | null;
  placement?: string | null;
  publisher_platform?: string | null;
  device_platform?: string | null;
  link_clicks?: number | null;
  unique_link_clicks?: number | null;
  unique_link_ctr?: number | null;
  cost_per_unique_link_click?: number | null;
  unique_clicks?: number | null;
  outbound_clicks?: number | null;
  unique_outbound_clicks?: number | null;
  unique_ctr?: number | null;
  cost_per_unique_click?: number | null;
  landing_page_views?: number | null;
  cost_per_landing_page_view?: number | null;
  initiate_checkouts?: number | null;
  cost_per_checkout?: number | null;
  meta_purchases?: number | null;
  meta_purchase_value?: number | null;
  meta_purchase_roas?: number | null;
  cost_per_result?: number | null;
  quality_ranking?: string | null;
  engagement_rate_ranking?: string | null;
  conversion_rate_ranking?: string | null;
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
  audience_type?: string | null;
  audience_label?: string | null;
  targeting_summary?: string | null;
  audience_confidence?: string | null;
  audience_evidence?: unknown[] | null;
  creative_format?: string | null;
  creative_body?: string | null;
  creative_headline?: string | null;
  creative_description?: string | null;
  creative_cta?: string | null;
  creative_image_url?: string | null;
  creative_video_id?: string | null;
  creative_video_duration_seconds?: number | null;
  object_story_id?: string | null;
  instagram_permalink_url?: string | null;
  config_snapshot_hash?: string | null;
  origem?: string | null;
};

export type AdsConfigSnapshot = {
  id: string;
  entity_type: "campaign" | "adset" | "ad" | "creative" | "audience" | "video";
  entity_id: string;
  entity_name: string | null;
  parent_ids: Record<string, unknown>;
  config_hash: string;
  config_json: Record<string, unknown>;
  audience_type: string | null;
  audience_label: string | null;
  targeting_summary: string | null;
  audience_confidence: string | null;
  audience_evidence: unknown[] | null;
  source: string;
  graph_version: string;
  collector_version: string;
  first_seen_at: string;
  last_seen_at: string;
};

export type AdsReconciliationSummary = {
  campaignScope: {
    resolved: boolean;
    reason: string;
    campaignId: string | null;
    campaignName: string | null;
    metaCampaignId: string | null;
    landingKey: string | null;
    resolution: "exact_meta_id" | "unresolved";
  };
  site: {
    available: boolean;
    visitors: number | null;
    sessions: number | null;
    engagedSessions: number | null;
    averageSessionSeconds: number | null;
    source: string;
    limitation: string;
  };
  norwyn: {
    sessions: number | null;
    offerViews: number | null;
    checkoutClicks: number | null;
    attributedSessions: number | null;
    paidSocialSessions: number | null;
    source: string;
  };
  hotmart: {
    confirmedSales: number | null;
    attributedSales: number | null;
    confirmedRevenue: number | null;
    unattributedSales: number | null;
    attributionStatus: "confirmed" | "partial" | "meta_only" | "unattributed" | "unavailable";
    source: string;
    adAttributionAvailable: boolean;
  };
  measurement: {
    quality: "Boa" | "Parcial" | "Fraca";
    reasons: string[];
    trackingCoverage: number | null;
    freshnessImpact: string | null;
  };
  note: string;
};

export type AdsDecisionConfig = {
  minLinkClicksSignal: number;
  minLinkClicksDecision: number;
  reviewLinkClicksIncrement: number;
  reviewHours: number;
  minTrendDays: number;
  comparableSpendRatio: number;
  meaningfulSpend: number | null;
  targetCpa: number | null;
};

export type AdsCampaignProgress = {
  startsAt: string | null;
  endsAt: string | null;
  daysElapsed: number | null;
  daysRemaining: number | null;
  budget: number | null;
  spend: number;
  budgetUsedPct: number | null;
  periodUsedPct: number | null;
  averageDailySpend: number | null;
  expectedDailySpend: number | null;
  projectedSpend: number | null;
  pacingState: "dentro do ritmo" | "acima do ritmo" | "abaixo do ritmo" | "orçamento desconhecido";
  sourceUpdatedAt: string | null;
};

export type AdsFreshnessState = "Atualizado" | "Aguardando próxima coleta" | "Atrasado" | "Sem coleta recente" | "Não disponível";

export type AdsSourceFreshness = {
  key: "meta" | "hotmart" | "norwyn" | "ga4";
  label: string;
  lastUpdatedAt: string | null;
  status: AdsFreshnessState;
  detail: string;
  nextExpectedAt: string | null;
  nextExpectedLabel: string | null;
  ageMinutes: number | null;
};

export type AdsTrackingHealth = {
  quality: "Boa" | "Parcial" | "Fraca";
  reason: string;
  working: string[];
  missing: string[];
  impact: string;
  nextAction: string;
};

export type AdsOperationalAlert = {
  id: string;
  severity: "Informação" | "Atenção" | "Crítico";
  title: string;
  detail: string;
  review: string;
};

export type AdsJourneyStage = {
  key: string;
  label: string;
  sessions: number | null;
  rateFromPrevious: number | null;
  source: "Norwyn" | "Hotmart";
};

export type AdsOperations = {
  freshness: AdsSourceFreshness[];
  trackingHealth: AdsTrackingHealth;
  alerts: AdsOperationalAlert[];
  journey: AdsJourneyStage[];
  registry: {
    campaignResolved: boolean;
    metaCampaignId: string | null;
    campaignName: string | null;
    landingKey: string | null;
    productId: string | null;
    offerId: string | null;
    checkoutUrl: string | null;
    pixelId: string | null;
    version: string | null;
  };
  destination: {
    metaUrl: string | null;
    metaDomain: string | null;
    canonicalUrl: string | null;
    canonicalDomain: string | null;
    diverges: boolean;
  };
  journeyHealth: {
    status: "Saudável" | "Atenção" | "Crítico" | "Aguardando dados";
    operational: "Saudável" | "Atenção" | "Crítico" | "Aguardando dados";
    measurement: "Boa" | "Parcial" | "Fraca";
    reasons: string[];
    lastCheckedAt: string | null;
  };
  coverage: {
    sessions: number;
    campaignIdSessions: number;
    adsetIdSessions: number;
    adIdSessions: number;
    fbclidSessions: number;
    sckSessions: number;
    bridgeKeys: number;
    bridgeKeysWithAd: number;
    hotmartWithSourceSck: number;
  };
  intradayDelta: {
    available: boolean;
    since: string | null;
    spend: number | null;
    linkClicks: number | null;
    checkouts: number | null;
    metaPurchases: number | null;
    confirmedSales: number | null;
    reason: string;
    collectedAt: string | null;
    perAd: Array<{
      adId: string | null;
      adName: string;
      spend: number;
      impressions: number;
      clicks: number;
      linkClicks: number;
      outbound: number;
      lpv: number;
      checkouts: number;
      metaPurchases: number;
    }>;
  };
};

export type AdsDecisionMemory = {
  id: string;
  campaignId: string | null;
  metaCampaignId: string | null;
  detected: string;
  recommended: string;
  actionTaken: string | null;
  result: string | null;
  evidence: Record<string, unknown>;
  confidence: string;
  updatedAt: string;
};

export type AdsContext = {
  tenant: {
    id: string;
    nome: string;
  } | null;
  rows: AdsDailyRow[];
  updatedAt: string | null;
  role: string | null;
  diagnostic: string | null;
  allowedModules: string[];
  period: AdsPeriodContext;
  configSnapshots: AdsConfigSnapshot[];
  reconciliation: AdsReconciliationSummary;
  decisionMemory: AdsDecisionMemory[];
  decisionConfig: AdsDecisionConfig;
  campaignProgress: AdsCampaignProgress;
  operations: AdsOperations;
};
