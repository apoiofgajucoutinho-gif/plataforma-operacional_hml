import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AgendaEvent, AgendaEventInput } from "@/modules/agenda/types";

const allModules = ["agenda", "instagram", "adocao", "financeiro", "atividades", "relatorios", "admin"];

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return {
    membership: data,
    error,
    source: admin ? "service_role" : "rls",
  };
}

async function getAllowedModules(tenantId: string, role: string) {
  if (role === "ADMIN") {
    return allModules;
  }

  const dataClient = createAdminClient() ?? (await createClient());
  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item) => item.module as string);
}

function validateAgendaInput(input: AgendaEventInput) {
  if (!input.titulo?.trim()) {
    throw new Error("Informe um titulo para o evento.");
  }

  const inicio = new Date(input.inicio);
  const fim = new Date(input.fim);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    throw new Error("Informe data e horario validos.");
  }

  if (fim <= inicio) {
    throw new Error("A data/hora final precisa ser depois do inicio.");
  }
}

export async function getAgendaContext() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { membership, error: membershipError, source } = await getMembershipByUserId(
    user.id,
  );

  if (membershipError) {
    return {
      user,
      tenant: null,
      events: [] as AgendaEvent[],
      updatedAt: null,
      diagnostic: `${source}: ${membershipError.message}`,
      allowedModules: [],
    };
  }

  if (!membership) {
    return {
      user,
      tenant: null,
      events: [] as AgendaEvent[],
      updatedAt: null,
      diagnostic:
        source === "rls"
          ? "Nenhum tenant encontrado via RLS. Configure SUPABASE_SERVICE_ROLE_KEY no .env.local ou revise as policies."
          : "Nenhum tenant ativo encontrado para este usuario.",
      allowedModules: [],
    };
  }

  const dataClient = createAdminClient() ?? userClient;
  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role);

  if (!allowedModules.includes("agenda")) {
    return {
      user,
      tenant: null,
      events: [] as AgendaEvent[],
      updatedAt: null,
      diagnostic: "Seu perfil nao possui acesso ao modulo Agenda.",
      allowedModules,
    };
  }

  const { data: tenant } = await dataClient
    .from("tenants")
    .select("nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const { data: events } = await dataClient
    .from("agenda_eventos")
    .select("*")
    .eq("tenant_id", membership.tenant_id)
    .gte("inicio", new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString())
    .lte("inicio", new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString())
    .order("inicio", { ascending: true })
    .returns<AgendaEvent[]>();

  const updatedAt =
    events?.reduce<string | null>((latest, event) => {
      if (!latest || event.updated_at > latest) return event.updated_at;
      return latest;
    }, null) ?? null;

  return {
    user,
    tenant: {
      id: membership.tenant_id,
      nome: tenant?.nome ?? "Organizacao",
    },
    events: events ?? [],
    updatedAt,
    diagnostic: source === "service_role" ? null : "Usando leitura via RLS.",
    allowedModules,
  };
}

export async function createAgendaEvent(input: AgendaEventInput) {
  validateAgendaInput(input);

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }

  const { membership, error: membershipError } = await getMembershipByUserId(user.id);

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new Error("Usuario sem tenant vinculado.");
  }

  const dataClient = createAdminClient() ?? userClient;

  const { data, error } = await dataClient
    .from("agenda_eventos")
    .insert({
      tenant_id: membership.tenant_id,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      tipo: input.tipo,
      status: input.status ?? "agendado",
      inicio: input.inicio,
      fim: input.fim,
      local: input.local ?? null,
      responsavel_id: user.id,
    })
    .select("*")
    .returns<AgendaEvent[]>()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAgendaEvent(eventId: string, input: AgendaEventInput) {
  validateAgendaInput(input);

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }

  const { membership, error: membershipError } = await getMembershipByUserId(user.id);

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new Error("Usuario sem tenant vinculado.");
  }

  const dataClient = createAdminClient() ?? userClient;

  const { data, error } = await dataClient
    .from("agenda_eventos")
    .update({
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      tipo: input.tipo,
      status: input.status ?? "agendado",
      inicio: input.inicio,
      fim: input.fim,
      local: input.local ?? null,
    })
    .eq("id", eventId)
    .eq("tenant_id", membership.tenant_id)
    .select("*")
    .returns<AgendaEvent[]>()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
