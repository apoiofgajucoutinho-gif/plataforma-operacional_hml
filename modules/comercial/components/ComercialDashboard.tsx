"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import type {
  ComercialAluno,
  ComercialContext,
  ComercialRawImport,
  ComercialRecebivel,
  ComercialVenda,
} from "@/modules/comercial/types";

type TabKey = "overview" | "sales" | "receivables" | "students" | "products" | "reconciliation" | "admin";
type PeriodKey = "7d" | "15d" | "30d" | "month" | "all";
type TableKey = "sales" | "receivables" | "students";

const PAGE_SIZE = 20;

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Visão Geral" },
  { key: "sales", label: "Vendas" },
  { key: "receivables", label: "Recebíveis" },
  { key: "students", label: "Alunos" },
  { key: "products", label: "Produtos" },
  { key: "reconciliation", label: "Conciliação" },
  { key: "admin", label: "Admin" },
];

const periods: Array<{ key: PeriodKey; label: string }> = [
  { key: "7d", label: "7 dias" },
  { key: "15d", label: "15 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Mes" },
  { key: "all", label: "Tudo" },
];

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Base ainda sem atualizacao";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateForFilter(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthShort(value: number) {
  return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][value] ?? "-";
}

function isTodayOrFuture(value: string | null | undefined) {
  const date = dateForFilter(value);
  if (!date) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date >= today;
}

function rawImportEvent(row: ComercialRawImport) {
  const event = row.payload?.event ?? row.payload?.event_name ?? row.payload?.webhook_event ?? row.payload?.type;
  return typeof event === "string" && event.trim() ? event.trim() : "evento Hotmart";
}

function rawImportSource(row: ComercialRawImport) {
  const event = rawImportEvent(row).toLowerCase();
  if (event === "sales_history") return "Histórico";
  return "Tempo real";
}

function withinHours(value: string | null | undefined, hours: number) {
  const date = dateForFilter(value);
  if (!date) return false;
  return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
}

function isApproved(status: string) {
  return ["approved", "aprovada", "pago", "paid", "complete", "completo"].includes(status.toLowerCase());
}

function isRefunded(status: string) {
  return status.toLowerCase().includes("refund") || status.toLowerCase().includes("reembolso") || status.toLowerCase().includes("chargeback");
}

function filterReceivablesByPeriod(rows: ComercialRecebivel[], period: PeriodKey) {
  if (period === "all") return rows;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = period === "7d" ? 7 : period === "15d" ? 15 : period === "30d" ? 30 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const end = period === "month"
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  return rows.filter((row) => {
    if (!row.data_prevista) return false;
    const date = new Date(`${row.data_prevista}T00:00:00`);
    return date >= start && date < end;
  });
}

function filterByDate<T>(rows: T[], getDate: (row: T) => string | null | undefined, year: string, month: string) {
  return rows.filter((row) => {
    const date = dateForFilter(getDate(row));
    if (!date) return year === "all" && month === "all";
    if (year !== "all" && String(date.getFullYear()) !== year) return false;
    if (month !== "all" && String(date.getMonth() + 1).padStart(2, "0") !== month) return false;
    return true;
  });
}

function uniqueYears(...values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map(dateForFilter)
        .filter(Boolean)
        .map((date) => String(date!.getFullYear())),
    ),
  ).sort((a, b) => Number(b) - Number(a));
}

function uniqueMonthsForYear(values: Array<string | null | undefined>, year: string) {
  return Array.from(
    new Set(
      values
        .map(dateForFilter)
        .filter((date) => Boolean(date) && (year === "all" || String(date!.getFullYear()) === year))
        .map((date) => String(date!.getMonth() + 1).padStart(2, "0")),
    ),
  ).sort((a, b) => Number(a) - Number(b));
}

function paginate<T>(rows: T[], page: number) {
  return rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

function pageCount(rowsLength: number) {
  return Math.max(1, Math.ceil(rowsLength / PAGE_SIZE));
}

export function ComercialDashboard({ context }: { context: ComercialContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [studentsPage, setStudentsPage] = useState(1);

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "comercial",
        pagePath: "/comercial",
        pageLabel: activeTab === "overview" ? "Comercial: Visao Geral" : `Comercial: ${tabs.find((tab) => tab.key === activeTab)?.label ?? activeTab}`,
      }),
      keepalive: true,
    });
  }, [activeTab]);

  const visibleTabs = context.canWrite ? tabs : tabs.filter((tab) => tab.key !== "admin");
  const filteredReceivables = useMemo(() => filterReceivablesByPeriod(context.recebiveis, period), [context.recebiveis, period]);
  const approvedSales = context.vendas.filter((sale) => isApproved(sale.status));
  const refundedSales = context.vendas.filter((sale) => isRefunded(sale.status));
  const grossRevenue = approvedSales.reduce((sum, sale) => sum + sale.valor_bruto, 0);
  const approvedSalesWithNet = approvedSales.filter((sale) => sale.valor_liquido !== null && sale.valor_liquido !== undefined);
  const netRevenue = approvedSalesWithNet.reduce((sum, sale) => sum + Number(sale.valor_liquido), 0);
  const receivableTotal = filteredReceivables
    .filter((item) => ["previsto", "disponivel"].includes(item.status) && isTodayOrFuture(item.data_prevista))
    .reduce((sum, item) => sum + Number(item.valor_liquido ?? item.valor_bruto), 0);
  const unclassifiedSales = context.vendas.filter((sale) => !sale.produto_id).length;
  const realtimeImports = context.rawImports.filter((row) => rawImportSource(row) === "Tempo real");
  const recentRealtimeImports = realtimeImports.filter((row) => withinHours(row.received_at, 24));
  const latestRawImport = context.rawImports[0] ?? null;
  const expiringStudents = context.alunos.filter((student) => {
    if (!student.acesso_expira_em) return false;
    const expiry = new Date(`${student.acesso_expira_em}T00:00:00`);
    const now = new Date();
    const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
    return expiry >= now && expiry <= limit;
  }).length;

  const allDates = [
    ...context.vendas.map((item) => item.data_compra ?? item.data_aprovacao),
    ...context.recebiveis.map((item) => item.data_prevista),
    ...context.alunos.map((item) => item.ultima_compra_at),
  ];
  const years = uniqueYears(...allDates);
  const months = uniqueMonthsForYear(allDates, yearFilter);

  const salesRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterByDate(context.vendas, (row) => row.data_compra ?? row.data_aprovacao, yearFilter, monthFilter)
      .filter((row) => statusFilter === "all" || row.status.toLowerCase() === statusFilter.toLowerCase())
      .filter((row) => {
        if (!term) return true;
        return [row.transaction_id, row.comprador_nome, row.comprador_email, row.produto_nome, row.forma_pagamento]
          .some((value) => String(value ?? "").toLowerCase().includes(term));
      });
  }, [context.vendas, monthFilter, search, statusFilter, yearFilter]);

  const receivableRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterByDate(filteredReceivables, (row) => row.data_prevista, yearFilter, monthFilter)
      .filter((row) => statusFilter === "all" || row.status === statusFilter || row.fonte_previsao === statusFilter)
      .filter((row) => {
        if (!term) return true;
        return [row.transaction_id, row.status, row.fonte_previsao].some((value) => String(value ?? "").toLowerCase().includes(term));
      })
      .sort((a, b) => {
        const aDate = dateForFilter(a.data_prevista)?.getTime() ?? 0;
        const bDate = dateForFilter(b.data_prevista)?.getTime() ?? 0;
        return period === "all" ? bDate - aDate : aDate - bDate;
      });
  }, [filteredReceivables, monthFilter, period, search, statusFilter, yearFilter]);

  const studentRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterByDate(context.alunos, (row) => row.ultima_compra_at ?? row.primeira_compra_at, yearFilter, monthFilter)
      .filter((row) => statusFilter === "all" || row.status_acesso === statusFilter)
      .filter((row) => {
        if (!term) return true;
        return [row.nome, row.email, row.telefone, row.status_acesso].some((value) => String(value ?? "").toLowerCase().includes(term));
      });
  }, [context.alunos, monthFilter, search, statusFilter, yearFilter]);

  useEffect(() => {
    setMonthFilter("all");
  }, [yearFilter]);

  useEffect(() => {
    setSalesPage(1);
    setReceivablesPage(1);
    setStudentsPage(1);
  }, [activeTab, monthFilter, period, search, statusFilter, yearFilter]);

  if (context.diagnostic) {
    return (
      <section className="space-y-6">
        <Header updatedAt={context.updatedAt} />
        <Card className="p-8">
          <h2 className="text-xl font-black text-brand-teal">Comercial indisponivel</h2>
          <p className="mt-3 text-brand-teal/70">{context.diagnostic}</p>
          <p className="mt-4 text-sm font-bold text-brand-teal/55">
            Se estiver testando local, aplique a migration `0037_comercial_module.sql` no Supabase usado pelo `.env.local`.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Header updatedAt={context.updatedAt} />

      <div className="flex flex-wrap gap-3">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md border px-5 py-3 text-sm font-black ${
              activeTab === tab.key ? "border-brand-clay bg-brand-clay text-white" : "border-brand-sand bg-white/80 text-brand-teal"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<ReceiptText />} label="Vendas aprovadas" value={approvedSales.length} helper="transacoes elegiveis para analise" />
            <Metric icon={<WalletCards />} label="Faturamento bruto" value={formatMoney(grossRevenue)} helper="antes de taxas e deducoes" />
            <Metric
              icon={<CheckCircle2 />}
              label="Líquido informado"
              value={formatMoney(netRevenue)}
              helper={`${approvedSales.length - approvedSalesWithNet.length} vendas ainda sem líquido/taxas`}
            />
            <Metric icon={<CalendarClock />} label="A receber" value={formatMoney(receivableTotal)} helper={`no filtro ${periods.find((item) => item.key === period)?.label}`} />
          </div>

          <RealtimeValidationCard
            latest={latestRawImport}
            total={context.rawImports.length}
            realtimeCount={realtimeImports.length}
            recentRealtimeCount={recentRealtimeImports.length}
          />

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-brand-teal">Recebíveis por período</h2>
                <p className="text-sm text-brand-teal/60">Mostra o que deve cair em conta. Quando a Hotmart não trouxer previsão real, o item fica marcado como projetado.</p>
              </div>
              <PeriodFilter period={period} setPeriod={setPeriod} />
            </div>
            <ReceivablesTable rows={filteredReceivables.slice(0, 8)} compact />
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Metric icon={<Users />} label="Alunos na base" value={context.alunos.length} helper="criados a partir das vendas" />
            <Metric icon={<GraduationCap />} label="Acessos a vencer" value={expiringStudents} helper="proximos 30 dias" />
            <Metric icon={<AlertTriangle />} label="Pendencias" value={unclassifiedSales} helper="vendas sem produto mapeado" />
          </div>
        </div>
      ) : null}

      {activeTab === "sales" ? (
        <DataCard title="Vendas Hotmart" helper="Histórico e vendas atuais normalizadas pelo n8n.">
          <CommercialFilters
            table="sales"
            years={years}
            months={months}
            year={yearFilter}
            month={monthFilter}
            status={statusFilter}
            search={search}
            onYear={setYearFilter}
            onMonth={setMonthFilter}
            onStatus={setStatusFilter}
            onSearch={setSearch}
          />
          <SalesTable rows={paginate(salesRows, salesPage)} allRows={salesRows} />
          <Pagination page={salesPage} totalPages={pageCount(salesRows.length)} totalRows={salesRows.length} onPage={setSalesPage} />
        </DataCard>
      ) : null}
      {activeTab === "receivables" ? (
        <DataCard title="Recebíveis" helper="Previsão 7, 15, 30 dias, mês ou tudo. Itens projetados antigos não devem ser tratados como saldo real sem conferência.">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <PeriodFilter period={period} setPeriod={setPeriod} />
            <ExportButtons
              label="Recebíveis Comercial"
              filename="comercial_recebiveis"
              columns={receivableExportColumns}
              rows={receivableRows}
            />
          </div>
          <CommercialFilters
            table="receivables"
            years={years}
            months={months}
            year={yearFilter}
            month={monthFilter}
            status={statusFilter}
            search={search}
            onYear={setYearFilter}
            onMonth={setMonthFilter}
            onStatus={setStatusFilter}
            onSearch={setSearch}
          />
          <ReceivablesTable rows={paginate(receivableRows, receivablesPage)} />
          <Pagination page={receivablesPage} totalPages={pageCount(receivableRows.length)} totalRows={receivableRows.length} onPage={setReceivablesPage} />
        </DataCard>
      ) : null}
      {activeTab === "students" ? (
        <DataCard title="Alunos" helper="Base comercial inicial. Último acesso/progresso dependem da integração Hotmart Club ou Cademí.">
          <CommercialFilters
            table="students"
            years={years}
            months={months}
            year={yearFilter}
            month={monthFilter}
            status={statusFilter}
            search={search}
            onYear={setYearFilter}
            onMonth={setMonthFilter}
            onStatus={setStatusFilter}
            onSearch={setSearch}
          />
          <StudentsTable rows={paginate(studentRows, studentsPage)} allRows={studentRows} />
          <Pagination page={studentsPage} totalPages={pageCount(studentRows.length)} totalRows={studentRows.length} onPage={setStudentsPage} />
        </DataCard>
      ) : null}
      {activeTab === "products" ? (
        <DataCard title="Produtos" helper="Mapeamento Hotmart para curso, centro de resultado e dias de acesso.">
          <div className="grid gap-3">
            {context.produtos.map((item) => (
              <div key={item.id} className="rounded-md border border-brand-sand bg-white/70 p-4">
                <p className="font-black text-brand-teal">{item.nome}</p>
                <p className="mt-1 text-sm text-brand-teal/60">
                  Hotmart ID: {item.hotmart_product_id ?? "-"} | Acesso: {item.dias_acesso ? `${item.dias_acesso} dias` : "não definido"}
                </p>
              </div>
            ))}
            {!context.produtos.length ? <EmptyState text="Nenhum produto importado ainda." /> : null}
          </div>
        </DataCard>
      ) : null}
      {activeTab === "reconciliation" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={<PackageCheck />} label="Produtos sem mapa" value={context.produtos.filter((item) => !item.curso_id).length} helper="vincular a curso/centro" />
          <Metric icon={<AlertTriangle />} label="Vendas sem produto" value={unclassifiedSales} helper="revisar antes do Financeiro" />
          <Metric icon={<RefreshCw />} label="Reembolsos/chargebacks" value={refundedSales.length} helper="deducoes futuras" />
          <Card className="p-5 md:col-span-3">
            <h2 className="text-xl font-black text-brand-teal">Validação do fluxo atual</h2>
            <p className="mt-1 text-sm text-brand-teal/60">Use este bloco para conferir se o workflow em tempo real está chegando sem depender do backfill histórico.</p>
            <RawImportsTable rows={context.rawImports.slice(0, 10)} />
          </Card>
        </div>
      ) : null}
      {activeTab === "admin" && context.canWrite ? (
        <DataCard title="Admin Comercial" helper="Nesta primeira entrega, o cadastro administrativo fica estruturado para a proxima etapa.">
          <p className="text-sm font-bold text-brand-teal/65">
            Proximo passo: permitir editar produtos, dias de acesso, curso vinculado e centro de resultado pela tela. Por enquanto, o n8n cria produtos automaticamente e deixa pendencias na Conciliacao.
          </p>
        </DataCard>
      ) : null}
    </section>
  );
}

function Header({ updatedAt }: { updatedAt: string | null }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-brand-clay">Hotmart e alunos</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-brand-teal">Comercial</h1>
        <p className="mt-3 max-w-3xl text-lg text-brand-teal/70">
          Vendas, recebiveis, alunos e produtos conectados a Hotmart antes de impactar Financeiro e DRE.
        </p>
      </div>
      <span className="text-sm font-bold text-brand-teal/60">Base atualizada em {formatDateTime(updatedAt)}</span>
    </header>
  );
}

function Metric({ icon, label, value, helper }: { icon: ReactNode; label: string; value: ReactNode; helper: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-brand-clay">{label}</p>
          <p className="mt-3 text-3xl font-black text-brand-teal">{value}</p>
          <p className="mt-2 text-sm font-bold text-brand-teal/55">{helper}</p>
        </div>
        <span className="rounded-lg bg-brand-cream p-3 text-brand-teal">{icon}</span>
      </div>
    </Card>
  );
}

function PeriodFilter({ period, setPeriod }: { period: PeriodKey; setPeriod: (period: PeriodKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setPeriod(item.key)}
          className={`rounded-md border px-4 py-2 text-sm font-black ${period === item.key ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function CommercialFilters({
  table,
  years,
  months,
  year,
  month,
  status,
  search,
  onYear,
  onMonth,
  onStatus,
  onSearch,
}: {
  table: TableKey;
  years: string[];
  months: string[];
  year: string;
  month: string;
  status: string;
  search: string;
  onYear: (value: string) => void;
  onMonth: (value: string) => void;
  onStatus: (value: string) => void;
  onSearch: (value: string) => void;
}) {
  const statusOptions =
    table === "students"
      ? ["ativo", "expirado", "reembolsado", "cancelado", "nao_validado"]
      : table === "receivables"
        ? ["previsto", "disponivel", "recebido", "atrasado", "cancelado", "reembolsado", "hotmart", "projetado", "manual"]
        : ["APPROVED", "COMPLETE", "REFUNDED", "CHARGEBACK", "CANCELED", "EXPIRED"];

  return (
    <div className="mb-4 grid gap-3 rounded-md border border-brand-sand bg-white/70 p-3 md:grid-cols-[1fr_160px_160px_180px]">
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Buscar por aluno, e-mail, transação ou produto"
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal outline-none focus:border-brand-clay"
      />
      <select
        value={year}
        onChange={(event) => onYear(event.target.value)}
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="all">Todos os anos</option>
        {years.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select
        value={month}
        onChange={(event) => onMonth(event.target.value)}
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="all">Todos os meses</option>
        {months.map((item) => (
          <option key={item} value={item}>{monthShort(Number(item) - 1)}/{year === "all" ? "todos" : year.slice(-2)}</option>
        ))}
      </select>
      <select
        value={status}
        onChange={(event) => onStatus(event.target.value)}
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="all">Todos status</option>
        {statusOptions.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}

function RealtimeValidationCard({
  latest,
  total,
  realtimeCount,
  recentRealtimeCount,
}: {
  latest: ComercialRawImport | null;
  total: number;
  realtimeCount: number;
  recentRealtimeCount: number;
}) {
  return (
    <Card className="p-5">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="text-xs font-black uppercase text-brand-clay">Validação Hotmart</p>
          <h2 className="mt-2 text-xl font-black text-brand-teal">Vendas atuais chegando pelo n8n</h2>
          <p className="mt-2 text-sm text-brand-teal/60">
            Use este quadro após testar uma compra/webhook. Se a venda chegou, a linha mais recente deve mudar quase na hora.
          </p>
        </div>
        <div className="rounded-md border border-brand-sand bg-brand-cream/40 p-4">
          <p className="text-xs font-black uppercase text-brand-clay">Última entrada</p>
          <p className="mt-2 text-lg font-black text-brand-teal">{latest ? formatDateTime(latest.received_at) : "Sem eventos"}</p>
          <p className="mt-1 text-sm font-bold text-brand-teal/60">{latest ? `${rawImportSource(latest)} · ${rawImportEvent(latest)}` : "Aguardando Hotmart"}</p>
        </div>
        <div className="rounded-md border border-brand-sand bg-brand-cream/40 p-4">
          <p className="text-xs font-black uppercase text-brand-clay">Tempo real</p>
          <p className="mt-2 text-2xl font-black text-brand-teal">{recentRealtimeCount}</p>
          <p className="mt-1 text-sm font-bold text-brand-teal/60">eventos nas últimas 24h · {realtimeCount} de {total} recentes</p>
        </div>
      </div>
    </Card>
  );
}

function RawImportsTable({ rows }: { rows: ComercialRawImport[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Recebido</th>
            <th className="px-4 py-3">Origem</th>
            <th className="px-4 py-3">Evento</th>
            <th className="px-4 py-3">Transação</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{formatDateTime(row.received_at)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{rawImportSource(row)}</td>
              <td className="px-4 py-3 text-brand-teal">{rawImportEvent(row)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{row.transaction_id ?? "-"}</td>
              <td className="px-4 py-3"><Badge value={row.status} tone={row.status === "processado" ? "ok" : row.status === "erro" ? "warn" : undefined} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Nenhuma entrada recente da Hotmart." /> : null}
    </div>
  );
}

function DataCard({ title, helper, children }: { title: string; helper: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-brand-sand p-5">
        <h2 className="text-xl font-black text-brand-teal">{title}</h2>
        <p className="text-sm text-brand-teal/60">{helper}</p>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

const salesExportColumns = [
  { header: "Compra", value: (row: ComercialVenda) => formatDate(row.data_compra ?? row.data_aprovacao) },
  { header: "Aluno", value: (row: ComercialVenda) => row.comprador_nome ?? row.comprador_email ?? "-" },
  { header: "E-mail", value: (row: ComercialVenda) => row.comprador_email ?? "-" },
  { header: "Produto", value: (row: ComercialVenda) => row.produto_nome ?? "-" },
  { header: "Status", value: (row: ComercialVenda) => row.status },
  { header: "Pagamento", value: (row: ComercialVenda) => `${row.forma_pagamento ?? "-"} ${row.parcelas > 1 ? `${row.parcelas}x` : ""}`.trim() },
  { header: "Bruto", value: (row: ComercialVenda) => row.valor_bruto },
  { header: "Liquido", value: (row: ComercialVenda) => row.valor_liquido ?? "" },
];

const receivableExportColumns = [
  { header: "Previsao", value: (row: ComercialRecebivel) => formatDate(row.data_prevista) },
  { header: "Transacao", value: (row: ComercialRecebivel) => row.transaction_id },
  { header: "Parcela", value: (row: ComercialRecebivel) => `${row.parcela_numero}/${row.total_parcelas}` },
  { header: "Fonte", value: (row: ComercialRecebivel) => row.fonte_previsao },
  { header: "Status", value: (row: ComercialRecebivel) => row.status },
  { header: "Valor bruto", value: (row: ComercialRecebivel) => row.valor_bruto },
  { header: "Valor liquido", value: (row: ComercialRecebivel) => row.valor_liquido ?? "" },
];

const studentExportColumns = [
  { header: "Aluno", value: (row: ComercialAluno) => row.nome ?? "-" },
  { header: "E-mail", value: (row: ComercialAluno) => row.email },
  { header: "Telefone", value: (row: ComercialAluno) => row.telefone ?? "-" },
  { header: "Primeira compra", value: (row: ComercialAluno) => formatDate(row.primeira_compra_at) },
  { header: "Ultima compra", value: (row: ComercialAluno) => formatDate(row.ultima_compra_at) },
  { header: "Expira em", value: (row: ComercialAluno) => formatDate(row.acesso_expira_em) },
  { header: "Status", value: (row: ComercialAluno) => row.status_acesso },
];

function SalesTable({ rows, allRows }: { rows: ComercialVenda[]; allRows?: ComercialVenda[] }) {
  return (
    <div className="overflow-x-auto">
      {allRows ? (
        <div className="mb-3 flex justify-end">
          <ExportButtons label="Vendas Comercial" filename="comercial_vendas" columns={salesExportColumns} rows={allRows} />
        </div>
      ) : null}
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Compra</th>
            <th className="px-4 py-3">Aluno</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Pagamento</th>
            <th className="px-4 py-3 text-right">Bruto</th>
            <th className="px-4 py-3 text-right">Liquido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{formatDate(row.data_compra ?? row.data_aprovacao)}</td>
              <td className="px-4 py-3 text-brand-teal">{row.comprador_nome ?? row.comprador_email ?? "-"}</td>
              <td className="px-4 py-3 text-brand-teal/75">{row.produto_nome ?? "-"}</td>
              <td className="px-4 py-3"><Badge value={row.status} /></td>
              <td className="px-4 py-3 text-brand-teal/65">{row.forma_pagamento ?? "-"} {row.parcelas > 1 ? `${row.parcelas}x` : ""}</td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{formatMoney(row.valor_bruto)}</td>
              <td className="px-4 py-3 text-right text-brand-teal/75">
                {row.valor_liquido === null || row.valor_liquido === undefined ? (
                  <span className="text-xs font-bold text-amber-700">Não informado</span>
                ) : (
                  formatMoney(row.valor_liquido)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Nenhuma venda importada ainda." /> : null}
    </div>
  );
}

function ReceivablesTable({ rows, compact = false }: { rows: ComercialRecebivel[]; compact?: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Previsao</th>
            <th className="px-4 py-3">Transacao</th>
            <th className="px-4 py-3">Parcela</th>
            <th className="px-4 py-3">Fonte</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{formatDate(row.data_prevista)}</td>
              <td className="px-4 py-3 text-brand-teal">{row.transaction_id}</td>
              <td className="px-4 py-3 text-brand-teal/70">{row.parcela_numero}/{row.total_parcelas}</td>
              <td className="px-4 py-3"><Badge value={row.fonte_previsao} tone={row.fonte_previsao === "hotmart" ? "ok" : "warn"} /></td>
              <td className="px-4 py-3"><Badge value={row.status} /></td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{formatMoney(row.valor_liquido ?? row.valor_bruto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text={compact ? "Nenhum recebivel no periodo." : "Nenhum recebivel importado ainda."} /> : null}
    </div>
  );
}

function StudentsTable({ rows, allRows }: { rows: ComercialAluno[]; allRows?: ComercialAluno[] }) {
  return (
    <div className="overflow-x-auto">
      {allRows ? (
        <div className="mb-3 flex justify-end">
          <ExportButtons label="Alunos Comercial" filename="comercial_alunos" columns={studentExportColumns} rows={allRows} />
        </div>
      ) : null}
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Aluno</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Ultima compra</th>
            <th className="px-4 py-3">Expira em</th>
            <th className="px-4 py-3">Ultimo acesso</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{row.nome ?? "-"}</td>
              <td className="px-4 py-3 text-brand-teal">{row.email}</td>
              <td className="px-4 py-3 text-brand-teal/70">{formatDate(row.ultima_compra_at)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{formatDate(row.acesso_expira_em)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{formatDate(row.ultimo_acesso_at)}</td>
              <td className="px-4 py-3"><Badge value={row.status_acesso} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Nenhum aluno importado ainda." /> : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalRows,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  onPage: (page: number) => void;
}) {
  const start = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalRows);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-brand-teal/65">
      <span>
        {start}-{end} de {totalRows} registros
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-brand-sand bg-white px-3 text-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
        <span className="rounded-md bg-brand-cream px-3 py-2">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-brand-sand bg-white px-3 text-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
        >
          Avançar
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Badge({ value, tone }: { value: string; tone?: "ok" | "warn" }) {
  const className =
    tone === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-100 text-amber-700"
        : "bg-brand-sand text-brand-teal";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>{value}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-5 text-sm font-bold text-brand-teal/60">{text}</p>;
}
