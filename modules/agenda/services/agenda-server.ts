import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGoogleCalendarEvent,
  isGoogleCalendarConfigured,
  listGoogleCalendarEvents,
  refreshGoogleAccessToken,
  upsertGoogleCalendarEvent,
} from "@/services/google/calendar";
import type { GoogleCalendarEvent } from "@/services/google/calendar";
import type { AgendaEvent, AgendaEventInput, AgendaEventType } from "@/modules/agenda/types";

const allModules = ["agenda", "instagram", "ads", "objetivos", "financeiro", "ocorrencias", "adocao", "atividades", "relatorios", "admin"];

type GoogleCalendarConnection = {
  account_email: string;
  refresh_token: string;
};

function getPreferredGoogleCalendarAccountEmail() {
  const configuredEmail =
    env.googleCalendarConnectionEmail || (env.googleCalendarId?.includes("@") ? env.googleCalendarId : "");

  return configuredEmail ? configuredEmail.toLowerCase() : null;
}

async function getTenantGoogleCalendarConnection(dataClient: any, tenantId: string) {
  const preferredEmail = getPreferredGoogleCalendarAccountEmail();

  if (preferredEmail) {
    const { data, error } = await dataClient
      .from("google_calendar_connections")
      .select("account_email, refresh_token")
      .eq("tenant_id", tenantId)
      .ilike("account_email", preferredEmail)
      .maybeSingle();

    if (data) {
      return { connection: data as GoogleCalendarConnection, error: null };
    }

    if (error && error.code !== "PGRST116") {
      return { connection: null, error };
    }
  }

  const { data, error } = await dataClient
    .from("google_calendar_connections")
    .select("account_email, refresh_token")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { connection: data as GoogleCalendarConnection | null, error };
}

function inferAgendaEventType(title: string): AgendaEventType {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("aula") || normalized.includes("curso") || normalized.includes("formacao")) {
    return "aula";
  }

  if (normalized.includes("consulta") || normalized.includes("paciente")) {
    return "paciente";
  }

  if (
    normalized.includes("palestra") ||
    normalized.includes("congresso") ||
    normalized.includes("summit") ||
    normalized.includes("evento")
  ) {
    return "palestra";
  }

  return "interno";
}

function googleDateToIso(value?: { date?: string; dateTime?: string }) {
  if (value?.dateTime) {
    return new Date(value.dateTime).toISOString();
  }

  if (value?.date) {
    return new Date(`${value.date}T00:00:00-03:00`).toISOString();
  }

  return null;
}

function getGoogleImportWindow() {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 31);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 180);
  timeMax.setHours(23, 59, 59, 999);

  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  };
}

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

async function assertNoAgendaConflict({
  dataClient,
  tenantId,
  input,
  ignoreEventId,
}: {
  dataClient: any;
  tenantId: string;
  input: AgendaEventInput;
  ignoreEventId?: string;
}) {
  let query = dataClient
    .from("agenda_eventos")
    .select("id, titulo, inicio")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelado")
    .lt("inicio", input.fim)
    .gt("fim", input.inicio)
    .limit(1);

  if (ignoreEventId) {
    query = query.neq("id", ignoreEventId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const conflict = data?.[0] as Pick<AgendaEvent, "id" | "titulo" | "inicio"> | undefined;
  if (conflict) {
    const horario = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(conflict.inicio));

    throw new Error(`Já existe um agendamento nesse horário: ${conflict.titulo} em ${horario}.`);
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

  await assertNoAgendaConflict({
    dataClient,
    tenantId: membership.tenant_id,
    input,
  });

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

export async function syncAgendaEventWithGoogle(event: AgendaEvent) {
  if (!isGoogleCalendarConfigured()) {
    return {
      ok: false,
      error: "Google Calendar OAuth ainda nao configurado.",
      event,
    };
  }

  const userClient = await createClient();
  const dataClient = createAdminClient() ?? userClient;

  const { connection, error: connectionError } = await getTenantGoogleCalendarConnection(
    dataClient,
    event.tenant_id,
  );

  if (connectionError || !connection) {
    return {
      ok: false,
      error:
        connectionError?.message ??
        "Tenant sem conexao Google Calendar central. Conecte a conta principal da agenda.",
      event,
    };
  }

  try {
    const token = await refreshGoogleAccessToken(connection.refresh_token);
    const googleEvent = await upsertGoogleCalendarEvent({
      event,
      accessToken: token.access_token,
    });

    const { data: updatedEvent, error: updateError } = await dataClient
      .from("agenda_eventos")
      .update({ google_event_id: googleEvent.id as string })
      .eq("id", event.id)
      .select("*")
      .returns<AgendaEvent[]>()
      .single();

    if (updateError) {
      return {
        ok: false,
        error: updateError.message,
        event,
      };
    }

    return {
      ok: true,
      error: null,
      googleEventId: googleEvent.id as string,
      accountEmail: connection.account_email,
      event: updatedEvent ?? { ...event, google_event_id: googleEvent.id as string },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao sincronizar evento com Google Calendar.",
      event,
    };
  }
}

export async function pullGoogleCalendarEventsToAgenda(params: {
  tenantId: string;
  accessToken?: string;
}) {
  if (!isGoogleCalendarConfigured()) {
    return {
      ok: false,
      error: "Google Calendar OAuth ainda nao configurado.",
      imported: 0,
      updated: 0,
      cancelled: 0,
      skipped: 0,
      events: [] as AgendaEvent[],
    };
  }

  const userClient = await createClient();
  const dataClient = createAdminClient() ?? userClient;
  let accessToken = params.accessToken;
  let accountEmail: string | null = null;

  if (!accessToken) {
    const { connection, error: connectionError } = await getTenantGoogleCalendarConnection(
      dataClient,
      params.tenantId,
    );

    if (connectionError || !connection) {
      return {
        ok: false,
        error:
          connectionError?.message ??
          "Tenant sem conexao Google Calendar central. Conecte a conta principal da agenda.",
        imported: 0,
        updated: 0,
        cancelled: 0,
        skipped: 0,
        events: [] as AgendaEvent[],
      };
    }

    const token = await refreshGoogleAccessToken(connection.refresh_token);
    accessToken = token.access_token;
    accountEmail = connection.account_email;
  }

  const { timeMin, timeMax } = getGoogleImportWindow();
  const googleEvents = await listGoogleCalendarEvents({
    accessToken,
    timeMin,
    timeMax,
  });

  let imported = 0;
  let updated = 0;
  let cancelled = 0;
  let skipped = 0;
  const changedEvents: AgendaEvent[] = [];

  for (const googleEvent of googleEvents) {
    const result = await upsertGoogleEventIntoAgenda({
      dataClient,
      tenantId: params.tenantId,
      googleEvent,
    });

    if (result.action === "imported") imported += 1;
    if (result.action === "updated") updated += 1;
    if (result.action === "cancelled") cancelled += 1;
    if (result.action === "skipped") skipped += 1;
    if (result.event) changedEvents.push(result.event);
  }

  return {
    ok: true,
    error: null,
    accountEmail,
    imported,
    updated,
    cancelled,
    skipped,
    events: changedEvents,
  };
}

async function upsertGoogleEventIntoAgenda({
  dataClient,
  tenantId,
  googleEvent,
}: {
  dataClient: any;
  tenantId: string;
  googleEvent: GoogleCalendarEvent;
}): Promise<{
  action: "imported" | "updated" | "cancelled" | "skipped";
  event: AgendaEvent | null;
}> {
  if (!googleEvent.id) {
    return { action: "skipped", event: null };
  }

  const { data: existingByGoogleId } = await dataClient
    .from("agenda_eventos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("google_event_id", googleEvent.id)
    .limit(1)
    .maybeSingle();

  if (googleEvent.status === "cancelled") {
    if (!existingByGoogleId) {
      return { action: "skipped", event: null };
    }

    const { data: cancelledEvent, error } = await dataClient
      .from("agenda_eventos")
      .update({ status: "cancelado" })
      .eq("id", existingByGoogleId.id)
      .select("*")
      .single();

    if (error) throw error;
    return { action: "cancelled", event: cancelledEvent as AgendaEvent };
  }

  const inicio = googleDateToIso(googleEvent.start);
  const fim = googleDateToIso(googleEvent.end);
  const titulo = googleEvent.summary?.trim() || "Evento Google Calendar";

  if (!inicio || !fim || new Date(fim) <= new Date(inicio)) {
    return { action: "skipped", event: null };
  }

  const payload = {
    tenant_id: tenantId,
    titulo,
    descricao: googleEvent.description ?? null,
    tipo: inferAgendaEventType(titulo),
    status: "confirmado",
    inicio,
    fim,
    local: googleEvent.location ?? null,
    google_event_id: googleEvent.id,
  };

  if (existingByGoogleId) {
    const { data: updatedEvent, error } = await dataClient
      .from("agenda_eventos")
      .update(payload)
      .eq("id", existingByGoogleId.id)
      .select("*")
      .single();

    if (error) throw error;
    return { action: "updated", event: updatedEvent as AgendaEvent };
  }

  const { data: existingByContent } = await dataClient
    .from("agenda_eventos")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("google_event_id", null)
    .eq("titulo", titulo)
    .eq("inicio", inicio)
    .eq("fim", fim)
    .limit(1)
    .maybeSingle();

  if (existingByContent) {
    const { data: linkedEvent, error } = await dataClient
      .from("agenda_eventos")
      .update({
        google_event_id: googleEvent.id,
        descricao: googleEvent.description ?? existingByContent.descricao,
        local: googleEvent.location ?? existingByContent.local,
      })
      .eq("id", existingByContent.id)
      .select("*")
      .single();

    if (error) throw error;
    return { action: "updated", event: linkedEvent as AgendaEvent };
  }

  const { data: insertedEvent, error } = await dataClient
    .from("agenda_eventos")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return { action: "imported", event: insertedEvent as AgendaEvent };
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

  await assertNoAgendaConflict({
    dataClient,
    tenantId: membership.tenant_id,
    input,
    ignoreEventId: eventId,
  });

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

export async function deleteAgendaEvent(eventId: string) {
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
  const { data: event, error: eventError } = await dataClient
    .from("agenda_eventos")
    .select("*")
    .eq("id", eventId)
    .eq("tenant_id", membership.tenant_id)
    .single();

  if (eventError) {
    throw eventError;
  }

  const agendaEvent = event as AgendaEvent;
  if (agendaEvent.google_event_id && isGoogleCalendarConfigured()) {
    const { connection, error: connectionError } = await getTenantGoogleCalendarConnection(
      dataClient,
      membership.tenant_id,
    );

    if (connectionError || !connection) {
      throw new Error(
        connectionError?.message ??
          "Nao foi possivel excluir porque a conexao central com o Google Calendar nao foi encontrada.",
      );
    }

    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const token = await refreshGoogleAccessToken(connection.refresh_token);
        await deleteGoogleCalendarEvent({
          googleEventId: agendaEvent.google_event_id,
          accessToken: token.access_token,
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw new Error(
        lastError instanceof Error
          ? `Exclusao interrompida: ${lastError.message}`
          : "Exclusao interrompida: nao foi possivel remover no Google Agenda automaticamente.",
      );
    }
  }

  const { data, error } = await dataClient
    .from("agenda_eventos")
    .delete()
    .eq("id", eventId)
    .eq("tenant_id", membership.tenant_id)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
}
