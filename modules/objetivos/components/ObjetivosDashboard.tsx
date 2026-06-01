"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import {
  BadgeCheck,
  BarChart3,
  ClipboardList,
  DollarSign,
  Gauge,
  Goal,
  Megaphone,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ObjetivosContext, ObjetivosMeta, ObjetivosModulo, ObjetivosOrigem, ObjetivosPeriodo, ObjetivosUnidade } from "@/modules/objetivos/types";

type TabKey = "visao" | "okrs" | "instagram" | "ads" | "faturamento" | "admin";
type PeriodFilter = "all" | ObjetivosPeriodo;

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "visao", label: "Visao Geral" },
  { key: "okrs", label: "OKRs" },
  { key: "instagram", label: "Instagram" },
  { key: "ads", label: "Ads" },
  { key: "faturamento", label: "Faturamento" },
  { key: "admin", label: "Admin" },
];

const moduloLabels: Record<ObjetivosModulo, string> = {
  geral: "Geral",
  instagram: "Instagram",
  ads: "Ads",
  faturamento: "Faturamento",
};

const periodFilters: Array<{ key: PeriodFilter; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "mensal", label: "Mensal" },
  { key: "quarter", label: "Quarter" },
  { key: "semestral", label: "Semestre" },
  { key: "anual", label: "Ano" },
];

const indicatorOptions = [
  { value: "faturamento_bruto", label: "Faturamento bruto" },
  { value: "instagram_alcance_total", label: "Instagram - Alcance total" },
  { value: "instagram_posts_semana", label: "Instagram - Posts por semana" },
  { value: "instagram_reels", label: "Instagram - Reels" },
  { value: "instagram_carrosseis", label: "Instagram - Carrosseis" },
  { value: "instagram_bom_engajamento_pct", label: "Instagram - % bom engajamento" },
  { value: "instagram_salvos", label: "Instagram - Salvamentos" },
  { value: "instagram_compartilhamentos", label: "Instagram - Compartilhamentos" },
  { value: "ads_ctr_medio", label: "Ads - CTR medio" },
  { value: "ads_cpc_medio", label: "Ads - CPC medio" },
  { value: "ads_cpm_medio", label: "Ads - CPM medio" },
  { value: "ads_frequencia_media", label: "Ads - Frequencia media" },
  { value: "ads_investimento", label: "Ads - Investimento" },
  { value: "ads_leads", label: "Ads - Leads" },
  { value: "ads_cpl_medio", label: "Ads - CPL medio" },
  { value: "ads_conversoes", label: "Ads - Conversoes" },
  { value: "manual", label: "Manual / Estrategico" },
];

const tabLabels: Record<TabKey, string> = {
  visao: "Visao Geral",
  okrs: "OKRs",
  instagram: "Instagram",
  ads: "Ads",
  faturamento: "Faturamento",
  admin: "Admin",
};

function formatValue(value: number, unidade: ObjetivosUnidade) {
  if (unidade === "moeda") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
  }
  if (unidade === "percentual") return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function dateTimeFormat(value: string | null) {
  if (!value) return "Sem atualizacao registrada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: ObjetivosMeta["status"]) {
  if (status === "supermeta") return "Supermeta";
  if (status === "dentro") return "Dentro";
  if (status === "atencao") return "Atencao";
  return "Critico";
}

function statusClass(status: ObjetivosMeta["status"]) {
  if (status === "supermeta") return "bg-emerald-100 text-emerald-700";
  if (status === "dentro") return "bg-green-100 text-green-700";
  if (status === "atencao") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function origemClass(origem: ObjetivosOrigem) {
  return origem === "automatica" ? "bg-blue-100 text-blue-700" : "bg-brand-sand/70 text-brand-teal";
}

function moduleIcon(modulo: ObjetivosModulo) {
  if (modulo === "instagram") return <BarChart3 className="h-4 w-4" />;
  if (modulo === "ads") return <Megaphone className="h-4 w-4" />;
  if (modulo === "faturamento") return <DollarSign className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

function metaTooltip(meta: ObjetivosMeta) {
  return `${meta.titulo} - ${meta.periodoLabel} - ${meta.percentual.toFixed(1).replace(".", ",")}%`;
}

function averageProgress(metas: ObjetivosMeta[]) {
  return metas.length ? metas.reduce((sum, meta) => sum + Math.min(meta.percentual, 140), 0) / metas.length : 0;
}

function moduleProgress(metas: ObjetivosMeta[], modulo: ObjetivosModulo) {
  return averageProgress(metas.filter((meta) => meta.modulo === modulo));
}

function generalStatus(metas: ObjetivosMeta[]) {
  if (!metas.length) return "Sem metas";
  if (metas.some((meta) => meta.status === "critico")) return "Em risco";
  if (metas.some((meta) => meta.status === "atencao")) return "Atencao";
  return "Saudavel";
}

export function ObjetivosDashboard({ context }: { context: ObjetivosContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("visao");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [metaForm, setMetaForm] = useState({
    modulo: "faturamento",
    titulo: "",
    tipo_origem: "automatica",
    indicador_key: "faturamento_bruto",
    unidade: "moeda",
    periodo_tipo: "mensal",
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    meta_alcancavel: "",
    meta_alta: "",
    meta_super: "",
    plano_acao_padrao: "",
  });
  const [okrForm, setOkrForm] = useState({
    objetivo: "",
    descricao: "",
    periodo_tipo: "quarter",
    ano: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    semestre: new Date().getMonth() + 1 <= 6 ? 1 : 2,
    responsavel: "",
  });

  const visibleTabs = context.canWrite ? tabs : tabs.filter((tab) => tab.key !== "admin");
  const years = useMemo(() => {
    return Array.from(new Set(context.metas.map((meta) => meta.ano))).sort((left, right) => right - left);
  }, [context.metas]);
  const metasAtivas = useMemo(() => {
    return context.metas.filter((meta) => {
      const periodMatches = periodFilter === "all" || meta.periodo_tipo === periodFilter;
      const yearMatches = yearFilter === "all" || meta.ano === Number(yearFilter);
      return periodMatches && yearMatches;
    });
  }, [context.metas, periodFilter, yearFilter]);
  const okrsAtivos = useMemo(() => {
    return context.okrs.filter((okr) => {
      const periodMatches = periodFilter === "all" || okr.periodo_tipo === periodFilter;
      const yearMatches = yearFilter === "all" || okr.ano === Number(yearFilter);
      return periodMatches && yearMatches;
    });
  }, [context.okrs, periodFilter, yearFilter]);
  const metasDentroList = metasAtivas.filter((meta) => meta.status === "dentro" || meta.status === "supermeta");
  const metasForaList = metasAtivas.filter((meta) => meta.status === "critico" || meta.status === "atencao");
  const metasDentro = metasAtivas.filter((meta) => meta.status === "dentro" || meta.status === "supermeta").length;
  const metasCriticas = metasAtivas.filter((meta) => meta.status === "critico").length;
  const progressoMedio = averageProgress(metasAtivas);
  const principalRisco = [...metasAtivas].sort((left, right) => left.percentual - right.percentual)[0] ?? null;
  const principalPlano = principalRisco?.plano_acao_padrao ?? "Definir uma acao de recuperacao para o principal indicador em risco.";
  const insideDetails = metasDentroList.map(metaTooltip);
  const outsideDetails = metasForaList.map(metaTooltip);

  const metasPorModulo = useMemo(() => {
    const map = new Map<string, ObjetivosMeta[]>();
    metasAtivas.forEach((meta) => map.set(meta.modulo, [...(map.get(meta.modulo) ?? []), meta]));
    return map;
  }, [metasAtivas]);

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "objetivos",
        pagePath: "/objetivos",
        pageLabel: `Objetivos: ${tabLabels[activeTab]}`,
      }),
      keepalive: true,
    });
  }, [activeTab]);

  async function saveMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus("Salvando meta...");
    const payload = {
      ...metaForm,
      modulo: metaForm.modulo as ObjetivosModulo,
      tipo_origem: metaForm.tipo_origem as ObjetivosOrigem,
      unidade: metaForm.unidade as ObjetivosUnidade,
      periodo_tipo: metaForm.periodo_tipo as ObjetivosPeriodo,
      ano: Number(metaForm.ano),
      mes: metaForm.periodo_tipo === "mensal" ? Number(metaForm.mes) : null,
      quarter: metaForm.periodo_tipo === "quarter" ? Math.ceil(Number(metaForm.mes) / 3) : null,
      semestre: metaForm.periodo_tipo === "semestral" ? (Number(metaForm.mes) <= 6 ? 1 : 2) : null,
      meta_alcancavel: Number(metaForm.meta_alcancavel || 0),
      meta_alta: metaForm.meta_alta ? Number(metaForm.meta_alta) : null,
      meta_super: metaForm.meta_super ? Number(metaForm.meta_super) : null,
      direcao: metaForm.indicador_key.includes("cpc") || metaForm.indicador_key.includes("cpl") || metaForm.indicador_key.includes("cpm") || metaForm.indicador_key.includes("frequencia") ? "menor_melhor" : "maior_melhor",
    };
    const response = await fetch("/api/objetivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "meta", action: "create", payload }),
    });
    const result = await response.json();
    if (!response.ok) {
      setFormStatus(result.error ?? "Nao foi possivel salvar.");
      return;
    }
    setFormStatus("Meta salva. Atualize a pagina para recalcular os dados.");
    setMetaForm((current) => ({ ...current, titulo: "", meta_alcancavel: "", meta_alta: "", meta_super: "", plano_acao_padrao: "" }));
  }

  async function saveOkr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus("Salvando OKR...");
    const payload = {
      ...okrForm,
      ano: Number(okrForm.ano),
      mes: null,
      quarter: okrForm.periodo_tipo === "quarter" ? Number(okrForm.quarter) : null,
      semestre: okrForm.periodo_tipo === "semestral" ? Number(okrForm.semestre) : null,
      status: "planejado",
      confianca: 70,
    };
    const response = await fetch("/api/objetivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "okr", action: "create", payload }),
    });
    const result = await response.json();
    setFormStatus(response.ok ? "OKR salvo. Atualize a pagina para visualizar." : result.error ?? "Nao foi possivel salvar.");
    if (response.ok) setOkrForm((current) => ({ ...current, objetivo: "", descricao: "" }));
  }

  async function deleteMeta(id: string) {
    setFormStatus("Excluindo meta...");
    const response = await fetch("/api/objetivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "meta", action: "delete", id }),
    });
    const result = await response.json();
    setFormStatus(response.ok ? "Meta excluida. Atualize a pagina para refletir." : result.error ?? "Nao foi possivel excluir.");
  }

  if (context.diagnostic) {
    return (
      <Card className="p-6">
        <p className="text-lg font-bold text-brand-teal">Objetivos indisponivel</p>
        <p className="mt-2 text-brand-blue">{context.diagnostic}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-brand-clay">Objetivos e metas</p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal text-brand-teal">Painel de Objetivos</h1>
          <p className="mt-2 max-w-3xl text-base text-brand-blue">
            Metas automaticas conectadas aos dados da plataforma e metas estrategicas para acompanhamento de OKRs, planos e prioridades.
          </p>
        </div>
        <p className="text-sm font-semibold text-brand-blue">Base atualizada em {dateTimeFormat(context.updatedAt)}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md border px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.key
                ? "border-brand-clay bg-brand-clay text-white"
                : "border-brand-sand bg-white/80 text-brand-teal hover:bg-brand-cream"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-bold uppercase text-brand-clay">Periodo</span>
          {periodFilters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriodFilter(item.key)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                periodFilter === item.key
                  ? "border-brand-clay bg-brand-clay text-white"
                  : "border-brand-sand bg-white text-brand-teal hover:bg-brand-cream"
              }`}
            >
              {item.label}
            </button>
          ))}
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            className="min-h-10 rounded-md border border-brand-sand bg-white px-3 py-2 text-sm font-bold text-brand-teal"
          >
            <option value="all">Todos os anos</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </Card>

      {activeTab === "visao" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard icon={<Gauge />} label="Status geral" value={generalStatus(metasAtivas)} sub="no filtro aplicado" details={outsideDetails.length ? outsideDetails : insideDetails} />
            <KpiCard icon={<Target />} label="% geral" value={`${progressoMedio.toFixed(1).replace(".", ",")}%`} sub="atingimento medio" details={metasAtivas.map(metaTooltip)} />
            <KpiCard icon={<DollarSign />} label="Faturamento" value={`${moduleProgress(metasAtivas, "faturamento").toFixed(1).replace(".", ",")}%`} sub="realizado vs meta" details={(metasPorModulo.get("faturamento") ?? []).map(metaTooltip)} />
            <KpiCard icon={<BarChart3 />} label="Instagram" value={`${moduleProgress(metasAtivas, "instagram").toFixed(1).replace(".", ",")}%`} sub="organico vs meta" details={(metasPorModulo.get("instagram") ?? []).map(metaTooltip)} />
            <KpiCard icon={<Megaphone />} label="Ads" value={`${moduleProgress(metasAtivas, "ads").toFixed(1).replace(".", ",")}%`} sub="midia paga vs meta" details={(metasPorModulo.get("ads") ?? []).map(metaTooltip)} />
            <KpiCard icon={<BadgeCheck />} label="Dentro/Fora" value={`${metasDentro}/${metasForaList.length}`} sub="dentro / alerta" details={[...insideDetails.map((item) => `Dentro: ${item}`), ...outsideDetails.map((item) => `Fora: ${item}`)]} />
          </div>
          {principalRisco ? (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase text-brand-clay">Proximo risco do periodo</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-teal">{principalRisco.titulo}</h2>
              <p className="mt-2 text-brand-blue">
                {principalRisco.periodoLabel} esta em {principalRisco.percentual.toFixed(1).replace(".", ",")}% da meta alcancavel.
              </p>
              <p className="mt-3 rounded-md bg-brand-cream p-3 text-sm font-semibold text-brand-teal">
                Plano sugerido: {principalPlano}
              </p>
            </Card>
          ) : null}
          <GoalBreakdown inside={metasDentroList} outside={metasForaList} />
          <ModuleSummary metasByModulo={metasPorModulo} />
        </div>
      ) : null}

      {activeTab === "okrs" ? <OkrsTab okrs={okrsAtivos} /> : null}
      {activeTab === "instagram" ? <MetasTab title="Metas Instagram" metas={metasPorModulo.get("instagram") ?? []} /> : null}
      {activeTab === "ads" ? <MetasTab title="Metas Ads" metas={metasPorModulo.get("ads") ?? []} /> : null}
      {activeTab === "faturamento" ? <MetasTab title="Metas de Faturamento" metas={metasPorModulo.get("faturamento") ?? []} /> : null}
      {activeTab === "admin" && context.canWrite ? (
        <AdminTab
          formStatus={formStatus}
          metaForm={metaForm}
          setMetaForm={setMetaForm}
          saveMeta={saveMeta}
          okrForm={okrForm}
          setOkrForm={setOkrForm}
          saveOkr={saveOkr}
          metas={context.metas}
          deleteMeta={deleteMeta}
        />
      ) : null}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, details = [] }: { icon: ReactNode; label: string; value: string; sub: string; details?: string[] }) {
  return (
    <Card className="p-5" title={details.filter(Boolean).join("\n") || undefined}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-brand-clay">{label}</p>
          <p className="mt-2 text-3xl font-bold text-brand-teal">{value}</p>
          <p className="mt-1 text-sm font-semibold text-brand-blue/80">{sub}</p>
        </div>
        <span className="rounded-md bg-brand-cream p-2 text-brand-teal">{icon}</span>
      </div>
    </Card>
  );
}

function GoalBreakdown({ inside, outside }: { inside: ObjetivosMeta[]; outside: ObjetivosMeta[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-2 text-brand-teal">
          <BadgeCheck className="h-5 w-5" />
          <h3 className="text-lg font-bold">Metas dentro</h3>
        </div>
        <div className="mt-4 grid gap-2">
          {inside.slice(0, 6).map((meta) => (
            <div key={meta.id} className="objective-goal-good flex items-center justify-between gap-3 rounded-md bg-green-50 px-3 py-2 text-sm">
              <span className="font-bold text-brand-teal">{meta.titulo}</span>
              <span className="shrink-0 text-xs font-bold text-green-700">{meta.percentual.toFixed(1).replace(".", ",")}%</span>
            </div>
          ))}
          {!inside.length ? <p className="rounded-md bg-brand-cream p-3 text-sm font-semibold text-brand-blue">Nenhuma meta dentro no filtro aplicado.</p> : null}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 text-brand-teal">
          <Target className="h-5 w-5" />
          <h3 className="text-lg font-bold">Metas fora ou em atencao</h3>
        </div>
        <div className="mt-4 grid gap-2">
          {outside.slice(0, 6).map((meta) => (
            <div key={meta.id} className="objective-goal-risk flex items-center justify-between gap-3 rounded-md bg-rose-50 px-3 py-2 text-sm">
              <span className="font-bold text-brand-teal">{meta.titulo}</span>
              <span className="shrink-0 text-xs font-bold text-rose-700">{meta.percentual.toFixed(1).replace(".", ",")}%</span>
            </div>
          ))}
          {!outside.length ? <p className="rounded-md bg-brand-cream p-3 text-sm font-semibold text-brand-blue">Nenhuma meta em risco no filtro aplicado.</p> : null}
        </div>
      </Card>
    </div>
  );
}

function ModuleSummary({ metasByModulo }: { metasByModulo: Map<string, ObjetivosMeta[]> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(["instagram", "ads", "faturamento"] as ObjetivosModulo[]).map((modulo) => {
        const metas = metasByModulo.get(modulo) ?? [];
        const dentro = metas.filter((meta) => meta.status === "dentro" || meta.status === "supermeta").length;
        const pct = metas.length ? (dentro / metas.length) * 100 : 0;
        return (
          <Card key={modulo} className="p-5">
            <div className="flex items-center gap-2 text-brand-teal">
              {moduleIcon(modulo)}
              <h3 className="text-lg font-bold">{moduloLabels[modulo]}</h3>
            </div>
            <p className="mt-4 text-3xl font-bold text-brand-teal">{pct.toFixed(0)}%</p>
            <p className="mt-1 text-sm font-semibold text-brand-blue">{dentro} de {metas.length} metas dentro</p>
            <div className="mt-4 h-2 rounded-full bg-brand-sand/50">
              <div className="h-2 rounded-full bg-brand-clay" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MetasTab({ title, metas }: { title: string; metas: ObjetivosMeta[] }) {
  const sortedRisks = [...metas].sort((left, right) => left.percentual - right.percentual).slice(0, 5);
  const dentro = metas.filter((meta) => meta.status === "dentro" || meta.status === "supermeta").length;
  const fora = metas.length - dentro;
  const avg = averageProgress(metas);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={<Gauge />} label="Atingimento" value={`${avg.toFixed(1).replace(".", ",")}%`} sub="media do filtro" details={metas.map(metaTooltip)} />
        <KpiCard icon={<BadgeCheck />} label="Dentro" value={String(dentro)} sub="metas saudaveis" details={metas.filter((meta) => meta.status === "dentro" || meta.status === "supermeta").map(metaTooltip)} />
        <KpiCard icon={<Target />} label="Fora" value={String(fora)} sub="critico ou atencao" details={metas.filter((meta) => meta.status === "critico" || meta.status === "atencao").map(metaTooltip)} />
      </div>
      <Card className="p-5">
        <h2 className="text-xl font-bold text-brand-teal">{title}</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {sortedRisks.map((meta) => (
            <div key={meta.id} className="rounded-md border border-brand-sand/60 p-3">
              <p className="text-xs font-bold uppercase text-brand-clay">{statusLabel(meta.status)}</p>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-brand-teal">{meta.titulo}</p>
              <p className="mt-2 text-lg font-bold text-brand-teal">{meta.percentual.toFixed(1).replace(".", ",")}%</p>
            </div>
          ))}
          {!sortedRisks.length ? <p className="text-sm font-semibold text-brand-blue">Nenhuma meta no filtro aplicado.</p> : null}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-brand-rose/40 text-xs uppercase text-brand-clay">
              <tr>
                <th className="px-4 py-3">Meta</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Realizado</th>
                <th className="px-4 py-3">Alcancavel</th>
                <th className="px-4 py-3">% atingida</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plano sugerido</th>
              </tr>
            </thead>
            <tbody>
              {metas.map((meta) => (
                <tr key={meta.id} className="border-t border-brand-sand/50">
                  <td className="px-4 py-3 font-bold text-brand-teal">{meta.titulo}</td>
                  <td className="px-4 py-3"><Badge className={origemClass(meta.tipo_origem)}>{meta.tipo_origem === "automatica" ? "Automatica" : "Estrategica"}</Badge></td>
                  <td className="px-4 py-3 text-brand-blue">{meta.periodoLabel}</td>
                  <td className="px-4 py-3 font-bold text-brand-teal">{formatValue(meta.atual, meta.unidade)}</td>
                  <td className="px-4 py-3 text-brand-blue">{formatValue(meta.meta_alcancavel, meta.unidade)}</td>
                  <td className="px-4 py-3 font-bold text-brand-teal">{meta.percentual.toFixed(1).replace(".", ",")}%</td>
                  <td className="px-4 py-3"><Badge className={statusClass(meta.status)}>{statusLabel(meta.status)}</Badge></td>
                  <td className="max-w-[360px] px-4 py-3 text-brand-blue">{meta.plano_acao_padrao ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OkrsTab({ okrs }: { okrs: ObjetivosContext["okrs"] }) {
  return (
    <div className="grid gap-4">
      {okrs.map((okr) => {
        const progress = okr.keyResults.length
          ? okr.keyResults.reduce((sum, kr) => sum + Math.min(kr.progresso, 100), 0) / okr.keyResults.length
          : 0;
        return (
          <Card key={okr.id} className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-brand-clay">OKR</p>
                <h2 className="mt-1 text-2xl font-bold text-brand-teal">{okr.objetivo}</h2>
                <p className="mt-2 text-brand-blue">{okr.descricao}</p>
              </div>
              <Badge className="bg-brand-cream text-brand-teal">{progress.toFixed(0)}% progresso</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-brand-cream p-3">
                <p className="text-xs font-bold uppercase text-brand-clay">Periodo</p>
                <p className="mt-1 font-bold text-brand-teal">{okr.periodo_tipo} {okr.ano}</p>
              </div>
              <div className="rounded-md bg-brand-cream p-3">
                <p className="text-xs font-bold uppercase text-brand-clay">Ultimo check-in</p>
                <p className="mt-1 font-bold text-brand-teal">Ainda nao registrado</p>
              </div>
              <div className="rounded-md bg-brand-cream p-3">
                <p className="text-xs font-bold uppercase text-brand-clay">Proxima acao</p>
                <p className="mt-1 font-bold text-brand-teal">Vincular plano de acao no Admin</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {okr.keyResults.length ? (
                okr.keyResults.map((kr) => (
                  <div key={kr.id} className="rounded-md border border-brand-sand/60 p-3">
                    <div className="flex justify-between gap-3 text-sm font-bold text-brand-teal">
                      <span>{kr.titulo}</span>
                      <span>{kr.progresso.toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-brand-sand/50">
                      <div className="h-2 rounded-full bg-brand-clay" style={{ width: `${Math.min(kr.progresso, 100)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-brand-cream p-3 text-sm font-semibold text-brand-blue">Adicione KRs no Admin para acompanhar o progresso deste objetivo.</p>
              )}
            </div>
          </Card>
        );
      })}
      {!okrs.length ? <Card className="p-5 text-sm font-bold text-brand-blue">Nenhum OKR no filtro aplicado.</Card> : null}
    </div>
  );
}

function AdminTab({
  formStatus,
  metaForm,
  setMetaForm,
  saveMeta,
  okrForm,
  setOkrForm,
  saveOkr,
  metas,
  deleteMeta,
}: {
  formStatus: string | null;
  metaForm: any;
  setMetaForm: Dispatch<SetStateAction<any>>;
  saveMeta: (event: FormEvent<HTMLFormElement>) => void;
  okrForm: any;
  setOkrForm: Dispatch<SetStateAction<any>>;
  saveOkr: (event: FormEvent<HTMLFormElement>) => void;
  metas: ObjetivosMeta[];
  deleteMeta: (id: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-5">
        <div className="flex items-center gap-2 text-brand-teal">
          <Plus className="h-5 w-5" />
          <h2 className="text-xl font-bold">Cadastrar meta</h2>
        </div>
        <form onSubmit={saveMeta} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-bold text-brand-teal">
            Titulo
            <input required value={metaForm.titulo} onChange={(event) => setMetaForm((current: any) => ({ ...current, titulo: event.target.value }))} className="rounded-md border border-brand-sand px-3 py-2" />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Modulo" value={metaForm.modulo} onChange={(value) => setMetaForm((current: any) => ({ ...current, modulo: value }))} options={[
              ["faturamento", "Faturamento"], ["instagram", "Instagram"], ["ads", "Ads"], ["geral", "Geral"],
            ]} />
            <Select label="Origem" value={metaForm.tipo_origem} onChange={(value) => setMetaForm((current: any) => ({ ...current, tipo_origem: value }))} options={[
              ["automatica", "Automatica"], ["estrategica", "Estrategica"],
            ]} />
            <Select label="Unidade" value={metaForm.unidade} onChange={(value) => setMetaForm((current: any) => ({ ...current, unidade: value }))} options={[
              ["moeda", "Moeda"], ["numero", "Numero"], ["percentual", "Percentual"],
            ]} />
          </div>
          <Select label="Indicador" value={metaForm.indicador_key} onChange={(value) => setMetaForm((current: any) => ({ ...current, indicador_key: value }))} options={indicatorOptions.map((item) => [item.value, item.label])} />
          <div className="grid gap-3 md:grid-cols-4">
            <Select label="Periodo" value={metaForm.periodo_tipo} onChange={(value) => setMetaForm((current: any) => ({ ...current, periodo_tipo: value }))} options={[
              ["mensal", "Mensal"], ["quarter", "Quarter"], ["semestral", "Semestral"], ["anual", "Anual"],
            ]} />
            <NumberField label="Ano" value={metaForm.ano} onChange={(value) => setMetaForm((current: any) => ({ ...current, ano: value }))} />
            <NumberField label="Mes base" value={metaForm.mes} onChange={(value) => setMetaForm((current: any) => ({ ...current, mes: value }))} />
            <NumberField label="Meta alcancavel" value={metaForm.meta_alcancavel} onChange={(value) => setMetaForm((current: any) => ({ ...current, meta_alcancavel: value }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <NumberField label="Meta alta" value={metaForm.meta_alta} onChange={(value) => setMetaForm((current: any) => ({ ...current, meta_alta: value }))} />
            <NumberField label="Supermeta" value={metaForm.meta_super} onChange={(value) => setMetaForm((current: any) => ({ ...current, meta_super: value }))} />
          </div>
          <label className="grid gap-1 text-sm font-bold text-brand-teal">
            Plano de acao padrao
            <textarea value={metaForm.plano_acao_padrao} onChange={(event) => setMetaForm((current: any) => ({ ...current, plano_acao_padrao: event.target.value }))} className="min-h-24 rounded-md border border-brand-sand px-3 py-2" />
          </label>
          <button className="rounded-md bg-brand-teal px-4 py-3 text-sm font-bold text-white">Salvar meta</button>
        </form>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-brand-teal">
            <Goal className="h-5 w-5" />
            <h2 className="text-xl font-bold">Cadastrar OKR</h2>
          </div>
          <form onSubmit={saveOkr} className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-bold text-brand-teal">
              Objetivo
              <input required value={okrForm.objetivo} onChange={(event) => setOkrForm((current: any) => ({ ...current, objetivo: event.target.value }))} className="rounded-md border border-brand-sand px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-brand-teal">
              Descricao
              <textarea value={okrForm.descricao} onChange={(event) => setOkrForm((current: any) => ({ ...current, descricao: event.target.value }))} className="min-h-20 rounded-md border border-brand-sand px-3 py-2" />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField label="Ano" value={okrForm.ano} onChange={(value) => setOkrForm((current: any) => ({ ...current, ano: value }))} />
              <NumberField label="Quarter" value={okrForm.quarter} onChange={(value) => setOkrForm((current: any) => ({ ...current, quarter: value }))} />
              <NumberField label="Semestre" value={okrForm.semestre} onChange={(value) => setOkrForm((current: any) => ({ ...current, semestre: value }))} />
            </div>
            <label className="grid gap-1 text-sm font-bold text-brand-teal">
              Responsavel
              <input value={okrForm.responsavel} onChange={(event) => setOkrForm((current: any) => ({ ...current, responsavel: event.target.value }))} className="rounded-md border border-brand-sand px-3 py-2" />
            </label>
            <button className="rounded-md bg-brand-clay px-4 py-3 text-sm font-bold text-white">Salvar OKR</button>
          </form>
        </Card>
        {formStatus ? <Card className="p-4 text-sm font-bold text-brand-teal">{formStatus}</Card> : null}
      </div>

      <Card className="overflow-hidden xl:col-span-2">
        <div className="border-b border-brand-sand/60 p-5">
          <h2 className="text-xl font-bold text-brand-teal">Metas cadastradas</h2>
        </div>
        <div className="divide-y divide-brand-sand/50">
          {metas.map((meta) => (
            <div key={meta.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold text-brand-teal">{meta.titulo}</p>
                <p className="text-sm text-brand-blue">{moduloLabels[meta.modulo]} • {meta.periodoLabel} • {meta.tipo_origem === "automatica" ? "Automatica" : "Estrategica"}</p>
              </div>
              <button type="button" onClick={() => deleteMeta(meta.id)} className="inline-flex items-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-brand-teal">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-brand-sand bg-white px-3 py-2">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string | number; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-brand-teal">
      {label}
      <input type="number" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-brand-sand px-3 py-2" />
    </label>
  );
}
