import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  RelatorioAgendamento,
  RelatorioDestinatario,
  RelatorioEnvio,
  RelatoriosContext,
  RelatorioTipoResumo,
} from "@/modules/relatorios/types";

type SupabaseAny = any;

const dayMs = 1000 * 60 * 60 * 24;

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

function latestDate(rows: Array<{ updated_at?: string | null; created_at?: string | null; sent_at?: string | null }>) {
  return rows.reduce<string | null>((latest, row) => {
    const value = row.updated_at ?? row.sent_at ?? row.created_at ?? null;
    if (!value) return latest;
    if (!latest || value > latest) return value;
    return latest;
  }, null);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function localTodayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function minutesFromTime(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isInsideLookbackWindow(scheduleTime: string | null | undefined, currentTime: string, windowMinutes: number) {
  const scheduleMinutes = minutesFromTime(scheduleTime);
  const currentMinutes = minutesFromTime(currentTime);
  if (scheduleMinutes === null || currentMinutes === null) return false;

  const diff = currentMinutes - scheduleMinutes;
  return diff >= 0 && diff < windowMinutes;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthStartIso() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function monthEndIso() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return 0;
}

async function getRelatoriosAuth() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) redirect("/login");

  const { membership, error, source } = await getMembershipByUserId(user.id);
  const dataClient = createAdminClient() ?? userClient;

  if (error) {
    return { error: `${source}: ${error.message}`, userClient, dataClient };
  }

  if (!membership) {
    return { error: "Nenhum tenant ativo encontrado para este usuario.", userClient, dataClient };
  }

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, dataClient);
  const canRead = allowedModules.includes("relatorios");
  const canWrite =
    membership.role === "ADMIN" ||
    Boolean(
      (
        await dataClient
          .from("tenant_module_permissions")
          .select("can_write")
          .eq("tenant_id", membership.tenant_id)
          .eq("role", membership.role)
          .eq("module", "relatorios")
          .maybeSingle()
      ).data?.can_write,
    );

  if (!canRead) {
    return {
      error: "Seu perfil nao possui acesso ao modulo Relatorios.",
      userClient,
      dataClient,
      membership,
      allowedModules,
      canWrite: false,
    };
  }

  return {
    error: null,
    userClient,
    dataClient,
    membership,
    allowedModules,
    canWrite,
  };
}

export async function getRelatoriosContext(): Promise<RelatoriosContext> {
  const auth = await getRelatoriosAuth();

  if (auth.error || !auth.membership) {
    return {
      tenant: null,
      allowedModules: auth.allowedModules ?? [],
      diagnostic: auth.error,
      canWrite: false,
      destinatarios: [],
      agendamentos: [],
      envios: [],
      updatedAt: null,
    };
  }

  const [tenantResult, destinatariosResult, agendamentosResult, enviosResult] = await Promise.all([
    auth.dataClient.from("tenants").select("id, nome").eq("id", auth.membership.tenant_id).maybeSingle(),
    auth.dataClient
      .from("relatorio_destinatarios")
      .select("*")
      .eq("tenant_id", auth.membership.tenant_id)
      .order("nome"),
    auth.dataClient
      .from("relatorio_agendamentos")
      .select("*")
      .eq("tenant_id", auth.membership.tenant_id)
      .order("horario", { ascending: true }),
    auth.dataClient
      .from("relatorio_envios")
      .select("*")
      .eq("tenant_id", auth.membership.tenant_id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const destinatarios = (destinatariosResult.data ?? []) as RelatorioDestinatario[];
  const agendamentos = (agendamentosResult.data ?? []) as RelatorioAgendamento[];
  const envios = (enviosResult.data ?? []) as RelatorioEnvio[];

  return {
    tenant: tenantResult.data,
    allowedModules: auth.allowedModules ?? [],
    diagnostic: null,
    canWrite: Boolean(auth.canWrite),
    destinatarios,
    agendamentos,
    envios,
    updatedAt: latestDate([...destinatarios, ...agendamentos, ...envios]),
  };
}

export async function assertRelatoriosWriteAccess() {
  const auth = await getRelatoriosAuth();
  if (auth.error || !auth.membership) {
    throw new Error(auth.error ?? "Nao autenticado.");
  }

  if (!auth.canWrite) {
    throw new Error("Sem permissao para configurar Relatorios.");
  }

  return {
    dataClient: auth.dataClient,
    tenantId: auth.membership.tenant_id,
  };
}

export async function getRelatorioDispatchByScheduleId(scheduleId: string) {
  const dataClient = createAdminClient();
  if (!dataClient) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");

  const { data: schedule, error: scheduleError } = await dataClient
    .from("relatorio_agendamentos")
    .select("*")
    .eq("id", scheduleId)
    .eq("ativo", true)
    .single();

  if (scheduleError || !schedule) {
    throw new Error(scheduleError?.message ?? "Agendamento nao encontrado.");
  }

  const { data: recipient, error: recipientError } = await dataClient
    .from("relatorio_destinatarios")
    .select("*")
    .eq("id", schedule.destinatario_id)
    .eq("tenant_id", schedule.tenant_id)
    .eq("ativo", true)
    .single();

  if (recipientError || !recipient) {
    throw new Error(recipientError?.message ?? "Destinatario nao encontrado.");
  }

  const message = await buildOperationalSummary({
    dataClient,
    tenantId: schedule.tenant_id,
    tipoResumo: schedule.tipo_resumo,
    recipientName: recipient.nome,
  });

  const destino =
    schedule.canal === "telegram"
      ? recipient.telegram_chat_id
      : schedule.canal === "email"
        ? recipient.email
        : recipient.whatsapp;

  const { data: log, error: logError } = await dataClient
    .from("relatorio_envios")
    .insert({
      tenant_id: schedule.tenant_id,
      agendamento_id: schedule.id,
      destinatario_id: recipient.id,
      tipo_resumo: schedule.tipo_resumo,
      canal: schedule.canal,
      destino,
      status: destino ? "preparado" : "erro",
      assunto: message.subject,
      mensagem: message.text,
      erro: destino ? null : "Destinatario sem destino configurado para este canal.",
      metadata: message.metadata,
    })
    .select("*")
    .single();

  if (logError) throw new Error(logError.message);

  return {
    schedule,
    recipient,
    log,
    subject: message.subject,
    text: message.text,
    channel: schedule.canal,
    telegramChatId: schedule.canal === "telegram" ? recipient.telegram_chat_id : null,
    email: schedule.canal === "email" ? recipient.email : null,
    whatsapp: schedule.canal === "whatsapp" ? recipient.whatsapp : null,
  };
}

export async function getRelatorioDispatchesDue(time: string, windowMinutes = 15) {
  const dataClient = createAdminClient();
  if (!dataClient) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");

  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : time.slice(0, 5);
  const today = localTodayIso();
  const { data: schedules, error } = await dataClient
    .from("relatorio_agendamentos")
    .select("id, horario")
    .eq("ativo", true)
    .neq("frequencia", "sob_demanda")
    .not("horario", "is", null);

  if (error) throw new Error(error.message);

  const dispatches = [];
  for (const schedule of schedules ?? []) {
    if (!isInsideLookbackWindow(schedule.horario, normalizedTime, windowMinutes)) continue;

    const { data: existingLog } = await dataClient
      .from("relatorio_envios")
      .select("id, status")
      .eq("agendamento_id", schedule.id)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`)
      .in("status", ["preparado", "enviado"])
      .limit(1)
      .maybeSingle();

    if (existingLog) continue;
    dispatches.push(await getRelatorioDispatchByScheduleId(schedule.id));
  }

  return dispatches;
}

export async function updateRelatorioEnvioStatus(input: {
  logId: string;
  status: "enviado" | "erro" | "ignorado";
  error?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const dataClient = createAdminClient();
  if (!dataClient) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");

  const { data, error } = await dataClient
    .from("relatorio_envios")
    .update({
      status: input.status,
      erro: input.error ?? null,
      metadata: input.metadata ?? {},
      sent_at: input.status === "enviado" ? new Date().toISOString() : null,
    })
    .eq("id", input.logId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as RelatorioEnvio;
}

export async function buildOperationalSummary({
  dataClient,
  tenantId,
  tipoResumo,
  recipientName,
}: {
  dataClient: SupabaseAny;
  tenantId: string;
  tipoResumo: RelatorioTipoResumo;
  recipientName: string;
}) {
  const today = todayIso();
  const next7 = addDays(7);
  const monthStart = monthStartIso();
  const monthEnd = monthEndIso();

  const [
    agendaToday,
    agendaNext7,
    ocorrenciasOpen,
    interactionsOpen,
    financialMonth,
    adsMonth,
    goalsRisk,
  ] = await Promise.all([
    dataClient
      .from("agenda_eventos")
      .select("id, titulo, tipo, inicio, local, status")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelado")
      .gte("inicio", `${today}T00:00:00.000Z`)
      .lt("inicio", `${addDays(1)}T00:00:00.000Z`)
      .order("inicio", { ascending: true })
      .limit(8),
    dataClient
      .from("agenda_eventos")
      .select("id, titulo, tipo, inicio, local, status")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelado")
      .gte("inicio", `${today}T00:00:00.000Z`)
      .lte("inicio", `${next7}T23:59:59.999Z`)
      .order("inicio", { ascending: true })
      .limit(12),
    dataClient
      .from("ocorrencias_chamados")
      .select("id, prioridade, status, origem_falha, tipo_falha, erro_motivo, data_chamado")
      .eq("tenant_id", tenantId)
      .in("status", ["aberto", "em_andamento", "reaberto"])
      .order("data_chamado", { ascending: false })
      .limit(20),
    dataClient
      .from("instagram_interactions")
      .select("id, source, profile_username, message_text, status, potential, product_topic, interaction_at")
      .eq("tenant_id", tenantId)
      .in("status", ["novo", "analisado"])
      .order("interaction_at", { ascending: false })
      .limit(20),
    dataClient
      .from("fin_lancamentos")
      .select("tipo, status, valor, data_pagamento")
      .eq("tenant_id", tenantId)
      .gte("data_pagamento", monthStart)
      .lte("data_pagamento", monthEnd)
      .neq("status", "cancelado")
      .limit(2000),
    dataClient
      .from("instagram_ads_daily")
      .select("valor_gasto, impressoes, alcance, cliques, leads, data_referencia")
      .eq("tenant_id", tenantId)
      .gte("data_referencia", monthStart)
      .lte("data_referencia", monthEnd)
      .limit(2000),
    dataClient
      .from("objetivos_metas")
      .select("id, titulo, modulo, periodo_tipo, meta_alcancavel, updated_at")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .limit(30),
  ]);

  const todayEvents = agendaToday.data ?? [];
  const nextEvents = agendaNext7.data ?? [];
  const openOccurrences = ocorrenciasOpen.data ?? [];
  const openInteractions = interactionsOpen.data ?? [];
  const financialRows = financialMonth.data ?? [];
  const adsRows = adsMonth.data ?? [];

  const entradas = financialRows
    .filter((row: { tipo: string; status: string }) => row.tipo === "entrada" && row.status === "realizado")
    .reduce((sum: number, row: { valor: unknown }) => sum + toNumber(row.valor), 0);
  const saidas = financialRows
    .filter((row: { tipo: string; status: string }) => row.tipo === "saida" && row.status === "realizado")
    .reduce((sum: number, row: { valor: unknown }) => sum + toNumber(row.valor), 0);
  const adsSpend = adsRows.reduce((sum: number, row: { valor_gasto: unknown }) => sum + toNumber(row.valor_gasto), 0);
  const adsLeads = adsRows.reduce((sum: number, row: { leads?: unknown }) => sum + toNumber(row.leads), 0);
  const urgentOccurrences = openOccurrences.filter((row: { prioridade: string }) => row.prioridade === "urgente").length;
  const highPotentialInteractions = openInteractions.filter((row: { potential: string }) => row.potential === "alto").length;

  const subject =
    tipoResumo === "alerta_tecnico"
      ? "Alertas tecnicos da plataforma"
      : tipoResumo === "resumo_suporte"
        ? "Resumo operacional do suporte"
        : "Resumo executivo operacional";

  const lines = [
    `*${subject}*`,
    `Destinatario: ${recipientName}`,
    `Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date())}`,
    "",
  ];

  if (tipoResumo !== "alerta_tecnico") {
    lines.push(`*Agenda*`);
    lines.push(`Hoje: ${todayEvents.length} evento(s). Proximos 7 dias: ${nextEvents.length}.`);
    nextEvents.slice(0, 5).forEach((event: { titulo: string; inicio: string; local?: string | null }) => {
      lines.push(`- ${formatDateTime(event.inicio)} - ${event.titulo}${event.local ? ` (${event.local})` : ""}`);
    });
    lines.push("");
  }

  if (tipoResumo === "resumo_executivo" || tipoResumo === "financeiro") {
    lines.push(`*Financeiro do mes*`);
    lines.push(`Entradas realizadas: ${formatMoney(entradas)}`);
    lines.push(`Saidas realizadas: ${formatMoney(saidas)}`);
    lines.push(`Resultado parcial: ${formatMoney(entradas - saidas)}`);
    lines.push("");
  }

  if (tipoResumo === "resumo_executivo" || tipoResumo === "resumo_suporte" || tipoResumo === "alerta_tecnico") {
    lines.push(`*Atencoes operacionais*`);
    lines.push(`Ocorrencias abertas: ${openOccurrences.length} (${urgentOccurrences} urgente(s)).`);
    lines.push(`Interacoes pendentes: ${openInteractions.length} (${highPotentialInteractions} alto potencial).`);
    openOccurrences.slice(0, 4).forEach((item: { prioridade: string; tipo_falha?: string | null; erro_motivo: string }) => {
      lines.push(`- ${item.prioridade.toUpperCase()}: ${item.tipo_falha ?? item.erro_motivo}`);
    });
    lines.push("");
  }

  if (tipoResumo === "resumo_executivo" || tipoResumo === "alerta_tecnico") {
    lines.push(`*Ads e metas*`);
    lines.push(`Investimento Ads no mes: ${formatMoney(adsSpend)}. Leads registrados: ${adsLeads}.`);
    lines.push(`Metas cadastradas para monitorar: ${(goalsRisk.data ?? []).length}.`);
    lines.push("");
  }

  const action =
    urgentOccurrences > 0
      ? "Acao sugerida: priorizar ocorrencias urgentes antes de novas demandas."
      : highPotentialInteractions > 0
        ? "Acao sugerida: responder interacoes de alto potencial ainda hoje."
        : todayEvents.length > 0
          ? "Acao sugerida: confirmar agenda do dia e preparar materiais dos eventos."
          : "Acao sugerida: revisar pendencias abertas e manter acompanhamento preventivo.";

  lines.push(action);

  return {
    subject,
    text: lines.join("\n"),
    metadata: {
      todayEvents: todayEvents.length,
      nextEvents: nextEvents.length,
      openOccurrences: openOccurrences.length,
      urgentOccurrences,
      openInteractions: openInteractions.length,
      highPotentialInteractions,
      entradas,
      saidas,
      adsSpend,
      adsLeads,
    },
  };
}
