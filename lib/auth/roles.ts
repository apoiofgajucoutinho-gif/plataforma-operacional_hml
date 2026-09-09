export type AppRole =
  | "ADMIN"
  | "ESPECIALISTA"
  | "OPERACIONAL"
  | "SUPORTE"
  | "MARKETING_PARTNER"
  | "CLINICA"
  | "USER";

export type FunctionalRole = "ADMIN" | "ESPECIALISTA" | "OPERACIONAL" | "USER";

export type NorwynFeature =
  | "home"
  | "missions"
  | "marketing"
  | "results"
  | "instagram"
  | "ads"
  | "activities"
  | "financeExecutive"
  | "financeOperational"
  | "products"
  | "students"
  | "support"
  | "technicalConfig"
  | "technicalLifecycle"
  | "labAdvanced";

export const appRoles: AppRole[] = [
  "ADMIN",
  "ESPECIALISTA",
  "OPERACIONAL",
  "SUPORTE",
  "MARKETING_PARTNER",
  "CLINICA",
  "USER",
];

export const primaryAppRoles: AppRole[] = ["ADMIN", "ESPECIALISTA", "OPERACIONAL", "USER"];

const roleLabels: Record<AppRole, string> = {
  ADMIN: "Admin",
  ESPECIALISTA: "Especialista",
  OPERACIONAL: "Operacional",
  SUPORTE: "Suporte legado",
  MARKETING_PARTNER: "Marketing legado",
  CLINICA: "Clinica legado",
  USER: "Usuario",
};

const roleCapabilities: Record<FunctionalRole, Record<NorwynFeature, boolean>> = {
  ADMIN: {
    home: true,
    missions: true,
    marketing: true,
    results: true,
    instagram: true,
    ads: true,
    activities: true,
    financeExecutive: true,
    financeOperational: true,
    products: true,
    students: true,
    support: true,
    technicalConfig: true,
    technicalLifecycle: true,
    labAdvanced: true,
  },
  ESPECIALISTA: {
    home: true,
    missions: true,
    marketing: true,
    results: true,
    instagram: true,
    ads: true,
    activities: true,
    financeExecutive: true,
    financeOperational: false,
    products: true,
    students: true,
    support: true,
    technicalConfig: false,
    technicalLifecycle: false,
    labAdvanced: false,
  },
  OPERACIONAL: {
    home: true,
    missions: false,
    marketing: true,
    results: true,
    instagram: true,
    ads: true,
    activities: true,
    financeExecutive: false,
    financeOperational: true,
    products: true,
    students: true,
    support: true,
    technicalConfig: false,
    technicalLifecycle: false,
    labAdvanced: false,
  },
  USER: {
    home: false,
    missions: false,
    marketing: false,
    results: false,
    instagram: false,
    ads: false,
    activities: false,
    financeExecutive: false,
    financeOperational: false,
    products: false,
    students: false,
    support: false,
    technicalConfig: false,
    technicalLifecycle: false,
    labAdvanced: false,
  },
};

export function normalizeAppRole(value: unknown): AppRole {
  const role = typeof value === "string" ? value.trim().toUpperCase() : "USER";
  return appRoles.includes(role as AppRole) ? (role as AppRole) : "USER";
}

export function functionalRoleFor(role: unknown): FunctionalRole {
  const normalized = normalizeAppRole(role);
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "ESPECIALISTA") return "ESPECIALISTA";
  if (normalized === "OPERACIONAL" || normalized === "SUPORTE") return "OPERACIONAL";
  if (normalized === "MARKETING_PARTNER" || normalized === "CLINICA") return "USER";
  return "USER";
}

export function labelForRole(role: unknown) {
  return roleLabels[normalizeAppRole(role)];
}

export function canAccessNorwynFeature(role: unknown, feature: NorwynFeature) {
  return roleCapabilities[functionalRoleFor(role)][feature];
}

export function canAccessMissionFeature(role: unknown) {
  return canAccessNorwynFeature(role, "missions");
}

export function isAdminRole(role: unknown) {
  return functionalRoleFor(role) === "ADMIN";
}

export function isOperationalRole(role: unknown) {
  return functionalRoleFor(role) === "OPERACIONAL";
}

export function isSpecialistRole(role: unknown) {
  return functionalRoleFor(role) === "ESPECIALISTA";
}

export const norwynSpecialistTabs = [
  "home",
  "mission",
  "campaigns",
  "capture",
  "growth",
  "products",
] as const;

export const norwynOperationalTabs = [
  "home",
  "products",
  "campaigns",
  "growth",
] as const;

export const norwynAdminTabs = [
  "home",
  "business",
  "mission",
  "products",
  "campaigns",
  "capture",
  "growth",
  "intelligence",
  "evidence",
  "strategy",
  "briefing",
  "studio",
  "shadow",
  "knowledge",
  "guide",
] as const;

