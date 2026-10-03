"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, BadgeCheck, Bell, CalendarClock, CircleDollarSign, Clock3, Database, Gauge, Image as ImageIcon, Link2, Maximize2, PlayCircle, RefreshCw, Route, ShieldCheck, ShieldQuestion, Sparkles, Target, Users, X } from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import type { AdsContext, AdsDailyRow } from "@/modules/ads/types";
import { buildTrafficDecisions, type RecommendedAction } from "@/modules/ads/services/traffic-decision-engine";

type AdPerformance = {
  key: string;
  row: AdsDailyRow;
  days: number;
  spend: number;
  impressions: number;
  reachDaily: number;
  clicks: number;
  linkClicks: number;
  outboundClicks: number;
  lpv: number;
  metaCheckouts: number;
  metaPurchases: number;
  ctr: number;
  linkCtr: number | null;
  cpc: number | null;
  linkCpc: number | null;
  frequency: number | null;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function n(value: number | null) { return value == null ? "Não disponível" : numberFormatter.format(Math.round(value)); }
function money(value: number | null) { return value == null ? "Não disponível" : moneyFormatter.format(value); }
function pct(value: number | null) { return value == null ? "—" : `${percentFormatter.format(value)}%`; }
function rate(numerator: number, denominator: number) { return denominator > 0 ? (numerator / denominator) * 100 : null; }
function timestamp(value: string | null) { return value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Não disponível"; }

function trendSummary(rows: AdsDailyRow[], minDays: number, minClicks: number) {
  const byDay = new Map<string, { impressions: number; links: number; spend: number }>();
  rows.forEach((row) => {
    const current = byDay.get(row.data_referencia) ?? { impressions: 0, links: 0, spend: 0 };
    current.impressions += row.impressoes;
    current.links += Number(row.link_clicks ?? 0);
    current.spend += row.valor_gasto;
    byDay.set(row.data_referencia, current);
  });
  const days = [...byDay.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (days.length < minDays || days.reduce((sum, [, day]) => sum + day.links, 0) < minClicks) return { label: "Tendência ainda em formação", detail: `Exigimos pelo menos ${minDays} dias e ${minClicks} link clicks.` };
  const latest = days.at(-1)![1];
  const previous = days.slice(0, -1).reduce((acc, [, day]) => ({ impressions: acc.impressions + day.impressions, links: acc.links + day.links, spend: acc.spend + day.spend }), { impressions: 0, links: 0, spend: 0 });
  const latestCtr = rate(latest.links, latest.impressions) ?? 0;
  const previousCtr = rate(previous.links, previous.impressions) ?? 0;
  const latestCpc = latest.links ? latest.spend / latest.links : Infinity;
  const previousCpc = previous.links ? previous.spend / previous.links : Infinity;
  const ctrDelta = previousCtr ? (latestCtr - previousCtr) / previousCtr : 0;
  const cpcDelta = Number.isFinite(previousCpc) && previousCpc ? (latestCpc - previousCpc) / previousCpc : 0;
  if (ctrDelta >= 0.15 && cpcDelta <= 0.15) return { label: "Interesse melhorando", detail: `CTR de link subiu ${pct(ctrDelta * 100)}; CPC não piorou de forma relevante.` };
  if (ctrDelta <= -0.15 && cpcDelta >= -0.15) return { label: "Interesse piorando", detail: `CTR de link caiu ${pct(Math.abs(ctrDelta) * 100)}; revisar novamente antes de agir.` };
  return { label: "Interesse estável", detail: "A variação de CTR/CPC ficou dentro da faixa de 15%." };
}

export function buildAdPerformance(rows: AdsDailyRow[]): AdPerformance[] {
  const idByName = new Map(rows.filter((row) => row.ad_id).map((row) => [row.anuncio, row.ad_id!]));
  const groups = new Map<string, AdsDailyRow[]>();
  rows.forEach((row) => {
    const key = row.ad_id ?? idByName.get(row.anuncio) ?? `legacy:${row.anuncio}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return [...groups.entries()].map(([key, group]) => {
    const preferred = group.find((row) => row.ad_id && (row.thumbnail_url || row.creative_name)) ?? group.find((row) => row.ad_id) ?? group[0];
    const spend = group.reduce((sum, row) => sum + row.valor_gasto, 0);
    const impressions = group.reduce((sum, row) => sum + row.impressoes, 0);
    const clicks = group.reduce((sum, row) => sum + row.cliques, 0);
    const linkClicks = group.reduce((sum, row) => sum + Number(row.link_clicks ?? 0), 0);
    const weightedImpressions = group.reduce((sum, row) => sum + row.impressoes, 0);
    return {
      key, row: preferred, days: new Set(group.map((row) => row.data_referencia)).size, spend, impressions,
      reachDaily: group.reduce((sum, row) => sum + row.alcance, 0), clicks, linkClicks,
      outboundClicks: group.reduce((sum, row) => sum + Number(row.outbound_clicks ?? 0), 0),
      lpv: group.reduce((sum, row) => sum + Number(row.landing_page_views ?? 0), 0),
      metaCheckouts: group.reduce((sum, row) => sum + Number(row.initiate_checkouts ?? 0), 0),
      metaPurchases: group.reduce((sum, row) => sum + Number(row.meta_purchases ?? 0), 0),
      ctr: rate(clicks, impressions) ?? 0,
      linkCtr: rate(linkClicks, impressions), cpc: clicks ? spend / clicks : null, linkCpc: linkClicks ? spend / linkClicks : null,
      frequency: weightedImpressions ? group.reduce((sum, row) => sum + row.frequencia * row.impressoes, 0) / weightedImpressions : null,
    };
  }).sort((left, right) => right.spend - left.spend);
}

function purchaseAnswer(context: AdsContext, ads: AdPerformance[]) {
  const meta = ads.reduce((sum, ad) => sum + ad.metaPurchases, 0);
  const hotmart = context.reconciliation.hotmart;
  if (!context.reconciliation.campaignScope.resolved) return meta > 0
    ? { status: "Meta atribuiu, venda não localizada", text: "A Meta reportou compra, mas o mapeamento atual não permite localizar a venda Hotmart desta campanha nem determinar o anúncio.", tone: "bad" as const }
    : { status: "Atribuição incompleta", text: context.reconciliation.campaignScope.reason, tone: "warn" as const };
  if (hotmart.confirmedSales == null) return { status: "Não disponível", text: "A fonte Hotmart não respondeu para este período.", tone: "neutral" as const };
  if (hotmart.attributedSales && hotmart.attributedSales > 0) return { status: "Parcialmente confirmado", text: `${n(hotmart.attributedSales)} venda(s) possuem vínculo Norwyn, mas o anúncio não foi determinado pelas UTMs atuais.`, tone: "warn" as const };
  if (meta > 0 && hotmart.confirmedSales > 0) return { status: "Meta atribuiu, Hotmart confirmou, anúncio não determinado", text: "As duas fontes registram resultado no período, porém ainda não existe chave comum que prove qual anúncio originou cada venda.", tone: "warn" as const };
  if (meta > 0) return { status: "Meta atribuiu, venda não localizada", text: "Há Meta Purchase sem confirmação Hotmart reconciliada no recorte.", tone: "bad" as const };
  if (hotmart.confirmedSales > 0) return { status: "Venda confirmada sem atribuição determinística", text: "A Hotmart confirmou venda, mas ela não pode ser creditada a um anúncio.", tone: "warn" as const };
  return { status: "Sem compra confirmada no recorte", text: "Não há evidência suficiente para afirmar conversão comercial.", tone: "neutral" as const };
}

export function TrafficIntelligenceV2({ rows, context }: { rows: AdsDailyRow[]; context: AdsContext }) {
  const [expandedCreative, setExpandedCreative] = useState<AdPerformance | null>(null);
  const ads = buildAdPerformance(rows);
  const campaignIds = new Set(rows.map((row) => row.campaign_id).filter((value): value is string => Boolean(value)));
  const decisionMemory = context.decisionMemory.filter((item) => item.metaCampaignId && campaignIds.has(item.metaCampaignId));
  const total = ads.reduce((acc, ad) => ({ spend: acc.spend + ad.spend, impressions: acc.impressions + ad.impressions, link: acc.link + ad.linkClicks, lpv: acc.lpv + ad.lpv, checkout: acc.checkout + ad.metaCheckouts, purchase: acc.purchase + ad.metaPurchases }), { spend: 0, impressions: 0, link: 0, lpv: 0, checkout: 0, purchase: 0 });
  const answer = purchaseAnswer(context, ads);
  const campaignScoped = context.reconciliation.campaignScope.resolved;
  const metaFreshness = context.operations.freshness.find((source) => source.key === "meta");
  const engine = buildTrafficDecisions(ads.map((ad) => ({ key: ad.key, name: ad.row.anuncio, spend: ad.spend, impressions: ad.impressions, linkClicks: ad.linkClicks, lpv: ad.lpv, checkouts: ad.metaCheckouts, metaPurchases: ad.metaPurchases, linkCtr: ad.linkCtr, linkCpc: ad.linkCpc, days: ad.days })), context.decisionConfig, context.reconciliation, metaFreshness?.nextExpectedLabel, { status: context.operations.journeyHealth.operational });
  const recommendations = engine.actions;
  const audience = rows.find((row) => row.targeting_summary);
  const trend = trendSummary(rows, context.decisionConfig.minTrendDays, context.decisionConfig.minLinkClicksDecision);
  const strongestSignal = [...ads].sort((a, b) => (b.metaCheckouts * 20 + b.lpv * 2 + b.linkClicks) - (a.metaCheckouts * 20 + a.lpv * 2 + a.linkClicks))[0];
  const nextAction = recommendations[0];
  const stages = [
    { label: "Anúncio exibido", value: total.impressions, source: "Meta Ads", confidence: "Alta", rate: null, divergence: "Impressões não são pessoas." },
    { label: "Clique no link", value: total.link, source: "Meta Ads", confidence: "Alta", rate: rate(total.link, total.impressions), divergence: "Clique não prova carregamento da página." },
    { label: "Visita real", value: campaignScoped ? context.reconciliation.norwyn.sessions : null, source: "Norwyn", confidence: campaignScoped ? "Média" : "Não determinada", rate: null, divergence: campaignScoped ? context.operations.coverage.adIdSessions > 0 ? `${n(context.operations.coverage.adIdSessions)} sessão(ões) com ad_id; comparar somente a coorte identificada.` : "Sem ad_id nas sessões reais; não comparar 1:1 com cliques pagos." : context.reconciliation.campaignScope.reason },
    { label: "Oferta vista", value: campaignScoped ? context.reconciliation.norwyn.offerViews : null, source: "Norwyn", confidence: campaignScoped ? "Alta" : "Não determinada", rate: campaignScoped && context.reconciliation.norwyn.sessions != null && context.reconciliation.norwyn.offerViews != null ? rate(context.reconciliation.norwyn.offerViews, context.reconciliation.norwyn.sessions) : null, divergence: campaignScoped ? "Evento próprio, distinto de LPV Meta." : "Aguardando escopo canônico da campanha." },
    { label: "Checkout", value: campaignScoped ? context.reconciliation.norwyn.checkoutClicks : null, source: "Norwyn", confidence: campaignScoped ? "Alta" : "Não determinada", rate: campaignScoped && context.reconciliation.norwyn.offerViews != null && context.reconciliation.norwyn.checkoutClicks != null ? rate(context.reconciliation.norwyn.checkoutClicks, context.reconciliation.norwyn.offerViews) : null, divergence: campaignScoped ? `${n(total.checkout)} InitiateCheckout na Meta; fontes não são somadas.` : "Aguardando escopo canônico da campanha." },
    { label: "Venda confirmada", value: campaignScoped ? context.reconciliation.hotmart.confirmedSales : null, source: "Hotmart", confidence: campaignScoped ? "Alta" : "Não determinada", rate: null, divergence: campaignScoped ? `${n(context.reconciliation.hotmart.attributedSales)} com atribuição Norwyn; anúncio não determinado.` : "Vendas do tenant não são creditadas a esta campanha." },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-clay">Traffic Intelligence V2.1</p><h2 className="mt-1 text-2xl font-bold text-brand-teal">Decisão executiva da campanha</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/65">Evidência suficiente + qualidade da mensuração + contexto + comparação justa + resultado comercial. O humano decide.</p></div><span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">V9 · {context.period.label}</span></div>

      <section className="border-y border-brand-sand py-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{context.operations.freshness.map((source) => <FreshnessItem key={source.key} source={source} />)}</div>
      </section>

      <section className="rounded-[var(--ds-radius-lg)] bg-brand-teal p-5 text-white shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr_1fr]"><div><p className="text-xs font-bold uppercase text-white/60">Como está a campanha?</p><h3 className="mt-2 text-2xl font-bold">{context.operations.trackingHealth.quality === "Boa" ? "Dados confiáveis para decisão assistida" : "Sinais úteis, com pontos a validar"}</h3><p className="mt-3 text-sm leading-6 text-white/75">{answer.text}</p><p className="mt-3 text-xs font-bold text-white/60">Meta {metaFreshness?.status.toLowerCase() ?? "sem status"}{metaFreshness?.nextExpectedLabel ? ` · próxima coleta ${metaFreshness.nextExpectedLabel}` : ""}</p></div><DecisionSummary label="O que fazer agora" value={nextAction?.action ?? "Acompanhar"} detail={nextAction ? `${nextAction.adName} · ${nextAction.review}` : "Aguardar nova evidência antes de decidir."} /><DecisionSummary label="O que estamos esperando" value={engine.waiting[0]?.adName ?? "Próxima coleta"} detail={engine.waiting[0]?.review ?? metaFreshness?.detail ?? "Continuar acompanhamento."} /></div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ExecutiveCard icon={<CircleDollarSign />} label="Onde investimos" value={money(total.spend)} detail={`${ads.length} anúncios identificados`} />
        <ExecutiveCard icon={<CircleDollarSign />} label="Quanto vendemos" value={money(context.reconciliation.hotmart.confirmedRevenue)} detail={`${n(context.reconciliation.hotmart.confirmedSales)} venda(s) Hotmart confirmada(s)`} />
        <ExecutiveCard icon={<Sparkles />} label="Maior sinal atual" value={strongestSignal?.row.anuncio ?? "Sem dados"} detail={strongestSignal ? `${n(strongestSignal.linkClicks)} link clicks · ${n(strongestSignal.metaCheckouts)} checkout Meta` : "Aguardando coleta"} />
        <ExecutiveCard icon={<ShieldQuestion />} label="Conversão real" value={answer.status} detail={answer.text} tone={answer.tone} />
        <ExecutiveCard icon={<ShieldCheck />} label="Mensuração · Tracking Health" value={context.operations.trackingHealth.quality} detail={context.operations.trackingHealth.reason} tone={context.operations.trackingHealth.quality === "Boa" ? "neutral" : "warn"} />
        <ExecutiveCard icon={<Users />} label="Quem recebeu" value={audience?.audience_label ?? audience?.audience_type ?? "Público Meta"} detail={audience?.targeting_summary?.replaceAll(" | ", " · ") ?? "Detalhe não disponível no recorte"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-5"><SectionHeading icon={<Activity />} title="Saúde do tracking" subtitle="O que funciona, o que falta e como isso afeta a leitura." /><div className="grid gap-4 sm:grid-cols-2"><HealthList title="Funcionando" items={context.operations.trackingHealth.working} tone="good" /><HealthList title="Ainda falta" items={context.operations.trackingHealth.missing} tone="warn" /></div><div className="mt-4 border-t border-brand-sand pt-4 text-sm leading-6 text-brand-teal/70"><p><b>Impacto:</b> {context.operations.trackingHealth.impact}</p><p><b>Próxima ação:</b> {context.operations.trackingHealth.nextAction}</p></div></Card>
        <Card className="p-5"><SectionHeading icon={<Bell />} title="Alertas operacionais" subtitle="Somente situações fora da rotina ou que reduzem a confiança." /><div className="space-y-3">{context.operations.alerts.length ? context.operations.alerts.map((alert) => <div key={alert.id} className="border-t border-brand-sand pt-3 first:border-0 first:pt-0"><div className="flex items-center justify-between gap-3"><p className="font-bold text-brand-teal">{alert.title}</p><span className={clsx("rounded-full px-2.5 py-1 text-xs font-bold", alert.severity === "Crítico" ? "bg-rose-50 text-rose-800" : alert.severity === "Atenção" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800")}>{alert.severity}</span></div><p className="mt-1 text-sm leading-5 text-brand-teal/65">{alert.detail}</p><p className="mt-1 text-xs font-bold text-brand-clay">{alert.review}</p></div>) : <p className="text-sm font-semibold text-brand-teal/60">Nenhum alerta operacional no recorte.</p>}</div></Card>
      </div>

      <Card className="p-5"><SectionHeading icon={<ShieldCheck />} title="Saúde da jornada" subtitle="Disponibilidade operacional e qualidade da mensuração. Conversão comercial não define este status." /><div className="grid gap-4 sm:grid-cols-3"><MetricGroup title="Estado geral" items={[["Jornada operacional", context.operations.journeyHealth.status], ["Última verificação", timestamp(context.operations.journeyHealth.lastCheckedAt)]]} /><MetricGroup title="Camadas" items={[["LP e checkout", context.operations.journeyHealth.operational], ["Mensuração", context.operations.journeyHealth.measurement]]} /><div><p className="text-xs font-bold uppercase text-brand-clay">Por quê</p><ul className="mt-2 space-y-2 text-sm leading-5 text-brand-teal/65">{context.operations.journeyHealth.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div></div></Card>

      <section><SectionHeading icon={<AlertTriangle />} title="O que fazer agora" subtitle="No máximo três ações. Nenhuma delas altera campanha, orçamento, público ou criativo automaticamente." />
        <div className="grid gap-4 xl:grid-cols-3">{recommendations.length ? recommendations.map((item) => <RecommendationCard key={`${item.state}:${item.adKey}`} item={item} campaignId={context.reconciliation.campaignScope.campaignId} />) : <Card className="p-6 text-sm font-semibold text-brand-teal/60">Nenhuma ação recomendada no período.</Card>}</div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5"><SectionHeading icon={<Clock3 />} title="Estamos esperando" subtitle="Decisões bloqueadas por amostra ou por uma chave de atribuição ausente." /><div className="space-y-3">{engine.waiting.length ? engine.waiting.map((item) => <div key={`wait:${item.adKey}`} className="border-t border-brand-sand pt-3"><p className="font-bold text-brand-teal">{item.adName}</p><p className="mt-1 text-sm text-brand-teal/65">{item.review}</p></div>) : <p className="text-sm text-brand-teal/60">Nenhuma decisão bloqueada.</p>}</div></Card>
        <Card className="p-5"><SectionHeading icon={<CalendarClock />} title="Progresso da campanha" subtitle="O ritmo considera período, orçamento e frescor da coleta utilizada." /><dl className="grid grid-cols-2 gap-4"><MetricGroup title="Calendário" items={[["Início", dateLabel(context.campaignProgress.startsAt)], ["Fim", dateLabel(context.campaignProgress.endsAt)], ["Período decorrido", pct(context.campaignProgress.periodUsedPct)], ["Dias restantes", n(context.campaignProgress.daysRemaining)]]} /><MetricGroup title="Investimento" items={[["Gasto", money(context.campaignProgress.spend)], ["Orçamento", money(context.campaignProgress.budget)], ["Ritmo", context.campaignProgress.pacingState], ["Projeção", money(context.campaignProgress.projectedSpend)]]} /></dl><p className="mt-4 text-xs font-semibold text-brand-teal/50">Base Meta atualizada em {timestamp(context.campaignProgress.sourceUpdatedAt)}. Projeções antigas não são apresentadas como estado atual.</p></Card>
      </div>

      <section><SectionHeading icon={<Gauge />} title="LP Conversion Intelligence" subtitle="Sessões únicas por etapa. Gargalos são evidência observada, não explicação causal." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{context.operations.journey.map((stage) => <Card key={stage.key} className="p-4"><p className="text-xs font-bold uppercase text-brand-clay">{stage.source}</p><p className="mt-2 text-sm font-bold text-brand-teal/65">{stage.label}</p><p className="mt-1 text-3xl font-bold text-brand-teal">{n(stage.sessions)}</p><p className="mt-2 text-xs text-brand-teal/55">Avanço da etapa anterior: {pct(stage.rateFromPrevious)}</p></Card>)}</div>
        <p className="mt-3 text-xs leading-5 text-brand-teal/55">Dispositivo: não disponível no tracking canônico atual. Origem, campanha e anúncio só são atribuídos quando os respectivos IDs existem na sessão.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><SectionHeading icon={<Database />} title="Campaign ↔ LP Registry" subtitle="Vínculo canônico por IDs determinísticos." /><MetricGroup title="Contexto" items={[["Campanha", context.operations.registry.campaignName ?? "Não disponível"], ["Meta campaign_id", context.operations.registry.metaCampaignId ?? "Não disponível"], ["Landing", context.operations.registry.landingKey ?? "Não disponível"], ["Versão", context.operations.registry.version ?? "Não disponível"], ["Oferta", context.operations.registry.offerId ?? "Não disponível"], ["Pixel", context.operations.registry.pixelId ?? "Não disponível"]]} /></Card>
        <Card className="p-5"><SectionHeading icon={<RefreshCw />} title="O que mudou desde a última coleta" subtitle="Delta entre snapshots do mesmo dia e da mesma entidade. Não representa tendência." />{context.operations.intradayDelta.available ? <><MetricGroup title={`Desde ${context.operations.intradayDelta.since}`} items={[["Gasto", money(context.operations.intradayDelta.spend)], ["Link clicks", n(context.operations.intradayDelta.linkClicks)], ["Checkout", n(context.operations.intradayDelta.checkouts)], ["Meta Purchase", n(context.operations.intradayDelta.metaPurchases)]]} /><div className="mt-4 border-t border-brand-sand pt-3"><p className="text-xs font-bold uppercase text-brand-clay">Por anúncio</p><div className="mt-2 space-y-2">{context.operations.intradayDelta.perAd.slice(0, 6).map((ad) => <div key={ad.adId ?? ad.adName} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"><span className="min-w-0 truncate font-semibold text-brand-teal">{ad.adName}</span><span className="text-brand-teal/60 sm:shrink-0">{money(ad.spend)} · +{n(ad.linkClicks)} links · +{n(ad.checkouts)} checkout</span></div>)}</div></div></> : <p className="text-sm leading-6 text-brand-teal/65">{context.operations.intradayDelta.reason}</p>}</Card>
        <Card className="p-5"><SectionHeading icon={<ShieldQuestion />} title="Analytics / GA4" subtitle="Status da fonte analítica canônica." /><p className="text-xl font-bold text-brand-teal">Não integrado</p><p className="mt-2 text-sm leading-6 text-brand-teal/65">Nenhuma tabela, propriedade ou integração GA4 canônica foi localizada no HML. Relatório manual do Site Kit não é usado como fonte.</p><p className="mt-3 text-xs font-bold text-brand-clay">Dependência: integração somente leitura com propriedade GA4 validada.</p></Card>
      </div>

      <section><SectionHeading icon={<Route />} title="Jornada observada" subtitle="As taxas só aparecem quando numerador e denominador pertencem a uma comparação coerente. Plataformas diferentes não precisam ser monotônicas." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">{stages.map((stage, index) => <Card key={stage.label} className="relative p-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-sky-800">{index + 1}</div><p className="mt-3 text-sm font-bold text-brand-teal/65">{stage.label}</p><p className="mt-1 text-3xl font-bold text-brand-teal">{n(stage.value)}</p><p className="mt-2 text-xs font-bold text-brand-clay">{stage.source} · confiança {stage.confidence.toLowerCase()}</p><p className="mt-2 text-xs leading-5 text-brand-teal/55">Taxa: {pct(stage.rate)}. {stage.divergence}</p></Card>)}</div>
      </section>

      <section><SectionHeading icon={<Target />} title="Performance por anúncio" subtitle="Identidade por ad_id; nomes do histórico são fallback. Resultado confirmado por anúncio permanece indisponível sem vínculo determinístico." />
        <div className="space-y-4">{ads.map((ad) => <AdPerformanceCard key={ad.key} ad={ad} decision={engine.decisions.find((item) => item.adKey === ad.key)} onExpand={() => setExpandedCreative(ad)} />)}</div>
      </section>

      <section><SectionHeading icon={<Link2 />} title="Reconciliação de fontes" subtitle="Cada fonte responde uma pergunta diferente. Os valores não são somados nem usados para preencher lacunas de outra fonte." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SourceCard title="Meta Ads" source={`Graph API · atualizado ${timestamp(context.operations.freshness.find((item) => item.key === "meta")?.lastUpdatedAt ?? null)}`} rows={[["Link clicks", n(total.link)], ["LPV", n(total.lpv)], ["InitiateCheckout", n(total.checkout)], ["Meta Purchase", n(total.purchase)]]} footer={metaFreshness?.detail} />
          <SourceCard title="Site / Analytics" source={context.reconciliation.site.source} rows={[["Sessões", n(context.reconciliation.site.sessions)], ["Engajadas", n(context.reconciliation.site.engagedSessions)], ["Duração", context.reconciliation.site.averageSessionSeconds == null ? "Não disponível" : `${n(context.reconciliation.site.averageSessionSeconds)}s`], ["Cobertura", context.reconciliation.site.available ? "Disponível" : "Aguardando fonte"]]} footer={context.reconciliation.site.limitation} />
          <SourceCard title="Norwyn Tracking · campanha" source={`${context.reconciliation.norwyn.source} · último evento ${timestamp(context.operations.freshness.find((item) => item.key === "norwyn")?.lastUpdatedAt ?? null)}`} rows={[["Sessões reais", n(context.reconciliation.norwyn.sessions)], ["Paid social identificado", n(context.reconciliation.norwyn.paidSocialSessions)], ["Oferta vista", n(context.reconciliation.norwyn.offerViews)], ["Checkout click", n(context.reconciliation.norwyn.checkoutClicks)]]} footer={context.reconciliation.campaignScope.reason} />
          <SourceCard title="Hotmart · campanha" source={`${context.reconciliation.hotmart.source} · atualizado ${timestamp(context.operations.freshness.find((item) => item.key === "hotmart")?.lastUpdatedAt ?? null)}`} rows={[["Vendas confirmadas", n(context.reconciliation.hotmart.confirmedSales)], ["Com bridge", n(context.reconciliation.hotmart.attributedSales)], ["Sem atribuição", n(context.reconciliation.hotmart.unattributedSales)], ["Receita confirmada", money(context.reconciliation.hotmart.confirmedRevenue)]]} footer="Escopo resolvido pela campaign key canônica. Diferenças temporais entre fontes podem deixar a reconciliação incompleta." />
        </div>
      </section>

      <section><SectionHeading icon={<BadgeCheck />} title="Memória de decisão" subtitle="Estrutura reaproveita norwyn_campaign_learnings. Ação e resultado só aparecem quando foram registrados como evidência." />
        {decisionMemory.length ? <div className="space-y-3">{decisionMemory.map((item) => <Card key={item.id} className="p-5"><div className="grid gap-4 md:grid-cols-4"><MemoryItem label="Detectado" value={item.detected} /><MemoryItem label="Recomendado" value={item.recommended} /><MemoryItem label="Decisão humana" value={item.actionTaken ?? "Ainda não registrada"} /><MemoryItem label="Resultado" value={item.result ?? "Aguardando acompanhamento"} /></div>{!item.actionTaken && item.campaignId ? <DecisionFeedback campaignId={item.campaignId} learningId={item.id} detected={item.detected} recommended={item.recommended} /> : null}<p className="mt-4 text-xs font-semibold text-brand-teal/45">Confiança {item.confidence.toLowerCase()} · atualizado em {new Date(item.updatedAt).toLocaleDateString("pt-BR")}</p></Card>)}</div> : <Card className="p-6 text-sm font-semibold text-brand-teal/60">Nenhuma memória vinculada às campanhas Meta deste recorte. Uma decisão sobre as recomendações acima criará a primeira memória sem tabela paralela.</Card>}
      </section>
      {expandedCreative ? <CreativeLightbox ad={expandedCreative} onClose={() => setExpandedCreative(null)} /> : null}
    </div>
  );
}

function FreshnessItem({ source }: { source: AdsContext["operations"]["freshness"][number] }) {
  const tone = source.status === "Atualizado" || source.status === "Aguardando próxima coleta" ? "text-emerald-800" : source.status === "Não disponível" ? "text-brand-teal/55" : "text-amber-800";
  return <div className="min-w-0"><div className="flex items-center gap-2"><span className={clsx("h-2.5 w-2.5 rounded-full", source.status === "Atualizado" ? "bg-emerald-500" : source.status === "Aguardando próxima coleta" ? "bg-sky-500" : source.status === "Não disponível" ? "bg-slate-300" : "bg-amber-500")} /><p className="truncate text-sm font-bold text-brand-teal">{source.label}</p></div><p className={clsx("mt-1 text-sm font-bold", tone)}>{source.status}</p><p className="mt-1 text-xs leading-5 text-brand-teal/55">{source.lastUpdatedAt ? timestamp(source.lastUpdatedAt) : source.detail}{source.nextExpectedLabel ? ` · próxima ${source.nextExpectedLabel}` : ""}</p></div>;
}

function HealthList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" }) {
  return <div><p className={clsx("text-xs font-bold uppercase", tone === "good" ? "text-emerald-700" : "text-amber-700")}>{title}</p><ul className="mt-2 space-y-2">{items.length ? items.map((item) => <li key={item} className="text-sm leading-5 text-brand-teal/65">{item}</li>) : <li className="text-sm text-brand-teal/50">Nenhum item.</li>}</ul></div>;
}

function ExecutiveCard({ icon, label, value, detail, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "neutral" | "warn" | "bad" }) {
  return <Card className={clsx("min-h-48 p-5", tone === "warn" && "border-amber-300", tone === "bad" && "border-rose-300")}><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</div><p className="mt-4 text-xs font-bold uppercase text-brand-clay">{label}</p><p className="mt-2 text-xl font-bold leading-7 text-brand-teal">{value}</p><p className="mt-2 text-sm leading-5 text-brand-teal/60">{detail}</p></Card>;
}

function SectionHeading({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) { return <div className="mb-4 flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-white [&_svg]:h-4 [&_svg]:w-4">{icon}</div><div><h3 className="text-xl font-bold text-brand-teal">{title}</h3><p className="mt-1 text-sm leading-6 text-brand-teal/60">{subtitle}</p></div></div>; }

function RecommendationCard({ item, campaignId }: { item: RecommendedAction; campaignId: string | null }) {
  return <Card className="p-5"><span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-bold", item.state === "Divergência de mensuração" ? "bg-rose-50 text-rose-800" : item.state === "Sinal de atenção" || item.state === "Resultado contraditório" ? "bg-amber-50 text-amber-800" : item.state.includes("comercial") ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800")}>{item.state}</span><h4 className="mt-3 text-lg font-bold text-brand-teal">{item.action}</h4><p className="mt-1 text-sm font-semibold text-brand-teal/60">{item.adName}</p><dl className="mt-4 space-y-3 text-sm leading-6"><Field label="Por quê" value={item.why} /><Field label="Evidência" value={item.evidence} /><Field label="Confiança" value={`${item.confidence} — ${item.confidenceReason}`} /><Field label="Impacto esperado" value={item.impact} /><Field label="Quando revisar" value={item.review} /></dl>{campaignId ? <DecisionFeedback campaignId={campaignId} detected={`${item.state} · ${item.adName}`} recommended={item.action} item={item} /> : null}</Card>;
}

function DecisionFeedback({ campaignId, learningId, detected, recommended, item }: { campaignId: string; learningId?: string; detected: string; recommended: string; item?: RecommendedAction }) {
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(null);
  const [actionExecuted, setActionExecuted] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function save() {
    if (!choice || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ads/decision-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: campaignId, learning_id: learningId, decision: choice, action_executed: actionExecuted, observation, detected, recommended, ad_key: item?.adKey, ad_name: item?.adName, state: item?.state, evidence: item?.evidence, review: item?.review, confidence: item?.confidence }) });
      if (!response.ok) throw new Error("save_failed");
      setMessage("Decisão registrada.");
      router.refresh();
    } catch {
      setMessage("Não foi possível registrar agora.");
    } finally {
      setSaving(false);
    }
  }
  return <div className="mt-5 border-t border-brand-sand pt-4"><p className="text-xs font-bold uppercase text-brand-clay">Decisão humana</p><div className="mt-2 flex flex-wrap gap-2">{["Aceitei", "Ignorei", "Fiz diferente"].map((option) => <button key={option} type="button" onClick={() => setChoice(option)} className={clsx("rounded-full border px-3 py-2 text-xs font-bold", choice === option ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand text-brand-teal")}>{option}</button>)}</div>{choice ? <div className="mt-3 space-y-2"><input value={actionExecuted} onChange={(event) => setActionExecuted(event.target.value)} placeholder="Ação executada" className="h-10 w-full rounded-md border border-brand-sand px-3 text-sm text-brand-teal" /><textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Observação" rows={2} className="w-full rounded-md border border-brand-sand px-3 py-2 text-sm text-brand-teal" /><button type="button" onClick={save} disabled={saving} className="rounded-md bg-brand-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Salvando..." : "Registrar decisão"}</button></div> : null}{message ? <p className="mt-2 text-xs font-semibold text-brand-teal/60">{message}</p> : null}</div>;
}

function AdPerformanceCard({ ad, decision, onExpand }: { ad: AdPerformance; decision?: RecommendedAction; onExpand: () => void }) {
  const [image, setImage] = useState(ad.row.creative_image_url ?? ad.row.thumbnail_url);
  const isVideo = Boolean(ad.row.creative_video_id) || String(ad.row.creative_format ?? "").toLowerCase().includes("video");
  return <Card className="overflow-hidden"><div className="grid lg:grid-cols-[320px_1fr]">{image ? <button type="button" onClick={onExpand} className="group relative min-h-64 overflow-hidden bg-black/5" aria-label={`Ampliar prévia de ${ad.row.anuncio}`}><img src={image} alt={`Prévia de ${ad.row.anuncio}`} className="h-full min-h-64 w-full object-contain" loading="lazy" onError={() => setImage(image === ad.row.creative_image_url ? ad.row.thumbnail_url ?? null : null)} /><span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-teal shadow"><Maximize2 className="h-5 w-5" /></span>{isVideo ? <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-brand-teal px-3 py-1.5 text-xs font-bold text-white"><PlayCircle className="h-4 w-4" /> Vídeo</span> : null}</button> : <div className="flex min-h-52 items-center justify-center bg-brand-cream text-brand-teal/35"><ImageIcon className="h-10 w-10" /></div>}<div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-clay">{ad.row.creative_format ?? "Formato não disponível"} · ad_id {ad.row.ad_id ?? "legado sem ID"}</p><h4 className="mt-1 text-xl font-bold text-brand-teal">{ad.row.anuncio}</h4><p className="mt-1 text-sm font-semibold text-brand-teal/60">creative_id {ad.row.creative_id ?? "não disponível"}</p></div>{ad.row.preview_url ? <a href={ad.row.preview_url} target="_blank" rel="noreferrer" className="rounded-full border border-brand-sand px-4 py-2 text-sm font-bold text-brand-teal">Abrir preview</a> : null}</div>{decision ? <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">{decision.state} · {decision.action}</p> : null}<p className="mt-4 font-semibold text-brand-teal">{ad.row.creative_headline ?? ad.row.creative_name ?? "Headline não disponível"}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-brand-teal/60">{ad.row.creative_body ?? "Copy não disponível na fonte atual."}</p><div className="mt-4 grid gap-4 md:grid-cols-4"><MetricGroup title="Entrega" items={[["Spend", money(ad.spend)], ["Impressões", n(ad.impressions)], ["Alcance diário acum.", n(ad.reachDaily)], ["Frequência aprox.", ad.frequency == null ? "—" : percentFormatter.format(ad.frequency)]]} /><MetricGroup title="Interesse" items={[["Cliques", n(ad.clicks)], ["Link clicks", n(ad.linkClicks)], ["Outbound", n(ad.outboundClicks)], ["CTR / CPC", `${pct(ad.linkCtr)} · ${money(ad.linkCpc)}`]]} /><MetricGroup title="Pós-clique" items={[["LPV Meta", n(ad.lpv)], ["Sessões Site", "Não disponível"], ["Sessões Norwyn", "Anúncio não determinado"], ["Checkout", n(ad.metaCheckouts)]]} /><MetricGroup title="Resultado" items={[["Meta Purchase", n(ad.metaPurchases)], ["Hotmart", "Anúncio não determinado"], ["Norwyn attributed", "Anúncio não determinado"], ["CPA confirmado", "Não disponível"]]} /></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-brand-teal/65"><span className="rounded-full bg-brand-cream px-3 py-1">CTA: {ad.row.creative_cta ?? "não disponível"}</span><span className="rounded-full bg-brand-cream px-3 py-1">Destino: {ad.row.destination_domain ?? ad.row.destination_url ?? "não disponível"}</span><span className="rounded-full bg-brand-cream px-3 py-1">Landing: {ad.row.landing_key ?? "resolvida pelo campaign registry"}</span></div></div></div></Card>;
}

function CreativeLightbox({ ad, onClose }: { ad: AdPerformance; onClose: () => void }) { const image = ad.row.creative_image_url ?? ad.row.thumbnail_url; return <div role="dialog" aria-modal="true" aria-label={`Criativo ${ad.row.anuncio}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}><div className="relative max-h-[92vh] max-w-5xl overflow-hidden rounded-lg bg-white p-3" onClick={(event) => event.stopPropagation()}><button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-teal shadow"><X className="h-5 w-5" /></button>{image ? <img src={image} alt={`Criativo ${ad.row.anuncio}`} className="max-h-[80vh] w-auto max-w-full object-contain" /> : null}<p className="p-3 text-center font-bold text-brand-teal">{ad.row.anuncio}</p></div></div>; }

function DecisionSummary({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="border-t border-white/20 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><p className="text-xs font-bold uppercase text-white/55">{label}</p><p className="mt-2 text-lg font-bold">{value}</p><p className="mt-2 text-sm leading-5 text-white/70">{detail}</p></div>; }
function dateLabel(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Não disponível"; }

function MetricGroup({ title, items }: { title: string; items: Array<[string, string]> }) { return <div><p className="text-xs font-bold uppercase text-brand-clay">{title}</p><dl className="mt-2 space-y-2">{items.map(([label, value]) => <div key={label}><dt className="text-xs text-brand-teal/50">{label}</dt><dd className="text-sm font-bold text-brand-teal">{value}</dd></div>)}</dl></div>; }
function SourceCard({ title, source, rows, footer }: { title: string; source: string; rows: Array<[string, string]>; footer?: string }) { return <Card className="p-5"><h4 className="text-lg font-bold text-brand-teal">{title}</h4><p className="mt-1 text-xs font-semibold text-brand-clay">{source}</p><dl className="mt-4 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 border-b border-brand-sand/60 pb-2"><dt className="text-sm text-brand-teal/60">{label}</dt><dd className="text-right text-sm font-bold text-brand-teal">{value}</dd></div>)}</dl>{footer ? <p className="mt-4 text-xs leading-5 text-brand-teal/50">{footer}</p> : null}</Card>; }
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold text-brand-clay">{label}</dt><dd className="text-brand-teal/70">{value}</dd></div>; }
function MemoryItem({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase text-brand-clay">{label}</p><p className="mt-1 text-sm font-semibold leading-6 text-brand-teal">{value}</p></div>; }
