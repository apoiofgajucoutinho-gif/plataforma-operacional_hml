"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, CalendarClock, CircleDollarSign, Clock3, Image as ImageIcon, Link2, Maximize2, PlayCircle, Route, ShieldCheck, ShieldQuestion, Sparkles, Target, Users, X } from "lucide-react";
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
  const engine = buildTrafficDecisions(ads.map((ad) => ({ key: ad.key, name: ad.row.anuncio, spend: ad.spend, impressions: ad.impressions, linkClicks: ad.linkClicks, lpv: ad.lpv, checkouts: ad.metaCheckouts, metaPurchases: ad.metaPurchases, linkCtr: ad.linkCtr, linkCpc: ad.linkCpc, days: ad.days })), context.decisionConfig, context.reconciliation);
  const recommendations = engine.actions;
  const audience = rows.find((row) => row.targeting_summary);
  const trend = trendSummary(rows, context.decisionConfig.minTrendDays, context.decisionConfig.minLinkClicksDecision);
  const strongestSignal = [...ads].sort((a, b) => (b.metaCheckouts * 20 + b.lpv * 2 + b.linkClicks) - (a.metaCheckouts * 20 + a.lpv * 2 + a.linkClicks))[0];
  const stages = [
    { label: "Anúncio exibido", value: total.impressions, source: "Meta Ads", confidence: "Alta", rate: null, divergence: "Impressões não são pessoas." },
    { label: "Clique no link", value: total.link, source: "Meta Ads", confidence: "Alta", rate: rate(total.link, total.impressions), divergence: "Clique não prova carregamento da página." },
    { label: "Visita real", value: campaignScoped ? context.reconciliation.norwyn.sessions : null, source: "Norwyn", confidence: campaignScoped ? "Média" : "Não determinada", rate: null, divergence: campaignScoped ? "Sem ad_id na UTM; não comparar 1:1 com os cliques pagos." : context.reconciliation.campaignScope.reason },
    { label: "Oferta vista", value: campaignScoped ? context.reconciliation.norwyn.offerViews : null, source: "Norwyn", confidence: campaignScoped ? "Alta" : "Não determinada", rate: campaignScoped && context.reconciliation.norwyn.sessions != null && context.reconciliation.norwyn.offerViews != null ? rate(context.reconciliation.norwyn.offerViews, context.reconciliation.norwyn.sessions) : null, divergence: campaignScoped ? "Evento próprio, distinto de LPV Meta." : "Aguardando escopo canônico da campanha." },
    { label: "Checkout", value: campaignScoped ? context.reconciliation.norwyn.checkoutClicks : null, source: "Norwyn", confidence: campaignScoped ? "Alta" : "Não determinada", rate: campaignScoped && context.reconciliation.norwyn.offerViews != null && context.reconciliation.norwyn.checkoutClicks != null ? rate(context.reconciliation.norwyn.checkoutClicks, context.reconciliation.norwyn.offerViews) : null, divergence: campaignScoped ? `${n(total.checkout)} InitiateCheckout na Meta; fontes não são somadas.` : "Aguardando escopo canônico da campanha." },
    { label: "Venda confirmada", value: campaignScoped ? context.reconciliation.hotmart.confirmedSales : null, source: "Hotmart", confidence: campaignScoped ? "Alta" : "Não determinada", rate: null, divergence: campaignScoped ? `${n(context.reconciliation.hotmart.attributedSales)} com atribuição Norwyn; anúncio não determinado.` : "Vendas do tenant não são creditadas a esta campanha." },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-clay">Traffic Intelligence V2.1</p><h2 className="mt-1 text-2xl font-bold text-brand-teal">Decisão executiva da campanha</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/65">Evidência suficiente + qualidade da mensuração + contexto + comparação justa + resultado comercial. O humano decide.</p></div><span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">V9 · {context.period.label}</span></div>

      <section className="rounded-[var(--ds-radius-lg)] bg-brand-teal p-5 text-white shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr_1fr]"><div><p className="text-xs font-bold uppercase text-white/60">Como está a campanha?</p><h3 className="mt-2 text-2xl font-bold">{context.reconciliation.measurement.quality === "Boa" ? "Leitura confiável para decisão assistida" : "Sinais úteis, mensuração ainda parcial"}</h3><p className="mt-3 text-sm leading-6 text-white/75">{answer.text}</p></div><DecisionSummary label="O que melhorou ou piorou" value={trend.label} detail={trend.detail} /><DecisionSummary label="Qual anúncio pede atenção" value={recommendations[0]?.adName ?? "Nenhum sinal crítico"} detail={recommendations[0]?.state ?? "Continuar coleta e revisão programada."} /></div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ExecutiveCard icon={<CircleDollarSign />} label="Onde investimos" value={money(total.spend)} detail={`${ads.length} anúncios identificados`} />
        <ExecutiveCard icon={<Users />} label="Quem recebeu" value={audience?.audience_label ?? audience?.audience_type ?? "Público Meta"} detail={audience?.targeting_summary?.replaceAll(" | ", " · ") ?? "Detalhe não disponível no recorte"} />
        <ExecutiveCard icon={<Sparkles />} label="Maior sinal atual" value={strongestSignal?.row.anuncio ?? "Sem dados"} detail={strongestSignal ? `${n(strongestSignal.linkClicks)} link clicks · ${n(strongestSignal.metaCheckouts)} checkout Meta` : "Aguardando coleta"} />
        <ExecutiveCard icon={<ShieldQuestion />} label="Conversão real" value={answer.status} detail={answer.text} tone={answer.tone} />
        <ExecutiveCard icon={<ShieldCheck />} label="Mensuração" value={context.reconciliation.measurement.quality} detail={context.reconciliation.measurement.reasons.join(" ")} tone={context.reconciliation.measurement.quality === "Boa" ? "neutral" : "warn"} />
      </div>

      <section><SectionHeading icon={<AlertTriangle />} title="O que fazer agora" subtitle="No máximo três ações. Nenhuma delas altera campanha, orçamento, público ou criativo automaticamente." />
        <div className="grid gap-4 xl:grid-cols-3">{recommendations.length ? recommendations.map((item) => <RecommendationCard key={`${item.state}:${item.adKey}`} item={item} />) : <Card className="p-6 text-sm font-semibold text-brand-teal/60">Nenhuma ação recomendada no período.</Card>}</div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5"><SectionHeading icon={<Clock3 />} title="Estamos esperando" subtitle="Decisões bloqueadas por amostra ou por uma chave de atribuição ausente." /><div className="space-y-3">{engine.waiting.length ? engine.waiting.map((item) => <div key={`wait:${item.adKey}`} className="border-t border-brand-sand pt-3"><p className="font-bold text-brand-teal">{item.adName}</p><p className="mt-1 text-sm text-brand-teal/65">{item.review}</p></div>) : <p className="text-sm text-brand-teal/60">Nenhuma decisão bloqueada.</p>}</div></Card>
        <Card className="p-5"><SectionHeading icon={<CalendarClock />} title="Progresso da campanha" subtitle="O tempo restante muda o contexto, mas não substitui evidência." /><dl className="grid grid-cols-2 gap-4"><MetricGroup title="Calendário" items={[["Início", dateLabel(context.campaignProgress.startsAt)], ["Fim", dateLabel(context.campaignProgress.endsAt)], ["Dias decorridos", n(context.campaignProgress.daysElapsed)], ["Dias restantes", n(context.campaignProgress.daysRemaining)]]} /><MetricGroup title="Investimento" items={[["Gasto", money(context.campaignProgress.spend)], ["Orçamento estimado", money(context.campaignProgress.budget)], ["Utilizado", pct(context.campaignProgress.budgetUsedPct)], ["Meta de CPA", money(context.decisionConfig.targetCpa)]]} /></dl></Card>
      </div>

      <section><SectionHeading icon={<Route />} title="Jornada observada" subtitle="As taxas só aparecem quando numerador e denominador pertencem a uma comparação coerente. Plataformas diferentes não precisam ser monotônicas." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">{stages.map((stage, index) => <Card key={stage.label} className="relative p-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-sky-800">{index + 1}</div><p className="mt-3 text-sm font-bold text-brand-teal/65">{stage.label}</p><p className="mt-1 text-3xl font-bold text-brand-teal">{n(stage.value)}</p><p className="mt-2 text-xs font-bold text-brand-clay">{stage.source} · confiança {stage.confidence.toLowerCase()}</p><p className="mt-2 text-xs leading-5 text-brand-teal/55">Taxa: {pct(stage.rate)}. {stage.divergence}</p></Card>)}</div>
      </section>

      <section><SectionHeading icon={<Target />} title="Performance por anúncio" subtitle="Identidade por ad_id; nomes do histórico são fallback. Resultado confirmado por anúncio permanece indisponível sem vínculo determinístico." />
        <div className="space-y-4">{ads.map((ad) => <AdPerformanceCard key={ad.key} ad={ad} decision={engine.decisions.find((item) => item.adKey === ad.key)} onExpand={() => setExpandedCreative(ad)} />)}</div>
      </section>

      <section><SectionHeading icon={<Link2 />} title="Reconciliação de fontes" subtitle="Cada fonte responde uma pergunta diferente. Os valores não são somados nem usados para preencher lacunas de outra fonte." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SourceCard title="Meta Ads" source="Graph API · janela Meta" rows={[["Link clicks", n(total.link)], ["LPV", n(total.lpv)], ["InitiateCheckout", n(total.checkout)], ["Meta Purchase", n(total.purchase)]]} />
          <SourceCard title="Site / Analytics" source={context.reconciliation.site.source} rows={[["Sessões", n(context.reconciliation.site.sessions)], ["Engajadas", n(context.reconciliation.site.engagedSessions)], ["Duração", context.reconciliation.site.averageSessionSeconds == null ? "Não disponível" : `${n(context.reconciliation.site.averageSessionSeconds)}s`], ["Cobertura", context.reconciliation.site.available ? "Disponível" : "Aguardando fonte"]]} footer={context.reconciliation.site.limitation} />
          <SourceCard title="Norwyn Tracking · campanha" source={context.reconciliation.norwyn.source} rows={[["Sessões reais", n(context.reconciliation.norwyn.sessions)], ["Paid social identificado", n(context.reconciliation.norwyn.paidSocialSessions)], ["Oferta vista", n(context.reconciliation.norwyn.offerViews)], ["Checkout click", n(context.reconciliation.norwyn.checkoutClicks)]]} footer={context.reconciliation.campaignScope.reason} />
          <SourceCard title="Hotmart · campanha" source={context.reconciliation.hotmart.source} rows={[["Vendas confirmadas", n(context.reconciliation.hotmart.confirmedSales)], ["Com bridge", n(context.reconciliation.hotmart.attributedSales)], ["Sem atribuição", n(context.reconciliation.hotmart.unattributedSales)], ["Receita confirmada", money(context.reconciliation.hotmart.confirmedRevenue)]]} footer="Escopo resolvido pela campaign key canônica. Venda confirmada não significa venda atribuída a um anúncio." />
        </div>
      </section>

      <section><SectionHeading icon={<BadgeCheck />} title="Memória de decisão" subtitle="Estrutura reaproveita norwyn_campaign_learnings. Ação e resultado só aparecem quando foram registrados como evidência." />
        {decisionMemory.length ? <div className="space-y-3">{decisionMemory.map((item) => <Card key={item.id} className="p-5"><div className="grid gap-4 md:grid-cols-4"><MemoryItem label="Detectado" value={item.detected} /><MemoryItem label="Recomendado" value={item.recommended} /><MemoryItem label="Ação tomada" value={item.actionTaken ?? "Ainda não registrada"} /><MemoryItem label="Resultado" value={item.result ?? "Aguardando acompanhamento"} /></div><p className="mt-4 text-xs font-semibold text-brand-teal/45">Confiança {item.confidence.toLowerCase()} · atualizado em {new Date(item.updatedAt).toLocaleDateString("pt-BR")}</p></Card>)}</div> : <Card className="p-6 text-sm font-semibold text-brand-teal/60">Nenhuma memória vinculada às campanhas Meta deste recorte. A estrutura Detectado → Recomendado → Ação tomada → Resultado já está pronta sem criar tabela paralela.</Card>}
      </section>
      {expandedCreative ? <CreativeLightbox ad={expandedCreative} onClose={() => setExpandedCreative(null)} /> : null}
    </div>
  );
}

function ExecutiveCard({ icon, label, value, detail, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "neutral" | "warn" | "bad" }) {
  return <Card className={clsx("min-h-48 p-5", tone === "warn" && "border-amber-300", tone === "bad" && "border-rose-300")}><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</div><p className="mt-4 text-xs font-bold uppercase text-brand-clay">{label}</p><p className="mt-2 text-xl font-bold leading-7 text-brand-teal">{value}</p><p className="mt-2 text-sm leading-5 text-brand-teal/60">{detail}</p></Card>;
}

function SectionHeading({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) { return <div className="mb-4 flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-white [&_svg]:h-4 [&_svg]:w-4">{icon}</div><div><h3 className="text-xl font-bold text-brand-teal">{title}</h3><p className="mt-1 text-sm leading-6 text-brand-teal/60">{subtitle}</p></div></div>; }

function RecommendationCard({ item }: { item: RecommendedAction }) { return <Card className="p-5"><span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-bold", item.state === "Divergência de mensuração" ? "bg-rose-50 text-rose-800" : item.state === "Sinal de atenção" || item.state === "Resultado contraditório" ? "bg-amber-50 text-amber-800" : item.state.includes("comercial") ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800")}>{item.state}</span><h4 className="mt-3 text-lg font-bold text-brand-teal">{item.action}</h4><p className="mt-1 text-sm font-semibold text-brand-teal/60">{item.adName}</p><dl className="mt-4 space-y-3 text-sm leading-6"><Field label="Por quê" value={item.why} /><Field label="Evidência" value={item.evidence} /><Field label="Confiança" value={`${item.confidence} — ${item.confidenceReason}`} /><Field label="Impacto esperado" value={item.impact} /><Field label="Quando revisar" value={item.review} /></dl></Card>; }

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
