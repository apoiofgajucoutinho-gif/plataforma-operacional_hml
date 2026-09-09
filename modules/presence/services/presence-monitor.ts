import "server-only";

import crypto from "node:crypto";
import tls from "node:tls";
import type { PresenceAsset, PresenceAssetType, PresenceCheck, PresenceContentStatus, PresenceIncidentType, PresenceSeverity, PresenceStatus } from "@/modules/presence/types";

type SupabaseAny = any;

type CheckIssue = {
  type: PresenceIncidentType;
  severity: PresenceSeverity;
  title: string;
  description: string;
  evidence?: Record<string, unknown>;
};

type BrokenLink = {
  url: string;
  status: number | null;
  error?: string;
};

type CheckResult = {
  http_status: number | null;
  response_time_ms: number | null;
  is_available: boolean;
  ssl_ok: boolean | null;
  ssl_expires_at: string | null;
  redirect_chain: string[];
  broken_links_count: number;
  content_status: PresenceContentStatus;
  content_hash: string | null;
  content_change_score: number | null;
  health_score: number;
  status: PresenceStatus;
  result_json: Record<string, unknown>;
  error_message: string | null;
  issues: CheckIssue[];
};

const DEFAULT_FORBIDDEN_PATTERNS = [
  "casino",
  "bet",
  "aposta",
  "slot",
  "crypto spam",
  "adult",
  "pharma spam",
  "viagra",
  "porn",
  "hackeado",
];

const STATIC_EXTENSIONS = /\.(?:png|jpe?g|gif|webp|svg|ico|css|js|json|xml|pdf|zip|rar|mp4|mp3|webm|woff2?|ttf|eot)(?:$|[?#])/i;
const USER_AGENT = "NorwynPresenceCenter/1.0 (+read-only; HML)";

function nowIso() {
  return new Date().toISOString();
}

function parseThreshold(asset: PresenceAsset, key: string, fallback: number) {
  const value = asset.thresholds?.[key];
  return typeof value === "number" ? value : fallback;
}

function normalizeUrl(input: string, base?: string) {
  try {
    const url = base ? new URL(input, base) : new URL(input);
    url.hash = "";
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function shouldIgnoreUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) return true;
  if (STATIC_EXTENSIONS.test(url.pathname)) return true;
  const path = url.pathname.toLowerCase();
  return path.includes("/wp-admin") || path.includes("/wp-json") || path.includes("/feed") || path.includes("/assets") || path.includes("/cdn-cgi");
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 180) : null;
}

function hashContent(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function scoreStatus(score: number): PresenceStatus {
  if (score >= 90) return "healthy";
  if (score >= 70) return "warning";
  return "critical";
}

function addIssue(issues: CheckIssue[], issue: CheckIssue) {
  if (!issues.some((item) => item.type === issue.type && item.title === issue.title)) issues.push(issue);
}

function severityWeight(severity: PresenceSeverity) {
  return severity === "critical" ? 4 : severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

async function fetchWithTiming(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    const html = await response.text();
    return { response, html, responseTimeMs: Date.now() - startedAt, error: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro de rede";
    return { response: null, html: "", responseTimeMs: Date.now() - startedAt, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function headUrl(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal, headers: { "user-agent": USER_AGENT } });
    return { status: response.status, error: null as string | null };
  } catch (error) {
    try {
      const fallback = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "user-agent": USER_AGENT } });
      return { status: fallback.status, error: null as string | null };
    } catch (fallbackError) {
      const message = fallbackError instanceof Error ? fallbackError.message : error instanceof Error ? error.message : "Erro de rede";
      return { status: null, error: message };
    }
  } finally {
    clearTimeout(timer);
  }
}

async function getCertificateExpiry(urlString: string) {
  const url = new URL(urlString);
  if (url.protocol !== "https:") return { ok: false, expiresAt: null as string | null, error: "URL sem HTTPS" };

  return new Promise<{ ok: boolean; expiresAt: string | null; error: string | null }>((resolve) => {
    const socket = tls.connect({ host: url.hostname, port: 443, servername: url.hostname, rejectUnauthorized: false, timeout: 8000 }, () => {
      const certificate = socket.getPeerCertificate();
      const validTo = certificate?.valid_to ? new Date(certificate.valid_to) : null;
      const ok = Boolean(certificate && validTo && validTo.getTime() > Date.now() && socket.authorized);
      socket.end();
      resolve({ ok, expiresAt: validTo && !Number.isNaN(validTo.getTime()) ? validTo.toISOString() : null, error: socket.authorizationError?.toString() ?? null });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, expiresAt: null, error: "timeout" });
    });
    socket.on("error", (error) => resolve({ ok: false, expiresAt: null, error: error.message }));
  });
}

function extractLinks(html: string, baseUrl: string, options?: { sameHostOnly?: boolean; allowedDomains?: string[]; maxLinks?: number }) {
  const base = new URL(baseUrl);
  const allowedDomains = new Set([base.hostname, ...(options?.allowedDomains ?? [])]);
  const links = new Map<string, { url: string; anchorText: string | null }>();
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) && links.size < (options?.maxLinks ?? 30)) {
    const rawHref = match[1]?.trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) continue;
    const normalized = normalizeUrl(rawHref, baseUrl);
    if (!normalized) continue;
    const parsed = new URL(normalized);
    if (shouldIgnoreUrl(parsed)) continue;
    const sameRoot = parsed.hostname === base.hostname || parsed.hostname.endsWith(`.${base.hostname}`) || allowedDomains.has(parsed.hostname);
    if (options?.sameHostOnly !== false && !sameRoot) continue;
    if (!links.has(normalized)) links.set(normalized, { url: normalized, anchorText: stripHtml(match[2] ?? "").slice(0, 120) || null });
  }

  return Array.from(links.values());
}

async function previousCheck(client: SupabaseAny, assetId: string) {
  const { data } = await client
    .from("presence_checks")
    .select("content_hash, result_json, checked_at")
    .eq("asset_id", assetId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PresenceCheck | null;
}

function classifyAssetType(url: string): PresenceAssetType {
  const lower = url.toLowerCase();
  if (lower.includes("checkout") || lower.includes("hotmart")) return "checkout";
  if (lower.includes("suporte") || lower.includes("whatsapp") || lower.includes("wa.me")) return "support";
  if (lower.includes("form")) return "form";
  if (lower.includes("lp") || lower.includes("formacao") || lower.includes("aasi")) return "landing_page";
  return "internal_page";
}

export async function discoverInternalLinks(client: SupabaseAny, asset: PresenceAsset) {
  const { response, html, responseTimeMs, error } = await fetchWithTiming(asset.url, 12000);
  if (error || !response) throw new Error(error ?? "Nao foi possivel acessar a URL para discovery");

  const links = extractLinks(html, asset.url, { sameHostOnly: true, allowedDomains: asset.allowed_domains ?? undefined, maxLinks: 30 });
  const rows = links.map((link) => ({
    tenant_id: asset.tenant_id,
    source_asset_id: asset.id,
    url: link.url,
    normalized_url: link.url,
    anchor_text: link.anchorText,
    suggested_asset_type: classifyAssetType(link.url),
    status: "pending",
    http_status: null,
    evidence: { response_time_ms: responseTimeMs, source_status: response.status },
  }));

  if (rows.length) {
    const { error } = await client.from("presence_discovered_links").upsert(rows, { onConflict: "tenant_id,source_asset_id,normalized_url" });
    if (error) throw new Error(error.message);
  }

  return { sourceStatus: response.status, discoveredCount: rows.length, links: rows };
}

async function checkLinks(html: string, asset: PresenceAsset) {
  if (!asset.monitor_links) return { tested: [], broken: [] as BrokenLink[] };
  const links = extractLinks(html, asset.url, { sameHostOnly: true, allowedDomains: asset.allowed_domains ?? undefined, maxLinks: 30 });
  const tested: Array<{ url: string; status: number | null }> = [];
  const broken: BrokenLink[] = [];

  for (const link of links) {
    const result = await headUrl(link.url, 8000);
    tested.push({ url: link.url, status: result.status });
    if (result.error || (result.status != null && result.status >= 400)) broken.push({ url: link.url, status: result.status, error: result.error ?? undefined });
  }

  return { tested, broken };
}

function expectedMissing(asset: PresenceAsset, text: string, html: string) {
  const expectedContent = asset.expected_content?.length ? asset.expected_content : asset.asset_type === "main_site" ? ["Juliana Coutinho"] : [];
  const missingContent = expectedContent.filter((item) => !text.toLowerCase().includes(item.toLowerCase()));
  const expectedElements = asset.expected_elements ?? [];
  const missingElements = expectedElements.filter((item) => {
    const label = typeof item.label === "string" ? item.label : "Elemento esperado";
    const textValue = typeof item.text === "string" ? item.text : null;
    const hrefIncludes = typeof item.hrefIncludes === "string" ? item.hrefIncludes : null;
    if (textValue && !text.toLowerCase().includes(textValue.toLowerCase())) return true;
    if (hrefIncludes && !html.toLowerCase().includes(hrefIncludes.toLowerCase())) return true;
    return !textValue && !hrefIncludes && !text.toLowerCase().includes(label.toLowerCase());
  });
  return { missingContent, missingElements };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function suspiciousMatches(asset: PresenceAsset, text: string) {
  const patterns = [...DEFAULT_FORBIDDEN_PATTERNS, ...(asset.forbidden_patterns ?? [])];
  return Array.from(new Set(patterns.filter((pattern) => {
    const trimmed = pattern.trim();
    if (!trimmed) return false;
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegExp(trimmed.toLowerCase())}(?=[^a-z0-9]|$)`, "i");
    return regex.test(text.toLowerCase());
  })));
}

function calculateScore(asset: PresenceAsset, params: { httpStatus: number | null; responseTimeMs: number | null; sslOk: boolean | null; brokenLinks: number; suspicious: number; missingContent: number; missingElements: number; contentChangeScore: number | null; error: string | null }) {
  let score = 100;
  const issues: CheckIssue[] = [];
  const warningMs = parseThreshold(asset, "response_warning_ms", 1500);
  const criticalMs = parseThreshold(asset, "response_critical_ms", 3000);

  if (params.error || params.httpStatus == null) {
    score -= 60;
    addIssue(issues, { type: "site_down", severity: "critical", title: "Site indisponivel", description: params.error ?? "A URL nao respondeu durante a checagem." });
  } else if (params.httpStatus >= 500) {
    score -= 45;
    addIssue(issues, { type: "http_error", severity: "critical", title: `Erro HTTP ${params.httpStatus}`, description: "A URL retornou erro de servidor." });
  } else if (params.httpStatus >= 400) {
    score -= 35;
    addIssue(issues, { type: "http_error", severity: "high", title: `Erro HTTP ${params.httpStatus}`, description: "A URL retornou erro de cliente." });
  } else if (params.httpStatus >= 300) {
    score -= 8;
    addIssue(issues, { type: "unexpected_redirect", severity: "medium", title: `Redirecionamento HTTP ${params.httpStatus}`, description: "A URL respondeu com redirecionamento. Validar se o destino e esperado." });
  }

  if (params.responseTimeMs != null && asset.monitor_performance) {
    if (params.responseTimeMs > criticalMs) {
      score -= 20;
      addIssue(issues, { type: "slow_response", severity: "high", title: "Resposta critica", description: `Tempo de resposta acima de ${criticalMs} ms.`, evidence: { response_time_ms: params.responseTimeMs } });
    } else if (params.responseTimeMs > warningMs) {
      score -= 10;
      addIssue(issues, { type: "slow_response", severity: "medium", title: "Resposta acima do normal", description: `Tempo de resposta acima de ${warningMs} ms.`, evidence: { response_time_ms: params.responseTimeMs } });
    }
  }

  if (params.sslOk === false) {
    score -= 25;
    addIssue(issues, { type: "ssl_problem", severity: "high", title: "Problema de SSL", description: "Nao foi possivel validar o certificado HTTPS." });
  }
  if (params.brokenLinks > 0) {
    score -= Math.min(20, params.brokenLinks * 5);
    addIssue(issues, { type: "broken_link", severity: params.brokenLinks > 2 ? "high" : "medium", title: "Links quebrados encontrados", description: `${params.brokenLinks} link(s) interno(s) exigem revisao.` });
  }
  if (params.suspicious > 0) {
    score -= 40;
    addIssue(issues, { type: "suspicious_content", severity: "critical", title: "Conteudo suspeito detectado", description: "A pagina contem termo(s) configurados como suspeitos." });
  }
  if (params.missingContent > 0 || params.missingElements > 0) {
    score -= 15 + Math.min(15, params.missingElements * 5);
    addIssue(issues, { type: "missing_element", severity: "medium", title: "Conteudo ou elemento esperado ausente", description: "Uma verificacao configurada nao foi encontrada na pagina." });
  }
  if (params.contentChangeScore != null && params.contentChangeScore >= 55) {
    score -= 25;
    addIssue(issues, { type: "content_change", severity: "high", title: "Mudanca critica de conteudo", description: "A pagina mudou de forma relevante em relacao a ultima checagem." });
  } else if (params.contentChangeScore != null && params.contentChangeScore >= 30) {
    score -= 10;
    addIssue(issues, { type: "content_change", severity: "medium", title: "Mudanca relevante de conteudo", description: "A pagina mudou acima do comportamento esperado." });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return { score: finalScore, status: scoreStatus(finalScore), issues };
}

export async function buildPresenceCheck(client: SupabaseAny, asset: PresenceAsset): Promise<CheckResult> {
  const timeoutMs = parseThreshold(asset, "timeout_ms", 15000);
  const previous = await previousCheck(client, asset.id);
  const { response, html, responseTimeMs, error } = await fetchWithTiming(asset.url, timeoutMs);
  const httpStatus = response?.status ?? null;
  const finalUrl = response?.url ?? asset.url;
  const redirectChain = finalUrl !== asset.url ? [asset.url, finalUrl] : [];
  const text = html ? stripHtml(html) : "";
  const contentHash = text ? hashContent(text) : null;
  const previousLength = typeof previous?.result_json?.content_length === "number" ? previous.result_json.content_length : null;
  const contentChangeScore = previousLength && text.length ? Math.round((Math.abs(text.length - previousLength) / Math.max(text.length, previousLength)) * 100) : null;
  const ssl = await getCertificateExpiry(asset.url).catch((sslError) => ({ ok: false, expiresAt: null, error: sslError instanceof Error ? sslError.message : "Erro SSL" }));
  const linkResult = html ? await checkLinks(html, asset) : { tested: [], broken: [] as BrokenLink[] };
  const expected = asset.monitor_content ? expectedMissing(asset, text, html) : { missingContent: [], missingElements: [] };
  const suspicious = asset.monitor_content ? suspiciousMatches(asset, text) : [];
  const scoring = calculateScore(asset, {
    httpStatus,
    responseTimeMs,
    sslOk: ssl.ok,
    brokenLinks: linkResult.broken.length,
    suspicious: suspicious.length,
    missingContent: expected.missingContent.length,
    missingElements: expected.missingElements.length,
    contentChangeScore,
    error,
  });

  const contentStatus: PresenceContentStatus = suspicious.length ? "suspicious" : expected.missingContent.length || expected.missingElements.length ? "missing_expected" : contentChangeScore != null && contentChangeScore >= 30 ? "changed" : "ok";
  return {
    http_status: httpStatus,
    response_time_ms: responseTimeMs,
    is_available: Boolean(response && httpStatus != null && httpStatus < 400),
    ssl_ok: ssl.ok,
    ssl_expires_at: ssl.expiresAt,
    redirect_chain: redirectChain,
    broken_links_count: linkResult.broken.length,
    content_status: contentStatus,
    content_hash: contentHash,
    content_change_score: contentChangeScore,
    health_score: scoring.score,
    status: scoring.status,
    error_message: error,
    issues: scoring.issues,
    result_json: {
      title: pageTitle(html),
      final_url: finalUrl,
      ssl_error: ssl.error,
      content_length: text.length,
      suspicious_matches: suspicious,
      missing_content: expected.missingContent,
      missing_elements: expected.missingElements.map((item) => item.label ?? "Elemento esperado"),
      links_tested_count: linkResult.tested.length,
      broken_links: linkResult.broken.slice(0, 20),
      score_explanation: scoring.issues.length ? scoring.issues.map((issue) => issue.title) : ["Site online", "Nenhum problema critico identificado"],
      read_only: true,
    },
  };
}

async function syncIncidents(client: SupabaseAny, asset: PresenceAsset, checkId: string, issues: CheckIssue[]) {
  const activeTypes = new Set(issues.map((issue) => issue.type));
  const { data: openIncidents } = await client
    .from("presence_incidents")
    .select("id, incident_type, status")
    .eq("tenant_id", asset.tenant_id)
    .eq("asset_id", asset.id)
    .in("status", ["open", "acknowledged"]);

  for (const issue of issues) {
    const existing = (openIncidents ?? []).find((incident: any) => incident.incident_type === issue.type);
    if (existing) {
      await client.from("presence_incidents").update({ severity: issue.severity, title: issue.title, description: issue.description, evidence: issue.evidence ?? {}, last_check_id: checkId, updated_at: nowIso(), status: "open" }).eq("id", existing.id);
    } else {
      await client.from("presence_incidents").insert({ tenant_id: asset.tenant_id, asset_id: asset.id, severity: issue.severity, incident_type: issue.type, title: issue.title, description: issue.description, evidence: issue.evidence ?? {}, last_check_id: checkId, status: "open" });
    }
  }

  for (const incident of openIncidents ?? []) {
    if (!activeTypes.has(incident.incident_type)) {
      await client.from("presence_incidents").update({ status: "resolved", resolved_at: nowIso(), last_check_id: checkId, updated_at: nowIso() }).eq("id", incident.id);
    }
  }
}

export async function runPresenceCheck(client: SupabaseAny, asset: PresenceAsset) {
  const result = await buildPresenceCheck(client, asset);
  const { data: check, error } = await client
    .from("presence_checks")
    .insert({
      tenant_id: asset.tenant_id,
      asset_id: asset.id,
      http_status: result.http_status,
      response_time_ms: result.response_time_ms,
      is_available: result.is_available,
      ssl_ok: result.ssl_ok,
      ssl_expires_at: result.ssl_expires_at,
      redirect_chain: result.redirect_chain,
      broken_links_count: result.broken_links_count,
      content_status: result.content_status,
      content_hash: result.content_hash,
      content_change_score: result.content_change_score,
      health_score: result.health_score,
      status: result.status,
      result_json: result.result_json,
      error_message: result.error_message,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await syncIncidents(client, asset, check.id, result.issues);
  await client.from("digital_assets").update({ last_checked_at: nowIso(), last_status: result.status, last_health_score: result.health_score, last_check_id: check.id, updated_at: nowIso() }).eq("id", asset.id);
  return { check, result };
}

export async function approveDiscoveredLink(client: SupabaseAny, params: { tenantId: string; linkId: string; action: "monitor" | "critical" | "ignored"; userId: string | null }) {
  const { data: link, error } = await client.from("presence_discovered_links").select("*").eq("tenant_id", params.tenantId).eq("id", params.linkId).maybeSingle();
  if (error || !link) throw new Error(error?.message ?? "Link nao encontrado");

  if (params.action === "ignored") {
    await client.from("presence_discovered_links").update({ status: "ignore", reviewed_at: nowIso(), reviewed_by: params.userId, updated_at: nowIso() }).eq("id", params.linkId);
    return { link, asset: null };
  }

  const { data: asset, error: assetError } = await client
    .from("digital_assets")
    .insert({
      tenant_id: params.tenantId,
      name: link.anchor_text || new URL(link.normalized_url).pathname || link.normalized_url,
      url: link.normalized_url,
      asset_type: link.suggested_asset_type,
      parent_asset_id: link.source_asset_id,
      environment: "prod_external",
      owner: "Juliana Coutinho",
      is_critical: params.action === "critical",
      monitoring_enabled: true,
      monitor_content: true,
      monitor_links: false,
      monitor_performance: true,
      expected_content: ["Juliana Coutinho"],
      thresholds: { response_warning_ms: 1500, response_critical_ms: 3000, timeout_ms: 15000 },
    })
    .select("*")
    .single();
  if (assetError) throw new Error(assetError.message);

  await client.from("presence_discovered_links").update({ status: params.action, reviewed_at: nowIso(), reviewed_by: params.userId, created_asset_id: asset.id, updated_at: nowIso() }).eq("id", params.linkId);
  return { link, asset };
}

export async function runPresenceSimulations(client: SupabaseAny, tenantId: string) {
  const simulationUrl = `https://presence-simulated.invalid/${Date.now()}`;
  const { data: asset, error } = await client
    .from("digital_assets")
    .insert({ tenant_id: tenantId, name: "QA Presence Center - Simulado", url: simulationUrl, asset_type: "other", environment: "dev", owner: "Norwyn QA", is_critical: false, monitoring_enabled: false })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const cases = [
    { name: "site_200", score: 100, status: "healthy", issue: null },
    { name: "url_inexistente_404", score: 60, status: "critical", issue: { type: "http_error", severity: "high", title: "Erro HTTP 404", description: "Simulacao de URL inexistente." } },
    { name: "timeout_simulado", score: 40, status: "critical", issue: { type: "site_down", severity: "critical", title: "Site indisponivel", description: "Simulacao de timeout." } },
    { name: "palavra_suspeita", score: 60, status: "critical", issue: { type: "suspicious_content", severity: "critical", title: "Conteudo suspeito detectado", description: "Simulacao de termo proibido." } },
    { name: "elemento_ausente", score: 75, status: "warning", issue: { type: "missing_element", severity: "medium", title: "Elemento esperado ausente", description: "Simulacao de CTA ausente." } },
    { name: "link_quebrado", score: 80, status: "warning", issue: { type: "broken_link", severity: "medium", title: "Links quebrados encontrados", description: "Simulacao de link 500." } },
    { name: "redirect", score: 92, status: "healthy", issue: { type: "unexpected_redirect", severity: "medium", title: "Redirecionamento HTTP 302", description: "Simulacao de redirect." } },
    { name: "ssl_invalido", score: 75, status: "warning", issue: { type: "ssl_problem", severity: "high", title: "Problema de SSL", description: "Simulacao de certificado invalido." } },
  ] as const;

  const inserted: any[] = [];
  for (const item of cases) {
    const { data: check } = await client
      .from("presence_checks")
      .insert({ tenant_id: tenantId, asset_id: asset.id, http_status: item.name.includes("404") ? 404 : item.name === "redirect" ? 302 : item.name === "timeout_simulado" ? null : 200, response_time_ms: item.name === "timeout_simulado" ? 15000 : 900, is_available: item.score >= 70, ssl_ok: item.name !== "ssl_invalido", broken_links_count: item.name === "link_quebrado" ? 1 : 0, content_status: item.name === "palavra_suspeita" ? "suspicious" : item.name === "elemento_ausente" ? "missing_expected" : item.name === "redirect" ? "changed" : "ok", health_score: item.score, status: item.status, result_json: { simulation: item.name } })
      .select("*")
      .single();
    if (check && item.issue) await syncIncidents(client, asset as PresenceAsset, check.id, [item.issue as CheckIssue]);
    inserted.push({ case: item.name, status: item.status, health_score: item.score });
  }

  const { data: recoveryCheck } = await client
    .from("presence_checks")
    .insert({ tenant_id: tenantId, asset_id: asset.id, http_status: 200, response_time_ms: 700, is_available: true, ssl_ok: true, broken_links_count: 0, content_status: "ok", health_score: 100, status: "healthy", result_json: { simulation: "recovery" } })
    .select("*")
    .single();
  if (recoveryCheck) await syncIncidents(client, asset as PresenceAsset, recoveryCheck.id, []);

  const { data: incidents } = await client.from("presence_incidents").select("incident_type, status, resolved_at").eq("asset_id", asset.id).order("created_at", { ascending: true });
  return { asset, cases: inserted, recovery: { status: "resolved", check_id: recoveryCheck?.id ?? null }, incidents: incidents ?? [] };
}