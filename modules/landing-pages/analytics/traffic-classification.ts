function domainOf(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  try { return new URL(value).hostname.toLowerCase(); } catch { return ""; }
}

export function technicalTrafficReason(row: any): string | null {
  const sck = String(row.sck ?? "").toLowerCase();
  const trafficType = String(row.payload?.traffic_type ?? row.payload?.event_data?.traffic_type ?? "").toLowerCase();
  const medium = String(row.utm_medium ?? "").toLowerCase();
  const campaign = String(row.utm_campaign ?? "").toLowerCase();
  const pageUrl = String(row.page_url ?? "");
  const host = domainOf(row.page_url);
  if (row.source_type === "SIMULATED") return "Evento classificado como SIMULATED";
  if (["test", "internal", "smoke", "simulated"].includes(trafficType)) return `traffic_type=${trafficType}`;
  if (["qa", "test", "internal", "smoke", "simulated"].includes(medium)) return `utm_medium=${medium}`;
  if (/(^|_)(qa|test|smoke|validation|denied)(_|$)/.test(campaign)) return "Campanha técnica de validação";
  if (/[?&](bridge_test|meta_pixel_test)=1(?:&|$)/.test(pageUrl)) return "Parâmetro técnico de validação";
  if (row.payload?.smoke === true || row.payload?.simulated === true || row.payload?.is_test === true) return "Marcador técnico explícito";
  if (["teste123", "qa_endpoint"].includes(sck) || /^(test|teste|qa|smoke)[_:-]/.test(sck)) return "Chave técnica de teste";
  if (["lp-ju.vercel.app", "v0-zumbidoju.vercel.app"].includes(host)) return "Host técnico de preview";
  return null;
}

export function isKnownTestTraffic(row: any) {
  return technicalTrafficReason(row) !== null;
}

export function humanOrigin(sourceValue: string | null | undefined, mediumValue: string | null | undefined, contentValue: string | null | undefined) {
  const source = String(sourceValue ?? "").toLowerCase();
  const medium = String(mediumValue ?? "").toLowerCase();
  const content = String(contentValue ?? "").toLowerCase();
  if (source === "instagram" && content === "stories") return "Instagram · Stories";
  if (source === "instagram" && content === "bio") return "Instagram · Link da bio";
  if (source === "whatsapp" && (medium === "group" || content === "grupo_whatsapp")) return "WhatsApp · Grupo";
  if (source === "site" && content === "site_juliana") return "Site Juliana";
  if (source === "meta" && medium === "paid") return "Meta Ads";
  if (!source) return "Direto";
  return source.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function externalReferrer(row: any) {
  const value = row.payload?.referrer ?? row.payload?.document_referrer ?? row.payload?.event_data?.referrer;
  if (typeof value !== "string" || !value) return null;
  try {
    const referrerHost = new URL(value).hostname;
    const pageHost = domainOf(row.page_url);
    return referrerHost && referrerHost !== pageHost ? referrerHost : null;
  } catch { return null; }
}

export function eventOrigin(row: any) {
  if (row.utm_source) return humanOrigin(row.utm_source, row.utm_medium, row.utm_content);
  const hasPaidContext = Boolean(row.fbclid || row.meta_campaign_id || row.meta_adset_id || row.meta_ad_id);
  if (hasPaidContext || row.sck || externalReferrer(row)) return "Origem não identificada";
  return "Direto";
}

export function unknownOriginReason(row: any) {
  if (row.fbclid || row.meta_campaign_id || row.meta_adset_id || row.meta_ad_id) return "Contexto pago sem UTM de origem";
  if (row.sck) return "source_sck sem origem resolvida";
  if (externalReferrer(row)) return "Referência externa sem parâmetros de atribuição";
  return "Causa não determinada";
}
