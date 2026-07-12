type QASeverity = "info" | "warning" | "critical";
type QAItemStatus = "passed" | "failed" | "not_applicable";
type QAReviewStatus = "approved" | "approved_with_warnings" | "changes_required" | "blocked" | "failed";

export type MarketingQAContext = {
  campaign: Record<string, any>;
  material: Record<string, any>;
  version: Record<string, any>;
  product: Record<string, any> | null;
  relatedMaterials: Array<Record<string, any>>;
};

export type MarketingQAItem = {
  category: string;
  severity: QASeverity;
  status: QAItemStatus;
  title: string;
  description?: string;
  evidence?: string;
  suggested_fix?: string;
  field_reference?: string;
};

export type MarketingQAResult = {
  provider: string;
  model: string | null;
  status: QAReviewStatus;
  overall_score: number | null;
  summary: string;
  blocking_reasons: string[];
  warnings: string[];
  suggested_content: string | null;
  items: MarketingQAItem[];
  duration_ms: number;
  success: boolean;
  error_message: string | null;
  usage_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

const MAX_MATERIAL_CHARS = 24000;
const WARNING_MATERIAL_CHARS = 7000;

const preferredGeminiModels = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeGeminiModelName(model: string) {
  const trimmed = model.trim();
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

function safeJsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function campaignPlan(context: MarketingQAContext) {
  return (context.campaign?.plan_json && typeof context.campaign.plan_json === "object" ? context.campaign.plan_json : {}) as Record<string, unknown>;
}

function productLabel(context: MarketingQAContext) {
  return text(context.product?.nome_oficial) || text(context.product?.produto_base) || text(context.campaign?.product_name);
}

function hasAny(content: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(content));
}

function makeItem(item: MarketingQAItem): MarketingQAItem {
  return {
    category: item.category,
    severity: item.severity,
    status: item.status,
    title: item.title,
    description: item.description ?? "",
    evidence: item.evidence ?? "",
    suggested_fix: item.suggested_fix ?? "",
    field_reference: item.field_reference ?? "",
  };
}

export function buildDeterministicQAItems(context: MarketingQAContext): MarketingQAItem[] {
  const content = text(context.version?.content);
  const plan = campaignPlan(context);
  const channel = `${text(context.material?.channel)} ${text(context.material?.material_type)}`.toLowerCase();
  const product = productLabel(context);
  const oferta = text(plan.oferta);
  const startsAt = text(context.campaign?.starts_at);
  const endsAt = text(context.campaign?.ends_at);
  const items: MarketingQAItem[] = [];

  if (!content) {
    items.push(makeItem({
      category: "conteudo",
      severity: "critical",
      status: "failed",
      title: "Material vazio",
      description: "A versao selecionada nao possui conteudo para revisao.",
      suggested_fix: "Preencher o texto do material antes de aprovar ou executar.",
      field_reference: "campaign_material_versions.content",
    }));
  }

  if (content.length > MAX_MATERIAL_CHARS) {
    items.push(makeItem({
      category: "conteudo",
      severity: "critical",
      status: "failed",
      title: "Material acima do limite de revisao",
      description: `O conteudo possui ${content.length} caracteres. O limite operacional desta beta e ${MAX_MATERIAL_CHARS}.`,
      suggested_fix: "Dividir o material em versoes menores ou revisar apenas o trecho operacional.",
      field_reference: "campaign_material_versions.content",
    }));
  } else if (content.length > WARNING_MATERIAL_CHARS) {
    items.push(makeItem({
      category: "conteudo",
      severity: "warning",
      status: "failed",
      title: "Material longo",
      description: "Materiais muito longos aumentam o risco de repeticao, perda de clareza e mensagens truncadas no canal.",
      evidence: `${content.length} caracteres`,
      suggested_fix: "Considerar quebrar em partes ou criar uma versao resumida para o canal final.",
    }));
  }

  if (hasAny(content, [/Ã.|Â.|�/])) {
    items.push(makeItem({
      category: "portugues",
      severity: "critical",
      status: "failed",
      title: "Caracteres ou acentos quebrados",
      description: "O texto contem sinais de encoding quebrado.",
      evidence: content.match(/.{0,12}(Ã.|Â.|�).{0,12}/)?.[0] ?? "",
      suggested_fix: "Corrigir acentos antes de enviar o material.",
    }));
  }

  if (/(.)\1{7,}/.test(content.replace(/\s/g, ""))) {
    items.push(makeItem({
      category: "portugues",
      severity: "warning",
      status: "failed",
      title: "Possivel texto truncado ou repetido",
      description: "Foi detectada repeticao incomum de caracteres.",
      suggested_fix: "Revisar o trecho e remover caracteres duplicados.",
    }));
  }

  if (!hasAny(content, [/\b(clique|acesse|responda|mande|envie|garanta|entre|participe|confirme|comente|salve|chame|inscreva)\b/i])) {
    items.push(makeItem({
      category: "cta",
      severity: "warning",
      status: "failed",
      title: "CTA pouco claro ou ausente",
      description: "Nao foi encontrado um chamado de acao objetivo no material.",
      suggested_fix: "Adicionar um proximo passo claro e coerente com o canal.",
    }));
  }

  if (hasAny(content, [/\{\{.*?\}\}/, /\[link\]/i, /cole aqui/i, /placeholder/i, /seu-link/i])) {
    items.push(makeItem({
      category: "links",
      severity: "critical",
      status: "failed",
      title: "Placeholder de link ou campo dinamico",
      description: "O material contem marcador que pode chegar ao publico sem substituicao.",
      evidence: content.match(/(\{\{.*?\}\}|\[link\]|cole aqui|placeholder|seu-link)/i)?.[0] ?? "",
      suggested_fix: "Substituir o placeholder pelo link final correto antes da aprovacao.",
    }));
  }

  if (/(http|www\.)/i.test(content) && !/https?:\/\/[^\s]+/i.test(content)) {
    items.push(makeItem({
      category: "links",
      severity: "warning",
      status: "failed",
      title: "Link possivelmente incompleto",
      description: "Ha indicio de link, mas o formato nao parece uma URL completa.",
      suggested_fix: "Validar o link final do material.",
    }));
  }

  if (!product) {
    items.push(makeItem({
      category: "produto_oferta",
      severity: "critical",
      status: "failed",
      title: "Produto nao vinculado",
      description: "A campanha nao possui produto vinculado para comparar nome, oferta e condicoes.",
      suggested_fix: "Vincular o produto correto na campanha antes da aprovacao final.",
      field_reference: "campaigns.product_id",
    }));
  }

  if (!oferta && /(preco|valor|parcela|boleto|pix|cartao|inscricao|compra|oferta)/i.test(content)) {
    items.push(makeItem({
      category: "produto_oferta",
      severity: "warning",
      status: "failed",
      title: "Oferta nao estruturada na campanha",
      description: "O material fala de oferta/preco, mas o plano da campanha nao possui oferta cadastrada para confronto.",
      suggested_fix: "Preencher a oferta no plano da campanha ou revisar manualmente preco, parcela, garantia e duracao.",
      field_reference: "campaigns.plan_json.oferta",
    }));
  }

  if (!startsAt || !endsAt) {
    items.push(makeItem({
      category: "coerencia_campanha",
      severity: "warning",
      status: "failed",
      title: "Periodo da campanha incompleto",
      description: "A campanha nao possui inicio e fim completos, o que dificulta validar datas e urgencia.",
      suggested_fix: "Cadastrar o periodo da campanha antes de aprovar pecas com prazo ou urgencia.",
      field_reference: "campaigns.starts_at/ends_at",
    }));
  }

  const ctaMatches = content.match(/\b(clique|acesse|responda|mande|envie|garanta|entre|participe|confirme|comente|inscreva)\b/gi) ?? [];
  if (ctaMatches.length >= 5) {
    items.push(makeItem({
      category: "cta",
      severity: "warning",
      status: "failed",
      title: "Muitos chamados de acao",
      description: "O material pode estar competindo consigo mesmo por ter chamadas demais.",
      evidence: `${ctaMatches.length} ocorrencias`,
      suggested_fix: "Manter uma chamada principal e, se necessario, uma secundaria.",
    }));
  }

  if (hasAny(content, [/cura garantida/i, /resultado garantido/i, /sem risco/i, /100% garantido/i, /milagre/i])) {
    items.push(makeItem({
      category: "promessas",
      severity: "critical",
      status: "failed",
      title: "Promessa sensivel ou nao sustentada",
      description: "O material contem promessa que exige evidencia formal e revisao humana.",
      evidence: content.match(/(cura garantida|resultado garantido|sem risco|100% garantido|milagre)/i)?.[0] ?? "",
      suggested_fix: "Trocar por linguagem sustentada por experiencia, metodo ou objetivo educacional.",
    }));
  }

  if (/whatsapp|direct|grupo|mensagem/i.test(channel)) {
    if (content.length > 1500) {
      items.push(makeItem({
        category: "comunicacao_spam",
        severity: "warning",
        status: "failed",
        title: "Mensagem longa para canal 1x1/grupo",
        description: "Mensagens longas em WhatsApp/Direct tendem a reduzir leitura e aumentar risco de rejeicao.",
        suggested_fix: "Criar uma versao curta com uma intencao principal.",
      }));
    }
    if (hasAny(content, [/ultima chance/gi, /so hoje/gi, /agora ou nunca/gi, /nao perca/gi]) && (content.match(/!/g) ?? []).length > 2) {
      items.push(makeItem({
        category: "comunicacao_spam",
        severity: "critical",
        status: "failed",
        title: "Pressao excessiva no canal",
        description: "Urgencia repetida com muitos sinais de exclamacao pode soar invasiva.",
        suggested_fix: "Reduzir urgencia e explicar o motivo do contato com clareza.",
      }));
    }
  }

  if (!items.length) {
    items.push(makeItem({
      category: "checklist",
      severity: "info",
      status: "passed",
      title: "Checklist deterministico sem bloqueios",
      description: "Nenhum bloqueio objetivo foi identificado pelas regras locais.",
    }));
  }

  return items;
}

function deriveStatus(items: MarketingQAItem[], aiStatus?: string): QAReviewStatus {
  if (items.some((item) => item.severity === "critical" && item.status === "failed")) return "blocked";
  if (aiStatus && ["approved", "approved_with_warnings", "changes_required", "blocked"].includes(aiStatus)) {
    return aiStatus as QAReviewStatus;
  }
  if (items.some((item) => item.severity === "warning" && item.status === "failed")) return "changes_required";
  return "approved";
}

function scoreFromItems(items: MarketingQAItem[]) {
  const failedCritical = items.filter((item) => item.severity === "critical" && item.status === "failed").length;
  const failedWarning = items.filter((item) => item.severity === "warning" && item.status === "failed").length;
  return Math.max(0, Math.min(100, 100 - failedCritical * 28 - failedWarning * 10));
}

function normalizeAIItems(items: unknown): MarketingQAItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 30).map((item: any) => makeItem({
    category: text(item.category) || "ia",
    severity: ["info", "warning", "critical"].includes(item.severity) ? item.severity : "warning",
    status: ["passed", "failed", "not_applicable"].includes(item.status) ? item.status : "failed",
    title: text(item.title) || "Alerta da revisao IA",
    description: text(item.description),
    evidence: text(item.evidence),
    suggested_fix: text(item.suggested_fix),
    field_reference: text(item.field_reference),
  }));
}

function extractGeminiText(response: any) {
  return text(response?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join("\n"));
}

async function resolveGeminiModel(apiKey: string, requestedModel: string | undefined) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  if (!response.ok) throw new Error(`Falha ao validar modelos Gemini: HTTP ${response.status}`);
  const json = await response.json();
  const models = Array.isArray(json.models) ? json.models : [];
  const available = models
    .filter((model: any) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes("generateContent"))
    .map((model: any) => String(model.name ?? ""));

  if (requestedModel) {
    const normalized = normalizeGeminiModelName(requestedModel);
    if (!available.includes(normalized)) throw new Error(`Modelo Gemini indisponivel nesta conta: ${requestedModel}`);
    return normalized;
  }

  const selected = preferredGeminiModels.map(normalizeGeminiModelName).find((model) => available.includes(model));
  if (!selected) throw new Error("Nenhum modelo Gemini compativel com generateContent foi encontrado nesta conta.");
  return selected;
}

function buildPrompt(context: MarketingQAContext, deterministicItems: MarketingQAItem[]) {
  const plan = campaignPlan(context);
  return [
    "Voce e o Marketing QA operacional da Norwyn. Revise o material de campanha abaixo.",
    "Retorne apenas JSON valido, sem markdown.",
    "Nao aprove, publique ou execute nada. Apenas revise.",
    "Categorias obrigatorias: portugues, tom_voz, produto_oferta, cta, links, coerencia_campanha, promessas, comunicacao_spam.",
    "Use severidade critical apenas para risco real de erro, divergencia comercial, link/oferta critica, promessa sensivel ou spam elevado.",
    "",
    `Campanha: ${text(context.campaign.name)}`,
    `Objetivo: ${text(plan.objetivo ?? context.campaign.objective_id)}`,
    `Missao: ${text(context.campaign.mission_external_key)}`,
    `Produto: ${productLabel(context) || "nao vinculado"}`,
    `Oferta oficial cadastrada: ${text(plan.oferta) || "nao cadastrada"}`,
    `Publico: ${text(plan.publico) || "nao cadastrado"}`,
    `Canal: ${text(context.material.channel) || text(context.material.material_type)}`,
    `Periodo: ${text(context.campaign.starts_at) || "-"} a ${text(context.campaign.ends_at) || "-"}`,
    `Checklist local ja encontrou: ${deterministicItems.filter((item) => item.status === "failed").map((item) => `${item.severity}:${item.title}`).join(" | ") || "sem falhas objetivas"}`,
    "",
    "Formato JSON:",
    '{"status":"changes_required","overall_score":72,"summary":"...","items":[{"category":"portugues","severity":"warning","status":"failed","title":"...","description":"...","evidence":"...","suggested_fix":"..."}],"blocking_reasons":[],"warnings":[],"suggested_content":"..."}',
    "",
    "Material:",
    text(context.version.content).slice(0, MAX_MATERIAL_CHARS),
  ].join("\n");
}

async function runGeminiReview(context: MarketingQAContext, deterministicItems: MarketingQAItem[], apiKey: string, modelEnv?: string) {
  const model = await resolveGeminiModel(apiKey, modelEnv);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(context, deterministicItems) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(text(json?.error?.message) || `Falha Gemini HTTP ${response.status}`);
  const rawText = extractGeminiText(json);
  const parsed = JSON.parse(rawText);
  return {
    model,
    status: text(parsed.status),
    overall_score: Number.isFinite(Number(parsed.overall_score)) ? Number(parsed.overall_score) : null,
    summary: text(parsed.summary),
    items: normalizeAIItems(parsed.items),
    blocking_reasons: safeJsonArray(parsed.blocking_reasons),
    warnings: safeJsonArray(parsed.warnings),
    suggested_content: text(parsed.suggested_content) || null,
    usage_json: json.usageMetadata && typeof json.usageMetadata === "object" ? json.usageMetadata : {},
  };
}

export async function runMarketingQA(context: MarketingQAContext): Promise<MarketingQAResult> {
  const started = Date.now();
  const content = text(context.version?.content);
  const deterministicItems = buildDeterministicQAItems(context);
  const apiKey = process.env.GEMINI_API_KEY;
  const modelEnv = process.env.GEMINI_MODEL;

  if (content.length > MAX_MATERIAL_CHARS) {
    const status = deriveStatus(deterministicItems);
    return {
      provider: "deterministic",
      model: null,
      status,
      overall_score: scoreFromItems(deterministicItems),
      summary: "Revisao interrompida: o material excede o limite operacional da beta.",
      blocking_reasons: deterministicItems.filter((item) => item.severity === "critical" && item.status === "failed").map((item) => item.title),
      warnings: deterministicItems.filter((item) => item.severity === "warning" && item.status === "failed").map((item) => item.title),
      suggested_content: null,
      items: deterministicItems,
      duration_ms: Date.now() - started,
      success: false,
      error_message: "material_size_limit",
      usage_json: {},
      metadata: { ai_configured: Boolean(apiKey), max_material_chars: MAX_MATERIAL_CHARS },
    };
  }

  if (!apiKey) {
    const status = deriveStatus(deterministicItems);
    return {
      provider: "deterministic",
      model: null,
      status,
      overall_score: scoreFromItems(deterministicItems),
      summary: status === "approved"
        ? "Checklist deterministico concluido. Revisao de IA nao configurada neste ambiente."
        : "Checklist deterministico encontrou pontos que exigem revisao humana. Revisao de IA nao configurada neste ambiente.",
      blocking_reasons: deterministicItems.filter((item) => item.severity === "critical" && item.status === "failed").map((item) => item.title),
      warnings: deterministicItems.filter((item) => item.severity === "warning" && item.status === "failed").map((item) => item.title),
      suggested_content: content.replace(/[ \t]+$/gm, "").trim(),
      items: deterministicItems,
      duration_ms: Date.now() - started,
      success: true,
      error_message: null,
      usage_json: {},
      metadata: { ai_configured: false, max_material_chars: MAX_MATERIAL_CHARS },
    };
  }

  try {
    const ai = await runGeminiReview(context, deterministicItems, apiKey, modelEnv);
    const items = [...deterministicItems, ...ai.items];
    const status = deriveStatus(items, ai.status);
    return {
      provider: "gemini",
      model: ai.model,
      status,
      overall_score: ai.overall_score ?? scoreFromItems(items),
      summary: ai.summary || "Revisao Marketing QA concluida.",
      blocking_reasons: [...new Set([...deterministicItems.filter((item) => item.severity === "critical" && item.status === "failed").map((item) => item.title), ...ai.blocking_reasons])],
      warnings: [...new Set([...deterministicItems.filter((item) => item.severity === "warning" && item.status === "failed").map((item) => item.title), ...ai.warnings])],
      suggested_content: ai.suggested_content ?? content.replace(/[ \t]+$/gm, "").trim(),
      items,
      duration_ms: Date.now() - started,
      success: true,
      error_message: null,
      usage_json: ai.usage_json,
      metadata: { ai_configured: true, model_env_configured: Boolean(modelEnv), max_material_chars: MAX_MATERIAL_CHARS },
    };
  } catch (error) {
    const status = deriveStatus(deterministicItems);
    return {
      provider: "gemini",
      model: modelEnv ? normalizeGeminiModelName(modelEnv) : null,
      status: status === "approved" ? "failed" : status,
      overall_score: scoreFromItems(deterministicItems),
      summary: "Checklist deterministico executado, mas a revisao Gemini falhou.",
      blocking_reasons: deterministicItems.filter((item) => item.severity === "critical" && item.status === "failed").map((item) => item.title),
      warnings: deterministicItems.filter((item) => item.severity === "warning" && item.status === "failed").map((item) => item.title),
      suggested_content: null,
      items: deterministicItems,
      duration_ms: Date.now() - started,
      success: false,
      error_message: error instanceof Error ? error.message : "Falha desconhecida ao chamar Gemini.",
      usage_json: {},
      metadata: { ai_configured: true, model_env_configured: Boolean(modelEnv), max_material_chars: MAX_MATERIAL_CHARS },
    };
  }
}
