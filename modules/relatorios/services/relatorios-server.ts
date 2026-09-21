import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { RelatorioAgendamento, RelatorioBlocoKey, RelatorioDestinatario, RelatorioEnvio, RelatorioFiltros, RelatorioPeriodo, RelatoriosContext, RelatorioTipoResumo } from "@/modules/relatorios/types";

type AnyClient = any;
type Block = { key: RelatorioBlocoKey; title: string; lines: string[]; empty?: string };
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
  if (period === "ultimos_90d") return { from: plusDays(-90), to: t, label: "Ultimos 90 dias" };
  if (period === "mes_atual") return { from: t.slice(0, 8) + "01", to: t, label: "Mes atual" };
  if (period === "ano_atual") return { from: t.slice(0, 4) + "-01-01", to: t, label: "Ano atual" };
  if (period === "ultimos_30d") return { from: plusDays(-30), to: t, label: "Ultimos 30 dias" };
  return { from: t, to: t, label: "Hoje" };
}
async function safe<T>(query: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> { try { const { data, error } = await query; return error ? fallback : data ?? fallback; } catch { return fallback; } }
function filtersFor(input: RelatorioFiltros | null | undefined, tipo: RelatorioTipoResumo): RelatorioFiltros {
  const source = input ?? {}; const blocks = { ...defaults, ...(source.blocos ?? {}) }; const keys = typeBlocks[tipo] ?? typeBlocks.personalizado;
  for (const key of keys) blocks[key] = { enabled: true, periodo: blocks[key]?.periodo ?? "hoje", empty_behavior: blocks[key]?.empty_behavior ?? "omit" };
  return { ...source, nivel_detalhe: source.nivel_detalhe ?? "normal", include_recommendation: source.include_recommendation ?? true, customer_ids: Array.isArray(source.customer_ids) ? source.customer_ids : [], blocos: blocks };
}
function enabled(filters: RelatorioFiltros, key: RelatorioBlocoKey) { return Boolean(filters.blocos?.[key]?.enabled); }
function cfg(filters: RelatorioFiltros, key: RelatorioBlocoKey) { return filters.blocos?.[key] ?? { enabled: false, periodo: "hoje" as RelatorioPeriodo }; }
async function agendaBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period); const rows = await safe<any[]>(client.from("agenda_eventos").select("titulo, inicio, observacao, local").eq("tenant_id", tenantId).gte("inicio", `${r.from}T00:00:00`).lte("inicio", `${r.to}T23:59:59`).order("inicio", { ascending: true }).limit(12), []);
  return { key: "agenda", title: "📅 Agenda", empty: `Sem compromissos em ${r.label.toLowerCase()}.`, lines: rows.map((e) => `• ${datetime(e.inicio)} - ${e.titulo}${e.observacao ? ` (${e.observacao})` : ""}`) };
}
async function decisionsBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const rows = await safe<any[]>(client.from("atividades_tarefas").select("titulo, prioridade, status, prazo").eq("tenant_id", tenantId).in("status", ["pendente", "em_andamento", "bloqueada"]).order("prazo", { ascending: true, nullsFirst: false }).limit(8), []);
  return { key: "decisoes", title: "🎯 Precisa de voce", empty: "Sem decisoes pendentes no momento.", lines: rows.map((i) => `• ${i.titulo}${i.prazo ? ` - prazo ${date(i.prazo)}` : ""}`) };
}
async function presenceBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const assets = await safe<any[]>(client.from("digital_assets").select("id, name, status, health_status, last_checked_at").eq("tenant_id", tenantId).eq("is_active", true).limit(500), []);
  const links = await safe<any[]>(client.from("catalog_sales_links").select("id, health_status, last_checked_at").eq("tenant_id", tenantId).limit(500), []);
  const ok = ["healthy", "funcionando", "redirecting", "redirecionando", "ok"];
  const bad = ["critical", "broken", "quebrado", "indisponivel", "down"];
  const healthyAssets = assets.filter((a) => ok.includes(String(a.health_status ?? a.status).toLowerCase())).length;
  const healthyLinks = links.filter((l) => ok.includes(String(l.health_status).toLowerCase())).length;
  const critical = assets.filter((a) => bad.includes(String(a.health_status ?? a.status).toLowerCase()));
  const last = [...assets, ...links].map((x) => x.last_checked_at).filter(Boolean).sort().pop();
  const lines = [`✅ ${healthyAssets}/${assets.length} ativos funcionando`, `✅ ${healthyLinks}/${links.length} links de venda funcionando`];
  if (critical.length) lines.push(`⚠️ ${critical.length} ativo(s) com problema: ${critical.slice(0, 3).map((x) => x.name).join(", ")}`);
  if (last) lines.push(`Ultima verificacao: ${datetime(last)}`);
  return { key: "presence", title: "🛡️ Saude digital", empty: "Sem dados de saude digital disponiveis.", lines };
}
async function instagramBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const [summary, posts, interactions] = await Promise.all([
    safe<any>(client.from("instagram_follower_growth_summary").select("*").eq("tenant_id", tenantId).maybeSingle(), null),
    safe<any[]>(client.from("instagram_posts").select("caption, media_type, reach, saved, likes, comments_count, posted_at").eq("tenant_id", tenantId).order("posted_at", { ascending: false }).limit(30), []),
    safe<any[]>(client.from("instagram_interactions").select("id, status, interaction_type").eq("tenant_id", tenantId).limit(200), []),
  ]);
  const followers = n(summary?.followers_current ?? summary?.current_followers); const delta = n(summary?.delta_30d ?? summary?.growth_30d);
  const reach = posts.reduce((s, p) => s + n(p.reach), 0); const saved = posts.reduce((s, p) => s + n(p.saved), 0); const best = posts.slice().sort((a, b) => n(b.reach) - n(a.reach))[0];
  const pending = interactions.filter((i) => ["pendente", "open", "novo"].includes(String(i.status).toLowerCase())).length;
  const lines: string[] = [];
  if (followers) lines.push(`Seguidores: ${followers.toLocaleString("pt-BR")}${delta ? ` (${delta >= 0 ? "+" : ""}${delta} em 30 dias)` : ""}`);
  if (reach) lines.push(`Alcance: ${reach.toLocaleString("pt-BR")} · Salvos: ${saved.toLocaleString("pt-BR")}`);
  if (best) lines.push(`Destaque: ${(best.caption ?? "post sem legenda").slice(0, 80)}... · ${n(best.reach).toLocaleString("pt-BR")} de alcance`);
  if (pending) lines.push(`Interacoes pendentes: ${pending}`);
  return { key: "marketing_instagram", title: "📈 Marketing · Instagram", empty: "Sem dados de Instagram no recorte.", lines };
}
async function adsBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period); const rows = await safe<any[]>(client.from("instagram_ads_daily").select("date, spend, reach, impressions, clicks, campaign_name").eq("tenant_id", tenantId).gte("date", r.from).lte("date", r.to).limit(500), []);
  const spend = rows.reduce((s, x) => s + n(x.spend), 0); const reach = rows.reduce((s, x) => s + n(x.reach), 0); const clicks = rows.reduce((s, x) => s + n(x.clicks), 0); const campaigns = new Set(rows.map((x) => x.campaign_name).filter(Boolean)).size;
  return { key: "marketing_ads", title: "📣 Marketing · Ads", empty: `Sem dados de Ads em ${r.label.toLowerCase()}.`, lines: rows.length ? [`Periodo: ${r.label}`, `Investimento: ${money(spend)}`, `Alcance: ${reach.toLocaleString("pt-BR")} · Cliques: ${clicks.toLocaleString("pt-BR")}`, `Campanhas: ${campaigns}`] : [] };
}
async function comercialBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period); const rows = await safe<any[]>(client.from("comercial_vendas").select("transaction_id, status_normalizado, sale_confirmed, revenue_eligible, currency, valor_bruto_brl, data_compra").eq("tenant_id", tenantId).eq("commercial_transaction", true).gte("data_compra", r.from).lte("data_compra", r.to).limit(1000), []);
  const confirmed = rows.filter((x) => x.sale_confirmed === true); const revenue = confirmed.filter((x) => x.revenue_eligible === true && String(x.currency ?? "BRL").toUpperCase() === "BRL");
  const gross = revenue.reduce((s, x) => s + n(x.valor_bruto_brl), 0); const refunded = rows.filter((x) => ["REFUNDED", "CHARGEBACK"].includes(String(x.status_normalizado).toUpperCase())).length;
  return { key: "comercial", title: "💰 Comercial", empty: `Sem vendas comerciais em ${r.label.toLowerCase()}.`, lines: rows.length ? [`Periodo: ${r.label}`, `${confirmed.length} vendas confirmadas`, `Receita confirmada BRL: ${money(gross)}`, `Ticket medio: ${money(confirmed.length ? gross / confirmed.length : 0)}`, `Reembolsos/chargebacks: ${refunded}`] : [] };
}
async function financeBlock(client: AnyClient, tenantId: string, period: RelatorioPeriodo): Promise<Block> {
  const r = range(period); const rows = await safe<any[]>(client.from("fin_lancamentos").select("tipo, status, valor, data, descricao").eq("tenant_id", tenantId).gte("data", r.from).lte("data", r.to).limit(1000), []);
  const entradas = rows.filter((x) => String(x.tipo).toLowerCase() === "entrada" && ["recebido", "pago"].includes(String(x.status).toLowerCase())).reduce((s, x) => s + n(x.valor), 0);
  const saidas = rows.filter((x) => String(x.tipo).toLowerCase() === "saida" && ["pago", "recebido"].includes(String(x.status).toLowerCase())).reduce((s, x) => s + n(x.valor), 0);
  const aReceber = rows.filter((x) => String(x.tipo).toLowerCase() === "entrada" && String(x.status).toLowerCase() === "previsto").reduce((s, x) => s + n(x.valor), 0);
  const aPagar = rows.filter((x) => String(x.tipo).toLowerCase() === "saida" && String(x.status).toLowerCase() === "previsto").reduce((s, x) => s + n(x.valor), 0);
  return { key: "financeiro", title: "💳 Financeiro", empty: `Sem lancamentos em ${r.label.toLowerCase()}.`, lines: rows.length ? [`Periodo: ${r.label}`, `Entrou na conta: ${money(entradas)}`, `Saiu da conta: ${money(saidas)}`, `A receber: ${money(aReceber)} · A pagar: ${money(aPagar)}`] : [] };
}
async function interactionsBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const [ig, support] = await Promise.all([safe<any[]>(client.from("instagram_interactions").select("id, status, interaction_type").eq("tenant_id", tenantId).limit(300), []), safe<any[]>(client.from("support_occurrences").select("id, status, prioridade").eq("tenant_id", tenantId).limit(300), [])]);
  const pending = ["pendente", "open", "novo"]; const comments = ig.filter((x) => String(x.interaction_type).toLowerCase().includes("comment") && pending.includes(String(x.status).toLowerCase())).length; const directs = ig.filter((x) => String(x.interaction_type).toLowerCase().includes("direct") && pending.includes(String(x.status).toLowerCase())).length; const openSupport = support.filter((x) => !["resolvido", "fechado", "done", "closed"].includes(String(x.status).toLowerCase())).length;
  return { key: "interacoes", title: "💬 Interacoes", empty: "Sem interacoes pendentes no recorte.", lines: ig.length || support.length ? [`${comments} comentarios pendentes`, `${directs} directs pendentes`, `${openSupport} suporte/ocorrencias em aberto`] : [] };
}
async function activitiesBlock(client: AnyClient, tenantId: string): Promise<Block> {
  const rows = await safe<any[]>(client.from("atividades_tarefas").select("titulo, status, prioridade, prazo").eq("tenant_id", tenantId).in("status", ["pendente", "em_andamento", "bloqueada"]).order("prazo", { ascending: true, nullsFirst: false }).limit(8), []);
  return { key: "atividades", title: "✅ Atividades", empty: "Sem atividades pendentes.", lines: rows.map((x) => `• ${x.titulo}${x.prazo ? ` - ${date(x.prazo)}` : ""}`) };
}
async function alunoBlock(client: AnyClient, tenantId: string, filters: RelatorioFiltros): Promise<Block> {
  const ids = filters.customer_ids ?? []; if (!ids.length) return { key: "aluno_360", title: "👤 Aluno 360", empty: "Nenhum aluno selecionado.", lines: [] };
  const rows = await safe<any[]>(client.from("norwyn_customer_student_360").select("customer_id, name, email, ltv_brl, purchase_count, product_count, last_purchase_at, last_activity_at").eq("tenant_id", tenantId).in("customer_id", ids).limit(5), []);
  return { key: "aluno_360", title: "👤 Aluno 360", empty: "Aluno nao encontrado no recorte.", lines: rows.flatMap((s) => [`• ${s.name ?? s.email ?? s.customer_id}`, `  LTV: ${money(n(s.ltv_brl))} · ${n(s.purchase_count)} compra(s) · ${n(s.product_count)} produto(s)`, `  Ultima compra: ${date(s.last_purchase_at)} · Ultimo acesso: ${date(s.last_activity_at)}`]) };
}
function recommendationBlock(blocks: Block[]): Block {
  const issue = blocks.some((b) => b.key === "presence" && b.lines.some((l) => l.includes("⚠️"))); const interaction = blocks.some((b) => b.key === "interacoes" && b.lines.some((l) => !l.startsWith("0 "))); const agenda = blocks.some((b) => b.key === "agenda" && b.lines.length);
  const line = issue ? "Priorizar ativos digitais com problema antes de novas campanhas." : interaction ? "Responder interacoes pendentes para evitar perda de oportunidade." : agenda ? "Conferir agenda e preparar materiais dos compromissos principais." : "Manter acompanhamento preventivo e revisar proximas acoes do dia.";
  return { key: "recomendacoes", title: "💡 Norwyn recomenda", lines: [line] };
}
async function buildBlocks(client: AnyClient, tenantId: string, filters: RelatorioFiltros): Promise<Block[]> {
  const blocks: Block[] = [];
  if (enabled(filters, "agenda")) blocks.push(await agendaBlock(client, tenantId, cfg(filters, "agenda").periodo));
  if (enabled(filters, "decisoes")) blocks.push(await decisionsBlock(client, tenantId));
  if (enabled(filters, "presence")) blocks.push(await presenceBlock(client, tenantId));
  if (enabled(filters, "marketing_instagram")) blocks.push(await instagramBlock(client, tenantId));
  if (enabled(filters, "marketing_ads")) blocks.push(await adsBlock(client, tenantId, cfg(filters, "marketing_ads").periodo));
  if (enabled(filters, "comercial")) blocks.push(await comercialBlock(client, tenantId, cfg(filters, "comercial").periodo));
  if (enabled(filters, "financeiro")) blocks.push(await financeBlock(client, tenantId, cfg(filters, "financeiro").periodo));
  if (enabled(filters, "interacoes")) blocks.push(await interactionsBlock(client, tenantId));
  if (enabled(filters, "atividades")) blocks.push(await activitiesBlock(client, tenantId));
  if (enabled(filters, "aluno_360")) blocks.push(await alunoBlock(client, tenantId, filters));
  if (enabled(filters, "recomendacoes") || filters.include_recommendation) blocks.push(recommendationBlock(blocks));
  return blocks.filter((b) => b.lines.length || cfg(filters, b.key).empty_behavior === "show_empty");
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
async function prepareDispatch(client: AnyClient, tenantId: string, schedule: RelatorioAgendamento, recipient: RelatorioDestinatario, origin: "manual" | "agendado" | "preview" | "sistema", createLog: boolean) {
  const filters = filtersFor(schedule.filtros, schedule.tipo_resumo); const blocks = await buildBlocks(client, tenantId, filters); const text = message(schedule.tipo_resumo, blocks); const modules = blocks.map((b) => b.key); const summary = `${blocks.length} bloco(s): ${blocks.map((b) => b.title).join(", ")}`;
  let log: RelatorioEnvio | null = null;
  if (createLog) {
    log = await insertEnvioLog(client, { tenant_id: tenantId, agendamento_id: schedule.id, destinatario_id: recipient.id, tipo_resumo: schedule.tipo_resumo, canal: schedule.canal, destino: schedule.canal === "telegram" ? recipient.telegram_chat_id : recipient.email, status: "preparado", origem: origin, assunto: subject(schedule.tipo_resumo), resumo: summary, mensagem: text, modulos: modules, filtros: filters, metadata: { recipient_name: recipient.nome, schedule_name: schedule.nome }, generated_at: new Date().toISOString() });
  }
  return { schedule, recipient, log, subject: subject(schedule.tipo_resumo), text, summary, modules, filters, channel: schedule.canal, telegramChatId: recipient.telegram_chat_id };
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





