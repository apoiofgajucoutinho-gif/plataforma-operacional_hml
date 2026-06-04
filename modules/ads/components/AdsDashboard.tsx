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
  LineChart,
  ListFilter,
  MousePointerClick,
  Radio,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import type { ExportColumn } from "@/lib/client/table-export";
import type { AdsContext, AdsDailyRow, AdsPerformanceStatus } from "@/modules/ads/types";

type TabKey = "overview" | "performance" | "details" | "glossary" | "analysis";
type PeriodFilter = "today" | "7d" | "15d" | "30d" | "all";
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
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Tudo" },
];

const tabs: Array<{ value: TabKey; label: string; icon: typeof BarChart3 }> = [
  { value: "overview", label: "Visão Geral", icon: BarChart3 },
  { value: "performance", label: "Performance", icon: Target },
  { value: "details", label: "Detalhamento", icon: ListFilter },
  { value: "glossary", label: "Glossário", icon: BookOpen },
  { value: "analysis", label: "Análise", icon: Sparkles },
];

const statusOptions: Array<{ value: "" | AdsPerformanceStatus; label: string }> = [
  { value: "", label: "Todos os Status" },
  { value: "OK", label: "OK" },
  { value: "CTR BAIXO", label: "CTR Baixo" },
  { value: "SATURADO", label: "Saturado" },
  { value: "PUBLICO RUIM", label: "Público Ruim" },
];

const palette = ["#5BA0E6", "#AA6BD1", "#55BF83", "#D5828D", "#A87452", "#78A9B8", "#D6A35D", "#8EA4D2"];
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

const glossary = [
  ["SPEND", "Valor gasto / investimento", "Quanto foi cobrado pela Meta no período. Compare sempre com a fatura do cartão; diferença acima de 5% pede explicação."],
  ["CPM", "Custo por mil impressões", "Quanto você paga para o anúncio ser exibido 1.000 vezes. Referência saudável: R$ 15 a R$ 40."],
  ["CPC", "Custo por clique", "Valor gasto dividido pelos cliques. Abaixo de R$ 1,50 tende a ser bom; acima de R$ 3,00 merece revisão."],
  ["CTR", "Taxa de cliques", "Cliques divididos por impressões. Abaixo de 1% indica criativo fraco; acima de 2% costuma ser bom."],
  ["REACH", "Alcance", "Número de pessoas únicas que viram o anúncio pelo menos uma vez."],
  ["IMP", "Impressões", "Total de exibições do anúncio, incluindo repetições para a mesma pessoa."],
  ["FREQ", "Frequência", "Impressões divididas por alcance. Acima de 3 pode indicar saturação do público."],
  ["SCORE", "Score de performance", "Nota composta por CTR, CPC e frequência. Score alto indica eficiência operacional."],
  ["OK", "Anúncio saudável", "CTR acima de 1%, frequência controlada e custo de entrega dentro do esperado."],
  ["CTR BAIXO", "Criativo sem engajamento", "Anúncio com baixa taxa de clique. Normalmente pede troca de criativo ou chamada."],
  ["SATURADO", "Público esgotado", "Frequência alta. Pode exigir novo criativo ou expansão de público."],
  ["PUB. RUIM", "Segmentação incorreta", "CPM alto com CTR baixo, sugerindo público caro e pouco interessado."],
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

function applyPeriod(rows: AdsDailyRow[], period: PeriodFilter) {
  if (period === "all") return rows;

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else {
    const days = period === "7d" ? 7 : period === "15d" ? 15 : 30;
    start.setDate(end.getDate() - days);
    start.setHours(0, 0, 0, 0);
  }

  return rows.filter((row) => {
    const date = parseDate(row.data_referencia);
    return date >= start && date <= end;
  });
}

function aggregate(rows: AdsDailyRow[]) {
  const totSpend = rows.reduce((sum, row) => sum + row.valor_gasto, 0);
  const totImp = rows.reduce((sum, row) => sum + row.impressoes, 0);
  const totReach = rows.reduce((sum, row) => sum + row.alcance, 0);
  const totClicks = rows.reduce((sum, row) => sum + row.cliques, 0);
  const ctrW = totImp > 0 ? (totClicks / totImp) * 100 : 0;
  const cpcW = totClicks > 0 ? totSpend / totClicks : 0;
  const cpmW = totImp > 0 ? (totSpend / totImp) * 1000 : 0;
  const freqW = totReach > 0 ? totImp / totReach : 0;

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
    adsAtivos: new Set(recent.map((row) => row.anuncio)).size,
    campsAtivas: new Set(recent.map((row) => row.campanha)).size,
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

function groupByDay(rows: AdsDailyRow[]) {
  const map = new Map<string, { spend: number; reach: number; imp: number; clicks: number }>();
  rows.forEach((row) => {
    const item = map.get(row.data_referencia) ?? { spend: 0, reach: 0, imp: 0, clicks: 0 };
    item.spend += row.valor_gasto;
    item.reach += row.alcance;
    item.imp += row.impressoes;
    item.clicks += row.cliques;
    map.set(row.data_referencia, item);
  });

  return [...map.entries()]
    .map(([date, item]) => ({ date, ...item, ctr: item.imp > 0 ? (item.clicks / item.imp) * 100 : 0 }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function statusTone(status: string) {
  if (status === "OK") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "SATURADO") return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === "CTR BAIXO") return "bg-orange-50 text-orange-700 border-orange-100";
  if (status === "PUBLICO RUIM") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-brand-cream text-brand-teal/70 border-brand-sand";
}

export function AdsDashboard({ context }: { context: AdsContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState<PeriodFilter>("7d");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [campaign, setCampaign] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data_referencia");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const campaigns = useMemo(
    () => [...new Set(context.rows.map((row) => row.campanha).filter(Boolean))].sort(),
    [context.rows],
  );

  const years = useMemo(
    () => [...new Set(context.rows.map((row) => parseDate(row.data_referencia).getFullYear().toString()))].sort().reverse(),
    [context.rows],
  );

  const months = useMemo(() => {
    const available = context.rows
      .filter((row) => !year || parseDate(row.data_referencia).getFullYear().toString() === year)
      .map((row) => {
        const date = parseDate(row.data_referencia);
        const itemYear = date.getFullYear().toString();
        const itemMonth = String(date.getMonth() + 1).padStart(2, "0");
        return { value: `${itemYear}-${itemMonth}`, year: itemYear, month: itemMonth };
      });
    const unique = new Map<string, { value: string; year: string; month: string }>();
    available.forEach((item) => unique.set(item.value, item));

    return [...unique.values()].sort((left, right) => left.value.localeCompare(right.value));
  }, [context.rows, year]);

  const filteredRows = useMemo(() => {
    const periodRows = applyPeriod(context.rows, period);

    return periodRows.filter((row) => {
      const date = parseDate(row.data_referencia);
      const rowYear = date.getFullYear().toString();
      const rowMonth = String(date.getMonth() + 1).padStart(2, "0");
      const yearMatch = !year || rowYear === year;
      const monthMatch = !month || `${rowYear}-${rowMonth}` === month;
      const campaignMatch = !campaign || row.campanha === campaign;
      const statusMatch = !status || row.performance_status === status;

      return yearMatch && monthMatch && campaignMatch && statusMatch;
    });
  }, [campaign, context.rows, month, period, status, year]);

  const uniqueDates = new Set(context.rows.map((row) => row.data_referencia));
  const hasAccumulatedWarning = context.rows.length > 0 && uniqueDates.size <= 1;

  useEffect(() => {
    const label = tabs.find((tab) => tab.value === activeTab)?.label ?? "Visão Geral";

    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "ads",
        pagePath: "/ads",
        pageLabel: `Ads: ${label}`,
      }),
      keepalive: true,
    });
  }, [activeTab]);

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
                "inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold transition",
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
        year={year}
        month={month}
        campaign={campaign}
        status={status}
        years={years}
        months={months}
        campaigns={campaigns}
        onPeriod={(next) => {
          setPeriod(next);
          setPage(1);
        }}
        onYear={(next) => {
          setYear(next);
          setMonth("");
          setPage(1);
        }}
        onMonth={(next) => {
          setMonth(next);
          setPage(1);
        }}
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

      <PeriodSummary rows={filteredRows} totalRows={context.rows.length} period={period} year={year} month={month} />

      {activeTab === "overview" ? <OverviewTab rows={filteredRows} /> : null}
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
      {activeTab === "glossary" ? <GlossaryTab /> : null}
      {activeTab === "analysis" ? <AnalysisTab rows={filteredRows} allRows={context.rows} /> : null}
    </section>
  );
}

function Header({ updatedAt }: { updatedAt: string | null }) {
  return (
    <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-brand-clay">@FGA.JUCOUTINHO</p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-brand-teal">Instagram Ads Analytics</h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-brand-teal/70">
          KPIs, performance, detalhamento e análise de anúncios pagos migrados da aba Ads para o Supabase.
        </p>
      </div>
      <div className="text-sm font-semibold text-brand-teal/55">Base atualizada em {formatDateTime(updatedAt)}</div>
    </header>
  );
}

function Filters({
  period,
  year,
  month,
  campaign,
  status,
  years,
  months,
  campaigns,
  onPeriod,
  onYear,
  onMonth,
  onCampaign,
  onStatus,
}: {
  period: PeriodFilter;
  year: string;
  month: string;
  campaign: string;
  status: string;
  years: string[];
  months: Array<{ value: string; year: string; month: string }>;
  campaigns: string[];
  onPeriod: (value: PeriodFilter) => void;
  onYear: (value: string) => void;
  onMonth: (value: string) => void;
  onCampaign: (value: string) => void;
  onStatus: (value: string) => void;
}) {
  return (
    <Card className="flex flex-wrap items-center gap-2 p-4">
      <span className="mr-1 text-xs font-bold uppercase text-brand-clay">Período</span>
      {periodFilters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onPeriod(filter.value)}
          className={clsx(
            "h-9 rounded-full border px-4 text-sm font-bold transition",
            period === filter.value
              ? "border-brand-clay bg-brand-clay text-white"
              : "border-[#E9CBD1] bg-white text-brand-teal hover:bg-[#FFF7F8]",
          )}
        >
          {filter.label}
        </button>
      ))}

      <span className="mx-2 hidden h-8 w-px bg-[#E9CBD1] md:block" />

      <select
        value={year}
        onChange={(event) => onYear(event.target.value)}
        className="h-10 min-w-[150px] rounded-md border border-[#E9CBD1] bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="">Todos os Anos</option>
        {years.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={month}
        onChange={(event) => onMonth(event.target.value)}
        className="h-10 min-w-[160px] rounded-md border border-[#E9CBD1] bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="">Todos os Meses</option>
        {months.map((item) => (
          <option key={item.value} value={item.value}>
            {formatMonthOption(item.year, item.month)}
          </option>
        ))}
      </select>

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
    </Card>
  );
}

function PeriodSummary({
  rows,
  totalRows,
  period,
  year,
  month,
}: {
  rows: AdsDailyRow[];
  totalRows: number;
  period: PeriodFilter;
  year: string;
  month: string;
}) {
  const label = periodFilters.find((filter) => filter.value === period)?.label ?? "Tudo";
  const calendarLabel = year || month ? `, ${month ? formatMonthKeyOption(month) : `ano ${year}`}` : "";
  const dates = rows.map((row) => row.data_referencia).sort();

  return (
    <p className="text-sm font-semibold text-brand-teal/60">
      {rows.length} de {totalRows} registros no filtro {label}
      {calendarLabel}
      {dates.length ? `, de ${formatDate(dates[0])} a ${formatDate(dates.at(-1) ?? dates[0])}` : ""}.
    </p>
  );
}

function OverviewTab({ rows }: { rows: AdsDailyRow[] }) {
  const metrics = aggregate(rows);
  const statusCount = groupSum(rows, (row) => row.performance_status, () => 1);
  const spendByCampaign = groupSum(rows, (row) => row.campanha, (row) => row.valor_gasto).slice(0, 8);
  const daily = groupByDay(rows);

  return (
    <div className="space-y-5">
      <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Visão Geral" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={<CircleDollarSign />} label="Investimento Total" value={formatMoney(metrics.totSpend)} sub={`${rows.length} registros`} />
        <KpiCard icon={<Radio />} label="Alcance Total" value={formatCompact(metrics.totReach)} sub="pessoas únicas" />
        <KpiCard icon={<Eye />} label="Impressões" value={formatCompact(metrics.totImp)} sub="exibições totais" />
        <KpiCard icon={<MousePointerClick />} label="Cliques" value={formatCompact(metrics.totClicks)} sub="total no período" />
        <KpiCard icon={<Target />} label="CTR Médio" value={formatPct(metrics.ctrW)} sub="ponderado por impressões" />
        <KpiCard icon={<CircleDollarSign />} label="CPC Médio" value={formatMoney(metrics.cpcW)} sub="custo por clique" />
        <KpiCard icon={<BarChart3 />} label="CPM Médio" value={formatMoney(metrics.cpmW)} sub="custo por mil impr." />
        <KpiCard icon={<RefreshCw />} label="Frequência Média" value={formatDecimal(metrics.freqW)} sub={metrics.freqW > 3 ? "saturação" : "saudável (<3)"} />
        <KpiCard icon={<Gauge />} label="Anúncios Ativos" value={formatNumber(metrics.adsAtivos)} sub="com gasto nos últimos 3 dias" />
        <KpiCard icon={<LineChart />} label="Campanhas Ativas" value={formatNumber(metrics.campsAtivas)} sub="com gasto nos últimos 3 dias" />
        <KpiCard icon={<Target />} label="Conversões" value="-" sub="Em breve" muted />
        <KpiCard icon={<MousePointerClick />} label="Leads" value="-" sub="Em breve" muted />
      </div>

      <SectionTitle icon={<Trophy className="h-4 w-4" />} title="Insights Rápidos" />
      <InsightGrid rows={rows} />

      <SectionTitle icon={<BarChart3 className="h-4 w-4" />} title="Distribuição" />
      <div className="grid gap-4 xl:grid-cols-2">
        <DonutChart title="Investimento por Campanha" items={spendByCampaign} formatter={formatMoney} />
        <DonutChart title="Status de Performance" items={statusCount} formatter={(value) => `${formatNumber(value)} registros`} />
      </div>

      <SectionTitle icon={<LineChart className="h-4 w-4" />} title="Evolução Diária" />
      <VerticalBarChart title="Investimento Diário" items={daily.map((day) => ({ label: formatDate(day.date).slice(0, 5), value: day.spend }))} formatter={formatMoney} tall />
      <div className="grid gap-4 xl:grid-cols-2">
        <TwoMetricBars
          title="Alcance vs Impressões (Diário)"
          items={daily.map((day) => ({ label: formatDate(day.date).slice(0, 5), valueA: day.reach, valueB: day.imp }))}
          labelA="Alcance"
          labelB="Impressões"
        />
        <VerticalBarChart
          title="CTR Diário"
          items={daily.map((day) => ({ label: formatDate(day.date).slice(0, 5), value: day.ctr }))}
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
      <SectionTitle icon={<Target className="h-4 w-4" />} title="Funil de Conversão" />
      <div className="grid gap-4 xl:grid-cols-2">
        <FunnelChart
          title="Impressões -> Alcance -> Cliques"
          items={[
            { label: "Impressões", value: metrics.totImp },
            { label: "Alcance", value: metrics.totReach },
            { label: "Cliques", value: metrics.totClicks },
          ]}
        />
        <HorizontalBarChart
          title="Top 10 Anúncios por Score"
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
      <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} title="Alertas Ativos" />
      <div className="grid gap-3 lg:grid-cols-3">
        <SummaryPill label="Alertas" value={alerts.length} tone={alerts.length ? "bad" : "good"} />
        <SummaryPill label="CTR médio" value={formatPct(metrics.ctrW)} tone={metrics.ctrW >= 1.5 ? "good" : "warn"} />
        <SummaryPill label="Frequência" value={formatDecimal(metrics.freqW)} tone={metrics.freqW > 3 ? "bad" : "good"} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {alerts.length ? alerts.map((alert) => <AlertCard key={alert.title} {...alert} />) : <EmptyCard text="Nenhum alerta crítico no filtro atual." />}
      </div>

      <SectionTitle icon={<RefreshCw className="h-4 w-4" />} title="Vida Útil dos Criativos" />
      <p className="text-sm font-semibold text-brand-teal/60">
        Vida útil média histórica estimada em {lifetime.averageDays} dias antes de saturação ou queda de eficiência.
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

      <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="O que a Agência Deveria Ter Feito" />
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
    <Card className={clsx("relative overflow-hidden p-4", muted && "opacity-70")}>
      <div className={clsx("absolute left-4 right-4 top-0 h-1 rounded-b-full", muted ? "bg-brand-sand" : "bg-brand-clay")} />
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[#FFF0F2] text-brand-clay [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs font-black uppercase text-brand-clay/75">{label}</p>
      <p className="mt-2 text-2xl font-black leading-none text-brand-teal">{value}</p>
      <p className="mt-2 text-xs font-semibold text-brand-teal/50">{sub}</p>
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
      <InsightCard title="Top Performer" value={truncate(top?.anuncio, 40) || "-"} desc={`Score: ${formatDecimal(top?.performance_score ?? 0)} · CTR ${formatPct(top?.ctr ?? 0)}`} tone="good" />
      <InsightCard title="Precisa Atenção" value={truncate(bottom?.anuncio, 40) || "Nenhum"} desc={bottom ? `Score: ${formatDecimal(bottom.performance_score)} · Gasto ${formatMoney(bottom.valor_gasto)}` : "Volume insuficiente"} tone={bottom?.performance_score < 0 ? "bad" : "warn"} />
      <InsightCard title="Maior Investimento" value={truncate(topCamp?.label, 32) || "-"} desc={topCamp ? formatMoney(topCamp.value) : "-"} />
      <InsightCard title="Campanha + Eficiente" value={truncate(campCtr?.nome, 32) || "-"} desc={`CTR: ${campCtr ? formatPct(campCtr.ctr) : "-"}`} tone="good" />
      <InsightCard title="Anúncios Saturados" value={formatNumber(saturados)} desc="com frequência > 3" tone={saturados > 0 ? "bad" : "good"} />
      <InsightCard title="CTR Baixo" value={formatNumber(ctrBaixo)} desc="com CTR < 1%" tone={ctrBaixo > 0 ? "warn" : "good"} />
      <InsightCard title='Spend em "OK"' value={formatPct(pctOk, 0)} desc={`${formatMoney(okSpend)} de ${formatMoney(totalSpend)}`} tone={pctOk >= 60 ? "good" : pctOk >= 30 ? "warn" : "bad"} />
      <InsightCard title="Menor CPC" value={minCpc ? formatMoney(minCpc.cpc) : "-"} desc={minCpc ? truncate(minCpc.anuncio, 30) : "Volume insuficiente"} tone="good" />
    </div>
  );
}

function InsightCard({ title, value, desc, tone = "neutral" }: { title: string; value: string; desc: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  return (
    <Card className={clsx("border-l-4 p-4", tone === "good" && "border-l-emerald-500", tone === "warn" && "border-l-amber-500", tone === "bad" && "border-l-rose-500", tone === "neutral" && "border-l-brand-clay")}>
      <p className="text-xs font-black uppercase text-brand-clay/75">{title}</p>
      <p className="mt-2 text-xl font-black text-brand-teal">{value}</p>
      <p className="mt-2 text-sm text-brand-teal/60">{desc}</p>
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
      {status === "PUBLICO RUIM" ? "Público Ruim" : status}
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
      <p className="text-xs font-black uppercase text-brand-clay/75">{label}</p>
      <p className="mt-2 text-2xl font-black text-brand-teal">{value}</p>
    </Card>
  );
}

function AlertCard({ title, text, tone = "warn" }: { title: string; text: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <Card className={clsx("border-l-4 p-4", tone === "good" && "border-l-emerald-500", tone === "warn" && "border-l-amber-500", tone === "bad" && "border-l-rose-500")}>
      <p className="font-black text-brand-teal">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-brand-teal/65">{text}</p>
    </Card>
  );
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
  const map = new Map<string, { conjunto: string; spend: number; impressoes: number; alcance: number; cliques: number }>();
  rows.forEach((row) => {
    const key = row.conjunto || "Sem conjunto";
    const item = map.get(key) ?? { conjunto: key, spend: 0, impressoes: 0, alcance: 0, cliques: 0 };
    item.spend += row.valor_gasto;
    item.impressoes += row.impressoes;
    item.alcance += row.alcance;
    item.cliques += row.cliques;
    map.set(key, item);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      ctr: item.impressoes > 0 ? (item.cliques / item.impressoes) * 100 : 0,
      cpc: item.cliques > 0 ? item.spend / item.cliques : 0,
      freq: item.alcance > 0 ? item.impressoes / item.alcance : 0,
    }))
    .sort((left, right) => right.spend - left.spend);
}

function buildCampaignBenchmark(rows: AdsDailyRow[]) {
  const map = new Map<string, { nome: string; spend: number; impressoes: number; cliques: number; alcance: number }>();
  rows.forEach((row) => {
    const item = map.get(row.campanha) ?? { nome: row.campanha, spend: 0, impressoes: 0, cliques: 0, alcance: 0 };
    item.spend += row.valor_gasto;
    item.impressoes += row.impressoes;
    item.cliques += row.cliques;
    item.alcance += row.alcance;
    map.set(row.campanha, item);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      ctr: item.impressoes > 0 ? (item.cliques / item.impressoes) * 100 : 0,
      cpc: item.cliques > 0 ? item.spend / item.cliques : 0,
      freq: item.alcance > 0 ? item.impressoes / item.alcance : 0,
    }))
    .sort((left, right) => right.spend - left.spend);
}

function buildAlerts(rows: AdsDailyRow[], metrics: ReturnType<typeof aggregate>) {
  const alerts: Array<{ title: string; text: string; tone: "good" | "warn" | "bad" }> = [];
  const saturados = rows.filter((row) => row.frequencia > 3.5).length;
  const ctrBaixo = rows.filter((row) => row.ctr < 1 && row.impressoes > 50).length;

  if (saturados) alerts.push({ tone: "bad", title: "Criativos saturados", text: `${saturados} anúncio(s) com frequência acima de 3,5. Avaliar troca de criativo ou expansão de público.` });
  if (ctrBaixo) alerts.push({ tone: "warn", title: "CTR baixo", text: `${ctrBaixo} anúncio(s) com CTR abaixo de 1% e volume mínimo. Pedir novos testes criativos.` });
  if (metrics.cpmW > 50) alerts.push({ tone: "warn", title: "CPM acima de R$ 50", text: `CPM médio de ${formatMoney(metrics.cpmW)}. Pode indicar público caro ou segmentação muito restrita.` });
  if (metrics.ctrW < 1.5) alerts.push({ tone: "warn", title: "CTR médio abaixo da meta", text: `CTR médio ponderado em ${formatPct(metrics.ctrW)}. Meta saudável para acompanhamento: acima de 1,5%.` });

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
      title: "Trocar criativos saturados",
      text: `${new Set(saturados.map((row) => row.anuncio)).size} criativo(s) acima de frequência 3,5. Isso sugere cansaço de público.`,
    });
  }

  const totalSpend = rows.reduce((sum, row) => sum + row.valor_gasto, 0);
  const weakCampaigns = buildCampaignBenchmark(rows).filter((row) => row.ctr < 1 && totalSpend > 0 && (row.spend / totalSpend) * 100 > 20);
  weakCampaigns.slice(0, 2).forEach((row) =>
    actions.push({
      tone: "warn",
      title: "Revisar orçamento de campanha fraca",
      text: `${truncate(row.nome, 52)} concentra ${formatPct((row.spend / totalSpend) * 100, 0)} do investimento com CTR de ${formatPct(row.ctr)}.`,
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
    actions.push({ tone: "warn", title: "Criar testes A/B", text: `${semTeste} conjunto(s) rodam com apenas um criativo. Sem teste, fica difícil saber qual mensagem performa melhor.` });
  }

  return actions.length ? actions.slice(0, 4) : [{ tone: "good", title: "Sem omissões críticas", text: "No filtro atual, não há sinais fortes de saturação, orçamento mal distribuído ou falta de teste A/B." }];
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
