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
  traffic: { includesTest: boolean; excludedEvents: number };
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
  topEvents: Array<{ name: string; total: number; sessions: number }>;
  sections: Array<{ id: string; label: string; views: number; share: number | null }>;
  attribution: Array<{ source: string; campaign: string; sessions: number; checkoutClicks: number }>;
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
    divergences: string[];
    alerts: string[];
  };
  versions: Array<{ id: string; version: string; status: string; summary: string; createdAt: string }>;
  qa: Array<{ id: string; status: string; passed: number; warnings: number; blockers: number; completedAt: string | null }>;
  approvals: Array<{ id: string; type: string; decision: string; requestedAt: string; decidedAt: string | null }>;
};
