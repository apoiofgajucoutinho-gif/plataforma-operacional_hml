import { createAdminClient } from "@/lib/supabase/admin";
import { allModules, readyModules } from "@/lib/auth/modules";
import { createClient } from "@/lib/supabase/server";

const landingPriority = ["instagram", "ads", "agenda", "financeiro", "adocao", "atividades", "relatorios", "admin"];

const modulePaths: Record<string, string> = {
  agenda: "/agenda",
  instagram: "/instagram",
  ads: "/ads",
  financeiro: "/financeiro",
  adocao: "/adocao",
  admin: "/admin",
};

export async function getAllowedModulesForUser(userId: string) {
  const userClient = await createClient();
  const dataClient = createAdminClient() ?? userClient;

  const { data: membership } = await dataClient
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!membership) return [];

  if (membership.role === "ADMIN") return allModules;

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", membership.tenant_id)
    .eq("role", membership.role)
    .eq("can_read", true);

  return (data ?? []).map((item) => item.module as string);
}

export function getLandingPathFromAllowedModules(allowedModules: string[]) {
  const firstModule = landingPriority.find(
    (module) => allowedModules.includes(module) && readyModules.includes(module),
  );

  return firstModule ? modulePaths[firstModule] : "/login";
}

export async function getLandingPathForUser(userId: string) {
  return getLandingPathFromAllowedModules(await getAllowedModulesForUser(userId));
}
