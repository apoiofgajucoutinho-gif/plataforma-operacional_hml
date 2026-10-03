export type LandingEnvironment = "DEV" | "QA" | "HML" | "PROD";
export type LandingVersionStatus = "DRAFT" | "DEV" | "QA" | "HML" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "READY_FOR_PROD" | "PROD";
export type LandingBlockType = "HERO" | "PROBLEM" | "TRANSFORMATION" | "METHOD" | "MODULES" | "BENEFITS" | "TESTIMONIALS" | "AUTHORITY" | "OFFER" | "GUARANTEE" | "FAQ" | "CTA" | "URGENCY" | "BONUS" | "SCHEDULE" | "VIDEO_VSL" | "COMPARISON" | "TARGET_AUDIENCE" | "OFFER_BUNDLE" | "OBJECTIONS" | "CERTIFICATE" | "ACCESS_SUPPORT";

export type LandingThemeTokens = {
  key: string;
  name: string;
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  cta: string;
  ctaText: string;
  border: string;
};

export type LandingMediaAsset = {
  id: string;
  type: "image" | "logo" | "video" | "testimonial" | "document";
  src: string;
  mobileSrc?: string;
  alt: string;
  focalPoint?: string;
  status?: "ready" | "review" | "placeholder";
  category?: string;
  person?: string;
  orientation?: "portrait" | "landscape" | "square";
};

export type LandingBlock = {
  id: string;
  type: LandingBlockType;
  enabled: boolean;
  variant?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  items?: Array<{ title: string; body?: string; meta?: string }>;
  cta?: { id: string; label: string; href: string; secondaryLabel?: string; secondaryHref?: string };
  media?: LandingMediaAsset;
  metadata?: Record<string, unknown>;
};

export type LandingDefinition = {
  landingKey: string;
  name: string;
  productKey: string;
  campaignKey: string;
  version: string;
  environment: LandingEnvironment;
  status: LandingVersionStatus;
  previewPath: string;
  productionLocked: boolean;
  changeSummary: string;
  theme: LandingThemeTokens;
  themes: LandingThemeTokens[];
  blocks: LandingBlock[];
  tracking: { endpoint: string; landingId?: string | null; versionId?: string | null };
};

export type LandingQaSummary = {
  total: number;
  passed: number;
  warnings: number;
  blockers: number;
  friendly: string[];
};

export type LandingApprovalSummary = {
  landingId: string;
  versionId: string;
  approvalId: string | null;
  landingKey: string;
  name: string;
  version: string;
  status: LandingVersionStatus;
  environment: LandingEnvironment;
  previewPath: string;
  changeSummary: string;
  qa: LandingQaSummary;
  activityId: string | null;
  trackingEvents?: number;
  historyEvents?: number;
};

export type LandingAdminContext = {
  role: string | null;
  allowedModules: string[];
  diagnostic: string | null;
  landings: LandingApprovalSummary[];
};

export type LandingDashboardTab =
  | "overview"
  | "insights"
  | "journey"
  | "criteria"
  | "performance"
  | "behavior"
  | "attribution"
  | "content"
  | "health"
  | "events"
  | "versions"
  | "qa";

export type LandingMetric = {
  value: number | null;
  previous: number | null;
};

export type LandingInsightCriterion = {
  key: string;
  name: string;
  explanation: string;
  formula: string;
  whyItExists: string;
  thresholdPercent: number;
  windowDays: number;
  minSessions: number;
  mediumSample: number;
  highSample: number;
  active: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type LandingInsightMaturity = {
  previewMinSessions: number;
  observationMinSessions: number;
  insightMinSessions: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type LandingJourneyStep = {
  key: string;
  label: string;
  value: number | null;
  fromPreviousPercent: number | null;
  fromSessionsPercent: number | null;
  lossFromPrevious: number | null;
  available: boolean;
  note: string | null;
};

export type LandingInsight = {
  id: string;
  title: string;
  whatHappened: string;
  whyAttention: string;
  evidence: string[];
  hypothesis: string;
  maturity: "Prévia" | "Em observação" | "Insight" | null;
  analyzedSessions: number;
  confidence: "Baixa" | "Média" | "Alta" | null;
  allowedAction: "Acompanhar" | "Verificar" | "Investigar" | "Comparar" | "Testar";
  nextStep: string;
  criterionKey: string;
};

export type LandingDashboardItem = {
  landingKey: string;
  name: string;
  productId: string | null;
  productName: string;
  campaign: string;
  environment: string;
  status: string;
  url: string | null;
  domain: string;
  version: string | null;
  source: "definition" | "registry" | "tracking";
};

export type LandingDashboardContext = {
  role: string | null;
  roleMode: "ADMIN" | "ESPECIALISTA";
  allowedModules: string[];
  diagnostic: string | null;
  period: { key: string; label: string; start: string; end: string; comparisonAvailable: boolean };
  traffic: { includesTest: boolean; excludedEvents: number; technicalAudit: Array<{ reason: string; events: number; sessions: number }> };
  filters: { products: string[]; campaigns: string[]; environments: string[]; statuses: string[]; domains: string[] };
  landings: LandingDashboardItem[];
  selected: LandingDashboardItem | null;
  metrics: {
    visitors: LandingMetric;
    sessions: LandingMetric;
    pageViews: LandingMetric;
    offerViews: LandingMetric;
    checkoutClicks: LandingMetric;
    conversionRate: LandingMetric;
  };
  daily: Array<{ date: string; pageViews: number; sessions: number; checkoutClicks: number }>;
  funnel: Array<{ label: string; value: number; rate: number | null }>;
  journey: {
    detailed: LandingJourneyStep[];
    executive: LandingJourneyStep[];
    executiveRates: {
      checkoutRate: number | null;
      checkoutToPurchaseRate: number | null;
      landingConversionRate: number | null;
      attributionCoverage: number | null;
    };
    purchases: {
      confirmed: number;
      attributed: number;
      unattributed: number;
      originDetermined: number;
      campaignDetermined: number;
      adDetermined: number;
      trackedByNorwyn: number;
      confirmedRevenue: number;
      trackedRevenue: number;
      metaReported: number | null;
    };
    behavioral: Array<{ key: string; label: string; sessions: number; events: number; note: string }>;
    highlights: {
      biggestAbsoluteLoss: string | null;
      biggestPercentageLoss: string | null;
      bestProgress: string | null;
      lowestProgress: string | null;
    };
    breakdowns: Array<{
      label: string;
      sessions: number;
      offerViews: number;
      checkoutClicks: number;
      purchases: number | null;
      checkoutRate: number | null;
    }>;
    availableDimensions: { origin: boolean; campaign: boolean; landingKey: boolean; version: boolean; device: boolean; trafficType: boolean };
    purchaseLimitation: string | null;
  };
  insights: LandingInsight[];
  insightMaturity: LandingInsightMaturity;
  criteria: LandingInsightCriterion[];
  topEvents: Array<{ name: string; total: number; sessions: number }>;
  sections: Array<{ id: string; label: string; views: number; share: number | null }>;
  attribution: Array<{
    source: string;
    campaign: string;
    sessions: number;
    sessionShare: number;
    checkoutClicks: number;
    checkoutRate: number | null;
    checkoutShare: number | null;
    maturity: LandingInsight["maturity"];
    purchases: number | null;
    purchaseRate: number | null;
    revenue: number | null;
    revenuePerSession: number | null;
    attributionConfidence: string | null;
  }>;
  acquisition: {
    totalSessions: number;
    totalCheckouts: number;
    maturity: LandingInsight["maturity"];
    reading: string[];
    purchasesAvailable: boolean;
  };
  confirmedSalesBySource: Array<{
    source: string;
    sessions: number;
    checkouts: number;
    sales: number;
    revenue: number;
    sessionToSaleRate: number | null;
    confidence: string;
  }>;
  attributionQuality: {
    confirmed: number;
    originDetermined: number;
    campaignDetermined: number;
    adDetermined: number;
    unknown: number;
    originCoverage: number | null;
    reasons: Array<{ reason: string; sales: number }>;
  };
  journeyHealth: {
    status: "Saudável" | "Atenção" | "Crítico" | "Aguardando dados";
    operational: "Saudável" | "Atenção" | "Crítico" | "Aguardando dados";
    measurement: "Boa" | "Parcial" | "Fraca";
    reasons: string[];
  };
  recentEvents: Array<{ id: string; name: string; label: string; occurredAt: string; section: string | null; source: string }>;
  content: {
    title: string;
    summary: string;
    checkoutUrl: string | null;
    hotmartProductId: string | null;
    hotmartOfferId: string | null;
    previewUrl: string | null;
  };
  health: {
    overallStatus: "healthy" | "warning" | "critical" | "unknown";
    overallLabel: string;
    guidance: string | null;
    availability: string;
    httpStatus: number | null;
    lastCheckedAt: string | null;
    domain: string;
    checkout: string;
    checkoutCheckedAt: string | null;
    links: string;
    images: string;
    tracking: string;
    recentEventAt: string | null;
    errors: number | null;
    seo: string;
    technicalPerformance: string;
    publishedIntegrity: string;
    components: Array<{
      key: string;
      label: string;
      status: "healthy" | "warning" | "critical" | "unknown";
      lastCheckedAt: string | null;
      message: string;
    }>;
    diagnostics: Array<{
      key: string;
      label: string;
      url: string;
      status: "healthy" | "warning" | "critical" | "unknown";
      httpStatus: number | null;
      redirectChain: string[];
      sslOk: boolean | null;
      sslExpiresAt: string | null;
      responseTimeMs: number | null;
      expectedOrigin: string | null;
      observedOrigin: string | null;
      expectedCheckout: string | null;
      observedCheckout: boolean | null;
      tracking: boolean | null;
      error: string | null;
      evidence: Record<string, unknown>;
    }>;
    divergences: string[];
    alerts: string[];
  };
  versions: Array<{ id: string; version: string; status: string; summary: string; createdAt: string }>;
  qa: Array<{ id: string; status: string; passed: number; warnings: number; blockers: number; completedAt: string | null }>;
  approvals: Array<{ id: string; type: string; decision: string; requestedAt: string; decidedAt: string | null }>;
};
