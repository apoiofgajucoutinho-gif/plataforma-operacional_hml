export type CanonicalProductSource = "products" | "comercial_produtos" | "hotmart" | "landing_registry";

export type CanonicalProduct = {
  id: string;
  label: string;
  source: CanonicalProductSource;
  productId: string | null;
  hotmartProductId: string | null;
  evidence: string;
};

type AliasLike = { alias?: string | null; produto_base?: string | null; ativo?: boolean | null };
type ComponentLike = { componente?: string | null; ativo?: boolean | null };
type NorwynProductLike = {
  id: string;
  nome_oficial?: string | null;
  produto_base?: string | null;
  ativo?: boolean | null;
  metadata?: Record<string, unknown> | null;
  link_oferta?: string | null;
  product_aliases?: AliasLike[] | null;
  product_components?: ComponentLike[] | null;
};
type ComercialProductLike = {
  id: string;
  nome?: string | null;
  hotmart_product_id?: string | null;
  ativo?: boolean | null;
};
type SaleLike = {
  produto_id?: string | null;
  hotmart_product_id?: string | null;
  produto_nome?: string | null;
  metadata?: Record<string, unknown> | null;
};
type LandingLike = {
  product_id?: string | null;
  hotmart_product_id?: string | null;
  landing_name?: string | null;
};
type ExternalIdentityLike = {
  product_id?: string | null;
  product_key?: string | null;
  source?: string | null;
  external_id?: string | null;
  external_name?: string | null;
  relationship?: string | null;
  revenue_scope?: "REVENUE_DIRECT" | "REVENUE_RELATED" | "EXCLUDED" | string | null;
  confidence?: string | null;
};

export type ProductIdentityInput = {
  products?: NorwynProductLike[];
  comercialProducts?: ComercialProductLike[];
  sales?: SaleLike[];
  landings?: LandingLike[];
  externalIdentities?: ExternalIdentityLike[];
};

export function normalizeProductIdentity(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map((item) => String(item)).join(" ");
  return null;
}

function productHotmartIds(product: NorwynProductLike) {
  return [
    metadataString(product.metadata, "hotmart_product_id"),
    metadataString(product.metadata, "hotmartProductId"),
    metadataString(product.metadata, "hotmart_ids"),
    metadataString(product.metadata, "product_id"),
    product.link_oferta,
  ]
    .flatMap((value) => String(value ?? "").match(/\d{5,}/g) ?? [])
    .filter(Boolean);
}

function productNameTokens(product: NorwynProductLike) {
  return [
    product.nome_oficial,
    product.produto_base,
    ...(product.product_aliases ?? []).filter((alias) => alias.ativo !== false).flatMap((alias) => [alias.alias, alias.produto_base]),
    ...(product.product_components ?? []).filter((component) => component.ativo !== false).map((component) => component.componente),
  ]
    .map(normalizeProductIdentity)
    .filter((item) => item.length > 2);
}

function saleProductNameForHotmart(sales: SaleLike[], hotmartProductId: string) {
  return sales.find((sale) => sale.hotmart_product_id === hotmartProductId && sale.produto_nome)?.produto_nome ?? null;
}

function knownHotmartProductName(hotmartProductId: string) {
  if (hotmartProductId === "8118159") return "Imersao Tecnica de Mascaramento";
  if (hotmartProductId === "8163835") return "2o Ingresso com 50% de Desconto | Imersao Tecnica de Mascaramento";
  return null;
}

export function matchProductToSale(product: NorwynProductLike, sale: SaleLike) {
  const explicitIdentities = (product.metadata?.externalIdentities as ExternalIdentityLike[] | undefined) ?? [];
  if (sale.hotmart_product_id && explicitIdentities.some((identity) => identity.source?.toLowerCase() === "hotmart" && identity.external_id === sale.hotmart_product_id && identity.revenue_scope !== "EXCLUDED")) {
    return true;
  }

  const ids = [
    sale.produto_id,
    sale.hotmart_product_id,
    metadataString(sale.metadata, "product_id"),
    metadataString(sale.metadata, "hotmart_product_id"),
  ].filter(Boolean).map(String);
  if (ids.includes(product.id)) return true;
  if (ids.some((id) => productHotmartIds(product).includes(id))) return true;

  const haystack = normalizeProductIdentity([
    sale.produto_nome,
    metadataString(sale.metadata, "product_name"),
    metadataString(sale.metadata, "product"),
  ].filter(Boolean).join(" "));
  if (!haystack) return false;
  return productNameTokens(product).some((token) => haystack.includes(token) || token.includes(haystack));
}

export function canonicalProductIdForSale(sale: SaleLike, products: NorwynProductLike[]) {
  const product = products.find((item) => item.ativo !== false && matchProductToSale(item, sale));
  if (product) return product.id;
  if (sale.hotmart_product_id) return `hotmart:${sale.hotmart_product_id}`;
  if (sale.produto_nome) return `hotmart-name:${normalizeProductIdentity(sale.produto_nome)}`;
  return "unknown";
}

export function canonicalProductIdForSaleWithIdentities(sale: SaleLike, products: NorwynProductLike[], identities: ExternalIdentityLike[] = []) {
  const directIdentity = identities.find((identity) =>
    identity.source?.toLowerCase() === "hotmart" &&
    identity.external_id &&
    identity.external_id === sale.hotmart_product_id &&
    identity.revenue_scope !== "EXCLUDED" &&
    identity.product_id
  );
  if (directIdentity?.product_id) return directIdentity.product_id;
  return canonicalProductIdForSale(sale, products);
}

export function canonicalProductLabelForSale(sale: SaleLike, products: NorwynProductLike[]) {
  const product = products.find((item) => item.ativo !== false && matchProductToSale(item, sale));
  return product?.nome_oficial ?? sale.produto_nome ?? sale.hotmart_product_id ?? "Produto nao informado";
}

export function listCanonicalProductOptions(input: ProductIdentityInput): CanonicalProduct[] {
  const products = input.products ?? [];
  const sales = input.sales ?? [];
  const options = new Map<string, CanonicalProduct>();

  for (const product of products) {
    if (product.ativo === false) continue;
    options.set(product.id, {
      id: product.id,
      label: product.nome_oficial ?? product.produto_base ?? "Produto sem nome",
      source: "products",
      productId: product.id,
      hotmartProductId: productHotmartIds(product)[0] ?? null,
      evidence: "Produto cadastrado em products.",
    });
  }

  for (const identity of input.externalIdentities ?? []) {
    if (!identity.product_id || !identity.product_key) continue;
    const matchingProduct = products.find((product) => product.id === identity.product_id);
    const label = matchingProduct?.nome_oficial ?? identity.external_name ?? identity.product_key;
    options.set(identity.product_id, {
      id: identity.product_id,
      label,
      source: "products",
      productId: identity.product_id,
      hotmartProductId: identity.source?.toLowerCase() === "hotmart" ? identity.external_id ?? null : productHotmartIds(matchingProduct ?? { id: identity.product_id })[0] ?? null,
      evidence: `Identidade canonica ${identity.product_key} em norwyn_product_external_identities (${identity.confidence ?? "UNKNOWN"}).`,
    });
  }

  for (const product of input.comercialProducts ?? []) {
    if (product.ativo === false || !product.hotmart_product_id) continue;
    if ([...options.values()].some((option) => option.hotmartProductId === product.hotmart_product_id)) continue;
    options.set(`hotmart:${product.hotmart_product_id}`, {
      id: `hotmart:${product.hotmart_product_id}`,
      label: product.nome ?? knownHotmartProductName(product.hotmart_product_id) ?? `Hotmart ${product.hotmart_product_id}`,
      source: "comercial_produtos",
      productId: null,
      hotmartProductId: product.hotmart_product_id,
      evidence: "Produto cadastrado em comercial_produtos.",
    });
  }

  const hotmartIds = new Set<string>();
  for (const sale of sales) if (sale.hotmart_product_id) hotmartIds.add(sale.hotmart_product_id);
  for (const landing of input.landings ?? []) if (landing.hotmart_product_id) hotmartIds.add(landing.hotmart_product_id);

  for (const hotmartProductId of hotmartIds) {
    if ([...options.values()].some((option) => option.hotmartProductId === hotmartProductId)) continue;
    const matchingProduct = products.find((product) => product.ativo !== false && productHotmartIds(product).includes(hotmartProductId));
    if (matchingProduct) continue;
    const label = saleProductNameForHotmart(sales, hotmartProductId) ?? knownHotmartProductName(hotmartProductId) ?? `Hotmart ${hotmartProductId}`;
    const source = sales.some((sale) => sale.hotmart_product_id === hotmartProductId) ? "hotmart" : "landing_registry";
    options.set(`hotmart:${hotmartProductId}`, {
      id: `hotmart:${hotmartProductId}`,
      label,
      source,
      productId: null,
      hotmartProductId,
      evidence: source === "hotmart" ? "Produto inferido de comercial_vendas.hotmart_product_id." : "Produto inferido de norwyn_landing_registry.hotmart_product_id.",
    });
  }

  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
