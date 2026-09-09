export type PresenceAssetType = "main_site" | "internal_page" | "landing_page" | "checkout" | "support" | "form" | "other";
export type PresenceEnvironment = "prod" | "hml" | "dev" | "external" | "prod_external";
export type PresenceStatus = "healthy" | "warning" | "critical" | "unknown";
export type PresenceContentStatus = "ok" | "missing_expected" | "suspicious" | "changed" | "unknown";
export type PresenceSeverity = "low" | "medium" | "high" | "critical";
export type PresenceIncidentStatus = "open" | "acknowledged" | "resolved" | "ignored";
export type PresenceIncidentType =
  | "site_down"
  | "http_error"
  | "slow_response"
  | "ssl_problem"
  | "broken_link"
  | "unexpected_redirect"
  | "content_change"
  | "suspicious_content"
  | "missing_element"
  | "checkout_problem"
  | "other";

export type PresenceAsset = {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  asset_type: PresenceAssetType;
  parent_asset_id: string | null;
  environment: PresenceEnvironment;
  owner: string | null;
  is_critical: boolean;
  monitoring_enabled: boolean;
  monitor_content: boolean;
  monitor_links: boolean;
  monitor_performance: boolean;
  expected_content: string[] | null;
  forbidden_patterns: string[] | null;
  expected_elements: Record<string, unknown>[] | null;
  allowed_domains: string[] | null;
  thresholds: Record<string, unknown> | null;
  last_checked_at: string | null;
  last_status: PresenceStatus;
  last_health_score: number | null;
  last_check_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PresenceCheck = {
  id: string;
  tenant_id: string;
  asset_id: string;
  checked_at: string;
  http_status: number | null;
  response_time_ms: number | null;
  is_available: boolean;
  ssl_ok: boolean | null;
  ssl_expires_at: string | null;
  redirect_chain: string[] | null;
  broken_links_count: number;
  content_status: PresenceContentStatus;
  content_hash: string | null;
  content_change_score: number | null;
  health_score: number;
  status: PresenceStatus;
  result_json: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
};

export type PresenceIncident = {
  id: string;
  tenant_id: string;
  asset_id: string;
  severity: PresenceSeverity;
  incident_type: PresenceIncidentType;
  title: string;
  description: string | null;
  detected_at: string;
  resolved_at: string | null;
  status: PresenceIncidentStatus;
  evidence: Record<string, unknown> | null;
  last_check_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PresenceDiscoveredLink = {
  id: string;
  tenant_id: string;
  source_asset_id: string;
  url: string;
  normalized_url: string;
  anchor_text: string | null;
  suggested_asset_type: PresenceAssetType;
  status: "pending" | "monitor" | "ignore" | "critical";
  http_status: number | null;
  discovered_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_asset_id: string | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PresenceSummary = {
  overallScore: number | null;
  overallStatus: PresenceStatus;
  activeAssets: number;
  landingPages: number;
  criticalLinks: number;
  openIncidents: number;
  incidentsToday: number;
  needsAttention: PresenceIncident[];
  analysis: {
    observed: string;
    inference: string;
    recommendation: string;
  };
};

export type PresenceContext = {
  role: string | null;
  tenant: { id: string; nome: string } | null;
  user: { id: string; email: string | null; name: string | null } | null;
  allowedModules: string[];
  diagnostic: string | null;
  updatedAt: string | null;
  isAdmin: boolean;
  assets: PresenceAsset[];
  checks: PresenceCheck[];
  incidents: PresenceIncident[];
  discoveredLinks: PresenceDiscoveredLink[];
  summary: PresenceSummary;
};