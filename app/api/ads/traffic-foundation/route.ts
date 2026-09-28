import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { aggregateTrafficAd, resolveLanding, type TrafficFoundationDailyRow } from "@/modules/ads/services/traffic-data-foundation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseAny = any;

async function context() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  const dataClient: SupabaseAny = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) return { error: "Nao autenticado.", status: 401 as const };
  const local = user ? null : await getLocalBypassMembership(dataClient);
  const { data: membership } = local ? { data: local } : await dataClient.from("tenant_members").select("tenant_id, role").eq("user_id", currentUser.id).eq("ativo", true).limit(1).maybeSingle();
  if (!membership) return { error: "Usuario sem tenant ativo.", status: 403 as const };
  const { data: permission } = await dataClient.from("tenant_module_permissions").select("can_read").eq("tenant_id", membership.tenant_id).eq("role", membership.role).eq("module", "ads").maybeSingle();
  if (membership.role !== "ADMIN" && !permission?.can_read) return { error: "Sem permissao para Ads.", status: 403 as const };
  return { dataClient, tenantId: String(membership.tenant_id) };
}

export async function GET(request: Request) {
  const auth = await context();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const url = new URL(request.url);
  const adId = url.searchParams.get("ad_id")?.trim();
  const adName = url.searchParams.get("ad_name")?.trim();
  if (!adId && !adName) return NextResponse.json({ error: "Informe ad_id ou ad_name." }, { status: 400 });

  let adsQuery = auth.dataClient.from("instagram_ads_daily")
    .select("data_referencia,campaign_id,adset_id,ad_id,creative_id,creative_name,campanha,conjunto,anuncio,valor_gasto,impressoes,destination_url,destination_domain,url_tags,landing_key,raw_payload")
    .eq("tenant_id", auth.tenantId).order("data_referencia", { ascending: false }).limit(500);
  adsQuery = adId ? adsQuery.eq("ad_id", adId) : adsQuery.eq("anuncio", adName);

  const [{ data: rows, error }, { data: landings }, { data: campaigns }] = await Promise.all([
    adsQuery,
    auth.dataClient.from("norwyn_landing_registry").select("landing_key,url,product_id,campaign_key,hotmart_product_id,metadata").eq("tenant_id", auth.tenantId),
    auth.dataClient.from("campaigns").select("id,name,product_id,plan_json").eq("tenant_id", auth.tenantId),
  ]);
  if (error) return NextResponse.json({ error: "Falha ao consultar dados Ads." }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ error: "Anuncio nao encontrado." }, { status: 404 });

  const typedRows = rows as TrafficFoundationDailyRow[];
  const aggregate = aggregateTrafficAd(typedRows);
  const landingResolution = resolveLanding(typedRows, (landings ?? []).map((landing: any) => ({
    landing_key: String(landing.landing_key), url: String(landing.url), product_id: landing.product_id ? String(landing.product_id) : null,
    campaign_key: landing.campaign_key ? String(landing.campaign_key) : null,
    checkout_url: typeof landing.metadata?.checkout_url === "string"
      ? landing.metadata.checkout_url
      : landing.hotmart_product_id
        ? `https://pay.hotmart.com/${landing.hotmart_product_id}${landing.metadata?.checkout_offer_id ? `?off=${landing.metadata.checkout_offer_id}` : ""}`
        : null,
  })));
  const campaign = (campaigns ?? []).find((item: any) => item.product_id && item.product_id === landingResolution.landing?.product_id) ?? null;
  const minDate = typedRows.at(-1)?.data_referencia;
  const maxDate = typedRows[0]?.data_referencia;
  let salesQuery = auth.dataClient.from("comercial_vendas")
    .select("transaction_id,valor_bruto,sale_confirmed,status_normalizado,data_compra,source_sck")
    .eq("tenant_id", auth.tenantId).ilike("source_sck", `%${aggregate.identity.ad_id ?? "__missing__"}%`).limit(500);
  if (minDate) salesQuery = salesQuery.gte("data_compra", minDate);
  if (maxDate) salesQuery = salesQuery.lte("data_compra", `${maxDate}T23:59:59.999Z`);
  const { data: sales } = await salesQuery;
  const confirmed = (sales ?? []).filter((sale: any) => sale.sale_confirmed === true || ["APPROVED", "COMPLETED"].includes(String(sale.status_normalizado ?? "").toUpperCase()));

  return NextResponse.json({
    ...aggregate,
    resolution: {
      campaign: campaign ? { id: campaign.id, name: campaign.name, confidence: "high", reason: "produto da campanha corresponde ao produto da LP" } : { id: null, name: null, confidence: "unresolved", reason: "campanha Norwyn nao resolvida" },
      landing: { landing_key: landingResolution.landing?.landing_key ?? null, confidence: landingResolution.confidence, reason: landingResolution.reason, evidence: landingResolution.evidence },
      product: { id: landingResolution.landing?.product_id ?? campaign?.product_id ?? null, confidence: landingResolution.landing ? landingResolution.confidence : "unresolved" },
      checkout: { url: landingResolution.landing?.checkout_url ?? null, confidence: landingResolution.landing?.checkout_url ? "high" : "unresolved" },
    },
    reconciliation: {
      meta_reported_purchases: aggregate.metrics.meta_purchases,
      confirmed_sales: confirmed.length,
      confirmed_gross_value: confirmed.reduce((sum: number, sale: any) => sum + Number(sale.valor_bruto ?? 0), 0),
      matched_transactions: confirmed.map((sale: any) => sale.transaction_id),
      confidence: confirmed.length ? "high" : "unresolved",
      reason: confirmed.length ? "ad_id exato em source_sck, limitado ao periodo observado do anuncio" : "nenhuma venda Hotmart reconciliavel por ad_id e periodo; nao significa ausencia de vendas",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
