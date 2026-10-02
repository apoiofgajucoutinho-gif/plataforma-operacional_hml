import type { AdsFreshnessState, AdsOperationalAlert, AdsSourceFreshness, AdsTrackingHealth } from "@/modules/ads/types";

export const META_COLLECTION_MINUTES = [510, 630, 750, 870, 990, 1110, 1230, 1350] as const;
const TIME_ZONE = "America/Sao_Paulo";

type ZonedParts = { date: string; minutes: number };

function zonedParts(value: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));
  return { date: `${pick("year")}-${pick("month")}-${pick("day")}`, minutes: hour * 60 + minute };
}

function addLocalDays(date: string, amount: number) {
  const instant = new Date(`${date}T12:00:00-03:00`);
  instant.setUTCDate(instant.getUTCDate() + amount);
  return zonedParts(instant).date;
}

function scheduleInstant(date: string, minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hour}:${minute}:00-03:00`).toISOString();
}

function timeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function ageMinutes(lastUpdatedAt: string | null, now: Date) {
  if (!lastUpdatedAt) return null;
  const parsed = new Date(lastUpdatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 60000));
}

export function metaFreshness(lastUpdatedAt: string | null, now = new Date()): AdsSourceFreshness {
  const nowLocal = zonedParts(now);
  const parsedLast = lastUpdatedAt ? new Date(lastUpdatedAt) : null;
  const lastLocal = parsedLast && !Number.isNaN(parsedLast.getTime()) ? zonedParts(parsedLast) : null;
  const first = META_COLLECTION_MINUTES[0];
  const last = META_COLLECTION_MINUTES.at(-1)!;
  let expectedDate = nowLocal.date;
  let expectedMinute: number = first;
  let nextDate = nowLocal.date;
  let nextMinute: number = first;
  let overnight = false;

  if (nowLocal.minutes < first) {
    expectedDate = addLocalDays(nowLocal.date, -1);
    expectedMinute = last;
    nextMinute = first;
    overnight = true;
  } else {
    expectedMinute = [...META_COLLECTION_MINUTES].reverse().find((minute) => minute <= nowLocal.minutes) ?? first;
    const next = META_COLLECTION_MINUTES.find((minute) => minute > nowLocal.minutes);
    if (next == null) {
      nextDate = addLocalDays(nowLocal.date, 1);
      nextMinute = first;
      overnight = true;
    } else {
      nextMinute = next;
    }
  }

  const nextExpectedAt = scheduleInstant(nextDate, nextMinute);
  const nextExpectedLabel = timeLabel(nextMinute);
  const age = ageMinutes(lastUpdatedAt, now);
  if (!lastLocal || age == null) {
    return { key: "meta", label: "Meta Ads", lastUpdatedAt: null, status: "Sem coleta recente", detail: `Nenhuma coleta localizada. Próxima janela ${nextExpectedLabel}.`, nextExpectedAt, nextExpectedLabel, ageMinutes: null };
  }

  const expectedAt = new Date(scheduleInstant(expectedDate, expectedMinute));
  const graceEndsAt = new Date(expectedAt.getTime() + 30 * 60000);
  const latestAt = parsedLast!;
  const metExpectedWindow = latestAt.getTime() >= expectedAt.getTime() - 20 * 60000;
  let status: AdsFreshnessState;
  let detail: string;

  if (metExpectedWindow) {
    status = overnight ? "Aguardando próxima coleta" : "Atualizado";
    detail = overnight
      ? `Última coleta operacional concluída; próxima prevista às ${nextExpectedLabel}.`
      : `Dentro da janela esperada; próxima coleta prevista às ${nextExpectedLabel}.`;
  } else if (now.getTime() < graceEndsAt.getTime()) {
    status = "Aguardando próxima coleta";
    detail = `A janela das ${timeLabel(expectedMinute)} está em processamento; aguarde até 30 minutos.`;
  } else {
    const expectedSlots = META_COLLECTION_MINUTES.filter((minute) => minute <= expectedMinute);
    const latestMinute = lastLocal.date === expectedDate ? lastLocal.minutes : -1;
    const missed = expectedSlots.filter((minute) => minute > latestMinute).length;
    status = missed >= 2 || age > 300 ? "Sem coleta recente" : "Atrasado";
    detail = `${missed || 1} janela(s) esperada(s) sem atualização. Próxima prevista às ${nextExpectedLabel}.`;
  }

  return { key: "meta", label: "Meta Ads", lastUpdatedAt, status, detail, nextExpectedAt, nextExpectedLabel, ageMinutes: age };
}

export function sourceFreshness(key: "hotmart" | "norwyn" | "ga4", label: string, lastUpdatedAt: string | null, now = new Date()): AdsSourceFreshness {
  const age = ageMinutes(lastUpdatedAt, now);
  if (age == null) return { key, label, lastUpdatedAt: null, status: "Não disponível", detail: key === "ga4" ? "GA4 não integrado à fonte canônica." : "Fonte sem timestamp disponível.", nextExpectedAt: null, nextExpectedLabel: null, ageMinutes: null };
  const status: AdsFreshnessState = age <= 120 ? "Atualizado" : age <= 360 ? "Aguardando próxima coleta" : age <= 720 ? "Atrasado" : "Sem coleta recente";
  const detail = key === "norwyn" ? "Horário do último evento real recebido; ausência de evento não prova falha de coleta." : `Última atualização há ${age} min.`;
  return { key, label, lastUpdatedAt, status, detail, nextExpectedAt: null, nextExpectedLabel: null, ageMinutes: age };
}

type HealthInput = {
  campaignRegistered: boolean;
  landingRegistered: boolean;
  pixelKnown: boolean;
  metaStatus: AdsFreshnessState;
  sessions: number;
  campaignIdSessions: number;
  adsetIdSessions: number;
  adIdSessions: number;
  fbclidSessions: number;
  sckSessions: number;
  checkoutPreserved: boolean;
  hotmartSourceSck: number;
  divergenceCount: number;
};

export function trackingHealth(input: HealthInput): AdsTrackingHealth {
  const working: string[] = [];
  const missing: string[] = [];
  if (input.campaignRegistered) working.push("Campanha registrada por Meta ID."); else missing.push("Campaign registry não resolvido.");
  if (input.landingRegistered) working.push("Landing Page registrada."); else missing.push("Landing Page não registrada.");
  if (input.pixelKnown) working.push("Pixel conhecido no contexto da campanha."); else missing.push("Pixel não identificado no registry/snapshot.");
  if (["Atualizado", "Aguardando próxima coleta"].includes(input.metaStatus)) working.push("V9 dentro da janela operacional."); else missing.push("Meta Ads fora da janela esperada.");
  if (input.sessions > 0 && input.campaignIdSessions > 0) working.push("Há sessões com campaign_id."); else missing.push("Sessões reais ainda não carregam campaign_id.");
  if (input.adsetIdSessions > 0 && input.adIdSessions > 0) working.push("Há atribuição por ad set e anúncio."); else missing.push("adset_id/ad_id ainda ausentes nas sessões reais.");
  if (input.fbclidSessions > 0) working.push("fbclid observado em tráfego real."); else missing.push("fbclid não observado no recorte.");
  if (input.sckSessions > 0 && input.checkoutPreserved) working.push("sck preservado até o checkout."); else missing.push("Cobertura de sck/checkout ainda incompleta.");
  if (input.hotmartSourceSck > 0) working.push("Hotmart retornou source_sck."); else missing.push("Nenhuma venda Hotmart com source_sck no recorte.");
  if (input.divergenceCount > 0) missing.push(`${input.divergenceCount} divergência(s) exigem validação.`);
  const critical = !input.campaignRegistered || !input.landingRegistered || input.metaStatus === "Sem coleta recente";
  const quality: AdsTrackingHealth["quality"] = critical ? "Fraca" : missing.length <= 2 ? "Boa" : "Parcial";
  return {
    quality,
    reason: quality === "Boa" ? "As chaves principais e as fontes estão coerentes no recorte." : quality === "Parcial" ? "A leitura é útil, mas ainda existem lacunas de atribuição ou recência." : "Uma dependência estrutural ou fonte crítica está indisponível.",
    working,
    missing,
    impact: quality === "Boa" ? "Recomendações podem usar o funil completo com revisão humana." : quality === "Parcial" ? "Reduz a confiança para decisões por anúncio e reconciliação comercial." : "Não tratar o retrato atual como base suficiente para mudança de mídia.",
    nextAction: missing[0] ?? "Acompanhar a próxima coleta e a reconciliação Hotmart.",
  };
}

export function operationalAlerts(input: {
  meta: AdsSourceFreshness;
  health: AdsTrackingHealth;
  activeCampaign: boolean;
  spend: number;
  linkClicks: number;
  lpv: number;
  checkoutClicks: number;
  metaPurchases: number;
  hotmartSales: number;
  attributedSales: number;
  sessions: number;
  adIdSessions: number;
  sourceSckSessions: number;
}): AdsOperationalAlert[] {
  const alerts: AdsOperationalAlert[] = [];
  const review = input.meta.nextExpectedLabel ? `Revisar após a coleta das ${input.meta.nextExpectedLabel}.` : "Revisar quando a fonte for atualizada.";
  if (["Atrasado", "Sem coleta recente"].includes(input.meta.status)) alerts.push({ id: "meta_freshness", severity: input.meta.status === "Sem coleta recente" ? "Crítico" : "Atenção", title: "Meta Ads sem atualização esperada", detail: input.meta.detail, review });
  if (input.health.quality !== "Boa") alerts.push({ id: "tracking_health", severity: input.health.quality === "Fraca" ? "Crítico" : "Atenção", title: `Tracking Health ${input.health.quality.toLowerCase()}`, detail: input.health.reason, review });
  if (input.activeCampaign && input.spend <= 0) alerts.push({ id: "active_no_spend", severity: "Atenção", title: "Campanha ativa sem gasto", detail: "Não há gasto no recorte atual; isso pode refletir entrega ou atualização pendente.", review });
  if (input.spend > 0 && input.sessions === 0) alerts.push({ id: "lp_no_traffic", severity: "Crítico", title: "Gasto sem sessão Norwyn", detail: "Há investimento Meta, mas nenhuma sessão real foi localizada para a LP registrada.", review });
  if (input.linkClicks >= 10 && input.lpv < input.linkClicks * 0.25) alerts.push({ id: "click_lpv_gap", severity: "Atenção", title: "Cliques e LPV divergentes", detail: `${input.linkClicks} link clicks e ${input.lpv} LPVs Meta. Verificar semântica, consentimento e carregamento.`, review });
  if (input.checkoutClicks > 0 && input.hotmartSales === 0) alerts.push({ id: "checkout_no_sale", severity: "Informação", title: "Checkout sem venda confirmada", detail: "Existem cliques de checkout sem confirmação Hotmart no mesmo recorte; isso não prova falha.", review: "Revisar após a próxima atualização Hotmart." });
  if (input.metaPurchases > 0 && input.hotmartSales === 0) alerts.push({ id: "meta_no_hotmart", severity: "Atenção", title: "Meta Purchase sem Hotmart", detail: "A Meta atribuiu compra, mas a fonte financeira ainda não confirmou a transação.", review: "Revisar após a próxima atualização Hotmart." });
  if (input.hotmartSales > input.attributedSales) alerts.push({ id: "hotmart_unattributed", severity: "Informação", title: "Venda Hotmart sem atribuição completa", detail: `${input.hotmartSales - input.attributedSales} venda(s) confirmada(s) sem vínculo Norwyn determinístico.`, review: "Revisar quando houver novo source_sck reconciliado." });
  if (input.sessions > 0 && input.adIdSessions === 0) alerts.push({ id: "session_no_ad", severity: "Atenção", title: "Sessões sem ad_id", detail: "O canal pode ser identificado, mas o anúncio de origem não pode ser determinado.", review });
  if (input.checkoutClicks > 0 && input.sourceSckSessions === 0) alerts.push({ id: "checkout_no_sck", severity: "Atenção", title: "Checkout sem source_sck", detail: "O checkout foi observado, mas nenhuma sessão do recorte possui a chave de reconciliação.", review: "Revisar após novo checkout rastreado." });
  return alerts.slice(0, 8);
}
