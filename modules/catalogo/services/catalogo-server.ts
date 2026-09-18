import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runPresenceCheck } from "@/modules/presence/services/presence-monitor";
import type { CatalogContext, CatalogOfferPayload, CatalogProduct, CatalogOffer, CatalogSalesLink, CatalogHistoryEvent, CatalogRow, CatalogTechnicalHealth } from "@/modules/catalogo/types";

type SupabaseAny = any;

type CatalogAuth = {
  userId: string;
  userEmail: string | null;
  tenantId: string;
  role: string;
  allowedModules: string[];
  dataClient: SupabaseAny;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function extractHotmartIds(url: string) {
  const productMatch = url.match(/pay\.hotmart\.com\/([A-Za-z0-9]+)/);
  let offerId: string | null = null;
  try {
    offerId = new URL(url).searchParams.get("off");
  } catch {
    offerId = null;
  }
  return {
    hotmart_product_id: productMatch?.[1] ?? null,
    hotmart_offer_id: offerId,
  };
}

function asNumber<T extends Record<string, unknown>>(rows: T[] | null | undefined) {
  return (rows ?? []).map((row) => {
    const next = { ...row };
    for (const [key, value] of Object.entries(next)) {
      if (typeof value === "string" && value !== "" && !Number.isNaN(Number(value))) {
        next[key as keyof typeof next] = Number(value) as never;
      }
    }
    return next;
  });
}

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();
  return { membership: data, error };
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules;
  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);
  return (data ?? []).map((item: { module: string }) => item.module);
}

export async function getCatalogAuth(): Promise<CatalogAuth> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  const adminClient = createAdminClient();
  const profileClient = adminClient ?? userClient;
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) redirect("/login");

  const localMembership = user ? null : await getLocalBypassMembership(profileClient);
  const { membership, error: membershipError } = localMembership
    ? { membership: localMembership, error: null }
    : await getMembershipByUserId(currentUser.id);
  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error("Usuario sem tenant vinculado.");

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, profileClient);
  if (!allowedModules.includes("catalogo") && membership.role !== "ADMIN") {
    throw new Error("Seu perfil nao possui acesso ao modulo Catalogo.");
  }

  return {
    userId: currentUser.id,
    userEmail: currentUser.email ?? null,
    tenantId: membership.tenant_id,
    role: membership.role,
    allowedModules,
    dataClient: profileClient,
  };
}

function canWriteCatalog(role: string) {
  return ["ADMIN", "ESPECIALISTA", "OPERACIONAL", "SUPORTE"].includes(role);
}

function latestTimestamp(rows: Array<{ updated_at?: string | null; created_at?: string | null }>) {
  return rows.map((row) => row.updated_at ?? row.created_at ?? null).filter(Boolean).sort().at(-1) ?? null;
}

export async function getCatalogContext(): Promise<CatalogContext> {
  try {
    const auth = await getCatalogAuth();
    const [tenantResult, productsResult, offersResult, linksResult, historyResult] = await Promise.all([
      auth.dataClient.from("tenants").select("id, nome").eq("id", auth.tenantId).maybeSingle(),
      auth.dataClient.from("catalog_products").select("*").eq("tenant_id", auth.tenantId).order("name"),
      auth.dataClient.from("catalog_offers").select("*").eq("tenant_id", auth.tenantId).order("created_at", { ascending: false }),
      auth.dataClient.from("catalog_sales_links").select("*").eq("tenant_id", auth.tenantId).order("created_at", { ascending: false }),
      auth.dataClient.from("catalog_link_history").select("*").eq("tenant_id", auth.tenantId).order("created_at", { ascending: false }).limit(120),
    ]);

    for (const result of [productsResult, offersResult, linksResult, historyResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const products = productsResult.data ?? [] as CatalogProduct[];
    const offers = asNumber(offersResult.data) as CatalogOffer[];
    const links = linksResult.data ?? [] as CatalogSalesLink[];
    const history = historyResult.data ?? [] as CatalogHistoryEvent[];
    const productById = new Map(products.map((product: CatalogProduct) => [product.id, product]));
    const offerById = new Map(offers.map((offer: CatalogOffer) => [offer.id, offer]));
    const rows: CatalogRow[] = links
      .map((link: CatalogSalesLink) => {
        const product = productById.get(link.product_id);
        const offer = offerById.get(link.offer_id);
        return product && offer ? { product, offer, link, performance: null } : null;
      })
      .filter(Boolean) as CatalogRow[];

    const activeOffers = offers.filter((offer) => offer.commercial_status === "ativo").length;
    const linksWithIssue = links.filter((link: CatalogSalesLink) => link.technical_health === "quebrado" || link.technical_health === "indisponivel").length;
    const mainLinks = links.filter((link: CatalogSalesLink) => link.is_main_link).length;

    return {
      tenant: tenantResult.data ? { id: tenantResult.data.id, nome: tenantResult.data.nome } : null,
      userEmail: auth.userEmail,
      role: auth.role,
      allowedModules: auth.allowedModules,
      canEdit: canWriteCatalog(auth.role),
      canSeeTechnical: auth.role === "ADMIN",
      diagnostic: null,
      updatedAt: latestTimestamp([...products, ...offers, ...links]),
      products,
      offers,
      links,
      rows,
      history,
      healthFromPresenceAvailable: links.some((link: CatalogSalesLink) => Boolean(link.presence_asset_id || link.last_checked_at)),
      loadSummary: {
        links: links.length,
        activeOffers,
        linksWithIssue,
        products: products.length,
        mainLinks,
        attributionAvailable: false,
      },
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw error;
    const message = error instanceof Error ? error.message : "Falha ao carregar catalogo.";
    return {
      tenant: null,
      userEmail: null,
      role: null,
      allowedModules: [],
      canEdit: false,
      canSeeTechnical: false,
      diagnostic: message,
      updatedAt: null,
      products: [],
      offers: [],
      links: [],
      rows: [],
      history: [],
      healthFromPresenceAvailable: false,
      loadSummary: { links: 0, activeOffers: 0, linksWithIssue: 0, products: 0, mainLinks: 0, attributionAvailable: false },
    };
  }
}

function assertCanWrite(auth: CatalogAuth) {
  if (!canWriteCatalog(auth.role)) throw new Error("Seu perfil nao pode alterar o catalogo.");
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function offerPayload(input: CatalogOfferPayload, tenantId: string, productId: string, userId?: string) {
  const name = input.offer_name.trim();
  if (!name) throw new Error("Informe o nome da oferta.");
  return {
    tenant_id: tenantId,
    product_id: productId,
    name,
    normalized_name: normalizeText(name),
    offer_type: input.offer_type || "outro",
    included_products: input.included_products?.filter(Boolean) ?? [],
    platform: cleanOptional(input.platform) ?? "Hotmart",
    current_price: input.current_price ?? null,
    max_installments: input.max_installments ?? null,
    smart_installments: cleanOptional(input.smart_installments) ?? "A confirmar",
    access_time: cleanOptional(input.access_time) ?? "A confirmar",
    warranty: cleanOptional(input.warranty) ?? "A confirmar",
    has_coparticipation: input.has_coparticipation ?? null,
    partner: cleanOptional(input.partner),
    coparticipation_percent: input.coparticipation_percent ?? null,
    use_type: cleanOptional(input.use_type) ?? "A confirmar",
    commercial_status: input.commercial_status ?? "rascunho",
    responsible: cleanOptional(input.responsible),
    notes: cleanOptional(input.notes),
    campaign_name: cleanOptional(input.campaign_name),
    audience: cleanOptional(input.audience),
    lead_origin: cleanOptional(input.lead_origin),
    special_rule: cleanOptional(input.special_rule),
    data_quality_status: input.current_price == null || !input.use_type ? "partial" : "trusted",
    ...(userId ? { created_by: userId } : {}),
  };
}

async function ensureProduct(auth: CatalogAuth, input: CatalogOfferPayload) {
  if (input.product_id) return input.product_id;
  const productName = cleanOptional(input.product_name);
  if (!productName) throw new Error("Informe o produto principal.");
  const normalized = normalizeText(productName);
  const { data: existing, error: existingError } = await auth.dataClient
    .from("catalog_products")
    .select("id")
    .eq("tenant_id", auth.tenantId)
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.id) return existing.id;
  const { data, error } = await auth.dataClient
    .from("catalog_products")
    .insert({ tenant_id: auth.tenantId, name: productName, normalized_name: normalized, status: "ativo", created_by: auth.userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function createCatalogOffer(input: CatalogOfferPayload) {
  const auth = await getCatalogAuth();
  assertCanWrite(auth);
  if (!input.checkout_url?.trim()) throw new Error("Informe o link de venda.");
  const productId = await ensureProduct(auth, input);
  const payload = offerPayload(input, auth.tenantId, productId, auth.userId);
  const { data: offer, error: offerError } = await auth.dataClient.from("catalog_offers").insert(payload).select("*").single();
  if (offerError) throw new Error(offerError.message);
  const ids = extractHotmartIds(input.checkout_url);
  const { data: link, error: linkError } = await auth.dataClient
    .from("catalog_sales_links")
    .insert({
      tenant_id: auth.tenantId,
      product_id: productId,
      offer_id: offer.id,
      checkout_url: input.checkout_url.trim(),
      normalized_url: normalizeUrl(input.checkout_url),
      platform: payload.platform,
      ...ids,
      technical_health: "nao_verificado",
      is_main_link: Boolean(input.is_main_link),
      created_by: auth.userId,
    })
    .select("*")
    .single();
  if (linkError) throw new Error(linkError.message);
  await auth.dataClient.from("catalog_link_history").insert({ tenant_id: auth.tenantId, product_id: productId, offer_id: offer.id, sales_link_id: link.id, event_type: "created", new_value: { offer, link }, reason: input.reason ?? "Cadastro manual", actor_id: auth.userId, actor_label: auth.userEmail });
  return { offer, link };
}

export async function updateCatalogOffer(input: CatalogOfferPayload) {
  const auth = await getCatalogAuth();
  assertCanWrite(auth);
  if (!input.id) throw new Error("Informe a oferta para editar.");
  if (!input.checkout_url?.trim()) throw new Error("Informe o link de venda.");
  const { data: previousOffer } = await auth.dataClient.from("catalog_offers").select("*").eq("id", input.id).eq("tenant_id", auth.tenantId).maybeSingle();
  const { data: previousLink } = await auth.dataClient.from("catalog_sales_links").select("*").eq("offer_id", input.id).eq("tenant_id", auth.tenantId).limit(1).maybeSingle();
  const productId = await ensureProduct(auth, input);
  const payload = offerPayload(input, auth.tenantId, productId);
  const { data: offer, error: offerError } = await auth.dataClient.from("catalog_offers").update(payload).eq("id", input.id).eq("tenant_id", auth.tenantId).select("*").single();
  if (offerError) throw new Error(offerError.message);
  const ids = extractHotmartIds(input.checkout_url);
  const linkUpdate = {
    product_id: productId,
    checkout_url: input.checkout_url.trim(),
    normalized_url: normalizeUrl(input.checkout_url),
    platform: payload.platform,
    ...ids,
    is_main_link: Boolean(input.is_main_link),
  };
  const { data: link, error: linkError } = await auth.dataClient.from("catalog_sales_links").update(linkUpdate).eq("offer_id", input.id).eq("tenant_id", auth.tenantId).select("*").single();
  if (linkError) throw new Error(linkError.message);
  await auth.dataClient.from("catalog_link_history").insert({ tenant_id: auth.tenantId, product_id: productId, offer_id: offer.id, sales_link_id: link.id, event_type: "updated", previous_value: { offer: previousOffer, link: previousLink }, new_value: { offer, link }, reason: input.reason ?? "Edicao manual", actor_id: auth.userId, actor_label: auth.userEmail });
  return { offer, link };
}


type CatalogLinkCheckSummary = {
  linkId: string;
  presenceAssetId: string;
  presenceCheckId: string;
  technicalHealth: string;
  checkedAt: string | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  finalUrl: string | null;
  redirectChain: string[];
  errorMessage: string | null;
};

function mapPresenceToCatalogHealth(check: any): CatalogTechnicalHealth {
  const status = typeof check?.http_status === "number" ? check.http_status : null;
  const resultJson = (check?.result_json ?? {}) as Record<string, unknown>;
  const finalUrl = typeof resultJson.final_url === "string" ? resultJson.final_url : null;
  const sourceUrl = typeof resultJson.catalog_source_url === "string" ? resultJson.catalog_source_url : null;
  const redirected = Boolean(finalUrl && sourceUrl && finalUrl !== sourceUrl);
  if (status == null) return "indisponivel";
  if (status >= 500) return "indisponivel";
  if (status >= 400) return "quebrado";
  if (redirected || (Array.isArray(check?.redirect_chain) && check.redirect_chain.length > 1)) return "redirecionando";
  return "funcionando";
}

async function loadCatalogRowForCheck(auth: CatalogAuth, linkId: string) {
  const { data: link, error: linkError } = await auth.dataClient
    .from("catalog_sales_links")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .eq("id", linkId)
    .maybeSingle();
  if (linkError || !link) throw new Error(linkError?.message ?? "Link nao encontrado.");

  const [{ data: offer, error: offerError }, { data: product, error: productError }] = await Promise.all([
    auth.dataClient.from("catalog_offers").select("*").eq("tenant_id", auth.tenantId).eq("id", link.offer_id).maybeSingle(),
    auth.dataClient.from("catalog_products").select("*").eq("tenant_id", auth.tenantId).eq("id", link.product_id).maybeSingle(),
  ]);
  if (offerError || !offer) throw new Error(offerError?.message ?? "Oferta nao encontrada.");
  if (productError || !product) throw new Error(productError?.message ?? "Produto nao encontrado.");
  return { link: link as CatalogSalesLink, offer: offer as CatalogOffer, product: product as CatalogProduct };
}

async function ensurePresenceAssetForCatalogLink(auth: CatalogAuth, row: { link: CatalogSalesLink; offer: CatalogOffer; product: CatalogProduct }) {
  if (row.link.presence_asset_id) {
    const { data: linked } = await auth.dataClient
      .from("digital_assets")
      .select("*")
      .eq("tenant_id", auth.tenantId)
      .eq("id", row.link.presence_asset_id)
      .maybeSingle();
    if (linked) return linked;
  }

  const { data: existing, error: existingError } = await auth.dataClient
    .from("digital_assets")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .eq("url", row.link.checkout_url)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    await auth.dataClient.from("catalog_sales_links").update({ presence_asset_id: existing.id }).eq("tenant_id", auth.tenantId).eq("id", row.link.id);
    return existing;
  }

  const { data: asset, error } = await auth.dataClient
    .from("digital_assets")
    .insert({
      tenant_id: auth.tenantId,
      name: `${row.product.name} - ${row.offer.name}`.slice(0, 160),
      url: row.link.checkout_url,
      asset_type: "checkout",
      environment: "external",
      owner: row.offer.responsible ?? "Norwyn Catalogo",
      is_critical: row.offer.commercial_status === "ativo",
      monitoring_enabled: row.offer.commercial_status === "ativo",
      monitor_content: false,
      monitor_links: false,
      monitor_performance: true,
      expected_content: [],
      expected_elements: [],
      allowed_domains: [],
      thresholds: { response_warning_ms: 1800, response_critical_ms: 4000, timeout_ms: 15000 },
      metadata: { source: "catalogo", catalog_link_id: row.link.id, catalog_offer_id: row.offer.id, catalog_product_id: row.product.id },
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await auth.dataClient.from("catalog_sales_links").update({ presence_asset_id: asset.id }).eq("tenant_id", auth.tenantId).eq("id", row.link.id);
  return asset;
}

function buildCatalogPresenceMetadata(link: CatalogSalesLink, check: any) {
  const resultJson = (check?.result_json ?? {}) as Record<string, unknown>;
  const finalUrl = typeof resultJson.final_url === "string" ? resultJson.final_url : null;
  const redirectChain = Array.isArray(check?.redirect_chain) ? check.redirect_chain.filter((item: unknown): item is string => typeof item === "string") : [];
  return {
    ...(link.metadata ?? {}),
    presence: {
      check_id: check.id,
      checked_at: check.checked_at,
      http_status: check.http_status ?? null,
      response_time_ms: check.response_time_ms ?? null,
      final_url: finalUrl,
      redirect_chain: redirectChain,
      error_message: check.error_message ?? null,
      health_score: check.health_score ?? null,
      presence_status: check.status ?? null,
    },
  };
}

export async function checkCatalogSalesLink(linkId: string): Promise<CatalogLinkCheckSummary> {
  const auth = await getCatalogAuth();
  assertCanWrite(auth);
  const row = await loadCatalogRowForCheck(auth, linkId);
  const previousHealth = row.link.technical_health;
  const asset = await ensurePresenceAssetForCatalogLink(auth, row);
  const { check } = await runPresenceCheck(auth.dataClient, { ...asset, url: row.link.checkout_url, tenant_id: auth.tenantId });
  const enrichedCheck = { ...check, result_json: { ...(check.result_json ?? {}), catalog_source_url: row.link.checkout_url } };
  const technicalHealth = mapPresenceToCatalogHealth(enrichedCheck);
  const metadata = buildCatalogPresenceMetadata(row.link, enrichedCheck);
  const { data: updatedLink, error: updateError } = await auth.dataClient
    .from("catalog_sales_links")
    .update({
      technical_health: technicalHealth,
      last_checked_at: check.checked_at,
      presence_asset_id: asset.id,
      metadata,
    })
    .eq("tenant_id", auth.tenantId)
    .eq("id", row.link.id)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  await auth.dataClient.from("catalog_link_history").insert({
    tenant_id: auth.tenantId,
    product_id: row.product.id,
    offer_id: row.offer.id,
    sales_link_id: row.link.id,
    event_type: previousHealth === technicalHealth ? "health_checked" : "health_changed",
    previous_value: { technical_health: previousHealth },
    new_value: { technical_health: technicalHealth, presence_check_id: check.id, http_status: check.http_status, final_url: metadata.presence.final_url },
    reason: previousHealth === technicalHealth ? "Verificacao de saude do link" : `Saude alterada de ${previousHealth} para ${technicalHealth}`,
    actor_id: auth.userId,
    actor_label: auth.userEmail,
  });

  return {
    linkId: row.link.id,
    presenceAssetId: asset.id,
    presenceCheckId: check.id,
    technicalHealth: updatedLink.technical_health,
    checkedAt: updatedLink.last_checked_at,
    httpStatus: metadata.presence.http_status,
    responseTimeMs: metadata.presence.response_time_ms,
    finalUrl: metadata.presence.final_url,
    redirectChain: metadata.presence.redirect_chain,
    errorMessage: metadata.presence.error_message,
  };
}


