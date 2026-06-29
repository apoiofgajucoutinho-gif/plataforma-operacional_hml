import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AtividadesContext, AtividadeTime } from "@/modules/atividades/types";

type SupabaseAny = any;

function latestDate(rows: Array<{ updated_at?: string | null; created_at?: string | null }>) {
  return rows.reduce<string | null>((latest, row) => {
    const value = row.updated_at ?? row.created_at ?? null;
    if (!value) return latest;
    if (!latest || value > latest) return value;
    return latest;
  }, null);
}

function allowedTeamsForRole(role: string | null): AtividadeTime[] {
  if (role === "MARKETING_PARTNER") return ["marketing"];
  if (role === "CLINICA") return ["especialista"];
  return ["marketing", "suporte", "especialista", "gestao_dados"];
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules;

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item: { module: string }) => item.module);
}

export async function getAtividadesContext(): Promise<AtividadesContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const dataClient: SupabaseAny = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();

  if (!currentUser) redirect("/login");

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const { data: membership, error } = localMembership
    ? { data: localMembership, error: null }
    : await dataClient
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", currentUser.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

  if (error || !membership) {
    return {
      tenant: null,
      allowedModules: [],
      diagnostic: error?.message ?? "Nenhum tenant ativo encontrado para este usuario.",
      canWrite: false,
      canAdmin: false,
      role: null,
      projetos: [],
      tarefas: [],
      templates: [],
      templateTarefas: [],
      recorrencias: [],
      logs: [],
      updatedAt: null,
    };
  }

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, dataClient);
  const permission =
    membership.role === "ADMIN"
      ? { can_write: true }
      : (
          await dataClient
            .from("tenant_module_permissions")
            .select("can_write")
            .eq("tenant_id", membership.tenant_id)
            .eq("role", membership.role)
            .eq("module", "atividades")
            .maybeSingle()
        ).data;

  if (!allowedModules.includes("atividades")) {
    return {
      tenant: null,
      allowedModules,
      diagnostic: "Seu perfil nao possui acesso ao modulo Atividades.",
      canWrite: false,
      canAdmin: false,
      role: membership.role,
      projetos: [],
      tarefas: [],
      templates: [],
      templateTarefas: [],
      recorrencias: [],
      logs: [],
      updatedAt: null,
    };
  }

  const teams = allowedTeamsForRole(membership.role);
  const canAdmin = membership.role === "ADMIN" || membership.role === "SUPORTE";
  const canWrite = Boolean(permission?.can_write);
  const [tenantResult, projetosResult, tarefasResult, templatesResult, templateTarefasResult, recorrenciasResult, logsResult] =
    await Promise.all([
      dataClient.from("tenants").select("id, nome").eq("id", membership.tenant_id).maybeSingle(),
      dataClient
        .from("atividades_projetos")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .in("time_responsavel", teams)
        .order("updated_at", { ascending: false })
        .limit(300),
      dataClient
        .from("atividades_tarefas")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .in("time_responsavel", teams)
        .order("prazo", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1500),
      dataClient
        .from("atividades_templates")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("nome", { ascending: true }),
      dataClient
        .from("atividades_template_tarefas")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("ordem", { ascending: true }),
      dataClient
        .from("atividades_recorrencias")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .in("time_responsavel", teams)
        .order("proxima_execucao", { ascending: true })
        .limit(300),
      dataClient
        .from("atividades_logs")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

  const rows = [
    ...(projetosResult.data ?? []),
    ...(tarefasResult.data ?? []),
    ...(templatesResult.data ?? []),
    ...(templateTarefasResult.data ?? []),
    ...(recorrenciasResult.data ?? []),
    ...(logsResult.data ?? []),
  ];

  return {
    tenant: tenantResult.data,
    allowedModules,
    diagnostic: null,
    canWrite,
    canAdmin,
    role: membership.role,
    projetos: projetosResult.data ?? [],
    tarefas: tarefasResult.data ?? [],
    templates: templatesResult.data ?? [],
    templateTarefas: templateTarefasResult.data ?? [],
    recorrencias: recorrenciasResult.data ?? [],
    logs: logsResult.data ?? [],
    updatedAt: latestDate(rows),
  };
}
