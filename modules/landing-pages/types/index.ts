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
