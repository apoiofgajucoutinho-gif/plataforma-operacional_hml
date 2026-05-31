import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { allModules } from "@/lib/auth/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AdminContext, AdminProfileAccess, AdminRole } from "@/modules/admin/types";

const roles: Array<{ value: AdminRole; label: string }> = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPORTE", label: "Suporte" },
  { value: "MARKETING_PARTNER", label: "Marketing" },
  { value: "CLINICA", label: "Clinica" },
  { value: "USER", label: "User" },
];

const moduleLabels: Record<string, string> = {
  agenda: "Agenda",
  instagram: "Instagram",
  ads: "Ads",
  financeiro: "Financeiro",
  adocao: "Adoção",
  atividades: "Atividades",
  relatorios: "Relatórios",
  admin: "Admin",
};

const moduleTabs: Record<string, string[]> = {
  agenda: ["Agenda", "Calendário", "Lista", "Gantt"],
  instagram: ["Insights", "Resultados"],
  ads: ["Visão Geral", "Performance", "Detalhamento", "Glossário", "Análise"],
  financeiro: ["Início", "Diagnóstico", "Lançar", "Consultar", "DRE", "Marketing", "Cadastro"],
  adocao: ["Adoção", "Atividades recentes"],
  atividades: ["Em desenvolvimento"],
  relatorios: ["Em desenvolvimento"],
  admin: ["Users", "Perfil"],
};

async function listAllUsers() {
  const admin = createAdminClient();
  if (!admin) return [];

  const users: User[] = [];
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 100) break;
    page += 1;
  }

  return users;
}

export async function getAdminContext(): Promise<AdminContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const dataClient = admin ?? userClient;
  const { data: membership } = await dataClient
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "ADMIN") {
    return {
      allowedModules: [],
      tenant: null,
      users: [],
      profiles: [],
      diagnostic: "Seu perfil nao possui acesso ao modulo Admin.",
    };
  }

  const [{ data: tenant }, { data: memberships }, { data: profiles }, { data: permissions }, authUsers] = await Promise.all([
    dataClient.from("tenants").select("id, nome").eq("id", membership.tenant_id).maybeSingle(),
    dataClient.from("tenant_members").select("user_id, role, ativo").eq("tenant_id", membership.tenant_id),
    dataClient.from("profiles").select("id, nome"),
    dataClient.from("tenant_module_permissions").select("role, module, can_read, can_write").eq("tenant_id", membership.tenant_id),
    listAllUsers(),
  ]);

  const membershipByUser = new Map(
    (memberships ?? []).map((item: { user_id: string; role: AdminRole; ativo: boolean }) => [item.user_id, item]),
  );
  const profileByUser = new Map((profiles ?? []).map((item: { id: string; nome: string | null }) => [item.id, item]));

  const users = authUsers
    .map((authUser) => {
      const userMembership = membershipByUser.get(authUser.id);
      if (!userMembership) return null;

      return {
        id: authUser.id,
        email: authUser.email ?? "",
        nome: profileByUser.get(authUser.id)?.nome ?? (typeof authUser.user_metadata?.nome === "string" ? authUser.user_metadata.nome : null),
        role: userMembership.role,
        ativo: userMembership.ativo,
        created_at: authUser.created_at ?? null,
        last_sign_in_at: authUser.last_sign_in_at ?? null,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left!.email).localeCompare(right!.email)) as AdminContext["users"];

  const permissionsByRole = new Map<string, Array<{ module: string; can_read: boolean; can_write: boolean }>>();
  (permissions ?? []).forEach((item: { role: string; module: string; can_read: boolean; can_write: boolean }) => {
    permissionsByRole.set(item.role, [...(permissionsByRole.get(item.role) ?? []), item]);
  });

  const profileAccess: AdminProfileAccess[] = roles.map((role) => {
    const source =
      role.value === "ADMIN"
        ? allModules.map((module) => ({ module, can_read: true, can_write: true }))
        : permissionsByRole.get(role.value) ?? [];

    return {
      role: role.value,
      label: role.label,
      modules: source
        .filter((item) => item.can_read)
        .map((item) => ({
          key: item.module,
          label: moduleLabels[item.module] ?? item.module,
          canRead: item.can_read,
          canWrite: item.can_write,
          tabs: tabsForRole(role.value, item.module),
        })),
    };
  });

  return {
    allowedModules: allModules,
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    users,
    profiles: profileAccess,
    diagnostic: null,
  };
}

function tabsForRole(role: AdminRole, module: string) {
  if (role === "MARKETING_PARTNER") {
    if (module === "financeiro") return ["Marketing"];
    if (module === "instagram") return ["Insights", "Resultados"];
  }

  if (role === "SUPORTE" && module === "financeiro") {
    return ["Início", "Diagnóstico", "Lançar", "Consultar", "DRE", "Marketing"];
  }

  return moduleTabs[module] ?? [moduleLabels[module] ?? module];
}
