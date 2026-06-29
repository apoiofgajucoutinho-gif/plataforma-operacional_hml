import { allModules } from "@/lib/auth/modules";

export const localBypassUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "local.admin@plataforma.dev",
};

export function isLocalAuthBypassEnabled() {
  return process.env.NODE_ENV === "development" && process.env.LOCAL_AUTH_BYPASS !== "false";
}

export function getLocalBypassUser() {
  return isLocalAuthBypassEnabled() ? localBypassUser : null;
}

export async function getLocalBypassMembership(dataClient: any) {
  if (!isLocalAuthBypassEnabled()) return null;

  const { data } = await dataClient
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;

  return {
    tenant_id: data.id as string,
    role: "ADMIN",
  };
}

export function getLocalBypassAllowedModules() {
  return allModules;
}
