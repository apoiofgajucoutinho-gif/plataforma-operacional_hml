import type { InstagramInteraction } from "@/modules/instagram/types";
import type {
  NorwynAdsRow,
  NorwynCommercialSale,
  NorwynContentEvent,
  NorwynEvidenceCard,
  NorwynEvidenceInsight,
  NorwynEvidenceRecommendation,
  NorwynLaunchPattern,
  NorwynProduct,
  NorwynSignal,
} from "@/modules/norwyn/types";

type EvidenceEngineInput = {
  contentEvents: NorwynContentEvent[];
  commercialSales: NorwynCommercialSale[];
  products: NorwynProduct[];
  signals: NorwynSignal[];
  adsRows: NorwynAdsRow[];
  interactions: InstagramInteraction[];
  activeMissionName?: string | null;
};

type EvidenceEngineResult = {
  cards: NorwynEvidenceCard[];
  launchPatterns: NorwynLaunchPattern[];
  recommendations: NorwynEvidenceRecommendation[];
  insights: NorwynEvidenceInsight[];
  comparisons: Array<{ label: string; patterns: number; uniqueSales: number; uniqueRevenue: number; avgInfluence: number }>;
  summary: {
    bestFormat: string | null;
    bestPublishingHour: string | null;
    bestConversionHour: string | null;
    bestPublishingWeekday: string | null;
    bestSalesWeekday: string | null;
    topProduct: string | null;
    totalWindowSales: number;
    totalWindowRevenue: number;
    uniqueSales: number;
    uniqueRevenue: number;
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

function saleKey(sale: NorwynCommercialSale) {
  return sale.transaction_id || sale.id;
}

function uniqueSales(sales: NorwynCommercialSale[]) {
  const map = new Map<string, NorwynCommercialSale>();
  for (const sale of sales) {
    const key = saleKey(sale);
    if (key) map.set(key, sale);
  }
  return [...map.values()];
}

function metadataText(event: NorwynContentEvent, keys: string[]) {
  for (const key of keys) {
    const metadataValue = event.metadata?.[key];
    const performanceValue = event.performance_snapshot?.[key];
    const value = metadataValue ?? performanceValue;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
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

function productTerms(product: NorwynProduct) {
  return [
    product.nome_oficial,
    product.produto_base,
    product.categoria,
    ...(product.product_aliases ?? []).filter((alias) => alias.ativo !== false).map((alias) => alias.alias),
    ...(product.product_components ?? []).filter((component) => component.ativo !== false).map((component) => component.componente),
  ]
    .map(normalizeText)
    .filter((term) => term.length >= 3);
}

function resolveProductByName(value: string | null | undefined, products: NorwynProduct[]) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return (
    products.find((product) => productTerms(product).some((term) => normalized.includes(term) || term.includes(normalized))) ??
    null
  );
}

function inferProductAliases(product: string, products: NorwynProduct[] = []) {
  const normalized = normalizeText(product);
  const aliases = new Set<string>([normalized]);
  const catalogProduct = resolveProductByName(product, products);
  if (catalogProduct) {
    productTerms(catalogProduct).forEach((term) => aliases.add(term));
  }
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

function productMatchScore(event: NorwynContentEvent, sale: NorwynCommercialSale, products: NorwynProduct[] = []) {
  const product = sale.produto_nome ?? "";
  const text = contentText(event);
  if (!product || !text) return 20;

  const aliases = inferProductAliases(product, products);
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

function patternTheme(event: NorwynContentEvent) {
  const tags = event.theme_tags ?? [];
  if (tags.length) return tags[0];
  const text = contentText(event);
  if (text.includes("caso") || text.includes("clin")) return "Caso clinico";
  if (text.includes("depoimento") || text.includes("prova")) return "Prova social";
  if (text.includes("duvida") || text.includes("pergunta") || text.includes("faq")) return "FAQ / duvidas";
  if (text.includes("aula") || text.includes("tecnico") || text.includes("aprend")) return "Conteudo tecnico";
  if (text.includes("acesso") || text.includes("compra") || text.includes("inscricao")) return "Acesso / compra";
  return "Tema operacional";
}

function buildPattern(event: NorwynContentEvent, sales: NorwynCommercialSale[], products: NorwynProduct[] = []): NorwynLaunchPattern | null {
  const publishedAt = toDate(event.published_at);
  if (!publishedAt) return null;

  const windowEnd = new Date(publishedAt.getTime() + Math.max(1, event.influence_hours) * 60 * 60 * 1000);
  const salesInWindow = uniqueSales(sales
    .map((sale) => ({ sale, date: toDate(sale.data_aprovacao ?? sale.data_compra) }))
    .filter(({ date }) => date && date >= publishedAt && date <= windowEnd)
    .map(({ sale }) => sale))
    .map((sale) => ({ sale, date: toDate(sale.data_aprovacao ?? sale.data_compra) as Date }));

  if (!salesInWindow.length) return null;

  const totalRevenue = salesInWindow.reduce((sum, item) => sum + revenue(item.sale.valor_bruto), 0);
  const bestSale = salesInWindow
    .map((item) => ({ ...item, score: productMatchScore(event, item.sale, products) }))
    .sort((a, b) => b.score - a.score)[0];
  const avgProductMatch = salesInWindow.reduce((sum, item) => sum + productMatchScore(event, item.sale, products), 0) / salesInWindow.length;
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
  const normalizedProduct = resolveProductByName(productName, products);
  const productBaseName = normalizedProduct?.produto_base ?? productName;
  const associatedProducts = uniqueProducts(salesInWindow.map((item) => item.sale))
    .map((product) => resolveProductByName(product, products)?.produto_base ?? product)
    .filter((product, index, list) => list.findIndex((item) => normalizeText(item) === normalizeText(product)) === index)
    .slice(0, 5);
  const permalink = metadataText(event, ["permalink", "post_url", "url"]);
  const imageUrl = metadataText(event, ["image_url", "thumbnail_url", "media_url", "picture"]);

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
    contentCaption: event.caption,
    permalink,
    imageUrl,
    missionId: event.mission_id,
    campaignId: event.campaign_id,
    format,
    publishedAt: event.published_at,
    influenceHours: event.influence_hours,
    normalizedProductId: normalizedProduct?.id ?? null,
    productBaseName,
    productName,
    associatedProducts,
    themeTags: event.theme_tags?.length ? event.theme_tags : [patternTheme(event)],
    funnelStage: event.funnel_stage,
    transactionIds: salesInWindow.map((item) => saleKey(item.sale)).filter(Boolean),
    transactionRevenue: salesInWindow
      .map((item) => ({ id: saleKey(item.sale), value: revenue(item.sale.valor_bruto) }))
      .filter((item) => Boolean(item.id)),
    productMatchScore: clamp(avgProductMatch),
    influenceScore: score,
    influenceLevel: level,
    salesInWindow: salesInWindow.length,
    revenueInWindow: totalRevenue,
    performanceSnapshot: event.performance_snapshot,
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

function salesFromPatterns(patterns: NorwynLaunchPattern[], sourceSales: NorwynCommercialSale[]) {
  const ids = new Set(patterns.flatMap((pattern) => pattern.transactionIds));
  return uniqueSales(sourceSales.filter((sale) => ids.has(saleKey(sale))));
}

function comparison(label: string, patterns: NorwynLaunchPattern[], sales: NorwynCommercialSale[]) {
  const unique = salesFromPatterns(patterns, sales);
  return {
    label,
    patterns: patterns.length,
    uniqueSales: unique.length,
    uniqueRevenue: unique.reduce((sum, sale) => sum + revenue(sale.valor_bruto), 0),
    avgInfluence: patterns.length ? clamp(patterns.reduce((sum, pattern) => sum + pattern.influenceScore, 0) / patterns.length) : 0,
  };
}

function inLastDays(value: string, days: number) {
  const date = toDate(value);
  if (!date) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return date >= start;
}

function buildInsights(patterns: NorwynLaunchPattern[], recommendations: NorwynEvidenceRecommendation[]): NorwynEvidenceInsight[] {
  const topPattern = patterns[0];
  const highPatterns = patterns.filter((pattern) => pattern.influenceScore >= 65);
  const format = topBy(highPatterns, (pattern) => pattern.format, (pattern) => pattern.influenceScore) ?? topPattern?.format ?? null;
  const product = topBy(patterns, (pattern) => pattern.productBaseName ?? pattern.productName, (pattern) => pattern.revenueInWindow) ?? topPattern?.productBaseName ?? topPattern?.productName ?? null;
  const insights: NorwynEvidenceInsight[] = [];

  if (topPattern) {
    insights.push({
      id: "repeat-proven-angle",
      title: "Repetir o melhor padrao com ajuste controlado",
      interpretation: `${topPattern.contentTitle} concentrou ${topPattern.salesInWindow} venda(s) e ${currencyFormatter.format(topPattern.revenueInWindow)} na janela analisada. Use como referencia, nao como atribuicao direta.`,
      confidence: topPattern.influenceScore,
      sourceCount: topPattern.evidenceCards.length,
      action: `Criar novo briefing em formato ${topPattern.format} com CTA explicito para ${topPattern.productBaseName ?? topPattern.productName ?? "produto prioritario"}.`,
      relatedRecommendationId: recommendations[0]?.id ?? null,
      evidenceCards: topPattern.evidenceCards,
    });
  }

  if (format) {
    const formatPatterns = patterns.filter((pattern) => pattern.format === format);
    insights.push({
      id: "format-priority",
      title: `Formato com melhor resposta: ${format}`,
      interpretation: `${formatPatterns.length} conteudo(s) desse formato apareceram em janelas com venda. O sinal serve para priorizar teste de formato no proximo ciclo.`,
      confidence: clamp(formatPatterns.reduce((sum, pattern) => sum + pattern.influenceScore, 0) / Math.max(1, formatPatterns.length)),
      sourceCount: formatPatterns.length,
      action: `Planejar uma peca ${format} reaproveitando a promessa e a objecao do melhor conteudo.`,
      relatedRecommendationId: recommendations.find((item) => item.suggestedFormat === format)?.id ?? null,
      evidenceCards: formatPatterns.flatMap((pattern) => pattern.evidenceCards).slice(0, 4),
    });
  }

  if (product) {
    const productPatterns = patterns.filter((pattern) => pattern.productBaseName === product || pattern.productName === product || pattern.associatedProducts.includes(product));
    insights.push({
      id: "product-demand",
      title: `Produto com maior sinal comercial: ${product}`,
      interpretation: "As vendas confirmadas no periodo analisado se concentraram nesse produto dentro das janelas de conteudo. A leitura ajuda a decidir foco de pauta e CTA.",
      confidence: clamp(45 + productPatterns.length * 8),
      sourceCount: productPatterns.length,
      action: `Reforcar conteudos de duvida, prova e proximo passo para ${product}.`,
      relatedRecommendationId: recommendations.find((item) => item.productName === product)?.id ?? null,
      evidenceCards: productPatterns.flatMap((pattern) => pattern.evidenceCards).slice(0, 4),
    });
  }

  return insights.slice(0, 4);
}

function buildRecommendations(patterns: NorwynLaunchPattern[], input: EvidenceEngineInput): NorwynEvidenceRecommendation[] {
  const angleForPattern = (pattern: NorwynLaunchPattern) => {
    const text = `${pattern.contentTitle ?? ""} ${pattern.format ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (text.includes("duvida") || text.includes("faq") || text.includes("pergunta")) return "Quebra de objecao";
    if (text.includes("caso") || text.includes("clin")) return "Caso clinico";
    if (text.includes("erro") || text.includes("falha")) return "Erro comum";
    if (text.includes("bastidor")) return "Bastidores";
    if (text.includes("depoimento") || text.includes("prova")) return "Prova social";
    if (text.includes("aula") || text.includes("aprend")) return "Micro aprendizagem";
    return "Autoridade tecnica";
  };
  const topPatterns = [...patterns].sort((a, b) => b.influenceScore - a.influenceScore).slice(0, 4);
  const recommendations = topPatterns.map((pattern) => ({
    id: `pattern-${pattern.id}`,
    title: `${angleForPattern(pattern)}: repetir padrao com ${pattern.productBaseName ?? pattern.productName ?? "produto prioritario"}`,
    objective: "Transformar um padrao observado historicamente em briefing operacional para nova peca.",
    relatedMission: input.activeMissionName ?? null,
    expectedImpact: "Aumentar clareza comercial e testar novamente um formato associado a picos de venda.",
    confidence: pattern.influenceScore,
    priority: pattern.influenceScore >= 65 ? ("Alta" as const) : ("Media" as const),
    nextStep: `Gerar briefing em formato ${pattern.format} com CTA claro e evidencia historica.`,
    kpis: ["vendas confirmadas", "receita bruta", "comentarios", "salvos", "compartilhamentos"],
    evidenceCards: pattern.evidenceCards,
    productName: pattern.productBaseName ?? pattern.productName,
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
  const confirmedSales = uniqueSales(input.commercialSales.filter((sale) => {
    const group = normalizeText(sale.grupo_comercial);
    const status = normalizeText(sale.status_normalizado ?? sale.status_original);
    return group === "confirmed" || ["approved", "complete", "confirmed"].includes(status);
  }));
  const patterns = input.contentEvents
    .map((event) => buildPattern(event, confirmedSales, input.products))
    .filter((pattern): pattern is NorwynLaunchPattern => Boolean(pattern))
    .sort((a, b) => b.influenceScore - a.influenceScore);

  const uniqueSalesInPatterns = salesFromPatterns(patterns, confirmedSales);
  const recommendations = buildRecommendations(patterns, input);
  const cards = patterns.flatMap((pattern) => pattern.evidenceCards);
  const last30 = patterns.filter((pattern) => inLastDays(pattern.publishedAt, 30));
  const lastLaunch = patterns.filter((pattern) => pattern.influenceScore >= 65).slice(0, 12);
  const currentLaunch = patterns.filter((pattern) => inLastDays(pattern.publishedAt, 10));
  const summary = {
    bestFormat: topBy(patterns, (pattern) => pattern.format, (pattern) => pattern.influenceScore),
    bestPublishingHour: topBy(patterns, (pattern) => {
      const date = toDate(pattern.publishedAt);
      return date ? `${String(date.getHours()).padStart(2, "0")}h` : null;
    }, (pattern) => pattern.influenceScore),
    bestConversionHour: topBy(confirmedSales, (sale) => {
      const date = toDate(sale.data_aprovacao ?? sale.data_compra);
      return date ? `${String(date.getHours()).padStart(2, "0")}h` : null;
    }, (sale) => revenue(sale.valor_bruto)),
    bestPublishingWeekday: topBy(patterns, (pattern) => {
      const date = toDate(pattern.publishedAt);
      return date ? weekdays[date.getDay()] : null;
    }, (pattern) => pattern.influenceScore),
    bestSalesWeekday: topBy(confirmedSales, (sale) => {
      const date = toDate(sale.data_aprovacao ?? sale.data_compra);
      return date ? weekdays[date.getDay()] : null;
    }, (sale) => revenue(sale.valor_bruto)),
    topProduct: topBy(patterns, (pattern) => pattern.productBaseName ?? pattern.productName, (pattern) => pattern.revenueInWindow),
    totalWindowSales: patterns.reduce((sum, pattern) => sum + pattern.salesInWindow, 0),
    totalWindowRevenue: patterns.reduce((sum, pattern) => sum + pattern.revenueInWindow, 0),
    uniqueSales: uniqueSalesInPatterns.length,
    uniqueRevenue: uniqueSalesInPatterns.reduce((sum, sale) => sum + revenue(sale.valor_bruto), 0),
  };

  return {
    cards,
    launchPatterns: patterns,
    recommendations,
    insights: buildInsights(patterns, recommendations),
    comparisons: [
      comparison("Historico", patterns, confirmedSales),
      comparison("Ultimo lancamento", lastLaunch, confirmedSales),
      comparison("Ultimos 30 dias", last30, confirmedSales),
      comparison("Lancamento atual", currentLaunch, confirmedSales),
    ],
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
    context: `${recommendation.expectedImpact} Proximo passo: ${recommendation.nextStep}`,
    evidence: [
      `Missao/produto: ${recommendation.productName ?? "sem produto unico"}`,
      `Formato sugerido: ${recommendation.suggestedFormat}`,
      ...recommendation.evidenceCards.flatMap((card) => [card.title, ...card.details]),
    ].slice(0, 10),
    product: recommendation.productName ?? undefined,
    centralMessage: recommendation.nextStep,
    cta: "Transformar evidencia em acao revisavel.",
    priority: recommendation.priority,
    confidence: recommendation.confidence,
    sourceModule: "Norwyn Evidence Engine",
    rule: "padroes historicos e influencia potencial; nao representa atribuicao direta de vendas",
  };
}
