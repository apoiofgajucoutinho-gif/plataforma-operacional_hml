"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CircleDollarSign,
  Eye,
  Gauge,
  History,
  Image as ImageIcon,
  LineChart,
  ListFilter,
  MapPin,
  MousePointerClick,
  Radio,
  Route,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import type { ExportColumn } from "@/lib/client/table-export";
import type { AdsContext, AdsDailyRow, AdsGranularity, AdsPerformanceStatus } from "@/modules/ads/types";

type TabKey = "overview" | "performance" | "details" | "intelligence" | "glossary" | "analysis";
type PeriodFilter = "30d" | "90d" | "6m" | "12m" | "custom";
type SearchLike = Record<string, string | string[] | undefined>;
type SortKey =
  | "data_referencia"
  | "campanha"
  | "conjunto"
  | "anuncio"
  | "valor_gasto"
  | "impressoes"
  | "alcance"
  | "cliques"
  | "ctr"
  | "cpc"
  | "frequencia"
  | "performance_status";

const DETAILS_PAGE_SIZE = 20;

const periodFilters: Array<{ value: PeriodFilter; label: string }> = [
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
  { value: "custom", label: "Personalizado" },
];

const granularityOptions: Array<{ value: AdsGranularity; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

const tabs: Array<{ value: TabKey; label: string; icon: typeof BarChart3 }> = [
  { value: "overview", label: "Visão Geral", icon: BarChart3 },
  { value: "performance", label: "Performance", icon: Target },
  { value: "details", label: "Detalhamento", icon: ListFilter },
  { value: "intelligence", label: "Inteligência", icon: Sparkles },
  { value: "glossary", label: "Glossário", icon: BookOpen },
  { value: "analysis", label: "Análise", icon: Sparkles },
];

const statusOptions: Array<{ value: "" | AdsPerformanceStatus; label: string }> = [
  { value: "", label: "Todos os Status" },
  { value: "OK", label: "Sem sinal crítico (legado)" },
  { value: "CTR BAIXO", label: "Sinal de atenção · CTR" },
  { value: "SATURADO", label: "Sinal de atenção · frequência" },
  { value: "PUBLICO RUIM", label: "Sinal de atenção · entrega" },
  { value: "SEM_CLASSIFICACAO_AUTOMATICA", label: "Sem classificação automática" },
];

const palette = ["#5BA0E6", "#AA6BD1", "#55BF83", "#D5828D", "#A87452", "#78A9B8", "#D6A35D", "#8EA4D2"];
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

const glossary = [
  ["SPEND", "Valor gasto / investimento", "Quanto foi cobrado pela Meta no período. Compare sempre com a fatura do cartão; diferença acima de 5% pede explicação."],
  ["CPM", "Custo por mil impressões", "Valor gasto dividido pelas impressões e multiplicado por 1.000. Referências dependem do período, objetivo e público."],
  ["CPC", "Custo por clique", "Valor gasto dividido pelos cliques. Deve ser comparado no mesmo objetivo, período e estágio do funil."],
  ["CTR", "Taxa de cliques", "Cliques divididos por impressões. É um sinal de interação, não uma prova isolada de qualidade ou venda."],
  ["REACH", "Alcance diário", "Pessoas únicas reportadas pela Meta em cada dia. A soma entre dias pode repetir pessoas e não representa alcance único do período."],
  ["IMP", "Impressões", "Total de exibições do anúncio, incluindo repetições para a mesma pessoa."],
  ["FREQ", "Frequência diária ponderada", "Média das frequências diárias ponderada por impressões. É uma aproximação, não a frequência única do período."],
  ["SCORE", "Score legado", "Heurística histórica baseada em CTR, CPC e frequência. Serve para ordenar sinais, não para declarar vencedor."],
  ["SINAL", "Sinal de atenção", "Regra observacional que precisa mostrar período, amostra e evidência antes de orientar uma análise."],
  ["CAMPANHA", "Campanha", "Nível mais alto do Gerenciador de Anúncios; define o objetivo de negócio."],
  ["ADSET", "Conjunto de anúncios", "Nível que define público-alvo, posicionamentos e orçamento."],
  ["AD", "Anúncio / criativo", "A peça vista pelo público, como imagem, vídeo ou carrossel."],
  ["CAPI", "Conversions API", "Configuração de conversões pelo servidor, importante para medir retorno real."],
  ["ROAS", "Retorno sobre investimento", "Receita gerada dividida pelo valor investido em mídia."],
  ["RETARG.", "Remarketing", "Anúncios para pessoas que já interagiram com a marca."],
  ["A/B", "Teste A/B", "Rodar criativos diferentes simultaneamente para comparar performance."],
  ["CBO", "Campaign Budget Optimization", "Orçamento definido na campanha e distribuído automaticamente pela Meta."],
];

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDate(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Base ainda sem atualização";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMonthOption(year: string, month: string) {
  const date = new Date(Number(year), Number(month) - 1, 1);
  return monthFormatter.format(date).replace(".", "").replace(" de ", "/");
}

function formatMonthKeyOption(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return year && month ? formatMonthOption(year, month) : monthKey;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

function formatCompact(value: number) {
  if (Math.abs(value) < 1000) return formatNumber(value);

  const compact = value / 1000;
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: compact >= 10 ? 0 : 1,
  }).format(compact)}k`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatPct(value: number, digits = 1) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)}%`;
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function truncate(value: string | null | undefined, size: number) {
  const text = value ?? "";
  return text.length > size ? `${text.slice(0, size)}...` : text;
}

function aggregate(rows: AdsDailyRow[]) {
  const totSpend = rows.reduce((sum, row) => sum + row.valor_gasto, 0);
  const totImp = rows.reduce((sum, row) => sum + row.impressoes, 0);
  const totReach = rows.reduce((sum, row) => sum + row.alcance, 0);
  const totClicks = rows.reduce((sum, row) => sum + row.cliques, 0);
  const ctrW = totImp > 0 ? (totClicks / totImp) * 100 : 0;
  const cpcW = totClicks > 0 ? totSpend / totClicks : 0;
  const cpmW = totImp > 0 ? (totSpend / totImp) * 1000 : 0;
  const frequencyWeight = rows.reduce((sum, row) => sum + row.impressoes, 0);
  const freqW = frequencyWeight > 0
    ? rows.reduce((sum, row) => sum + row.frequencia * row.impressoes, 0) / frequencyWeight
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() - 3 * 86400000);
  const recent = rows.filter((row) => parseDate(row.data_referencia) >= limit && row.valor_gasto > 0);

  return {
    totSpend,
    totImp,
    totReach,
    totClicks,
    ctrW,
    cpcW,
    cpmW,
    freqW,
    adsComGastoRecente: new Set(recent.map((row) => row.ad_id ?? row.anuncio)).size,
    campsComGastoRecente: new Set(recent.map((row) => row.campaign_id ?? row.campanha)).size,
    adsMetaActive: new Set(rows.filter((row) => String(row.effective_status ?? row.status).toUpperCase() === "ACTIVE").map((row) => row.ad_id ?? row.anuncio)).size,
    metaLinkClicks: rows.reduce((sum, row) => sum + Number(row.link_clicks ?? 0), 0),
    metaLpv: rows.reduce((sum, row) => sum + Number(row.landing_page_views ?? 0), 0),
    metaCheckouts: rows.reduce((sum, row) => sum + Number(row.initiate_checkouts ?? 0), 0),
    metaPurchases: rows.reduce((sum, row) => sum + Number(row.meta_purchases ?? 0), 0),
  };
}

function groupSum<T extends string>(
  rows: AdsDailyRow[],
  getKey: (row: AdsDailyRow) => T,
  getValue: (row: AdsDailyRow) => number,
) {
  const map = new Map<T, number>();
  rows.forEach((row) => map.set(getKey(row), (map.get(getKey(row)) ?? 0) + getValue(row)));
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function groupByPeriod(rows: AdsDailyRow[], granularity: AdsGranularity) {
  const map = new Map<string, { label: string; spend: number; reach: number; imp: number; clicks: number }>();
  rows.forEach((row) => {
    const date = parseDate(row.data_referencia);
    let key = row.data_referencia;
    let label = formatDate(row.data_referencia).slice(0, 5);

    if (granularity === "week") {
      const week = startOfWeek(date);
      key = toIsoDate(week);
      label = `Sem. ${formatDate(key).slice(0, 5)}`;
    } else if (granularity === "month") {
      key = row.data_referencia.slice(0, 7);
      label = formatMonthKeyOption(key);
    }

    const item = map.get(key) ?? { label, spend: 0, reach: 0, imp: 0, clicks: 0 };
    item.spend += row.valor_gasto;
    item.reach += row.alcance;
    item.imp += row.impressoes;
    item.clicks += row.cliques;
    map.set(key, item);
  });

  return [...map.entries()]
    .map(([key, item]) => ({ key, ...item, ctr: item.imp > 0 ? (item.clicks / item.imp) * 100 : 0 }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function toIsoDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function granularityLabel(value: AdsGranularity) {
  return value === "day" ? "Dia" : value === "week" ? "Semana" : "Mês";
}

function adsHref(basePath: string, changes: Record<string, string | null | undefined>, current?: SearchLike) {
  const params = new URLSearchParams();
  Object.entries(current ?? {}).forEach(([key, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  });
  if (basePath === "/marketing") params.set("view", "ads");
  Object.entries(changes).forEach(([key, value]) => {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  });
  return `${basePath}?${params.toString()}`;
}

function statusTone(status: string) {
  if (status === "OK") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "SATURADO") return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === "CTR BAIXO") return "bg-orange-50 text-orange-700 border-orange-100";
  if (status === "PUBLICO RUIM") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-brand-cream text-brand-teal/70 border-brand-sand";
}

function statusLabel(status: string) {
  if (status === "OK") return "Sem sinal crítico · legado";
  if (status === "CTR BAIXO") return "Sinal de atenção · CTR";
  if (status === "SATURADO") return "Sinal de atenção · frequência";
  if (status === "PUBLICO RUIM") return "Sinal de atenção · entrega";
  if (status === "SEM_CLASSIFICACAO_AUTOMATICA") return "Sem classificação automática";
  return "Sem classificação";
}

export function AdsDashboard({ context, basePath = "/ads", searchParams }: { context: AdsContext; basePath?: string; searchParams?: SearchLike }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [campaign, setCampaign] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data_referencia");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const period = context.period.key;
  const granularity = context.period.granularity;

  const campaigns = useMemo(
    () => [...new Set(context.rows.map((row) => row.campanha).filter(Boolean))].sort(),
    [context.rows],
  );

  const filteredRows = useMemo(() => {
    return context.rows.filter((row) => {
      const campaignMatch = !campaign || row.campanha === campaign;
      const statusMatch = !status || row.performance_status === status;

      return campaignMatch && statusMatch;
    });
  }, [campaign, context.rows, status]);

  const uniqueDates = new Set(context.rows.map((row) => row.data_referencia));
  const hasAccumulatedWarning = context.rows.length > 0 && uniqueDates.size <= 1;

  useEffect(() => {
    const label = tabs.find((tab) => tab.value === activeTab)?.label ?? "Visão Geral";

    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "ads",
        pagePath: basePath === "/marketing" ? "/marketing?view=ads" : "/ads",
        pageLabel: `Ads: ${label}`,
      }),
      keepalive: true,
    });
  }, [activeTab, basePath]);

  if (context.diagnostic) {
    return (
      <section className="space-y-6">
        <Header updatedAt={context.updatedAt} />
        <Card className="p-6">
          <p className="text-lg font-bold text-brand-teal">Ads indisponível</p>
          <p className="mt-2 text-brand-teal/70">{context.diagnostic}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <Header updatedAt={context.updatedAt} />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.value === activeTab;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={clsx(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition",
                isActive
                  ? "border-brand-clay bg-brand-clay text-white shadow-sm"
                  : "border-[#E9CBD1] bg-white text-brand-teal hover:bg-[#FFF7F8]",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Filters
        period={period}
        granularity={granularity}
        basePath={basePath}
        searchParams={searchParams}
        start={context.period.start}
        end={context.period.end}
        campaign={campaign}
        status={status}
        campaigns={campaigns}
        onCampaign={(next) => {
          setCampaign(next);
          setPage(1);
        }}
        onStatus={(next) => {
          setStatus(next);
          setPage(1);
        }}
      />

      {hasAccumulatedWarning ? (
        <Card className="flex items-start gap-3 border-amber-200 bg-amber-50/80 p-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">
            Dados em modo acumulado detectado. Para granularidade diária, mantenha o workflow n8n com `time_increment=1`
            e gravação diária no Supabase.
          </p>
        </Card>
      ) : null}

      <PeriodSummary rows={filteredRows} totalRows={context.rows.length} period={context.period} />

      <ExecutiveTrafficOverview rows={filteredRows} snapshots={context.configSnapshots} />

      {activeTab === "overview" ? <OverviewTab rows={filteredRows} granularity={granularity} /> : null}
      {activeTab === "performance" ? <PerformanceTab rows={filteredRows} /> : null}
      {activeTab === "details" ? (
        <DetailsTab
          rows={filteredRows}
          page={page}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPage={setPage}
          onSort={(key) => {
            if (sortKey === key) {
              setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
            } else {
              setSortKey(key);
              setSortDirection("desc");
            }
          }}
        />
      ) : null}
      {activeTab === "intelligence" ? <IntelligenceTab rows={filteredRows} context={context} /> : null}
      {activeTab === "glossary" ? <GlossaryTab /> : null}
      {activeTab === "analysis" ? <AnalysisTab rows={filteredRows} allRows={context.rows} /> : null}
    </section>
  );
}
function Header({ updatedAt }: { updatedAt: string | null }) {
  return (
    <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-[#F0DDE1] bg-white/80 p-5 shadow-[0_18px_50px_rgba(0,62,78,0.07)] lg:flex-row lg:items-center">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-[0_12px_30px_rgba(244,63,94,0.14)]">
          <Radio className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-clay">Meta Ads</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-teal sm:text-4xl">Como o investimento está performando</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/70">
            Acompanhe investimento, alcance, campanhas e evolução no período selecionado, sem misturar com os sinais orgânicos do Instagram.
          </p>
        </div>
      </div>
      <div className="inline-flex w-fit rounded-full border border-brand-sky/40 bg-brand-sky/10 px-4 py-2 text-xs font-bold text-brand-teal/70">
        Dados atualizados em {formatDateTime(updatedAt)}
      </div>
    </header>
  );
}

function Filters({
  period,
  granularity,
  basePath,
  searchParams,
  start,
  end,
  campaign,
  status,
  campaigns,
  onCampaign,
  onStatus,
}: {
  period: PeriodFilter;
  granularity: AdsGranularity;
  basePath: string;
  searchParams?: SearchLike;
  start: string;
  end: string;
  campaign: string;
  status: string;
  campaigns: string[];
  onCampaign: (value: string) => void;
  onStatus: (value: string) => void;
}) {
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase text-brand-clay">Período</span>
        {periodFilters.map((filter) => (
          <a
            key={filter.value}
            href={adsHref(basePath, { period: filter.value, granularity: filter.value === "30d" ? "day" : "month", start: null, end: null }, searchParams)}
            className={clsx(
              "inline-flex h-9 items-center rounded-full border px-4 text-sm font-bold transition",
              period === filter.value
                ? "border-brand-clay bg-brand-clay text-white"
                : "border-[#E9CBD1] bg-white text-brand-teal hover:bg-[#FFF7F8]",
            )}
          >
            {filter.label}
          </a>
        ))}

        <span className="mx-2 hidden h-8 w-px bg-[#E9CBD1] md:block" />
        <span className="mr-1 text-xs font-bold uppercase text-brand-clay">Agrupar por</span>
        {granularityOptions.map((option) => (
          <a
            key={option.value}
            href={adsHref(basePath, { granularity: option.value }, searchParams)}
            className={clsx(
              "inline-flex h-9 items-center rounded-full border px-4 text-sm font-bold transition",
              granularity === option.value
                ? "border-brand-teal bg-brand-teal text-white"
                : "border-[#E9CBD1] bg-white text-brand-teal hover:bg-[#FFF7F8]",
            )}
          >
            {option.label}
          </a>
        ))}
      </div>

      <form action={basePath} method="get" className="flex flex-wrap items-end gap-2">
        {basePath === "/marketing" ? <input type="hidden" name="view" value="ads" /> : null}
        <input type="hidden" name="period" value="custom" />
        <input type="hidden" name="granularity" value={granularity} />
        <label className="grid gap-1 text-xs font-bold uppercase text-brand-clay">
          Data inicial
          <input name="start" type="date" defaultValue={start} className="h-10 rounded-md border border-[#E9CBD1] bg-white px-3 text-sm font-bold text-brand-teal" />
        </label>
        <label className="grid gap-1 text-xs font-bold uppercase text-brand-clay">
          Data final
          <input name="end" type="date" defaultValue={end} className="h-10 rounded-md border border-[#E9CBD1] bg-white px-3 text-sm font-bold text-brand-teal" />
        </label>
        <button type="submit" className="h-10 rounded-md border border-brand-clay bg-white px-4 text-sm font-bold text-brand-clay hover:bg-[#FFF7F8]">
          Aplicar personalizado
        </button>

        <span className="mx-2 hidden h-8 w-px bg-[#E9CBD1] md:block" />

        <select
          value={campaign}
          onChange={(event) => onCampaign(event.target.value)}
          className="h-10 min-w-[220px] rounded-md border border-[#E9CBD1] bg-white px-3 text-sm font-bold text-brand-teal"
        >
          <option value="">Todas as Campanhas</option>
          {campaigns.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => onStatus(event.target.value)}
          className="h-10 min-w-[180px] rounded-md border border-[#E9CBD1] bg-white px-3 text-sm font-bold text-brand-teal"
        >
          {statusOptions.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </form>
    </Card>
  );
}
function PeriodSummary({
  rows,
  totalRows,
  period,
}: {
  rows: AdsDailyRow[];
  totalRows: number;
  period: AdsContext["period"];
}) {
  return (
    <p className="text-sm font-semibold text-brand-teal/60">
      Período analisado: {formatDate(period.start)} a {formatDate(period.end)} · {rows.length} de {totalRows} registros no intervalo · agrupado por {granularityLabel(period.granularity)}.
    </p>
  );
}

function ExecutiveTrafficOverview({ rows, snapshots }: { rows: AdsDailyRow[]; snapshots: AdsContext["configSnapshots"] }) {
  const metrics = aggregate(rows);
  const enriched = rows.filter((row) => row.creative_id || row.targeting_summary || row.destination_url);
  const audience = enriched.find((row) => row.targeting_summary)?.targeting_summary;
  const creatives = new Set(enriched.map((row) => row.creative_id).filter(Boolean)).size;
  const destination = enriched.find((row) => row.destination_domain)?.destination_domain;
  const attention = metrics.totSpend > 0 && metrics.metaCheckouts === 0
    ? "Investimento registrado sem checkout Meta no recorte"
    : metrics.metaLinkClicks > 0 && metrics.metaLpv === 0
      ? "Cliques registrados sem LPV Meta no recorte"
      : "Nenhum sinal crítico automático";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <ExecutiveAnswer icon={<CircleDollarSign />} label="Quanto investimos?" value={formatMoney(metrics.totSpend)} detail={`${rows.length} registros no recorte`} />
      <ExecutiveAnswer icon={<Users />} label="Quem impactamos?" value={audience ? truncate(audience.replaceAll(" | ", " · "), 72) : "Não disponível para este período"} detail={audience ? "Configuração real retornada pela Meta" : "Histórico anterior ao enriquecimento V9"} />
      <ExecutiveAnswer icon={<ImageIcon />} label="O que mostramos?" value={creatives ? `${creatives} criativo${creatives === 1 ? "" : "s"}` : "Não disponível"} detail={creatives ? "IDs e peças enriquecidos pela V9" : "Creative ID ausente no legado"} />
      <ExecutiveAnswer icon={<MapPin />} label="Para onde levamos?" value={destination ?? "Não disponível"} detail={destination ? "Destino configurado no Meta" : "Destino não coletado no período"} />
      <ExecutiveAnswer icon={<ShieldCheck />} label="O que merece atenção?" value={attention} detail={`${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"} de configuração disponível${snapshots.length === 1 ? "" : "is"}`} />
    </div>
  );
}

function ExecutiveAnswer({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card className="min-h-40 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="mt-3 text-xs font-bold uppercase text-brand-clay">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-6 text-brand-teal">{value}</p>
      <p className="mt-2 text-xs leading-5 text-brand-teal/55">{detail}</p>
    </Card>
  );
}

function asConfig(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function latestSnapshot(context: AdsContext, type: string, entityIds: Set<string>) {
  return context.configSnapshots.find((snapshot) => snapshot.entity_type === type && (!entityIds.size || entityIds.has(snapshot.entity_id))) ?? null;
}

function IntelligenceTab({ rows, context }: { rows: AdsDailyRow[]; context: AdsContext }) {
  const metrics = aggregate(rows);
  const campaignIds = new Set(rows.map((row) => row.campaign_id).filter((value): value is string => Boolean(value)));
  const adsetIds = new Set(rows.map((row) => row.adset_id).filter((value): value is string => Boolean(value)));
  const campaignSnapshot = latestSnapshot(context, "campaign", campaignIds);
  const adsetSnapshot = latestSnapshot(context, "adset", adsetIds);
  const campaignConfig = asConfig(campaignSnapshot?.config_json);
  const adsetConfig = asConfig(adsetSnapshot?.config_json);
  const enrichedRows = rows.filter((row) => row.origem === "n8n_meta_ads_v9" || row.creative_id || row.targeting_summary);
  const audiences = [...new Map(enrichedRows.filter((row) => row.targeting_summary).map((row) => [row.adset_id ?? row.conjunto ?? row.targeting_summary, row])).values()];
  const creativeGroups = new Map<string, AdsDailyRow[]>();
  enrichedRows.forEach((row) => {
    const key = row.creative_id ?? row.ad_id ?? row.anuncio;
    creativeGroups.set(key, [...(creativeGroups.get(key) ?? []), row]);
  });
  const creatives = [...creativeGroups.values()].map((group) => ({ row: group[0], metrics: aggregate(group) })).sort((a, b) => b.metrics.totSpend - a.metrics.totSpend);
  const destinations = [...new Map(enrichedRows.filter((row) => row.destination_url).map((row) => [row.destination_url, row])).values()];
  const recommendations = buildTrafficRecommendations(rows, context);
  const changes = context.configSnapshots.reduce((map, snapshot) => {
    const key = `${snapshot.entity_type}:${snapshot.entity_id}`;
    map.set(key, [...(map.get(key) ?? []), snapshot]);
    return map;
  }, new Map<string, AdsContext["configSnapshots"]>());
  const actualChanges = [...changes.values()].filter((items) => new Set(items.map((item) => item.config_hash)).size > 1);

  return (
    <div className="space-y-6">
      <SectionTitle icon={<Users className="h-4 w-4" />} title="Quem estamos impactando" />
      {audiences.length ? <div className="grid gap-3 lg:grid-cols-2">{audiences.map((row) => (
        <Card key={row.adset_id ?? row.conjunto ?? row.targeting_summary} className="p-5">
          <p className="text-xs font-bold uppercase text-brand-clay">{row.audience_type ?? "Público Meta"}</p>
          <p className="mt-2 text-lg font-semibold leading-7 text-brand-teal">{row.targeting_summary?.replaceAll(" | ", " · ")}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-brand-teal/60">
            <span className="rounded-full bg-sky-50 px-3 py-1">Origem: Meta Graph API</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1">Confiança: {row.audience_confidence ?? "não informada"}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-brand-teal/55">Evidência: {row.audience_evidence?.length ? row.audience_evidence.map(String).join(" · ") : "targeting retornado pela Meta"}</p>
        </Card>
      ))}</div> : <EmptyCard text="Público não disponível para este período. O histórico legado não será inferido pelo nome do Ad Set." />}

      <SectionTitle icon={<ImageIcon className="h-4 w-4" />} title="O que estamos mostrando" />
      {creatives.length ? <div className="grid gap-4 lg:grid-cols-2">{creatives.map(({ row, metrics: creativeMetrics }) => (
        <Card key={row.creative_id ?? row.ad_id ?? row.anuncio} className="overflow-hidden">
          {row.thumbnail_url || row.creative_image_url ? <div role="img" aria-label={`Prévia de ${row.anuncio}`} className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${row.thumbnail_url ?? row.creative_image_url})` }} /> : null}
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase text-brand-clay">{row.creative_format ?? "Formato não disponível"}</p><h3 className="mt-1 text-lg font-bold text-brand-teal">{row.anuncio}</h3></div><span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-teal">{row.creative_cta ?? "CTA não disponível"}</span></div>
            <p className="mt-3 font-semibold text-brand-teal">{row.creative_headline ?? row.creative_name ?? "Headline não disponível"}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-teal/65">{row.creative_body ?? "Copy não disponível para este período."}</p>
            <div className="mt-4 grid grid-cols-4 gap-2"><MiniMetric label="Gasto" value={formatMoney(creativeMetrics.totSpend)} /><MiniMetric label="CTR" value={formatPct(creativeMetrics.ctrW)} /><MiniMetric label="LPV" value={creativeMetrics.metaLpv} /><MiniMetric label="Checkout" value={creativeMetrics.metaCheckouts} /></div>
            {row.preview_url ? <a className="mt-4 inline-flex text-sm font-bold text-brand-clay underline" href={row.preview_url} target="_blank" rel="noreferrer">Abrir preview Meta</a> : null}
          </div>
        </Card>
      ))}</div> : <EmptyCard text="Detalhes de criativo não disponíveis no histórico anterior à V9." />}

      <SectionTitle icon={<MapPin className="h-4 w-4" />} title="Para onde estamos levando" />
      {destinations.length ? <div className="grid gap-3 lg:grid-cols-2">{destinations.map((row) => (
        <Card key={row.destination_url!} className="p-5"><p className="font-bold text-brand-teal">{row.destination_domain}</p><p className="mt-2 break-all text-sm text-brand-teal/65">{row.destination_url}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-brand-teal/50">Reconhecimento Norwyn</dt><dd className="font-semibold text-brand-teal">{row.landing_key ?? "Não resolvido"}</dd></div><div><dt className="text-brand-teal/50">URL tags / UTMs</dt><dd className="font-semibold text-brand-teal">{row.url_tags ?? "Não disponível"}</dd></div></dl></Card>
      ))}</div> : <EmptyCard text="Destino Meta não disponível para este período. Nenhum vínculo foi inferido pelo nome." />}

      <SectionTitle icon={<Settings2 className="h-4 w-4" />} title="Como a campanha está configurada" />
      <Card className="p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ConfigItem label="Objetivo" value={String(campaignConfig.objective ?? rows.find((row) => row.objetivo)?.objetivo ?? "Não disponível")} /><ConfigItem label="Otimização" value={String(adsetConfig.optimization_goal ?? "Não disponível")} /><ConfigItem label="Pixel / evento" value={`${asConfig(adsetConfig.promoted_object).pixel_id ?? "Não disponível"} · ${asConfig(adsetConfig.promoted_object).custom_event_type ?? "Não disponível"}`} /><ConfigItem label="Atribuição" value={formatAttribution(adsetConfig.attribution_spec)} /><ConfigItem label="Orçamento" value={campaignConfig.daily_budget ? `${campaignConfig.daily_budget} em unidades mínimas Meta · moeda não confirmada` : "Não disponível"} /><ConfigItem label="Lance" value={String(campaignConfig.bid_strategy ?? adsetConfig.bid_strategy ?? "Não disponível")} /><ConfigItem label="Status Meta" value={String(campaignConfig.effective_status ?? campaignConfig.status ?? "Não disponível")} /><ConfigItem label="Veiculação" value={formatCampaignPeriod(campaignConfig.start_time, campaignConfig.stop_time)} /></div></Card>

      <SectionTitle icon={<Route className="h-4 w-4" />} title="Leitura reconciliada por fonte" />
      <div className="grid gap-4 lg:grid-cols-3"><SourcePanel title="Meta reported" source="Meta Ads · janela de atribuição" items={[["Impressões", metrics.totImp], ["Cliques no link", metrics.metaLinkClicks], ["LPV", metrics.metaLpv], ["InitiateCheckout", metrics.metaCheckouts], ["Purchase Meta", metrics.metaPurchases]]} /><SourcePanel title="Norwyn" source={context.reconciliation.norwyn.source} items={[["Sessões", context.reconciliation.norwyn.sessions], ["Oferta vista", context.reconciliation.norwyn.offerViews], ["Checkout click", context.reconciliation.norwyn.checkoutClicks], ["Sessões atribuídas", context.reconciliation.norwyn.attributedSessions]]} /><SourcePanel title="Hotmart confirmado" source={context.reconciliation.hotmart.source} items={[["Vendas confirmadas", context.reconciliation.hotmart.confirmedSales], ["Atribuídas via bridge", context.reconciliation.hotmart.attributedSales], ["Receita confirmada", context.reconciliation.hotmart.confirmedRevenue == null ? null : formatMoney(context.reconciliation.hotmart.confirmedRevenue)]]} /></div>
      <p className="text-sm leading-6 text-brand-teal/60">{context.reconciliation.note}</p>

      <SectionTitle icon={<History className="h-4 w-4" />} title="Histórico de configuração" />
      {actualChanges.length ? <div className="space-y-3">{actualChanges.map((items) => <Card key={`${items[0].entity_type}:${items[0].entity_id}`} className="p-4"><p className="font-bold text-brand-teal">{items[0].entity_name ?? items[0].entity_id}</p><p className="mt-1 text-sm text-brand-teal/60">{items.length} estados reais encontrados entre {formatDateTime(items.at(-1)?.first_seen_at ?? null)} e {formatDateTime(items[0].last_seen_at)}.</p></Card>)}</div> : <EmptyCard text="Estado atual registrado. Ainda não existem dois hashes distintos da mesma entidade para afirmar que houve mudança." />}

      <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Traffic Intelligence V1" />
      <div className="grid gap-3 lg:grid-cols-2">{recommendations.map((item) => <EvidenceCard key={item.title} {...item} />)}</div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase text-brand-clay">{label}</p><p className="mt-1 text-sm font-semibold leading-6 text-brand-teal">{value}</p></div>; }
function formatAttribution(value: unknown) { const entries = Array.isArray(value) ? value : []; return entries.length ? entries.map((item) => `${item.value}d ${item.event_type}`).join(" · ") : "Não disponível"; }
function formatCampaignPeriod(start: unknown, end: unknown) { return start || end ? `${start ? new Date(String(start)).toLocaleDateString("pt-BR") : "?"} → ${end ? new Date(String(end)).toLocaleDateString("pt-BR") : "em aberto"}` : "Não disponível"; }
function SourcePanel({ title, source, items }: { title: string; source: string; items: Array<[string, string | number | null]> }) { return <Card className="p-5"><h3 className="text-lg font-bold text-brand-teal">{title}</h3><p className="mt-1 text-xs text-brand-teal/50">{source}</p><dl className="mt-4 space-y-3">{items.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-brand-sand/60 pb-2"><dt className="text-sm text-brand-teal/60">{label}</dt><dd className="font-bold text-brand-teal">{value == null ? "Não disponível" : typeof value === "number" ? formatNumber(value) : value}</dd></div>)}</dl></Card>; }

function OverviewTab({ rows, granularity }: { rows: AdsDailyRow[]; granularity: AdsGranularity }) {
  const metrics = aggregate(rows);
  const statusCount = groupSum(rows, (row) => row.performance_status, () => 1);
  const spendByCampaign = groupSum(rows, (row) => row.campanha, (row) => row.valor_gasto).slice(0, 8);
  const grouped = groupByPeriod(rows, granularity);

  return (
    <div className="space-y-5">
      <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Visão Geral" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <KpiCard icon={<CircleDollarSign />} label="Investimento Total" value={formatMoney(metrics.totSpend)} sub={`${rows.length} registros`} />
        <KpiCard icon={<Radio />} label="Alcance diário acumulado" value={formatCompact(metrics.totReach)} sub="soma diária; pode repetir pessoas" />
        <KpiCard icon={<Eye />} label="Impressões" value={formatCompact(metrics.totImp)} sub="exibições totais" />
        <KpiCard icon={<MousePointerClick />} label="Cliques" value={formatCompact(metrics.totClicks)} sub="total no período" />
        <KpiCard icon={<Target />} label="CTR Médio" value={formatPct(metrics.ctrW)} sub="ponderado por impressões" />
        <KpiCard icon={<CircleDollarSign />} label="CPC Médio" value={formatMoney(metrics.cpcW)} sub="custo por clique" />
        <KpiCard icon={<BarChart3 />} label="CPM Médio" value={formatMoney(metrics.cpmW)} sub="custo por mil impr." />
        <KpiCard icon={<RefreshCw />} label="Frequência diária ponderada" value={formatDecimal(metrics.freqW)} sub="aproximação ponderada por impressões" />
        <KpiCard icon={<Gauge />} label="Status Meta ACTIVE" value={formatNumber(metrics.adsMetaActive)} sub="anúncios com status Meta ativo" />
        <KpiCard icon={<LineChart />} label="Com gasto recente" value={formatNumber(metrics.adsComGastoRecente)} sub="anúncios com gasto nos últimos 3 dias" />
        <KpiCard icon={<Target />} label="Conversões" value="-" sub="Em breve" muted />
        <KpiCard icon={<MousePointerClick />} label="Leads" value="-" sub="Em breve" muted />
      </div>

      <SectionTitle icon={<Trophy className="h-4 w-4" />} title="Sinais do período" />
      <InsightGrid rows={rows} />

      <SectionTitle icon={<BarChart3 className="h-4 w-4" />} title="Distribuição" />
      <div className="grid gap-4 xl:grid-cols-2">
        <DonutChart title="Investimento por Campanha" items={spendByCampaign} formatter={formatMoney} />
        <DonutChart title="Status de Performance" items={statusCount} formatter={(value) => `${formatNumber(value)} registros`} />
      </div>

      <SectionTitle icon={<LineChart className="h-4 w-4" />} title={`Evolução por ${granularityLabel(granularity)}`} />
      <VerticalBarChart title={`Investimento por ${granularityLabel(granularity)}`} items={grouped.map((item) => ({ label: item.label, value: item.spend }))} formatter={formatMoney} tall />
      <div className="grid gap-4 xl:grid-cols-2">
        <TwoMetricBars
          title={`Alcance vs Impressões (${granularityLabel(granularity)})`}
          items={grouped.map((item) => ({ label: item.label, valueA: item.reach, valueB: item.imp }))}
          labelA="Alcance"
          labelB="Impressões"
        />
        <VerticalBarChart
          title={`CTR por ${granularityLabel(granularity)}`}
          items={grouped.map((item) => ({ label: item.label, value: item.ctr }))}
          formatter={(value) => formatPct(value)}
        />
      </div>
    </div>
  );
}

function PerformanceTab({ rows }: { rows: AdsDailyRow[] }) {
  const metrics = aggregate(rows);
  const topAds = [...rows].sort((left, right) => right.performance_score - left.performance_score).slice(0, 10);
  const adsetRows = buildAdsetRows(rows);

  return (
    <div className="space-y-5">
      <SectionTitle icon={<Target className="h-4 w-4" />} title="Caminho de sinais" />
      <div className="grid gap-4 xl:grid-cols-2">
        <FunnelChart
          title="Entrega → interação → visita → checkout → atribuição Meta"
          items={[
            { label: "Impressões", value: metrics.totImp },
            { label: "Cliques no link", value: metrics.metaLinkClicks },
            { label: "LPV Meta", value: metrics.metaLpv },
            { label: "InitiateCheckout Meta", value: metrics.metaCheckouts },
            { label: "Purchase Meta", value: metrics.metaPurchases },
          ]}
        />
        <HorizontalBarChart
          title="Ordenação exploratória pelo score legado"
          items={topAds.map((row) => ({ label: truncate(row.anuncio, 42), value: row.performance_score }))}
          formatter={(value) => formatDecimal(value)}
        />
      </div>

      <SectionTitle icon={<Gauge className="h-4 w-4" />} title="Diagnóstico de Anúncios" />
      <ScatterChart rows={rows} />

      <SectionTitle icon={<Trophy className="h-4 w-4" />} title="Ranking de Conjuntos (AdSets)" />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F0D6DB]/80 text-xs uppercase text-brand-clay">
              <tr>
                <th className="px-4 py-3 text-left">Conjunto</th>
                <th className="px-4 py-3 text-right">Investimento</th>
                <th className="px-4 py-3 text-right">Impressões</th>
                <th className="px-4 py-3 text-right">Alcance</th>
                <th className="px-4 py-3 text-right">Cliques</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3 text-right">CPC</th>
                <th className="px-4 py-3 text-right">Freq.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0DDE1]">
              {adsetRows.map((row) => (
                <tr key={row.conjunto}>
                  <td className="max-w-[360px] px-4 py-3 font-semibold text-brand-teal">{row.conjunto}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.spend)}</td>
                  <td className="px-4 py-3 text-right">{formatCompact(row.impressoes)}</td>
                  <td className="px-4 py-3 text-right">{formatCompact(row.alcance)}</td>
                  <td className="px-4 py-3 text-right">{formatCompact(row.cliques)}</td>
                  <td className="px-4 py-3 text-right">{formatPct(row.ctr)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.cpc)}</td>
                  <td className="px-4 py-3 text-right">{formatDecimal(row.freq)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DetailsTab({
  rows,
  page,
  sortKey,
  sortDirection,
  onPage,
  onSort,
}: {
  rows: AdsDailyRow[];
  page: number;
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  onPage: (page: number) => void;
  onSort: (key: SortKey) => void;
}) {
  const columns: ExportColumn<AdsDailyRow>[] = [
    { header: "Data", value: (row) => formatDate(row.data_referencia) },
    { header: "Campanha", value: (row) => row.campanha },
    { header: "Conjunto", value: (row) => row.conjunto ?? "" },
    { header: "Anuncio", value: (row) => row.anuncio },
    { header: "Gasto", value: (row) => formatMoney(row.valor_gasto) },
    { header: "Impressoes", value: (row) => row.impressoes },
    { header: "Alcance", value: (row) => row.alcance },
    { header: "Cliques", value: (row) => row.cliques },
    { header: "CTR", value: (row) => formatPct(row.ctr) },
    { header: "CPC", value: (row) => formatMoney(row.cpc) },
    { header: "Freq.", value: (row) => formatDecimal(row.frequencia) },
    { header: "Status", value: (row) => row.performance_status },
  ];

  const sortedRows = [...rows].sort((left, right) => {
    const leftValue = left[sortKey];
    const rightValue = right[sortKey];
    const result =
      typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "pt-BR");

    return sortDirection === "asc" ? result : -result;
  });
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / DETAILS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * DETAILS_PAGE_SIZE, safePage * DETAILS_PAGE_SIZE);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0DDE1] px-4 py-4">
        <div>
          <h2 className="text-lg font-bold text-brand-teal">Detalhamento de Anúncios</h2>
          <p className="text-sm font-semibold text-brand-teal/50">{rows.length} registros no filtro</p>
        </div>
        <ExportButtons label="Detalhamento de Anuncios" filename="instagram_ads_detalhamento" columns={columns} rows={sortedRows} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F0D6DB]/80 text-xs uppercase text-brand-clay">
            <tr>
              {[
                ["data_referencia", "Data"],
                ["campanha", "Campanha"],
                ["conjunto", "Conjunto"],
                ["anuncio", "Anúncio"],
                ["valor_gasto", "Gasto"],
                ["impressoes", "Impr."],
                ["alcance", "Alcance"],
                ["cliques", "Cliques"],
                ["ctr", "CTR"],
                ["cpc", "CPC"],
                ["frequencia", "Freq."],
                ["performance_status", "Status"],
              ].map(([key, label]) => (
                <th key={key} className={clsx("px-4 py-3", key === "campanha" || key === "conjunto" || key === "anuncio" ? "text-left" : "text-right")}>
                  <button type="button" onClick={() => onSort(key as SortKey)} className="font-bold">
                    {label} {sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0DDE1]">
            {pageRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-right">{formatDate(row.data_referencia)}</td>
                <td className="max-w-[220px] px-4 py-3 font-semibold text-brand-teal">{truncate(row.campanha, 38)}</td>
                <td className="max-w-[220px] px-4 py-3">{truncate(row.conjunto, 38)}</td>
                <td className="max-w-[220px] px-4 py-3">{truncate(row.anuncio, 38)}</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(row.valor_gasto)}</td>
                <td className="px-4 py-3 text-right">{formatCompact(row.impressoes)}</td>
                <td className="px-4 py-3 text-right">{formatCompact(row.alcance)}</td>
                <td className="px-4 py-3 text-right">{formatCompact(row.cliques)}</td>
                <td className="px-4 py-3 text-right">{formatPct(row.ctr)}</td>
                <td className="px-4 py-3 text-right">{formatMoney(row.cpc)}</td>
                <td className="px-4 py-3 text-right">{formatDecimal(row.frequencia)}</td>
                <td className="px-4 py-3 text-right"><StatusBadge status={row.performance_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} onPage={onPage} />
    </Card>
  );
}

function GlossaryTab() {
  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 text-sm leading-relaxed text-brand-teal/70">
        Este glossário explica as métricas do dashboard e ajuda a transformar o relatório de mídia em perguntas práticas para a agência.
      </Card>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {glossary.map(([sigla, nome, def]) => (
          <Card key={sigla} className="p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#FFF0F2] px-2 py-1 text-xs font-black text-brand-clay">{sigla}</span>
              <h3 className="font-bold text-brand-teal">{nome}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-brand-teal/65">{def}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalysisTab({ rows, allRows }: { rows: AdsDailyRow[]; allRows: AdsDailyRow[] }) {
  const metrics = aggregate(rows);
  const alerts = buildAlerts(rows, metrics);
  const lifetime = buildCreativeLifetime(rows, allRows);
  const trends = buildTrends(rows);
  const agencyActions = buildAgencyActions(rows);
  const predictability = buildPredictability(rows, allRows);
  const benchmarkRows = buildCampaignBenchmark(allRows).slice(0, 10);

  return (
    <div className="space-y-5">
      <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} title="Sinais explicáveis" />
      <div className="grid gap-3 lg:grid-cols-3">
        <SummaryPill label="Alertas" value={alerts.length} tone={alerts.length ? "bad" : "good"} />
        <SummaryPill label="CTR médio" value={formatPct(metrics.ctrW)} tone={metrics.ctrW >= 1.5 ? "good" : "warn"} />
        <SummaryPill label="Frequência diária ponderada" value={formatDecimal(metrics.freqW)} tone={metrics.freqW > 3 ? "warn" : "neutral"} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {alerts.length ? alerts.map((alert) => <AlertCard key={alert.title} {...alert} />) : <EmptyCard text="Nenhum sinal acionou as referências observacionais no filtro atual." />}
      </div>

      <SectionTitle icon={<RefreshCw className="h-4 w-4" />} title="Tempo em veiculação dos criativos" />
      <p className="text-sm font-semibold text-brand-teal/60">
        Duração média observada de {lifetime.averageDays} dias no histórico disponível. Isso não determina sozinho fadiga ou necessidade de troca.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lifetime.items.map((item) => (
          <Card key={item.nome} className="p-4">
            <p className="text-xs font-bold uppercase text-brand-clay">{item.campanha}</p>
            <h3 className="mt-1 font-bold text-brand-teal">{truncate(item.nome, 52)}</h3>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0D6DB]">
              <div className={clsx("h-full rounded-full", item.status === "critico" ? "bg-rose-500" : item.status === "alerta" ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${item.percent}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniMetric label="Dias ativo" value={item.dias} />
              <MiniMetric label="Freq." value={formatDecimal(item.freq)} />
              <MiniMetric label={item.dias > lifetime.averageDays ? "Além limite" : "Restantes"} value={Math.abs(item.dias - lifetime.averageDays)} />
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<TrendingDown className="h-4 w-4" />} title="Tendência de CTR (últimos 7 dias por campanha)" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {trends.length ? trends.map((trend) => <TrendCard key={trend.nome} {...trend} />) : <EmptyCard text="Dados insuficientes para análise de tendência." />}
      </div>

      <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Próximas verificações sugeridas" />
      <div className="grid gap-3 md:grid-cols-2">
        {agencyActions.map((item) => <AlertCard key={item.title} {...item} />)}
      </div>

      <SectionTitle icon={<LineChart className="h-4 w-4" />} title="Previsibilidade" />
      <div className="grid gap-3 md:grid-cols-3">
        {predictability.map((item) => <SummaryPill key={item.label} {...item} />)}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[#F0DDE1] px-4 py-4">
          <h2 className="text-lg font-bold text-brand-teal">Benchmark por tipo de campanha</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F0D6DB]/80 text-xs uppercase text-brand-clay">
              <tr>
                <th className="px-4 py-3 text-left">Campanha</th>
                <th className="px-4 py-3 text-right">CTR médio</th>
                <th className="px-4 py-3 text-right">CPC médio</th>
                <th className="px-4 py-3 text-right">Freq. média</th>
                <th className="px-4 py-3 text-right">Investimento</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0DDE1]">
              {benchmarkRows.map((row) => (
                <tr key={row.nome}>
                  <td className="max-w-[360px] px-4 py-3 font-semibold text-brand-teal">{truncate(row.nome, 58)}</td>
                  <td className="px-4 py-3 text-right">{formatPct(row.ctr)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.cpc)}</td>
                  <td className="px-4 py-3 text-right">{formatDecimal(row.freq)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.spend)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.ctr > 2 ? "OK" : row.ctr > 1 ? "CTR BAIXO" : "PUBLICO RUIM"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, muted }: { icon: ReactNode; label: string; value: string; sub: string; muted?: boolean }) {
  return (
    <Card className={clsx("rounded-3xl border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]", muted && "opacity-70")}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs font-semibold text-[color:var(--ds-text-secondary)]">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold leading-tight text-[color:var(--ds-text)]">{value}</p>
      <p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{sub}</p>
    </Card>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#E9CBD1] pb-2 text-lg font-bold text-brand-teal">
      <span className="text-brand-clay">{icon}</span>
      {title}
    </div>
  );
}

function InsightGrid({ rows }: { rows: AdsDailyRow[] }) {
  if (!rows.length) return <EmptyCard text="Sem dados no período selecionado." />;

  const top = [...rows].sort((a, b) => b.performance_score - a.performance_score)[0];
  const minSpend = Math.max(...rows.map((row) => row.valor_gasto)) * 0.1;
  const bottom = [...rows.filter((row) => row.valor_gasto >= minSpend)].sort((a, b) => a.performance_score - b.performance_score)[0];
  const topCamp = groupSum(rows, (row) => row.campanha, (row) => row.valor_gasto)[0];
  const campCtr = buildCampaignBenchmark(rows).filter((item) => item.impressoes > 100).sort((a, b) => b.ctr - a.ctr)[0];
  const saturados = rows.filter((row) => row.frequencia > 3).length;
  const ctrBaixo = rows.filter((row) => row.ctr < 1 && row.impressoes > 50).length;
  const totalSpend = rows.reduce((sum, row) => sum + row.valor_gasto, 0);
  const okSpend = rows.filter((row) => row.performance_status === "OK").reduce((sum, row) => sum + row.valor_gasto, 0);
  const pctOk = totalSpend > 0 ? (okSpend / totalSpend) * 100 : 0;
  const minCpc = [...rows.filter((row) => row.cliques >= 10)].sort((a, b) => a.cpc - b.cpc)[0];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <InsightCard title="Maior score legado" value={truncate(top?.anuncio, 40) || "-"} desc={`Ordenação exploratória · score ${formatDecimal(top?.performance_score ?? 0)} · não declara vencedor`} />
      <InsightCard title="Menor score legado" value={truncate(bottom?.anuncio, 40) || "Nenhum"} desc={bottom ? `Sinal para revisar · score ${formatDecimal(bottom.performance_score)} · gasto ${formatMoney(bottom.valor_gasto)}` : "Volume insuficiente"} tone="warn" />
      <InsightCard title="Maior Investimento" value={truncate(topCamp?.label, 32) || "-"} desc={topCamp ? formatMoney(topCamp.value) : "-"} />
      <InsightCard title="Maior CTR observado" value={truncate(campCtr?.nome, 32) || "-"} desc={`CTR: ${campCtr ? formatPct(campCtr.ctr) : "-"} · comparar com objetivo e funil`} />
      <InsightCard title="Frequência crescente" value={formatNumber(saturados)} desc="registros acima da referência observacional 3" tone={saturados > 0 ? "warn" : "good"} />
      <InsightCard title="CTR abaixo da referência" value={formatNumber(ctrBaixo)} desc="regra: CTR < 1% e mais de 50 impressões" tone={ctrBaixo > 0 ? "warn" : "good"} />
      <InsightCard title="Classificação legado OK" value={formatPct(pctOk, 0)} desc={`${formatMoney(okSpend)} de ${formatMoney(totalSpend)} · regra histórica`} />
      <InsightCard title="Menor CPC" value={minCpc ? formatMoney(minCpc.cpc) : "-"} desc={minCpc ? truncate(minCpc.anuncio, 30) : "Volume insuficiente"} tone="good" />
    </div>
  );
}

function InsightCard({ title, value, desc, tone = "neutral" }: { title: string; value: string; desc: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  return (
    <Card className={clsx("rounded-3xl border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]", tone === "good" && "ring-1 ring-emerald-100", tone === "warn" && "ring-1 ring-amber-100", tone === "bad" && "ring-1 ring-rose-100")}>
      <p className="text-xs font-semibold text-[color:var(--ds-text-secondary)]">{title}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight text-[color:var(--ds-text)]">{value}</p>
      <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-[color:var(--ds-text-muted)]">{desc}</p>
    </Card>
  );
}

function DonutChart({ title, items, formatter }: { title: string; items: Array<{ label: string; value: number }>; formatter: (value: number) => string }) {
  const topItems = items.slice(0, 8);
  const total = topItems.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  let cursor = 0;
  const gradient = topItems.length
    ? topItems
        .map((item, index) => {
          const start = cursor;
          const end = total > 0 ? cursor + (item.value / total) * 100 : cursor;
          cursor = end;
          return `${palette[index % palette.length]} ${start}% ${end}%`;
        })
        .join(", ")
    : "#E9CBD1 0% 100%";

  return (
    <Card className="p-4">
      <h3 className="font-bold text-brand-teal">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <span className="text-2xl font-black text-brand-teal">{formatCompact(total)}</span>
            <span className="text-xs font-bold uppercase text-brand-teal/45">Total</span>
          </div>
        </div>
        <div className="space-y-2">
          {topItems.map((item, index) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="min-w-0 flex-1 truncate font-semibold text-brand-teal/70">{item.label}</span>
              <span className="font-bold text-brand-teal">{formatter(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function VerticalBarChart({ title, items, formatter, tall }: { title: string; items: Array<{ label: string; value: number }>; formatter: (value: number) => string; tall?: boolean }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="p-4">
      <h3 className="font-bold text-brand-teal">{title}</h3>
      <div className={clsx("mt-4 flex items-end gap-2 overflow-x-auto border-b border-[#E9CBD1] pb-8", tall ? "h-72" : "h-56")}>
        {items.length ? items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="relative flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-bold text-brand-teal/60">{formatter(item.value)}</span>
            <div className="w-full rounded-t-md" style={{ height: `${Math.max(8, (item.value / max) * 180)}px`, backgroundColor: palette[index % palette.length] }} />
            <span className="absolute -bottom-7 whitespace-nowrap text-xs font-semibold text-brand-teal/50">{item.label}</span>
          </div>
        )) : <EmptyInline />}
      </div>
    </Card>
  );
}

function TwoMetricBars({ title, items, labelA, labelB }: { title: string; items: Array<{ label: string; valueA: number; valueB: number }>; labelA: string; labelB: string }) {
  const max = Math.max(...items.flatMap((item) => [item.valueA, item.valueB]), 1);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-brand-teal">{title}</h3>
        <div className="flex gap-3 text-xs font-bold text-brand-teal/55">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#5BA0E6]" />{labelA}</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#A87452]" />{labelB}</span>
        </div>
      </div>
      <div className="mt-4 flex h-56 items-end gap-3 overflow-x-auto border-b border-[#E9CBD1] pb-8">
        {items.map((item) => (
          <div key={item.label} className="relative flex min-w-12 flex-1 items-end justify-center gap-1">
            <div className="w-5 rounded-t-md bg-[#5BA0E6]" style={{ height: `${Math.max(6, (item.valueA / max) * 170)}px` }} />
            <div className="w-5 rounded-t-md bg-[#A87452]" style={{ height: `${Math.max(6, (item.valueB / max) * 170)}px` }} />
            <span className="absolute -bottom-7 whitespace-nowrap text-xs font-semibold text-brand-teal/50">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HorizontalBarChart({ title, items, formatter }: { title: string; items: Array<{ label: string; value: number }>; formatter: (value: number) => string }) {
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <Card className="p-4">
      <h3 className="font-bold text-brand-teal">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item, index) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-brand-teal/70">{item.label}</span>
              <span className="font-bold text-brand-teal">{formatter(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#F0D6DB]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (Math.abs(item.value) / max) * 100)}%`, backgroundColor: palette[index % palette.length] }} />
            </div>
          </div>
        )) : <EmptyInline />}
      </div>
    </Card>
  );
}

function FunnelChart({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="p-4">
      <h3 className="font-bold text-brand-teal">{title}</h3>
      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <div key={item.label} className="rounded-md border border-[#E9CBD1] bg-white/70 p-3">
            <div className="flex justify-between text-sm font-bold text-brand-teal">
              <span>{item.label}</span>
              <span>{formatCompact(item.value)}</span>
            </div>
            <div className="mt-2 h-4 overflow-hidden rounded-full bg-[#F0D6DB]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, backgroundColor: palette[index % palette.length] }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ScatterChart({ rows }: { rows: AdsDailyRow[] }) {
  const points = rows.filter((row) => row.impressoes > 0).slice(0, 80);
  const maxCpc = Math.max(...points.map((row) => row.cpc), 1);
  const maxCtr = Math.max(...points.map((row) => row.ctr), 1);
  const maxSpend = Math.max(...points.map((row) => row.valor_gasto), 1);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-brand-teal">CTR vs CPC</h3>
        <span className="text-xs font-bold text-brand-teal/45">Tamanho da bolha = investimento</span>
      </div>
      <div className="relative mt-4 h-80 rounded-md border border-[#E9CBD1] bg-white/45">
        <div className="absolute bottom-3 left-3 text-xs font-bold text-brand-teal/45">CPC baixo</div>
        <div className="absolute right-3 top-3 text-xs font-bold text-brand-teal/45">CTR alto</div>
        {points.map((row, index) => {
          const left = Math.min(94, Math.max(4, (row.cpc / maxCpc) * 92));
          const bottom = Math.min(90, Math.max(6, (row.ctr / maxCtr) * 84));
          const size = Math.min(34, Math.max(9, (row.valor_gasto / maxSpend) * 28));

          return (
            <span
              key={row.id}
              title={`${row.anuncio} · CTR ${formatPct(row.ctr)} · CPC ${formatMoney(row.cpc)}`}
              className="absolute rounded-full border-2 border-white/80 opacity-80 shadow-sm"
              style={{
                left: `${left}%`,
                bottom: `${bottom}%`,
                width: size,
                height: size,
                backgroundColor: palette[index % palette.length],
              }}
            />
          );
        })}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", statusTone(status))}>
      {statusLabel(status)}
    </span>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0DDE1] px-4 py-3 text-sm font-bold text-brand-teal/70">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-md border border-[#E9CBD1] bg-white px-3 py-2 disabled:opacity-45">Voltar</button>
        <button type="button" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-md border border-[#E9CBD1] bg-white px-3 py-2 disabled:opacity-45">Avançar</button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-lg font-black text-brand-teal">{value}</p>
      <p className="text-[10px] font-black uppercase text-brand-teal/45">{label}</p>
    </div>
  );
}

function SummaryPill({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "good" | "warn" | "bad" }) {
  return (
    <Card className={clsx("p-4", tone === "good" && "border-emerald-100", tone === "warn" && "border-amber-100", tone === "bad" && "border-rose-100")}>
      <p className="text-xs font-semibold text-[color:var(--ds-text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-brand-teal">{value}</p>
    </Card>
  );
}

function AlertCard({ title, text, tone = "warn" }: { title: string; text: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <Card className={clsx("rounded-3xl border p-4 shadow-[var(--ds-shadow-sm)]", tone === "good" && "border-l-emerald-500", tone === "warn" && "border-l-amber-500", tone === "bad" && "border-l-rose-500")}>
      <p className="font-black text-brand-teal">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-brand-teal/65">{text}</p>
    </Card>
  );
}

type EvidenceRecommendation = { title: string; happened: string; evidence: string; why: string; recommendation: string; review: string; confidence: "Baixa" | "Média" | "Alta" };

function EvidenceCard({ title, happened, evidence, why, recommendation, review, confidence }: EvidenceRecommendation) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold text-brand-teal">{title}</h3><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Confiança {confidence.toLowerCase()}</span></div><dl className="mt-4 space-y-3 text-sm leading-6"><div><dt className="font-bold text-brand-clay">O que aconteceu?</dt><dd className="text-brand-teal/70">{happened}</dd></div><div><dt className="font-bold text-brand-clay">Evidência</dt><dd className="text-brand-teal/70">{evidence}</dd></div><div><dt className="font-bold text-brand-clay">Por que importa?</dt><dd className="text-brand-teal/70">{why}</dd></div><div><dt className="font-bold text-brand-clay">O que recomendamos?</dt><dd className="text-brand-teal/70">{recommendation}</dd></div><div><dt className="font-bold text-brand-clay">Quando revisar?</dt><dd className="text-brand-teal/70">{review}</dd></div></dl></Card>;
}

function buildTrafficRecommendations(rows: AdsDailyRow[], context: AdsContext): EvidenceRecommendation[] {
  const metrics = aggregate(rows);
  const period = rows.length ? `${formatDate(rows.map((row) => row.data_referencia).sort()[0])} a ${formatDate(rows.map((row) => row.data_referencia).sort().at(-1)!)}` : "período selecionado";
  const recommendations: EvidenceRecommendation[] = [];
  if (metrics.totSpend > 0 && metrics.metaCheckouts === 0) recommendations.push({ title: "Investimento sem checkout Meta", happened: "Houve investimento, mas nenhum InitiateCheckout foi reportado pela Meta.", evidence: `${formatMoney(metrics.totSpend)} investidos e ${metrics.metaCheckouts} checkout Meta em ${period}.`, why: "Pode indicar perda antes do checkout ou cobertura incompleta do evento.", recommendation: "Comparar cliques, LPV e checkout Norwyn antes de alterar campanha ou página.", review: "Após o próximo ciclo diário ou ao acumular novos checkouts.", confidence: metrics.totImp >= 1000 ? "Média" : "Baixa" });
  if (metrics.metaLinkClicks > 0 && metrics.metaLpv < metrics.metaLinkClicks * 0.25) recommendations.push({ title: "Cliques com poucos LPVs Meta", happened: "A quantidade de LPVs reportada ficou bem abaixo dos cliques no link.", evidence: `${metrics.metaLinkClicks} cliques no link e ${metrics.metaLpv} LPVs em ${period}.`, why: "A diferença pode envolver carregamento da página, consentimento, medição ou semântica da Meta.", recommendation: "Verificar velocidade, tracking e dados Norwyn. Não concluir que a LP falhou apenas com esta diferença.", review: "Em 24 horas, mantendo a mesma janela de atribuição.", confidence: metrics.metaLinkClicks >= 20 ? "Média" : "Baixa" });
  const hotmart = context.reconciliation.hotmart;
  if (metrics.metaPurchases > 0 || hotmart.confirmedSales) recommendations.push({ title: "Meta e Hotmart contam coisas diferentes", happened: "As fontes reportam conversões com regras próprias.", evidence: `${metrics.metaPurchases} Purchase Meta; ${hotmart.confirmedSales ?? "não disponível"} vendas Hotmart confirmadas; ${hotmart.attributedSales ?? "não disponível"} atribuídas via bridge.`, why: "Meta usa janela de atribuição; Hotmart confirma transação; Norwyn exige evidência de vínculo.", recommendation: "Analisar lado a lado, sem substituir a verdade financeira pela métrica Meta.", review: "Após a próxima reconciliação Hotmart.", confidence: hotmart.confirmedSales == null ? "Baixa" : "Alta" });
  const increasing = rows.filter((row) => row.frequencia > 3).length;
  if (increasing) recommendations.push({ title: "Frequência em observação", happened: "Alguns registros diários ultrapassaram a referência observacional.", evidence: `${increasing} registro(s) com frequência diária acima de 3 em ${period}.`, why: "Repetição crescente pode anteceder perda de eficiência, mas não comprova fadiga.", recommendation: "Comparar tendência de CTR, CPC e checkout antes de testar nova peça.", review: "Depois de mais 2 a 3 dias de entrega comparável.", confidence: increasing >= 3 ? "Média" : "Baixa" });
  const unresolved = rows.filter((row) => row.destination_url && !row.landing_key).length;
  if (unresolved) recommendations.push({ title: "Landing ainda não reconhecida", happened: "A Meta trouxe destino, mas a Norwyn não resolveu uma landing_key.", evidence: `${unresolved} registro(s) enriquecido(s) sem vínculo determinístico de LP.`, why: "Sem o vínculo, a leitura anúncio → LP → checkout fica incompleta.", recommendation: "Revisar registry, host/path e url_tags sem alterar a URL da campanha.", review: "Após atualizar a configuração canônica da landing.", confidence: "Alta" });
  return recommendations.length ? recommendations.slice(0, 6) : [{ title: "Sem sinal acionável no recorte", happened: "Nenhuma regra V1 foi acionada.", evidence: `${rows.length} registro(s) analisado(s) em ${period}.`, why: "Ausência de alerta não significa campanha perfeita; apenas que os critérios atuais não dispararam.", recommendation: "Continuar acompanhando as fontes Meta, Norwyn e Hotmart.", review: "No próximo ciclo diário.", confidence: "Baixa" }];
}

function TrendCard({ nome, delta, trend, ctrs }: { nome: string; delta: number; trend: "up" | "down" | "flat"; ctrs: number[] }) {
  const max = Math.max(...ctrs, 0.1);

  return (
    <Card className="p-4">
      <p className="text-xs font-black uppercase text-brand-clay/75">{trend === "down" ? "Queda consistente" : trend === "up" ? "Tendência de alta" : "Estável"}</p>
      <h3 className="mt-1 font-bold text-brand-teal">{truncate(nome, 42)}</h3>
      <div className="mt-4 flex h-16 items-end gap-1">
        {ctrs.map((ctr, index) => (
          <div key={`${nome}-${index}`} className={clsx("w-full rounded-t-sm", ctr < 1 ? "bg-rose-400" : ctr < 1.5 ? "bg-amber-400" : "bg-emerald-500")} style={{ height: `${Math.max(6, (ctr / max) * 60)}px` }} />
        ))}
      </div>
      <p className={clsx("mt-3 text-sm font-bold", trend === "down" ? "text-rose-600" : trend === "up" ? "text-emerald-700" : "text-brand-teal/60")}>{delta > 0 ? "+" : ""}{formatPct(delta)}</p>
    </Card>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <Card className="p-6 text-sm font-semibold text-brand-teal/55">{text}</Card>;
}

function EmptyInline() {
  return <div className="py-8 text-sm font-semibold text-brand-teal/50">Sem dados para exibir.</div>;
}

function buildAdsetRows(rows: AdsDailyRow[]) {
  const map = new Map<string, { conjunto: string; spend: number; impressoes: number; alcance: number; cliques: number; freqWeighted: number }>();
  rows.forEach((row) => {
    const key = row.conjunto || "Sem conjunto";
    const item = map.get(key) ?? { conjunto: key, spend: 0, impressoes: 0, alcance: 0, cliques: 0, freqWeighted: 0 };
    item.spend += row.valor_gasto;
    item.impressoes += row.impressoes;
    item.alcance += row.alcance;
    item.cliques += row.cliques;
    item.freqWeighted += row.frequencia * row.impressoes;
    map.set(key, item);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      ctr: item.impressoes > 0 ? (item.cliques / item.impressoes) * 100 : 0,
      cpc: item.cliques > 0 ? item.spend / item.cliques : 0,
      freq: item.impressoes > 0 ? item.freqWeighted / item.impressoes : 0,
    }))
    .sort((left, right) => right.spend - left.spend);
}

function buildCampaignBenchmark(rows: AdsDailyRow[]) {
  const map = new Map<string, { nome: string; spend: number; impressoes: number; cliques: number; alcance: number; freqWeighted: number }>();
  rows.forEach((row) => {
    const item = map.get(row.campanha) ?? { nome: row.campanha, spend: 0, impressoes: 0, cliques: 0, alcance: 0, freqWeighted: 0 };
    item.spend += row.valor_gasto;
    item.impressoes += row.impressoes;
    item.cliques += row.cliques;
    item.alcance += row.alcance;
    item.freqWeighted += row.frequencia * row.impressoes;
    map.set(row.campanha, item);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      ctr: item.impressoes > 0 ? (item.cliques / item.impressoes) * 100 : 0,
      cpc: item.cliques > 0 ? item.spend / item.cliques : 0,
      freq: item.impressoes > 0 ? item.freqWeighted / item.impressoes : 0,
    }))
    .sort((left, right) => right.spend - left.spend);
}

function buildAlerts(rows: AdsDailyRow[], metrics: ReturnType<typeof aggregate>) {
  const alerts: Array<{ title: string; text: string; tone: "good" | "warn" | "bad" }> = [];
  const saturados = rows.filter((row) => row.frequencia > 3.5).length;
  const ctrBaixo = rows.filter((row) => row.ctr < 1 && row.impressoes > 50).length;

  const period = rows.length ? `${formatDate(rows.map((row) => row.data_referencia).sort()[0])} a ${formatDate(rows.map((row) => row.data_referencia).sort().at(-1)!)} ` : "período atual";
  if (saturados) alerts.push({ tone: "warn", title: "Frequência acima da referência", text: `Evidência: ${saturados} registro(s) acima de 3,5 em ${period}. Regra observacional, confiança baixa; verificar tendência antes de alterar criativo ou público.` });
  if (ctrBaixo) alerts.push({ tone: "warn", title: "CTR abaixo da referência", text: `Evidência: ${ctrBaixo} registro(s) com CTR abaixo de 1% e ao menos 50 impressões em ${period}. Comparar criativo, público e etapa seguinte.` });
  if (metrics.cpmW > 50) alerts.push({ tone: "warn", title: "CPM acima da referência", text: `Evidência: CPM ponderado de ${formatMoney(metrics.cpmW)} em ${period}. Regra utilizada: acima de R$ 50; confiança baixa sem comparação por objetivo/público.` });
  if (metrics.ctrW < 1.5) alerts.push({ tone: "warn", title: "CTR em observação", text: `Evidência: CTR ponderado de ${formatPct(metrics.ctrW)} em ${period}. Regra utilizada: abaixo de 1,5%; revisar junto de LPV e checkout.` });

  return alerts;
}

function buildCreativeLifetime(rows: AdsDailyRow[], allRows: AdsDailyRow[]) {
  const allMap = new Map<string, { min: string; max: string }>();
  allRows.forEach((row) => {
    const item = allMap.get(row.anuncio) ?? { min: row.data_referencia, max: row.data_referencia };
    if (row.data_referencia < item.min) item.min = row.data_referencia;
    if (row.data_referencia > item.max) item.max = row.data_referencia;
    allMap.set(row.anuncio, item);
  });
  const lifetimes = [...allMap.values()]
    .map((item) => Math.round((parseDate(item.max).getTime() - parseDate(item.min).getTime()) / 86400000))
    .filter((days) => days > 0);
  const averageDays = lifetimes.length ? Math.round(lifetimes.reduce((sum, days) => sum + days, 0) / lifetimes.length) : 14;

  const map = new Map<string, { nome: string; campanha: string; min: string; freqSum: number; freqN: number; spend: number }>();
  rows.forEach((row) => {
    const item = map.get(row.anuncio) ?? { nome: row.anuncio, campanha: row.campanha, min: row.data_referencia, freqSum: 0, freqN: 0, spend: 0 };
    if (row.data_referencia < item.min) item.min = row.data_referencia;
    item.freqSum += row.frequencia;
    item.freqN += 1;
    item.spend += row.valor_gasto;
    map.set(row.anuncio, item);
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    averageDays,
    items: [...map.values()]
      .map((item) => {
        const dias = Math.max(0, Math.round((today.getTime() - parseDate(item.min).getTime()) / 86400000));
        const freq = item.freqN ? item.freqSum / item.freqN : 0;
        return {
          nome: item.nome,
          campanha: item.campanha,
          dias,
          freq,
          percent: averageDays > 0 ? Math.min((dias / averageDays) * 100, 100) : 0,
          status: dias > averageDays ? "critico" : dias > averageDays * 0.75 ? "alerta" : "ok",
          spend: item.spend,
        };
      })
      .sort((left, right) => right.spend - left.spend)
      .slice(0, 6),
  };
}

function buildTrends(rows: AdsDailyRow[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() - 7 * 86400000);
  const recent = rows.filter((row) => parseDate(row.data_referencia) >= limit);
  const map = new Map<string, Map<string, { imp: number; clicks: number }>>();
  recent.forEach((row) => {
    const campaignMap = map.get(row.campanha) ?? new Map<string, { imp: number; clicks: number }>();
    const item = campaignMap.get(row.data_referencia) ?? { imp: 0, clicks: 0 };
    item.imp += row.impressoes;
    item.clicks += row.cliques;
    campaignMap.set(row.data_referencia, item);
    map.set(row.campanha, campaignMap);
  });

  return [...map.entries()]
    .map(([nome, days]) => {
      const dates = [...days.keys()].sort();
      const ctrs = dates.map((date) => {
        const item = days.get(date);
        return item && item.imp > 0 ? (item.clicks / item.imp) * 100 : 0;
      });
      const delta = (ctrs.at(-1) ?? 0) - (ctrs[0] ?? 0);
      return {
        nome,
        ctrs,
        delta,
        trend: delta > 0.1 ? "up" : delta < -0.1 ? "down" : "flat",
      } as const;
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 4);
}

function buildAgencyActions(rows: AdsDailyRow[]): Array<{ title: string; text: string; tone: "good" | "warn" | "bad" }> {
  const actions: Array<{ title: string; text: string; tone: "good" | "warn" | "bad" }> = [];
  const saturados = rows.filter((row) => row.frequencia > 3.5);
  if (saturados.length) {
    actions.push({
      tone: "bad",
      title: "Verificar frequência crescente",
      text: `${new Set(saturados.map((row) => row.anuncio)).size} criativo(s) tiveram registro acima de 3,5. Compare CTR, CPC e checkout antes de decidir qualquer troca.`,
    });
  }

  const totalSpend = rows.reduce((sum, row) => sum + row.valor_gasto, 0);
  const weakCampaigns = buildCampaignBenchmark(rows).filter((row) => row.ctr < 1 && totalSpend > 0 && (row.spend / totalSpend) * 100 > 20);
  weakCampaigns.slice(0, 2).forEach((row) =>
    actions.push({
      tone: "warn",
      title: "Comparar concentração de investimento",
      text: `${truncate(row.nome, 52)} concentra ${formatPct((row.spend / totalSpend) * 100, 0)} do investimento com CTR de ${formatPct(row.ctr)}. Verifique LPV e checkout antes de discutir orçamento.`,
    }),
  );

  const adsets = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const key = row.conjunto || "Sem conjunto";
    const set = adsets.get(key) ?? new Set<string>();
    set.add(row.anuncio);
    adsets.set(key, set);
  });
  const semTeste = [...adsets.values()].filter((set) => set.size === 1).length;
  if (semTeste) {
    actions.push({ tone: "warn", title: "Avaliar comparação de criativos", text: `${semTeste} conjunto(s) aparecem com apenas um criativo no recorte. Confirmar configuração e amostra antes de planejar teste.` });
  }

  return actions.length ? actions.slice(0, 4) : [{ tone: "good", title: "Sem verificação prioritária", text: "No filtro atual, as regras observacionais não encontraram um sinal forte. Continue acompanhando o próximo ciclo." }];
}

function buildPredictability(rows: AdsDailyRow[], allRows: AdsDailyRow[]) {
  const lifetime = buildCreativeLifetime(rows, allRows);
  const remarketing = allRows.filter((row) => /remar|retarg/i.test(row.campanha));
  const cold = allRows.filter((row) => !/remar|retarg/i.test(row.campanha));
  const cpcRemarketing = remarketing.reduce((sum, row) => sum + row.cliques, 0) > 0 ? remarketing.reduce((sum, row) => sum + row.valor_gasto, 0) / remarketing.reduce((sum, row) => sum + row.cliques, 0) : 0;
  const cpcCold = cold.reduce((sum, row) => sum + row.cliques, 0) > 0 ? cold.reduce((sum, row) => sum + row.valor_gasto, 0) / cold.reduce((sum, row) => sum + row.cliques, 0) : 0;
  const nextSaturation = rows.filter((row) => row.frequencia > 2 && row.frequencia < 3.5).length;

  return [
    { label: "Vida útil média", value: `${lifetime.averageDays} dias`, tone: "neutral" as const },
    { label: "CPC Remarketing", value: cpcRemarketing ? formatMoney(cpcRemarketing) : "-", tone: "good" as const },
    { label: "CPC Público frio", value: cpcCold ? formatMoney(cpcCold) : "-", tone: "neutral" as const },
    { label: "Próx. saturações", value: nextSaturation, tone: nextSaturation ? "warn" as const : "good" as const },
  ];
}




