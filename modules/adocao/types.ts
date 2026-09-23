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
  label: string;
  views: number;
  users: number;
  lastUsedAt: string | null;
  share: number;
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
};

export type AdoptionExperience = {
  measuredNavigations: number;
  medianPageLoadMs: number | null;
  p95PageLoadMs: number | null;
  slowLoads: number;
  errors: number;
  successRate: number | null;
  slowestPages: Array<{ label: string; medianMs: number; samples: number }>;
  recentErrors: AdoptionTimelineItem[];
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
