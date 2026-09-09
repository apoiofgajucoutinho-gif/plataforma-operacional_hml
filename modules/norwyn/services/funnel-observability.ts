import type { GrowthFunnelType, GrowthMetric } from "@/modules/norwyn/services/growth-intelligence";
import type { NorwynAdsRow, NorwynFunnelEvent } from "@/modules/norwyn/types";

export type FunnelStepObservation = {
  key: string;
  label: string;
  value: number | null;
  source: "Meta Ads" | "Norwyn Tracking" | "Hotmart" | "Indisponivel";
  confidence: "alta" | "media" | "baixa" | "indisponivel";
  note: string;
};

export type FunnelObservabilityResult = {
  steps: FunnelStepObservation[];
  conversions: GrowthMetric[];
  coverage: Array<{ label: string; status: "ok" | "warning" | "critical"; detail: string }>;
  trackingSnippet: string;
  vslAdapterContract: string[];
};

const requiredByType: Record<GrowthFunnelType, Array<{ key: string; label: string; event?: NorwynFunnelEvent["event_type"] }>> = {
  venda_direta: [
    { key: "impressions", label: "Impressao" },
    { key: "clicks", label: "Clique" },
    { key: "landing", label: "Landing", event: "LANDING_VIEW" },
    { key: "checkout", label: "Checkout", event: "CHECKOUT" },
    { key: "purchase", label: "Compra", event: "PURCHASE" },
  ],
  perpetuo: [
    { key: "impressions", label: "Impressao" },
    { key: "clicks", label: "Clique" },
    { key: "landing", label: "Landing", event: "LANDING_VIEW" },
    { key: "checkout", label: "Checkout", event: "CHECKOUT" },
    { key: "purchase", label: "Compra", event: "PURCHASE" },
  ],
  vsl: [
    { key: "impressions", label: "Impressao" },
    { key: "clicks", label: "Clique" },
    { key: "landing", label: "Landing", event: "LANDING_VIEW" },
    { key: "vsl_play", label: "Play VSL", event: "VSL_PLAY" },
    { key: "vsl_75", label: "Consumo VSL 75%", event: "VSL_PROGRESS_75" },
    { key: "cta", label: "CTA", event: "VSL_CTA_VIEW" },
    { key: "checkout", label: "Checkout", event: "CHECKOUT" },
    { key: "purchase", label: "Compra", event: "PURCHASE" },
    { key: "order_bump", label: "Order bump", event: "ORDER_BUMP" },
    { key: "upsell", label: "Upsell", event: "UPSELL" },
  ],
  lancamento: [
    { key: "impressions", label: "Impressao" },
    { key: "leads", label: "Lead" },
    { key: "landing", label: "Captacao", event: "LANDING_VIEW" },
    { key: "cta", label: "Evento/aula/oferta", event: "CTA" },
    { key: "checkout", label: "Checkout", event: "CHECKOUT" },
    { key: "purchase", label: "Venda", event: "PURCHASE" },
  ],
  captacao: [
    { key: "impressions", label: "Impressao" },
    { key: "clicks", label: "Clique" },
    { key: "landing", label: "Landing", event: "LANDING_VIEW" },
    { key: "leads", label: "Lead" },
  ],
  webinar_aula: [
    { key: "impressions", label: "Impressao" },
    { key: "leads", label: "Inscricao" },
    { key: "cta", label: "Comparecimento/oferta", event: "CTA" },
    { key: "checkout", label: "Checkout", event: "CHECKOUT" },
    { key: "purchase", label: "Venda", event: "PURCHASE" },
  ],
  remarketing: [
    { key: "impressions", label: "Impressao" },
    { key: "clicks", label: "Clique" },
    { key: "checkout", label: "Checkout", event: "CHECKOUT" },
    { key: "purchase", label: "Compra", event: "PURCHASE" },
  ],
  outro: [
    { key: "impressions", label: "Impressao" },
    { key: "clicks", label: "Clique" },
    { key: "purchase", label: "Conversao", event: "PURCHASE" },
  ],
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metric(key: string, label: string, value: number | null, explanation: string): GrowthMetric {
  const available = value !== null && Number.isFinite(value);
  return {
    key,
    label,
    value: available ? value : null,
    formatted: available ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%` : "Dados indisponiveis",
    available,
    explanation,
  };
}

function nonComparableMetric(key: string, label: string, explanation: string): GrowthMetric {
  return {
    key,
    label,
    value: null,
    formatted: "Metrica nao comparavel diretamente",
    available: false,
    explanation,
  };
}

function percent(from: number | null, to: number | null) {
  if (from === null || to === null || from <= 0) return null;
  return (to / from) * 100;
}

function countEvents(events: NorwynFunnelEvent[], eventType: NorwynFunnelEvent["event_type"]) {
  return events.filter((event) => event.event_type === eventType && event.environment !== "test").length;
}

export function buildFunnelObservability(input: {
  funnelType: GrowthFunnelType;
  adsRows: NorwynAdsRow[];
  funnelEvents: NorwynFunnelEvent[];
  purchases: number;
}) {
  const hasAdsData = input.adsRows.length > 0;
  const impressions = input.adsRows.reduce((sum, row) => sum + asNumber(row.impressoes), 0);
  const clicks = input.adsRows.reduce((sum, row) => sum + asNumber(row.cliques), 0);
  const linkClicks = input.adsRows.reduce((sum, row) => sum + asNumber(row.link_clicks), 0);
  const metaLandingPageViews = input.adsRows.reduce((sum, row) => sum + asNumber(row.landing_page_views), 0);
  const metaCheckouts = input.adsRows.reduce((sum, row) => sum + asNumber(row.initiate_checkouts), 0);
  const leads = input.adsRows.reduce((sum, row) => sum + asNumber(row.leads), 0);
  const eventCount = input.funnelEvents.filter((event) => event.environment !== "test").length;

  const values: Record<string, FunnelStepObservation> = {
    impressions: {
      key: "impressions",
      label: "Impressao",
      value: hasAdsData ? impressions : null,
      source: hasAdsData ? "Meta Ads" : "Indisponivel",
      confidence: hasAdsData ? "alta" : "indisponivel",
      note: "Somatorio de instagram_ads_daily.impressoes.",
    },
    clicks: {
      key: "clicks",
      label: "Clique",
      value: hasAdsData ? (linkClicks || clicks) : null,
      source: hasAdsData ? "Meta Ads" : "Indisponivel",
      confidence: hasAdsData ? (linkClicks ? "alta" : "media") : "indisponivel",
      note: linkClicks ? "Usando action link_click do Meta." : "Usando cliques totais do Meta porque link_click nao esta disponivel.",
    },
    leads: {
      key: "leads",
      label: "Lead",
      value: hasAdsData ? leads : null,
      source: hasAdsData ? "Meta Ads" : "Indisponivel",
      confidence: hasAdsData ? "media" : "indisponivel",
      note: "Leads vindos de actions Meta quando existem.",
    },
    landing: {
      key: "landing",
      label: "Landing",
      value: countEvents(input.funnelEvents, "LANDING_VIEW") || null,
      source: countEvents(input.funnelEvents, "LANDING_VIEW") ? "Norwyn Tracking" : "Indisponivel",
      confidence: countEvents(input.funnelEvents, "LANDING_VIEW") ? "alta" : "indisponivel",
      note: metaLandingPageViews
        ? `Norwyn LANDING_VIEW ausente; Meta landing_page_view observado separadamente: ${metaLandingPageViews}.`
        : "LANDING_VIEW Norwyn ainda nao instrumentado.",
    },
    checkout: {
      key: "checkout",
      label: "Checkout",
      value: countEvents(input.funnelEvents, "CHECKOUT") || null,
      source: countEvents(input.funnelEvents, "CHECKOUT") ? "Norwyn Tracking" : "Indisponivel",
      confidence: countEvents(input.funnelEvents, "CHECKOUT") ? "alta" : "indisponivel",
      note: metaCheckouts ? `Meta initiate_checkout observado separadamente: ${metaCheckouts}.` : "CHECKOUT Norwyn ainda nao instrumentado.",
    },
    purchase: {
      key: "purchase",
      label: "Compra",
      value: input.purchases || countEvents(input.funnelEvents, "PURCHASE") || (hasAdsData || eventCount ? 0 : null),
      source: input.purchases ? "Hotmart" : countEvents(input.funnelEvents, "PURCHASE") ? "Norwyn Tracking" : hasAdsData || eventCount ? "Hotmart" : "Indisponivel",
      confidence: input.purchases ? "alta" : countEvents(input.funnelEvents, "PURCHASE") ? "media" : hasAdsData || eventCount ? "media" : "indisponivel",
      note: input.purchases ? "Compras confirmadas via comercial_vendas/Hotmart." : "Compra ainda sem evento ou venda confirmada.",
    },
  };

  for (const eventType of ["VSL_PLAY", "VSL_PROGRESS_75", "CTA", "VSL_CTA_VIEW", "VSL_CTA_CLICK", "ORDER_BUMP", "UPSELL"] as const) {
    const key = eventType.toLowerCase();
    const count = countEvents(input.funnelEvents, eventType);
    const normalizedKey = key === "vsl_progress_75" ? "vsl_75" : key === "vsl_cta_view" ? "cta" : key;
    values[normalizedKey] = {
      key,
      label: eventType,
      value: count || null,
      source: count ? "Norwyn Tracking" : "Indisponivel",
      confidence: count ? "alta" : "indisponivel",
      note: count ? "Evento Norwyn observado." : `${eventType} ainda nao instrumentado.`,
    };
  }

  const steps = requiredByType[input.funnelType].map((step) => values[step.key] ?? {
    key: step.key,
    label: step.label,
    value: null,
    source: "Indisponivel" as const,
    confidence: "indisponivel" as const,
    note: "Etapa sem dados disponiveis.",
  });

  return {
    steps,
    conversions: [
      metric("impression_click", "Impressao -> clique", percent(impressions, linkClicks || clicks), "Meta Ads."),
      metaLandingPageViews > (linkClicks || clicks) && (linkClicks || clicks) > 0
        ? nonComparableMetric("click_meta_lpv", "Clique -> Meta landing_page_view", `Meta LPV (${metaLandingPageViews}) maior que cliques/link_clicks (${linkClicks || clicks}); metricas Meta podem ter definicoes/agregacoes diferentes.`)
        : metric("click_meta_lpv", "Clique -> Meta landing_page_view", percent(linkClicks || clicks, metaLandingPageViews || null), "Meta Ads; nao substitui LANDING_VIEW Norwyn."),
      metric("landing_checkout", "Norwyn landing -> checkout", percent(values.landing.value, values.checkout.value), "Eventos Norwyn."),
      metric("checkout_purchase", "Checkout -> compra", percent((values.checkout.value ?? metaCheckouts) || null, input.purchases || null), "Checkout Norwyn quando existir; fallback apenas observacional para Meta initiate_checkout."),
      metric("vsl_play_cta", "VSL play -> CTA", percent(values.vsl_play?.value ?? null, values.cta?.value ?? null), "Eventos Norwyn."),
      metric("purchase_upsell", "Compra -> upsell", percent(input.purchases || null, values.upsell?.value ?? null), "Eventos Norwyn."),
    ],
    coverage: [
      {
        label: "Instagram Ads Analytics",
        status: input.adsRows.length ? "ok" : "critical",
        detail: input.adsRows.length ? `${input.adsRows.length} linhas de midia no recorte.` : "Sem linhas de midia no recorte.",
      },
      {
        label: "Meta Landing Page Views",
        status: metaLandingPageViews ? "ok" : "warning",
        detail: metaLandingPageViews ? `${metaLandingPageViews} landing_page_view(s) Meta observados.` : "Meta landing_page_view ausente no recorte.",
      },
      {
        label: "Norwyn Funnel Events",
        status: eventCount ? "ok" : "warning",
        detail: eventCount ? `${eventCount} evento(s) Norwyn no recorte.` : "Sem eventos LANDING/VSL/CTA/CHECKOUT instrumentados ainda.",
      },
      {
        label: "Hotmart Purchase",
        status: input.purchases ? "ok" : "warning",
        detail: input.purchases ? `${input.purchases} compra(s) confirmadas.` : "Sem compra confirmada no recorte.",
      },
    ],
    trackingSnippet: [
      "<script>",
      "(function(){",
      "  var sid = localStorage.getItem('norwyn_funnel_session_id') || crypto.randomUUID();",
      "  localStorage.setItem('norwyn_funnel_session_id', sid);",
      "  var params = new URLSearchParams(location.search);",
      "  navigator.sendBeacon('/api/norwyn/funnel-events', JSON.stringify({",
      "    funnel_session_id: sid,",
      "    event_type: 'LANDING_VIEW',",
      "    page_url: location.href,",
      "    source_sck: params.get('sck'),",
      "    meta_campaign_id: params.get('campaign_id') || params.get('utm_id'),",
      "    meta_adset_id: params.get('adset_id'),",
      "    meta_ad_id: params.get('ad_id')",
      "  }));",
      "}());",
      "</script>",
    ].join("\n"),
    vslAdapterContract: [
      "track('VSL_PLAY') quando o player iniciar.",
      "track('VSL_PROGRESS_25/50/75/90') por marco real de consumo.",
      "track('CTA') quando o CTA aparecer ou for clicado, mantendo a distincao no metadata.",
      "Nunca registrar prova, promessa ou resultado clinico como fato sem origem no produto/evidence.",
    ],
  } satisfies FunnelObservabilityResult;
}
