export type AdoptionPeriodKey = "today" | "7d" | "15d" | "30d" | "90d";

export type AdoptionRawEvent = {
  id: string;
  module: string;
  page_path: string;
  event_name: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AdoptionPerson = {
  userId: string;
  name: string;
  email: string | null;
  role: string | null;
  lastAccess: string | null;
  activeDays: number;
  sessions: number;
  pageViews: number;
  modulesUsed: number;
  topModule: string | null;
  topModules: Array<{ label: string; views: number }>;
  topPages: Array<{ label: string; views: number }>;
  status: "recent" | "low" | "inactive";
};

export type AdoptionRanking = {
  key: string;
  module: string;
  page?: string;
  label: string;
  views: number;
  users: number;
  lastUsedAt: string | null;
  share: number;
  trendPercent: number | null;
};

export type AdoptionTimelineItem = {
  id: string;
  userId: string | null;
  userName: string;
  module: string;
  moduleLabel: string;
  pageLabel: string;
  eventName: string;
  createdAt: string;
  outcome: string | null;
  errorType: string | null;
  statusCode: number | null;
  message: string | null;
};

export type AdoptionExperience = {
  measuredNavigations: number;
  medianPageLoadMs: number | null;
  p95PageLoadMs: number | null;
  slowLoads: number;
  slowThresholdMs: number;
  errors: number;
  capturedErrors: number;
  ignoredErrors: number;
  indeterminateErrors: number;
  navigationMeasured: number;
  navigationSuccessRate: number | null;
  apiMeasured: number;
  apiSuccessRate: number | null;
  slowestPages: Array<{ module: string; page: string; label: string; medianMs: number; p95Ms: number; maxMs: number; samples: number; slowLoads: number }>;
  recentErrors: AdoptionTimelineItem[];
  errorAudit: Array<{ classification: "real" | "ignored" | "indeterminate"; type: string | null; module: string; pagePath: string; userId: string | null; userName: string | null; statusCode: number | null; message: string | null; total: number; firstAt: string; lastAt: string }>;
};

export type AdoptionSnapshot = {
  period: AdoptionPeriodKey;
  periodLabel: string;
  from: string;
  to: string;
  usersActive: number;
  sessions: number;
  activeDays: number;
  pageViews: number;
  modulesUsed: number;
  actions: number;
  errors: number;
  topModule: string | null;
  people: AdoptionPerson[];
  modules: AdoptionRanking[];
  pages: AdoptionRanking[];
  unusedModules: string[];
  recentActivity: AdoptionTimelineItem[];
  daily: Array<{ date: string; pageViews: number; sessions: number; users: number }>;
  experience: AdoptionExperience;
};

export type AdoptionAudit = {
  totalEvents: number;
  users: number;
  firstEventAt: string | null;
  lastEventAt: string | null;
  exactDuplicateGroups: number;
  eventNames: Array<{ label: string; total: number }>;
  metadataCoverage: {
    session: number;
    performance: number;
  };
};

export type AdoptionAnalytics = {
  snapshots: Record<AdoptionPeriodKey, AdoptionSnapshot>;
  audit: AdoptionAudit;
  updatedAt: string | null;
};
