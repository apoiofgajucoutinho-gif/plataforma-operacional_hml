import type { InstagramInteraction, InstagramPostMetric } from "@/modules/instagram/types";

export type NorwynCommercialSale = {
  id: string;
  transaction_id: string | null;
  produto_nome: string | null;
  comprador_email: string | null;
  status_original: string | null;
  status_normalizado: string | null;
  grupo_comercial: string | null;
  forma_pagamento: string | null;
  valor_bruto: number | null;
  data_compra: string | null;
  data_aprovacao: string | null;
  source_sck: string | null;
  imported_at: string | null;
  last_event_at: string | null;
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
  productName: string | null;
  associatedProducts: string[];
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

export type NorwynContext = {
  role?: string | null;
  tenant: { id: string; nome: string } | null;
  allowedModules: string[];
  diagnostic: string | null;
  updatedAt: string | null;
  posts: InstagramPostMetric[];
  interactions: InstagramInteraction[];
  commercialSales: NorwynCommercialSale[];
  adsRows: NorwynAdsRow[];
  contentEvents: NorwynContentEvent[];
  agendaEvents: StrategyAgendaEvent[];
  atividades: StrategyAtividadeTask[];
  ocorrencias: StrategyOcorrencia[];
  objetivos: StrategyObjetivo[];
  signals: NorwynSignal[];
};
