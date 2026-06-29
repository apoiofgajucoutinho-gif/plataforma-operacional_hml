import type { InstagramInteraction } from "@/modules/instagram/types";
import type {
  NorwynAdsRow,
  NorwynCommercialSale,
  NorwynContentEvent,
  NorwynEvidenceCard,
  NorwynEvidenceRecommendation,
  NorwynLaunchPattern,
  NorwynSignal,
} from "@/modules/norwyn/types";

type EvidenceEngineInput = {
  contentEvents: NorwynContentEvent[];
  commercialSales: NorwynCommercialSale[];
  signals: NorwynSignal[];
  adsRows: NorwynAdsRow[];
  interactions: InstagramInteraction[];
  activeMissionName?: string | null;
};

type EvidenceEngineResult = {
  cards: NorwynEvidenceCard[];
  launchPatterns: NorwynLaunchPattern[];
  recommendations: NorwynEvidenceRecommendation[];
  summary: {
    bestFormat: string | null;
    bestHour: string | null;
    bestWeekday: string | null;
    topProduct: string | null;
    totalWindowSales: number;
    totalWindowRevenue: number;
  };
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numberFormatter = new Intl.NumberFormat("pt-BR");
const weekdays = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function revenue(value: number | null | undefined) {
  return Number(value ?? 0);
}

function uniqueProducts(sales: NorwynCommercialSale[]) {
  const products = new Map<string, string>();
  for (const sale of sales) {
    const product = sale.produto_nome?.trim();
    if (!product) continue;
    products.set(normalizeText(product), product);
  }
  return [...products.values()];
}

function inferProductAliases(product: string) {
  const normalized = normalizeText(product);
  const aliases = new Set<string>([normalized]);
  if (normalized.includes("aasi")) aliases.add("aasi");
  if (normalized.includes("ajuste")) aliases.add("ajustes finos");
  if (normalized.includes("rampa")) aliases.add("perda em rampa");
  if (normalized.includes("audiolog")) aliases.add("audiologia");
  return [...aliases].filter(Boolean);
}

function contentText(event: NorwynContentEvent) {
  return normalizeText([
    event.title,
    event.caption,
    event.objective,
    event.cta,
    ...(event.product_tags ?? []),
    ...(event.theme_tags ?? []),
  ].join(" "));
}

function productMatchScore(event: NorwynContentEvent, sale: NorwynCommercialSale) {
  const product = sale.produto_nome ?? "";
  const text = contentText(event);
  if (!product || !text) return 20;

  const aliases = inferProductAliases(product);
  const productTagHit = (event.product_tags ?? []).some((tag) => aliases.includes(normalizeText(tag)));
  const directHit = aliases.some((alias) => alias.length >= 3 && text.includes(alias));

  if (productTagHit && directHit) return 95;
  if (productTagHit) return 85;
  if (directHit) return 70;
  if (text.includes("curso") || text.includes("formacao") || text.includes("aula")) return 45;
  if (text.includes("duvida") || text.includes("pergunta") || text.includes("acesso")) return 35;
  return 20;
}

function influenceLevel(score: number): NorwynLaunchPattern["influenceLevel"] {
  if (score >= 85) return "Influencia Potencial";
  if (score >= 65) return "Alta";
  if (score >= 35) return "Media";
  return "Baixa";
}

function formatOf(event: NorwynContentEvent) {
  return event.subtype || event.event_type || "conteudo";
}

function performanceNumber(event: NorwynContentEvent, key: string) {
  const raw = event.performance_snapshot?.[key];
  const numeric = Number(raw ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildPattern(event: NorwynContentEvent, sales: NorwynCommercialSale[]): NorwynLaunchPattern | null {
  const publishedAt = toDate(event.published_at);
  if (!publishedAt) return null;

  const windowEnd = new Date(publishedAt.getTime() + Math.max(1, event.influence_hours) * 60 * 60 * 1000);
  const salesInWindow = sales
    .map((sale) => ({ sale, date: toDate(sale.data_aprovacao ?? sale.data_compra) }))
    .filter(({ date }) => date && date >= publishedAt && date <= windowEnd)
    .map(({ sale, date }) => ({ sale, date: date as Date }));

  if (!salesInWindow.length) return null;

  const totalRevenue = salesInWindow.reduce((sum, item) => sum + revenue(item.sale.valor_bruto), 0);
  const bestSale = salesInWindow
    .map((item) => ({ ...item, score: productMatchScore(event, item.sale) }))
    .sort((a, b) => b.score - a.score)[0];
  const avgProductMatch = salesInWindow.reduce((sum, item) => sum + productMatchScore(event, item.sale), 0) / salesInWindow.length;
  const proximityScore =
    salesInWindow.reduce((sum, item) => {
      const elapsed = Math.max(0, item.date.getTime() - publishedAt.getTime());
      const ratio = 1 - elapsed / Math.max(1, windowEnd.getTime() - publishedAt.getTime());
      return sum + ratio * 100;
    }, 0) / salesInWindow.length;
  const engagementScore = Math.min(100, Number(event.performance_snapshot?.engajamento_score ?? 0) || performanceNumber(event, "comentarios") * 2);
  const revenueScore = Math.min(100, Math.log10(Math.max(totalRevenue, 1)) * 25);
  const volumeScore = Math.min(100, salesInWindow.length * 18);
  const score = clamp(volumeScore * 0.25 + revenueScore * 0.2 + proximityScore * 0.2 + avgProductMatch * 0.25 + engagementScore * 0.1);
  const level = influenceLevel(score);
  const format = formatOf(event);
  const productName = bestSale?.sale.produto_nome ?? null;

  const evidenceCards: NorwynEvidenceCard[] = [
    {
      id: `${event.id}-window`,
      title: "Janela de influencia observada",
      source: "Launch Pattern",
      description: "Conteudo e vendas confirmadas apareceram dentro da mesma janela operacional. Isso indica correlacao, nao atribuicao direta.",
      details: [
        `Janela analisada: ${event.influence_hours}h apos a publicacao.`,
        `${salesInWindow.length} venda(s) confirmada(s) dentro da janela.`,
        `Receita bruta associada ao periodo: ${currencyFormatter.format(totalRevenue)}.`,
      ],
      confidence: score,
      impact: level === "Influencia Potencial" ? "Influencia Potencial" : level === "Alta" ? "Alto" : level === "Media" ? "Medio" : "Baixo",
      metricLabel: "Vendas na janela",
      metricValue: numberFormatter.format(salesInWindow.length),
      relatedProduct: productName,
      relatedContentId: event.id,
    },
    {
      id: `${event.id}-product`,
      title: "Compatibilidade produto-conteudo",
      source: "Comercial",
      description: "O produto vendido foi comparado com legenda, tags e objetivo do conteudo para estimar coerencia tematica.",
      details: [
        `Produto com maior compatibilidade: ${productName ?? "produto nao identificado"}.`,
        `Product Match Score: ${clamp(avgProductMatch)} de 100.`,
        "Este score nao prova origem da venda; apenas organiza evidencias historicas.",
      ],
      confidence: clamp(avgProductMatch),
      impact: avgProductMatch >= 65 ? "Alto" : avgProductMatch >= 35 ? "Medio" : "Baixo",
      metricLabel: "Match",
      metricValue: `${clamp(avgProductMatch)}%`,
      relatedProduct: productName,
      relatedContentId: event.id,
    },
  ];

  return {
    id: `${event.id}-${productName ?? "sem-produto"}`,
    contentEventId: event.id,
    contentTitle: event.title || "Conteudo sem titulo",
    format,
    publishedAt: event.published_at,
    influenceHours: event.influence_hours,
    productName,
    productMatchScore: clamp(avgProductMatch),
    influenceScore: score,
    influenceLevel: level,
    salesInWindow: salesInWindow.length,
    revenueInWindow: totalRevenue,
    evidenceCards,
  };
}

function topBy<T>(items: T[], getKey: (item: T) => string | null | undefined, getValue: (item: T) => number) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + getValue(item));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function buildRecommendations(patterns: NorwynLaunchPattern[], input: EvidenceEngineInput): NorwynEvidenceRecommendation[] {
  const topPatterns = [...patterns].sort((a, b) => b.influenceScore - a.influenceScore).slice(0, 4);
  const recommendations = topPatterns.map((pattern) => ({
    id: `pattern-${pattern.id}`,
    title: `Repetir angulo com ${pattern.productName ?? "produto prioritario"}`,
    objective: "Transformar um padrao observado historicamente em briefing operacional para nova peca.",
    relatedMission: input.activeMissionName ?? null,
    expectedImpact: "Aumentar clareza comercial e testar novamente um formato associado a picos de venda.",
    confidence: pattern.influenceScore,
    priority: pattern.influenceScore >= 65 ? ("Alta" as const) : ("Media" as const),
    nextStep: `Gerar briefing em formato ${pattern.format} com CTA claro e evidencia historica.`,
    kpis: ["vendas confirmadas", "receita bruta", "comentarios", "salvos", "compartilhamentos"],
    evidenceCards: pattern.evidenceCards,
    productName: pattern.productName,
    suggestedFormat: pattern.format,
  }));

  if (!recommendations.length) {
    const pendingInteractions = input.interactions.filter((interaction) => String(interaction.status ?? "").toLowerCase() !== "respondido");
    recommendations.push({
      id: "collect-more-questions",
      title: "Coletar novas perguntas antes de definir pauta comercial",
      objective: "Aumentar o nivel de evidencia antes de sugerir conteudo de venda.",
      relatedMission: input.activeMissionName ?? null,
      expectedImpact: "Melhorar confianca do Strategy Engine quando os sinais estao dispersos.",
      confidence: pendingInteractions.length ? 52 : 38,
      priority: "Media",
      nextStep: "Abrir caixa de perguntas nos Stories e classificar as respostas por tema e produto.",
      kpis: ["perguntas recebidas", "temas recorrentes", "interacoes sem resposta"],
      productName: null,
      suggestedFormat: "Stories",
      evidenceCards: [
        {
          id: "low-evidence-collection",
          title: "Evidencia insuficiente para tema dominante",
          source: "Instagram",
          description: "Até o momento nao foi identificado um tema dominante nas interacoes. Recomenda-se coletar novas perguntas para aumentar a confianca da analise.",
          details: [`Interacoes pendentes ou nao respondidas: ${pendingInteractions.length}.`, "Sem uso de IA nesta leitura."],
          confidence: pendingInteractions.length ? 52 : 38,
          impact: "Medio",
          metricLabel: "Pendentes",
          metricValue: numberFormatter.format(pendingInteractions.length),
        },
      ],
    });
  }

  const signal = [...input.signals].sort((a, b) => Number(b.final_score ?? 0) - Number(a.final_score ?? 0))[0];
  if (signal) {
    recommendations.push({
      id: `signal-${signal.id}`,
      title: `Usar signal: ${signal.title}`,
      objective: "Converter um sinal operacional validado em briefing ou pauta de apoio.",
      relatedMission: input.activeMissionName ?? null,
      expectedImpact: signal.suggested_action ?? "Organizar a proxima acao com base no calendario e nos sinais atuais.",
      confidence: Number(signal.final_score ?? 50),
      priority: Number(signal.final_score ?? 0) >= 70 ? "Alta" : "Media",
      nextStep: signal.suggested_action ?? "Criar briefing com angulo e tom recomendados.",
      kpis: ["execucao", "resposta da audiencia", "impacto comercial"],
      productName: signal.product_tags?.[0] ?? null,
      suggestedFormat: signal.content_format_suggestions?.[0] ?? "Stories",
      evidenceCards: [
        {
          id: `signal-${signal.id}`,
          title: signal.title,
          source: "Signals",
          description: signal.description ?? "Signal operacional registrado na Norwyn.",
          details: [
            `Prioridade: ${signal.priority}.`,
            `Score final: ${Number(signal.final_score ?? 0)}.`,
            `Acao sugerida: ${signal.suggested_action ?? "sem acao cadastrada"}.`,
          ],
          confidence: Number(signal.final_score ?? 50),
          impact: Number(signal.final_score ?? 0) >= 70 ? "Alto" : "Medio",
          metricLabel: "Score",
          metricValue: `${Number(signal.final_score ?? 0)}`,
          relatedProduct: signal.product_tags?.[0] ?? null,
        },
      ],
    });
  }

  return recommendations.slice(0, 6);
}

export function buildEvidenceEngine(input: EvidenceEngineInput): EvidenceEngineResult {
  const confirmedSales = input.commercialSales.filter((sale) => {
    const group = normalizeText(sale.grupo_comercial);
    const status = normalizeText(sale.status_normalizado ?? sale.status_original);
    return group === "confirmed" || ["approved", "complete", "confirmed"].includes(status);
  });
  const patterns = input.contentEvents
    .map((event) => buildPattern(event, confirmedSales))
    .filter((pattern): pattern is NorwynLaunchPattern => Boolean(pattern))
    .sort((a, b) => b.influenceScore - a.influenceScore);

  const cards = patterns.flatMap((pattern) => pattern.evidenceCards);
  const summary = {
    bestFormat: topBy(patterns, (pattern) => pattern.format, (pattern) => pattern.influenceScore),
    bestHour: topBy(patterns, (pattern) => {
      const date = toDate(pattern.publishedAt);
      return date ? `${String(date.getHours()).padStart(2, "0")}h` : null;
    }, (pattern) => pattern.salesInWindow),
    bestWeekday: topBy(patterns, (pattern) => {
      const date = toDate(pattern.publishedAt);
      return date ? weekdays[date.getDay()] : null;
    }, (pattern) => pattern.salesInWindow),
    topProduct: topBy(patterns, (pattern) => pattern.productName, (pattern) => pattern.revenueInWindow),
    totalWindowSales: patterns.reduce((sum, pattern) => sum + pattern.salesInWindow, 0),
    totalWindowRevenue: patterns.reduce((sum, pattern) => sum + pattern.revenueInWindow, 0),
  };

  return {
    cards,
    launchPatterns: patterns,
    recommendations: buildRecommendations(patterns, input),
    summary,
  };
}

export function evidenceRecommendationToBriefingSeed(recommendation: NorwynEvidenceRecommendation, missionId?: string | null) {
  const normalizedFormat = normalizeText(recommendation.suggestedFormat);
  const type =
    normalizedFormat.includes("reel") ? "Reels" :
    normalizedFormat.includes("carrossel") || normalizedFormat.includes("carousel") ? "Carrossel" :
    normalizedFormat.includes("anuncio") || normalizedFormat.includes("ads") ? "Anuncio" :
    normalizedFormat.includes("email") ? "E-mail" :
    "Stories";
  return {
    title: recommendation.title,
    type,
    missionId: missionId ?? undefined,
    recommendationOrigin: "Evidence Engine",
    objective: recommendation.objective,
    context: recommendation.expectedImpact,
    evidence: recommendation.evidenceCards.flatMap((card) => [card.title, ...card.details]).slice(0, 8),
    product: recommendation.productName ?? undefined,
    centralMessage: recommendation.nextStep,
    cta: "Transformar evidencia em acao revisavel.",
    priority: recommendation.priority,
    confidence: recommendation.confidence,
    sourceModule: "Norwyn Evidence Engine",
    rule: "padroes historicos e influencia potencial; nao representa atribuicao direta de vendas",
  };
}
