import { NextResponse } from "next/server";
import { getValidationAuth } from "@/modules/validacao/services/validation-server";
import { assertExpectedSupabaseWriteTarget } from "@/lib/supabase/environment-guard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
const MAX_BULK = 100;
const allowedReuseActions = new Set(["reel", "carrossel", "stories", "atualizar_hook", "atualizar_legenda", "campanha_atual"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function metric(snapshot: unknown, key: string) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  const value = Number((snapshot as Record<string, unknown>)[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function optionalMetric(snapshot: unknown, key: string) {
  if (!snapshot || typeof snapshot !== "object" || !(key in snapshot)) return null;
  const raw = (snapshot as Record<string, unknown>)[key];
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function classificationFromDecision(decision: any) {
  const value = decision?.new_value && typeof decision.new_value === "object" ? decision.new_value : {};
  return {
    tags: list(value.tags),
    reuseStatus: text(value.reuse_status),
    reuseAction: text(value.reuse_action),
  };
}

function decisionsByContent(decisions: any[]) {
  const merged = new Map<string, { new_value: Record<string, unknown> }>();
  for (const decision of decisions) {
    const entityId = text(decision.entity_id);
    if (!entityId) continue;
    const current = merged.get(entityId)?.new_value ?? {};
    const next = decision?.new_value && typeof decision.new_value === "object" ? decision.new_value as Record<string, unknown> : {};
    merged.set(entityId, {
      new_value: {
        ...next,
        ...current,
        tags: list(current.tags).length ? current.tags : list(next.tags),
        reuse_status: text(current.reuse_status) || text(next.reuse_status),
        reuse_action: text(current.reuse_action) || text(next.reuse_action),
      },
    });
  }
  return merged;
}

function searchable(row: any) {
  return normalize([
    row.title,
    row.caption,
    row.cta,
    row.campaign_id,
    row.campaign_name,
    row.objective,
    row.funnel_stage,
    row.subtype,
    ...list(row.product_tags),
    ...list(row.theme_tags),
    ...list(row.decision_tags),
    JSON.stringify(row.metadata ?? {}),
  ].join(" "));
}

function unique(values: unknown[]) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : [value]).map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function applyFilters(query: any, params: URLSearchParams) {
  const product = text(params.get("product"));
  const theme = text(params.get("theme"));
  const campaign = text(params.get("campaign"));
  const objective = text(params.get("objective"));
  const format = text(params.get("format"));
  const funnel = text(params.get("funnel"));
  const period = text(params.get("period"));
  if (product) query = query.contains("product_tags", [product]);
  if (theme) query = query.contains("theme_tags", [theme]);
  if (campaign) query = query.eq("campaign_id", campaign);
  if (objective) query = query.eq("objective", objective);
  if (format) query = query.eq("subtype", format);
  if (funnel) query = query.eq("funnel_stage", funnel);
  if (period && /^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [from, to] = period.split(":");
    query = query.gte("published_at", `${from}T00:00:00-03:00`).lte("published_at", `${to}T23:59:59-03:00`);
  }
  return query;
}

function filterRows(rows: any[], params: URLSearchParams, search: string) {
  const product = text(params.get("product"));
  const theme = text(params.get("theme"));
  const campaign = text(params.get("campaign"));
  const objective = text(params.get("objective"));
  const format = text(params.get("format"));
  const funnel = text(params.get("funnel"));
  const period = text(params.get("period"));
  const [from, to] = /^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(period) ? period.split(":") : ["", ""];
  return rows.filter((row) => {
    const published = text(row.published_at).slice(0, 10);
    return (!search || searchable(row).includes(search))
      && (!product || list(row.product_tags).includes(product))
      && (!theme || list(row.theme_tags).includes(theme))
      && (!campaign || text(row.campaign_id) === campaign)
      && (!objective || text(row.objective) === objective)
      && (!format || text(row.subtype) === format)
      && (!funnel || text(row.funnel_stage) === funnel)
      && (!from || published >= from)
      && (!to || published <= to);
  });
}

function campaignSummary(rows: any[]) {
  if (!rows.length) return { total: 0, bestReach: null, mostSaved: null, mostShared: null, bestEngagement: null, bestFormat: null, bestTiming: null, sampleSufficient: false };
  const best = (key: string) => rows
    .filter((row) => optionalMetric(row.performance_snapshot, key) != null)
    .toSorted((a, b) => (optionalMetric(b.performance_snapshot, key) ?? 0) - (optionalMetric(a.performance_snapshot, key) ?? 0))[0] ?? null;
  const formatGroups = new Map<string, number[]>();
  const timingGroups = new Map<string, number[]>();
  for (const row of rows) {
    const engagement = optionalMetric(row.performance_snapshot, "engajamento_score");
    if (engagement == null) continue;
    const format = text(row.subtype);
    if (format) formatGroups.set(format, [...(formatGroups.get(format) ?? []), engagement]);
    if (row.published_at) {
      const instant = new Date(row.published_at);
      const day = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(instant);
      const hour = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(instant);
      const timing = `${day}, ${hour}h`;
      timingGroups.set(timing, [...(timingGroups.get(timing) ?? []), engagement]);
    }
  }
  const bestGroup = (groups: Map<string, number[]>, minimum: number) => [...groups]
    .filter(([, values]) => values.length >= minimum)
    .map(([label, values]) => ({ label, averageEngagement: values.reduce((sum, value) => sum + value, 0) / values.length, sample: values.length }))
    .toSorted((a, b) => b.averageEngagement - a.averageEngagement)[0] ?? null;
  const summarize = (row: any, key: string) => row ? { id: row.id, title: row.title || row.caption || "Conteúdo sem título", value: optionalMetric(row.performance_snapshot, key) } : null;
  const sampleSufficient = rows.length >= 5;
  return {
    total: rows.length,
    bestReach: summarize(best("alcance"), "alcance"),
    mostSaved: summarize(best("salvos"), "salvos"),
    mostShared: summarize(best("compartilhamentos"), "compartilhamentos"),
    bestEngagement: summarize(best("engajamento_score"), "engajamento_score"),
    bestFormat: sampleSufficient ? bestGroup(formatGroups, 2) : null,
    bestTiming: rows.length >= 7 ? bestGroup(timingGroups, 2) : null,
    sampleSufficient,
  };
}

function mergeRow(row: any, campaigns: Map<string, string>, decision: any) {
  const snapshot = row.performance_snapshot ?? {};
  const likes = metric(snapshot, "likes");
  const comments = metric(snapshot, "comentarios");
  const saves = metric(snapshot, "salvos");
  const shares = metric(snapshot, "compartilhamentos");
  return {
    ...row,
    campaign_name: campaigns.get(String(row.campaign_id ?? "")) ?? row.campaign_id ?? null,
    metrics: {
      reach: optionalMetric(snapshot, "alcance"),
      interactions: ["likes", "comentarios", "salvos", "compartilhamentos"].some((key) => optionalMetric(snapshot, key) != null) ? likes + comments + saves + shares : null,
      likes: optionalMetric(snapshot, "likes"),
      saves: optionalMetric(snapshot, "salvos"),
      shares: optionalMetric(snapshot, "compartilhamentos"),
      comments: optionalMetric(snapshot, "comentarios"),
      engagement: optionalMetric(snapshot, "engajamento_score"),
    },
    permalink: text(snapshot.permalink) || text(row.metadata?.permalink),
    thumbnail: text(row.metadata?.thumbnail_url) || text(row.metadata?.media_url) || null,
    classification: classificationFromDecision(decision),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getValidationAuth();
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const sort = text(params.get("sort")) || "recent";
    const search = normalize(params.get("q"));
    const select = "id, source, source_id, event_type, subtype, title, caption, published_at, campaign_id, product_tags, theme_tags, objective, funnel_stage, cta, performance_snapshot, metadata, updated_at";

    const [facetResult, campaignResult, classificationResult] = await Promise.all([
      auth.dataClient.from("norwyn_content_events").select("id, title, caption, subtype, campaign_id, product_tags, theme_tags, objective, funnel_stage, cta, performance_snapshot, metadata, published_at").eq("tenant_id", auth.tenantId).limit(5000),
      auth.dataClient.from("campaigns").select("id, name").eq("tenant_id", auth.tenantId).order("name", { ascending: true }).limit(500),
      auth.dataClient.from("norwyn_validation_decisions").select("entity_id, new_value, decided_at").eq("tenant_id", auth.tenantId).eq("validation_type", "CONTENT").eq("status", "active").order("decided_at", { ascending: false }).limit(5000),
    ]);
    if (facetResult.error) throw new Error(facetResult.error.message);
    const campaignNames = new Map<string, string>((campaignResult.data ?? []).map((item: any) => [String(item.id), String(item.name)]));
    const contentDecisions = decisionsByContent(classificationResult.data ?? []);
    const facetRows = (facetResult.data ?? []).map((row: any) => ({ ...row, campaign_name: campaignNames.get(String(row.campaign_id ?? "")), decision_tags: classificationFromDecision(contentDecisions.get(row.id)).tags }));
    const filteredFacetRows = filterRows(facetRows, params, search);
    const matchingIds = search ? facetRows.filter((row: any) => searchable(row).includes(search)).map((row: any) => row.id) : null;

    let rows: any[] = [];
    let count = 0;
    if (!matchingIds || matchingIds.length) {
      let query = auth.dataClient.from("norwyn_content_events").select(select, { count: "exact" }).eq("tenant_id", auth.tenantId);
      query = applyFilters(query, params);
      if (matchingIds) query = query.in("id", matchingIds);
      const sortMap: Record<string, string> = {
        reach: "performance_snapshot->alcance",
        engagement: "performance_snapshot->engajamento_score",
        saves: "performance_snapshot->salvos",
        shares: "performance_snapshot->compartilhamentos",
        comments: "performance_snapshot->comentarios",
        recent: "published_at",
      };
      query = query.order(sortMap[sort] ?? "published_at", { ascending: false, nullsFirst: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      const result = await query;
      if (result.error) throw new Error(result.error.message);
      rows = result.data ?? [];
      count = result.count ?? 0;
    }

    const topRows = [...filteredFacetRows]
      .map((row: any) => ({ ...row, performance_snapshot: row.performance_snapshot ?? {} }))
      .filter((row: any) => metric(row.performance_snapshot, "salvos") || metric(row.performance_snapshot, "compartilhamentos"))
      .sort((a: any, b: any) => metric(b.performance_snapshot, "salvos") - metric(a.performance_snapshot, "salvos") || metric(b.performance_snapshot, "compartilhamentos") - metric(a.performance_snapshot, "compartilhamentos"))
      .slice(0, 3);

    return NextResponse.json({
      items: rows.map((row) => mergeRow(row, campaignNames, contentDecisions.get(row.id))),
      page,
      pageSize: PAGE_SIZE,
      total: count,
      pages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
      highlights: topRows.map((row) => mergeRow(row, campaignNames, contentDecisions.get(row.id))),
      highlightRule: "Ordenado por salvamentos; desempate por compartilhamentos. Não usa score oculto.",
      campaignSummary: text(params.get("campaign")) ? campaignSummary(filteredFacetRows) : null,
      facets: {
        products: unique(facetRows.map((row: any) => row.product_tags)),
        themes: unique(facetRows.map((row: any) => row.theme_tags)),
        campaigns: (campaignResult.data ?? []).map((item: any) => ({ value: item.id, label: item.name })),
        objectives: unique(facetRows.map((row: any) => row.objective)),
        formats: unique(facetRows.map((row: any) => row.subtype)),
        funnels: unique(facetRows.map((row: any) => row.funnel_stage)),
      },
      canWrite: auth.canWrite,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar o acervo." }, { status: 500 });
  }
}

function safeClassification(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    product: text(input.product),
    theme: text(input.theme),
    campaign: text(input.campaign),
    objective: text(input.objective),
    funnel: text(input.funnel),
    format: text(input.format),
    reuse_status: text(input.reuse_status),
    tags: list(input.tags).slice(0, 20),
  };
}

async function suggestWithGemini(rows: any[], campaigns: Array<{ id: string; name: string }>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Sugestões por IA não estão configuradas neste ambiente.");
  const model = (process.env.NORWYN_AI_SIMPLE_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash").replace(/^models\//, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const prompt = `Classifique os conteúdos abaixo sem inventar contexto. Retorne SOMENTE JSON com product, theme, campaign, objective, funnel, format, tags (array) e confidence (0 a 1). campaign deve ser um ID da lista de campanhas ou vazio. Se não houver evidência, use string vazia. Campanhas: ${JSON.stringify(campaigns)}. Conteúdos: ${JSON.stringify(rows.map((row) => ({ title: row.title, caption: row.caption, subtype: row.subtype, product_tags: row.product_tags, theme_tags: row.theme_tags, objective: row.objective, funnel_stage: row.funnel_stage })).slice(0, 10))}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.1 } }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`IA indisponível (HTTP ${response.status}).`);
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(String(raw ?? "{}").replace(/^```json\s*|\s*```$/g, ""));
    const classification = safeClassification(parsed);
    if (classification.campaign && !campaigns.some((campaign) => campaign.id === classification.campaign)) classification.campaign = "";
    return { ...classification, confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))), provider: "gemini", model };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getValidationAuth();
    if (!auth.canWrite) return NextResponse.json({ error: "Seu perfil não pode classificar conteúdos." }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const action = text(body.action);
    if (action !== "suggest" && action !== "similar") {
      assertExpectedSupabaseWriteTarget(`content_library.${action || "classify"}`);
    }
    const ids = [...new Set(list(body.ids))].slice(0, MAX_BULK);
    if (!ids.length) return NextResponse.json({ error: "Selecione ao menos um conteúdo." }, { status: 400 });

    const current = await auth.dataClient.from("norwyn_content_events").select("id, title, caption, subtype, product_tags, theme_tags, campaign_id, objective, funnel_stage, metadata").eq("tenant_id", auth.tenantId).in("id", ids);
    if (current.error) throw new Error(current.error.message);
    if (action === "suggest") {
      const campaignResult = await auth.dataClient.from("campaigns").select("id, name").eq("tenant_id", auth.tenantId).limit(500);
      if (campaignResult.error) throw new Error(campaignResult.error.message);
      return NextResponse.json({ suggestion: await suggestWithGemini(current.data ?? [], campaignResult.data ?? []) });
    }

    if (action === "similar") {
      const selectedTerms = new Set<string>((current.data ?? []).flatMap((row: any) => [...list(row.product_tags), ...list(row.theme_tags), row.campaign_id, row.objective].map(normalize).filter((value: string) => value.length >= 4)));
      const candidates = await auth.dataClient.from("norwyn_content_events").select("id, title, caption, product_tags, theme_tags, campaign_id, objective, published_at").eq("tenant_id", auth.tenantId).not("id", "in", `(${ids.join(",")})`).order("published_at", { ascending: false }).limit(500);
      if (candidates.error) throw new Error(candidates.error.message);
      const similar = (candidates.data ?? []).filter((row: any) => [...selectedTerms].some((term) => searchable(row).includes(term))).slice(0, 30);
      return NextResponse.json({ similar, criteria: [...selectedTerms] });
    }

    if (action === "reuse") {
      const reuseAction = text(body.reuse_action);
      if (!allowedReuseActions.has(reuseAction)) return NextResponse.json({ error: "Opção de reaproveitamento inválida." }, { status: 400 });
      const decisions = ids.map((id) => ({ tenant_id: auth.tenantId, validation_type: "CONTENT", entity_type: "content", entity_id: id, decision_type: "CONTENT_REUSE_PLANNED", new_value: { reuse_action: reuseAction, reuse_status: "planejado" }, learn_scope: "single_case", decided_by: auth.userId, decided_role: auth.role, source: "content_library", metadata: { generated_content: false } }));
      const inserted = await auth.dataClient.from("norwyn_validation_decisions").insert(decisions);
      if (inserted.error) throw new Error(inserted.error.message);
      return NextResponse.json({ ok: true, updated: ids.length });
    }

    const classification = safeClassification(body.classification);
    const update: Record<string, unknown> = {};
    if ("product" in (body.classification ?? {})) update.product_tags = classification.product ? [classification.product] : [];
    if ("theme" in (body.classification ?? {})) update.theme_tags = classification.theme ? [classification.theme] : [];
    if ("campaign" in (body.classification ?? {})) update.campaign_id = classification.campaign || null;
    if ("objective" in (body.classification ?? {})) update.objective = classification.objective || null;
    if ("funnel" in (body.classification ?? {})) update.funnel_stage = classification.funnel || null;
    if ("format" in (body.classification ?? {})) update.subtype = classification.format || null;
    if (Object.keys(update).length) {
      const result = await auth.dataClient.from("norwyn_content_events").update(update).eq("tenant_id", auth.tenantId).in("id", ids);
      if (result.error) throw new Error(result.error.message);
    }
    const previousById = new Map((current.data ?? []).map((row: any) => [row.id, row]));
    const decisions = ids.map((id) => ({ tenant_id: auth.tenantId, validation_type: "CONTENT", entity_type: "content", entity_id: id, decision_type: "CONTENT_CLASSIFIED", previous_value: previousById.get(id) ?? null, new_value: classification, learn_scope: "single_case", decided_by: auth.userId, decided_role: auth.role, source: "content_library", metadata: { bulk: ids.length > 1, ai_suggestion_confirmed: Boolean(body.ai_suggestion_confirmed), similar_confirmed: Boolean(body.similar_confirmed) } }));
    const inserted = await auth.dataClient.from("norwyn_validation_decisions").insert(decisions);
    if (inserted.error) throw new Error(inserted.error.message);
    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "A sugestão por IA excedeu o tempo de resposta." : error instanceof Error ? error.message : "Não foi possível atualizar os conteúdos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
