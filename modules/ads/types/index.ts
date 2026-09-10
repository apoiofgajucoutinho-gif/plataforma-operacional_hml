export type AdsPerformanceStatus = "OK" | "CTR BAIXO" | "SATURADO" | "PUBLICO RUIM" | "UNKNOWN";

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
};