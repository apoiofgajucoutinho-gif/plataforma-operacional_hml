"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Edit3,
  FileWarning,
  Megaphone,
  Plus,
  ShieldAlert,
  Target,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import type {
  OcorrenciaCadastro,
  OcorrenciaCadastroTipo,
  OcorrenciaChamado,
  OcorrenciaImpacto,
  OcorrenciaOrigemFalha,
  OcorrenciaPlanoAcao,
  OcorrenciaPrioridade,
  OcorrenciaStatus,
  OcorrenciasContext,
} from "@/modules/ocorrencias/types";

type TabKey = "visao" | "chamados" | "incidentes" | "marketing" | "planos" | "relatorios" | "admin";
type PeriodFilter = "7d" | "30d" | "90d" | "all";
type ChamadoSortKey =
  | "data_chamado"
  | "nome_cliente"
  | "categoria"
  | "canal"
  | "erro_motivo"
  | "origem_falha"
  | "tipo_falha"
  | "prioridade"
  | "status"
  | "impacto";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "visao", label: "Visao Geral" },
  { key: "chamados", label: "Chamados" },
  { key: "incidentes", label: "Incidentes" },
  { key: "marketing", label: "Marketing" },
  { key: "planos", label: "Planos de Acao" },
  { key: "relatorios", label: "Relatorios" },
  { key: "admin", label: "Admin" },
];

const periodOptions: Array<{ key: PeriodFilter; label: string }> = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

const cadastroTipos: Array<{ key: OcorrenciaCadastroTipo; label: string }> = [
  { key: "categoria", label: "Categorias" },
  { key: "tipo_falha", label: "Tipos de falha" },
  { key: "plataforma", label: "Plataformas" },
  { key: "responsavel", label: "Responsaveis" },
  { key: "canal", label: "Canais" },
  { key: "produto", label: "Produtos" },
];

const prioridadeOptions: OcorrenciaPrioridade[] = ["baixa", "media", "alta", "urgente"];
const statusOptions: OcorrenciaStatus[] = ["aberto", "em_andamento", "resolvido", "reaberto", "cancelado", "ignorado"];
const origemOptions: OcorrenciaOrigemFalha[] = ["marketing", "operacao_interna", "plataforma_externa", "financeiro", "cliente", "indefinido"];
const impactoOptions: OcorrenciaImpacto[] = ["baixo", "medio", "alto", "critico"];

const initialChamadoForm = {
  nome_cliente: "",
  email_cliente: "",
  telefone: "",
  instagram: "",
  data_chamado: new Date().toISOString().slice(0, 10),
  canal: "Instagram",
  categoria: "Reclamacao",
  erro_motivo: "",
  plataforma_erro: "Meta Ads",
  solucao_realizada: "",
  prioridade: "alta" as OcorrenciaPrioridade,
  tempo_solucao_minutos: "",
  status: "aberto" as OcorrenciaStatus,
  avaliacao: "",
  responsavel: "Suporte",
  observacao: "",
  origem_falha: "marketing" as OcorrenciaOrigemFalha,
  responsavel_falha: "Marketing",
  tipo_falha: "Link incorreto",
  produto_curso: "",
  campanha_nome: "",
  conjunto_anuncio: "",
  criativo_nome: "",
  link_relacionado: "",
  impacto_financeiro_tipo: "custo_extra",
  impacto_financeiro_valor: "",
  impacto_financeiro_estimado: "",
  impacto_estimativa_criterio: "",
  impacto_estimativa_confianca: "media",
  valor_informado_marketing: "",
  valor_apurado_ads: "",
  impressoes_impactadas: "",
  alcance_impactado: "",
  resultados_impactados: "",
  impacto_cliente: "alto" as OcorrenciaImpacto,
  evidencia_url: "",
  recorrencia: "primeira_ocorrencia",
  acao_preventiva: "",
  cobrar_marketing: true,
  motivo_cobranca: "",
  status_cobranca: "em_analise",
};

const initialPlanoForm = {
  titulo: "",
  descricao: "",
  prioridade: "media" as OcorrenciaPrioridade,
  status: "pendente",
  responsavel: "",
  prazo: "",
};

const tabLabels: Record<TabKey, string> = {
  visao: "Visao Geral",
  chamados: "Chamados",
  incidentes: "Incidentes",
  marketing: "Marketing",
  planos: "Planos de Acao",
  relatorios: "Relatorios",
  admin: "Admin",
};

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

function dateFormat(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(`${value}T00:00:00`));
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function numberFormat(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function label(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isWhatsAppChannel(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() === "whatsapp";
}

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (!digits) return "";

  const country = digits.slice(0, 2);
  const area = digits.slice(2, 4);
  const first = digits.slice(4, 9);
  const last = digits.slice(9, 13);

  return [country, area, first, last].filter(Boolean).join(last ? "-" : " ");
}

const chamadoExportColumns = [
  { header: "Data", value: (row: OcorrenciaChamado) => dateFormat(row.data_chamado) },
  { header: "Nome", value: (row: OcorrenciaChamado) => row.nome_cliente },
  { header: "Categoria", value: (row: OcorrenciaChamado) => row.categoria },
  { header: "Canal", value: (row: OcorrenciaChamado) => row.canal },
  { header: "Contato", value: (row: OcorrenciaChamado) => isWhatsAppChannel(row.canal) ? row.telefone : row.instagram },
  { header: "Motivo", value: (row: OcorrenciaChamado) => row.erro_motivo },
  { header: "Origem", value: (row: OcorrenciaChamado) => label(row.origem_falha) },
  { header: "Falha", value: (row: OcorrenciaChamado) => row.tipo_falha },
  { header: "Prioridade", value: (row: OcorrenciaChamado) => label(row.prioridade) },
  { header: "Status", value: (row: OcorrenciaChamado) => label(row.status) },
  { header: "Impacto", value: (row: OcorrenciaChamado) => money(impactoDefensavel(row).value) },
];

function periodStart(period: PeriodFilter) {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function badgeClass(value: string) {
  if (["urgente", "critico", "alta", "aberto", "reaberto"].includes(value)) return "bg-rose-100 text-rose-700";
  if (["media", "alto", "em_andamento", "em_analise", "enviado"].includes(value)) return "bg-amber-100 text-amber-800";
  if (["resolvido", "feito", "baixo", "respondido"].includes(value)) return "bg-emerald-100 text-emerald-700";
  return "bg-brand-sand/70 text-brand-teal";
}

function getCadastro(cadastros: OcorrenciaCadastro[], tipo: OcorrenciaCadastroTipo) {
  return cadastros.filter((item) => item.tipo === tipo && item.ativo);
}

function groupCount<T>(rows: T[], keyGetter: (row: T) => string | null | undefined) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = keyGetter(row) || "Nao informado";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count);
}

function daysOpen(chamado: OcorrenciaChamado) {
  const start = new Date(`${chamado.data_chamado}T00:00:00`).getTime();
  const now = new Date().getTime();
  return Math.max(Math.floor((now - start) / (1000 * 60 * 60 * 24)), 0);
}

function financeiroDivergente(chamado: OcorrenciaChamado) {
  const informado = Number(chamado.valor_informado_marketing ?? 0);
  const apurado = Number(chamado.valor_apurado_ads ?? 0);
  return apurado - informado;
}

function impactoDefensavel(chamado: OcorrenciaChamado) {
  const real = Number(chamado.impacto_financeiro_valor ?? 0);
  if (real > 0) {
    return { value: real, kind: "real", helper: "valor real registrado" };
  }

  const apurado = Number(chamado.valor_apurado_ads ?? 0);
  if (apurado > 0) {
    return { value: apurado, kind: "apurado", helper: "valor apurado na base Ads" };
  }

  const estimado = Number(chamado.impacto_financeiro_estimado ?? 0);
  if (estimado > 0) {
    return {
      value: estimado,
      kind: "projecao",
      helper: chamado.impacto_estimativa_criterio ?? "projecao cadastrada manualmente",
    };
  }

  const informado = Number(chamado.valor_informado_marketing ?? 0);
  if (informado > 0) {
    return { value: informado, kind: "projecao", helper: "projecao baseada no valor informado pelo marketing" };
  }

  return { value: 0, kind: "nao_medido", helper: "dados reais ainda nao informados" };
}

export function OcorrenciasDashboard({ context }: { context: OcorrenciasContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("visao");
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [chamados, setChamados] = useState(context.chamados);
  const [cadastros, setCadastros] = useState(context.cadastros);
  const [planos, setPlanos] = useState(context.planos);
  const [editingChamadoId, setEditingChamadoId] = useState<string | null>(null);
  const [chamadoForm, setChamadoForm] = useState(initialChamadoForm);
  const [planoForm, setPlanoForm] = useState(initialPlanoForm);
  const [cadastroForm, setCadastroForm] = useState({ tipo: "categoria" as OcorrenciaCadastroTipo, nome: "", descricao: "" });

  const visibleTabs = context.canWrite ? tabs : tabs.filter((tab) => tab.key !== "admin");
  const filteredChamados = useMemo(() => {
    const start = periodStart(period);
    return chamados.filter((chamado) => {
      const matchesPeriod = !start || chamado.data_chamado >= start;
      const matchesStatus = statusFilter === "all" || chamado.status === statusFilter;
      const matchesOrigem = origemFilter === "all" || chamado.origem_falha === origemFilter;
      return matchesPeriod && matchesStatus && matchesOrigem;
    });
  }, [chamados, origemFilter, period, statusFilter]);

  const chamadosAbertos = filteredChamados.filter((item) => ["aberto", "em_andamento", "reaberto"].includes(item.status));
  const urgentes = chamadosAbertos.filter((item) => item.prioridade === "urgente" || item.impacto_cliente === "critico");
  const marketing = filteredChamados.filter((item) => item.origem_falha === "marketing" || item.cobrar_marketing);
  const impactoFinanceiro = filteredChamados.reduce((sum, item) => sum + impactoDefensavel(item).value, 0);
  const impactosProjetados = filteredChamados.filter((item) => impactoDefensavel(item).kind === "projecao").length;
  const valorApuradoAds = filteredChamados.reduce((sum, item) => sum + Number(item.valor_apurado_ads ?? 0), 0);
  const valorInformado = filteredChamados.reduce((sum, item) => sum + Number(item.valor_informado_marketing ?? 0), 0);
  const slaBase = filteredChamados.filter((item) => item.sla_cumprido !== null);
  const slaPct = slaBase.length ? (slaBase.filter((item) => item.sla_cumprido).length / slaBase.length) * 100 : 0;
  const avaliados = filteredChamados.filter((item) => item.avaliacao);
  const avaliacaoMedia = avaliados.length ? avaliados.reduce((sum, item) => sum + Number(item.avaliacao), 0) / avaliados.length : 0;
  const principalFalha = groupCount(filteredChamados, (item) => item.tipo_falha)[0];
  const principalPlataforma = groupCount(filteredChamados, (item) => item.plataforma_erro)[0];
  const planoSugerido =
    urgentes[0]?.acao_preventiva ||
    (principalFalha ? `Criar checklist preventivo para ${principalFalha.name.toLowerCase()} antes de publicar campanhas ou liberar ofertas.` : "Cadastrar ocorrencias para gerar recomendacoes com base real.");

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "ocorrencias",
        pagePath: "/ocorrencias",
        pageLabel: `Ocorrencias: ${tabLabels[activeTab]}`,
      }),
      keepalive: true,
    });
  }, [activeTab]);

  function resetChamadoForm() {
    setEditingChamadoId(null);
    setChamadoForm(initialChamadoForm);
  }

  function editChamado(chamado: OcorrenciaChamado) {
    setEditingChamadoId(chamado.id);
    setChamadoForm({
      nome_cliente: chamado.nome_cliente ?? "",
      email_cliente: chamado.email_cliente ?? "",
      telefone: chamado.telefone ?? "",
      instagram: chamado.instagram ?? "",
      data_chamado: chamado.data_chamado,
      canal: chamado.canal,
      categoria: chamado.categoria,
      erro_motivo: chamado.erro_motivo,
      plataforma_erro: chamado.plataforma_erro ?? "",
      solucao_realizada: chamado.solucao_realizada ?? "",
      prioridade: chamado.prioridade,
      tempo_solucao_minutos: chamado.tempo_solucao_minutos?.toString() ?? "",
      status: chamado.status,
      avaliacao: chamado.avaliacao?.toString() ?? "",
      responsavel: chamado.responsavel ?? "",
      observacao: chamado.observacao ?? "",
      origem_falha: chamado.origem_falha,
      responsavel_falha: chamado.responsavel_falha ?? "",
      tipo_falha: chamado.tipo_falha ?? "",
      produto_curso: chamado.produto_curso ?? "",
      campanha_nome: chamado.campanha_nome ?? "",
      conjunto_anuncio: chamado.conjunto_anuncio ?? "",
      criativo_nome: chamado.criativo_nome ?? "",
      link_relacionado: chamado.link_relacionado ?? "",
      impacto_financeiro_tipo: chamado.impacto_financeiro_tipo,
      impacto_financeiro_valor: chamado.impacto_financeiro_valor?.toString() ?? "",
      impacto_financeiro_estimado: chamado.impacto_financeiro_estimado?.toString() ?? "",
      impacto_estimativa_criterio: chamado.impacto_estimativa_criterio ?? "",
      impacto_estimativa_confianca: chamado.impacto_estimativa_confianca ?? "media",
      valor_informado_marketing: chamado.valor_informado_marketing?.toString() ?? "",
      valor_apurado_ads: chamado.valor_apurado_ads?.toString() ?? "",
      impressoes_impactadas: chamado.impressoes_impactadas?.toString() ?? "",
      alcance_impactado: chamado.alcance_impactado?.toString() ?? "",
      resultados_impactados: chamado.resultados_impactados?.toString() ?? "",
      impacto_cliente: chamado.impacto_cliente,
      evidencia_url: chamado.evidencia_url ?? "",
      recorrencia: chamado.recorrencia,
      acao_preventiva: chamado.acao_preventiva ?? "",
      cobrar_marketing: chamado.cobrar_marketing,
      motivo_cobranca: chamado.motivo_cobranca ?? "",
      status_cobranca: chamado.status_cobranca,
    });
    setActiveTab("chamados");
  }

  async function saveEntity(entity: string, payload: Record<string, unknown>, id?: string | null) {
    setMessage("Salvando...");
    const response = await fetch("/api/ocorrencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, action: id ? "update" : "create", id, payload }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Nao foi possivel salvar.");
      return null;
    }
    setMessage("Registro salvo.");
    return result.data;
  }

  async function deleteEntity(entity: string, id: string) {
    if (!window.confirm("Deseja excluir este registro?")) return;
    setMessage("Excluindo...");
    const response = await fetch("/api/ocorrencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, action: "delete", id }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Nao foi possivel excluir.");
      return;
    }
    setMessage("Registro excluido.");
    if (entity === "chamado") setChamados((items) => items.filter((item) => item.id !== id));
    if (entity === "plano") setPlanos((items) => items.filter((item) => item.id !== id));
    if (entity === "cadastro") setCadastros((items) => items.filter((item) => item.id !== id));
  }

  async function saveChamado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...chamadoForm,
      tempo_solucao_minutos: chamadoForm.tempo_solucao_minutos ? Number(chamadoForm.tempo_solucao_minutos) : null,
      avaliacao: chamadoForm.avaliacao ? Number(chamadoForm.avaliacao) : null,
      impacto_financeiro_valor: chamadoForm.impacto_financeiro_valor ? Number(chamadoForm.impacto_financeiro_valor) : 0,
      impacto_financeiro_estimado: chamadoForm.impacto_financeiro_estimado ? Number(chamadoForm.impacto_financeiro_estimado) : null,
      impacto_estimativa_criterio: chamadoForm.impacto_estimativa_criterio || null,
      impacto_estimativa_confianca: chamadoForm.impacto_estimativa_confianca || null,
      valor_informado_marketing: chamadoForm.valor_informado_marketing ? Number(chamadoForm.valor_informado_marketing) : null,
      valor_apurado_ads: chamadoForm.valor_apurado_ads ? Number(chamadoForm.valor_apurado_ads) : null,
      impressoes_impactadas: chamadoForm.impressoes_impactadas ? Number(chamadoForm.impressoes_impactadas) : null,
      alcance_impactado: chamadoForm.alcance_impactado ? Number(chamadoForm.alcance_impactado) : null,
      resultados_impactados: chamadoForm.resultados_impactados ? Number(chamadoForm.resultados_impactados) : null,
    };
    const saved = await saveEntity("chamado", payload, editingChamadoId);
    if (!saved) return;
    setChamados((items) => (editingChamadoId ? items.map((item) => (item.id === editingChamadoId ? saved : item)) : [saved, ...items]));
    resetChamadoForm();
  }

  async function savePlano(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await saveEntity("plano", planoForm);
    if (!saved) return;
    setPlanos((items) => [saved, ...items]);
    setPlanoForm(initialPlanoForm);
  }

  async function saveCadastro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await saveEntity("cadastro", { ...cadastroForm, ativo: true });
    if (!saved) return;
    setCadastros((items) => [...items.filter((item) => item.id !== saved.id), saved].sort((left, right) => `${left.tipo}${left.nome}`.localeCompare(`${right.tipo}${right.nome}`)));
    setCadastroForm({ tipo: "categoria", nome: "", descricao: "" });
  }

  if (context.diagnostic) {
    return (
      <section className="space-y-6">
        <Header updatedAt={context.updatedAt} />
        <Card className="p-8">
          <h2 className="text-xl font-black text-brand-teal">Ocorrencias indisponivel</h2>
          <p className="mt-3 text-brand-teal/70">{context.diagnostic}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Header updatedAt={context.updatedAt} />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-black uppercase tracking-wide text-brand-clay">Periodo</span>
        {periodOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setPeriod(option.key)}
            className={`rounded-full border px-5 py-2 text-sm font-black ${period === option.key ? "border-brand-clay bg-brand-clay text-white" : "border-brand-sand bg-white text-brand-teal"}`}
          >
            {option.label}
          </button>
        ))}
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-brand-sand bg-white px-4 py-2 text-sm font-bold text-brand-teal">
          <option value="all">Todos status</option>
          {statusOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}
        </select>
        <select value={origemFilter} onChange={(event) => setOrigemFilter(event.target.value)} className="rounded-lg border border-brand-sand bg-white px-4 py-2 text-sm font-bold text-brand-teal">
          <option value="all">Todas origens</option>
          {origemOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}
        </select>
      </Card>

      <div className="flex flex-wrap gap-3">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg border px-5 py-3 text-sm font-black ${activeTab === tab.key ? "border-brand-clay bg-brand-clay text-white shadow-soft" : "border-brand-sand bg-white/80 text-brand-teal"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? <p className="rounded-lg bg-brand-sand/50 px-4 py-3 text-sm font-bold text-brand-teal">{message}</p> : null}

      {activeTab === "visao" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<ClipboardList className="h-5 w-5" />} label="Chamados" value={filteredChamados.length} helper="no filtro" />
            <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Abertos" value={chamadosAbertos.length} helper={`${urgentes.length} urgentes`} />
            <Metric icon={<Megaphone className="h-5 w-5" />} label="Falhas marketing" value={marketing.length} helper="com cobranca ou origem marketing" />
            <Metric icon={<ShieldAlert className="h-5 w-5" />} label="Impacto financeiro" value={money(impactoFinanceiro)} helper={`${impactosProjetados} projecoes; reais sao mais confiaveis`} />
            <Metric icon={<BarChart3 className="h-5 w-5" />} label="Divergencia" value={money(valorApuradoAds - valorInformado)} helper="apurado - informado" />
            <Metric icon={<BadgeCheck className="h-5 w-5" />} label="SLA" value={`${numberFormat(slaPct)}%`} helper="cumprimento registrado" />
            <Metric icon={<FileWarning className="h-5 w-5" />} label="Falha principal" value={principalFalha?.name ?? "-"} helper={`${principalFalha?.count ?? 0} casos`} />
            <Metric icon={<Target className="h-5 w-5" />} label="Avaliacao" value={avaliacaoMedia ? avaliacaoMedia.toFixed(1).replace(".", ",") : "-"} helper="media dos clientes" />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-6">
              <h2 className="text-xl font-black text-brand-teal">Fila critica</h2>
              <p className="mt-1 text-sm text-brand-teal/70">Prioriza chamados urgentes, antigos, com impacto de cliente ou cobranca de marketing.</p>
              <div className="mt-5 space-y-3">
                {chamadosAbertos
                  .sort((left, right) => priorityScore(right) - priorityScore(left))
                  .slice(0, 5)
                  .map((chamado) => (
                    <CompactChamado key={chamado.id} chamado={chamado} onEdit={context.canWrite ? editChamado : undefined} />
                  ))}
                {!chamadosAbertos.length ? <p className="text-sm text-brand-teal/60">Nenhum chamado aberto no periodo.</p> : null}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-black text-brand-teal">Plano sugerido</h2>
              <p className="mt-3 text-brand-teal/70">{planoSugerido}</p>
              <div className="mt-5 rounded-lg border border-brand-sand bg-brand-cream/60 p-4">
                <p className="text-xs font-black uppercase text-brand-clay">Caso modelo recebido</p>
                <p className="mt-2 font-black text-brand-teal">Campanhas com links incorretos e precos antigos</p>
                <p className="mt-2 text-sm text-brand-teal/70">
                  Registrar valor informado de R$76,00, valor apurado em Ads de R$245,71, 0 resultados e risco reputacional para cobranca formal.
                </p>
              </div>
            </Card>
          </section>
        </>
      ) : null}

      {activeTab === "chamados" ? (
        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          {context.canWrite ? (
            <Card className="p-5">
              <FormTitle icon={<Plus className="h-5 w-5" />} title={editingChamadoId ? "Editar chamado" : "Novo chamado"} helper="Registre atendimento, falha, evidencia e impacto." />
              <ChamadoForm
                form={chamadoForm}
                setForm={setChamadoForm}
                cadastros={cadastros}
                onSubmit={saveChamado}
                onCancel={resetChamadoForm}
                editing={Boolean(editingChamadoId)}
              />
            </Card>
          ) : null}
          <Card className="overflow-hidden">
            <TableHeader
              title="Chamados registrados"
              count={`${filteredChamados.length} registros`}
              actions={
                <ExportButtons
                  label="Chamados registrados"
                  filename="chamados-registrados"
                  columns={chamadoExportColumns}
                  rows={filteredChamados}
                />
              }
            />
            <ChamadosTable chamados={filteredChamados} canWrite={context.canWrite} onEdit={editChamado} onDelete={(id) => deleteEntity("chamado", id)} />
          </Card>
        </section>
      ) : null}

      {activeTab === "incidentes" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <SummaryCard title="Tipos de falha" rows={groupCount(filteredChamados, (item) => item.tipo_falha)} />
          <SummaryCard title="Plataformas" rows={groupCount(filteredChamados, (item) => item.plataforma_erro)} />
          <Card className="lg:col-span-2 overflow-hidden">
            <TableHeader title="Incidentes operacionais" count={`${filteredChamados.length} casos`} />
            <IncidentesTable chamados={filteredChamados.filter((item) => item.origem_falha !== "cliente")} />
          </Card>
        </section>
      ) : null}

      {activeTab === "marketing" ? (
        <section className="space-y-5">
          <section className="grid gap-4 md:grid-cols-3">
            <Metric icon={<Megaphone className="h-5 w-5" />} label="Casos marketing" value={marketing.length} helper="origem/cobranca" />
            <Metric icon={<ShieldAlert className="h-5 w-5" />} label="Valor informado" value={money(valorInformado)} helper="relato externo" />
            <Metric icon={<BarChart3 className="h-5 w-5" />} label="Valor apurado" value={money(valorApuradoAds)} helper="Ads/sistema" />
          </section>
          <Card className="overflow-hidden">
            <TableHeader title="Cobranca de marketing" count={`${marketing.length} casos`} />
            <MarketingTable chamados={marketing} />
          </Card>
        </section>
      ) : null}

      {activeTab === "planos" ? (
        <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
          {context.canWrite ? (
            <Card className="p-5">
              <FormTitle icon={<Target className="h-5 w-5" />} title="Novo plano" helper="Acao corretiva ou preventiva." />
              <PlanoForm form={planoForm} setForm={setPlanoForm} onSubmit={savePlano} />
            </Card>
          ) : null}
          <Card className="overflow-hidden">
            <TableHeader title="Planos de acao" count={`${planos.length} planos`} />
            <PlanosTable planos={planos} canWrite={context.canWrite} onDelete={(id) => deleteEntity("plano", id)} />
          </Card>
        </section>
      ) : null}

      {activeTab === "relatorios" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <SummaryCard title="Categorias" rows={groupCount(filteredChamados, (item) => item.categoria)} />
          <SummaryCard title="Responsaveis" rows={groupCount(filteredChamados, (item) => item.responsavel)} />
          <SummaryCard title="Origem da falha" rows={groupCount(filteredChamados, (item) => item.origem_falha)} />
          <SummaryCard title="Produtos/cursos" rows={groupCount(filteredChamados, (item) => item.produto_curso)} />
        </section>
      ) : null}

      {activeTab === "admin" && context.canWrite ? (
        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card className="p-5">
            <FormTitle icon={<Plus className="h-5 w-5" />} title="Cadastro" helper="Categorias, falhas, plataformas, canais e responsaveis." />
            <form onSubmit={saveCadastro} className="mt-5 space-y-4">
              <Field label="Tipo">
                <select value={cadastroForm.tipo} onChange={(event) => setCadastroForm((form) => ({ ...form, tipo: event.target.value as OcorrenciaCadastroTipo }))} className="input">
                  {cadastroTipos.map((tipo) => <option key={tipo.key} value={tipo.key}>{tipo.label}</option>)}
                </select>
              </Field>
              <Field label="Nome">
                <input value={cadastroForm.nome} onChange={(event) => setCadastroForm((form) => ({ ...form, nome: event.target.value }))} className="input" required />
              </Field>
              <Field label="Descricao">
                <textarea value={cadastroForm.descricao} onChange={(event) => setCadastroForm((form) => ({ ...form, descricao: event.target.value }))} className="input min-h-24" />
              </Field>
              <button className="w-full rounded-lg bg-brand-teal px-4 py-3 text-sm font-black text-white">Salvar cadastro</button>
            </form>
          </Card>
          <Card className="p-5">
            <h2 className="text-xl font-black text-brand-teal">Cadastros ativos</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {cadastroTipos.map((tipo) => (
                <div key={tipo.key} className="rounded-lg border border-brand-sand bg-white/70 p-4">
                  <h3 className="font-black text-brand-teal">{tipo.label}</h3>
                  <div className="mt-3 space-y-2">
                    {getCadastro(cadastros, tipo.key).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-brand-cream/70 px-3 py-2">
                        <span className="text-sm font-bold text-brand-teal">{item.nome}</span>
                        <button type="button" onClick={() => deleteEntity("cadastro", item.id)} className="text-rose-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </section>
  );
}

function priorityScore(chamado: OcorrenciaChamado) {
  let score = 0;
  if (chamado.prioridade === "urgente") score += 80;
  if (chamado.prioridade === "alta") score += 50;
  if (chamado.impacto_cliente === "critico") score += 60;
  if (chamado.impacto_cliente === "alto") score += 35;
  if (chamado.cobrar_marketing) score += 25;
  if (chamado.origem_falha === "marketing") score += 20;
  score += Math.min(daysOpen(chamado) * 5, 40);
  return score;
}

function Header({ updatedAt }: { updatedAt: string | null }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-brand-clay">Suporte e falhas</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-brand-teal">Ocorrencias</h1>
        <p className="mt-3 max-w-3xl text-lg text-brand-teal/70">
          Registro de chamados, falhas de marketing, impacto financeiro, evidencias e planos de acao.
        </p>
      </div>
      <span className="text-sm font-bold text-brand-teal/60">Base atualizada em {dateTimeFormat(updatedAt)}</span>
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

function FormTitle({ icon, title, helper }: { icon: ReactNode; title: string; helper: string }) {
  return (
    <div className="flex gap-3">
      <span className="rounded-lg bg-brand-teal p-3 text-white">{icon}</span>
      <div>
        <h2 className="text-xl font-black text-brand-teal">{title}</h2>
        <p className="text-sm text-brand-teal/65">{helper}</p>
      </div>
    </div>
  );
}

function Field({ label: fieldLabel, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-brand-teal">{fieldLabel}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SelectFromCadastro({ value, onChange, cadastros, tipo, fallback }: { value: string; onChange: (value: string) => void; cadastros: OcorrenciaCadastro[]; tipo: OcorrenciaCadastroTipo; fallback: string[] }) {
  const rows = getCadastro(cadastros, tipo);
  const options = rows.length ? rows.map((row) => row.nome) : fallback;
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function ChamadoForm({ form, setForm, cadastros, onSubmit, onCancel, editing }: any) {
  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data"><input type="date" className="input" value={form.data_chamado} onChange={(e) => setForm((f: any) => ({ ...f, data_chamado: e.target.value }))} /></Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}>
            {statusOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Erro / motivo de contato"><textarea required className="input min-h-24" value={form.erro_motivo} onChange={(e) => setForm((f: any) => ({ ...f, erro_motivo: e.target.value }))} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria"><SelectFromCadastro value={form.categoria} onChange={(value) => setForm((f: any) => ({ ...f, categoria: value }))} cadastros={cadastros} tipo="categoria" fallback={["Duvida", "Reclamacao", "Bug", "Financeiro", "Solicitacao"]} /></Field>
        <Field label="Tipo de falha"><SelectFromCadastro value={form.tipo_falha} onChange={(value) => setForm((f: any) => ({ ...f, tipo_falha: value }))} cadastros={cadastros} tipo="tipo_falha" fallback={["Link incorreto", "Preco incorreto", "Anuncio antigo reativado"]} /></Field>
        <Field label="Origem da falha">
          <select className="input" value={form.origem_falha} onChange={(e) => setForm((f: any) => ({ ...f, origem_falha: e.target.value }))}>
            {origemOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </Field>
        <Field label="Prioridade">
          <select className="input" value={form.prioridade} onChange={(e) => setForm((f: any) => ({ ...f, prioridade: e.target.value }))}>
            {prioridadeOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </Field>
        <Field label="Canal">
          <SelectFromCadastro
            value={form.canal}
            onChange={(value) => setForm((f: any) => ({ ...f, canal: value }))}
            cadastros={cadastros}
            tipo="canal"
            fallback={["Instagram", "WhatsApp", "E-mail"]}
          />
        </Field>
        <Field label="Plataforma"><SelectFromCadastro value={form.plataforma_erro} onChange={(value) => setForm((f: any) => ({ ...f, plataforma_erro: value }))} cadastros={cadastros} tipo="plataforma" fallback={["Meta Ads", "Instagram", "Cademi", "Hotmart", "Greenn"]} /></Field>
        <Field label="Cliente"><input className="input" value={form.nome_cliente} onChange={(e) => setForm((f: any) => ({ ...f, nome_cliente: e.target.value }))} /></Field>
        {isWhatsAppChannel(form.canal) ? (
          <Field label="WhatsApp">
            <input
              inputMode="tel"
              className="input"
              value={form.telefone}
              onChange={(e) => setForm((f: any) => ({ ...f, telefone: formatWhatsApp(e.target.value) }))}
              placeholder="55 11 97400-0000"
            />
          </Field>
        ) : (
          <Field label="Instagram">
            <input
              className="input"
              value={form.instagram}
              onChange={(e) => setForm((f: any) => ({ ...f, instagram: e.target.value }))}
              placeholder="@usuario"
            />
          </Field>
        )}
        <Field label="Campanha"><input className="input" value={form.campanha_nome} onChange={(e) => setForm((f: any) => ({ ...f, campanha_nome: e.target.value }))} /></Field>
        <Field label="Produto/curso"><SelectFromCadastro value={form.produto_curso} onChange={(value) => setForm((f: any) => ({ ...f, produto_curso: value }))} cadastros={cadastros} tipo="produto" fallback={["Curso AASI", "Formacao", "Mentoria", "Clinica Aura"]} /></Field>
        <Field label="Valor informado"><input type="number" step="0.01" className="input" value={form.valor_informado_marketing} onChange={(e) => setForm((f: any) => ({ ...f, valor_informado_marketing: e.target.value }))} placeholder="76.00" /></Field>
        <Field label="Valor apurado Ads"><input type="number" step="0.01" className="input" value={form.valor_apurado_ads} onChange={(e) => setForm((f: any) => ({ ...f, valor_apurado_ads: e.target.value }))} placeholder="245.71" /></Field>
        <Field label="Impacto real"><input type="number" step="0.01" className="input" value={form.impacto_financeiro_valor} onChange={(e) => setForm((f: any) => ({ ...f, impacto_financeiro_valor: e.target.value }))} /></Field>
        <Field label="Impacto estimado"><input type="number" step="0.01" className="input" value={form.impacto_financeiro_estimado} onChange={(e) => setForm((f: any) => ({ ...f, impacto_financeiro_estimado: e.target.value }))} /></Field>
        <Field label="Impacto cliente">
          <select className="input" value={form.impacto_cliente} onChange={(e) => setForm((f: any) => ({ ...f, impacto_cliente: e.target.value }))}>
            {impactoOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </Field>
        <Field label="Confianca da estimativa">
          <select className="input" value={form.impacto_estimativa_confianca} onChange={(e) => setForm((f: any) => ({ ...f, impacto_estimativa_confianca: e.target.value }))}>
            <option value="baixa">Baixa</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </Field>
        <Field label="Impressoes"><input type="number" className="input" value={form.impressoes_impactadas} onChange={(e) => setForm((f: any) => ({ ...f, impressoes_impactadas: e.target.value }))} /></Field>
        <Field label="Alcance"><input type="number" className="input" value={form.alcance_impactado} onChange={(e) => setForm((f: any) => ({ ...f, alcance_impactado: e.target.value }))} /></Field>
      </div>
      <Field label="Criterio da estimativa">
        <textarea className="input min-h-20" value={form.impacto_estimativa_criterio} onChange={(e) => setForm((f: any) => ({ ...f, impacto_estimativa_criterio: e.target.value }))} placeholder="Ex: gasto Ads da campanha durante o periodo da falha. Dados reais/apurados devem prevalecer quando disponiveis." />
      </Field>
      <Field label="Solucao realizada"><textarea className="input min-h-20" value={form.solucao_realizada} onChange={(e) => setForm((f: any) => ({ ...f, solucao_realizada: e.target.value }))} /></Field>
      <Field label="Acao preventiva"><textarea className="input min-h-20" value={form.acao_preventiva} onChange={(e) => setForm((f: any) => ({ ...f, acao_preventiva: e.target.value }))} /></Field>
      <label className="flex items-center gap-2 text-sm font-bold text-brand-teal">
        <input type="checkbox" checked={form.cobrar_marketing} onChange={(e) => setForm((f: any) => ({ ...f, cobrar_marketing: e.target.checked }))} />
        Cobrar marketing
      </label>
      <div className="flex gap-3">
        <button className="flex-1 rounded-lg bg-brand-teal px-4 py-3 text-sm font-black text-white">{editing ? "Salvar alteracoes" : "Salvar chamado"}</button>
        {editing ? <button type="button" onClick={onCancel} className="rounded-lg border border-brand-sand px-4 py-3 text-sm font-black text-brand-teal">Cancelar</button> : null}
      </div>
    </form>
  );
}

function PlanoForm({ form, setForm, onSubmit }: any) {
  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <Field label="Titulo"><input className="input" value={form.titulo} onChange={(e) => setForm((f: any) => ({ ...f, titulo: e.target.value }))} required /></Field>
      <Field label="Descricao"><textarea className="input min-h-24" value={form.descricao} onChange={(e) => setForm((f: any) => ({ ...f, descricao: e.target.value }))} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prioridade">
          <select className="input" value={form.prioridade} onChange={(e) => setForm((f: any) => ({ ...f, prioridade: e.target.value }))}>
            {prioridadeOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </Field>
        <Field label="Prazo"><input type="date" className="input" value={form.prazo} onChange={(e) => setForm((f: any) => ({ ...f, prazo: e.target.value }))} /></Field>
      </div>
      <button className="w-full rounded-lg bg-brand-teal px-4 py-3 text-sm font-black text-white">Salvar plano</button>
    </form>
  );
}

function TableHeader({ title, count, actions }: { title: string; count: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-sand px-5 py-4">
      <h2 className="text-xl font-black text-brand-teal">{title}</h2>
      <div className="flex flex-wrap items-center gap-4">
        {actions}
        <span className="text-sm font-black text-brand-clay">{count}</span>
      </div>
    </div>
  );
}

function ChamadosTable({ chamados, canWrite, onEdit, onDelete }: { chamados: OcorrenciaChamado[]; canWrite: boolean; onEdit: (chamado: OcorrenciaChamado) => void; onDelete: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: ChamadoSortKey; direction: "asc" | "desc" }>({
    key: "data_chamado",
    direction: "desc",
  });
  const sortedChamados = useMemo(() => {
    return [...chamados].sort((left, right) => {
      const leftValue = chamadoSortValue(left, sort.key);
      const rightValue = chamadoSortValue(right, sort.key);
      const comparison =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "pt-BR", { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [chamados, sort]);

  function toggleSort(key: ChamadoSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1320px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <SortableHeader label="Data" sortKey="data_chamado" onSort={toggleSort} />
            <SortableHeader label="Nome" sortKey="nome_cliente" onSort={toggleSort} />
            <SortableHeader label="Categoria" sortKey="categoria" onSort={toggleSort} />
            <SortableHeader label="Canal" sortKey="canal" onSort={toggleSort} />
            <SortableHeader label="Motivo" sortKey="erro_motivo" onSort={toggleSort} />
            <SortableHeader label="Origem" sortKey="origem_falha" onSort={toggleSort} />
            <SortableHeader label="Falha" sortKey="tipo_falha" onSort={toggleSort} />
            <SortableHeader label="Prioridade" sortKey="prioridade" onSort={toggleSort} />
            <SortableHeader label="Status" sortKey="status" onSort={toggleSort} />
            <SortableHeader label="Impacto" sortKey="impacto" onSort={toggleSort} />
            <th className="px-4 py-3">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {sortedChamados.map((chamado) => (
            <ChamadoRow key={chamado.id} chamado={chamado} canWrite={canWrite} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChamadoRow({ chamado, canWrite, onEdit, onDelete }: { chamado: OcorrenciaChamado; canWrite: boolean; onEdit: (chamado: OcorrenciaChamado) => void; onDelete: (id: string) => void }) {
  const impacto = impactoDefensavel(chamado);
  return (
    <tr className="border-b border-brand-sand/70">
      <td className="px-4 py-3 font-bold text-brand-teal">{dateFormat(chamado.data_chamado)}</td>
      <td className="px-4 py-3 font-bold text-brand-teal">{chamado.nome_cliente ?? "-"}</td>
      <td className="px-4 py-3 text-brand-teal/75">{chamado.categoria}</td>
      <td className="px-4 py-3">
        <p className="font-bold text-brand-teal">{chamado.canal}</p>
        <p className="text-xs text-brand-teal/50">{isWhatsAppChannel(chamado.canal) ? chamado.telefone : chamado.instagram}</p>
      </td>
      <td className="max-w-[320px] truncate px-4 py-3 text-brand-teal">{chamado.erro_motivo}</td>
      <td className="px-4 py-3"><Badge value={chamado.origem_falha} /></td>
      <td className="px-4 py-3 text-brand-teal/75">{chamado.tipo_falha ?? "-"}</td>
      <td className="px-4 py-3"><Badge value={chamado.prioridade} /></td>
      <td className="px-4 py-3"><Badge value={chamado.status} /></td>
      <td className="px-4 py-3">
        <p className="font-bold text-brand-teal">{money(impacto.value)}</p>
        <p className="text-xs font-bold text-brand-teal/50">{label(impacto.kind)}</p>
      </td>
      <td className="px-4 py-3">
        {canWrite ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => onEdit(chamado)} className="rounded-lg border border-brand-sand p-2 text-brand-teal"><Edit3 className="h-4 w-4" /></button>
            <button type="button" onClick={() => onDelete(chamado.id)} className="rounded-lg border border-brand-sand p-2 text-rose-700"><Trash2 className="h-4 w-4" /></button>
          </div>
        ) : "-"}
      </td>
    </tr>
  );
}

function SortableHeader({
  label: headerLabel,
  sortKey,
  onSort,
}: {
  label: string;
  sortKey: ChamadoSortKey;
  onSort: (key: ChamadoSortKey) => void;
}) {
  return (
    <th className="px-4 py-3">
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1.5 font-black">
        {headerLabel}
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function chamadoSortValue(chamado: OcorrenciaChamado, key: ChamadoSortKey) {
  if (key === "impacto") return impactoDefensavel(chamado).value;
  return chamado[key] ?? "";
}

function IncidentesTable({ chamados }: { chamados: OcorrenciaChamado[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr><th className="px-4 py-3">Falha</th><th className="px-4 py-3">Plataforma</th><th className="px-4 py-3">Impacto cliente</th><th className="px-4 py-3">Recorrencia</th><th className="px-4 py-3">Acao preventiva</th></tr>
        </thead>
        <tbody>{chamados.map((item) => <tr key={item.id} className="border-b border-brand-sand/70"><td className="px-4 py-3 font-bold text-brand-teal">{item.tipo_falha ?? "-"}</td><td className="px-4 py-3">{item.plataforma_erro ?? "-"}</td><td className="px-4 py-3"><Badge value={item.impacto_cliente} /></td><td className="px-4 py-3">{label(item.recorrencia)}</td><td className="max-w-[420px] truncate px-4 py-3 text-brand-teal/70">{item.acao_preventiva ?? "-"}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function MarketingTable({ chamados }: { chamados: OcorrenciaChamado[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr><th className="px-4 py-3">Campanha</th><th className="px-4 py-3">Falha</th><th className="px-4 py-3">Informado</th><th className="px-4 py-3">Apurado</th><th className="px-4 py-3">Divergencia</th><th className="px-4 py-3">Impacto usado</th><th className="px-4 py-3">Impressoes</th><th className="px-4 py-3">Status cobranca</th></tr>
        </thead>
        <tbody>{chamados.map((item) => {
          const impacto = impactoDefensavel(item);
          return (
            <tr key={item.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{item.campanha_nome ?? "-"}</td>
              <td className="px-4 py-3">{item.tipo_falha ?? "-"}</td>
              <td className="px-4 py-3">{money(item.valor_informado_marketing)}</td>
              <td className="px-4 py-3">{money(item.valor_apurado_ads)}</td>
              <td className="px-4 py-3 font-black text-brand-teal">{money(financeiroDivergente(item))}</td>
              <td className="px-4 py-3">
                <p className="font-black text-brand-teal">{money(impacto.value)}</p>
                <p className="text-xs font-bold text-brand-teal/50">{label(impacto.kind)} {impacto.kind === "projecao" ? `- ${label(item.impacto_estimativa_confianca)}` : ""}</p>
              </td>
              <td className="px-4 py-3">{numberFormat(item.impressoes_impactadas)}</td>
              <td className="px-4 py-3"><Badge value={item.status_cobranca} /></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function PlanosTable({ planos, canWrite, onDelete }: { planos: OcorrenciaPlanoAcao[]; canWrite: boolean; onDelete: (id: string) => void }) {
  return (
    <div className="divide-y divide-brand-sand/70">
      {planos.map((plano) => (
        <div key={plano.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2"><Badge value={plano.prioridade} /><Badge value={plano.status} /></div>
            <h3 className="mt-2 font-black text-brand-teal">{plano.titulo}</h3>
            <p className="mt-1 text-sm text-brand-teal/70">{plano.descricao ?? "Sem descricao"}</p>
            <p className="mt-2 text-xs font-bold text-brand-teal/50">Responsavel: {plano.responsavel ?? "-"} | Prazo: {dateFormat(plano.prazo)}</p>
          </div>
          {canWrite ? <button type="button" onClick={() => onDelete(plano.id)} className="rounded-lg border border-brand-sand p-3 text-rose-700"><Trash2 className="h-4 w-4" /></button> : null}
        </div>
      ))}
    </div>
  );
}

function CompactChamado({ chamado, onEdit }: { chamado: OcorrenciaChamado; onEdit?: (chamado: OcorrenciaChamado) => void }) {
  return (
    <div className="rounded-lg border border-brand-sand bg-white/70 p-4">
      <div className="flex flex-wrap items-center gap-2"><Badge value={chamado.prioridade} /><Badge value={chamado.status} /><span className="text-xs font-bold text-brand-teal/50">{daysOpen(chamado)} dias</span></div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-brand-teal">{chamado.tipo_falha ?? chamado.categoria}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-brand-teal/70">{chamado.erro_motivo}</p>
        </div>
        {onEdit ? <button type="button" onClick={() => onEdit(chamado)} className="rounded-lg border border-brand-sand p-2 text-brand-teal"><Edit3 className="h-4 w-4" /></button> : null}
      </div>
    </div>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: Array<{ name: string; count: number }> }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-brand-teal">{title}</h2>
      <div className="mt-5 space-y-4">
        {rows.slice(0, 8).map((row) => (
          <div key={row.name}>
            <div className="flex justify-between text-sm font-black text-brand-teal"><span>{label(row.name)}</span><span>{row.count}</span></div>
            <div className="mt-2 h-2 rounded-full bg-[#F2D8DE]"><div className="h-2 rounded-full bg-brand-clay" style={{ width: `${(row.count / max) * 100}%` }} /></div>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-brand-teal/60">Sem dados no filtro.</p> : null}
      </div>
    </Card>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${badgeClass(value)}`}>{label(value)}</span>;
}
