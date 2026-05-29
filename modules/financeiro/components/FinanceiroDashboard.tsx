"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  LineChart,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  WalletCards,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { createClient } from "@/lib/supabase/client";
import type {
  CreateLancamentoPayload,
  FinBanco,
  FinCartao,
  FinCategoria,
  FinCentroResultado,
  FinCurso,
  FinFormaPagamento,
  FinLancamento,
  FinStatus,
  FinSubcategoria,
  FinTipo,
  FinanceiroContext,
} from "@/modules/financeiro/types";

const tabs = ["inicio", "diagnostico", "lancar", "consultar", "dre", "marketing", "cadastro"] as const;
type Tab = (typeof tabs)[number];
const FINANCEIRO_PAGE_SIZE = 20;
const CENTRO_ORDER = ["Infoproduto", "Administrativo fixo", "Não operacional", "Clínica", "Palestras"];

const tabLabels: Record<Tab, string> = {
  inicio: "Início",
  diagnostico: "Diagnóstico",
  lancar: "Lançar",
  consultar: "Consultar",
  dre: "DRE",
  marketing: "Marketing",
  cadastro: "Cadastro",
};

type PeriodFilter = "hoje" | "7d" | "15d" | "30d" | "90d" | "ano" | "tudo";
type CadastroKind = "centro" | "categoria" | "subcategoria" | "curso";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function decimalMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(`${value}T12:00:00`));
}

function monthLabel(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00`))
    .replace(".", "")
    .replace(" de ", "/");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function updatedAtLabel(value: string | null) {
  if (!value) return "Base sem atualização registrada";
  return `Base atualizada em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function monthInput(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function firstDayOfMonth(date = new Date()) {
  return `${monthInput(date)}-01`;
}

function idMap<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function signedValue(row: FinLancamento) {
  return row.tipo === "entrada" ? row.valor : -row.valor;
}

function tipoVisual(tipo: FinTipo) {
  return tipo === "entrada"
    ? {
        label: "Entrada",
        Icon: ArrowDownLeft,
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconBox: "bg-emerald-100 text-emerald-700",
        text: "text-emerald-700",
      }
    : {
        label: "Saída",
        Icon: ArrowUpRight,
        badge: "bg-rose-50 text-brand-clay border-rose-200",
        iconBox: "bg-rose-100 text-brand-clay",
        text: "text-brand-clay",
      };
}

function periodStart(period: PeriodFilter) {
  const now = new Date();
  const date = new Date(now);
  if (period === "hoje") return now.toISOString().slice(0, 10);
  if (period === "7d") date.setDate(now.getDate() - 7);
  if (period === "15d") date.setDate(now.getDate() - 15);
  if (period === "30d") date.setDate(now.getDate() - 30);
  if (period === "90d") date.setDate(now.getDate() - 90);
  if (period === "ano") return `${now.getFullYear()}-01-01`;
  if (period === "tudo") return "1900-01-01";
  return date.toISOString().slice(0, 10);
}

function periodEnd(period: PeriodFilter) {
  if (period === "hoje") return todayInput();
  return null;
}

function periodLabel(period: PeriodFilter) {
  const labels: Record<PeriodFilter, string> = {
    hoje: "Hoje",
    "7d": "7 dias",
    "15d": "15 dias",
    "30d": "30 dias",
    "90d": "90 dias",
    ano: "Ano",
    tudo: "Tudo",
  };

  return labels[period];
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return Number(digits || "0") / 100;
}

function formatCurrencyInput(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function emptyLancamentoForm(context: FinanceiroContext): CreateLancamentoPayload {
  const firstCentro = context.centros.find((item) => item.ativo)?.id ?? "";
  const firstCategoria =
    context.categorias.find((item) => item.ativo && item.tipo === "saida")?.id ?? "";

  return {
    tipo: "saida",
    status: "realizado",
    data_pagamento: todayInput(),
    mes_competencia: firstDayOfMonth(),
    centro_resultado_id: firstCentro,
    categoria_id: firstCategoria,
    subcategoria_id: null,
    curso_id: null,
    forma_pagamento: "conta_bancaria",
    banco_id: context.bancos.find((item) => item.ativo)?.id ?? null,
    cartao_id: null,
    qtd_parcelas: 1,
    descricao: "",
    valor: 0,
    observacao: "",
  };
}

export function FinanceiroDashboard({ context }: { context: FinanceiroContext }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const [period, setPeriod] = useState<PeriodFilter>("tudo");
  const [centroFilter, setCentroFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [consultarPage, setConsultarPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAdmin = context.perfil === "admin";
  const visibleTabs = useMemo(() => {
    if (context.perfil === "marketing") {
      return ["marketing"] as Tab[];
    }

    return tabs.filter((tab) => tab !== "cadastro" || isAdmin);
  }, [context.perfil, isAdmin]);

  const centroById = useMemo(() => idMap(context.centros), [context.centros]);
  const categoriaById = useMemo(() => idMap(context.categorias), [context.categorias]);
  const subcategoriaById = useMemo(() => idMap(context.subcategorias), [context.subcategorias]);
  const bancoById = useMemo(() => idMap(context.bancos), [context.bancos]);
  const cartaoById = useMemo(() => idMap(context.cartoes), [context.cartoes]);
  const cursoById = useMemo(() => idMap(context.cursos), [context.cursos]);

  const filteredLancamentos = useMemo(() => {
    const start = periodStart(period);
    const end = periodEnd(period);
    const needle = query.trim().toLowerCase();

    return context.lancamentos.filter((row) => {
      if (row.data_pagamento < start) return false;
      if (end && row.data_pagamento > end) return false;
      if (centroFilter !== "todos" && row.centro_resultado_id !== centroFilter) return false;
      if (statusFilter !== "todos" && row.status !== statusFilter) return false;
      if (needle && !row.descricao.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [centroFilter, context.lancamentos, period, query, statusFilter]);

  const metrics = useMemo(() => {
    const now = new Date();
    const next30 = new Date(now);
    next30.setDate(now.getDate() + 30);
    const next30Iso = next30.toISOString().slice(0, 10);
    const todayIso = todayInput();

    const realized = context.lancamentos.filter((row) => row.status === "realizado");
    const saldo = realized.reduce((sum, row) => sum + signedValue(row), 0);
    const realizedSaidas = realized.filter((row) => row.tipo === "saida");
    const mesesSaida = new Set(realizedSaidas.map((row) => row.mes_competencia.slice(0, 7)));
    const totalSaidas = realizedSaidas.reduce((sum, row) => sum + row.valor, 0);
    const mediaSaidasMes = mesesSaida.size > 0 ? totalSaidas / mesesSaida.size : 0;
    const receber = context.lancamentos
      .filter((row) => row.status === "previsto" && row.tipo === "entrada" && row.data_pagamento >= todayIso && row.data_pagamento <= next30Iso)
      .reduce((sum, row) => sum + row.valor, 0);
    const pagar = context.lancamentos
      .filter((row) => row.status === "previsto" && row.tipo === "saida" && row.data_pagamento >= todayIso && row.data_pagamento <= next30Iso)
      .reduce((sum, row) => sum + row.valor, 0);
    const vencendo = context.lancamentos.filter(
      (row) => row.status === "previsto" && row.tipo === "saida" && row.data_pagamento >= todayIso && row.data_pagamento <= next30Iso,
    );

    return {
      saldo,
      receber,
      pagar,
      saldoProjetado: saldo + receber - pagar,
      mediaSaidasMes,
      reservaMinimaMeta: mediaSaidasMes * 3,
      reservaEmergenciaMeta: mediaSaidasMes * 6,
      reservaInvestida: Math.max(saldo, 0),
      saldoLivreInvestir: saldo - mediaSaidasMes * 3,
      vencendo,
      receitaMes: context.dre[0]?.receita_bruta ?? 0,
      ebitdaMes: context.dre[0]?.ebitda ?? 0,
    };
  }, [context.dre, context.lancamentos]);

  useEffect(() => {
    const supabase = createClient() as any;
    const channel = supabase
      .channel("financeiro-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_lancamentos" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_bancos" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_cartoes" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_categorias" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "fin_subcategorias" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? "inicio");
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    setConsultarPage(1);
  }, [centroFilter, period, query, statusFilter]);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4500);
  }

  if (context.diagnostic) {
    return (
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm font-bold uppercase text-brand-clay">Financeiro</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-teal">Acesso ainda não disponível</h1>
        <p className="mt-3 text-sm leading-6 text-brand-teal/70">{context.diagnostic}</p>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-[1480px] space-y-6">
      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-clay">Financeiro</p>
          <h1 className="mt-2 text-4xl font-semibold text-brand-teal">Gestão financeira</h1>
          <p className="mt-2 max-w-3xl text-base leading-7 text-brand-teal/70">
            Fluxo de caixa, DRE, faturas e lançamentos com base multiempresa e regras gerenciais.
          </p>
        </div>
        <div className="text-sm font-semibold text-brand-teal/60">{updatedAtLabel(context.updatedAt)}</div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-white/70 bg-white/70 p-2 shadow-soft">
        {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "rounded-md px-4 py-2 text-sm font-bold transition",
                activeTab === tab
                  ? "bg-brand-clay text-white shadow-sm"
                  : "border border-brand-sand/70 bg-white/60 text-brand-teal hover:bg-white",
              )}
            >
              {tabLabels[tab]}
            </button>
          ))}
      </nav>

      {message ? (
        <div className="rounded-md border border-brand-sand bg-white/80 px-4 py-3 text-sm font-semibold text-brand-teal shadow-soft">
          {message}
        </div>
      ) : null}

      {activeTab === "inicio" ? (
        <InicioTab metrics={metrics} context={context} />
      ) : null}
      {activeTab === "diagnostico" ? (
        <DiagnosticoTab context={context} />
      ) : null}
      {activeTab === "lancar" ? (
        <LancarTab
          context={context}
          isPending={isPending}
          startTransition={startTransition}
          notify={notify}
        />
      ) : null}
      {activeTab === "consultar" ? (
        <ConsultarTab
          rows={filteredLancamentos}
          context={context}
          period={period}
          setPeriod={setPeriod}
          centroFilter={centroFilter}
          setCentroFilter={setCentroFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          query={query}
          setQuery={setQuery}
          page={consultarPage}
          setPage={setConsultarPage}
          maps={{ centroById, categoriaById, subcategoriaById, bancoById, cartaoById, cursoById }}
        />
      ) : null}
      {activeTab === "dre" ? <DreTab context={context} /> : null}
      {activeTab === "marketing" ? <MarketingTab context={context} /> : null}
      {activeTab === "cadastro" && isAdmin ? (
        <CadastroTab
          context={context}
          isPending={isPending}
          startTransition={startTransition}
          notify={notify}
        />
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Banknote;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-4 top-3 h-1 rounded-full bg-brand-clay/70" />
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-brand-clay/75">{label}</p>
          <p className="mt-3 text-3xl font-black text-brand-teal">{value}</p>
          <p className="mt-1 text-sm font-semibold text-brand-teal/55">{detail}</p>
        </div>
        <span className="rounded-md bg-[#FFF0F2] p-3 text-brand-clay">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

type InicioMetrics = {
  saldo: number;
  receber: number;
  pagar: number;
  saldoProjetado: number;
  mediaSaidasMes: number;
  reservaMinimaMeta: number;
  reservaEmergenciaMeta: number;
  reservaInvestida: number;
  saldoLivreInvestir: number;
  vencendo: FinLancamento[];
  receitaMes: number;
  ebitdaMes: number;
};

function InicioTab({ metrics, context }: { metrics: InicioMetrics; context: FinanceiroContext }) {
  const latestDre = context.dre[0];
  const reservaMinimaPercent = progressPercent(metrics.reservaInvestida, metrics.reservaMinimaMeta);
  const reservaEmergenciaPercent = progressPercent(metrics.reservaInvestida, metrics.reservaEmergenciaMeta);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <SectionTitle label="Próximos 30 dias" />
        <div className="grid gap-4 md:grid-cols-2">
          <FinanceFocusCard
            title="A Receber"
            value={decimalMoney(metrics.receber)}
            detail="Previsto"
            tone="positive"
          />
          <FinanceFocusCard
            title="A Pagar"
            value={decimalMoney(metrics.pagar)}
            detail="Previsto"
            tone="negative"
          />
        </div>
        <Card className="p-5">
          <p className="text-sm font-bold text-brand-teal/70">Saldo Projetado</p>
          <p className="mt-2 text-4xl font-black text-emerald-700">{decimalMoney(metrics.saldoProjetado)}</p>
          <p className="mt-1 text-sm font-semibold text-brand-teal/60">Conta + receber - pagar</p>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle label="Reservas" />
        <ReserveCard
          title="Reserva Mínima (3x fixos/mês)"
          percent={reservaMinimaPercent}
          invested={metrics.reservaInvestida}
          target={metrics.reservaMinimaMeta}
          tone="danger"
        />
        <ReserveCard
          title="Reserva Emergência (6x saídas/mês)"
          percent={reservaEmergenciaPercent}
          invested={metrics.reservaInvestida}
          target={metrics.reservaEmergenciaMeta}
          tone="warning"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FinanceFocusCard
            title="Saldo Livre p/ Investir"
            value={decimalMoney(metrics.saldoLivreInvestir)}
            detail="Conta - reserva mínima"
            tone={metrics.saldoLivreInvestir >= 0 ? "positive" : "negative"}
          />
          <FinanceFocusCard
            title="Média Fixos/mês"
            value={decimalMoney(metrics.mediaSaidasMes)}
            detail="Base realizada importada"
            tone="neutral"
          />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Saldo realizado" value={money(metrics.saldo)} detail="Entradas menos saídas realizadas" icon={Landmark} />
        <MetricCard label="A receber 30d" value={money(metrics.receber)} detail="Lançamentos previstos" icon={BadgeDollarSign} />
        <MetricCard label="A pagar 30d" value={money(metrics.pagar)} detail="Contas e compromissos" icon={ReceiptText} />
        <MetricCard label="EBITDA mês" value={money(metrics.ebitdaMes)} detail={latestDre ? monthLabel(latestDre.mes_competencia) : "Sem DRE"} icon={LineChart} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-brand-teal">Próximos vencimentos</h2>
              <p className="mt-1 text-sm text-brand-teal/60">Alertas dos próximos 30 dias.</p>
            </div>
            <span className="rounded-md bg-brand-cream px-3 py-2 text-sm font-black text-brand-teal">
              {metrics.vencendo.length}
            </span>
          </div>
          <div className="mt-5 divide-y divide-brand-sand/60">
            {metrics.vencendo.slice(0, 8).map((row) => (
              <div key={row.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-bold text-brand-teal">{row.descricao}</p>
                  <p className="text-sm text-brand-teal/60">{dateLabel(row.data_pagamento)}</p>
                </div>
                <p className="font-black text-brand-clay">{decimalMoney(row.valor)}</p>
              </div>
            ))}
            {metrics.vencendo.length === 0 ? <p className="py-6 text-sm text-brand-teal/60">Nenhum vencimento previsto.</p> : null}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold text-brand-teal">Próximas faturas</h2>
          <div className="mt-5 space-y-3">
            {context.faturas.slice(0, 5).map((fatura) => (
              <div key={`${fatura.cartao_id}-${fatura.mes_vencimento}`} className="rounded-md border border-brand-sand/70 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-brand-teal">{fatura.cartao_nome}</p>
                  <p className="font-black text-brand-clay">{money(fatura.valor_estimado)}</p>
                </div>
                <p className="mt-1 text-sm text-brand-teal/60">
                  {monthLabel(fatura.mes_vencimento)} · {fatura.qtd_lancamentos} lançamentos
                </p>
              </div>
            ))}
            {context.faturas.length === 0 ? <p className="text-sm text-brand-teal/60">Nenhuma fatura cadastrada.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DiagnosticoTab({ context }: { context: FinanceiroContext }) {
  const latest = context.dre[0];
  const receita = latest?.receita_liquida || 0;
  const marginEbitda = receita ? (latest!.ebitda / receita) * 100 : 0;
  const despesaRatio = receita ? ((Math.abs(latest?.despesas_administrativas || 0) + Math.abs(latest?.despesas_pessoal || 0)) / receita) * 100 : 0;
  const months = lastCompetenceMonths(context.drePorCentro.length ? context.drePorCentro : context.dre, 3);
  const centrosOrdenados = sortedCentroNames(context.centros);
  const centroRowsByMonth = new Map(
    context.drePorCentro.map((row) => [`${row.mes_competencia}:${row.centro_resultado}`, row]),
  );
  const categoriaById = idMap(context.categorias);
  const subcategoriaById = idMap(context.subcategorias);
  const categoryBars = aggregateLancamentos(
    context.lancamentos,
    (row) => categoriaById.get(row.categoria_id)?.nome ?? "Sem categoria",
    months,
  );
  const subcategoryBars = aggregateLancamentos(
    context.lancamentos,
    (row) => row.subcategoria_id ? subcategoriaById.get(row.subcategoria_id)?.nome ?? "Sem subcategoria" : "Sem subcategoria",
    months,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <BenchmarkCard label="Margem EBITDA" value={`${marginEbitda.toFixed(1)}%`} good={marginEbitda >= 20} warn={marginEbitda >= 10} />
      <BenchmarkCard label="% fixos / receita líquida" value={`${despesaRatio.toFixed(1)}%`} good={despesaRatio <= 35} warn={despesaRatio <= 50} />
      <BenchmarkCard label="Lucro liquido" value={money(latest?.lucro_liquido ?? 0)} good={(latest?.lucro_liquido ?? 0) > 0} warn={(latest?.lucro_liquido ?? 0) === 0} />
      <Card className="p-5 lg:col-span-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-teal">Resultado por centro</h2>
            <p className="text-sm font-semibold text-brand-teal/60">Últimos 3 meses, sempre na mesma ordem de centros.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {months.map((month) => (
            <div key={month} className="rounded-lg border border-brand-sand/70 bg-white/55 p-4">
              <p className="text-sm font-black uppercase text-brand-clay">{monthLabel(month)}</p>
              <div className="mt-4 space-y-3">
                {centrosOrdenados.map((centro) => {
                  const row = centroRowsByMonth.get(`${month}:${centro}`);
                  const value = row?.lucro_liquido ?? 0;

                  return (
                    <div key={`${month}-${centro}`} className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-brand-teal/75">{centro}</p>
                      <p className={clsx("shrink-0 text-sm font-black", value >= 0 ? "text-emerald-700" : "text-brand-clay")}>
                        {money(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="lg:col-span-3 grid gap-5 xl:grid-cols-2">
        <RevenueExpenseBars title="Receitas e gastos por categorias" rows={categoryBars} />
        <RevenueExpenseBars title="Receitas e gastos por subcategorias" rows={subcategoryBars} />
      </div>
    </div>
  );
}

function BenchmarkCard({ label, value, good, warn }: { label: string; value: string; good: boolean; warn: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase text-brand-clay/75">{label}</p>
      <p className="mt-3 text-3xl font-black text-brand-teal">{value}</p>
      <span
        className={clsx(
          "mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black",
          good && "bg-emerald-100 text-emerald-700",
          !good && warn && "bg-amber-100 text-amber-700",
          !good && !warn && "bg-rose-100 text-rose-700",
        )}
      >
        {good ? "Saudável" : warn ? "Atenção" : "Crítico"}
      </span>
    </Card>
  );
}

function progressPercent(value: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-black uppercase tracking-wide text-brand-clay">{label}</p>
      <div className="h-px flex-1 bg-brand-sand" />
    </div>
  );
}

function FinanceFocusCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <Card
      className={clsx(
        "p-5",
        tone === "positive" && "border-emerald-200 bg-emerald-50/45",
        tone === "negative" && "border-rose-200 bg-rose-50/45",
      )}
    >
      <p className="text-base font-bold text-brand-teal/70">{title}</p>
      <p
        className={clsx(
          "mt-2 text-3xl font-black",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-brand-clay",
          tone === "neutral" && "text-brand-teal",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm font-semibold text-brand-teal/60">{detail}</p>
    </Card>
  );
}

function ReserveCard({
  title,
  percent,
  invested,
  target,
  tone,
}: {
  title: string;
  percent: number;
  invested: number;
  target: number;
  tone: "danger" | "warning";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-base font-bold text-brand-teal/75">{title}</p>
        <p className={clsx("text-lg font-black", tone === "danger" ? "text-brand-clay" : "text-[#9D6F4E]")}>
          {percent}%
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-cream">
        <div
          className={clsx("h-full rounded-full", tone === "danger" ? "bg-brand-clay" : "bg-[#9D6F4E]")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 grid gap-1 text-sm font-semibold text-brand-teal/70 sm:grid-cols-2">
        <p>Investido: {decimalMoney(invested)}</p>
        <p className="sm:text-right">Meta: {decimalMoney(target)}</p>
      </div>
    </Card>
  );
}

function sortedCentroNames(centros: FinCentroResultado[]) {
  return [
    ...CENTRO_ORDER,
    ...centros
      .map((centro) => centro.nome)
      .filter((nome) => !CENTRO_ORDER.includes(nome))
      .sort((a, b) => a.localeCompare(b)),
  ];
}

function lastCompetenceMonths(rows: Array<{ mes_competencia: string }>, limit = 3) {
  return Array.from(new Set(rows.map((row) => row.mes_competencia)))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .reverse();
}

function aggregateLancamentos(
  rows: FinLancamento[],
  labelFor: (row: FinLancamento) => string,
  months: string[],
) {
  const monthSet = new Set(months);
  const map = new Map<string, { label: string; entrada: number; saida: number }>();

  rows
    .filter((row) => row.status !== "cancelado" && monthSet.has(row.mes_competencia))
    .forEach((row) => {
      const label = labelFor(row);
      const current = map.get(label) ?? { label, entrada: 0, saida: 0 };
      if (row.tipo === "entrada") {
        current.entrada += row.valor;
      } else {
        current.saida += row.valor;
      }
      map.set(label, current);
    });

  return Array.from(map.values())
    .sort((a, b) => b.entrada + b.saida - (a.entrada + a.saida))
    .slice(0, 8);
}

function RevenueExpenseBars({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; entrada: number; saida: number }>;
}) {
  const max = Math.max(...rows.map((row) => Math.max(row.entrada, row.saida)), 1);

  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-brand-teal">{title}</h3>
      <div className="mt-5 space-y-4">
        {rows.length ? rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-bold text-brand-teal">{row.label}</p>
              <p className="shrink-0 text-xs font-semibold text-brand-teal/60">
                {money(row.entrada)} / {money(row.saida)}
              </p>
            </div>
            <div className="grid gap-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max((row.entrada / max) * 100, row.entrada ? 3 : 0)}%` }} />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-rose-50">
                <div className="h-full rounded-full bg-brand-clay" style={{ width: `${Math.max((row.saida / max) * 100, row.saida ? 3 : 0)}%` }} />
              </div>
            </div>
          </div>
        )) : (
          <p className="rounded-md border border-dashed border-brand-sand p-4 text-sm font-semibold text-brand-teal/60">
            Sem lançamentos no período.
          </p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-brand-teal/60">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Receitas</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-clay" /> Gastos</span>
      </div>
    </Card>
  );
}

function LancarTab({
  context,
  isPending,
  startTransition,
  notify,
}: {
  context: FinanceiroContext;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
  notify: (message: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CreateLancamentoPayload>(() => emptyLancamentoForm(context));

  const selectedCentro = context.centros.find((item) => item.id === form.centro_resultado_id);
  const categorias = context.categorias.filter((item) => item.ativo && item.tipo === form.tipo);
  const subcategorias = context.subcategorias.filter((item) => item.ativo && item.categoria_id === form.categoria_id);
  const needsCurso = selectedCentro?.nome === "Infoproduto" && form.tipo === "entrada";
  const recentByType = context.lancamentos
    .filter((row) => row.tipo === form.tipo)
    .slice()
    .sort((a, b) => b.data_pagamento.localeCompare(a.data_pagamento) || b.created_at.localeCompare(a.created_at))
    .slice(0, 15);

  function setTipo(tipo: FinTipo) {
    const nextCategoria = context.categorias.find((item) => item.ativo && item.tipo === tipo)?.id ?? "";
    setForm({
      ...form,
      tipo,
      categoria_id: nextCategoria,
      subcategoria_id: null,
      curso_id: tipo === "entrada" ? form.curso_id : null,
    });
  }

  async function submit() {
    startTransition(async () => {
      const response = await fetch("/api/financeiro/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        notify(payload.error ?? "Falha ao salvar.");
        return;
      }
      notify("Lançamento salvo com sucesso.");
      setForm(emptyLancamentoForm(context));
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-brand-teal p-3 text-white"><Plus className="h-5 w-5" /></span>
        <div>
          <h2 className="text-xl font-bold text-brand-teal">Novo lançamento</h2>
          <p className="text-sm text-brand-teal/60">Regras de banco, cartão, curso e competência são validadas no banco.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTipo("entrada")}
          className={clsx(
            "rounded-md border p-4 text-left transition",
            form.tipo === "entrada"
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-brand-sand bg-white/70 text-brand-teal hover:bg-white",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-emerald-100 p-2 text-emerald-700"><ArrowDownLeft className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black uppercase">Entrada</p>
              <p className="mt-1 text-xs font-semibold opacity-70">Recebimentos, cursos, clínica e palestras.</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTipo("saida")}
          className={clsx(
            "rounded-md border p-4 text-left transition",
            form.tipo === "saida"
              ? "border-brand-clay bg-[#FFF0F2] text-brand-clay"
              : "border-brand-sand bg-white/70 text-brand-teal hover:bg-white",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-rose-100 p-2 text-brand-clay"><ArrowUpRight className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black uppercase">Saída</p>
              <p className="mt-1 text-xs font-semibold opacity-70">Custos, despesas, impostos e cartão.</p>
            </div>
          </div>
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as FinStatus })} options={[["realizado", "Realizado"], ["previsto", "Previsto"]]} />
        <Field label="Data pagamento" type="date" value={form.data_pagamento} onChange={(value) => setForm({ ...form, data_pagamento: value, mes_competencia: form.mes_competencia || `${value.slice(0, 7)}-01` })} />
        <Field label="Mês competência" type="month" value={form.mes_competencia.slice(0, 7)} onChange={(value) => setForm({ ...form, mes_competencia: `${value}-01` })} />
        <Select label="Centro" value={form.centro_resultado_id} onChange={(value) => setForm({ ...form, centro_resultado_id: value })} options={context.centros.filter((item) => item.ativo).map((item) => [item.id, item.nome])} />
        <Select label="Categoria" value={form.categoria_id} onChange={(value) => setForm({ ...form, categoria_id: value, subcategoria_id: null })} options={categorias.map((item) => [item.id, item.nome])} />
        <Select label="Subcategoria" value={form.subcategoria_id ?? ""} onChange={(value) => setForm({ ...form, subcategoria_id: value || null })} options={[["", "Selecionar"], ...subcategorias.map((item) => [item.id, item.nome] as [string, string])]} />
        {needsCurso ? (
          <Select label="Curso" value={form.curso_id ?? ""} onChange={(value) => setForm({ ...form, curso_id: value })} options={context.cursos.filter((item) => item.ativo).map((item) => [item.id, item.nome])} />
        ) : (
          <Select label="Forma" value={form.forma_pagamento} onChange={(value) => setForm({ ...form, forma_pagamento: value as FinFormaPagamento })} options={[["conta_bancaria", "Conta"], ["cartao_credito", "Cartão"], ["pix", "PIX"], ["boleto", "Boleto"], ["dinheiro", "Dinheiro"]]} />
        )}
        {needsCurso ? (
          <Select label="Forma" value={form.forma_pagamento} onChange={(value) => setForm({ ...form, forma_pagamento: value as FinFormaPagamento })} options={[["conta_bancaria", "Conta"], ["cartao_credito", "Cartão"], ["pix", "PIX"], ["boleto", "Boleto"], ["dinheiro", "Dinheiro"]]} />
        ) : null}
        {form.forma_pagamento === "cartao_credito" ? (
          <>
            <Select label="Cartão" value={form.cartao_id ?? ""} onChange={(value) => setForm({ ...form, cartao_id: value, banco_id: null })} options={context.cartoes.filter((item) => item.ativo).map((item) => [item.id, `${item.nome} · venc. dia ${item.dia_vencimento}`])} />
            <Field label="Parcelas" type="number" min="1" value={String(form.qtd_parcelas ?? 1)} onChange={(value) => setForm({ ...form, qtd_parcelas: Number(value) || 1 })} />
          </>
        ) : (
          <Select label="Banco" value={form.banco_id ?? ""} onChange={(value) => setForm({ ...form, banco_id: value, cartao_id: null })} options={context.bancos.filter((item) => item.ativo).map((item) => [item.id, item.apelido || item.nome])} />
        )}
        <Field label="Valor" inputMode="numeric" value={formatCurrencyInput(form.valor)} onChange={(value) => setForm({ ...form, valor: parseCurrencyInput(value) })} />
        <Field label="Descrição" className="xl:col-span-2" value={form.descricao} onChange={(value) => setForm({ ...form, descricao: value })} />
        <Field label="Observação" className="xl:col-span-2" value={form.observacao ?? ""} onChange={(value) => setForm({ ...form, observacao: value })} />
      </div>
      <div className="mt-6">
        <Button onClick={submit} disabled={isPending}>{isPending ? "Salvando..." : "Salvar lançamento"}</Button>
      </div>
      <div className="mt-8 border-t border-brand-sand pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-brand-teal">
            Últimos 15 lançamentos de {form.tipo === "entrada" ? "entrada" : "saída"}
          </h3>
          <span className={clsx("rounded-full border px-3 py-1 text-xs font-black", tipoVisual(form.tipo).badge)}>
            {tipoVisual(form.tipo).label}
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          {recentByType.length ? recentByType.map((row) => {
            const visual = tipoVisual(row.tipo);
            const Icon = visual.Icon;

            return (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-brand-sand/70 bg-white/60 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", visual.iconBox)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-teal">{row.descricao}</p>
                    <p className="text-xs font-semibold text-brand-teal/55">{dateLabel(row.data_pagamento)}</p>
                  </div>
                </div>
                <p className={clsx("shrink-0 text-sm font-black", visual.text)}>{decimalMoney(signedValue(row))}</p>
              </div>
            );
          }) : (
            <p className="rounded-md border border-dashed border-brand-sand p-4 text-sm font-semibold text-brand-teal/60">
              Nenhum lançamento desse tipo encontrado ainda.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ConsultarTab({
  rows,
  context,
  period,
  setPeriod,
  centroFilter,
  setCentroFilter,
  statusFilter,
  setStatusFilter,
  query,
  setQuery,
  page,
  setPage,
  maps,
}: {
  rows: FinLancamento[];
  context: FinanceiroContext;
  period: PeriodFilter;
  setPeriod: (value: PeriodFilter) => void;
  centroFilter: string;
  setCentroFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  maps: {
    centroById: Map<string, FinCentroResultado>;
    categoriaById: Map<string, FinCategoria>;
    subcategoriaById: Map<string, FinSubcategoria>;
    bancoById: Map<string, FinBanco>;
    cartaoById: Map<string, FinCartao>;
    cursoById: Map<string, FinCurso>;
  };
}) {
  const pageCount = Math.max(Math.ceil(rows.length / FINANCEIRO_PAGE_SIZE), 1);
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = rows.slice(
    (currentPage - 1) * FINANCEIRO_PAGE_SIZE,
    currentPage * FINANCEIRO_PAGE_SIZE,
  );
  const exportRows = rows.map((row) => ({
    data: dateLabel(row.data_pagamento),
    competencia: monthLabel(row.mes_competencia),
    tipo: row.tipo,
    status: row.status,
    centro: maps.centroById.get(row.centro_resultado_id)?.nome ?? "-",
    categoria: maps.categoriaById.get(row.categoria_id)?.nome ?? "-",
    descricao: row.descricao,
    forma: row.forma_pagamento,
    valor: row.valor,
  }));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          {(["hoje", "7d", "15d", "30d", "90d", "ano", "tudo"] as PeriodFilter[]).map((item) => (
            <button key={item} type="button" onClick={() => setPeriod(item)} className={clsx("rounded-full border px-4 py-2 text-sm font-bold", period === item ? "bg-brand-clay text-white" : "border-brand-sand bg-white/70 text-brand-teal")}>
              {periodLabel(item)}
            </button>
          ))}
        </div>
        <Select compact value={centroFilter} onChange={setCentroFilter} options={[["todos", "Todos centros"], ...context.centros.map((item) => [item.id, item.nome] as [string, string])]} />
        <Select compact value={statusFilter} onChange={setStatusFilter} options={[["todos", "Todos status"], ["realizado", "Realizado"], ["previsto", "Previsto"], ["cancelado", "Cancelado"]]} />
        <label className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-teal/50" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar descrição..." className="h-11 w-full rounded-md border border-brand-sand bg-white/70 pl-9 pr-3 text-sm font-semibold text-brand-teal" />
        </label>
        <ExportButtons
          label="Lançamentos financeiros"
          filename="financeiro_lancamentos"
          rows={exportRows}
          columns={[
            { header: "Data", value: (row) => row.data },
            { header: "Competência", value: (row) => row.competencia },
            { header: "Tipo", value: (row) => row.tipo },
            { header: "Status", value: (row) => row.status },
            { header: "Centro", value: (row) => row.centro },
            { header: "Categoria", value: (row) => row.categoria },
            { header: "Descrição", value: (row) => row.descricao },
            { header: "Forma", value: (row) => row.forma },
            { header: "Valor", value: (row) => row.valor },
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[#F0D6DB] text-xs font-black uppercase text-brand-clay">
            <tr>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Centro</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3">Forma</th>
              <th className="px-5 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand/60">
            {paginatedRows.map((row) => {
              const visual = tipoVisual(row.tipo);
              const Icon = visual.Icon;

              return (
                <tr key={row.id}>
                  <td className="px-5 py-3">
                    <span className={clsx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black", visual.badge)}>
                      <Icon className="h-3.5 w-3.5" />
                      {visual.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-brand-teal/70">{dateLabel(row.data_pagamento)}</td>
                  <td className="px-5 py-3 font-bold text-brand-teal">{maps.centroById.get(row.centro_resultado_id)?.nome}</td>
                  <td className="px-5 py-3 text-brand-teal/70">{maps.categoriaById.get(row.categoria_id)?.nome}</td>
                  <td className="px-5 py-3 text-brand-teal">{row.descricao}</td>
                  <td className="px-5 py-3 text-brand-teal/70">{row.forma_pagamento}</td>
                  <td className={clsx("px-5 py-3 text-right font-black", visual.text)}>{decimalMoney(signedValue(row))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-brand-sand/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-brand-teal/60">
          {rows.length} registros · página {currentPage} de {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage(Math.max(currentPage - 1, 1))}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(Math.min(currentPage + 1, pageCount))}
          >
            Avançar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DreTab({ context }: { context: FinanceiroContext }) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5">
          <h2 className="text-xl font-bold text-brand-teal">DRE consolidado</h2>
          <FileSpreadsheet className="h-5 w-5 text-brand-clay" />
        </div>
        <DreTable rows={context.dre} />
      </Card>
      <Card className="overflow-hidden">
        <div className="p-5">
          <h2 className="text-xl font-bold text-brand-teal">DRE por curso</h2>
          <p className="mt-1 text-sm text-brand-teal/60">Infoproduto com margem de contribuição por curso.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#F0D6DB] text-xs font-black uppercase text-brand-clay">
              <tr>
                <th className="px-5 py-3">Mês</th>
                <th className="px-5 py-3">Curso</th>
                <th className="px-5 py-3 text-right">Receita</th>
                <th className="px-5 py-3 text-right">Deduções</th>
                <th className="px-5 py-3 text-right">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-sand/60">
              {context.drePorCurso.slice(0, 80).map((row) => (
                <tr key={`${row.curso_id}-${row.mes_competencia}`}>
                  <td className="px-5 py-3 font-bold text-brand-teal">{monthLabel(row.mes_competencia)}</td>
                  <td className="px-5 py-3 text-brand-teal/80">{row.curso}</td>
                  <td className="px-5 py-3 text-right font-black text-brand-teal">{money(row.receita_bruta)}</td>
                  <td className="px-5 py-3 text-right font-black text-brand-clay">{money(row.deducoes)}</td>
                  <td className="px-5 py-3 text-right font-black text-emerald-700">{money(row.margem_contribuicao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DreTable({ rows }: { rows: FinanceiroContext["dre"] }) {
  const lines: Array<[keyof (typeof rows)[number], string]> = [
    ["receita_bruta", "Receita Bruta"],
    ["deducoes", "(-) Deduções"],
    ["receita_liquida", "Receita Líquida"],
    ["custos_diretos", "(-) Custos Diretos"],
    ["lucro_bruto", "Lucro Bruto"],
    ["despesas_administrativas", "(-) Desp. Administrativas"],
    ["despesas_pessoal", "(-) Desp. Pessoal"],
    ["ebitda", "EBITDA"],
    ["depreciacao", "(-) Depreciação"],
    ["ebit", "EBIT"],
    ["resultado_financeiro", "Resultado Financeiro"],
    ["irpj_csll", "IRPJ/CSLL"],
    ["lucro_liquido", "Lucro Líquido"],
  ];
  const visibleRows = rows.slice(0, 6).reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="bg-[#F0D6DB] text-xs font-black uppercase text-brand-clay">
          <tr>
            <th className="px-5 py-3 text-left">Linha</th>
            {visibleRows.map((row) => <th key={row.mes_competencia} className="px-5 py-3 text-right">{monthLabel(row.mes_competencia)}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-sand/60">
          {lines.map(([key, label]) => (
            <tr key={key}>
              <td className="px-5 py-3 font-bold text-brand-teal">{label}</td>
              {visibleRows.map((row) => (
                <td key={`${row.mes_competencia}-${key}`} className="px-5 py-3 text-right font-black text-brand-teal">
                  {money(Number(row[key] ?? 0))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketingTab({ context }: { context: FinanceiroContext }) {
  const infoproduto = context.drePorCentro.filter((row) => row.centro_resultado === "Infoproduto");
  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <h2 className="text-xl font-bold text-brand-teal">Visão marketing</h2>
        <p className="mt-1 text-sm text-brand-teal/60">Resumo simplificado apenas do centro Infoproduto.</p>
      </div>
      <DreTable rows={infoproduto} />
    </Card>
  );
}

function cardLastFour(card: FinCartao) {
  const digits = card.nome.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "xxxx";
}

function bankBalanceLabel(bank: FinBanco, lancamentos: FinLancamento[]) {
  const saldoMovimentos = lancamentos
    .filter((row) => row.banco_id === bank.id && row.status === "realizado")
    .reduce((sum, row) => sum + signedValue(row), 0);

  return decimalMoney((bank.saldo_inicial ?? 0) + saldoMovimentos);
}

function CadastroTab({
  context,
  isPending,
  startTransition,
  notify,
}: {
  context: FinanceiroContext;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
  notify: (message: string) => void;
}) {
  const router = useRouter();
  const [bank, setBank] = useState({ nome: "", apelido: "", saldo_inicial: "0" });
  const [card, setCard] = useState({ nome: "", banco_id: context.bancos[0]?.id ?? "", dia_fechamento: "3", dia_vencimento: "10", limite: "" });
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  async function save(url: string, body: unknown, success: string, method: "POST" | "PATCH" = "POST") {
    startTransition(async () => {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) {
        notify(payload.error ?? "Falha ao salvar.");
        return;
      }
      notify(success);
      if (url.endsWith("/bancos")) {
        setEditingBankId(null);
        setBank({ nome: "", apelido: "", saldo_inicial: "0" });
      }
      if (url.endsWith("/cartoes")) {
        setEditingCardId(null);
        setCard({ nome: "", banco_id: context.bancos[0]?.id ?? "", dia_fechamento: "3", dia_vencimento: "10", limite: "" });
      }
      router.refresh();
    });
  }

  async function removeCadastro(body: { tipo_cadastro: CadastroKind; id: string }) {
    startTransition(async () => {
      const response = await fetch("/api/financeiro/cadastros", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        notify(payload.error ?? "Falha ao excluir.");
        return;
      }

      notify(
        payload.softDeleted
          ? `Cadastro inativado porque possui ${payload.relatedCount} vínculo(s).`
          : "Cadastro excluído.",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-brand-clay" />
          <h2 className="text-xl font-bold text-brand-teal">Bancos</h2>
        </div>
        <div className="mt-5 grid gap-3">
          <Field label="Nome" value={bank.nome} onChange={(value) => setBank({ ...bank, nome: value })} />
          <Field label="Apelido" value={bank.apelido} onChange={(value) => setBank({ ...bank, apelido: value })} />
          <Field label="Saldo inicial" type="number" step="0.01" value={bank.saldo_inicial} onChange={(value) => setBank({ ...bank, saldo_inicial: value })} />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isPending}
              onClick={() =>
                save(
                  "/api/financeiro/bancos",
                  {
                    id: editingBankId ?? undefined,
                    ...bank,
                    saldo_inicial: Number(bank.saldo_inicial),
                    ativo: true,
                  },
                  editingBankId ? "Banco atualizado." : "Banco cadastrado.",
                  editingBankId ? "PATCH" : "POST",
                )
              }
            >
              {editingBankId ? "Salvar banco" : "Cadastrar banco"}
            </Button>
            {editingBankId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingBankId(null);
                  setBank({ nome: "", apelido: "", saldo_inicial: "0" });
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
        <h3 className="mt-6 text-base font-bold text-brand-teal">Meus Bancos</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {context.bancos.map((item) => (
            <div key={item.id} className="relative overflow-hidden rounded-lg border border-brand-sand/70 bg-white/75 p-4 shadow-sm">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-clay/10" />
              <div className="relative flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-clay text-white shadow-sm">
                  <Banknote className="h-5 w-5" />
                </span>
                <span className={clsx("rounded-full px-2 py-1 text-[10px] font-black uppercase", item.ativo ? "bg-emerald-50 text-emerald-700" : "bg-brand-cream text-brand-teal/55")}>
                  {item.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="relative mt-5">
                <p className="text-sm font-bold text-brand-teal/65">{item.apelido ?? "Conta"}</p>
                <p className="mt-1 truncate text-lg font-black text-brand-teal">{item.nome}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-teal/45">Saldo estimado</p>
                <p className="text-2xl font-black text-brand-teal">{bankBalanceLabel(item, context.lancamentos)}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="relative mt-4 w-full"
                onClick={() => {
                  setEditingBankId(item.id);
                  setBank({
                    nome: item.nome,
                    apelido: item.apelido ?? "",
                    saldo_inicial: String(item.saldo_inicial ?? 0),
                  });
                }}
              >
                Editar banco
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-brand-clay" />
          <h2 className="text-xl font-bold text-brand-teal">Cartões</h2>
        </div>
        <div className="mt-5 grid gap-3">
          <Field label="Nome" value={card.nome} onChange={(value) => setCard({ ...card, nome: value })} />
          <Select label="Banco vinculado" value={card.banco_id} onChange={(value) => setCard({ ...card, banco_id: value })} options={context.bancos.map((item) => [item.id, item.nome])} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha dia" type="number" value={card.dia_fechamento} onChange={(value) => setCard({ ...card, dia_fechamento: value })} />
            <Field label="Vence dia" type="number" value={card.dia_vencimento} onChange={(value) => setCard({ ...card, dia_vencimento: value })} />
            <Field label="Limite" type="number" value={card.limite} onChange={(value) => setCard({ ...card, limite: value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isPending}
              onClick={() =>
                save(
                  "/api/financeiro/cartoes",
                  {
                    id: editingCardId ?? undefined,
                    ...card,
                    dia_fechamento: Number(card.dia_fechamento),
                    dia_vencimento: Number(card.dia_vencimento),
                    limite: card.limite ? Number(card.limite) : null,
                    ativo: true,
                  },
                  editingCardId ? "Cartão atualizado." : "Cartão cadastrado.",
                  editingCardId ? "PATCH" : "POST",
                )
              }
            >
              {editingCardId ? "Salvar cartão" : "Cadastrar cartão"}
            </Button>
            {editingCardId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingCardId(null);
                  setCard({ nome: "", banco_id: context.bancos[0]?.id ?? "", dia_fechamento: "3", dia_vencimento: "10", limite: "" });
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
        <h3 className="mt-6 text-base font-bold text-brand-teal">Meus Cartões</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {context.cartoes.filter((item) => item.ativo).map((item) => {
            const nextInvoice = context.faturas.find((fatura) => fatura.cartao_id === item.id);
            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-xl border border-brand-sand/70 bg-gradient-to-br from-brand-teal to-[#082D38] p-4 text-white shadow-soft"
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-sky/20" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-white/65">Cartão ativo</p>
                    <p className="mt-1 truncate text-lg font-black">{item.nome}</p>
                  </div>
                  <CreditCard className="h-6 w-6 text-brand-sky" />
                </div>

                <p className="relative mt-7 font-mono text-lg font-black tracking-[0.18em]">
                  xxxx xxxx xxxx {cardLastFour(item)}
                </p>

                <div className="relative mt-5 grid grid-cols-2 gap-3 text-xs font-semibold text-white/70">
                  <p>
                    Fecha dia
                    <span className="block text-base font-black text-white">{item.dia_fechamento}</span>
                  </p>
                  <p>
                    Vence dia
                    <span className="block text-base font-black text-white">{item.dia_vencimento}</span>
                  </p>
                </div>

                <p className="relative mt-4 rounded-md bg-white/10 px-3 py-2 text-sm font-bold text-white">
                  Próxima fatura: {nextInvoice ? `${money(nextInvoice.valor_estimado)} em ${monthLabel(nextInvoice.mes_vencimento)}` : "sem lançamentos"}
                </p>

                <Button
                  type="button"
                  variant="primary"
                  className="relative mt-4 w-full border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => {
                    setEditingCardId(item.id);
                    setCard({
                      nome: item.nome,
                      banco_id: item.banco_id,
                      dia_fechamento: String(item.dia_fechamento),
                      dia_vencimento: String(item.dia_vencimento),
                      limite: item.limite ? String(item.limite) : "",
                    });
                  }}
                >
                  Editar cartão
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-brand-clay" />
          <h2 className="text-xl font-bold text-brand-teal">Admin financeiro</h2>
        </div>
        <AdminCadastroSections
          context={context}
          isPending={isPending}
          onSave={(body, method, success) => save("/api/financeiro/cadastros", body, success, method)}
          onDelete={removeCadastro}
        />
      </Card>
    </div>
  );
}

function AdminCadastroSections({
  context,
  isPending,
  onSave,
  onDelete,
}: {
  context: FinanceiroContext;
  isPending: boolean;
  onSave: (body: Record<string, unknown>, method: "POST" | "PATCH", success: string) => void;
  onDelete: (body: { tipo_cadastro: CadastroKind; id: string }) => void;
}) {
  const [centro, setCentro] = useState({ id: "", nome: "" });
  const [curso, setCurso] = useState({ id: "", nome: "" });
  const [categoria, setCategoria] = useState({
    id: "",
    nome: "",
    tipo: "saida" as FinTipo,
    natureza_id: context.naturezas[0]?.id ?? "",
    dre_grupo: "despesas_operacionais",
  });
  const [subcategoria, setSubcategoria] = useState({
    id: "",
    nome: "",
    categoria_id: context.categorias[0]?.id ?? "",
    dre_grupo: "",
  });

  function resetCentro() {
    setCentro({ id: "", nome: "" });
  }

  function resetCurso() {
    setCurso({ id: "", nome: "" });
  }

  function resetCategoria() {
    setCategoria({
      id: "",
      nome: "",
      tipo: "saida",
      natureza_id: context.naturezas[0]?.id ?? "",
      dre_grupo: "despesas_operacionais",
    });
  }

  function resetSubcategoria() {
    setSubcategoria({
      id: "",
      nome: "",
      categoria_id: context.categorias[0]?.id ?? "",
      dre_grupo: "",
    });
  }

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <CadastroPanel
        title="Centros de resultado"
        isPending={isPending}
        isEditing={Boolean(centro.id)}
        onSave={() => {
          onSave(
            { tipo_cadastro: "centro", ...centro, ativo: true },
            centro.id ? "PATCH" : "POST",
            centro.id ? "Centro atualizado." : "Centro cadastrado.",
          );
          resetCentro();
        }}
        onCancel={resetCentro}
      >
        <Field label="Nome" value={centro.nome} onChange={(value) => setCentro({ ...centro, nome: value })} />
        <CadastroList
          items={context.centros}
          label={(item) => item.nome}
          onEdit={(item) => setCentro({ id: item.id, nome: item.nome })}
          onDelete={(item) => onDelete({ tipo_cadastro: "centro", id: item.id })}
        />
      </CadastroPanel>

      <CadastroPanel
        title="Cursos"
        isPending={isPending}
        isEditing={Boolean(curso.id)}
        onSave={() => {
          onSave(
            { tipo_cadastro: "curso", ...curso, ativo: true },
            curso.id ? "PATCH" : "POST",
            curso.id ? "Curso atualizado." : "Curso cadastrado.",
          );
          resetCurso();
        }}
        onCancel={resetCurso}
      >
        <Field label="Nome" value={curso.nome} onChange={(value) => setCurso({ ...curso, nome: value })} />
        <CadastroList
          items={context.cursos}
          label={(item) => item.nome}
          onEdit={(item) => setCurso({ id: item.id, nome: item.nome })}
          onDelete={(item) => onDelete({ tipo_cadastro: "curso", id: item.id })}
        />
      </CadastroPanel>

      <CadastroPanel
        title="Categorias"
        isPending={isPending}
        isEditing={Boolean(categoria.id)}
        onSave={() => {
          onSave(
            { tipo_cadastro: "categoria", ...categoria, ativo: true },
            categoria.id ? "PATCH" : "POST",
            categoria.id ? "Categoria atualizada." : "Categoria cadastrada.",
          );
          resetCategoria();
        }}
        onCancel={resetCategoria}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome" value={categoria.nome} onChange={(value) => setCategoria({ ...categoria, nome: value })} />
          <Select label="Tipo" value={categoria.tipo} onChange={(value) => setCategoria({ ...categoria, tipo: value as FinTipo })} options={[["entrada", "Entrada"], ["saida", "Saída"]]} />
          <Select label="Natureza" value={categoria.natureza_id} onChange={(value) => setCategoria({ ...categoria, natureza_id: value })} options={context.naturezas.map((item) => [item.id, item.nome] as [string, string])} />
          <Select label="Grupo DRE" value={categoria.dre_grupo} onChange={(value) => setCategoria({ ...categoria, dre_grupo: value })} options={dreGroupOptions} />
        </div>
        <CadastroList
          items={context.categorias}
          label={(item) => `${item.nome} - ${item.tipo}`}
          onEdit={(item) =>
            setCategoria({
              id: item.id,
              nome: item.nome,
              tipo: item.tipo,
              natureza_id: item.natureza_id,
              dre_grupo: item.dre_grupo,
            })
          }
          onDelete={(item) => onDelete({ tipo_cadastro: "categoria", id: item.id })}
        />
      </CadastroPanel>

      <CadastroPanel
        title="Subcategorias"
        isPending={isPending}
        isEditing={Boolean(subcategoria.id)}
        onSave={() => {
          onSave(
            { tipo_cadastro: "subcategoria", ...subcategoria, ativo: true },
            subcategoria.id ? "PATCH" : "POST",
            subcategoria.id ? "Subcategoria atualizada." : "Subcategoria cadastrada.",
          );
          resetSubcategoria();
        }}
        onCancel={resetSubcategoria}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome" value={subcategoria.nome} onChange={(value) => setSubcategoria({ ...subcategoria, nome: value })} />
          <Select label="Categoria" value={subcategoria.categoria_id} onChange={(value) => setSubcategoria({ ...subcategoria, categoria_id: value })} options={context.categorias.map((item) => [item.id, item.nome] as [string, string])} />
          <Select label="Grupo DRE" value={subcategoria.dre_grupo} onChange={(value) => setSubcategoria({ ...subcategoria, dre_grupo: value })} options={[["", "Herdar da categoria"], ...dreGroupOptions]} />
        </div>
        <CadastroList
          items={context.subcategorias}
          label={(item) => item.nome}
          onEdit={(item) =>
            setSubcategoria({
              id: item.id,
              nome: item.nome,
              categoria_id: item.categoria_id,
              dre_grupo: item.dre_grupo ?? "",
            })
          }
          onDelete={(item) => onDelete({ tipo_cadastro: "subcategoria", id: item.id })}
        />
      </CadastroPanel>
    </div>
  );
}

const dreGroupOptions: Array<[string, string]> = [
  ["receita_bruta", "Receita Bruta"],
  ["deducoes", "Deduções"],
  ["taxas_plataforma", "Taxas de plataforma"],
  ["coproducao", "Coprodução"],
  ["comissoes_afiliados", "Comissões de afiliados"],
  ["custos_diretos", "Custos diretos"],
  ["vendas_marketing", "Vendas e marketing"],
  ["despesas_operacionais", "Despesas operacionais"],
  ["despesas_administrativas", "Despesas administrativas"],
  ["despesas_pessoal", "Despesas pessoal"],
  ["depreciacao", "Depreciação"],
  ["resultado_financeiro", "Resultado financeiro"],
  ["irpj_csll", "IRPJ/CSLL"],
];

function CadastroPanel({
  title,
  children,
  isPending,
  isEditing,
  onSave,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  isPending: boolean;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-md border border-brand-sand/70 bg-white/50 p-4">
      <h3 className="font-bold text-brand-teal">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={isPending} onClick={onSave}>
          {isEditing ? "Salvar alterações" : "Incluir"}
        </Button>
        {isEditing ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CadastroList<T extends { id: string; ativo: boolean }>({
  items,
  label,
  onEdit,
  onDelete,
}: {
  items: T[];
  label: (item: T) => string;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  return (
    <div className="mt-4 max-h-64 space-y-2 overflow-auto">
      {items.map((item) => (
        <div key={item.id} className="grid gap-2 rounded-md border border-brand-sand/70 bg-white/60 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-bold text-brand-teal">{label(item)}</p>
            <p className="text-xs font-semibold text-brand-teal/55">{item.ativo ? "Ativo" : "Inativo"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => onEdit(item)}>
              Editar
            </Button>
            <Button type="button" variant="secondary" onClick={() => onDelete(item)}>
              Excluir
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-brand-sand/70 bg-white/50 p-4">
      <h3 className="font-bold text-brand-teal">{title}</h3>
      <div className="mt-3 max-h-52 space-y-1 overflow-auto text-sm text-brand-teal/70">
        {items.map((item) => <p key={item}>{item}</p>)}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-sm font-bold text-brand-teal">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-brand-sand bg-white/75 px-3 text-sm font-semibold text-brand-teal outline-none transition focus:border-brand-clay"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  compact = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  compact?: boolean;
}) {
  const input = (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-md border border-brand-sand bg-white/75 px-3 text-sm font-semibold text-brand-teal outline-none transition focus:border-brand-clay"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>{optionLabel}</option>
      ))}
    </select>
  );

  if (compact) return <div className="min-w-[190px]">{input}</div>;

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-brand-teal">{label}</span>
      {input}
    </label>
  );
}
