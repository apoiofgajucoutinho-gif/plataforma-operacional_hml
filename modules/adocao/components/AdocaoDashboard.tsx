"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, CalendarDays, Eye, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import type { ExportColumn } from "@/lib/client/table-export";

type PeriodFilter = "7d" | "15d" | "30d" | "all";
const ACTIVITY_PAGE_SIZE = 20;

type AdoptionEvent = {
  id: string;
  module: string;
  page_path: string;
  event_name: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const periodFilters: Array<{ value: PeriodFilter; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Tudo" },
];

const moduleLabels: Record<string, string> = {
  agenda: "Agenda",
  instagram: "Instagram",
  ads: "Ads",
  objetivos: "Objetivos",
  adocao: "Adocao",
  financeiro: "Financeiro",
  atividades: "Atividades",
  relatorios: "Relatorios",
  admin: "Admin",
};

function numberFormat(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
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

function applyPeriod(events: AdoptionEvent[], period: PeriodFilter) {
  if (period === "all") return events;

  const days = period === "7d" ? 7 : period === "15d" ? 15 : 30;
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return events.filter((event) => new Date(event.created_at) >= start);
}

function pageLabel(event: AdoptionEvent) {
  const value = event.metadata?.page_label;
  if (typeof value === "string" && value.trim()) {
    if (event.module === "financeiro" && (value === "/financeiro" || !value.includes(":"))) {
      return "Financeiro: Início";
    }
    if (event.module === "ads" && (value === "/ads" || !value.includes(":"))) {
      return "Ads: Visão Geral";
    }
    if (event.module === "objetivos" && (value === "/objetivos" || !value.includes(":"))) {
      return "Objetivos: Visao Geral";
    }
    return value;
  }

  if (event.module === "agenda") return "Agenda";
  if (event.module === "adocao") return "Adocao";
  if (event.module === "instagram") return "Instagram: Insights";
  if (event.module === "ads") return "Ads: Visão Geral";
  if (event.module === "objetivos") return "Objetivos: Visao Geral";
  if (event.module === "financeiro") return "Financeiro: Início";

  return event.page_path;
}

function userLabel(event: AdoptionEvent) {
  const value = event.metadata?.user_email;
  if (typeof value === "string" && value.trim()) return value;

  return event.user_id ?? "Usuario nao identificado";
}

function groupCount(items: string[]) {
  const map = new Map<string, number>();
  items.forEach((item) => map.set(item, (map.get(item) ?? 0) + 1));

  return [...map.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);
}

export function AdocaoDashboard({
  events,
  diagnostic,
  updatedAt,
}: {
  events: AdoptionEvent[];
  diagnostic: string | null;
  updatedAt: string | null;
}) {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);

  const modules = useMemo(() => {
    return [...new Set(events.map((event) => event.module))].sort();
  }, [events]);

  const users = useMemo(() => {
    return [...new Set(events.map(userLabel))].sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    let nextEvents = applyPeriod(events, period);
    if (moduleFilter !== "all") {
      nextEvents = nextEvents.filter((event) => event.module === moduleFilter);
    }
    if (userFilter !== "all") {
      nextEvents = nextEvents.filter((event) => userLabel(event) === userFilter);
    }

    return nextEvents;
  }, [events, moduleFilter, period, userFilter]);

  useEffect(() => {
    setActivityPage(1);
  }, [period, moduleFilter, userFilter]);

  const totalViews = filteredEvents.length;
  const activeUsers = new Set(filteredEvents.map(userLabel)).size;
  const today = filteredEvents.filter((event) => new Date(event.created_at).toDateString() === new Date().toDateString()).length;
  const moduleRows = groupCount(filteredEvents.map((event) => moduleLabels[event.module] ?? event.module));
  const pageRows = groupCount(filteredEvents.map(pageLabel));
  const userRows = groupCount(filteredEvents.map(userLabel));
  const activityPageCount = Math.max(Math.ceil(filteredEvents.length / ACTIVITY_PAGE_SIZE), 1);
  const currentActivityPage = Math.min(activityPage, activityPageCount);
  const paginatedEvents = filteredEvents.slice(
    (currentActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    currentActivityPage * ACTIVITY_PAGE_SIZE,
  );
  const activityColumns: ExportColumn<AdoptionEvent>[] = [
    { header: "Data", value: (event) => dateTimeFormat(event.created_at) },
    { header: "Usuario", value: (event) => userLabel(event) },
    { header: "Modulo", value: (event) => moduleLabels[event.module] ?? event.module },
    { header: "Pagina/Aba", value: (event) => pageLabel(event) },
    { header: "Evento", value: (event) => event.event_name },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 text-[15px]">
      <header className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase text-brand-clay">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-teal sm:text-3xl">Adocao da plataforma</h1>
          <p className="mt-2 text-sm text-brand-teal/70">
            Uso dos modulos, abas internas e paginas acessadas pelos usuarios.
          </p>
        </div>
        <p className="text-xs font-semibold text-brand-teal/55">
          Base atualizada em {dateTimeFormat(updatedAt)}
        </p>
      </header>

      {diagnostic ? (
        <Card className="p-5">
          <p className="font-semibold text-brand-teal">{diagnostic}</p>
        </Card>
      ) : null}

      <Card className="border-[#E9CBD1] bg-white/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-clay">Periodo</span>
          {periodFilters.map((item) => (
            <PillButton key={item.value} isActive={period === item.value} onClick={() => setPeriod(item.value)}>
              {item.label}
            </PillButton>
          ))}
          <span className="mx-1 hidden h-7 w-px bg-[#E9CBD1] sm:block" />
          <PillButton isActive={moduleFilter === "all"} onClick={() => setModuleFilter("all")}>
            Todos modulos
          </PillButton>
          {modules.map((item) => (
            <PillButton key={item} isActive={moduleFilter === item} onClick={() => setModuleFilter(item)}>
              {moduleLabels[item] ?? item}
            </PillButton>
          ))}
          <select
            value={userFilter}
            onChange={(event) => setUserFilter(event.target.value)}
            className="h-9 min-w-[220px] rounded-md border border-[#E9CBD1] bg-white px-3 text-xs font-bold text-brand-teal outline-none"
          >
            <option value="all">Todos os usuarios</option>
            {users.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Eye className="h-5 w-5" />} label="Visualizacoes" value={totalViews} helper="no filtro aplicado" />
        <Metric icon={<Users className="h-5 w-5" />} label="Usuarios ativos" value={activeUsers} helper="com acesso registrado" />
        <Metric icon={<CalendarDays className="h-5 w-5" />} label="Hoje" value={today} helper="visualizacoes no dia" />
        <Metric icon={<BarChart3 className="h-5 w-5" />} label="Modulos usados" value={moduleRows.length} helper="com algum acesso" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <RankingCard title="Modulos acessados" rows={moduleRows} />
        <RankingCard title="Paginas acessadas" rows={pageRows} />
        <RankingCard title="Usuarios" rows={userRows} />
      </section>

      <Card className="overflow-hidden border-[#E9CBD1] bg-white/95 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#EFDDE1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-brand-teal">Atividades recentes</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-brand-clay">{numberFormat(filteredEvents.length)} acessos</span>
            <ExportButtons
              label="Exportar atividades recentes"
              filename="adocao-atividades-recentes"
              columns={activityColumns}
              rows={filteredEvents}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#F4DCE0] text-xs uppercase tracking-wide text-brand-clay">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Modulo</th>
                <th className="px-4 py-3">Pagina/Aba</th>
                <th className="px-4 py-3">Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0DDE1]">
              {paginatedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-[#FFF7F8]">
                  <td className="px-4 py-3 text-brand-teal/70">{dateTimeFormat(event.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-brand-teal">{userLabel(event)}</td>
                  <td className="px-4 py-3 text-brand-teal">{moduleLabels[event.module] ?? event.module}</td>
                  <td className="px-4 py-3 text-brand-teal">{pageLabel(event)}</td>
                  <td className="px-4 py-3 text-brand-teal/70">{event.event_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={currentActivityPage}
          pageCount={activityPageCount}
          total={filteredEvents.length}
          pageSize={ACTIVITY_PAGE_SIZE}
          onPageChange={setActivityPage}
        />
      </Card>
    </div>
  );
}

function PillButton({ children, isActive, onClick }: { children: ReactNode; isActive: boolean; onClick: () => void }) {
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

function Metric({ icon, label, value, helper }: { icon: ReactNode; label: string; value: number; helper: string }) {
  return (
    <Card className="border-[#E9CBD1] bg-white/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-clay/70">{label}</p>
          <p className="mt-2 text-3xl font-black text-brand-teal">{numberFormat(value)}</p>
          <p className="mt-1 text-xs text-brand-teal/55">{helper}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#FFF7F8] text-brand-clay">
          {icon}
        </span>
      </div>
    </Card>
  );
}

function RankingCard({ title, rows }: { title: string; rows: Array<{ label: string; total: number }> }) {
  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <Card className="border-[#E9CBD1] bg-white/95 p-5 shadow-sm">
      <h2 className="text-base font-bold text-brand-teal">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.slice(0, 8).map((row) => (
          <div key={row.label}>
            <div className="flex justify-between gap-3 text-sm font-semibold text-brand-teal">
              <span className="truncate">{row.label}</span>
              <span>{numberFormat(row.total)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[#F0D6DB]">
              <div className="h-full rounded-full bg-brand-clay" style={{ width: `${Math.max((row.total / max) * 100, 6)}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-brand-teal/70">Sem eventos registrados ainda.</p> : null}
      </div>
    </Card>
  );
}
