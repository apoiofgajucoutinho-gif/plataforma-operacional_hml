"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  Heart,
  LayoutGrid,
  MessageCircle,
  Radio,
  Save,
  Share2,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import type { ExportColumn } from "@/lib/client/table-export";
import type {
  EngagementClassification,
  InstagramContext,
  InstagramPostMetric,
  InstagramPostType,
} from "@/modules/instagram/types";

type TabKey = "insights" | "results";
type PeriodFilter = "all" | "today" | "7d" | "15d" | "30d";
type TypeFilter = "all" | InstagramPostType;
type RankMetric = "alcance" | "likes" | "salvos" | "compartilhamentos" | "comentarios";
type SortKey =
  | "data_postagem"
  | "tipo"
  | "alcance"
  | "likes"
  | "comentarios"
  | "salvos"
  | "compartilhamentos"
  | "engajamento_classificacao";

const RESULTS_PAGE_SIZE = 20;

const postTypes: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "Todos os Tipos" },
  { value: "Reels", label: "Reels" },
  { value: "Carrossel", label: "Carrossel" },
  { value: "Estatico", label: "Estatico" },
  { value: "Outro", label: "Outro" },
];

const periodFilters: Array<{ value: PeriodFilter; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Tudo" },
];

const rankMetrics: Array<{ value: RankMetric; label: string; icon: ReactNode }> = [
  { value: "alcance", label: "Maior Alcance", icon: <Radio className="h-3.5 w-3.5" /> },
  { value: "likes", label: "Mais Curtidos", icon: <Heart className="h-3.5 w-3.5" /> },
  { value: "salvos", label: "Mais Salvos", icon: <Save className="h-3.5 w-3.5" /> },
  { value: "compartilhamentos", label: "Mais Compartilhados", icon: <Share2 className="h-3.5 w-3.5" /> },
  { value: "comentarios", label: "Mais Comentados", icon: <MessageCircle className="h-3.5 w-3.5" /> },
];

const weekDays = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
const shortMonthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function numberFormat(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function compactFormat(value: number | null | undefined) {
  const numeric = value ?? 0;
  if (Math.abs(numeric) < 1000) return numberFormat(Math.round(numeric));

  const shortValue = numeric / 1000;
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: shortValue >= 10 ? 0 : 1,
  }).format(shortValue);

  return `${formatted}k`;
}

function decimalFormat(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function dateFormat(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function monthKey(post: InstagramPostMetric) {
  const date = parseDate(post.data_postagem);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shortMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const index = Number(month) - 1;

  return `${shortMonthNames[index] ?? month}/${year.slice(2)}`;
}

function dateTimeFormat(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function weekOfMonth(post: InstagramPostMetric) {
  return Math.ceil(parseDate(post.data_postagem).getDate() / 7);
}

function dayName(post: InstagramPostMetric) {
  return weekDays[parseDate(post.data_postagem).getDay()];
}

function weekStartKey(post: InstagramPostMetric) {
  const date = parseDate(post.data_postagem);
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());

  return start.toISOString().slice(0, 10);
}

function applyPeriod(posts: InstagramPostMetric[], period: PeriodFilter) {
  if (period === "all") {
    return posts;
  }

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else {
    const days = period === "7d" ? 7 : period === "15d" ? 15 : 30;
    start.setDate(end.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
  }

  return posts.filter((post) => {
    const postDate = parseDate(post.data_postagem);

    return postDate >= start && postDate <= end;
  });
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function numericValue(post: InstagramPostMetric, key: RankMetric | SortKey) {
  if (key === "engajamento_classificacao") {
    return engagementRank(post.engajamento_classificacao);
  }

  if (key === "data_postagem" || key === "tipo") {
    return 0;
  }

  return Number(post[key] ?? 0);
}

function engagementRank(value: EngagementClassification) {
  return value === "Bom" ? 3 : value === "Medio" ? 2 : value === "Ruim" ? 1 : 0;
}

function bestBy(posts: InstagramPostMetric[], field: RankMetric) {
  return [...posts].sort((left, right) => numericValue(right, field) - numericValue(left, field))[0];
}

function predominantEngagement(posts: InstagramPostMetric[]) {
  const counts: Record<EngagementClassification, number> = {
    Bom: 0,
    Medio: 0,
    Ruim: 0,
    "N/A": 0,
  };
  posts.forEach((post) => {
    counts[post.engajamento_classificacao] += 1;
  });

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A") as EngagementClassification;
}

function bestDay(posts: InstagramPostMetric[]) {
  const days = weekDays.map((label, index) => {
    const items = posts.filter((post) => parseDate(post.data_postagem).getDay() === index);

    return {
      label,
      posts: items.length,
      averageReach: average(items.map((post) => post.alcance ?? 0).filter((value) => value > 0)),
    };
  });

  return days.sort((left, right) => right.averageReach - left.averageReach)[0] ?? days[0];
}

function bestHour(posts: InstagramPostMetric[]) {
  const hours = hourDistribution(posts);

  return [...hours].sort((left, right) => right.total - left.total)[0]?.label ?? "-";
}

function groupByType(posts: InstagramPostMetric[]) {
  return (["Reels", "Carrossel", "Estatico", "Outro"] as InstagramPostType[]).map((type) => {
    const items = posts.filter((post) => post.tipo === type);
    const reachValues = items.map((post) => post.alcance ?? 0).filter((value) => value > 0);
    const engagementScores = items
      .map((post) => engagementRank(post.engajamento_classificacao))
      .filter((value) => value > 0);

    return {
      type,
      total: items.length,
      averageReach: average(reachValues),
      engagementScore: average(engagementScores.map((value) => (value === 3 ? 100 : value === 2 ? 60 : 20))),
      predominantEngagement: predominantEngagement(items),
      bestDay: bestDay(items),
      bestHour: bestHour(items),
    };
  });
}

function hourDistribution(posts: InstagramPostMetric[]) {
  const map = new Map<number, number>();
  posts.forEach((post) => {
    if (!post.hora_postagem) return;
    const hour = Number(post.hora_postagem.slice(0, 2));
    if (!Number.isFinite(hour)) return;
    map.set(hour, (map.get(hour) ?? 0) + 1);
  });

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, total]) => ({ label: `${String(hour).padStart(2, "0")}h`, total }));
}

function monthEvolution(posts: InstagramPostMetric[]) {
  const keys = [...new Set(posts.map(monthKey))].sort();

  return keys.map((key) => {
    const items = posts.filter((post) => monthKey(post) === key);
    const reaches = items.map((post) => post.alcance ?? 0).filter((value) => value > 0);

    return {
      label: shortMonthLabel(key),
      posts: items.length,
      averageReach: average(reaches),
    };
  });
}

function postsByWeek(posts: InstagramPostMetric[]) {
  const map = new Map<string, number>();
  posts.forEach((post) => {
    const key = weekStartKey(post);
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, total]) => ({ label: dateFormat(key), total }));
}

function groupedByMonthWeek(posts: InstagramPostMetric[]) {
  const groups = new Map<number, InstagramPostMetric[]>();
  posts.forEach((post) => {
    const key = weekOfMonth(post);
    groups.set(key, [...(groups.get(key) ?? []), post]);
  });

  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

function truncate(value: string | null | undefined, size = 96) {
  if (!value) return "-";
  return value.length > size ? `${value.slice(0, size).trim()}...` : value;
}

export function InstagramDashboard({ context }: { context: InstagramContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("insights");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [week, setWeek] = useState("all");
  const [rankMetric, setRankMetric] = useState<RankMetric>("alcance");
  const [sortKey, setSortKey] = useState<SortKey>("data_postagem");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [resultsPage, setResultsPage] = useState(1);

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "instagram",
        pagePath: "/instagram",
        pageLabel: activeTab === "insights" ? "Instagram: Insights" : "Instagram: Resultados",
      }),
      keepalive: true,
    });
  }, [activeTab]);

  useEffect(() => {
    setResultsPage(1);
  }, [period, type, year, month, week, sortKey, sortDirection]);

  const years = useMemo(
    () => [...new Set(context.posts.map((post) => parseDate(post.data_postagem).getFullYear().toString()))].sort().reverse(),
    [context.posts],
  );
  const months = useMemo(() => {
    const source = year === "all"
      ? context.posts
      : context.posts.filter((post) => parseDate(post.data_postagem).getFullYear().toString() === year);

    return [...new Set(source.map(monthKey))].sort().reverse();
  }, [context.posts, year]);
  const availableWeeks = useMemo(() => {
    if (month === "all") return [];
    return [...new Set(context.posts.filter((post) => monthKey(post) === month).map(weekOfMonth))].sort((a, b) => a - b);
  }, [context.posts, month]);

  const filteredPosts = useMemo(() => {
    let posts = applyPeriod(context.posts, period);

    if (type !== "all") {
      posts = posts.filter((post) => post.tipo === type);
    }

    if (year !== "all") {
      posts = posts.filter((post) => parseDate(post.data_postagem).getFullYear().toString() === year);
    }

    if (month !== "all") {
      posts = posts.filter((post) => monthKey(post) === month);
    }

    if (week !== "all") {
      posts = posts.filter((post) => weekOfMonth(post).toString() === week);
    }

    return posts;
  }, [context.posts, period, type, year, month, week]);

  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((left, right) => {
      let result = 0;

      if (sortKey === "data_postagem") {
        result = parseDate(left.data_postagem).getTime() - parseDate(right.data_postagem).getTime();
      } else if (sortKey === "tipo") {
        result = left.tipo.localeCompare(right.tipo);
      } else {
        result = numericValue(left, sortKey) - numericValue(right, sortKey);
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredPosts, sortDirection, sortKey]);

  const totalPosts = filteredPosts.length;
  const totalReach = filteredPosts.reduce((sum, post) => sum + (post.alcance ?? 0), 0);
  const totalLikes = filteredPosts.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = filteredPosts.reduce((sum, post) => sum + post.comentarios, 0);
  const totalSaved = filteredPosts.reduce((sum, post) => sum + (post.salvos ?? 0), 0);
  const totalShares = filteredPosts.reduce((sum, post) => sum + (post.compartilhamentos ?? 0), 0);
  const engagementPosts = filteredPosts.filter((post) => post.engajamento_classificacao !== "N/A");
  const goodEngagementRate =
    engagementPosts.length > 0
      ? (engagementPosts.filter((post) => post.engajamento_classificacao === "Bom").length / engagementPosts.length) * 100
      : 0;
  const typeGroups = groupByType(filteredPosts);
  const ranking = [...filteredPosts]
    .sort((left, right) => numericValue(right, rankMetric) - numericValue(left, rankMetric))
    .slice(0, 10);
  const topReach = bestBy(filteredPosts, "alcance");
  const topLikes = bestBy(filteredPosts, "likes");
  const topSaved = bestBy(filteredPosts, "salvos");
  const topShares = bestBy(filteredPosts, "compartilhamentos");
  const topComments = bestBy(filteredPosts, "comentarios");
  const dayStats = weekDays.map((label, index) => {
    const posts = filteredPosts.filter((post) => parseDate(post.data_postagem).getDay() === index);
    return {
      label,
      posts: posts.length,
      averageReach: average(posts.map((post) => post.alcance ?? 0).filter((value) => value > 0)),
    };
  });
  const bestWeekDay = [...dayStats].sort((left, right) => right.averageReach - left.averageReach)[0];
  const bestFormat = [...typeGroups].sort((left, right) => right.averageReach - left.averageReach)[0];
  const engagementDistribution = (["Bom", "Medio", "Ruim", "N/A"] as EngagementClassification[]).map((item) => ({
    label: item,
    total: filteredPosts.filter((post) => post.engajamento_classificacao === item).length,
  }));
  const weeklyAverage = totalPosts / Math.max(postsByWeek(filteredPosts).length, 1);
  const resultsPageCount = Math.max(Math.ceil(sortedPosts.length / RESULTS_PAGE_SIZE), 1);
  const currentResultsPage = Math.min(resultsPage, resultsPageCount);
  const paginatedPosts = sortedPosts.slice(
    (currentResultsPage - 1) * RESULTS_PAGE_SIZE,
    currentResultsPage * RESULTS_PAGE_SIZE,
  );
  const groupedRows = month !== "all" ? groupedByMonthWeek(paginatedPosts) : [];

  function resetPeriodFilters(nextPeriod: PeriodFilter) {
    setPeriod(nextPeriod);
    setYear("all");
    setMonth("all");
    setWeek("all");
  }

  function resetSelectionFilters(kind: "year" | "month", value: string) {
    setPeriod("all");
    if (kind === "year") {
      setYear(value);
      setMonth("all");
      setWeek("all");
    }
    if (kind === "month") {
      setMonth(value);
      setWeek("all");
    }
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  const resultColumns: ExportColumn<InstagramPostMetric>[] = [
    { header: "Data", value: (post) => dateFormat(post.data_postagem) },
    { header: "Dia", value: (post) => dayName(post) },
    { header: "Tipo", value: (post) => post.tipo },
    { header: "Conteudo", value: (post) => post.legenda ?? "" },
    { header: "Alcance", value: (post) => post.alcance ?? "" },
    { header: "Likes", value: (post) => post.likes },
    { header: "Comentarios", value: (post) => post.comentarios },
    { header: "Salvos", value: (post) => post.salvos ?? "" },
    { header: "Compartilhamentos", value: (post) => post.compartilhamentos ?? "" },
    { header: "Engajamento", value: (post) => post.engajamento_classificacao },
    { header: "Link", value: (post) => post.permalink ?? "" },
  ];

  return (
    <div className="mx-auto max-w-[1760px] space-y-5 text-[15px]">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-clay">
            {context.account?.username ? `@${context.account.username}` : "Instagram"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-teal sm:text-4xl">Instagram Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/70">
            KPIs, insights e resultados migrados da planilha para o Supabase, com layout operacional da plataforma.
          </p>
        </div>
        {context.updatedAt ? (
          <p className="text-xs font-semibold text-brand-teal/55">
            Base atualizada em {dateTimeFormat(context.updatedAt)}
          </p>
        ) : null}
      </header>

      {context.diagnostic ? (
        <Card className="border-[#E9CBD1] p-5">
          <p className="text-sm font-semibold text-brand-teal">Modulo Instagram ainda nao encontrou dados.</p>
          <p className="mt-2 text-sm text-brand-teal/70">{context.diagnostic}</p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <TabButton isActive={activeTab === "insights"} onClick={() => setActiveTab("insights")}>
          Insights
        </TabButton>
        <TabButton isActive={activeTab === "results"} onClick={() => setActiveTab("results")}>
          Resultados
        </TabButton>
      </div>

      <Card className="border-[#E9CBD1] bg-white/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-clay">Periodo</span>
          {periodFilters.map((item) => (
            <FilterButton key={item.value} isActive={period === item.value} onClick={() => resetPeriodFilters(item.value)}>
              {item.label}
            </FilterButton>
          ))}
          <span className="hidden h-7 w-px bg-[#E9CBD1] sm:block" />
          <Select value={year} onChange={(value) => resetSelectionFilters("year", value)}>
            <option value="all">Todos os Anos</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={month} onChange={(value) => resetSelectionFilters("month", value)}>
            <option value="all">Todos os Meses</option>
            {months.map((item) => (
              <option key={item} value={item}>
                {shortMonthLabel(item)}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(value) => setType(value as TypeFilter)}>
            {postTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {activeTab === "insights" ? (
        <>
          <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Visao Geral" />
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 2xl:grid-cols-8">
            <Metric icon={<BarChart3 className="h-5 w-5" />} label="Total de Posts" value={totalPosts} helper={`${decimalFormat(weeklyAverage)} posts/semana`} />
            <Metric icon={<Radio className="h-5 w-5" />} label="Alcance Total" value={compactFormat(totalReach)} helper={`Media: ${compactFormat(totalReach / Math.max(totalPosts, 1))}/post`} />
            <Metric icon={<Sparkles className="h-5 w-5" />} label="Taxa de Bom Eng." value={`${decimalFormat(goodEngagementRate)}%`} helper={`${engagementPosts.length} avaliados`} />
            <Metric icon={<Star className="h-5 w-5" />} label="Reels" value={typeGroups.find((item) => item.type === "Reels")?.total ?? 0} helper="publicacoes" />
            <Metric icon={<LayoutGrid className="h-5 w-5" />} label="Carrosseis" value={typeGroups.find((item) => item.type === "Carrossel")?.total ?? 0} helper="publicacoes" />
            <Metric icon={<CalendarDays className="h-5 w-5" />} label="Estaticos" value={typeGroups.find((item) => item.type === "Estatico")?.total ?? 0} helper="publicacoes" />
            <Metric icon={<CalendarDays className="h-5 w-5" />} label="Posts/Semana" value={decimalFormat(weeklyAverage)} helper="em media" />
            <Metric icon={<Heart className="h-5 w-5" />} label="Total de Likes" value={compactFormat(totalLikes)} helper={`Media: ${numberFormat(Math.round(totalLikes / Math.max(totalPosts, 1)))}/post`} />
            <Metric icon={<MessageCircle className="h-5 w-5" />} label="Comentarios" value={numberFormat(totalComments)} helper={`Media: ${numberFormat(Math.round(totalComments / Math.max(totalPosts, 1)))}/post`} />
            <Metric icon={<Save className="h-5 w-5" />} label="Salvos" value={compactFormat(totalSaved)} helper={`Media: ${numberFormat(Math.round(totalSaved / Math.max(totalPosts, 1)))}/post`} />
            <Metric icon={<Share2 className="h-5 w-5" />} label="Compartilhamentos" value={compactFormat(totalShares)} helper={`Media: ${numberFormat(Math.round(totalShares / Math.max(totalPosts, 1)))}/post`} />
          </section>

          <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Insights Rapidos" />
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InsightCard label="Melhor dia da semana" value={bestWeekDay?.label ?? "-"} description={`Alcance medio de ${compactFormat(bestWeekDay?.averageReach ?? 0)} neste dia`} />
            <InsightCard label="Melhor formato" value={bestFormat?.type ?? "-"} description={`Alcance medio de ${compactFormat(bestFormat?.averageReach ?? 0)}`} />
            <InsightCard label="Post com mais alcance" value={topReach?.alcance ? compactFormat(topReach.alcance) : "0"} description={truncate(topReach?.legenda)} />
            <InsightCard label="Posts com bom engajamento" value={`${decimalFormat(goodEngagementRate)}%`} description="Meta sugerida: acima de 60% dos posts classificados como Bom" />
            <InsightCard label="Post com mais likes" value={topLikes ? `${compactFormat(topLikes.likes)} likes` : "0"} description={truncate(topLikes?.legenda)} />
            <InsightCard label="Post mais salvo" value={topSaved?.salvos ? `${compactFormat(topSaved.salvos)} salvos` : "0"} description={truncate(topSaved?.legenda)} />
            <InsightCard label="Post mais compartilhado" value={topShares?.compartilhamentos ? `${compactFormat(topShares.compartilhamentos)} shares` : "0"} description={truncate(topShares?.legenda)} />
            <InsightCard label="Post mais comentado" value={topComments ? `${compactFormat(topComments.comentarios)} comentarios` : "0"} description={truncate(topComments?.legenda)} />
          </section>

          <SectionTitle icon={<Trophy className="h-4 w-4" />} title="Ranking de Posts" />
          <Card className="overflow-hidden border-[#E9CBD1] bg-white/95 p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap gap-2">
              {rankMetrics.map((item) => (
                <FilterButton key={item.value} isActive={rankMetric === item.value} onClick={() => setRankMetric(item.value)}>
                  <span className="inline-flex items-center gap-1.5">{item.icon}{item.label}</span>
                </FilterButton>
              ))}
            </div>
            <RankingTable ranking={ranking} metric={rankMetric} totalReach={totalReach} />
          </Card>

          <section className="grid gap-4 lg:grid-cols-3">
            <DonutChartCard title="Posts por Tipo" rows={typeGroups.filter((item) => item.total > 0).map((item) => ({ label: item.type, value: item.total }))} center={`${totalPosts}`} />
            <VerticalBarCard title="Alcance Medio por Tipo" rows={typeGroups.map((item) => ({ label: item.type, value: Math.round(item.averageReach) }))} valueFormatter={compactFormat} />
            <VerticalBarCard title="Engajamento por Tipo" rows={typeGroups.map((item) => ({ label: item.type, value: Math.round(item.engagementScore) }))} suffix="%" />
          </section>

          <SectionTitle icon={<CalendarDays className="h-4 w-4" />} title="Padroes Temporais" />
          <section className="grid gap-4 lg:grid-cols-2">
            <ComboChartCard title="Melhor Dia da Semana" rows={dayStats.map((item) => ({ label: item.label, value: Math.round(item.averageReach), posts: item.posts }))} />
            <VerticalBarCard title="Horario das Publicacoes" rows={hourDistribution(filteredPosts).map((item) => ({ label: item.label, value: item.total }))} highlightMax />
          </section>

          <LineChartCard title="Alcance Medio e Posts por Mes" rows={monthEvolution(filteredPosts)} />

          <Card className="overflow-hidden border-[#E9CBD1] bg-white/95 shadow-sm">
            <div className="border-b border-[#EFDDE1] px-5 py-4">
              <h2 className="text-base font-bold text-brand-teal">Melhor Dia e Horario por Tipo</h2>
            </div>
            <SimpleTable
              headers={["Tipo", "Melhor dia", "Melhor horario", "Posts publicados", "Alcance medio", "Engajamento predominante"]}
              rows={typeGroups.map((item) => [
                item.type,
                item.bestDay.label,
                item.bestHour,
                `${numberFormat(item.total)} posts`,
                compactFormat(Math.round(item.averageReach)),
                item.predominantEngagement,
              ])}
            />
          </Card>

          <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <DonutChartCard
              title="Bom / Medio / Ruim"
              rows={engagementDistribution.filter((item) => item.total > 0).map((item) => ({ label: item.label, value: item.total }))}
              center={`${engagementPosts.length}`}
            />
            <VerticalBarCard
              title="Quantidade de Posts por Semana"
              rows={postsByWeek(filteredPosts).map((item) => ({ label: item.label, value: item.total }))}
              showLegend={false}
              compactXAxis
            />
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric icon={<BarChart3 className="h-5 w-5" />} label="Posts" value={totalPosts} helper="publicacoes" />
            <Metric icon={<Radio className="h-5 w-5" />} label="Alcance Medio" value={compactFormat(Math.round(average(filteredPosts.map((post) => post.alcance ?? 0).filter((value) => value > 0))))} helper="por post" />
            <Metric icon={<Heart className="h-5 w-5" />} label="Likes Medios" value={numberFormat(Math.round(average(filteredPosts.map((post) => post.likes).filter((value) => value > 0))))} helper="por post" />
            <Metric icon={<Save className="h-5 w-5" />} label="Salvos Medios" value={numberFormat(Math.round(average(filteredPosts.map((post) => post.salvos ?? 0).filter((value) => value > 0))))} helper="por post" />
            <Metric icon={<Sparkles className="h-5 w-5" />} label="% Bom Engaj." value={`${decimalFormat(goodEngagementRate)}%`} helper={`${engagementPosts.length} posts`} />
          </section>

          {month !== "all" ? (
            <div className="flex flex-wrap gap-2">
              <FilterButton isActive={week === "all"} onClick={() => setWeek("all")}>
                Todas semanas
              </FilterButton>
              {availableWeeks.map((item) => (
                <FilterButton key={item} isActive={week === item.toString()} onClick={() => setWeek(item.toString())}>
                  Semana {item}
                </FilterButton>
              ))}
            </div>
          ) : null}

          <Card className="overflow-hidden border-[#E9CBD1] bg-white/95 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#EFDDE1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-brand-teal">Detalhamento das Publicacoes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-brand-clay">{numberFormat(sortedPosts.length)} publicacoes</span>
                <ExportButtons
                  label="Exportar resultados"
                  filename="instagram-resultados"
                  columns={resultColumns}
                  rows={sortedPosts}
                />
              </div>
            </div>
            <ResultsTable
              posts={paginatedPosts}
              groupedRows={groupedRows}
              shouldGroup={month !== "all" && week === "all"}
              sortDirection={sortDirection}
              sortKey={sortKey}
              onSort={changeSort}
            />
            <Pagination
              page={currentResultsPage}
              pageCount={resultsPageCount}
              total={sortedPosts.length}
              pageSize={RESULTS_PAGE_SIZE}
              onPageChange={setResultsPage}
            />
          </Card>
        </>
      )}
    </div>
  );
}

function TabButton({ children, isActive, onClick }: { children: ReactNode; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
        isActive ? "border-brand-clay bg-brand-clay text-white shadow-sm" : "border-[#E9CBD1] bg-white text-brand-teal hover:bg-[#FFF7F8]"
      }`}
    >
      {children}
    </button>
  );
}

function FilterButton({ children, isActive, onClick }: { children: ReactNode; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full border px-4 text-xs font-bold transition ${
        isActive ? "border-brand-clay bg-brand-clay text-white shadow-sm" : "border-[#E9CBD1] bg-white text-brand-teal hover:bg-[#FFF7F8]"
      }`}
    >
      {children}
    </button>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-[#EFDDE1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold text-brand-teal/60">
        Exibindo {start}-{end} de {numberFormat(total)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page <= 1}
          className="h-9 rounded-md border border-[#E9CBD1] bg-white px-3 text-xs font-bold text-brand-teal disabled:cursor-not-allowed disabled:opacity-45"
        >
          Anterior
        </button>
        <span className="text-xs font-bold text-brand-teal/60">
          Pagina {page} de {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(page + 1, pageCount))}
          disabled={page >= pageCount}
          className="h-9 rounded-md border border-[#E9CBD1] bg-white px-3 text-xs font-bold text-brand-teal disabled:cursor-not-allowed disabled:opacity-45"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}

function Select({ children, value, onChange }: { children: ReactNode; value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 min-w-[150px] rounded-md border border-[#E9CBD1] bg-white px-3 text-xs font-bold text-brand-teal outline-none focus:border-brand-clay focus:ring-2 focus:ring-brand-clay/20"
    >
      {children}
    </select>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#EFDDE1] pb-2">
      <span className="text-brand-clay">{icon}</span>
      <h2 className="text-base font-bold text-brand-teal">{title}</h2>
    </div>
  );
}

function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal/65">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Metric({ icon, label, value, helper }: { icon: ReactNode; label: string; value: number | string; helper: string }) {
  return (
    <Card className="min-h-[116px] border-[#E9CBD1] bg-white/95 p-3 shadow-sm">
      <div className="h-1 rounded-full bg-brand-clay/80" />
      <div className="mt-3 flex h-7 w-7 items-center justify-center rounded-md bg-[#FFF0F2] text-brand-clay">{icon}</div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-brand-clay/70">{label}</p>
      <p className="mt-1 text-xl font-black text-brand-teal">{typeof value === "number" ? numberFormat(value) : value}</p>
      <p className="mt-1 text-xs font-medium text-brand-teal/55">{helper}</p>
    </Card>
  );
}

function InsightCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <Card className="min-h-[118px] border-[#E9CBD1] bg-[#FFF7F8] p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-brand-clay/70">{label}</p>
      <p className="mt-3 text-2xl font-black text-brand-clay">{value}</p>
      <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-brand-teal/70">{description}</p>
    </Card>
  );
}

function RankingTable({ ranking, metric, totalReach }: { ranking: InstagramPostMetric[]; metric: RankMetric; totalReach: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#F4DCE0] text-xs uppercase tracking-wide text-brand-clay">
          <tr>
            <th className="w-16 px-4 py-3">#</th>
            <th className="px-4 py-3">Post</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3 text-right">{rankMetrics.find((item) => item.value === metric)?.label}</th>
            <th className="px-4 py-3 text-right">Total do periodo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0DDE1]">
          {ranking.map((post, index) => (
            <tr key={post.id} className="hover:bg-[#FFF7F8]">
              <td className="px-4 py-3">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-brand-clay text-white" : "bg-[#F7EEF0] text-brand-clay"}`}>
                  {index + 1}
                </span>
              </td>
              <td className="max-w-[340px] truncate px-4 py-3 text-brand-teal">{post.legenda ?? "Sem legenda"}</td>
              <td className="px-4 py-3"><TypeBadge value={post.tipo} /></td>
              <td className="px-4 py-3 text-brand-teal/70">{dateFormat(post.data_postagem)}</td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{compactFormat(numericValue(post, metric))}</td>
              <td className="px-4 py-3 text-right font-black text-brand-clay">{compactFormat(totalReach)}</td>
            </tr>
          ))}
          {ranking.length === 0 ? (
            <tr><td colSpan={6}><EmptyState /></td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DonutChartCard({ title, rows, center }: { title: string; rows: Array<{ label: string; value: number }>; center: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const colors = ["#5A9BE7", "#A868CF", "#51BE82", "#D5838C"];
  let offset = 0;
  const gradient = rows.length
    ? rows
        .map((row, index) => {
          const start = offset;
          const end = start + (row.value / Math.max(total, 1)) * 100;
          offset = end;
          return `${colors[index % colors.length]} ${start}% ${end}%`;
        })
        .join(", ")
    : "#F4DCE0 0% 100%";

  return (
    <Card className="border-[#E9CBD1] bg-white/95 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-brand-teal">{title}</h3>
      <div className="mt-5 flex items-center justify-center">
        <div className="relative h-40 w-40 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white">
            <strong className="text-2xl font-black text-brand-teal">{center}</strong>
            <span className="text-[10px] font-bold uppercase text-brand-teal/50">posts</span>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {rows.map((row, index) => (
          <span key={row.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal/70">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />
            {row.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

function VerticalBarCard({
  title,
  rows,
  suffix = "",
  valueFormatter = numberFormat,
  highlightMax = false,
  showLegend = true,
  compactXAxis = false,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  suffix?: string;
  valueFormatter?: (value: number) => string;
  highlightMax?: boolean;
  showLegend?: boolean;
  compactXAxis?: boolean;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const colors = ["#6AA7E8", "#B578CF", "#52C084", "#D88991"];
  const labelEvery = compactXAxis && rows.length > 12 ? Math.ceil(rows.length / 6) : 1;

  return (
    <Card className="border-[#E9CBD1] bg-white/95 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-brand-teal">{title}</h3>
      <div className="mt-5 flex h-44 items-end gap-2 overflow-x-auto border-b border-[#EFDDE1] px-2">
        {rows.map((row, index) => {
          const isPeak = highlightMax && row.value === max && row.value > 0;

          return (
          <div key={row.label} className={clsx("flex flex-1 flex-col items-center gap-2", compactXAxis ? "min-w-8" : "min-w-0")}>
            <span className={`text-[10px] font-black ${isPeak ? "rounded-full bg-brand-clay px-2 py-0.5 text-white" : "text-brand-teal/60"}`}>
              {row.value ? `${valueFormatter(row.value)}${suffix}` : "-"}
            </span>
            <div
              className={`w-full rounded-t-md ${isPeak ? "max-w-20 ring-2 ring-brand-clay/20" : "max-w-16"}`}
              style={{
                height: `${Math.max((row.value / max) * 132, row.value > 0 ? 8 : 0)}px`,
                backgroundColor: isPeak ? "#9D6F4E" : colors[index % colors.length],
              }}
            />
          </div>
          );
        })}
      </div>
      <div
        className="mt-3 grid gap-2 text-center text-[10px] font-semibold text-brand-teal/60"
        style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(${compactXAxis ? "32px" : "0"}, 1fr))` }}
      >
        {rows.map((row, index) => (
          <span key={row.label} className="truncate">
            {!compactXAxis || index % labelEvery === 0 || index === rows.length - 1 ? row.label : ""}
          </span>
        ))}
      </div>
      {showLegend ? (
        <ChartLegend
          items={rows.map((row, index) => ({
            label: row.label,
            color: highlightMax && row.value === max && row.value > 0 ? "#9D6F4E" : colors[index % colors.length],
          }))}
        />
      ) : (
        <p className="mt-3 text-xs font-semibold text-brand-teal/55">
          Rótulos reduzidos para preservar a leitura das semanas.
        </p>
      )}
    </Card>
  );
}

function ComboChartCard({ title, rows }: { title: string; rows: Array<{ label: string; value: number; posts: number }> }) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const maxPosts = Math.max(...rows.map((row) => row.posts), 1);

  return (
    <Card className="border-[#E9CBD1] bg-white/95 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-brand-teal">{title}</h3>
      <div className="mt-5 flex h-44 items-end gap-3 border-b border-[#EFDDE1] px-2">
        {rows.map((row) => {
          const isBest = row.value === maxValue && row.value > 0;

          return (
          <div key={row.label} className="relative flex flex-1 flex-col items-center">
            <span
              className={`absolute rounded-full ${isBest ? "h-4 w-4 border-2 border-white bg-brand-clay shadow-[0_0_0_4px_rgba(157,111,78,0.18)]" : "h-2.5 w-2.5 bg-brand-clay"}`}
              style={{ bottom: `${Math.max((row.value / maxValue) * 132, row.value > 0 ? 12 : 0)}px` }}
            />
            <div
              className={`combo-chart-bar w-full max-w-16 rounded-t-md ${isBest ? "combo-chart-bar-best bg-brand-clay/45" : "bg-[#F0CBD1]"}`}
              style={{ height: `${Math.max((row.posts / maxPosts) * 120, row.posts > 0 ? 8 : 0)}px` }}
            />
          </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-brand-teal/60">
        {rows.map((row) => <span key={row.label} className="truncate">{row.label.slice(0, 3)}</span>)}
      </div>
      <ChartLegend
        items={[
          { label: "Barras: posts publicados", color: "#F0CBD1" },
          { label: "Ponto: alcance medio", color: "#9D6F4E" },
        ]}
      />
    </Card>
  );
}

function LineChartCard({ title, rows }: { title: string; rows: Array<{ label: string; posts: number; averageReach: number }> }) {
  const maxReach = Math.max(...rows.map((row) => row.averageReach), 1);
  const maxPosts = Math.max(...rows.map((row) => row.posts), 1);

  return (
    <Card className="border-[#E9CBD1] bg-white/95 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-brand-teal">{title}</h3>
      <div className="mt-5 grid min-h-[260px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="chart-panel-bg flex min-h-[220px] items-end gap-3 overflow-x-auto border-b border-[#EFDDE1] bg-gradient-to-t from-[#FFF7F8] to-white px-3">
          {rows.map((row) => (
            <div key={row.label} className="flex min-w-16 flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-bold text-brand-clay">{compactFormat(Math.round(row.averageReach))}</span>
              <div className="w-full max-w-12 rounded-t-md bg-brand-clay/70" style={{ height: `${Math.max((row.averageReach / maxReach) * 150, row.averageReach > 0 ? 8 : 0)}px` }} />
              <span className="max-w-20 truncate text-[10px] font-semibold text-brand-teal/60">{row.label}</span>
            </div>
          ))}
        </div>
        <div className="max-h-[230px] space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => (
            <div key={row.label} className="rounded-md bg-[#FFF7F8] p-2">
              <div className="flex justify-between text-xs font-bold text-brand-teal">
                <span>{row.label}</span>
                <span>{row.posts}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#F0D6DB]">
                <div className="h-full rounded-full bg-[#62B483]" style={{ width: `${Math.max((row.posts / maxPosts) * 100, row.posts > 0 ? 8 : 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <ChartLegend
        items={[
          { label: "Colunas: alcance medio", color: "#9D6F4E" },
          { label: "Barra lateral: quantidade de posts", color: "#62B483" },
        ]}
      />
    </Card>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-[#F4DCE0] text-xs uppercase tracking-wide text-brand-clay">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#F0DDE1]">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-[#FFF7F8]">
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-4 py-3 text-brand-teal">
                  {cellIndex === 0 ? <TypeBadge value={cell as InstagramPostType} /> : cellIndex === row.length - 1 ? <EngagementBadge value={cell as EngagementClassification} /> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultsTable({
  posts,
  groupedRows,
  shouldGroup,
  sortKey,
  sortDirection,
  onSort,
}: {
  posts: InstagramPostMetric[];
  groupedRows: Array<[number, InstagramPostMetric[]]>;
  shouldGroup: boolean;
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const renderPost = (post: InstagramPostMetric) => (
    <tr key={post.id} className="hover:bg-[#FFF7F8]">
      <td className="px-4 py-3 font-medium text-brand-teal">{dateFormat(post.data_postagem)}</td>
      <td className="px-4 py-3 text-brand-teal/70">{dayName(post)}</td>
      <td className="px-4 py-3"><TypeBadge value={post.tipo} /></td>
      <td className="max-w-[360px] truncate px-4 py-3 text-brand-teal">{post.legenda ?? "-"}</td>
      <td className="px-4 py-3 text-right font-bold text-brand-teal">{post.alcance ? compactFormat(post.alcance) : "-"}</td>
      <td className="px-4 py-3 text-right text-brand-teal">{numberFormat(post.likes)}</td>
      <td className="px-4 py-3 text-right text-brand-teal">{numberFormat(post.comentarios)}</td>
      <td className="px-4 py-3 text-right text-brand-teal">{post.salvos ? numberFormat(post.salvos) : "-"}</td>
      <td className="px-4 py-3 text-right text-brand-teal">{post.compartilhamentos ? numberFormat(post.compartilhamentos) : "-"}</td>
      <td className="px-4 py-3"><EngagementBadge value={post.engajamento_classificacao} /></td>
      <td className="px-4 py-3">
        {post.permalink ? (
          <a href={post.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-clay">
            <ExternalLink className="h-4 w-4" /> Ver
          </a>
        ) : "-"}
      </td>
    </tr>
  );
  const tableHead = (
    <thead className="bg-[#F4DCE0] text-xs uppercase tracking-wide text-brand-clay">
      <tr>
        <SortableHeader label="Data" target="data_postagem" sortKey={sortKey} direction={sortDirection} onSort={onSort} />
        <th className="px-4 py-3">Dia</th>
        <SortableHeader label="Tipo" target="tipo" sortKey={sortKey} direction={sortDirection} onSort={onSort} />
        <th className="px-4 py-3">Conteudo</th>
        <SortableHeader label="Alcance" target="alcance" sortKey={sortKey} direction={sortDirection} onSort={onSort} align="right" />
        <SortableHeader label="Likes" target="likes" sortKey={sortKey} direction={sortDirection} onSort={onSort} align="right" />
        <SortableHeader label="Coment." target="comentarios" sortKey={sortKey} direction={sortDirection} onSort={onSort} align="right" />
        <SortableHeader label="Salvos" target="salvos" sortKey={sortKey} direction={sortDirection} onSort={onSort} align="right" />
        <SortableHeader label="Shares" target="compartilhamentos" sortKey={sortKey} direction={sortDirection} onSort={onSort} align="right" />
        <SortableHeader label="Engajamento" target="engajamento_classificacao" sortKey={sortKey} direction={sortDirection} onSort={onSort} />
        <th className="px-4 py-3">Link</th>
      </tr>
    </thead>
  );

  if (shouldGroup) {
    return (
      <div className="space-y-5 p-4">
        {groupedRows.map(([group, items]) => (
          <div key={`week-${group}`} className="overflow-hidden rounded-lg border border-[#E9CBD1] bg-white">
            <div className="bg-[#FFF4F5] px-4 py-3 text-sm font-black text-brand-clay">
              Semana {group} - {items.length} posts
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                {tableHead}
                <tbody className="divide-y divide-[#F0DDE1]">{items.map(renderPost)}</tbody>
              </table>
            </div>
          </div>
        ))}
        {posts.length === 0 ? <EmptyState /> : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-sm">
        {tableHead}
        <tbody className="divide-y divide-[#F0DDE1]">
          {posts.map(renderPost)}
          {posts.length === 0 ? (
            <tr><td colSpan={11}><EmptyState /></td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  target,
  sortKey,
  direction,
  align = "left",
  onSort,
}: {
  label: string;
  target: SortKey;
  sortKey: SortKey;
  direction: "asc" | "desc";
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === target;

  return (
    <th className={`cursor-pointer px-4 py-3 ${align === "right" ? "text-right" : ""}`} onClick={() => onSort(target)}>
      {label} <span className="text-brand-clay/40">{active ? (direction === "asc" ? "up" : "down") : "sort"}</span>
    </th>
  );
}

function TypeBadge({ value }: { value: InstagramPostType }) {
  const className =
    value === "Reels"
      ? "bg-[#E9F4FF] text-[#2670B8]"
      : value === "Carrossel"
        ? "bg-[#F4E8FC] text-[#8A3AB8]"
        : value === "Estatico"
          ? "bg-[#E9F9F0] text-[#238C55]"
          : "bg-brand-cream text-brand-teal/70";

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{value}</span>;
}

function EngagementBadge({ value }: { value: EngagementClassification }) {
  const className =
    value === "Bom"
      ? "bg-[#EDFAF3] text-[#2D8A58]"
      : value === "Medio"
        ? "bg-[#FEF3E2] text-[#B07000]"
        : value === "Ruim"
          ? "bg-[#FEECEC] text-[#A03030]"
          : "bg-[#F2EBEC] text-brand-teal/70";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{value}</span>;
}

function EmptyState() {
  return <p className="px-5 py-8 text-sm text-brand-teal/70">Nenhum post encontrado para os filtros.</p>;
}
