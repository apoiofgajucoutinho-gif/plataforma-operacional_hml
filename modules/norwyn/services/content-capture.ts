import type { NorwynCampaign, NorwynContentEvent, NorwynProduct, NorwynSignal } from "@/modules/norwyn/types";

export type ContentCaptureContext = {
  title: string;
  captureType: "video" | "audio";
  driveUrl: string;
  description?: string | null;
  selectedProductId?: string | null;
  selectedMissionId?: string | null;
  selectedMissionName?: string | null;
  selectedCampaignId?: string | null;
  selectedObjectiveId?: string | null;
  products: NorwynProduct[];
  campaigns: NorwynCampaign[];
  contentEvents: NorwynContentEvent[];
  signals: NorwynSignal[];
};

export type ContentCaptureResult = {
  provider: string;
  model: string | null;
  duration_ms: number;
  success: boolean;
  error_message: string | null;
  usage_json: Record<string, unknown>;
  summary: string;
  transcript: string;
  transcript_source: string;
  transcript_status: string;
  topics: string[];
  pain_points: string[];
  objections: string[];
  cases: string[];
  quotes: string[];
  cta: string[];
  products_detected: Array<Record<string, unknown>>;
  related_missions: string[];
  tags: string[];
  knowledge_generated: Record<string, unknown>;
  similar_content: Array<Record<string, unknown>>;
  similar_campaigns: Array<Record<string, unknown>>;
  winning_plays: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  processing_metadata: Record<string, unknown>;
  primary_product_id: string | null;
  confidence: number;
};

const preferredGeminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const MAX_DESCRIPTION_CHARS = 18000;
const NO_EXPLICIT_CASE = "Nenhum caso clinico explicito foi identificado nesta captura.";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeGeminiModelName(model: string) {
  const trimmed = model.trim();
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact<T>(items: Array<T | null | undefined | false>) {
  return items.filter(Boolean) as T[];
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item)).filter(Boolean).slice(0, 30);
}

function asObjectArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object").slice(0, 30) as Array<Record<string, unknown>>;
}

function sentenceList(value: string) {
  return value
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function productTerms(product: NorwynProduct) {
  return [
    { value: product.nome_oficial, source: "nome_oficial", type: "produto base" },
    { value: product.produto_base, source: "produto_base", type: "produto base" },
    ...(product.product_aliases ?? []).map((alias) => ({ value: alias.alias, source: "alias", type: alias.principal ? "produto base" : "oferta" })),
    ...(product.product_components ?? []).map((component) => ({ value: component.componente, source: "componente", type: "componente" })),
  ]
    .map((item) => ({ ...item, normalized: normalize(item.value ?? "") }))
    .filter((item) => item.normalized.length > 2);
}

function scoreRelatedProduct(product: NorwynProduct, haystack: string) {
  const terms = productTerms(product);
  const matched = terms.filter((term) => haystack.includes(term.normalized));
  if (!matched.length) return null;
  const exactName = matched.some((term) => term.source === "nome_oficial");
  const exactBase = matched.some((term) => term.source === "produto_base");
  const alias = matched.some((term) => term.source === "alias");
  const component = matched.some((term) => term.source === "componente");
  const confidence = clamp((exactName ? 92 : 0) + (exactBase ? 86 : 0) + (alias ? 74 : 0) + (component ? 46 : 0) + Math.min(matched.length * 5, 15));
  const relation =
    exactName || exactBase
      ? "citado explicitamente"
      : alias
        ? "fortemente relacionado"
        : component
          ? "apenas componente de combo"
          : "relacionado";
  return {
    product_id: product.id,
    nome: product.nome_oficial,
    produto_base: product.produto_base,
    tipo: component && !exactName && !exactBase && !alias ? "componente" : product.tipo === "Combo" ? "combo" : "produto base",
    relation,
    evidence: matched.map((term) => term.value).slice(0, 5),
    confidence,
    action: confidence >= 70 ? "selecionar como produto principal" : "vincular manualmente se fizer sentido",
  };
}

function detectProducts(context: ContentCaptureContext) {
  const haystack = normalize(`${context.title} ${context.description ?? ""}`);
  return context.products
    .map((product) => scoreRelatedProduct(product, haystack))
    .filter(Boolean)
    .sort((a, b) => Number(b?.confidence ?? 0) - Number(a?.confidence ?? 0))
    .slice(0, 10) as Array<Record<string, unknown>>;
}

function extractStrongQuotes(description: string) {
  return sentenceList(description)
    .filter((line) => line.length >= 38 && line.length <= 180)
    .filter((line) => !/(clique|link|http|preco|valor|inscricao)/i.test(line))
    .slice(0, 6)
    .map((line) => ({
      quote: line.replace(/^["']|["']$/g, ""),
      timestamp: "sem timestamp",
      suggested_use: ["Reel hook", "Carrossel slide 1"],
      theme: inferTheme(line),
      product_related: null,
      confidence: 62,
      type: "fala exata da especialista",
    }));
}

function inferTheme(value: string) {
  const normalized = normalize(value);
  if (normalized.includes("rampa")) return "Perda em rampa";
  if (normalized.includes("automatic") || normalized.includes("first fit")) return "Ajuste automatico";
  if (normalized.includes("acesso") || normalized.includes("curso")) return "Acesso ao curso";
  if (normalized.includes("crianca") || normalized.includes("familia")) return "Familia e pediatria";
  return "Tema da captura";
}

function suggestedHeadlines(context: ContentCaptureContext, topics: string[]) {
  const main = topics[0] || context.title;
  return [
    {
      headline: `O que observar antes de confiar apenas no ajuste automatico`,
      label: "Sugestao editorial baseada na captura",
      theme: main,
      suggested_use: ["Reel hook", "Carrossel slide 1"],
      confidence: 58,
    },
    {
      headline: `${main}: o detalhe clinico que muda a decisao`,
      label: "Sugestao editorial baseada na captura",
      theme: main,
      suggested_use: ["Headline", "Story de abertura"],
      confidence: 55,
    },
  ].slice(0, 2);
}

function detectPainPoints(description: string) {
  const normalized = normalize(description);
  const items = [];
  if (normalized.includes("rampa") || normalized.includes("rebaixamento")) {
    items.push({
      technical: "Dificuldade em conduzir ajustes de perda em rampa e rebaixamento de frequencia com seguranca.",
      audience_language: "Eu mexo, mexo, e o paciente continua reclamando.",
      evidence: "Termos relacionados a perda em rampa/rebaixamento aparecem na captura.",
      confidence: 72,
    });
  }
  if (normalized.includes("automatic") || normalized.includes("first fit")) {
    items.push({
      technical: "Dependencia excessiva do ajuste automatico como decisao final.",
      audience_language: "O aparelho ja ajustou sozinho, mas eu nao sei se esta bom.",
      evidence: "A captura menciona ajuste automatico ou First Fit.",
      confidence: 68,
    });
  }
  if (!items.length && description) {
    items.push({
      technical: "Dor operacional a validar com a especialista antes de transformar em promessa de conteudo.",
      audience_language: "Eu sei que isso importa, mas ainda nao esta claro como explicar.",
      evidence: "Descricao informada, sem transcricao completa.",
      confidence: 38,
    });
  }
  return items;
}

function detectObjections(description: string) {
  const normalized = normalize(description);
  const items = [];
  if (normalized.includes("automatic") || normalized.includes("first fit")) {
    items.push({
      type: "Objecao sugerida pela Norwyn",
      objection: "O ajuste automatico ja deveria resolver.",
      how_it_appears: "Se o aparelho tem ajuste automatico, por que preciso mexer mais?",
      possible_response: "O ajuste automatico e ponto de partida. Alguns casos exigem decisao clinica para chegar em conforto e audibilidade.",
      supporting_excerpt: "Referencia a ajuste automatico/First Fit na captura.",
      recommended_use: "FAQ, Reel educativo ou carrossel de decisao clinica.",
      confidence: 64,
    });
  }
  if (normalized.includes("preco") || normalized.includes("valor")) {
    items.push({
      type: "Objecao mencionada no video",
      objection: "Preco ou investimento.",
      how_it_appears: "Eu quero, mas preciso entender se vale o investimento.",
      possible_response: "Conectar o investimento ao problema especifico que o conteudo resolve.",
      supporting_excerpt: "A captura menciona preco/valor.",
      recommended_use: "Story com caixa de pergunta ou WhatsApp consultivo.",
      confidence: 60,
    });
  }
  return items;
}

function detectCases(description: string) {
  const sentences = sentenceList(description);
  const caseSentences = sentences.filter((line) => /(paciente|caso clinico|crianca|adulto|retorno|queixa|audiometria|aparelho)/i.test(line));
  if (!caseSentences.length) return [NO_EXPLICIT_CASE];
  return caseSentences.slice(0, 4);
}

function buildCtas(description: string) {
  const theme = inferTheme(description || "captura");
  return [
    {
      intent: "salvamento",
      format: "Reel",
      cta: "Salva este video para revisar antes do proximo ajuste.",
      origin: "sugerido pela Norwyn",
      confidence: 74,
    },
    {
      intent: "comentario",
      format: "Reel ou Carrossel",
      cta: `Comenta qual parte de ${theme.toLowerCase()} voce quer que eu aprofunde.`,
      origin: "sugerido pela Norwyn",
      confidence: 68,
    },
    {
      intent: "compartilhamento",
      format: "Carrossel",
      cta: "Envie para uma fono que ainda depende apenas do ajuste automatico.",
      origin: "sugerido pela Norwyn",
      confidence: 65,
    },
    {
      intent: "direct",
      format: "Stories",
      cta: "Voce ja viveu isso em um retorno? Responde aqui.",
      origin: "sugerido pela Norwyn",
      confidence: 63,
    },
  ];
}

function relatedContent(context: ContentCaptureContext) {
  const haystack = normalize(`${context.title} ${context.description ?? ""}`);
  const tokens = haystack.split(" ").filter((token) => token.length > 4);
  return context.contentEvents
    .map((event) => {
      const eventText = normalize(`${event.title ?? ""} ${event.caption ?? ""} ${(event.theme_tags ?? []).join(" ")} ${(event.product_tags ?? []).join(" ")}`);
      const overlap = tokens.filter((token) => eventText.includes(token));
      if (!overlap.length) return null;
      const similarity = clamp((overlap.length / Math.max(tokens.length, 1)) * 140);
      return {
        id: event.id,
        title: event.title,
        source: event.source,
        format: event.subtype ?? event.event_type,
        published_at: event.published_at,
        similarity_percent: similarity,
        reason: overlap.slice(0, 6).join(", "),
        product_base: (event.product_tags ?? [])[0] ?? null,
        metrics: event.performance_snapshot ?? {},
        recommendation: similarity > 75 ? "criar continuacao" : "reaproveitar estrutura",
        open_url: event.metadata?.permalink ?? event.metadata?.url ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b?.similarity_percent ?? 0) - Number(a?.similarity_percent ?? 0))
    .slice(0, 8) as Array<Record<string, unknown>>;
}

function relatedCampaigns(context: ContentCaptureContext) {
  const haystack = normalize(`${context.title} ${context.description ?? ""}`);
  const tokens = haystack.split(" ").filter((token) => token.length > 4);
  return context.campaigns
    .map((campaign) => {
      const campaignText = normalize(`${campaign.name} ${campaign.type} ${JSON.stringify(campaign.plan_json ?? {})}`);
      const overlap = tokens.filter((token) => campaignText.includes(token));
      return overlap.length
        ? {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            similarity_percent: clamp((overlap.length / Math.max(tokens.length, 1)) * 130),
            reason: overlap.slice(0, 6).join(", "),
          }
        : null;
    })
    .filter(Boolean)
    .slice(0, 5) as Array<Record<string, unknown>>;
}

function basicTags(context: ContentCaptureContext, relatedProducts: Array<Record<string, unknown>>) {
  const tags = new Set<string>();
  tags.add(context.captureType);
  relatedProducts.forEach((product) => {
    if (product.produto_base) tags.add(String(product.produto_base));
  });
  const content = normalize(`${context.title} ${context.description ?? ""}`);
  for (const signal of context.signals.slice(0, 20)) {
    for (const tag of [...(signal.product_tags ?? []), ...(signal.mission_tags ?? [])]) {
      if (content.includes(normalize(tag))) tags.add(tag);
    }
  }
  return [...tags].slice(0, 12);
}

function buildDecisionBlock(context: ContentCaptureContext, relatedProducts: Array<Record<string, unknown>>, similarContent: Array<Record<string, unknown>>) {
  const mainProduct = relatedProducts[0];
  const theme = inferTheme(`${context.title} ${context.description ?? ""}`);
  return {
    title: "Como aproveitar esta captura",
    main_theme: theme,
    recommended_product_base: mainProduct?.produto_base ?? mainProduct?.nome ?? "Produto a selecionar manualmente",
    related_mission: context.selectedMissionName || "Missao a definir",
    natural_objective: "Transformar conhecimento clinico em conteudo educativo reutilizavel.",
    best_format: similarContent.some((item) => String(item.format ?? "").toLowerCase().includes("reel")) ? "Reel educativo" : "Carrossel educativo",
    second_best_format: "Stories com pergunta",
    commercial_level: /preco|valor|inscri|compr|oferta/i.test(context.description ?? "") ? "Venda" : "Autoridade",
    originality: similarContent.length ? `${similarContent[0].similarity_percent}% semelhante ao historico mais proximo` : "Sem similaridade forte encontrada",
    main_risk: relatedProducts.length ? "Nao transformar inferencia em promessa clinica." : "Produto principal ainda nao confirmado.",
    next_step: "Gerar draft especifico, revisar e enviar ao Marketing QA antes de usar.",
  };
}

function deterministicResult(context: ContentCaptureContext, startedAt: number, error?: string): ContentCaptureResult {
  const description = text(context.description);
  const relatedProducts = detectProducts(context);
  const similarContent = relatedContent(context);
  const similarCampaigns = relatedCampaigns(context);
  const topics = compact([
    inferTheme(`${context.title} ${description}`),
    context.title,
    ...relatedProducts.map((product) => String(product.produto_base ?? product.nome ?? "")).filter(Boolean),
  ]).slice(0, 8);
  const strongQuotes = extractStrongQuotes(description);
  const headlines = suggestedHeadlines(context, topics);
  const painPointsHuman = detectPainPoints(description);
  const objectionsHuman = detectObjections(description);
  const ctaSuggestions = buildCtas(description);
  const cases = detectCases(description);
  const decision = buildDecisionBlock(context, relatedProducts, similarContent);
  const transcript = description
    ? `Transcricao operacional baseada no texto informado pela usuaria.\n\n${description.slice(0, MAX_DESCRIPTION_CHARS)}`
    : "Transcricao real ainda nao disponivel. Nesta versao, o link do Google Drive e preservado como referencia e a Norwyn nao baixa o arquivo automaticamente.";
  const summary = description
    ? `Captura estruturada sobre ${topics[0] ?? context.title}. Use como insumo para conhecimento, drafts e revisao de Marketing QA.`
    : "Captura registrada com link do Google Drive. A leitura completa depende de transcricao real ou notas adicionais.";
  const confidence = description ? clamp(45 + Math.min(description.length / 250, 30) + relatedProducts.length * 5) : 25;

  return {
    provider: "deterministic",
    model: null,
    duration_ms: Date.now() - startedAt,
    success: !error,
    error_message: error ?? null,
    usage_json: {},
    summary,
    transcript,
    transcript_source: description ? "manual_notes" : "drive_reference",
    transcript_status: description ? "partial" : "missing",
    topics,
    pain_points: painPointsHuman.map((item) => `${item.technical} | Como aparece: ${item.audience_language}`),
    objections: objectionsHuman.map((item) => `${item.type}: ${item.objection} | Como aparece: ${item.how_it_appears}`),
    cases,
    quotes: strongQuotes.map((item) => `"${item.quote}" (${item.timestamp})`),
    cta: ctaSuggestions.map((item) => `${item.intent}: ${item.cta}`),
    products_detected: relatedProducts,
    related_missions: context.selectedMissionName ? [context.selectedMissionName] : [],
    tags: basicTags(context, relatedProducts),
    knowledge_generated: {
      source: "Content Capture",
      mode: "deterministic",
      decision,
      strong_quotes: strongQuotes,
      suggested_headlines: headlines,
      pain_points_human: painPointsHuman,
      objections_human: objectionsHuman,
      cta_suggestions: ctaSuggestions,
      related_products: relatedProducts,
      related_objectives: [],
      note: "Link preservado; arquivo nao baixado nesta versao.",
      sales_level: decision.commercial_level,
      confianca: confidence,
    },
    similar_content: similarContent,
    similar_campaigns: similarCampaigns,
    winning_plays: similarContent.slice(0, 3).map((item) => ({
      title: item.title,
      reason: item.reason,
      similarity_percent: item.similarity_percent,
      recommendation: item.recommendation,
    })),
    metadata: {
      drive_url_reference_only: true,
      description_chars: description.length,
      no_explicit_case_message: cases[0] === NO_EXPLICIT_CASE,
    },
    processing_metadata: {
      version: "content_capture_v1_1",
      generated_at: new Date().toISOString(),
      exact_quotes_count: strongQuotes.length,
      suggested_headlines_count: headlines.length,
      related_products_count: relatedProducts.length,
      similar_content_count: similarContent.length,
    },
    primary_product_id: String(relatedProducts[0]?.product_id ?? context.selectedProductId ?? "") || null,
    confidence,
  };
}

async function resolveGeminiModel(apiKey: string, requestedModel?: string | null) {
  const candidates = requestedModel ? [requestedModel, ...preferredGeminiModels] : preferredGeminiModels;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) return normalizeGeminiModelName(candidates[0]);
    const json = await response.json();
    const available = new Set<string>((json.models ?? []).map((model: any) => String(model.name ?? "")));
    for (const candidate of candidates) {
      const normalized = normalizeGeminiModelName(candidate);
      if (available.has(normalized)) return normalized;
    }
  } catch {
    return normalizeGeminiModelName(candidates[0]);
  }
  return normalizeGeminiModelName(candidates[0]);
}

function extractGeminiText(json: any) {
  return (
    json?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function parseGeminiJson(raw: string) {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function buildPrompt(context: ContentCaptureContext, base: ContentCaptureResult) {
  return `
Voce e a Norwyn Content Capture V1.1, uma camada de estruturacao de conhecimento.

Regras absolutas:
- Nao afirme que baixou, assistiu ou transcreveu o arquivo do Google Drive.
- Use apenas titulo, descricao/notas e contexto operacional.
- Nao completar resultado clinico que nao tenha sido mencionado.
- Se nao existir caso clinico real, retorne exatamente: "${NO_EXPLICIT_CASE}".
- Nao inventar exemplos apenas para preencher blocos.
- Diferenciar fala exata da especialista de sugestao editorial da Norwyn.
- Nao transformar inferencias em falas da especialista.
- Nao usar um unico CTA generico.
- Nao considerar automaticamente um combo como produto principal apenas porque contem componente.
- Retorne APENAS JSON valido.

Formato obrigatorio:
{
  "summary": "",
  "transcript": "",
  "topics": [],
  "cases": [],
  "strong_quotes": [{"quote":"","timestamp":"sem timestamp","suggested_use":[],"theme":"","product_related":"","confidence":0}],
  "suggested_headlines": [{"headline":"","label":"Sugestao editorial baseada na captura","theme":"","suggested_use":[],"confidence":0}],
  "pain_points_human": [{"technical":"","audience_language":"","evidence":"","confidence":0}],
  "objections_human": [{"type":"Objecao mencionada no video | Objecao sugerida pela Norwyn","objection":"","how_it_appears":"","possible_response":"","supporting_excerpt":"","recommended_use":"","confidence":0}],
  "cta_suggestions": [{"intent":"","format":"","cta":"","origin":"extraido | sugerido pela Norwyn","confidence":0}],
  "related_products": [{"product_id":"","nome":"","produto_base":"","tipo":"produto base | oferta | combo | componente | tema","relation":"","evidence":[],"confidence":0,"action":""}],
  "related_missions": [],
  "related_objectives": [],
  "decision": {"main_theme":"","recommended_product_base":"","related_mission":"","natural_objective":"","best_format":"","second_best_format":"","commercial_level":"","originality":"","main_risk":"","next_step":""},
  "tags": [],
  "confidence": 0
}

Contexto:
${JSON.stringify(
  {
    title: context.title,
    captureType: context.captureType,
    driveUrl: context.driveUrl,
    description: text(context.description).slice(0, MAX_DESCRIPTION_CHARS),
    selectedMission: context.selectedMissionName,
    selectedProductId: context.selectedProductId,
    selectedCampaignId: context.selectedCampaignId,
    products: context.products.slice(0, 150).map((product) => ({
      id: product.id,
      nome_oficial: product.nome_oficial,
      produto_base: product.produto_base,
      tipo: product.tipo,
      aliases: (product.product_aliases ?? []).map((alias) => alias.alias).slice(0, 14),
      components: (product.product_components ?? []).map((component) => component.componente).slice(0, 14),
    })),
    campaigns: context.campaigns.slice(0, 40).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
    })),
    similarContent: base.similar_content,
    similarCampaigns: base.similar_campaigns,
    deterministicSignals: {
      decision: base.knowledge_generated.decision,
      relatedProducts: base.products_detected,
      painPoints: base.knowledge_generated.pain_points_human,
      objections: base.knowledge_generated.objections_human,
    },
  },
  null,
  2,
)}
`;
}

function mergeGeminiResult(context: ContentCaptureContext, base: ContentCaptureResult, parsed: Record<string, any>, model: string, json: any, startedAt: number): ContentCaptureResult {
  const strongQuotes = asObjectArray(parsed.strong_quotes).length ? asObjectArray(parsed.strong_quotes) : (base.knowledge_generated.strong_quotes as Array<Record<string, unknown>>);
  const suggested = asObjectArray(parsed.suggested_headlines).length ? asObjectArray(parsed.suggested_headlines) : (base.knowledge_generated.suggested_headlines as Array<Record<string, unknown>>);
  const painHuman = asObjectArray(parsed.pain_points_human).length ? asObjectArray(parsed.pain_points_human) : (base.knowledge_generated.pain_points_human as Array<Record<string, unknown>>);
  const objectionsHuman = asObjectArray(parsed.objections_human).length ? asObjectArray(parsed.objections_human) : (base.knowledge_generated.objections_human as Array<Record<string, unknown>>);
  const ctaSuggestions = asObjectArray(parsed.cta_suggestions).length ? asObjectArray(parsed.cta_suggestions) : (base.knowledge_generated.cta_suggestions as Array<Record<string, unknown>>);
  const relatedProducts = asObjectArray(parsed.related_products).length ? asObjectArray(parsed.related_products) : base.products_detected;
  const decision = parsed.decision && typeof parsed.decision === "object" ? parsed.decision : base.knowledge_generated.decision;
  const cases = asStringArray(parsed.cases).length ? asStringArray(parsed.cases) : base.cases;
  const confidence = clamp(Number(parsed.confidence ?? base.confidence));

  return {
    ...base,
    provider: "gemini",
    model,
    duration_ms: Date.now() - startedAt,
    success: true,
    error_message: null,
    usage_json: json.usageMetadata ?? {},
    summary: text(parsed.summary) || base.summary,
    transcript: text(parsed.transcript) || base.transcript,
    transcript_source: context.description ? "manual_notes_plus_gemini" : "drive_reference_plus_gemini",
    transcript_status: context.description ? "partial" : "missing",
    topics: asStringArray(parsed.topics).length ? asStringArray(parsed.topics) : base.topics,
    pain_points: painHuman.map((item) => `${text(item.technical)} | Como aparece: ${text(item.audience_language)}`).filter(Boolean),
    objections: objectionsHuman.map((item) => `${text(item.type)}: ${text(item.objection)} | Como aparece: ${text(item.how_it_appears)}`).filter(Boolean),
    cases,
    quotes: strongQuotes.map((item) => `"${text(item.quote)}" (${text(item.timestamp) || "sem timestamp"})`).filter((item) => item.length > 20),
    cta: ctaSuggestions.map((item) => `${text(item.intent)}: ${text(item.cta)}`).filter(Boolean),
    products_detected: relatedProducts,
    related_missions: asStringArray(parsed.related_missions).length ? asStringArray(parsed.related_missions) : base.related_missions,
    tags: asStringArray(parsed.tags).length ? asStringArray(parsed.tags) : base.tags,
    knowledge_generated: {
      ...base.knowledge_generated,
      source: "Content Capture",
      decision,
      strong_quotes: strongQuotes,
      suggested_headlines: suggested,
      pain_points_human: painHuman,
      objections_human: objectionsHuman,
      cta_suggestions: ctaSuggestions,
      related_products: relatedProducts,
      related_objectives: asObjectArray(parsed.related_objectives),
      sales_level: decision?.commercial_level ?? base.knowledge_generated.sales_level,
      confianca: confidence,
    },
    metadata: {
      ...base.metadata,
      response_provider: "gemini",
    },
    processing_metadata: {
      ...base.processing_metadata,
      provider: "gemini",
      usage: json.usageMetadata ?? {},
    },
    primary_product_id: String(relatedProducts[0]?.product_id ?? context.selectedProductId ?? "") || null,
    confidence,
  };
}

export async function runContentCapture(context: ContentCaptureContext): Promise<ContentCaptureResult> {
  const startedAt = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const base = deterministicResult(context, startedAt);

  if (!apiKey) {
    return {
      ...base,
      error_message: "GEMINI_API_KEY nao configurada. Resultado gerado por checklist deterministico.",
    };
  }

  try {
    const model = await resolveGeminiModel(apiKey, process.env.GEMINI_MODEL);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(context, base) }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return deterministicResult(context, startedAt, `Gemini falhou: ${errorText.slice(0, 500)}`);
    }

    const json = await response.json();
    const parsed = parseGeminiJson(extractGeminiText(json));
    return mergeGeminiResult(context, base, parsed, model, json, startedAt);
  } catch (error) {
    return deterministicResult(context, startedAt, error instanceof Error ? error.message : "Falha inesperada no Content Capture.");
  }
}
