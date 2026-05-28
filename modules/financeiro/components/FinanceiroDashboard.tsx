"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
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

const tabLabels: Record<Tab, string> = {
  inicio: "Inicio",
  diagnostico: "Diagnostico",
  lancar: "Lancar",
  consultar: "Consultar",
  dre: "DRE",
  marketing: "Marketing",
  cadastro: "Cadastro",
};

type PeriodFilter = "30d" | "90d" | "ano" | "tudo";
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
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00`))
    .replace(".", "");
}

function updatedAtLabel(value: string | null) {
  if (!value) return "Base sem atualizacao registrada";
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

function periodStart(period: PeriodFilter) {
  const now = new Date();
  const date = new Date(now);
  if (period === "30d") date.setDate(now.getDate() - 30);
  if (period === "90d") date.setDate(now.getDate() - 90);
  if (period === "ano") return `${now.getFullYear()}-01-01`;
  if (period === "tudo") return "1900-01-01";
  return date.toISOString().slice(0, 10);
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
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAdmin = context.perfil === "admin";
  const visibleTabs = useMemo(() => {
    if (context.perfil === "marketing") {
      return ["inicio", "dre", "marketing"] as Tab[];
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
    const needle = query.trim().toLowerCase();

    return context.lancamentos.filter((row) => {
      if (row.data_pagamento < start) return false;
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
    const receber = context.lancamentos
      .filter((row) => row.status === "previsto" && row.tipo === "entrada" && row.data_pagamento <= next30Iso)
      .reduce((sum, row) => sum + row.valor, 0);
    const pagar = context.lancamentos
      .filter((row) => row.status === "previsto" && row.tipo === "saida" && row.data_pagamento <= next30Iso)
      .reduce((sum, row) => sum + row.valor, 0);
    const vencendo = context.lancamentos.filter(
      (row) => row.status === "previsto" && row.tipo === "saida" && row.data_pagamento >= todayIso && row.data_pagamento <= next30Iso,
    );

    return {
      saldo,
      receber,
      pagar,
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

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4500);
  }

  if (context.diagnostic) {
    return (
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm font-bold uppercase text-brand-clay">Financeiro</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-teal">Acesso ainda nao disponivel</h1>
        <p className="mt-3 text-sm leading-6 text-brand-teal/70">{context.diagnostic}</p>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-[1480px] space-y-6">
      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-clay">Financeiro</p>
          <h1 className="mt-2 text-4xl font-semibold text-brand-teal">Gestao financeira</h1>
          <p className="mt-2 max-w-3xl text-base leading-7 text-brand-teal/70">
            Fluxo de caixa, DRE, faturas e lancamentos com base multiempresa e regras gerenciais.
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
  vencendo: FinLancamento[];
  receitaMes: number;
  ebitdaMes: number;
};

function InicioTab({ metrics, context }: { metrics: InicioMetrics; context: FinanceiroContext }) {
  const latestDre = context.dre[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Saldo realizado" value={money(metrics.saldo)} detail="Entradas menos saidas realizadas" icon={Landmark} />
        <MetricCard label="A receber 30d" value={money(metrics.receber)} detail="Lancamentos previstos" icon={BadgeDollarSign} />
        <MetricCard label="A pagar 30d" value={money(metrics.pagar)} detail="Contas e compromissos" icon={ReceiptText} />
        <MetricCard label="EBITDA mes" value={money(metrics.ebitdaMes)} detail={latestDre ? monthLabel(latestDre.mes_competencia) : "Sem DRE"} icon={LineChart} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-brand-teal">Proximos vencimentos</h2>
              <p className="mt-1 text-sm text-brand-teal/60">Alertas dos proximos 30 dias.</p>
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
          <h2 className="text-xl font-bold text-brand-teal">Proximas faturas</h2>
          <div className="mt-5 space-y-3">
            {context.faturas.slice(0, 5).map((fatura) => (
              <div key={`${fatura.cartao_id}-${fatura.mes_vencimento}`} className="rounded-md border border-brand-sand/70 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-brand-teal">{fatura.cartao_nome}</p>
                  <p className="font-black text-brand-clay">{money(fatura.valor_estimado)}</p>
                </div>
                <p className="mt-1 text-sm text-brand-teal/60">
                  {monthLabel(fatura.mes_vencimento)} · {fatura.qtd_lancamentos} lancamentos
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

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <BenchmarkCard label="Margem EBITDA" value={`${marginEbitda.toFixed(1)}%`} good={marginEbitda >= 20} warn={marginEbitda >= 10} />
      <BenchmarkCard label="% fixos / receita liquida" value={`${despesaRatio.toFixed(1)}%`} good={despesaRatio <= 35} warn={despesaRatio <= 50} />
      <BenchmarkCard label="Lucro liquido" value={money(latest?.lucro_liquido ?? 0)} good={(latest?.lucro_liquido ?? 0) > 0} warn={(latest?.lucro_liquido ?? 0) === 0} />
      <Card className="p-5 lg:col-span-3">
        <h2 className="text-xl font-bold text-brand-teal">Resultado por centro</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {context.drePorCentro.slice(0, 8).map((row) => (
            <div key={`${row.centro_resultado_id}-${row.mes_competencia}`} className="rounded-md border border-brand-sand/70 bg-white/50 p-4">
              <p className="text-sm font-bold text-brand-clay">{row.centro_resultado}</p>
              <p className="mt-2 text-2xl font-black text-brand-teal">{money(row.lucro_liquido)}</p>
              <p className="mt-1 text-xs font-semibold uppercase text-brand-teal/50">{monthLabel(row.mes_competencia)}</p>
            </div>
          ))}
        </div>
      </Card>
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
        {good ? "Saudavel" : warn ? "Atencao" : "Critico"}
      </span>
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
      notify("Lancamento salvo com sucesso.");
      setForm(emptyLancamentoForm(context));
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-brand-teal p-3 text-white"><Plus className="h-5 w-5" /></span>
        <div>
          <h2 className="text-xl font-bold text-brand-teal">Novo lancamento</h2>
          <p className="text-sm text-brand-teal/60">Regras de banco, cartao, curso e competencia sao validadas no banco.</p>
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
          <p className="text-sm font-black uppercase">Entrada</p>
          <p className="mt-1 text-xs font-semibold opacity-70">Recebimentos, cursos, clinica e palestras.</p>
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
          <p className="text-sm font-black uppercase">Saida</p>
          <p className="mt-1 text-xs font-semibold opacity-70">Custos, despesas, impostos e cartao.</p>
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as FinStatus })} options={[["realizado", "Realizado"], ["previsto", "Previsto"]]} />
        <Field label="Data pagamento" type="date" value={form.data_pagamento} onChange={(value) => setForm({ ...form, data_pagamento: value, mes_competencia: form.mes_competencia || `${value.slice(0, 7)}-01` })} />
        <Field label="Mes competencia" type="month" value={form.mes_competencia.slice(0, 7)} onChange={(value) => setForm({ ...form, mes_competencia: `${value}-01` })} />
        <Select label="Centro" value={form.centro_resultado_id} onChange={(value) => setForm({ ...form, centro_resultado_id: value })} options={context.centros.filter((item) => item.ativo).map((item) => [item.id, item.nome])} />
        <Select label="Categoria" value={form.categoria_id} onChange={(value) => setForm({ ...form, categoria_id: value, subcategoria_id: null })} options={categorias.map((item) => [item.id, item.nome])} />
        <Select label="Subcategoria" value={form.subcategoria_id ?? ""} onChange={(value) => setForm({ ...form, subcategoria_id: value || null })} options={[["", "Selecionar"], ...subcategorias.map((item) => [item.id, item.nome] as [string, string])]} />
        {needsCurso ? (
          <Select label="Curso" value={form.curso_id ?? ""} onChange={(value) => setForm({ ...form, curso_id: value })} options={context.cursos.filter((item) => item.ativo).map((item) => [item.id, item.nome])} />
        ) : (
          <Select label="Forma" value={form.forma_pagamento} onChange={(value) => setForm({ ...form, forma_pagamento: value as FinFormaPagamento })} options={[["conta_bancaria", "Conta"], ["cartao_credito", "Cartao"], ["pix", "PIX"], ["boleto", "Boleto"], ["dinheiro", "Dinheiro"]]} />
        )}
        {needsCurso ? (
          <Select label="Forma" value={form.forma_pagamento} onChange={(value) => setForm({ ...form, forma_pagamento: value as FinFormaPagamento })} options={[["conta_bancaria", "Conta"], ["cartao_credito", "Cartao"], ["pix", "PIX"], ["boleto", "Boleto"], ["dinheiro", "Dinheiro"]]} />
        ) : null}
        {form.forma_pagamento === "cartao_credito" ? (
          <>
            <Select label="Cartao" value={form.cartao_id ?? ""} onChange={(value) => setForm({ ...form, cartao_id: value, banco_id: null })} options={context.cartoes.filter((item) => item.ativo).map((item) => [item.id, `${item.nome} · venc. dia ${item.dia_vencimento}`])} />
            <Field label="Parcelas" type="number" min="1" value={String(form.qtd_parcelas ?? 1)} onChange={(value) => setForm({ ...form, qtd_parcelas: Number(value) || 1 })} />
          </>
        ) : (
          <Select label="Banco" value={form.banco_id ?? ""} onChange={(value) => setForm({ ...form, banco_id: value, cartao_id: null })} options={context.bancos.filter((item) => item.ativo).map((item) => [item.id, item.apelido || item.nome])} />
        )}
        <Field label="Valor" type="number" step="0.01" value={String(form.valor || "")} onChange={(value) => setForm({ ...form, valor: Number(value) })} />
        <Field label="Descricao" className="xl:col-span-2" value={form.descricao} onChange={(value) => setForm({ ...form, descricao: value })} />
        <Field label="Observacao" className="xl:col-span-2" value={form.observacao ?? ""} onChange={(value) => setForm({ ...form, observacao: value })} />
      </div>
      <div className="mt-6">
        <Button onClick={submit} disabled={isPending}>{isPending ? "Salvando..." : "Salvar lancamento"}</Button>
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
  maps: {
    centroById: Map<string, FinCentroResultado>;
    categoriaById: Map<string, FinCategoria>;
    subcategoriaById: Map<string, FinSubcategoria>;
    bancoById: Map<string, FinBanco>;
    cartaoById: Map<string, FinCartao>;
    cursoById: Map<string, FinCurso>;
  };
}) {
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
          {(["30d", "90d", "ano", "tudo"] as PeriodFilter[]).map((item) => (
            <button key={item} type="button" onClick={() => setPeriod(item)} className={clsx("rounded-full border px-4 py-2 text-sm font-bold", period === item ? "bg-brand-clay text-white" : "border-brand-sand bg-white/70 text-brand-teal")}>
              {item === "30d" ? "30 dias" : item === "90d" ? "90 dias" : item === "ano" ? "Ano" : "Tudo"}
            </button>
          ))}
        </div>
        <Select compact value={centroFilter} onChange={setCentroFilter} options={[["todos", "Todos centros"], ...context.centros.map((item) => [item.id, item.nome] as [string, string])]} />
        <Select compact value={statusFilter} onChange={setStatusFilter} options={[["todos", "Todos status"], ["realizado", "Realizado"], ["previsto", "Previsto"], ["cancelado", "Cancelado"]]} />
        <label className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-teal/50" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar descricao..." className="h-11 w-full rounded-md border border-brand-sand bg-white/70 pl-9 pr-3 text-sm font-semibold text-brand-teal" />
        </label>
        <ExportButtons
          label="Lancamentos financeiros"
          filename="financeiro_lancamentos"
          rows={exportRows}
          columns={[
            { header: "Data", value: (row) => row.data },
            { header: "Competencia", value: (row) => row.competencia },
            { header: "Tipo", value: (row) => row.tipo },
            { header: "Status", value: (row) => row.status },
            { header: "Centro", value: (row) => row.centro },
            { header: "Categoria", value: (row) => row.categoria },
            { header: "Descricao", value: (row) => row.descricao },
            { header: "Forma", value: (row) => row.forma },
            { header: "Valor", value: (row) => row.valor },
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[#F0D6DB] text-xs font-black uppercase text-brand-clay">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Centro</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3">Descricao</th>
              <th className="px-5 py-3">Forma</th>
              <th className="px-5 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand/60">
            {rows.slice(0, 80).map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 font-semibold text-brand-teal/70">{dateLabel(row.data_pagamento)}</td>
                <td className="px-5 py-3 font-bold text-brand-teal">{maps.centroById.get(row.centro_resultado_id)?.nome}</td>
                <td className="px-5 py-3 text-brand-teal/70">{maps.categoriaById.get(row.categoria_id)?.nome}</td>
                <td className="px-5 py-3 text-brand-teal">{row.descricao}</td>
                <td className="px-5 py-3 text-brand-teal/70">{row.forma_pagamento}</td>
                <td className={clsx("px-5 py-3 text-right font-black", row.tipo === "entrada" ? "text-emerald-700" : "text-brand-clay")}>{decimalMoney(signedValue(row))}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <p className="mt-1 text-sm text-brand-teal/60">Infoproduto com margem de contribuicao por curso.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#F0D6DB] text-xs font-black uppercase text-brand-clay">
              <tr>
                <th className="px-5 py-3">Mes</th>
                <th className="px-5 py-3">Curso</th>
                <th className="px-5 py-3 text-right">Receita</th>
                <th className="px-5 py-3 text-right">Deducoes</th>
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
    ["deducoes", "(-) Deducoes"],
    ["receita_liquida", "Receita Liquida"],
    ["custos_diretos", "(-) Custos Diretos"],
    ["lucro_bruto", "Lucro Bruto"],
    ["despesas_administrativas", "(-) Desp. Administrativas"],
    ["despesas_pessoal", "(-) Desp. Pessoal"],
    ["ebitda", "EBITDA"],
    ["depreciacao", "(-) Depreciacao"],
    ["ebit", "EBIT"],
    ["resultado_financeiro", "Resultado Financeiro"],
    ["irpj_csll", "IRPJ/CSLL"],
    ["lucro_liquido", "Lucro Liquido"],
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
        <h2 className="text-xl font-bold text-brand-teal">Visao marketing</h2>
        <p className="mt-1 text-sm text-brand-teal/60">Resumo simplificado apenas do centro Infoproduto.</p>
      </div>
      <DreTable rows={infoproduto} />
    </Card>
  );
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
          ? `Cadastro inativado porque possui ${payload.relatedCount} vinculo(s).`
          : "Cadastro excluido.",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-brand-clay" />
          <h2 className="text-xl font-bold text-brand-teal">Meus bancos</h2>
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
        <div className="mt-6 space-y-2">
          {context.bancos.map((item) => (
            <div key={item.id} className="rounded-md border border-brand-sand/70 bg-white/50 p-3">
              <p className="font-bold text-brand-teal">{item.nome}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  setEditingBankId(item.id);
                  setBank({
                    nome: item.nome,
                    apelido: item.apelido ?? "",
                    saldo_inicial: String(item.saldo_inicial ?? 0),
                  });
                }}
              >
                Editar
              </Button>
              <p className="text-sm text-brand-teal/60">{item.apelido ?? "Sem apelido"} · saldo inicial {decimalMoney(item.saldo_inicial)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-brand-clay" />
          <h2 className="text-xl font-bold text-brand-teal">Cartoes</h2>
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
                  editingCardId ? "Cartao atualizado." : "Cartao cadastrado.",
                  editingCardId ? "PATCH" : "POST",
                )
              }
            >
              {editingCardId ? "Salvar cartao" : "Cadastrar cartao"}
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
        <h3 className="mt-6 text-base font-bold text-brand-teal">Meus Cartoes</h3>
        <div className="mt-6 space-y-2">
          {context.cartoes.filter((item) => item.ativo).map((item) => {
            const nextInvoice = context.faturas.find((fatura) => fatura.cartao_id === item.id);
            return (
              <div key={item.id} className="rounded-md border border-brand-sand/70 bg-white/50 p-3">
                <p className="font-bold text-brand-teal">{item.nome}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
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
                  Editar
                </Button>
                <p className="text-sm text-brand-teal/60">Fecha dia {item.dia_fechamento} · vence dia {item.dia_vencimento}</p>
                <p className="mt-1 text-sm font-bold text-brand-clay">Proxima fatura: {nextInvoice ? `${money(nextInvoice.valor_estimado)} em ${monthLabel(nextInvoice.mes_vencimento)}` : "sem lancamentos"}</p>
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
          <Select label="Tipo" value={categoria.tipo} onChange={(value) => setCategoria({ ...categoria, tipo: value as FinTipo })} options={[["entrada", "Entrada"], ["saida", "Saida"]]} />
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
  ["deducoes", "Deducoes"],
  ["taxas_plataforma", "Taxas de plataforma"],
  ["coproducao", "Coproducao"],
  ["comissoes_afiliados", "Comissoes afiliados"],
  ["custos_diretos", "Custos diretos"],
  ["vendas_marketing", "Vendas e marketing"],
  ["despesas_operacionais", "Despesas operacionais"],
  ["despesas_administrativas", "Despesas administrativas"],
  ["despesas_pessoal", "Despesas pessoal"],
  ["depreciacao", "Depreciacao"],
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
          {isEditing ? "Salvar alteracoes" : "Incluir"}
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
