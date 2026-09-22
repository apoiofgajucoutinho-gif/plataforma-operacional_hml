import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { RelatorioAgendamento, RelatorioBlocoKey, RelatorioDestinatario, RelatorioEnvio, RelatorioFiltros, RelatorioPeriodo, RelatoriosContext, RelatorioTipoResumo } from "@/modules/relatorios/types";

type AnyClient = any;
type SourceStatus = "success" | "empty" | "error";
type SourceResult<T> = { status: SourceStatus; data: T; error?: string };
type Block = {
  key: RelatorioBlocoKey;
  title: string;
  lines: string[];
  empty?: string;
  status: SourceStatus;
  source: string;
  period?: string;
  reason?: string;
};
type BlockDiagnostic = {
  key: RelatorioBlocoKey;
  title: string;
  status: SourceStatus;
  rendered: boolean;
  source: string;
  period?: string;
  reason?: string;
  lines: number;
};
type DispatchOptions = { origin?: "manual" | "agendado" | "preview" | "sistema"; createLog?: boolean; requireActive?: boolean };

const tz = "America/Sao_Paulo";
const writeRoles = new Set(["ADMIN", "ESPECIALISTA", "SUPORTE", "OPERACIONAL"]);
const defaults: Partial<Record<RelatorioBlocoKey, { enabled: boolean; periodo: RelatorioPeriodo; empty_behavior?: "omit" | "show_empty" }>> = {
  agenda: { enabled: true, periodo: "hoje", empty_behavior: "show_empty" },
  decisoes: { enabled: true, periodo: "pendentes" },
  presence: { enabled: true, periodo: "hoje", empty_behavior: "show_empty" },
  marketing_instagram: { enabled: true, periodo: "ultimos_30d" },
  comercial: { enabled: true, periodo: "ultimos_30d" },
  interacoes: { enabled: true, periodo: "ultimos_30d" },
  marketing_ads: { enabled: false, periodo: "ultimos_30d" },
  financeiro: { enabled: false, periodo: "mes_atual" },
  atividades: { enabled: false, periodo: "pendentes" },
  aluno_360: { enabled: false, periodo: "ultimos_30d" },
  recomendacoes: { enabled: true, periodo: "hoje" },
};
const typeBlocks: Record<RelatorioTipoResumo, RelatorioBlocoKey[]> = {
  resumo_executivo: ["agenda", "decisoes", "presence", "marketing_instagram", "comercial", "interacoes", "recomendacoes"],
  resumo_suporte: ["agenda", "decisoes", "interacoes", "atividades", "presence"],
  alerta_tecnico: ["presence", "recomendacoes"],
  agenda: ["agenda"],
  ocorrencias: ["decisoes", "interacoes"],
  financeiro: ["financeiro"],
  lembrete_agendamento: ["agenda"],
  marketing: ["marketing_instagram", "marketing_ads", "recomendacoes"],
  comercial: ["comercial", "recomendacoes"],
  presence: ["presence"],
  aluno_360: ["aluno_360", "comercial", "interacoes"],
  personalizado: ["agenda", "presence", "marketing_instagram", "comercial"],
};

async function member(userId: string) {
  const supabase = createAdminClient() ?? (await createClient());
  const { data, error } = await supabase.from("tenant_members").select("tenant_id, role").eq("user_id", userId).eq("ativo", true).limit(1).maybeSingle();
  if (error) throw error;
  return data as { tenant_id: string; role: string } | null;
}

async function authContext() {
  const localUser = getLocalBypassUser();
  const admin = createAdminClient();
  const localMember = await getLocalBypassMembership(admin ?? (await createClient()));
  if (localUser && localMember) return { userId: localUser.id, tenantId: localMember.tenant_id, role: localMember.role, dataClient: admin ?? (await createClient()) };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const membership = await member(data.user.id);
  return { userId: data.user.id, tenantId: membership?.tenant_id ?? null, role: membership?.role ?? null, dataClient: admin ?? supabase };
}
function allowed(role: string | null) { return role ? allModules : []; }
function canWrite(role: string | null) { return Boolean(role && writeRoles.has(role)); }
function n(value: unknown) { if (typeof value === "number") return Number.isFinite(value) ? value : 0; if (typeof value === "string") return Number(value.replace(/[^0-9,-]/g, "").replace(".", "").replace(",", ".")) || 0; return 0; }
function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0); }
function date(value?: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: tz }).format(new Date(value)) : "-"; }
function datetime(value?: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(value)) : "-"; }
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()); }
function plusDays(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); }
function range(period?: RelatorioPeriodo) {
  const t = today();
  if (period === "amanha") return { from: plusDays(1), to: plusDays(1), label: "Amanha" };
  if (period === "proximos_2d") return { from: t, to: plusDays(2), label: "Proximos 2 dias" };
  if (period === "proximos_7d") return { from: t, to: plusDays(7), label: "Proximos 7 dias" };
  if (period === "proximos_15d") return { from: t, to: plusDays(15), label: "Proximos 15 dias" };
  if (period === "ultimos_7d") return { from: plusDays(-7), to: t, label: "Ultimos 7 dias" };
  if (period === "ultimos_15d") return { from: plusDays(-15), to: t, label: "Ultimos 15 dias" };
  if (period === "ultimos_90d") return { from: plusDays(-90), to: t, label: "Ultimos 90 dias" };
  if (period === "mes_atual") return { from: t.slice(0, 8) + "01", to: t, label: "Mes atual" };
  if (period === "ano_atual") return { from: t.slice(0, 4) + "-01-01", to: t, label: "Ano atual" };
  if (period === "ultimos_30d") return { from: plusDays(-30), to: t, label: "Ultimos 30 dias" };
  return { from: t, to: t, label: "Hoje" };
}
function errorMessage(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message ?? "Erro desconhecido.");
  return String(error);
}
async function source<T>(query: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<SourceResult<T>> {
  try {
    const { data, error } = await query;
    if (error) return { status: "error", data: fallback, error: errorMessage(error) };
    const resolved = data ?? fallback;
    const empty = Array.isArray(resolved) ? resolved.length === 0 : resolved == null;
    return { status: empty ? "empty" : "success", data: resolved };
  } catch (error) {
    return { status: "error", data: fallback, error: errorMessage(error) };
  }
}
async function sourceCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<SourceResult<number>> {
  try {
    const { count, error } = await query;
    if (error) return { status: "error", data: 0, error: errorMessage(error) };
    return { status: "success", data: count ?? 0 };
  } catch (error) {
    return { status: "error", data: 0, error: errorMessage(error) };
  }
}
function blockError(key: RelatorioBlocoKey, title: string, sourceName: string, error?: string, period?: string): Block {
  return { key, title, source: sourceName, period, status: "error", reason: error ?? "Consulta indisponivel.", lines: [`Dados temporariamente indisponiveis. Fonte: ${sourceName}.`] };
}
function blockEmpty(key: RelatorioBlocoKey, title: string, sourceName: string, empty: string, period?: string): Block {
  return { key, title, source: sourceName, period, status: "empty", empty, lines: [] };
}
function filtersFor(input: RelatorioFiltros | null | undefined, tipo: RelatorioTipoResumo): RelatorioFiltros {
  const sourceFilters = input ?? {};
  const hasExplicitBlocks = Boolean(sourceFilters.blocos && Object.keys(sourceFilters.blocos).length);
  const blocks = hasExplicitBlocks ? Object.fromEntries(Object.keys(defaults).map((key) => { const blockKey = key as RelatorioBlocoKey; return [blockKey, { ...defaults[blockKey], enabled: false, ...(sourceFilters.blocos?.[blockKey] ?? {}) }]; })) as typeof defaults : { ...defaults, ...(sourceFilters.blocos ?? {}) };
  if (!hasExplicitBlocks) {
    const keys = typeBlocks[tipo] ?? typeBlocks.personalizado;
    Object.keys(blocks).forEach((key) => {
      const blockKey = key as RelatorioBlocoKey;
      blocks[blockKey] = { ...blocks[blockKey], periodo: blocks[blockKey]?.periodo ?? "hoje", enabled: keys.includes(blockKey) };
    });
    for (const key of keys) blocks[key] = { enabled: true, periodo: blocks[key]?.periodo ?? "hoje", empty_behavior: blocks[key]?.empty_behavior ?? "omit" };
  }
  return { ...sourceFilters, nivel_detalhe: sourceFilters.nivel_detalhe ?? "normal", include_recommendation: sourceFilters.include_recommendation ?? false, customer_ids: Array.isArray(sourceFilters.customer_ids) ? sourceFilters.customer_ids : [], blocos: blocks };
}
function enabled(filters: RelatorioFiltros, key: RelatorioBlocoKey) { return Boolean(filters.blocos?.[key]?.enabled); }
function cfg(filters: RelatorioFiltros, key: RelatorioBlocoKey) { return filters.blocos?.[key] ?? { enabled: false, periodo: "hoje" as RelatorioPeriodo }; }
async function agendaBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const title = "📅 Agenda";
  const sourceName = "agenda_eventos";
  const r = { from: today(), to: plusDays(2), label: "Hoje, amanha e proximos 2 dias" };
  const result = await source<any[]>(client.from(sourceName).select("titulo, inicio, descricao, local").eq("tenant_id", tenantId).gte("inicio", r.from + "T00:00:00").lte("inicio", r.to + "T23:59:59").order("inicio", { ascending: true }).limit(30), []);
  if (result.status === "error") return blockError("agenda", title, sourceName, result.error, r.label);
  const rows = result.data;
  const windows = [
    { label: "Hoje", from: today(), to: today() },
    { label: "Amanha", from: plusDays(1), to: plusDays(1) },
    { label: "Proximos 2 dias", from: plusDays(2), to: plusDays(2) },
  ];
  const lines = windows.flatMap((window) => {
    const items = rows.filter((e) => String(e.inicio ?? "").slice(0, 10) >= window.from && String(e.inicio ?? "").slice(0, 10) <= window.to);
    return [window.label, ...(items.length ? items.map((e) => "• " + datetime(e.inicio) + " - " + e.titulo + (e.descricao ? " (" + e.descricao + ")" : "")) : ["• Sem compromissos"]), ""];
  }).filter((line, index, array) => line !== "" || array[index + 1]);
  return { key: "agenda", title, source: sourceName, period: r.label, status: rows.length ? "success" : "empty", empty: "Sem compromissos nos proximos 2 dias.", lines };
}
async function decisionsBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const title = "🎯 Precisa de voce";
  const sourceName = "atividades_tarefas";
  const result = await source<any[]>(client.from(sourceName).select("titulo, prioridade, status, prazo").eq("tenant_id", tenantId).in("status", ["pendente", "em_andamento", "bloqueada"]).order("prazo", { ascending: true, nullsFirst: false }).limit(8), []);
  if (result.status === "error") return blockError("decisoes", title, sourceName, result.error, "pendentes");
  const rows = result.data;
  if (!rows.length) return blockEmpty("decisoes", title, sourceName, "Sem decisoes pendentes no momento.", "pendentes");
  return { key: "decisoes", title, source: sourceName, period: "pendentes", status: "success", empty: "Sem decisoes pendentes no momento.", lines: rows.map((i) => "• " + i.titulo + (i.prazo ? " - prazo " + date(i.prazo) : "")) };
}
async function presenceBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const title = "🛡️ Saude digital";
  const sourceName = "digital_assets + catalog_sales_links.presence_asset_id";
  const [assetsResult, linksResult] = await Promise.all([
    source<any[]>(client.from("digital_assets").select("id, name, asset_type, environment, monitoring_enabled, last_status, last_checked_at").eq("tenant_id", tenantId).eq("monitoring_enabled", true).limit(500), []),
    source<any[]>(client.from("catalog_sales_links").select("id, technical_health, last_checked_at, presence_asset_id").eq("tenant_id", tenantId).not("presence_asset_id", "is", null).limit(500), []),
  ]);
  if (assetsResult.status === "error") return blockError("presence", title, sourceName, assetsResult.error, "estado atual");
  if (linksResult.status === "error") return blockError("presence", title, sourceName, linksResult.error, "estado atual");
  const assets = assetsResult.data.filter((asset) => asset.environment !== "dev" && !String(asset.name ?? "").startsWith("QA Presence Center"));
  const ok = ["healthy", "funcionando", "redirecting", "redirecionando", "ok"];
  const bad = ["critical", "broken", "quebrado", "indisponivel", "down", "warning"];
  const healthyAssets = assets.filter((a) => ok.includes(String(a.last_status).toLowerCase())).length;
  const problemAssets = assets.filter((a) => bad.includes(String(a.last_status).toLowerCase())).length;
  const links = linksResult.data;
  const healthyLinks = links.filter((l) => ok.includes(String(l.technical_health).toLowerCase())).length;
  const problemLinks = links.filter((l) => bad.includes(String(l.technical_health).toLowerCase())).length;
  const last = [...assets, ...links].map((x) => x.last_checked_at).filter(Boolean).sort().pop();
  if (!assets.length && !links.length) return blockEmpty("presence", title, sourceName, "Sem ativos monitorados no Presence.", "estado atual");
  const lines = ["✅ " + healthyAssets + "/" + assets.length + " ativos funcionando", "✅ " + healthyLinks + "/" + links.length + " links de venda funcionando"];
  if (problemAssets) lines.push("⚠️ " + problemAssets + " ativo(s) precisam de atencao");
  if (problemLinks) lines.push("⚠️ " + problemLinks + " link(s) de venda precisam de atencao");
  if (last) lines.push("Ultima verificacao: " + datetime(last));
  return { key: "presence", title, source: sourceName, period: "estado atual", status: "success", empty: "Sem dados de saude digital disponiveis.", lines };
}
async function instagramBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const title = "📈 Marketing · Instagram";
  const sourceName = "instagram_follower_growth_summary + instagram_posts + instagram_interactions";
  const [summary, posts, interactions] = await Promise.all([
    source<any>(client.from("instagram_follower_growth_summary").select("*").eq("tenant_id", tenantId).maybeSingle(), null),
    source<any[]>(client.from("instagram_posts").select("legenda, tipo, raw_payload, data_postagem").eq("tenant_id", tenantId).order("data_postagem", { ascending: false }).limit(30), []),
    source<any[]>(client.from("instagram_interactions").select("id, status, source, marketing_type").eq("tenant_id", tenantId).limit(200), []),
  ]);
  const errored = [summary, posts, interactions].find((item) => item.status === "error");
  if (errored) return blockError("marketing_instagram", title, sourceName, errored.error, "ultimos 30 dias");
  const followers = n(summary.data?.followers_current ?? summary.data?.current_followers);
  const delta = n(summary.data?.delta_30d ?? summary.data?.growth_30d);
  const reach = posts.data.reduce((total, post) => total + n(post.raw_payload?.reach), 0);
  const saved = posts.data.reduce((total, post) => total + n(post.raw_payload?.saved), 0);
  const comments = posts.data.reduce((total, post) => total + n(post.raw_payload?.comentarios ?? post.raw_payload?.comments), 0);
  const best = posts.data.slice().sort((a, b) => n(b.raw_payload?.reach) - n(a.raw_payload?.reach))[0];
  const pending = interactions.data.filter((i) => ["pendente", "open", "novo"].includes(String(i.status).toLowerCase())).length;
  const lines: string[] = [];
  if (followers) lines.push("Seguidores: " + followers.toLocaleString("pt-BR") + (delta ? " (" + (delta >= 0 ? "+" : "") + delta + " em 30 dias)" : ""));
  if (reach || saved || comments) lines.push("Alcance: " + reach.toLocaleString("pt-BR") + " · Interacoes: " + comments.toLocaleString("pt-BR") + " · Salvos: " + saved.toLocaleString("pt-BR"));
  if (best) lines.push("Destaque: " + (best.legenda ?? best.raw_payload?.legenda ?? "post sem legenda").slice(0, 80) + "... · " + n(best.raw_payload?.reach).toLocaleString("pt-BR") + " de alcance");
  if (pending) lines.push("Interacoes pendentes: " + pending);
  if (!lines.length) return blockEmpty("marketing_instagram", title, sourceName, "Sem dados de Instagram no recorte.", "ultimos 30 dias");
  return { key: "marketing_instagram", title, source: sourceName, period: "ultimos 30 dias", status: "success", empty: "Sem dados de Instagram no recorte.", lines };
}
async function adsBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period);
  const title = "📣 Marketing · Ads";
  const sourceName = "instagram_ads_daily";
  const result = await source<any[]>(client.from(sourceName).select("date, spend, reach, impressions, clicks, campaign_name").eq("tenant_id", tenantId).gte("date", r.from).lte("date", r.to).limit(500), []);
  if (result.status === "error") return blockError("marketing_ads", title, sourceName, result.error, r.label);
  const rows = result.data;
  if (!rows.length) return blockEmpty("marketing_ads", title, sourceName, "Sem dados de Ads em " + r.label.toLowerCase() + ".", r.label);
  const spend = rows.reduce((sum, row) => sum + n(row.spend), 0);
  const reach = rows.reduce((sum, row) => sum + n(row.reach), 0);
  const clicks = rows.reduce((sum, row) => sum + n(row.clicks), 0);
  const campaigns = new Set(rows.map((row) => row.campaign_name).filter(Boolean)).size;
  return { key: "marketing_ads", title, source: sourceName, period: r.label, status: "success", empty: "Sem dados de Ads em " + r.label.toLowerCase() + ".", lines: ["Periodo: " + r.label, "Investimento: " + money(spend), "Alcance: " + reach.toLocaleString("pt-BR") + " · Cliques: " + clicks.toLocaleString("pt-BR"), "Campanhas: " + campaigns] };
}
async function comercialBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period);
  const title = "💰 Comercial";
  const sourceName = "comercial_vendas";
  const result = await source<any[]>(client.from(sourceName).select("transaction_id, status_normalizado, sale_confirmed, revenue_eligible, moeda, valor_bruto, data_compra, commercial_transaction").eq("tenant_id", tenantId).eq("commercial_transaction", true).gte("data_compra", r.from).lte("data_compra", r.to).limit(2000), []);
  if (result.status === "error") return blockError("comercial", title, sourceName, result.error, r.label);
  const rows = result.data;
  if (!rows.length) return blockEmpty("comercial", title, sourceName, "Sem vendas comerciais em " + r.label.toLowerCase() + ".", r.label);
  const confirmed = rows.filter((row) => row.sale_confirmed === true);
  const revenue = confirmed.filter((row) => row.revenue_eligible === true && String(row.moeda ?? "BRL").toUpperCase() === "BRL");
  const gross = revenue.reduce((sum, row) => sum + n(row.valor_bruto), 0);
  const refunded = rows.filter((row) => ["REFUNDED", "CHARGEBACK"].includes(String(row.status_normalizado).toUpperCase())).length;
  return { key: "comercial", title, source: sourceName, period: r.label, status: "success", empty: "Sem vendas comerciais em " + r.label.toLowerCase() + ".", lines: ["Periodo: " + r.label, confirmed.length + " vendas confirmadas", "Receita confirmada BRL: " + money(gross), "Ticket medio: " + money(confirmed.length ? gross / confirmed.length : 0), "Reembolsos/chargebacks: " + refunded] };
}
async function financeBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period);
  const title = "💳 Financeiro";
  const sourceName = "fin_lancamentos";
  const result = await source<any[]>(client.from(sourceName).select("tipo, status, valor, data, descricao").eq("tenant_id", tenantId).gte("data", r.from).lte("data", r.to).limit(2000), []);
  if (result.status === "error") return blockError("financeiro", title, sourceName, result.error, r.label);
  const rows = result.data;
  if (!rows.length) return blockEmpty("financeiro", title, sourceName, "Sem lancamentos em " + r.label.toLowerCase() + ".", r.label);
  const entradas = rows.filter((row) => String(row.tipo).toLowerCase() === "entrada" && ["recebido", "pago"].includes(String(row.status).toLowerCase())).reduce((sum, row) => sum + n(row.valor), 0);
  const saidas = rows.filter((row) => String(row.tipo).toLowerCase() === "saida" && ["pago", "recebido"].includes(String(row.status).toLowerCase())).reduce((sum, row) => sum + n(row.valor), 0);
  const aReceber = rows.filter((row) => String(row.tipo).toLowerCase() === "entrada" && String(row.status).toLowerCase() === "previsto").reduce((sum, row) => sum + n(row.valor), 0);
  const aPagar = rows.filter((row) => String(row.tipo).toLowerCase() === "saida" && String(row.status).toLowerCase() === "previsto").reduce((sum, row) => sum + n(row.valor), 0);
  return { key: "financeiro", title, source: sourceName, period: r.label, status: "success", empty: "Sem lancamentos em " + r.label.toLowerCase() + ".", lines: ["Periodo: " + r.label, "Entrou na conta: " + money(entradas), "Saiu da conta: " + money(saidas), "A receber: " + money(aReceber) + " · A pagar: " + money(aPagar)] };
}
async function interactionsBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period);
  const title = "💬 Interacoes - " + r.label;
  const sourceName = "instagram_interactions + ocorrencias_chamados + norwyn_support_tickets";
  const fromTs = r.from + "T00:00:00";
  const toTs = r.to + "T23:59:59";
  const fromDate = r.from;
  const toDate = r.to;
  const pendingInteraction = ["novo", "pendente", "open"];
  const openOccurrence = ["aberto", "em_andamento", "reaberto"];
  const openTicket = ["open", "waiting_student", "waiting_third_party"];
  const [commentsTotal, commentsPending, directEver, directTotal, directPending, openOccurrences, openTickets] = await Promise.all([
    sourceCount(client.from("instagram_interactions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("source", "post_comment").gte("interaction_at", fromTs).lte("interaction_at", toTs)),
    sourceCount(client.from("instagram_interactions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("source", "post_comment").in("status", pendingInteraction).gte("interaction_at", fromTs).lte("interaction_at", toTs)),
    sourceCount(client.from("instagram_interactions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("source", "direct_message")),
    sourceCount(client.from("instagram_interactions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("source", "direct_message").gte("interaction_at", fromTs).lte("interaction_at", toTs)),
    sourceCount(client.from("instagram_interactions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("source", "direct_message").in("status", pendingInteraction).gte("interaction_at", fromTs).lte("interaction_at", toTs)),
    sourceCount(client.from("ocorrencias_chamados").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", openOccurrence).gte("data_chamado", fromDate).lte("data_chamado", toDate)),
    sourceCount(client.from("norwyn_support_tickets").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", openTicket).gte("updated_at", fromTs).lte("updated_at", toTs)),
  ]);
  const results = [commentsTotal, commentsPending, directEver, directTotal, directPending, openOccurrences, openTickets];
  const errors = results.filter((item) => item.status === "error");
  if (errors.length === results.length) return blockError("interacoes", title, sourceName, errors.map((item) => item.error).join(" | "), r.label);
  const supportOpen = openOccurrences.data + openTickets.data;
  const lines = [commentsTotal.data + " comentarios", commentsPending.data + " pendentes de resposta"];
  if (directEver.data > 0) {
    lines.push(directTotal.data + " Directs", directPending.data + " Direct pendente(s)");
  } else {
    lines.push("Directs: nao disponivel nesta fonte");
  }
  lines.push(supportOpen + " ocorrencia(s) de suporte abertas");
  if (errors.length) lines.push("Fonte parcial indisponivel: " + errors.map((item) => item.error ?? "erro desconhecido").join(" | "));
  return { key: "interacoes", title, source: sourceName, period: r.label, status: errors.length ? "error" : "success", reason: errors.map((item) => item.error).filter(Boolean).join(" | ") || undefined, empty: "Sem interacoes pendentes no recorte.", lines };
}
async function activitiesBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const title = "✅ Atividades";
  const sourceName = "atividades_tarefas";
  const result = await source<any[]>(client.from(sourceName).select("titulo, status, prioridade, prazo").eq("tenant_id", tenantId).in("status", ["pendente", "em_andamento", "bloqueada"]).order("prazo", { ascending: true, nullsFirst: false }).limit(8), []);
  if (result.status === "error") return blockError("atividades", title, sourceName, result.error, "pendentes");
  if (!result.data.length) return blockEmpty("atividades", title, sourceName, "Sem atividades pendentes.", "pendentes");
  return { key: "atividades", title, source: sourceName, period: "pendentes", status: "success", empty: "Sem atividades pendentes.", lines: result.data.map((row) => "• " + row.titulo + (row.prazo ? " - " + date(row.prazo) : "")) };
}
async function alunoBlock(client: AnyClient, tenantId: string, filters: RelatorioFiltros): Promise<Block> {
  const ids = filters.customer_ids ?? [];
  if (!ids.length) throw new Error("Selecione pelo menos um aluno para usar Aluno 360.");
  const title = "👤 Aluno 360";
  const sourceName = "norwyn_customer_student_360";
  const result = await source<any[]>(client.from(sourceName).select("customer_id, display_name, email, ltv_brl, purchase_count, product_count, last_purchase_at, last_access_at").eq("tenant_id", tenantId).in("customer_id", ids).limit(5), []);
  if (result.status === "error") return blockError("aluno_360", title, sourceName, result.error, "alunos selecionados");
  if (!result.data.length) return blockEmpty("aluno_360", title, sourceName, "Aluno nao encontrado no recorte.", "alunos selecionados");
  return { key: "aluno_360", title, source: sourceName, period: "alunos selecionados", status: "success", empty: "Aluno nao encontrado no recorte.", lines: result.data.flatMap((student) => ["• " + (student.display_name ?? student.email ?? student.customer_id), "  LTV: " + money(n(student.ltv_brl)) + " · " + n(student.purchase_count) + " compra(s) · " + n(student.product_count) + " produto(s)", "  Ultima compra: " + date(student.last_purchase_at) + " · Ultimo acesso: " + date(student.last_access_at)]) };
}
function recommendationBlock(blocks: Block[]): Block {
  const presenceIssue = blocks.find((block) => block.key === "presence" && block.lines.some((line) => line.includes("⚠️")));
  const interactionIssue = blocks.find((block) => block.key === "interacoes" && block.lines.some((line) => !line.startsWith("0 ") && !line.startsWith("Fonte parcial")));
  const agendaWithItems = blocks.find((block) => block.key === "agenda" && block.lines.some((line) => line.startsWith("• ") && !line.includes("Sem compromissos")));
  const line = presenceIssue ? "Priorizar ativos digitais com problema antes de novas campanhas." : interactionIssue ? "Responder interacoes pendentes para evitar perda de oportunidade." : agendaWithItems ? "Conferir agenda e preparar materiais dos compromissos principais." : null;
  return { key: "recomendacoes", title: "💡 Norwyn recomenda", source: "blocos renderizados", period: "estado atual", status: line ? "success" : "empty", empty: "Sem recomendacao automatica relevante.", lines: line ? [line] : [] };
}
function shouldRenderBlock(block: Block, filters: RelatorioFiltros) {
  if (block.status === "error") return true;
  if (block.lines.length) return true;
  return cfg(filters, block.key).empty_behavior === "show_empty";
}
async function buildBlocks(client: AnyClient, tenantId: string, filters: RelatorioFiltros): Promise<{ requested: Block[]; rendered: Block[]; diagnostics: BlockDiagnostic[] }> {
  const requested: Block[] = [];
  if (enabled(filters, "agenda")) requested.push(await agendaBlock(client, tenantId, cfg(filters, "agenda").periodo));
  if (enabled(filters, "decisoes")) requested.push(await decisionsBlock(client, tenantId));
  if (enabled(filters, "presence")) requested.push(await presenceBlock(client, tenantId));
  if (enabled(filters, "marketing_instagram")) requested.push(await instagramBlock(client, tenantId));
  if (enabled(filters, "marketing_ads")) requested.push(await adsBlock(client, tenantId, cfg(filters, "marketing_ads").periodo));
  if (enabled(filters, "comercial")) requested.push(await comercialBlock(client, tenantId, cfg(filters, "comercial").periodo));
  if (enabled(filters, "financeiro")) requested.push(await financeBlock(client, tenantId, cfg(filters, "financeiro").periodo));
  if (enabled(filters, "interacoes")) requested.push(await interactionsBlock(client, tenantId, cfg(filters, "interacoes").periodo));
  if (enabled(filters, "atividades")) requested.push(await activitiesBlock(client, tenantId));
  if (enabled(filters, "aluno_360")) requested.push(await alunoBlock(client, tenantId, filters));
  if (enabled(filters, "recomendacoes")) requested.push(recommendationBlock(requested));
  const rendered = requested.filter((block) => shouldRenderBlock(block, filters));
  const diagnostics = requested.map((block) => ({ key: block.key, title: block.title, status: block.status, rendered: rendered.includes(block), source: block.source, period: block.period, reason: block.reason ?? (block.status === "empty" ? block.empty : undefined), lines: block.lines.length }));
  return { requested, rendered, diagnostics };
}
function subject(tipo: RelatorioTipoResumo) { if (tipo === "aluno_360") return "Aluno 360"; if (tipo === "marketing") return "Relatorio de Marketing"; if (tipo === "comercial") return "Relatorio Comercial"; if (tipo === "presence") return "Saude digital"; if (tipo === "agenda" || tipo === "lembrete_agendamento") return "Agenda Norwyn"; return "Daily da Norwyn"; }
function message(tipo: RelatorioTipoResumo, blocks: Block[]) {
  const header = tipo === "aluno_360" ? `👤 *${subject(tipo)}*` : "☀️ *Bom dia — Norwyn*";
  const lines = [header, `📅 ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date())}`, ""];
  for (const b of blocks) { lines.push(`*${b.title}*`); lines.push(...(b.lines.length ? b.lines : b.empty ? [b.empty] : [])); lines.push(""); }
  lines.push("Norwyn · Relatorio gerado automaticamente"); return lines.join("\n").trim();
}
function isActive(schedule: RelatorioAgendamento) { return schedule.ativo !== false && schedule.status === "ativo"; }
function dueToday(schedule: RelatorioAgendamento, now: Date) {
  const day = now.getDay(); const dayOfMonth = Number(new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: schedule.timezone ?? tz }).format(now));
  if (["sob_demanda", "imediato"].includes(schedule.frequencia)) return false;
  if (schedule.frequencia === "unico") return !schedule.last_run_at;
  if (schedule.frequencia === "diario") return true;
  if (schedule.frequencia === "dias_uteis") return day >= 1 && day <= 5;
  if (schedule.frequencia === "semanal") return !schedule.dias_semana?.length || schedule.dias_semana.includes(day);
  if (schedule.frequencia === "quinzenal") return dayOfMonth === 1 || dayOfMonth === 15;
  if (schedule.frequencia === "mensal") return !schedule.dia_mes || schedule.dia_mes === dayOfMonth;
  if (schedule.frequencia === "fechamento_mes") return dayOfMonth >= 28;
  return false;
}
function inWindow(schedule: RelatorioAgendamento, now: Date, minutes: number) {
  if (!schedule.horario) return true; const [h, m] = schedule.horario.split(":").map(Number); if (!Number.isFinite(h) || !Number.isFinite(m)) return true;
  const local = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: schedule.timezone ?? tz }).format(now); const [ch, cm] = local.split(":").map(Number);
  return Math.abs((ch * 60 + cm) - (h * 60 + m)) <= minutes;
}
async function alreadyToday(client: AnyClient, tenantId: string, scheduleId: string) {
  const { data } = await client.from("relatorio_envios").select("id").eq("tenant_id", tenantId).eq("agendamento_id", scheduleId).gte("created_at", `${today()}T00:00:00`).limit(1).maybeSingle();
  return Boolean(data);
}

export async function getRelatoriosContext(): Promise<RelatoriosContext> {
  const auth = await authContext(); const modules = allowed(auth.role);
  if (!auth.tenantId) return { tenant: null, allowedModules: modules, diagnostic: "Usuario sem tenant ativo.", canWrite: false, destinatarios: [], agendamentos: [], envios: [], enviosTotal: 0, updatedAt: null };
  const [tenant, recipients, schedules, sends] = await Promise.all([
    auth.dataClient.from("tenants").select("id, nome").eq("id", auth.tenantId).maybeSingle(),
    auth.dataClient.from("relatorio_destinatarios").select("*").eq("tenant_id", auth.tenantId).order("nome", { ascending: true }),
    auth.dataClient.from("relatorio_agendamentos").select("*").eq("tenant_id", auth.tenantId).order("created_at", { ascending: false }),
    auth.dataClient.from("relatorio_envios").select("*", { count: "exact" }).eq("tenant_id", auth.tenantId).order("created_at", { ascending: false }).range(0, 24),
  ]);
  return { tenant: tenant.data ?? null, allowedModules: modules, diagnostic: tenant.error?.message ?? recipients.error?.message ?? schedules.error?.message ?? sends.error?.message ?? null, canWrite: canWrite(auth.role), destinatarios: recipients.data ?? [], agendamentos: schedules.data ?? [], envios: sends.data ?? [], enviosTotal: sends.count ?? sends.data?.length ?? 0, updatedAt: new Date().toISOString() };
}
export async function assertRelatoriosWriteAccess() {
  const auth = await authContext(); if (!auth.tenantId) throw new Error("Usuario sem tenant ativo."); if (!canWrite(auth.role)) throw new Error("Perfil sem permissao para gerenciar relatorios.");
  return { tenantId: auth.tenantId, role: auth.role, userId: auth.userId, dataClient: auth.dataClient };
}
export async function listRelatorioEnvios(params: { page?: number; pageSize?: number; status?: string; origin?: string; channel?: string; q?: string; from?: string; to?: string } = {}) {
  const auth = await assertRelatoriosWriteAccess(); const page = Math.max(1, params.page ?? 1); const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 25)); const from = (page - 1) * pageSize;
  let query = auth.dataClient.from("relatorio_envios").select("*", { count: "exact" }).eq("tenant_id", auth.tenantId);
  if (params.status) query = query.eq("status", params.status); if (params.origin) query = query.eq("origem", params.origin); if (params.channel) query = query.eq("canal", params.channel); if (params.from) query = query.gte("created_at", `${params.from}T00:00:00`); if (params.to) query = query.lte("created_at", `${params.to}T23:59:59`); if (params.q) query = query.or(`assunto.ilike.%${params.q}%,resumo.ilike.%${params.q}%,destino.ilike.%${params.q}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1); if (error) throw error;
  return { data: (data ?? []) as RelatorioEnvio[], total: count ?? 0, page, pageSize };
}
async function insertEnvioLog(client: AnyClient, payload: Record<string, unknown>) {
  const { data, error } = await client.from("relatorio_envios").insert(payload).select("*").single();
  if (!error) return data as RelatorioEnvio;
  const message = String(error.message ?? "").toLowerCase();
  if (!message.includes("origin") && !message.includes("origem") && !message.includes("resumo") && !message.includes("modulos") && !message.includes("filtros") && !message.includes("generated_at")) throw error;
  const fallback = {
    tenant_id: payload.tenant_id,
    agendamento_id: payload.agendamento_id,
    destinatario_id: payload.destinatario_id,
    tipo_resumo: payload.tipo_resumo,
    canal: payload.canal,
    destino: payload.destino,
    status: payload.status,
    assunto: payload.assunto,
    mensagem: payload.mensagem,
    metadata: { ...(payload.metadata as Record<string, unknown>), origem: payload.origem, resumo: payload.resumo, modulos: payload.modulos, filtros: payload.filtros, generated_at: payload.generated_at },
  };
  const retry = await client.from("relatorio_envios").insert(fallback).select("*").single();
  if (retry.error) throw retry.error;
  return retry.data as RelatorioEnvio;
}
async function prepareDispatch(client: AnyClient, tenantId: string, schedule: RelatorioAgendamento, recipient: RelatorioDestinatario, origin: "manual" | "agendado" | "preview" | "sistema", createLog: boolean, scheduleIdForLog: string | null = schedule.id) {
  const filters = filtersFor(schedule.filtros, schedule.tipo_resumo);
  const result = await buildBlocks(client, tenantId, filters);
  const text = message(schedule.tipo_resumo, result.rendered);
  const modules = result.rendered.map((block) => block.key);
  const requestedModules = result.requested.map((block) => block.key);
  const renderedCount = result.diagnostics.filter((block) => block.rendered).length;
  const emptyCount = result.diagnostics.filter((block) => block.status === "empty").length;
  const errorCount = result.diagnostics.filter((block) => block.status === "error").length;
  const summary = "Solicitados: " + result.requested.length + " · Renderizados: " + renderedCount + " · Sem dados: " + emptyCount + " · Erro: " + errorCount;
  const metadata = { recipient_name: recipient.nome, schedule_name: schedule.nome, requested_modules: requestedModules, rendered_modules: modules, block_diagnostics: result.diagnostics, block_counts: { requested: result.requested.length, rendered: renderedCount, empty: emptyCount, error: errorCount } };
  let log: RelatorioEnvio | null = null;
  if (createLog) {
    log = await insertEnvioLog(client, { tenant_id: tenantId, agendamento_id: scheduleIdForLog, destinatario_id: recipient.id, tipo_resumo: schedule.tipo_resumo, canal: schedule.canal, destino: schedule.canal === "telegram" ? recipient.telegram_chat_id : recipient.email, status: "preparado", origem: origin, assunto: subject(schedule.tipo_resumo), resumo: summary, mensagem: text, modulos: modules, filtros: filters, metadata, generated_at: new Date().toISOString() });
  }
  return { schedule, recipient, log, subject: subject(schedule.tipo_resumo), text, summary, modules, requestedModules, filters, diagnostics: result.diagnostics, channel: schedule.canal, telegramChatId: recipient.telegram_chat_id };
}
export async function getRelatorioPreviewFromDraft(payload: Partial<RelatorioAgendamento>) {
  const auth = await assertRelatoriosWriteAccess();
  const recipientId = String(payload.destinatario_id ?? "");
  if (!recipientId) throw new Error("Escolha um destino antes de gerar a pre-visualizacao real.");
  const { data: recipient, error: recipientError } = await auth.dataClient.from("relatorio_destinatarios").select("*").eq("tenant_id", auth.tenantId).eq("id", recipientId).maybeSingle();
  if (recipientError) throw recipientError;
  if (!recipient) throw new Error("Destinatario do relatorio nao encontrado.");
  const draft = { ...payload, id: "preview", tenant_id: auth.tenantId, status: payload.status ?? "rascunho", ativo: payload.ativo ?? true, canal: payload.canal ?? "telegram", tipo_resumo: payload.tipo_resumo ?? "personalizado", filtros: payload.filtros ?? {}, incluir_modulos: payload.incluir_modulos ?? [] } as RelatorioAgendamento;
  return prepareDispatch(auth.dataClient, auth.tenantId, draft, recipient as RelatorioDestinatario, "preview", false);
}
export async function getRelatorioDispatchFromDraft(payload: Partial<RelatorioAgendamento>) {
  const auth = await assertRelatoriosWriteAccess();
  const recipientId = String(payload.destinatario_id ?? "");
  if (!recipientId) throw new Error("Escolha um destino antes de enviar o relatorio.");
  const { data: recipient, error: recipientError } = await auth.dataClient.from("relatorio_destinatarios").select("*").eq("tenant_id", auth.tenantId).eq("id", recipientId).maybeSingle();
  if (recipientError) throw recipientError;
  if (!recipient) throw new Error("Destinatario do relatorio nao encontrado.");
  const draft = { ...payload, id: "manual", tenant_id: auth.tenantId, status: "rascunho", ativo: false, canal: payload.canal ?? "telegram", tipo_resumo: payload.tipo_resumo ?? "personalizado", filtros: payload.filtros ?? {}, incluir_modulos: payload.incluir_modulos ?? [] } as RelatorioAgendamento;
  return prepareDispatch(auth.dataClient, auth.tenantId, draft, recipient as RelatorioDestinatario, "manual", true, null);
}
export async function getRelatorioDispatchByScheduleId(scheduleId: string, options: DispatchOptions = {}) {
  const auth = await assertRelatoriosWriteAccess(); const origin = options.origin ?? "manual"; const createLog = options.createLog ?? true;
  const { data: schedule, error } = await auth.dataClient.from("relatorio_agendamentos").select("*").eq("tenant_id", auth.tenantId).eq("id", scheduleId).maybeSingle(); if (error) throw error; if (!schedule) throw new Error("Agendamento nao encontrado."); if (options.requireActive && !isActive(schedule as RelatorioAgendamento)) throw new Error("Agendamento nao esta ativo.");
  const { data: recipient, error: recipientError } = await auth.dataClient.from("relatorio_destinatarios").select("*").eq("tenant_id", auth.tenantId).eq("id", schedule.destinatario_id).maybeSingle(); if (recipientError) throw recipientError; if (!recipient) throw new Error("Destinatario do agendamento nao encontrado.");
  return prepareDispatch(auth.dataClient, auth.tenantId, schedule as RelatorioAgendamento, recipient as RelatorioDestinatario, origin, createLog);
}
export async function getRelatorioDispatchesDue(now: Date | string = new Date(), windowMinutes = 20) {
  const runAt = typeof now === "string" ? (() => { const [h, m] = now.split(":").map(Number); const d = new Date(); if (Number.isFinite(h)) d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0); return d; })() : now;
  const admin = createAdminClient(); if (!admin) throw new Error("Cliente administrativo indisponivel para despachar relatorios.");
  let schedulesResult = await admin.from("relatorio_agendamentos").select("*").eq("ativo", true).eq("status", "ativo").order("created_at", { ascending: true }).limit(200);
  if (schedulesResult.error && String(schedulesResult.error.message ?? "").toLowerCase().includes("status")) {
    schedulesResult = await admin.from("relatorio_agendamentos").select("*").eq("ativo", true).order("created_at", { ascending: true }).limit(200);
  }
  const { data, error } = schedulesResult; if (error) throw error;
  const dispatches = [];
  for (const schedule of (data ?? []) as RelatorioAgendamento[]) {
    if (!dueToday(schedule, runAt) || !inWindow(schedule, runAt, windowMinutes) || await alreadyToday(admin, schedule.tenant_id, schedule.id)) continue;
    const { data: recipient } = await admin.from("relatorio_destinatarios").select("*").eq("tenant_id", schedule.tenant_id).eq("id", schedule.destinatario_id).maybeSingle(); if (!recipient) continue;
    dispatches.push(await prepareDispatch(admin, schedule.tenant_id, schedule, recipient as RelatorioDestinatario, "agendado", true));
  }
  return dispatches;
}
export async function updateRelatorioEnvioStatus(params: { logId: string; status: "enviado" | "erro" | "ignorado"; error?: string; metadata?: Record<string, unknown> }) {
  const client = createAdminClient() ?? (await createClient()); const payload: Record<string, unknown> = { status: params.status, updated_at: new Date().toISOString() };
  if (params.status === "enviado") payload.sent_at = new Date().toISOString(); if (params.error) payload.erro = params.error; if (params.metadata) payload.metadata = params.metadata;
  const { data, error } = await client.from("relatorio_envios").update(payload).eq("id", params.logId).select("*").single(); if (error) throw error;
  const envio = data as RelatorioEnvio;
  if (params.status === "enviado" && envio.destinatario_id) { await client.from("relatorio_destinatarios").update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", envio.destinatario_id); if (envio.agendamento_id) await client.from("relatorio_agendamentos").update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", envio.agendamento_id); }
  return envio;
}
