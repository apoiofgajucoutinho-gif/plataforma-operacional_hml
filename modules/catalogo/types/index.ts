export type CatalogOfferType = "produto_individual" | "combo" | "upsell" | "downsell" | "order_bump" | "evento" | "oferta_especial" | "outro";
export type CatalogCommercialStatus = "rascunho" | "ativo" | "pausado" | "desativado" | "substituido";
export type CatalogTechnicalHealth = "funcionando" | "redirecionando" | "quebrado" | "indisponivel" | "nao_verificado";
export type CatalogAttributionConfidence = "alta" | "media" | "baixa" | "nao_atribuivel";
export type CatalogDataQualityStatus = "trusted" | "partial" | "review" | "insufficient_data";

export type CatalogProduct = {
  id: string;
  tenant_id: string;
  name: string;
  normalized_name: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CatalogOffer = {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  normalized_name: string;
  offer_type: CatalogOfferType;
  included_products: string[];
  platform: string;
  current_price: number | null;
  max_installments: number | null;
  smart_installments: string;
  access_time: string;
  warranty: string;
  has_coparticipation: boolean | null;
  partner: string | null;
  coparticipation_percent: number | null;
  use_type: string;
  commercial_status: CatalogCommercialStatus;
  responsible: string | null;
  activated_at: string | null;
  notes: string | null;
  campaign_name: string | null;
  audience: string | null;
  lead_origin: string | null;
  special_rule: string | null;
  data_quality_status: CatalogDataQualityStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CatalogSalesLink = {
  id: string;
  tenant_id: string;
  product_id: string;
  offer_id: string;
  checkout_url: string;
  normalized_url: string;
  platform: string;
  hotmart_product_id: string | null;
  hotmart_offer_id: string | null;
  technical_health: CatalogTechnicalHealth;
  last_checked_at: string | null;
  presence_asset_id: string | null;
  is_main_link: boolean;
  replaced_link_id: string | null;
  attribution_confidence: CatalogAttributionConfidence;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CatalogHistoryEvent = {
  id: string;
  tenant_id: string;
  product_id: string | null;
  offer_id: string | null;
  sales_link_id: string | null;
  event_type: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  actor_id: string | null;
  actor_label: string | null;
  created_at: string;
};

export type CatalogRow = {
  product: CatalogProduct;
  offer: CatalogOffer;
  link: CatalogSalesLink;
  performance?: {
    confirmed_sales: number | null;
    revenue_brl: number | null;
    average_ticket_brl: number | null;
    refunds: number | null;
    clicks: number | null;
    attribution_confidence: CatalogAttributionConfidence;
  } | null;
};

export type CatalogContext = {
  tenant: { id: string; nome: string } | null;
  userEmail: string | null;
  role: string | null;
  allowedModules: string[];
  canEdit: boolean;
  canSeeTechnical: boolean;
  diagnostic: string | null;
  updatedAt: string | null;
  products: CatalogProduct[];
  offers: CatalogOffer[];
  links: CatalogSalesLink[];
  rows: CatalogRow[];
  history: CatalogHistoryEvent[];
  healthFromPresenceAvailable: boolean;
  loadSummary: {
    links: number;
    activeOffers: number;
    linksWithIssue: number;
    products: number;
    mainLinks: number;
    attributionAvailable: boolean;
  };
};

export type CatalogOfferPayload = {
  id?: string;
  product_id?: string;
  product_name?: string;
  offer_name: string;
  offer_type: CatalogOfferType;
  included_products?: string[];
  checkout_url: string;
  platform?: string;
  current_price?: number | null;
  max_installments?: number | null;
  smart_installments?: string;
  access_time?: string;
  warranty?: string;
  has_coparticipation?: boolean | null;
  partner?: string | null;
  coparticipation_percent?: number | null;
  use_type?: string;
  commercial_status?: CatalogCommercialStatus;
  is_main_link?: boolean;
  responsible?: string | null;
  notes?: string | null;
  campaign_name?: string | null;
  audience?: string | null;
  lead_origin?: string | null;
  special_rule?: string | null;
  reason?: string | null;
};
