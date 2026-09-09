export type LandingSeverity = "PASS" | "INFO" | "WARNING" | "CRITICAL" | "BLOCKER";
export type PreflightStatus = "READY" | "READY WITH WARNINGS" | "NOT READY";
export type OperationMode = "SHADOW" | "ASSISTED" | "NORWYN_OWNED";

export type LandingRegistryEntry = {
  campaign_key: string;
  landing_key: string;
  landing_name: string;
  landing_version: string;
  url: string;
  product_id?: string | null;
  hotmart_product_id?: string | null;
  environment: string;
  status: string;
  operation_mode?: OperationMode | string | null;
  external_owner?: string | null;
  monitor_frequency_minutes?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type LandingEvidence = {
  label: string;
  value: string;
  source: string;
};

export type LandingCta = {
  text: string;
  href: string | null;
  evidence: string;
};

export type ClassifiedEvidence = LandingEvidence & {
  classification: string;
};

export type LandingExtraction = {
  title: string | null;
  headline: LandingEvidence | null;
  subheadline: LandingEvidence | null;
  dates: LandingEvidence[];
  classifiedDates: ClassifiedEvidence[];
  prices: LandingEvidence[];
  classifiedPrices: ClassifiedEvidence[];
  ctas: LandingCta[];
  checkoutLinks: LandingCta[];
  trackingDetected: LandingEvidence[];
  scripts: LandingEvidence[];
  contentSignals: Record<string, LandingEvidence[]>;
  unavailable: string[];
};

export type LandingQaIssue = {
  ruleId: string;
  ruleVersion: string;
  category: "Datas" | "Preco" | "Oferta" | "CTA" | "Checkout" | "Tracking" | "Hotmart" | "Meta mapping";
  severity: LandingSeverity;
  title: string;
  description: string;
  recommendation: string;
  evidence: LandingEvidence[];
};

export type LandingAnalysis = {
  registry: LandingRegistryEntry;
  fetchedAt: string;
  statusCode: number | null;
  contentHash: string;
  contentLength: number;
  extraction: LandingExtraction;
  issues: LandingQaIssue[];
  preflight: {
    status: PreflightStatus;
    reason: string;
    counts: Record<LandingSeverity, number>;
  };
};

export type LandingReadinessReport = {
  operationMode: {
    mode: OperationMode;
    externalOwner: string;
    norwynRole: string;
    canDo: string[];
    cannotDo: string[];
  };
  campaign: {
    name: string;
    key: string;
    product: string;
    period: string;
  };
  landings: LandingAnalysis[];
  comparison: Array<{ field: string; v1: string; v5: string; note: string }>;
  controlTower: Array<{ stage: string; status: LandingSeverity; detail: string }>;
  strategistContext: Array<{ type: "FACT" | "OBSERVATION" | "HYPOTHESIS" | "RECOMMENDATION" | "MISSING DATA"; text: string }>;
  trackingTestUrls: Array<{ landingKey: string; url: string }>;
  metaMapping: Array<{ landingKey: string; status: "FOUND" | "LANDING VERSION UNKNOWN"; evidence: string }>;
  hotmartMapping: Array<{ landingKey: string; status: "FOUND" | "UNKNOWN"; evidence: string }>;
  dynamicTracking?: Array<{ landingKey: string; href: string | null; parameters: Array<{ key: string; status: "RECEIVED" | "PRESERVED" | "TRANSFORMED" | "LOST" | "UNKNOWN"; evidence: string }> }>;
  metaResolutionDryRun?: { rowsAnalyzed: number; recoverable: number; unrecoverable: number; v1: number; v5: number; other: number; unknown: number; high: number; medium: number; low: number; byLanding?: Array<{ landingKey: string; rows: number }> };
  landingPerformance?: Array<{ landingKey: string; spend: number | null; impressions: number | null; linkClicks: number | null; metaLpv: number | null; norwynViews: number | null; ctaViews: number | null; ctaClicks: number | null; checkout: number | null; purchases: number | null; revenue: number | null; cpa: number | null; roas: number | null; confidence: string }>;
  creativeLandingPurchase?: Array<{ creative: string; campaign: string; landingKey: string; spend: number | null; clicks: number | null; purchases: number | null; revenue: number | null; roas: number | null; confidence: string; evidence: string }>;
  operationalAlerts?: string[];
  shadowOperation?: {
    currentIncident: {
      incidentKey: string;
      title: string;
      severity: "CRITICAL" | "BLOCKER" | "WARNING" | "INFO";
      status: string;
      externalOwner: string;
      norwynRole: string;
      detectedBy: string;
      detectedAt: string | null;
      affectedAssets: string[];
      evidence: string[];
      confirmedImpact: Record<string, unknown>;
      potentialImpact: Record<string, unknown>;
      unknown: string[];
      preventionRule: string;
      preflightRule: string;
      automationOpportunity: string;
    } | null;
    scorecard: Array<{ label: string; value: string; note: string }>;
    takeoverReadiness: Array<{ domain: string; status: "READY" | "PARTIAL" | "NOT READY"; evidence: string }>;
    playbookRules: Array<{ category: string; severity: "INFO" | "WARNING" | "CRITICAL" | "BLOCKER"; title: string; rule: string; status: string; evidence: string }>;
  };
  monitoring?: {
    active: boolean;
    lastCheckedAt: string | null;
    nextCheckAt: string | null;
    lastChangeAt: string | null;
    openIssues: number;
    changeLog: Array<{ detectedAt: string; landingKey: string; status: string; message: string }>;
  };
  sourceHealth?: Array<{ source: string; status: "OK" | "PARTIAL" | "STALE" | "ERROR" | "UNAVAILABLE"; lastUpdatedAt: string | null; detail: string }>;
  generatedAt: string;
};

const requiredTrackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "sck", "source_sck", "campaign_key", "creative_key", "audience_key"];

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function textFromHtml(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function hashContent(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function snippet(text: string, index: number, length = 80) {
  const start = Math.max(0, index - length);
  const end = Math.min(text.length, index + length);
  return text.slice(start, end).trim();
}

function collectMatches(text: string, pattern: RegExp, label: string) {
  const items: LandingEvidence[] = [];
  for (const match of text.matchAll(pattern)) {
    const value = match[0].trim();
    if (!items.some((item) => normalize(item.value) === normalize(value))) {
      items.push({ label, value, source: snippet(text, match.index ?? 0) });
    }
  }
  return items.slice(0, 30);
}

function classifyByContext(item: LandingEvidence, rules: Array<[string, RegExp]>, fallback: string): ClassifiedEvidence {
  const context = normalize(`${item.source} ${item.value}`);
  const matched = rules.find(([, pattern]) => pattern.test(context));
  return { ...item, classification: matched?.[0] ?? fallback };
}

function classifyDates(dates: LandingEvidence[]) {
  return dates.map((item) =>
    classifyByContext(item, [
      ["LOT_DEADLINE", /lote|vira|virada|ate|at[eé]|encerra|06\/09|06 de setembro/],
      ["EVENT_DATE", /evento|imersao|imers[aã]o|aula|ao vivo|07\/09|08\/09/],
      ["OLD_EVENT_DATE", /agosto|1.? de agosto|1.?o de agosto|1.?º de agosto/],
      ["START_DATE", /inicio|come[cç]a/],
      ["END_DATE", /fim|termina|encerramento/],
    ], "UNKNOWN_DATE"),
  );
}

function classifyPrices(prices: LandingEvidence[]) {
  return prices.map((item) =>
    classifyByContext(item, [
      ["ORDER_BUMP_PRICE", /2.? ingresso|segundo ingresso|50%|19,90|bump/],
      ["NEXT_LOT_PRICE", /proximo lote|pr[oó]ximo lote|vira|virada|49,90/],
      ["CURRENT_PRICE", /lote atual|hoje|agora|garanta|39,90/],
      ["OLD_PRICE", /de r\$|antes|preco antigo|pre[cç]o antigo/],
      ["DISCOUNT_PRICE", /desconto|promocional/],
    ], "UNKNOWN_PRICE"),
  );
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1].replace(/\s+/g, " ").trim()) : null;
}

function extractHeading(html: string, tag: "h1" | "h2") {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match?.[1]) return null;
  const value = textFromHtml(match[1]);
  return value ? { label: tag.toUpperCase(), value, source: value } : null;
}

function extractCtas(html: string) {
  const ctas: LandingCta[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']?([^"'\s>]+)?[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1] ? decodeEntities(match[1].trim()) : null;
    const text = textFromHtml(match[2] ?? "");
    if (!text && !href) continue;
    const isCta = /inscri|garant|particip|compr|checkout|quero|vaga|ingresso|matric/i.test(`${text} ${href ?? ""}`);
    if (isCta) ctas.push({ text: text || "CTA sem texto", href, evidence: `${text || "sem texto"} -> ${href ?? "sem link"}` });
  }
  return ctas.slice(0, 40);
}

function extractScripts(html: string) {
  const scripts: LandingEvidence[] = [];
  for (const match of html.matchAll(/<script\b[^>]*(?:src=["']([^"']+)["'])?[^>]*>/gi)) {
    const value = match[1] ?? match[0].slice(0, 180);
    const lower = normalize(value);
    if (/(facebook|fbq|gtm|google|analytics|hotmart|pixel|clarity|tagmanager)/.test(lower)) {
      scripts.push({ label: "script", value, source: match[0].slice(0, 220) });
    }
  }
  return scripts.slice(0, 30);
}

function extractTracking(html: string) {
  const found: LandingEvidence[] = [];
  for (const key of requiredTrackingKeys) {
    if (new RegExp(`[?&]${key}=|${key}`, "i").test(html)) {
      found.push({ label: key, value: "detectado", source: key });
    }
  }
  return found;
}

function extractSignals(text: string) {
  const groups: Record<string, RegExp> = {
    promessa: /[^.!?]*(?:aprenda|domine|imers[aã]o|t[eé]cnica|mascaramento|resultado)[^.!?]*/gi,
    publico: /[^.!?]*(?:fonoaudi[oó]log|fono|profissional|terapeuta|paciente|crian[cç]a)[^.!?]*/gi,
    dores: /[^.!?]*(?:erro|dificuldade|problema|medo|inseguran[cç]a|falha)[^.!?]*/gi,
    prova: /[^.!?]*(?:depoimento|alun[ao]s?|resultado|caso|prova|certificado)[^.!?]*/gi,
    garantia: /[^.!?]*(?:garantia|reembolso|risco)[^.!?]*/gi,
    bonus: /[^.!?]*(?:b[oô]nus|presente|extra|material)[^.!?]*/gi,
    faq: /[^.!?]*(?:perguntas frequentes|faq|d[uú]vidas)[^.!?]*/gi,
    urgencia: /[^.!?]*(?:lote|virada|vagas?|[uú]ltim[ao]s?|encerra|somente hoje)[^.!?]*/gi,
  };
  return Object.fromEntries(
    Object.entries(groups).map(([key, pattern]) => [key, collectMatches(text, pattern, key).slice(0, 8)]),
  );
}

export function analyzeLandingHtml(registry: LandingRegistryEntry, html: string, statusCode: number | null, fetchedAt = new Date().toISOString()): LandingAnalysis {
  const text = textFromHtml(html);
  const title = extractTitle(html);
  const ctas = extractCtas(html);
  const checkoutLinks = ctas.filter((cta) => /hotmart|pay|checkout|payment|compra|ingresso/i.test(`${cta.href ?? ""} ${cta.text}`));
  const dates = [
    ...collectMatches(text, /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, "data_numerica"),
    ...collectMatches(text, /\b\d{1,2}\s*(?:º|Âº|o)?\s+de\s+(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi, "data_extenso"),
    ...collectMatches(text, /\b(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi, "mes"),
  ];
  const prices = collectMatches(text, /R\$\s*\d{1,4}(?:[.,]\d{2})?/gi, "preco");
  const classifiedDates = classifyDates(dates);
  const classifiedPrices = classifyPrices(prices);
  const scripts = extractScripts(html);
  const trackingDetected = extractTracking(html);
  const extraction: LandingExtraction = {
    title,
    headline: extractHeading(html, "h1"),
    subheadline: extractHeading(html, "h2"),
    dates,
    classifiedDates,
    prices,
    classifiedPrices,
    ctas,
    checkoutLinks,
    trackingDetected,
    scripts,
    contentSignals: extractSignals(text),
    unavailable: [],
  };

  for (const field of ["mecanismo", "autoridade", "depoimentos estruturados", "lote estruturado", "preservacao dinamica de parametros"] as const) {
    extraction.unavailable.push(field);
  }

  const issues = buildQaIssues(registry, extraction, text);
  const counts = { PASS: 0, INFO: 0, WARNING: 0, CRITICAL: 0, BLOCKER: 0 };
  for (const issue of issues) counts[issue.severity] += 1;
  const preflight: LandingAnalysis["preflight"] = counts.BLOCKER > 0 || counts.CRITICAL > 0
    ? { status: "NOT READY", reason: `${counts.BLOCKER} BLOCKER, ${counts.CRITICAL} CRITICAL, ${counts.WARNING} WARNING`, counts }
    : counts.WARNING > 0
      ? { status: "READY WITH WARNINGS", reason: `${counts.WARNING} WARNING`, counts }
      : { status: "READY", reason: "Sem falhas bloqueantes nas regras versionadas.", counts };

  return {
    registry,
    fetchedAt,
    statusCode,
    contentHash: hashContent(html),
    contentLength: html.length,
    extraction,
    issues,
    preflight,
  };
}

function buildQaIssues(registry: LandingRegistryEntry, extraction: LandingExtraction, text: string): LandingQaIssue[] {
  const issues: LandingQaIssue[] = [];
  const months = new Set(extraction.dates.map((item) => normalize(item.value)).flatMap((value) => ["agosto", "setembro"].filter((month) => value.includes(month) || (month === "setembro" && /(?:^|[^0-9])0?9(?:[^0-9]|$)/.test(value)))));
  const hasOldDate = extraction.classifiedDates.some((item) => item.classification === "OLD_EVENT_DATE");
  const hasCurrentEventDate = extraction.classifiedDates.some((item) => item.classification === "EVENT_DATE" || item.classification === "LOT_DEADLINE");
  if (hasOldDate && hasCurrentEventDate && months.has("agosto") && (months.has("setembro") || extraction.dates.some((item) => /07\/09|08\/09|06\/09/.test(item.value)))) {
    issues.push({
      ruleId: "landing_dates_semantic_legacy_conflict_v1",
      ruleVersion: "2026-08-13",
      category: "Datas",
      severity: "CRITICAL",
      title: `Datas potencialmente conflitantes encontradas na Landing ${registry.landing_name}.`,
      description: "A pagina contem datas de lote/evento de setembro e referencia classificada como provavel data legada de agosto.",
      recommendation: "Revisar landing antes de direcionar trafego.",
      evidence: extraction.classifiedDates.filter((item) => /agosto|setembro|07\/09|08\/09|06\/09/i.test(item.value)).slice(0, 8),
    });
  }

  const pricesByClass = extraction.classifiedPrices.reduce((map, item) => {
    if (!map.has(item.classification)) map.set(item.classification, new Set<string>());
    map.get(item.classification)!.add(item.value.replace(/\s/g, "").replace(".", ","));
    return map;
  }, new Map<string, Set<string>>());
  const conflictingPriceClass = [...pricesByClass.entries()].find(([classification, values]) => classification !== "UNKNOWN_PRICE" && values.size > 1);
  if (conflictingPriceClass) {
    issues.push({
      ruleId: "landing_price_semantic_conflict_v1",
      ruleVersion: "2026-08-13",
      category: "Preco",
      severity: "CRITICAL",
      title: `Precos divergentes com mesma funcao encontrados na Landing ${registry.landing_name}.`,
      description: `Mais de um valor foi classificado como ${conflictingPriceClass[0]}.`,
      recommendation: "Revisar a oferta/preco antes de direcionar trafego.",
      evidence: extraction.classifiedPrices.filter((item) => item.classification === conflictingPriceClass[0]).slice(0, 10),
    });
  } else if (extraction.classifiedPrices.some((item) => item.classification === "CURRENT_PRICE") && extraction.classifiedPrices.some((item) => item.classification === "NEXT_LOT_PRICE")) {
    issues.push({
      ruleId: "landing_price_lot_semantics_v1",
      ruleVersion: "2026-08-13",
      category: "Preco",
      severity: "INFO",
      title: `Precos de lote parecem semanticamente distintos na Landing ${registry.landing_name}.`,
      description: "Foram encontrados valores compativeis com lote atual e proximo lote; isso nao e tratado como conflito.",
      recommendation: "Confirmar manualmente se R$39,90 e R$49,90 representam lote atual/proximo lote.",
      evidence: extraction.classifiedPrices.slice(0, 10),
    });
  } else if (!extraction.prices.length) {
    issues.push({
      ruleId: "landing_price_missing_v1",
      ruleVersion: "2026-08-13",
      category: "Preco",
      severity: "INFO",
      title: `Preco nao estruturado na Landing ${registry.landing_name}.`,
      description: "Nao foi encontrado valor em formato R$ no HTML capturado.",
      recommendation: "Confirmar manualmente se a oferta deve exibir preco na pagina.",
      evidence: [],
    });
  }

  const ctasWithoutLinks = extraction.ctas.filter((cta) => !cta.href || cta.href === "#");
  if (ctasWithoutLinks.length) {
    issues.push({
      ruleId: "landing_cta_without_link_v1",
      ruleVersion: "2026-08-13",
      category: "CTA",
      severity: "CRITICAL",
      title: `CTA sem link encontrado na Landing ${registry.landing_name}.`,
      description: "Pelo menos um CTA parece nao apontar para destino navegavel.",
      recommendation: "Validar os botoes principais antes de trafego pago.",
      evidence: ctasWithoutLinks.slice(0, 6).map((cta) => ({ label: "cta", value: cta.text, source: cta.evidence })),
    });
  }

  if (!extraction.checkoutLinks.length) {
    issues.push({
      ruleId: "landing_checkout_not_detected_v1",
      ruleVersion: "2026-08-13",
      category: "Checkout",
      severity: "WARNING",
      title: `Checkout nao detectado automaticamente na Landing ${registry.landing_name}.`,
      description: "Nenhum CTA com destino claramente associado a checkout/Hotmart foi identificado.",
      recommendation: "Validar destino dos CTAs manualmente sem realizar compra.",
      evidence: extraction.ctas.slice(0, 8).map((cta) => ({ label: "cta", value: cta.text, source: cta.evidence })),
    });
  }

  const missingTracking = requiredTrackingKeys.filter((key) => !extraction.trackingDetected.some((item) => item.label === key));
  if (missingTracking.length) {
    issues.push({
      ruleId: "landing_tracking_required_keys_missing_v1",
      ruleVersion: "2026-08-13",
      category: "Tracking",
      severity: "CRITICAL",
      title: `Tracking obrigatorio ausente ou nao detectavel na Landing ${registry.landing_name}.`,
      description: `Nao foi possivel detectar: ${missingTracking.join(", ")}.`,
      recommendation: "Preparar instrumentacao/preservacao de parametros antes de trafego pago.",
      evidence: extraction.trackingDetected,
    });
  }

  const expectedProductEvidence = [registry.hotmart_product_id, registry.landing_name, registry.landing_version]
    .filter(Boolean)
    .map((item) => String(item));
  const hasProductEvidence = expectedProductEvidence.length
    ? expectedProductEvidence.some((item) => normalize(text).includes(normalize(item)))
    : false;
  if (!hasProductEvidence) {
    issues.push({
      ruleId: "landing_hotmart_product_evidence_missing_v1",
      ruleVersion: "2026-08-13",
      category: "Hotmart",
      severity: "WARNING",
      title: `Evidencia de produto Hotmart nao conclusiva na Landing ${registry.landing_name}.`,
      description: "A pagina menciona a oferta, mas nao ha evidencia tecnica suficiente para afirmar o hotmart_product_id do CTA.",
      recommendation: registry.hotmart_product_id
        ? `Comparar o destino real dos CTAs com o produto Hotmart esperado ${registry.hotmart_product_id}.`
        : "Cadastrar produto Hotmart esperado ou comparar destino real dos CTAs com a base Hotmart.",
      evidence: extraction.checkoutLinks.slice(0, 6).map((cta) => ({ label: "checkout", value: cta.href ?? "sem href", source: cta.evidence })),
    });
  }

  issues.push({
    ruleId: "landing_meta_mapping_read_only_v1",
    ruleVersion: "2026-08-13",
    category: "Meta mapping",
    severity: "INFO",
    title: `Mapeamento Meta -> Landing ${registry.landing_name} exige evidencia de URL/destination_url.`,
    description: "Atribuicao por proximidade temporal nao e aceita.",
    recommendation: "Usar destination_url, UTM, sck/source_sck ou creative/ad metadata para vinculo.",
    evidence: [],
  });

  return issues;
}

function valueOrUnavailable(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : "DADOS INDISPONIVEIS";
}

export function buildLandingReadinessReport(landings: LandingAnalysis[]): LandingReadinessReport {
  return buildLandingReadinessReportForContext(landings);
}

export function buildLandingReadinessReportForContext(landings: LandingAnalysis[], options: {
  campaignKey?: string | null;
  campaignName?: string | null;
  productName?: string | null;
  period?: string | null;
  operationMode?: OperationMode | string | null;
  externalOwner?: string | null;
} = {}): LandingReadinessReport {
  const left = landings[0] ?? null;
  const right = landings[1] ?? null;
  const leftLabel = left?.registry.landing_name || left?.registry.landing_key || "Landing A";
  const rightLabel = right?.registry.landing_name || right?.registry.landing_key || "Landing B";
  const comparison = [
    { field: "headline", v1: valueOrUnavailable(left?.extraction.headline?.value), v5: valueOrUnavailable(right?.extraction.headline?.value), note: `${leftLabel} vs ${rightLabel}. Extraido do primeiro H1 detectavel.` },
    { field: "preco", v1: left?.extraction.prices.map((item) => item.value).join(", ") || "DADOS INDISPONIVEIS", v5: right?.extraction.prices.map((item) => item.value).join(", ") || "DADOS INDISPONIVEIS", note: "Valores encontrados em R$; nao prova oferta principal." },
    { field: "datas", v1: left?.extraction.dates.slice(0, 8).map((item) => item.value).join(", ") || "DADOS INDISPONIVEIS", v5: right?.extraction.dates.slice(0, 8).map((item) => item.value).join(", ") || "DADOS INDISPONIVEIS", note: "Datas extraidas por regex com evidencia." },
    { field: "ctas", v1: String(left?.extraction.ctas.length ?? 0), v5: String(right?.extraction.ctas.length ?? 0), note: "Quantidade de CTAs detectados no HTML." },
    { field: "checkout", v1: String(left?.extraction.checkoutLinks.length ?? 0), v5: String(right?.extraction.checkoutLinks.length ?? 0), note: "Links tecnicamente parecidos com checkout/Hotmart." },
    { field: "pre-flight", v1: left?.preflight.status ?? "DADOS INDISPONIVEIS", v5: right?.preflight.status ?? "DADOS INDISPONIVEIS", note: "Sem score percentual arbitrario." },
  ];
  const worst = landings.some((landing) => landing.preflight.status === "NOT READY") ? "CRITICAL" : landings.some((landing) => landing.preflight.status === "READY WITH WARNINGS") ? "WARNING" : "PASS";
  const firstRegistry = landings[0]?.registry;
  const operationMode = String(options.operationMode ?? firstRegistry?.operation_mode ?? "SHADOW");
  const externalOwner = String(options.externalOwner ?? firstRegistry?.external_owner ?? "UNKNOWN");
  const campaignKey = options.campaignKey ?? firstRegistry?.campaign_key ?? "NO_CAMPAIGN_SELECTED";
  const campaignName = options.campaignName ?? campaignKey;
  const productName = options.productName ?? "DADOS INDISPONIVEIS";
  const period = options.period ?? "DADOS INDISPONIVEIS";
  const landingLabel = landings.length ? `${landings.length} landing(s) analisada(s) em read-only por snapshot/hash.` : "NO LANDING REGISTERED para o contexto selecionado.";

  return {
    operationMode: {
      mode: ["SHADOW", "ASSISTED", "NORWYN_OWNED"].includes(operationMode) ? operationMode as OperationMode : "SHADOW",
      externalOwner,
      norwynRole: "MONITOR / DETECT / DOCUMENT / LEARN",
      canDo: [
        "detectar problemas",
        "gerar evidencias",
        "calcular impacto confirmado/potencial quando houver dados",
        "criar issues e tarefas internas",
        "recomendar correcoes",
        "acompanhar resolucao",
      ],
      cannotDo: [
        "editar landing",
        "editar campanha",
        "alterar orcamento",
        "alterar checkout",
        "publicar criativo",
        "alterar oferta",
      ],
    },
    campaign: {
      name: campaignName,
      key: campaignKey,
      product: productName,
      period,
    },
    landings,
    comparison,
    controlTower: [
      { stage: "READINESS", status: landings.length ? worst : "INFO", detail: landings.length ? (worst === "PASS" ? "Landings sem bloqueio pelas regras versionadas." : "Existe alerta de pre-flight antes de midia.") : "NO LANDING REGISTERED." },
      { stage: "ACQUISITION", status: "INFO", detail: "Fonte oficial prevista: instagram_ads_daily. Nao criar ingestao paralela." },
      { stage: "LANDING", status: landings.length ? worst : "INFO", detail: landingLabel },
      { stage: "CHECKOUT", status: landings.length ? "WARNING" : "INFO", detail: landings.length ? "Destino de CTA deve ser validado sem compra antes da ativacao." : "Sem landing cadastrada para validar CTA/checkout." },
      { stage: "PURCHASE", status: "INFO", detail: "Fonte prevista: comercial_vendas + Attribution Bridge." },
      { stage: "MONETIZATION", status: "INFO", detail: "Bump/upsell/downsell dependem de payload confiavel." },
    ],
    strategistContext: [
      { type: "FACT", text: landings.length ? `${landings.length} landing(s) foram analisadas por HTML read-only, sem alterar landing ou checkout.` : "Nenhuma landing cadastrada foi encontrada para o contexto selecionado." },
      { type: "OBSERVATION", text: landings.some((landing) => landing.issues.some((issue) => issue.ruleId === "landing_dates_semantic_legacy_conflict_v1")) ? "Uma ou mais landings contem datas atuais e provavel conteudo legado." : "A regra semantica nao confirmou conflito de datas nas landings analisadas." },
      { type: "HYPOTHESIS", text: "Se ha datas antigas na pagina, a landing pode ter sido parcialmente reaproveitada de uma campanha anterior." },
      { type: "RECOMMENDATION", text: "Resolver issues CRITICAL/BLOCKER antes de direcionar trafego pago." },
      { type: "MISSING DATA", text: "Mapeamento Meta -> Landing -> Checkout -> Hotmart ainda exige evidencia tecnica de URL, UTM, sck/source_sck ou destination_url." },
    ],
    trackingTestUrls: landings.map((analysis) => {
      const landing = analysis.registry;
      const params = new URLSearchParams({
        new_session: "1",
        landing_key: landing.landing_key,
        utm_source: "meta",
        utm_medium: "paid_social",
        utm_campaign: landing.campaign_key,
        utm_content: `${landing.landing_key}_creative_test`,
        utm_term: "internal_test",
        campaign_key: landing.campaign_key,
        creative_key: `${landing.landing_key}_creative_test`,
        audience_key: "internal_test",
        sck: `s=meta|m=paid_social|c=${landing.campaign_key}|l=${landing.landing_key}|co=${landing.landing_key}_creative_test|t=internal_test`,
      });
      return { landingKey: landing.landing_key, url: `/norwyn-lab/funnel-test?${params.toString()}` };
    }),
    metaMapping: landings.map((analysis) => ({ landingKey: analysis.registry.landing_key, status: "LANDING VERSION UNKNOWN", evidence: "Sem evidencia deterministica analisada neste snapshot." })),
    hotmartMapping: landings.map((analysis) => ({ landingKey: analysis.registry.landing_key, status: "UNKNOWN", evidence: analysis.registry.hotmart_product_id ? `Produto esperado ${analysis.registry.hotmart_product_id}; CTA precisa confirmar destino sem compra.` : "Produto Hotmart esperado nao cadastrado para esta landing." })),
    generatedAt: new Date().toISOString(),
  };
}
