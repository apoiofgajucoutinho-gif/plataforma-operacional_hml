import type {
  NorwynAdsRow,
  NorwynCampaign,
  NorwynCommercialSale,
  NorwynContext,
  NorwynProduct,
} from "@/modules/norwyn/types";
import { buildAttributionBridge, type AttributionBridgeResult, type AttributionConfidence } from "@/modules/norwyn/services/attribution-bridge";
import { buildFunnelObservability, type FunnelObservabilityResult } from "@/modules/norwyn/services/funnel-observability";
import { resolveGrowthContext, type GrowthContextSelection, type GrowthResolvedContext } from "@/modules/norwyn/services/growth-context-resolver";

export type GrowthFunnelType =
  | "venda_direta"
  | "perpetuo"
  | "vsl"
  | "lancamento"
  | "captacao"
  | "webinar_aula"
  | "remarketing"
  | "outro";

export type GrowthStatus = "Saudavel" | "Atencao" | "Critico" | "Dados insuficientes";
export type BenchmarkSource = "historico interno" | "produto" | "tipo de campanha" | "meta" | "regra configurada" | "inferencia IA" | "indisponivel";

export type GrowthMetric = {
  key: string;
  label: string;
  value: number | null;
  formatted: string;
  available: boolean;
  explanation: string;
};

export type GrowthDiagnostic = {
  id: string;
  title: string;
  diagnosis: string;
  hypothesis: string;
  nextAction: string;
  confidence: number;
  impact: "Baixo" | "Medio" | "Alto";
  priority: "Baixa" | "Media" | "Alta";
  sourceRule: string;
  evidence: string[];
  unknowns: string[];
};

export type GrowthCreative = {
  id: string;
  name: string;
  campaignName: string;
  attributionConfidence: AttributionConfidence;
  metrics: GrowthMetric[];
  diagnosis: string;
  hypothesis: string;
  nextAction: string;
  confidence: number;
  evidence: string[];
};

export type GrowthExperiment = {
  id: string;
  hypothesis: string;
  test: string;
  primaryMetric: string;
  safetyMetric: string;
  period: string;
  decision: "planejado" | "venceu" | "perdeu" | "inconclusivo";
  learning: string;
  missionOsAction: string;
};

export type GrowthAnalysis = {
  resolvedContext: GrowthResolvedContext;
  campaign: NorwynCampaign | null;
  product: NorwynProduct | null;
  funnelType: GrowthFunnelType;
  funnelSteps: string[];
  status: GrowthStatus;
  statusExplanation: string;
  dateRange: { start: string | null; end: string | null };
  metrics: {
    media: GrowthMetric[];
    conversion: GrowthMetric[];
    product: GrowthMetric[];
    funnel: GrowthMetric[];
  };
  executiveSummary: string;
  whatWeKnow: string[];
  whatIsWorking: string[];
  concerns: string[];
  probableBottleneck: string;
  unknowns: string[];
  recommendations: GrowthDiagnostic[];
  dontChangeYet: string[];
  experiments: GrowthExperiment[];
  creatives: GrowthCreative[];
  daily: Array<{ date: string; spend: number; revenue: number; sales: number; leads: number }>;
  benchmarks: Array<{ metric: string; source: BenchmarkSource; description: string }>;
  funnelObservability: FunnelObservabilityResult;
  testLab: {
    environment: "TEST";
    sessions: number;
    events: Array<{ eventType: string; count: number }>;
    lastEventAt: string | null;
    trackingKeys: Array<{ label: string; value: string }>;
  };
  strategist: {
    summary: string;
    facts: string[];
    diagnosis: string;
    probableBottleneck: string;
    hypotheses: string[];
    missingData: string[];
    recommendations: string[];
    experiments: string[];
    doNotChangeYet: string[];
    risks: string[];
    confidence: number;
    nextThreeActions: string[];
  };
  attribution: AttributionBridgeResult;
  aiModelPolicy: Array<{ task: string; modelEnv: string; fallback: string; provider: string; note: string }>;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numberFormat = new Intl.NumberFormat("pt-BR");
const percentFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const funnelSteps: Record<GrowthFunnelType, string[]> = {
  venda_direta: ["Impressao", "Clique", "Landing", "Checkout", "Compra"],
  perpetuo: ["Impressao", "Clique", "Landing", "Lead", "Nutrição", "Checkout", "Compra"],
  vsl: ["Impressao", "Clique", "Landing", "Play VSL", "Consumo da VSL", "CTA", "Checkout", "Compra", "Order bump", "Upsell"],
  lancamento: ["Impressao", "Lead", "CPL", "Captacao", "Evento/aula", "Comparecimento/consumo", "Oferta", "Checkout", "Venda", "CAC", "ROAS"],
  captacao: ["Impressao", "Clique", "Landing", "Lead", "Confirmacao"],
  webinar_aula: ["Impressao", "Lead", "Inscricao", "Comparecimento", "Oferta", "Checkout", "Venda"],
  remarketing: ["Audiencia", "Impressao", "Clique", "Oferta", "Checkout", "Compra"],
  outro: ["Ads", "Landing", "CTA", "Checkout", "Compra"],
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateKey(value: string | null | undefined) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
}

function inCampaignRange(value: string | null | undefined, campaign: NorwynCampaign | null) {
  const parsed = parseDate(value);
  if (!parsed) return false;
  const start = parseDate(campaign?.starts_at) ?? daysAgo(30);
  const end = parseDate(campaign?.ends_at) ?? new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return parsed >= start && parsed <= end;
}

function inDateRange(value: string | null | undefined, startValue: string | null, endValue: string | null) {
  const parsed = parseDate(value);
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!parsed || !start || !end) return false;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return parsed >= start && parsed <= end;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function metric(key: string, label: string, value: number | null, format: "currency" | "number" | "percent" | "multiple" = "number", explanation = ""): GrowthMetric {
  const available = value !== null && Number.isFinite(value);
  const formatted = !available
    ? "Dados indisponiveis"
    : format === "currency"
      ? currency.format(value)
      : format === "percent"
        ? `${percentFormat.format(value)}%`
        : format === "multiple"
          ? `${value.toFixed(2).replace(".", ",")}x`
          : numberFormat.format(Math.round(value));
  return { key, label, value: available ? value : null, formatted, available, explanation };
}

function notApplicableMetric(key: string, label: string, explanation: string): GrowthMetric {
  return { key, label, value: null, formatted: "Nao aplicavel", available: false, explanation };
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function percent(numerator: number, denominator: number) {
  const value = ratio(numerator, denominator);
  return value === null ? null : value * 100;
}

function detectFunnelType(campaign: NorwynCampaign | null): GrowthFunnelType {
  const value = normalize(`${campaign?.type ?? ""} ${campaign?.name ?? ""} ${JSON.stringify(campaign?.plan_json ?? {})}`);
  if (value.includes("vsl")) return "vsl";
  if (value.includes("lancamento") || value.includes("lançamento")) return "lancamento";
  if (value.includes("captacao") || value.includes("captação") || value.includes("lead")) return "captacao";
  if (value.includes("webinar") || value.includes("aula")) return "webinar_aula";
  if (value.includes("remarketing")) return "remarketing";
  if (value.includes("perpetuo") || value.includes("evergreen")) return "perpetuo";
  if (value.includes("venda direta")) return "venda_direta";
  return "outro";
}

function saleDate(sale: NorwynCommercialSale) {
  return sale.data_aprovacao ?? sale.data_compra;
}

function isConfirmedSale(sale: NorwynCommercialSale) {
  if (sale.sale_confirmed !== null && sale.sale_confirmed !== undefined) return sale.sale_confirmed === true;
  return sale.grupo_comercial === "confirmed" || ["approved", "complete", "completed", "purchase_completed"].includes(normalize(sale.status_normalizado));
}

function productNames(product: NorwynProduct | null) {
  if (!product) return [];
  return [
    product.nome_oficial,
    product.produto_base,
    ...(product.product_aliases ?? []).map((alias) => alias.alias),
    ...(product.product_components ?? []).map((component) => component.componente),
  ]
    .map(normalize)
    .filter(Boolean);
}

function matchesProduct(sale: NorwynCommercialSale, product: NorwynProduct | null) {
  if (!product) return false;
  if (sale.produto_id && sale.produto_id === product.id) return true;
  const names = productNames(product);
  const saleName = normalize(`${sale.produto_nome ?? ""} ${sale.hotmart_product_id ?? ""}`);
  return names.some((name) => name.length > 2 && saleName.includes(name));
}

function matchesSaleTarget(sale: NorwynCommercialSale, product: NorwynProduct | null, hotmartProductName: string | null) {
  if (hotmartProductName) return normalize(sale.produto_nome).includes(normalize(hotmartProductName));
  return matchesProduct(sale, product);
}

function matchesCampaignText(value: string | null | undefined, campaign: NorwynCampaign | null) {
  if (!campaign) return true;
  const haystack = normalize(value);
  const campaignName = normalize(campaign.name);
  if (campaignName && haystack.includes(campaignName)) return true;
  const tokens = campaignName.split(/\s+/).filter((token) => token.length > 4);
  return tokens.length ? tokens.some((token) => haystack.includes(token)) : false;
}

function matchesResolvedCampaign(row: NorwynAdsRow, key: string | null, label: string | null) {
  if (!key) return false;
  if (row.campanha === key || row.campaign_id === key || row.campanha === label) return true;
  const haystack = normalize(`${row.campanha ?? ""} ${row.conjunto ?? ""} ${row.anuncio ?? ""} ${row.campaign_id ?? ""}`);
  const direct = [key, label].filter(Boolean).map((item) => normalize(String(item)));
  if (direct.some((needle) => needle && haystack.includes(needle))) return true;
  const tokens = normalize(key).split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
  return tokens.some((token) => haystack.includes(token));
}

function sourceCampaignName(value: string | null | undefined) {
  const match = String(value ?? "").match(/(?:^|\|)c=([^|]+)/);
  return match?.[1] ? match[1].trim() : null;
}

function matchesProductText(value: string | null | undefined, product: NorwynProduct | null) {
  if (!product) return false;
  const haystack = normalize(value);
  return productNames(product).some((name) => {
    if (name.length > 8 && haystack.includes(name)) return true;
    const tokens = name.split(/\s+/).filter((token) => token.length > 5);
    return tokens.length ? tokens.some((token) => haystack.includes(token)) : false;
  });
}

function buildDaily(adsRows: NorwynAdsRow[], sales: NorwynCommercialSale[]) {
  const map = new Map<string, { date: string; spend: number; revenue: number; sales: number; leads: number }>();
  const ensure = (date: string) => {
    const current = map.get(date) ?? { date, spend: 0, revenue: 0, sales: 0, leads: 0 };
    map.set(date, current);
    return current;
  };
  for (const row of adsRows) {
    const date = dateKey(row.data_referencia);
    if (!date) continue;
    const item = ensure(date);
    item.spend += asNumber(row.valor_gasto);
    item.leads += asNumber(row.leads);
  }
  for (const sale of sales) {
    const date = dateKey(saleDate(sale));
    if (!date || !isConfirmedSale(sale)) continue;
    const item = ensure(date);
    item.revenue += asNumber(sale.valor_bruto);
    item.sales += 1;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateCreatives(adsRows: NorwynAdsRow[], attribution: AttributionBridgeResult) {
  const byCreative = new Map<string, NorwynAdsRow[]>();
  for (const row of adsRows) {
    const key = `${row.campanha ?? "Campanha sem nome"}|${row.anuncio ?? "Anuncio sem nome"}`;
    byCreative.set(key, [...(byCreative.get(key) ?? []), row]);
  }
  return [...byCreative.entries()]
    .map(([key, rows]) => {
      const [campaignName, name] = key.split("|");
      const spend = rows.reduce((sum, row) => sum + asNumber(row.valor_gasto), 0);
      const impressions = rows.reduce((sum, row) => sum + asNumber(row.impressoes), 0);
      const clicks = rows.reduce((sum, row) => sum + asNumber(row.cliques), 0);
      const leads = rows.reduce((sum, row) => sum + asNumber(row.leads), 0);
      const matches = attribution.matches.filter((match) => {
        if (match.confidence !== "HIGH" && match.confidence !== "MEDIUM") return false;
        if (match.campaignName !== campaignName) return false;
        return match.adName ? normalize(match.adName) === normalize(name) : false;
      });
      const campaignMatches = attribution.matches.filter((match) => (match.confidence === "HIGH" || match.confidence === "MEDIUM") && match.campaignName === campaignName);
      const sales = matches.length;
      const revenue = matches.reduce((sum, match) => sum + match.revenue, 0);
      const attributionConfidence: AttributionConfidence = matches.some((match) => match.confidence === "HIGH")
        ? "HIGH"
        : campaignMatches.length
          ? "MEDIUM"
          : attribution.coverage.coveragePercent !== null && attribution.coverage.coveragePercent < 60
            ? "LOW"
            : "UNKNOWN";
      const ctr = percent(clicks, impressions);
      const cpc = ratio(spend, clicks);
      const cpm = impressions ? (spend / impressions) * 1000 : null;
      const cpa = ratio(spend, sales);
      const roas = ratio(revenue, spend);
      const conversion = percent(sales, clicks);
      const frequencyValues = rows.map((row) => asNumber(row.frequencia)).filter(Boolean);
      const frequency = frequencyValues.length ? frequencyValues.reduce((sum, value) => sum + value, 0) / frequencyValues.length : null;
      const evidence = [
        `Gasto consolidado: ${currency.format(spend)}.`,
        clicks ? `${numberFormat.format(clicks)} cliques registrados.` : "Cliques indisponiveis ou zerados.",
        sales ? `${numberFormat.format(sales)} vendas associadas por source/campanha.` : "Sem vendas diretamente associadas ao criativo.",
      ];
      const hasClickSignal = clicks > 0 && impressions > 0;
      const hasSalesSignal = sales > 0;
      return {
        id: key,
        name,
        campaignName,
        attributionConfidence,
        metrics: [
          metric("spend", "Gasto", spend, "currency"),
          metric("impressions", "Impressoes", impressions),
          metric("clicks", "Cliques", clicks),
          metric("cpm", "CPM", cpm, "currency"),
          metric("cpc", "CPC", cpc, "currency"),
          metric("ctr", "CTR", ctr, "percent"),
          metric("sales", "Vendas", sales),
          metric("cpa", "CPA", cpa, "currency"),
          metric("revenue", "Receita", revenue, "currency"),
          metric("roas", "ROAS", roas, "multiple"),
          metric("ticket", "Ticket medio", ratio(revenue, sales), "currency"),
          metric("conversion", "Taxa de conversao", conversion, "percent"),
          metric("frequency", "Frequencia", frequency),
        ],
        diagnosis: !attribution.canCompareCreatives
          ? "Cobertura de atribuicao insuficiente para comparar criativos como vencedores ou perdedores."
          : hasClickSignal && !hasSalesSignal ? "Ha sinal de clique, mas nao ha venda associada suficiente." : hasSalesSignal ? "Criativo possui sinal comercial associado." : "Dados ainda insuficientes para diagnostico criativo.",
        hypothesis: hasClickSignal && !hasSalesSignal
          ? "O gancho pode estar gerando interesse, mas a promessa, landing, oferta ou tracking podem estar desalinhados."
          : hasSalesSignal
            ? "A combinacao criativo-oferta pode estar coerente, mas a atribuicao ainda precisa ser validada."
            : "Faltam cliques, vendas associadas ou nomenclatura consistente para avaliar.",
        nextAction: hasClickSignal && !hasSalesSignal
          ? "Manter leitura do criativo e investigar landing/oferta antes de descartá-lo."
          : hasSalesSignal
            ? "Preservar o criativo e testar variacao controlada de hook ou landing."
            : "Corrigir tracking/nomenclatura ou coletar mais dados antes de agir.",
        confidence: attributionConfidence === "HIGH" ? 78 : attributionConfidence === "MEDIUM" ? 60 : attributionConfidence === "LOW" ? 35 : 24,
        evidence,
      } satisfies GrowthCreative;
    })
    .sort((a, b) => asNumber(b.metrics.find((item) => item.key === "spend")?.value) - asNumber(a.metrics.find((item) => item.key === "spend")?.value))
    .slice(0, 12);
}

function buildDiagnostics(input: {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  frequency: number | null;
  targetSales: number | null;
  targetRevenue: number | null;
  hasSalesAttribution: boolean;
}) {
  const diagnostics: GrowthDiagnostic[] = [];
  const ctr = percent(input.clicks, input.impressions);
  const roas = ratio(input.revenue, input.spend);
  const cpa = ratio(input.spend, input.sales);

  if (input.spend > 0 && input.impressions > 0 && input.clicks === 0) {
    diagnostics.push({
      id: "ctr-zero",
      title: "Impressao sem clique",
      diagnosis: "A campanha teve entrega, mas nao registrou cliques no recorte.",
      hypothesis: "Pode haver problema de criativo, hook, publico, objetivo de campanha ou tracking de clique.",
      nextAction: "Revisar criativos e configuracao de evento antes de aumentar investimento.",
      confidence: 70,
      impact: "Alto",
      priority: "Alta",
      sourceRule: "growth_default_ctr_delivery_v1",
      evidence: [`${numberFormat.format(input.impressions)} impressoes`, `${currency.format(input.spend)} em gasto`, "0 cliques"],
      unknowns: ["Benchmark interno de CTR ainda nao configurado.", "Qualidade do publico e posicionamentos nao estao disponiveis."],
    });
  }

  if (input.clicks > 0 && input.sales === 0) {
    diagnostics.push({
      id: "clicks-no-sales",
      title: "Clique sem venda confirmada",
      diagnosis: "Ha cliques, mas nenhuma compra confirmada associada no recorte.",
      hypothesis: "O gargalo pode estar na landing, oferta, checkout, preco, tracking ou atraso de processamento Hotmart.",
      nextAction: "Investigar landing/oferta/tracking e nao pausar criativos apenas pelo primeiro sinal.",
      confidence: input.hasSalesAttribution ? 62 : 48,
      impact: "Alto",
      priority: "Alta",
      sourceRule: "growth_default_clicks_without_sales_v1",
      evidence: [`${numberFormat.format(input.clicks)} cliques`, "0 vendas confirmadas associadas"],
      unknowns: ["Eventos de landing e checkout nao estao disponiveis.", "Atribuicao entre Meta e Hotmart pode estar incompleta."],
    });
  }

  if (input.frequency !== null && input.frequency >= 3 && input.spend > 0) {
    diagnostics.push({
      id: "frequency-rising",
      title: "Frequencia em observacao",
      diagnosis: "A frequencia media ja exige acompanhamento de saturacao.",
      hypothesis: roas && roas > 1 ? "Se ROAS estiver positivo, pode ser inicio de saturacao, nao necessariamente motivo para pausar." : "Com retorno baixo, frequencia pode indicar fadiga de publico ou criativo.",
      nextAction: "Preparar variacao de hook e acompanhar CPA/ROAS antes de redistribuir verba.",
      confidence: 54,
      impact: "Medio",
      priority: "Media",
      sourceRule: "growth_default_frequency_watch_v1",
      evidence: [`Frequencia media: ${input.frequency.toFixed(2).replace(".", ",")}`],
      unknowns: ["Nao ha regra interna de saturacao cadastrada para este produto."],
    });
  }

  if (input.spend > 0 && input.sales > 0 && input.revenue > 0) {
    diagnostics.push({
      id: "commercial-signal",
      title: "Sinal comercial mensuravel",
      diagnosis: "Gasto, vendas e receita existem no mesmo recorte.",
      hypothesis: "A campanha pode ser analisada por CPA e ROAS, mas a causalidade ainda depende de atribuicao confiavel.",
      nextAction: "Preservar o que esta funcionando e testar apenas uma variavel por vez.",
      confidence: input.hasSalesAttribution ? 74 : 58,
      impact: "Alto",
      priority: "Alta",
      sourceRule: "growth_default_commercial_signal_v1",
      evidence: [`CPA: ${currency.format(cpa ?? 0)}`, `ROAS: ${(roas ?? 0).toFixed(2).replace(".", ",")}`],
      unknowns: input.hasSalesAttribution ? ["Eventos intermediarios do funil ainda faltam."] : ["Source/campaign da venda nao confirma atribuicao direta."],
    });
  }

  if (!diagnostics.length) {
    diagnostics.push({
      id: "insufficient-data",
      title: "Dados insuficientes para gargalo forte",
      diagnosis: "O recorte ainda nao permite apontar gargalo com seguranca.",
      hypothesis: "Faltam dados de midia, vendas, eventos intermediarios ou metas.",
      nextAction: "Configurar tracking minimo e acompanhar evolucao diaria antes de decidir.",
      confidence: 30,
      impact: "Medio",
      priority: "Media",
      sourceRule: "growth_default_insufficient_data_v1",
      evidence: ["Leitura deterministica sem benchmark inventado."],
      unknowns: ["Landing views", "Checkout iniciado", "VSL play/CTA", "Order bump/upsell/downsell"],
    });
  }

  return { diagnostics, ctr, roas, cpa };
}

function campaignProgress(campaign: NorwynCampaign | null, actual: number | null, target: number | null) {
  if (!campaign || actual === null || !target) return "Meta indisponivel para calculo de progresso.";
  const start = parseDate(campaign.starts_at);
  const end = parseDate(campaign.ends_at);
  if (!start || !end) return "Periodo incompleto; progresso esperado nao pode ser calculado.";
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / 86_400_000) + 1));
  const expected = target * (elapsedDays / totalDays);
  const gap = actual - expected;
  return `Esperado ate hoje: ${numberFormat.format(Math.round(expected))}. Realizado: ${numberFormat.format(Math.round(actual))}. Gap: ${numberFormat.format(Math.round(gap))}. Calculo linear: meta total x dias decorridos / dias totais.`;
}

function buildTestLab(events: NorwynContext["funnelEvents"]): GrowthAnalysis["testLab"] {
  const labEvents = events.filter((event) => event.environment === "test" && (event.campaign_key === "norwyn_funnel_lab" || event.provider === "norwyn_funnel_lab"));
  const byType = new Map<string, number>();
  const sessions = new Set<string>();
  const keys = new Map<string, string>();

  for (const event of labEvents) {
    byType.set(event.event_type, (byType.get(event.event_type) ?? 0) + 1);
    sessions.add(event.funnel_session_id);
    if (event.utm_campaign) keys.set("utm_campaign", event.utm_campaign);
    if (event.utm_content) keys.set("utm_content", event.utm_content);
    if (event.utm_term) keys.set("utm_term", event.utm_term);
    if (event.source_sck) keys.set("source_sck", event.source_sck);
    if (event.campaign_key) keys.set("campaign_key", event.campaign_key);
    if (event.audience_key) keys.set("audience_key", event.audience_key);
    if (event.creative_key) keys.set("creative_key", event.creative_key);
  }

  const preferredOrder = [
    "LANDING_VIEW",
    "VSL_PLAY",
    "VSL_PROGRESS_25",
    "VSL_PROGRESS_50",
    "VSL_PROGRESS_75",
    "VSL_PROGRESS_90",
    "VSL_CTA_VIEW",
    "VSL_CTA_CLICK",
    "TEST_DESTINATION_VIEW",
  ];

  return {
    environment: "TEST",
    sessions: sessions.size,
    events: preferredOrder.map((eventType) => ({ eventType, count: byType.get(eventType) ?? 0 })),
    lastEventAt: labEvents.map((event) => event.occurred_at).filter(Boolean).sort().at(-1) ?? null,
    trackingKeys: [...keys.entries()].map(([label, value]) => ({ label, value })),
  };
}

export function buildGrowthAnalysis(context: NorwynContext, selection: GrowthContextSelection = {}): GrowthAnalysis {
  const resolvedContext = resolveGrowthContext(context, selection);
  const campaign = resolvedContext.campaign;
  const product = resolvedContext.product;
  const hotmartProductName = resolvedContext.productLabel ?? product?.nome_oficial ?? null;
  const hotmartProductId = resolvedContext.hotmartProductId;
  const range = resolvedContext.period;
  const funnelType = detectFunnelType(campaign);
  const sales = context.commercialSales.filter((sale) => {
    if (!inDateRange(saleDate(sale), range.start, range.end)) return false;
    if (hotmartProductId) return sale.hotmart_product_id === hotmartProductId;
    return matchesSaleTarget(sale, product, hotmartProductName);
  });
  const salesSourceCampaigns = new Set(sales.map((sale) => sourceCampaignName(sale.source_sck)).filter(Boolean) as string[]);
  const adsRows = context.adsRows.filter((row) => {
    if (!inDateRange(row.data_referencia, range.start, range.end)) return false;
    if (resolvedContext.campaignKey) return matchesResolvedCampaign(row, resolvedContext.campaignKey, resolvedContext.campaignLabel);
    if (campaign) return matchesCampaignText(row.campanha, campaign);
    if (hotmartProductId) {
      const landingCampaignKeys = new Set(resolvedContext.landings.map((landing) => landing.campaign_key));
      return landingCampaignKeys.has(String(row.campanha ?? "")) || landingCampaignKeys.has(String(row.campaign_id ?? ""));
    }
    return salesSourceCampaigns.has(String(row.campanha ?? "")) || matchesProductText(`${row.campanha ?? ""} ${row.anuncio ?? ""} ${row.conjunto ?? ""}`, product);
  });
  const confirmedSales = sales.filter(isConfirmedSale);
  const funnelEvents = context.funnelEvents.filter((event) => {
    if (!inDateRange(event.occurred_at, range.start, range.end)) return false;
    if (campaign?.id && event.campaign_id) return event.campaign_id === campaign.id;
    if (product?.id && event.product_id) return event.product_id === product.id;
    return true;
  });
  const attribution = buildAttributionBridge(sales, adsRows);
  const refunds = sales.filter((sale) => ["refunded", "chargeback", "reembolso"].includes(normalize(`${sale.grupo_comercial} ${sale.status_normalizado} ${sale.status_original}`)));
  const spend = adsRows.reduce((sum, row) => sum + asNumber(row.valor_gasto), 0);
  const impressions = adsRows.reduce((sum, row) => sum + asNumber(row.impressoes), 0);
  const reach = adsRows.reduce((sum, row) => sum + asNumber(row.alcance), 0);
  const clicks = adsRows.reduce((sum, row) => sum + asNumber(row.cliques), 0);
  const leads = adsRows.reduce((sum, row) => sum + asNumber(row.leads), 0);
  const revenue = confirmedSales.reduce((sum, sale) => sum + asNumber(sale.valor_bruto), 0);
  const frequencyValues = adsRows.map((row) => asNumber(row.frequencia)).filter(Boolean);
  const frequency = frequencyValues.length ? frequencyValues.reduce((sum, value) => sum + value, 0) / frequencyValues.length : null;
  const hasSalesAttribution = attribution.coverage.attributedSales > 0;
  const funnelObservability = buildFunnelObservability({
    funnelType,
    adsRows,
    funnelEvents,
    purchases: confirmedSales.length,
  });
  const { diagnostics, ctr, roas, cpa } = buildDiagnostics({
    spend,
    impressions,
    clicks,
    leads,
    sales: confirmedSales.length,
    revenue,
    frequency,
    targetSales: campaign?.target_sales ?? null,
    targetRevenue: campaign?.target_revenue ?? null,
    hasSalesAttribution,
  });

  const hasCoreData = spend > 0 || revenue > 0 || confirmedSales.length > 0 || leads > 0;
  const leadApplicable = ["captacao", "lancamento", "webinar_aula", "perpetuo"].includes(funnelType) || leads > 0;
  const progressSales = campaignProgress(campaign, confirmedSales.length, campaign?.target_sales ?? null);
  const progressRevenue = campaignProgress(campaign, revenue, campaign?.target_revenue ?? null);
  const critical = diagnostics.some((item) => item.priority === "Alta" && item.id !== "commercial-signal");
  const status: GrowthStatus = !hasCoreData ? "Dados insuficientes" : critical ? "Atencao" : roas !== null && roas <= 0 && spend > 0 ? "Critico" : "Saudavel";
  const statusExplanation =
    status === "Dados insuficientes"
      ? "Nao ha gasto, receita, vendas ou leads suficientes no recorte selecionado."
      : status === "Atencao"
        ? "Existe pelo menos um alerta de funil que deve ser investigado antes de escalar."
        : status === "Critico"
          ? "Ha gasto sem retorno comercial mensuravel no recorte."
          : "Ha sinal comercial ou operacional mensuravel sem alerta critico dominante.";

  const unknowns = [
    "Landing views",
    "Checkout iniciado",
    "Eventos de VSL: play, consumo e CTA",
    "Order bump, upsell e downsell detalhados",
    "Atribuicao completa Meta Ads -> Hotmart",
    "Benchmarks internos configurados por produto/tipo de campanha",
  ];
  const recommendations = diagnostics;
  const experiments = recommendations.slice(0, 3).map((item) => ({
    id: `experiment-${item.id}`,
    hypothesis: item.hypothesis,
    test: item.id === "clicks-no-sales" ? "Criativo atual vs nova landing/oferta controlada" : "Criativo A vs variacao de hook B",
    primaryMetric: item.id.includes("ctr") ? "CTR" : item.id === "frequency-rising" ? "CPA" : "ROAS",
    safetyMetric: item.id.includes("ctr") ? "CPA/ROAS" : "Gasto sem venda",
    period: campaign?.starts_at && campaign?.ends_at ? `${campaign.starts_at} a ${campaign.ends_at}` : "Definir periodo antes de executar",
    decision: "planejado" as const,
    learning: "A preencher depois do teste.",
    missionOsAction: "Transformar em tarefa do Mission OS antes de executar.",
  }));
  const creatives = aggregateCreatives(adsRows, attribution);
  const facts = [
    campaign ? `Campanha analisada: ${campaign.name}.` : "Nenhuma campanha cadastrada foi encontrada; usando recorte geral.",
    product ? `Produto vinculado: ${product.nome_oficial}.` : `Produto Hotmart analisado: ${hotmartProductName ?? "nao identificado"}.`,
    `Gasto: ${currency.format(spend)}.`,
    `Receita confirmada: ${currency.format(revenue)}.`,
    `Vendas confirmadas: ${numberFormat.format(confirmedSales.length)}.`,
    `Cobertura de atribuicao: ${attribution.coverage.coveragePercent === null ? "indisponivel" : `${percentFormat.format(attribution.coverage.coveragePercent)}%`}.`,
    `Leads registrados: ${numberFormat.format(leads)}.`,
  ];
  const doNotChange = [
    "Nao alterar orçamento automaticamente.",
    "Nao pausar criativo apenas por hipotese sem verificar landing/oferta/tracking.",
    "Nao trocar oferta, publico e criativo ao mesmo tempo.",
  ];
  const nextThreeActions = recommendations.slice(0, 3).map((item) => item.nextAction);

  return {
    resolvedContext,
    campaign,
    product,
    funnelType,
    funnelSteps: funnelSteps[funnelType],
    status,
    statusExplanation,
    dateRange: {
      start: range.start,
      end: range.end,
    },
    metrics: {
      media: [
        metric("spend", "Gasto", spend, "currency", "Somatorio de instagram_ads_daily.valor_gasto."),
        metric("impressions", "Impressoes", impressions, "number", "Somatorio de instagram_ads_daily.impressoes."),
        metric("reach", "Alcance", reach || null, "number", "Somatorio de alcance disponivel por linha."),
        metric("frequency", "Frequencia", frequency, "number", "Media simples das linhas com frequencia."),
        metric("clicks", "Cliques", clicks, "number", "Somatorio de cliques."),
        metric("cpm", "CPM", impressions ? (spend / impressions) * 1000 : null, "currency"),
        metric("cpc", "CPC", ratio(spend, clicks), "currency"),
        metric("ctr", "CTR", ctr, "percent"),
      ],
      conversion: [
        leadApplicable ? metric("leads", "Leads", leads, "number") : notApplicableMetric("leads", "Leads", "Funil selecionado nao exige lead como etapa primaria."),
        leadApplicable ? metric("cpl", "CPL", ratio(spend, leads), "currency") : notApplicableMetric("cpl", "CPL", "CPL nao se aplica quando lead nao e etapa primaria do funil."),
        metric("sales", "Vendas", confirmedSales.length, "number"),
        metric("cpa", "CPA/CAC", cpa, "currency"),
        metric("conversion_rate", "Taxa de conversao", percent(confirmedSales.length, clicks), "percent"),
        metric("revenue", "Receita", revenue, "currency"),
        metric("ticket", "Ticket medio", ratio(revenue, confirmedSales.length), "currency"),
        metric("roas", "ROAS observado", roas, "multiple"),
        metric("attributed_roas", "ROAS atribuivel", ratio(attribution.coverage.attributedRevenue, spend), "multiple"),
      ],
      product: [
        metric("product_sales", "Vendas", confirmedSales.length, "number"),
        metric("product_revenue", "Receita", revenue, "currency"),
        metric("ticket", "Ticket", ratio(revenue, confirmedSales.length), "currency"),
        metric("refunds", "Refunds", sales.length ? refunds.length : null, "number", "Disponivel quando vendas do produto/recorte foram carregadas."),
        metric("bump", "Order bump", null, "number", "Dados de order bump ainda nao existem no payload consolidado."),
        metric("upsell", "Upsell", null, "number", "Dados de upsell ainda nao existem no payload consolidado."),
        metric("downsell", "Downsell", null, "number", "Dados de downsell ainda nao existem no payload consolidado."),
        metric("revenue_per_buyer", "Receita por comprador", ratio(revenue, new Set(confirmedSales.map((sale) => sale.comprador_email).filter(Boolean)).size), "currency"),
      ],
      funnel: funnelObservability.conversions,
    },
    executiveSummary: `${campaign?.name ?? hotmartProductName ?? "Campanha sem nome"} esta em ${status}. ${statusExplanation}`,
    whatWeKnow: facts,
    whatIsWorking: [
      revenue > 0 ? "Existe receita confirmada no recorte." : "Ainda nao ha receita confirmada no recorte.",
      clicks > 0 ? "A campanha gera cliques mensuraveis." : "Cliques ainda nao aparecem no recorte.",
      attribution.canCompareCreatives ? "Ha cobertura minima para leitura por criativo." : "Ainda nao ha cobertura suficiente para declarar criativo vencedor/perdedor.",
    ],
    concerns: diagnostics.filter((item) => item.id !== "commercial-signal").map((item) => item.diagnosis),
    probableBottleneck: diagnostics[0]?.diagnosis ?? "Gargalo ainda nao identificado.",
    unknowns,
    recommendations,
    dontChangeYet: doNotChange,
    experiments,
    creatives,
    daily: buildDaily(adsRows, sales),
    benchmarks: [
      { metric: "CTR/CPA/ROAS", source: "indisponivel", description: "Nenhum benchmark numerico generico foi aplicado." },
      { metric: "Metas", source: campaign?.target_sales || campaign?.target_revenue ? "meta" : "indisponivel", description: `${progressSales} ${progressRevenue}` },
      { metric: "Regras", source: "regra configurada", description: "Regras padrao versionadas no engine local; tratadas como hipoteses operacionais." },
    ],
    funnelObservability,
    testLab: buildTestLab(context.funnelEvents),
    strategist: {
      summary: `${status}: ${statusExplanation}`,
      facts,
      diagnosis: diagnostics.map((item) => item.diagnosis).join(" "),
      probableBottleneck: diagnostics[0]?.title ?? "Dados insuficientes",
      hypotheses: diagnostics.map((item) => item.hypothesis),
      missingData: unknowns,
      recommendations: recommendations.map((item) => item.nextAction),
      experiments: experiments.map((item) => item.test),
      doNotChangeYet: doNotChange,
      risks: ["Atribuicao incompleta pode distorcer CPA/ROAS.", "Mudancas simultaneas podem impedir aprendizado.", "Eventos intermediarios ausentes reduzem confianca do diagnostico."],
      confidence: Math.max(...diagnostics.map((item) => item.confidence), 30),
      nextThreeActions: nextThreeActions.length ? nextThreeActions : ["Configurar dados minimos de funil.", "Validar nomenclatura campanha/source.", "Aguardar novo recorte diario."],
    },
    attribution,
    aiModelPolicy: [
      { task: "classificacao simples", modelEnv: "NORWYN_AI_SIMPLE_MODEL", fallback: "GEMINI_MODEL", provider: "gemini", note: "Usar modelo economico quando configurado." },
      { task: "extracao", modelEnv: "NORWYN_AI_EXTRACTION_MODEL", fallback: "GEMINI_MODEL", provider: "gemini", note: "Usar em captura/normalizacao estruturada." },
      { task: "growth strategist", modelEnv: "NORWYN_GROWTH_STRATEGIST_MODEL", fallback: "GEMINI_MODEL", provider: "gemini", note: "Reservado para raciocinio forte; esta tela usa fallback deterministico." },
      { task: "analise complexa", modelEnv: "NORWYN_AI_STRONG_MODEL", fallback: "GEMINI_MODEL", provider: "gemini", note: "Nao acoplar provider no frontend." },
    ],
  };
}
