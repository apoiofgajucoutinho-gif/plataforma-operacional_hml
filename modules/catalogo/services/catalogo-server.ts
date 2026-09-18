import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CatalogContext, CatalogOfferPayload, CatalogProduct, CatalogOffer, CatalogSalesLink, CatalogHistoryEvent, CatalogRow } from "@/modules/catalogo/types";

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

