"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ComercialAluno, ComercialContext, ComercialRecebivel, ComercialVenda } from "@/modules/comercial/types";

type TabKey = "overview" | "sales" | "receivables" | "students" | "products" | "reconciliation" | "admin";
type PeriodKey = "7d" | "15d" | "30d" | "month" | "all";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Visao Geral" },
  { key: "sales", label: "Vendas" },
  { key: "receivables", label: "Recebiveis" },
  { key: "students", label: "Alunos" },
  { key: "products", label: "Produtos" },
  { key: "reconciliation", label: "Conciliacao" },
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

export function ComercialDashboard({ context }: { context: ComercialContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState<PeriodKey>("30d");

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
  const netRevenue = approvedSales.reduce((sum, sale) => sum + Number(sale.valor_liquido ?? sale.valor_bruto), 0);
  const receivableTotal = filteredReceivables
    .filter((item) => ["previsto", "disponivel"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.valor_liquido ?? item.valor_bruto), 0);
  const unclassifiedSales = context.vendas.filter((sale) => !sale.produto_id).length;
  const expiringStudents = context.alunos.filter((student) => {
    if (!student.acesso_expira_em) return false;
    const expiry = new Date(`${student.acesso_expira_em}T00:00:00`);
    const now = new Date();
    const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
    return expiry >= now && expiry <= limit;
  }).length;

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
            <Metric icon={<CheckCircle2 />} label="Liquido estimado" value={formatMoney(netRevenue)} helper="quando informado pela origem" />
            <Metric icon={<CalendarClock />} label="A receber" value={formatMoney(receivableTotal)} helper={`no filtro ${periods.find((item) => item.key === period)?.label}`} />
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-brand-teal">Recebiveis por periodo</h2>
                <p className="text-sm text-brand-teal/60">Mostra o que deve cair em conta. Quando a Hotmart nao trouxer previsao real, o item fica marcado como projetado.</p>
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

      {activeTab === "sales" ? <DataCard title="Vendas Hotmart" helper="Historico importado e normalizado pelo n8n."><SalesTable rows={context.vendas} /></DataCard> : null}
      {activeTab === "receivables" ? (
        <DataCard title="Recebiveis" helper="Previsao 7, 15, 30 dias, mes ou tudo.">
          <div className="mb-4"><PeriodFilter period={period} setPeriod={setPeriod} /></div>
          <ReceivablesTable rows={filteredReceivables} />
        </DataCard>
      ) : null}
      {activeTab === "students" ? <DataCard title="Alunos" helper="Base comercial inicial. Ultimo acesso/progresso dependem da integracao Hotmart Club ou Cademi."><StudentsTable rows={context.alunos} /></DataCard> : null}
      {activeTab === "products" ? (
        <DataCard title="Produtos" helper="Mapeamento Hotmart para curso, centro de resultado e dias de acesso.">
          <div className="grid gap-3">
            {context.produtos.map((item) => (
              <div key={item.id} className="rounded-md border border-brand-sand bg-white/70 p-4">
                <p className="font-black text-brand-teal">{item.nome}</p>
                <p className="mt-1 text-sm text-brand-teal/60">
                  Hotmart ID: {item.hotmart_product_id ?? "-"} | Acesso: {item.dias_acesso ? `${item.dias_acesso} dias` : "nao definido"}
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

function SalesTable({ rows }: { rows: ComercialVenda[] }) {
  return (
    <div className="overflow-x-auto">
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
              <td className="px-4 py-3 text-right text-brand-teal/75">{formatMoney(row.valor_liquido ?? row.valor_bruto)}</td>
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

function StudentsTable({ rows }: { rows: ComercialAluno[] }) {
  return (
    <div className="overflow-x-auto">
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
