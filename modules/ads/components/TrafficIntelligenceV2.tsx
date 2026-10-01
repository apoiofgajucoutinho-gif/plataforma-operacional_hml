"use client";

import { AlertTriangle, BadgeCheck, CircleDollarSign, Eye, Image as ImageIcon, Link2, MousePointerClick, Route, ShieldQuestion, Sparkles, Target, Users } from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import type { AdsContext, AdsDailyRow } from "@/modules/ads/types";

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

type Recommendation = {
  state: "Evidência comercial forte" | "Sinal promissor" | "Precisa de mais dados" | "Sinal de atenção" | "Divergência de mensuração";
  title: string;
  action: string;
  why: string;
  evidence: string;
  sample: string;
  confidence: "Baixa" | "Média" | "Alta";
  limitation: string;
  review: string;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function n(value: number | null) { return value == null ? "Não disponível" : numberFormatter.format(Math.round(value)); }
function money(value: number | null) { return value == null ? "Não disponível" : moneyFormatter.format(value); }
function pct(value: number | null) { return value == null ? "—" : `${percentFormatter.format(value)}%`; }
function rate(numerator: number, denominator: number) { return denominator > 0 ? (numerator / denominator) * 100 : null; }

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

function recommendationsForAds(ads: AdPerformance[], context: AdsContext): Recommendation[] {
  const period = context.period.label.toLowerCase();
  const recommendations: Recommendation[] = [];
  ads.forEach((ad) => {
    const name = ad.row.anuncio;
    if (ad.metaPurchases > 0) recommendations.push({ state: "Divergência de mensuração", title: `${name}: compra Meta sem anúncio confirmado na Hotmart`, action: "Conferir a reconciliação após novas vendas com source_sck e ad_id/utm_content determinístico.", why: "A Meta atribuiu compra, mas a venda confirmada ainda não consegue ser ligada a este anúncio.", evidence: `${n(ad.metaPurchases)} Meta Purchase · ${n(ad.metaCheckouts)} InitiateCheckout · ${money(ad.spend)} investidos.`, sample: `${n(ad.impressions)} impressões e ${n(ad.linkClicks)} link clicks em ${period}.`, confidence: "Alta", limitation: "Meta Purchase não é venda Hotmart confirmada e as UTMs atuais identificam canal, não ad_id.", review: "Após a próxima reconciliação Hotmart com atribuição determinística." });
    else if (ad.linkClicks >= 15 && ad.lpv < ad.linkClicks * 0.25) recommendations.push({ state: "Sinal de atenção", title: `${name}: cliques e poucos LPVs Meta`, action: "Validar cobertura do evento e carregamento da LP antes de alterar campanha ou criativo.", why: "A passagem de clique no link para LPV está bem abaixo do volume de saída.", evidence: `${n(ad.linkClicks)} link clicks · ${n(ad.outboundClicks)} outbound · ${n(ad.lpv)} LPVs.`, sample: `${n(ad.impressions)} impressões em ${ad.days} dia(s).`, confidence: "Média", limitation: "Diferença pode vir de semântica, consentimento, janela ou carregamento.", review: "Em 24–48h com a mesma configuração de coleta." });
    else if (ad.linkClicks < 10) recommendations.push({ state: "Precisa de mais dados", title: `${name}: amostra inicial`, action: "Acompanhar sem declarar vencedor, perdedor ou necessidade de pausa.", why: "Ainda há poucos cliques no link para avaliar qualidade pós-clique.", evidence: `${n(ad.linkClicks)} link clicks · CTR ${pct(ad.ctr)} · ${money(ad.spend)} investidos.`, sample: `${n(ad.impressions)} impressões em ${ad.days} dia(s).`, confidence: "Baixa", limitation: "Pequenas variações mudam muito as taxas.", review: "Ao atingir 20 link clicks ou acumular mais três dias de entrega." });
    else if (ad.metaCheckouts > 0) recommendations.push({ state: "Sinal promissor", title: `${name}: avanço até checkout Meta`, action: "Manter em observação e buscar confirmação comercial antes de aumentar investimento.", why: "O anúncio gerou sinal pós-clique, mas ainda falta venda atribuída de forma determinística.", evidence: `${n(ad.metaCheckouts)} InitiateCheckout · ${n(ad.lpv)} LPVs · ${n(ad.linkClicks)} link clicks.`, sample: `${n(ad.impressions)} impressões em ${period}.`, confidence: "Média", limitation: "O volume de LPV e checkout pode divergir por semântica Meta.", review: "Após novas vendas Hotmart ou mais 20 link clicks." });
  });
  const priority = { "Divergência de mensuração": 0, "Sinal de atenção": 1, "Sinal promissor": 2, "Precisa de mais dados": 3, "Evidência comercial forte": 4 };
  return recommendations.sort((a, b) => priority[a.state] - priority[b.state]).slice(0, 3);
}

function purchaseAnswer(context: AdsContext, ads: AdPerformance[]) {
  const meta = ads.reduce((sum, ad) => sum + ad.metaPurchases, 0);
  const hotmart = context.reconciliation.hotmart;
  if (hotmart.confirmedSales == null) return { status: "Não disponível", text: "A fonte Hotmart não respondeu para este período.", tone: "neutral" as const };
  if (hotmart.attributedSales && hotmart.attributedSales > 0) return { status: "Parcialmente confirmado", text: `${n(hotmart.attributedSales)} venda(s) possuem vínculo Norwyn, mas o anúncio não foi determinado pelas UTMs atuais.`, tone: "warn" as const };
  if (meta > 0 && hotmart.confirmedSales > 0) return { status: "Meta atribuiu, Hotmart confirmou, anúncio não determinado", text: "As duas fontes registram resultado no período, porém ainda não existe chave comum que prove qual anúncio originou cada venda.", tone: "warn" as const };
  if (meta > 0) return { status: "Meta atribuiu, venda não localizada", text: "Há Meta Purchase sem confirmação Hotmart reconciliada no recorte.", tone: "bad" as const };
  if (hotmart.confirmedSales > 0) return { status: "Venda confirmada sem atribuição determinística", text: "A Hotmart confirmou venda, mas ela não pode ser creditada a um anúncio.", tone: "warn" as const };
  return { status: "Sem compra confirmada no recorte", text: "Não há evidência suficiente para afirmar conversão comercial.", tone: "neutral" as const };
}

export function TrafficIntelligenceV2({ rows, context }: { rows: AdsDailyRow[]; context: AdsContext }) {
  const ads = buildAdPerformance(rows);
  const campaignIds = new Set(rows.map((row) => row.campaign_id).filter((value): value is string => Boolean(value)));
  const decisionMemory = context.decisionMemory.filter((item) => item.metaCampaignId && campaignIds.has(item.metaCampaignId));
  const total = ads.reduce((acc, ad) => ({ spend: acc.spend + ad.spend, impressions: acc.impressions + ad.impressions, link: acc.link + ad.linkClicks, lpv: acc.lpv + ad.lpv, checkout: acc.checkout + ad.metaCheckouts, purchase: acc.purchase + ad.metaPurchases }), { spend: 0, impressions: 0, link: 0, lpv: 0, checkout: 0, purchase: 0 });
  const answer = purchaseAnswer(context, ads);
  const recommendations = recommendationsForAds(ads, context);
  const audience = rows.find((row) => row.targeting_summary);
  const strongestSignal = [...ads].sort((a, b) => (b.metaCheckouts * 20 + b.lpv * 2 + b.linkClicks) - (a.metaCheckouts * 20 + a.lpv * 2 + a.linkClicks))[0];
  const stages = [
    { label: "Anúncio exibido", value: total.impressions, source: "Meta Ads", confidence: "Alta", rate: null, divergence: "Impressões não são pessoas." },
    { label: "Clique no link", value: total.link, source: "Meta Ads", confidence: "Alta", rate: rate(total.link, total.impressions), divergence: "Clique não prova carregamento da página." },
    { label: "Visita real", value: context.reconciliation.norwyn.sessions, source: "Norwyn · todas as origens", confidence: "Média", rate: null, divergence: "Sem ad_id na UTM; não comparar 1:1 com os cliques pagos." },
    { label: "Oferta vista", value: context.reconciliation.norwyn.offerViews, source: "Norwyn · REAL", confidence: "Alta", rate: context.reconciliation.norwyn.sessions == null || context.reconciliation.norwyn.offerViews == null ? null : rate(context.reconciliation.norwyn.offerViews, context.reconciliation.norwyn.sessions), divergence: "Evento próprio, distinto de LPV Meta." },
    { label: "Checkout", value: context.reconciliation.norwyn.checkoutClicks, source: "Norwyn · REAL", confidence: "Alta", rate: context.reconciliation.norwyn.offerViews == null || context.reconciliation.norwyn.checkoutClicks == null ? null : rate(context.reconciliation.norwyn.checkoutClicks, context.reconciliation.norwyn.offerViews), divergence: `${n(total.checkout)} InitiateCheckout na Meta; fontes não são somadas.` },
    { label: "Venda confirmada", value: context.reconciliation.hotmart.confirmedSales, source: "Hotmart", confidence: "Alta", rate: null, divergence: `${n(context.reconciliation.hotmart.attributedSales)} com atribuição Norwyn; anúncio não determinado.` },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-clay">Traffic Intelligence V2</p><h2 className="mt-1 text-2xl font-bold text-brand-teal">Da entrega à venda, sem misturar as fontes</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/65">Leitura assistida. Nenhuma recomendação pausa, escala ou altera mídia automaticamente.</p></div><span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">V9 · {context.period.label}</span></div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveCard icon={<CircleDollarSign />} label="Onde investimos" value={money(total.spend)} detail={`${ads.length} anúncios identificados`} />
        <ExecutiveCard icon={<Users />} label="Quem recebeu" value={audience?.audience_label ?? audience?.audience_type ?? "Público Meta"} detail={audience?.targeting_summary?.replaceAll(" | ", " · ") ?? "Detalhe não disponível no recorte"} />
        <ExecutiveCard icon={<Sparkles />} label="Maior sinal atual" value={strongestSignal?.row.anuncio ?? "Sem dados"} detail={strongestSignal ? `${n(strongestSignal.linkClicks)} link clicks · ${n(strongestSignal.metaCheckouts)} checkout Meta` : "Aguardando coleta"} />
        <ExecutiveCard icon={<ShieldQuestion />} label="Conversão real" value={answer.status} detail={answer.text} tone={answer.tone} />
      </div>

      <section><SectionHeading icon={<AlertTriangle />} title="O que merece atenção agora" subtitle="Até três leituras priorizadas, sempre com evidência e condição de revisão." />
        <div className="grid gap-4 xl:grid-cols-3">{recommendations.length ? recommendations.map((item) => <RecommendationCard key={`${item.state}:${item.title}`} item={item} />) : <Card className="p-6 text-sm font-semibold text-brand-teal/60">Nenhuma regra V2 acionou uma recomendação no período.</Card>}</div>
      </section>

      <section><SectionHeading icon={<Route />} title="Jornada observada" subtitle="As taxas só aparecem quando numerador e denominador pertencem a uma comparação coerente. Plataformas diferentes não precisam ser monotônicas." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">{stages.map((stage, index) => <Card key={stage.label} className="relative p-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sm font-black text-sky-800">{index + 1}</div><p className="mt-3 text-sm font-bold text-brand-teal/65">{stage.label}</p><p className="mt-1 text-3xl font-bold text-brand-teal">{n(stage.value)}</p><p className="mt-2 text-xs font-bold text-brand-clay">{stage.source} · confiança {stage.confidence.toLowerCase()}</p><p className="mt-2 text-xs leading-5 text-brand-teal/55">Taxa: {pct(stage.rate)}. {stage.divergence}</p></Card>)}</div>
      </section>

      <section><SectionHeading icon={<Target />} title="Performance por anúncio" subtitle="Identidade por ad_id; nomes do histórico são fallback. Resultado confirmado por anúncio permanece indisponível sem vínculo determinístico." />
        <div className="space-y-4">{ads.map((ad) => <AdPerformanceCard key={ad.key} ad={ad} />)}</div>
      </section>

      <section><SectionHeading icon={<Link2 />} title="Reconciliação de fontes" subtitle="Cada fonte responde uma pergunta diferente. Os valores não são somados nem usados para preencher lacunas de outra fonte." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SourceCard title="Meta Ads" source="Graph API · janela Meta" rows={[["Link clicks", n(total.link)], ["LPV", n(total.lpv)], ["InitiateCheckout", n(total.checkout)], ["Meta Purchase", n(total.purchase)]]} />
          <SourceCard title="Site / Analytics" source={context.reconciliation.site.source} rows={[["Sessões", n(context.reconciliation.site.sessions)], ["Engajadas", n(context.reconciliation.site.engagedSessions)], ["Duração", context.reconciliation.site.averageSessionSeconds == null ? "Não disponível" : `${n(context.reconciliation.site.averageSessionSeconds)}s`], ["Cobertura", context.reconciliation.site.available ? "Disponível" : "Aguardando fonte"]]} footer={context.reconciliation.site.limitation} />
          <SourceCard title="Norwyn Tracking" source={context.reconciliation.norwyn.source} rows={[["Sessões reais", n(context.reconciliation.norwyn.sessions)], ["Paid social", n(context.reconciliation.norwyn.paidSocialSessions)], ["Oferta vista", n(context.reconciliation.norwyn.offerViews)], ["Checkout click", n(context.reconciliation.norwyn.checkoutClicks)]]} />
          <SourceCard title="Hotmart" source={context.reconciliation.hotmart.source} rows={[["Vendas confirmadas", n(context.reconciliation.hotmart.confirmedSales)], ["Com bridge", n(context.reconciliation.hotmart.attributedSales)], ["Sem atribuição", n(context.reconciliation.hotmart.unattributedSales)], ["Receita confirmada", money(context.reconciliation.hotmart.confirmedRevenue)]]} footer="Venda confirmada não significa venda atribuída a um anúncio." />
        </div>
      </section>

      <section><SectionHeading icon={<BadgeCheck />} title="Memória de decisão" subtitle="Estrutura reaproveita norwyn_campaign_learnings. Ação e resultado só aparecem quando foram registrados como evidência." />
        {decisionMemory.length ? <div className="space-y-3">{decisionMemory.map((item) => <Card key={item.id} className="p-5"><div className="grid gap-4 md:grid-cols-4"><MemoryItem label="Detectado" value={item.detected} /><MemoryItem label="Recomendado" value={item.recommended} /><MemoryItem label="Ação tomada" value={item.actionTaken ?? "Ainda não registrada"} /><MemoryItem label="Resultado" value={item.result ?? "Aguardando acompanhamento"} /></div><p className="mt-4 text-xs font-semibold text-brand-teal/45">Confiança {item.confidence.toLowerCase()} · atualizado em {new Date(item.updatedAt).toLocaleDateString("pt-BR")}</p></Card>)}</div> : <Card className="p-6 text-sm font-semibold text-brand-teal/60">Nenhuma memória vinculada às campanhas Meta deste recorte. A estrutura Detectado → Recomendado → Ação tomada → Resultado já está pronta sem criar tabela paralela.</Card>}
      </section>
    </div>
  );
}

function ExecutiveCard({ icon, label, value, detail, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "neutral" | "warn" | "bad" }) {
  return <Card className={clsx("min-h-48 p-5", tone === "warn" && "border-amber-300", tone === "bad" && "border-rose-300")}><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</div><p className="mt-4 text-xs font-bold uppercase text-brand-clay">{label}</p><p className="mt-2 text-xl font-bold leading-7 text-brand-teal">{value}</p><p className="mt-2 text-sm leading-5 text-brand-teal/60">{detail}</p></Card>;
}

function SectionHeading({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) { return <div className="mb-4 flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-white [&_svg]:h-4 [&_svg]:w-4">{icon}</div><div><h3 className="text-xl font-bold text-brand-teal">{title}</h3><p className="mt-1 text-sm leading-6 text-brand-teal/60">{subtitle}</p></div></div>; }

function RecommendationCard({ item }: { item: Recommendation }) { return <Card className="p-5"><span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-bold", item.state === "Divergência de mensuração" ? "bg-rose-50 text-rose-800" : item.state === "Sinal de atenção" ? "bg-amber-50 text-amber-800" : item.state === "Sinal promissor" ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800")}>{item.state}</span><h4 className="mt-3 text-lg font-bold text-brand-teal">{item.title}</h4><dl className="mt-4 space-y-3 text-sm leading-6"><Field label="Ação sugerida" value={item.action} /><Field label="Por quê" value={item.why} /><Field label="Evidência" value={item.evidence} /><Field label="Amostra" value={item.sample} /><Field label="Confiança" value={item.confidence} /><Field label="Limitação" value={item.limitation} /><Field label="Quando revisar" value={item.review} /></dl></Card>; }

function AdPerformanceCard({ ad }: { ad: AdPerformance }) {
  const image = ad.row.thumbnail_url ?? ad.row.creative_image_url;
  return <Card className="overflow-hidden"><div className="grid lg:grid-cols-[240px_1fr]">{image ? <div role="img" aria-label={`Prévia de ${ad.row.anuncio}`} className="min-h-52 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} /> : <div className="flex min-h-40 items-center justify-center bg-brand-cream text-brand-teal/35"><ImageIcon className="h-10 w-10" /></div>}<div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-clay">{ad.row.creative_format ?? "Formato não disponível"} · ad_id {ad.row.ad_id ?? "legado sem ID"}</p><h4 className="mt-1 text-xl font-bold text-brand-teal">{ad.row.anuncio}</h4><p className="mt-1 text-sm font-semibold text-brand-teal/60">creative_id {ad.row.creative_id ?? "não disponível"}</p></div>{ad.row.preview_url ? <a href={ad.row.preview_url} target="_blank" rel="noreferrer" className="rounded-full border border-brand-sand px-4 py-2 text-sm font-bold text-brand-teal">Abrir preview</a> : null}</div><p className="mt-4 font-semibold text-brand-teal">{ad.row.creative_headline ?? ad.row.creative_name ?? "Headline não disponível"}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-brand-teal/60">{ad.row.creative_body ?? "Copy não disponível na fonte atual."}</p><div className="mt-4 grid gap-4 md:grid-cols-4"><MetricGroup title="Entrega" items={[["Spend", money(ad.spend)], ["Impressões", n(ad.impressions)], ["Alcance diário acum.", n(ad.reachDaily)], ["Frequência aprox.", ad.frequency == null ? "—" : percentFormatter.format(ad.frequency)]]} /><MetricGroup title="Interesse" items={[["Cliques", n(ad.clicks)], ["Link clicks", n(ad.linkClicks)], ["Outbound", n(ad.outboundClicks)], ["CTR / CPC", `${pct(ad.ctr)} · ${money(ad.cpc)}`]]} /><MetricGroup title="Pós-clique" items={[["LPV Meta", n(ad.lpv)], ["Sessões Site", "Não disponível"], ["Sessões Norwyn", "Anúncio não determinado"], ["Checkout", n(ad.metaCheckouts)]]} /><MetricGroup title="Resultado" items={[["Meta Purchase", n(ad.metaPurchases)], ["Hotmart", "Anúncio não determinado"], ["Norwyn attributed", "Anúncio não determinado"], ["CPA confirmado", "Não disponível"]]} /></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-brand-teal/65"><span className="rounded-full bg-brand-cream px-3 py-1">CTA: {ad.row.creative_cta ?? "não disponível"}</span><span className="rounded-full bg-brand-cream px-3 py-1">Destino: {ad.row.destination_domain ?? ad.row.destination_url ?? "não disponível"}</span><span className="rounded-full bg-brand-cream px-3 py-1">Landing: {ad.row.landing_key ?? "não resolvida"}</span></div></div></div></Card>;
}

function MetricGroup({ title, items }: { title: string; items: Array<[string, string]> }) { return <div><p className="text-xs font-bold uppercase text-brand-clay">{title}</p><dl className="mt-2 space-y-2">{items.map(([label, value]) => <div key={label}><dt className="text-xs text-brand-teal/50">{label}</dt><dd className="text-sm font-bold text-brand-teal">{value}</dd></div>)}</dl></div>; }
function SourceCard({ title, source, rows, footer }: { title: string; source: string; rows: Array<[string, string]>; footer?: string }) { return <Card className="p-5"><h4 className="text-lg font-bold text-brand-teal">{title}</h4><p className="mt-1 text-xs font-semibold text-brand-clay">{source}</p><dl className="mt-4 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 border-b border-brand-sand/60 pb-2"><dt className="text-sm text-brand-teal/60">{label}</dt><dd className="text-right text-sm font-bold text-brand-teal">{value}</dd></div>)}</dl>{footer ? <p className="mt-4 text-xs leading-5 text-brand-teal/50">{footer}</p> : null}</Card>; }
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold text-brand-clay">{label}</dt><dd className="text-brand-teal/70">{value}</dd></div>; }
function MemoryItem({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase text-brand-clay">{label}</p><p className="mt-1 text-sm font-semibold leading-6 text-brand-teal">{value}</p></div>; }
