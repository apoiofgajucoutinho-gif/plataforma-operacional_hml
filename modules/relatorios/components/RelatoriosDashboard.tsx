"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  History,
  Loader2,
  Mail,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Smartphone,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  RelatorioAgendamento,
  RelatorioCanal,
  RelatorioDestinatario,
  RelatorioEnvio,
  RelatorioFiltros,
  RelatorioFrequencia,
  RelatorioNivelDetalhe,
  RelatorioPeriodo,
  RelatoriosContext,
  RelatorioTipoResumo,
} from "@/modules/relatorios/types";

type TabKey = "overview" | "schedules" | "compose" | "history" | "destinations";
type StepKey = "content" | "filters" | "recipient" | "when" | "preview";

type DraftSchedule = {
  destinatario_id: string;
  nome: string;
  descricao: string;
  tipo_resumo: RelatorioTipoResumo;
  canal: RelatorioCanal;
  frequencia: RelatorioFrequencia;
  horario: string;
  incluir_modulos: string[];
  filtros: RelatorioFiltros;
  ativo: boolean;
};

type RecipientDraft = {
  nome: string;
  descricao: string;
  perfil_alvo: string;
  tipo_destino: string;
  canal_preferencial: RelatorioCanal;
  email: string;
  telegram_chat_id: string;
  whatsapp: string;
  observacao: string;
  ativo: boolean;
};

const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: "overview", label: "Visao Geral", icon: <Bell className="h-4 w-4" /> },
  { key: "schedules", label: "Agendamentos", icon: <CalendarClock className="h-4 w-4" /> },
  { key: "compose", label: "Novo envio", icon: <Send className="h-4 w-4" /> },
  { key: "history", label: "Historico", icon: <History className="h-4 w-4" /> },
  { key: "destinations", label: "Destinos", icon: <UserRound className="h-4 w-4" /> },
];

const steps: Array<{ key: StepKey; label: string }> = [
  { key: "content", label: "1. O que enviar" },
  { key: "filters", label: "2. Filtros" },
  { key: "recipient", label: "3. Para quem" },
  { key: "when", label: "4. Quando" },
  { key: "preview", label: "5. Pre-visualizacao" },
];

const tipoLabels: Record<string, string> = {
  resumo_executivo: "Resumo executivo",
  resumo_suporte: "Resumo suporte",
  alerta_tecnico: "Alerta tecnico",
  agenda: "Agenda",
  ocorrencias: "Ocorrencias",
  financeiro: "Financeiro",
  lembrete_agendamento: "Lembrete de agenda",
  marketing: "Marketing",
  comercial: "Comercial",
  presence: "Saude digital",
  aluno_360: "Aluno 360",
  personalizado: "Personalizado",
};

const canalLabels: Record<string, string> = {
  telegram: "Telegram",
  email: "E-mail futuro",
  whatsapp: "WhatsApp futuro",
  pdf: "PDF futuro",
};

const frequenciaLabels: Record<string, string> = {
  sob_demanda: "Sob demanda",
  unico: "Envio unico",
  diario: "Diario",
  dias_uteis: "Dias uteis",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  fechamento_mes: "Fechamento de mes",
  imediato: "Imediato",
};

const periodLabels: Record<string, string> = {
  hoje: "Hoje",
  amanha: "Amanha",
  proximos_2d: "Proximos 2 dias",
  proximos_7d: "Proximos 7 dias",
  proximos_15d: "Proximos 15 dias",
  mes_atual: "Mes atual",
  mes_anterior: "Mes anterior",
  ultimos_7d: "Ultimos 7 dias",
  ultimos_30d: "Ultimos 30 dias",
  ultimos_90d: "Ultimos 90 dias",
  ano_atual: "Ano atual",
  pendentes: "Pendentes",
};

const blockOptions: Array<{ key: string; label: string; helper: string; icon: ReactNode; defaultPeriod: RelatorioPeriodo }> = [
  { key: "agenda", label: "Agenda", helper: "Hoje, amanha e proximos dias", icon: <CalendarClock className="h-4 w-4" />, defaultPeriod: "hoje" },
  { key: "decisoes", label: "Precisa de voce", helper: "Decisoes e atividades que pedem acao", icon: <Bell className="h-4 w-4" />, defaultPeriod: "pendentes" },
  { key: "presence", label: "Saude digital", helper: "Sites, landing pages e links monitorados", icon: <CheckCircle2 className="h-4 w-4" />, defaultPeriod: "hoje" },
  { key: "marketing_instagram", label: "Instagram", helper: "Seguidores, alcance, interacoes e destaques", icon: <FileText className="h-4 w-4" />, defaultPeriod: "ultimos_30d" },
  { key: "marketing_ads", label: "Ads", helper: "Investimento, alcance e campanhas", icon: <Send className="h-4 w-4" />, defaultPeriod: "ultimos_30d" },
  { key: "comercial", label: "Comercial", helper: "Vendas confirmadas e receita validada", icon: <FileText className="h-4 w-4" />, defaultPeriod: "ultimos_30d" },
  { key: "interacoes", label: "Interacoes", helper: "Comentarios, directs e suporte", icon: <UserRound className="h-4 w-4" />, defaultPeriod: "ultimos_30d" },
  { key: "aluno_360", label: "Aluno 360", helper: "Aluno especifico ou lista selecionada", icon: <UserRound className="h-4 w-4" />, defaultPeriod: "ultimos_30d" },
  { key: "recomendacoes", label: "Recomendacao Norwyn", helper: "Leitura executiva curta", icon: <Bell className="h-4 w-4" />, defaultPeriod: "hoje" },
];

const defaultFilters: RelatorioFiltros = {
  template_key: "daily_ju",
  nivel_detalhe: "normal",
  enviar_apenas_com_alerta: false,
  antecedencia_minutos: 60,
  include_recommendation: true,
  customer_ids: [],
  blocos: {
    agenda: { enabled: true, periodo: "hoje", empty_behavior: "show_empty" },
    decisoes: { enabled: true, periodo: "pendentes", empty_behavior: "omit" },
    presence: { enabled: true, periodo: "hoje", empty_behavior: "show_empty" },
    marketing_instagram: { enabled: true, periodo: "ultimos_30d", empty_behavior: "omit" },
    marketing_ads: { enabled: false, periodo: "ultimos_30d", empty_behavior: "omit" },
    comercial: { enabled: true, periodo: "ultimos_30d", empty_behavior: "omit" },
    interacoes: { enabled: true, periodo: "ultimos_30d", empty_behavior: "omit" },
    aluno_360: { enabled: false, periodo: "ultimos_30d", empty_behavior: "omit" },
    recomendacoes: { enabled: true, periodo: "hoje", empty_behavior: "omit" },
  },
};

const initialSchedule: DraftSchedule = {
  destinatario_id: "",
  nome: "Daily da Norwyn",
  descricao: "Resumo executivo para acompanhamento da operacao.",
  tipo_resumo: "resumo_executivo",
  canal: "telegram",
  frequencia: "diario",
  horario: "08:15",
  incluir_modulos: ["agenda", "presence", "marketing_instagram", "comercial", "interacoes", "recomendacoes"],
  filtros: defaultFilters,
  ativo: true,
};

const initialRecipient: RecipientDraft = {
  nome: "",
  descricao: "",
  perfil_alvo: "operacional",
  tipo_destino: "grupo",
  canal_preferencial: "telegram",
  email: "",
  telegram_chat_id: "",
  whatsapp: "",
  observacao: "",
  ativo: true,
};


export function RelatoriosDashboard({ context }: { context: RelatoriosContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [activeStep, setActiveStep] = useState<StepKey>("content");
  const [destinatarios, setDestinatarios] = useState(context.destinatarios);
  const [agendamentos, setAgendamentos] = useState(context.agendamentos);
  const [envios, setEnvios] = useState(context.envios);
  const [scheduleForm, setScheduleForm] = useState<DraftSchedule>(initialSchedule);
  const [recipientForm, setRecipientForm] = useState<RecipientDraft>(initialRecipient);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
  const [selectedEnvio, setSelectedEnvio] = useState<RelatorioEnvio | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(context.enviosTotal);
  const [historyFilters, setHistoryFilters] = useState({ q: "", status: "", origin: "", channel: "", from: "", to: "" });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [apiPreview, setApiPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canWrite = context.canWrite;
  const activeSchedules = agendamentos.filter(scheduleActive);
  const sentToday = envios.filter((envio) => envio.created_at?.slice(0, 10) === todayKey() && envio.status === "enviado").length;
  const errors = envios.filter((envio) => envio.status === "erro");
  const activeRecipients = destinatarios.filter((item) => item.ativo !== false);
  const nextSchedule = activeSchedules
    .slice()
    .sort((a, b) => String(a.horario ?? "99:99").localeCompare(String(b.horario ?? "99:99")))[0];
  const selectedBlocks = Object.entries(scheduleForm.filtros.blocos ?? {}).filter(([, config]) => config?.enabled).map(([key]) => key);
  const localPreview = buildPreview(scheduleForm, destinatarios);
  const previewText = apiPreview ?? localPreview;

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: "relatorios", pagePath: "/relatorios", pageLabel: `Relatorios: ${activeTab}` }),
      keepalive: true,
    });
  }, [activeTab]);

  function mergedFilters() {
    return {
      ...defaultFilters,
      ...(scheduleForm.filtros ?? {}),
      blocos: { ...defaultFilters.blocos, ...(scheduleForm.filtros?.blocos ?? {}) },
    } satisfies RelatorioFiltros;
  }

  function setBlock(key: string, patch: Partial<{ enabled: boolean; periodo: RelatorioPeriodo; empty_behavior: "omit" | "show_empty" }>) {
    setScheduleForm((current) => {
      const currentFilters = { ...defaultFilters, ...(current.filtros ?? {}), blocos: { ...defaultFilters.blocos, ...(current.filtros?.blocos ?? {}) } };
      const currentBlock = currentFilters.blocos?.[key] ?? { enabled: false, periodo: blockOptions.find((item) => item.key === key)?.defaultPeriod ?? "hoje" };
      const blocos = { ...(currentFilters.blocos ?? {}), [key]: { ...currentBlock, ...patch } };
      const incluir_modulos = Object.entries(blocos).filter(([, config]) => config?.enabled).map(([blockKey]) => blockKey);
      return { ...current, incluir_modulos, filtros: { ...currentFilters, blocos } };
    });
  }

  function setFilterPatch(patch: Partial<RelatorioFiltros>) {
    setScheduleForm((current) => ({ ...current, filtros: { ...mergedFilters(), ...patch } }));
  }

  function payloadForSchedule(overrides: Partial<DraftSchedule> = {}) {
    const draft = { ...scheduleForm, ...overrides };
    const filters = { ...defaultFilters, ...(draft.filtros ?? {}), blocos: { ...defaultFilters.blocos, ...(draft.filtros?.blocos ?? {}) } };
    const incluirModulos = Object.entries(filters.blocos ?? {}).filter(([, config]) => config?.enabled).map(([key]) => key);
    return {
      destinatario_id: draft.destinatario_id,
      nome: draft.nome || "Relatorio sem nome",
      tipo_resumo: draft.tipo_resumo,
      canal: "telegram",
      frequencia: draft.frequencia,
      horario: draft.horario || null,
      timezone: "America/Sao_Paulo",
      incluir_modulos: incluirModulos,
      filtros: filters,
      ativo: draft.ativo,
    };
  }

  async function saveEntity(entity: "destinatario" | "agendamento", payload: Record<string, unknown>, id?: string | null) {
    setMessage("Salvando...");
    const response = await fetch("/api/relatorios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, action: id ? "update" : "create", id, payload }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Nao foi possivel salvar."); return null; }
    setMessage("Registro salvo.");
    return result.data;
  }

  async function saveSchedule(event?: FormEvent<HTMLFormElement>, options: { stay?: boolean; sendAfter?: boolean } = {}) {
    event?.preventDefault();
    if (!scheduleForm.destinatario_id) { setMessage("Escolha um destino antes de salvar."); return null; }
    const payload = payloadForSchedule();
    const saved = await saveEntity("agendamento", payload, editingScheduleId);
    if (!saved) return null;
    setAgendamentos((items) => (editingScheduleId ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items]));
    if (!options.stay) { setScheduleForm(initialSchedule); setEditingScheduleId(null); setActiveTab("schedules"); }
    if (options.sendAfter) await sendNow(saved.id);
    return saved as RelatorioAgendamento;
  }

  async function saveRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      nome: recipientForm.nome,
      perfil_alvo: recipientForm.perfil_alvo,
      canal_preferencial: recipientForm.canal_preferencial,
      email: recipientForm.email || null,
      telegram_chat_id: recipientForm.telegram_chat_id || null,
      whatsapp: recipientForm.whatsapp || null,
      ativo: recipientForm.ativo,
    };
    const saved = await saveEntity("destinatario", payload, editingRecipientId);
    if (!saved) return;
    setDestinatarios((items) => (editingRecipientId ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items]).sort((a, b) => a.nome.localeCompare(b.nome)));
    setRecipientForm(initialRecipient);
    setEditingRecipientId(null);
  }

  async function deleteEntity(entity: "destinatario" | "agendamento", id: string) {
    if (!window.confirm("Deseja excluir este registro?")) return;
    setMessage("Excluindo...");
    const response = await fetch("/api/relatorios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, action: "delete", id }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Nao foi possivel excluir."); return; }
    if (entity === "destinatario") setDestinatarios((items) => items.filter((item) => item.id !== id));
    else setAgendamentos((items) => items.filter((item) => item.id !== id));
    setMessage("Registro excluido.");
  }

  async function sendNow(scheduleId: string) {
    setSendingId(scheduleId);
    setMessage("Enviando no Telegram...");
    const response = await fetch("/api/relatorios/send-now", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleId }) });
    const result = await response.json();
    setSendingId(null);
    if (!response.ok) { setMessage(result.error ?? "Nao foi possivel enviar agora."); return; }
    if (result.data) setEnvios((items) => [result.data, ...items]);
    setMessage("Relatorio enviado no Telegram.");
  }

  async function previewSchedule(scheduleId?: string) {
    const id = scheduleId ?? editingScheduleId;
    if (!id) { setApiPreview(null); setActiveStep("preview"); return; }
    setPreviewingId(id);
    const response = await fetch("/api/relatorios/send-now", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleId: id, previewOnly: true }) });
    const result = await response.json();
    setPreviewingId(null);
    if (!response.ok) { setMessage(result.error ?? "Nao foi possivel gerar preview real."); return; }
    setApiPreview(result.preview?.text ?? null);
    setActiveStep("preview");
  }

  async function loadHistory(page = historyPage) {
    setLoadingHistory(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    Object.entries(historyFilters).forEach(([key, value]) => { if (value) params.set(key === "origin" ? "origin" : key, value); });
    const response = await fetch(`/api/relatorios/history?${params.toString()}`);
    const result = await response.json();
    setLoadingHistory(false);
    if (!response.ok) { setMessage(result.error ?? "Nao foi possivel carregar historico."); return; }
    setEnvios(result.data ?? []);
    setHistoryTotal(result.total ?? 0);
    setHistoryPage(result.page ?? page);
  }

  function editSchedule(item: RelatorioAgendamento) {
    const filters = { ...defaultFilters, ...(item.filtros ?? {}), blocos: { ...defaultFilters.blocos, ...(item.filtros?.blocos ?? {}) } };
    setScheduleForm({ destinatario_id: item.destinatario_id, nome: item.nome, descricao: item.descricao ?? "", tipo_resumo: item.tipo_resumo, canal: item.canal, frequencia: item.frequencia, horario: item.horario?.slice(0, 5) ?? "", incluir_modulos: item.incluir_modulos ?? [], filtros: filters, ativo: item.ativo !== false });
    setEditingScheduleId(item.id);
    setApiPreview(null);
    setActiveTab("compose");
    setActiveStep("content");
  }

  function duplicateSchedule(item: RelatorioAgendamento) {
    const filters = { ...defaultFilters, ...(item.filtros ?? {}), blocos: { ...defaultFilters.blocos, ...(item.filtros?.blocos ?? {}) } };
    setScheduleForm({ destinatario_id: item.destinatario_id, nome: `${item.nome} (copia)`, descricao: item.descricao ?? "", tipo_resumo: item.tipo_resumo, canal: item.canal, frequencia: item.frequencia, horario: item.horario?.slice(0, 5) ?? "", incluir_modulos: item.incluir_modulos ?? [], filtros: filters, ativo: false });
    setEditingScheduleId(null);
    setApiPreview(null);
    setActiveTab("compose");
    setActiveStep("content");
  }

  async function toggleSchedule(item: RelatorioAgendamento) {
    const payload = { ativo: !scheduleActive(item) };
    const saved = await saveEntity("agendamento", payload, item.id);
    if (!saved) return;
    setAgendamentos((items) => items.map((schedule) => (schedule.id === item.id ? { ...schedule, ...saved } : schedule)));
  }

  function editRecipient(item: RelatorioDestinatario) {
    setRecipientForm({ nome: item.nome, descricao: item.descricao ?? "", perfil_alvo: item.perfil_alvo, tipo_destino: item.tipo_destino ?? "grupo", canal_preferencial: item.canal_preferencial, email: item.email ?? "", telegram_chat_id: item.telegram_chat_id ?? "", whatsapp: item.whatsapp ?? "", observacao: item.observacao ?? "", ativo: item.ativo !== false });
    setEditingRecipientId(item.id);
    setActiveTab("destinations");
  }

  if (context.diagnostic) {
    return <section className="space-y-7"><Header updatedAt={context.updatedAt} /><Card className="p-8"><h2 className="text-xl font-black text-brand-teal">Relatorios indisponivel</h2><p className="mt-3 text-brand-teal/70">{context.diagnostic}</p></Card></section>;
  }

  return (
    <section className="space-y-7">
      <Header updatedAt={context.updatedAt} />
      <div className="flex flex-wrap gap-2 rounded-[22px] border border-brand-sand/80 bg-white p-2.5 shadow-soft">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center gap-2 rounded-[18px] px-5 py-3 text-[15px] font-black transition ${activeTab === tab.key ? "bg-brand-teal text-white shadow-sm" : "text-brand-teal hover:bg-brand-cream"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      {message ? <p className="rounded-md bg-brand-cream px-4 py-3 text-sm font-bold text-brand-teal">{message}</p> : null}

      {activeTab === "overview" ? (
        <OverviewTab activeSchedules={activeSchedules.length} sentToday={sentToday} nextSchedule={nextSchedule} errors={errors} activeRecipients={activeRecipients.length} agendamentos={agendamentos} envios={envios} destinatarios={destinatarios} onCreate={() => { setActiveTab("compose"); setActiveStep("content"); }} onOpenHistory={(envio) => { setSelectedEnvio(envio); setActiveTab("history"); }} />
      ) : null}

      {activeTab === "schedules" ? (
        <SchedulesTab agendamentos={agendamentos} destinatarios={destinatarios} sendingId={sendingId} canWrite={canWrite} onCreate={() => { setScheduleForm(initialSchedule); setEditingScheduleId(null); setActiveTab("compose"); }} onEdit={editSchedule} onDuplicate={duplicateSchedule} onToggle={toggleSchedule} onSendNow={sendNow} onDelete={(id) => deleteEntity("agendamento", id)} />
      ) : null}

      {activeTab === "compose" ? (
        <ComposeTab activeStep={activeStep} setActiveStep={setActiveStep} scheduleForm={scheduleForm} setScheduleForm={setScheduleForm} destinatarios={destinatarios} selectedBlocks={selectedBlocks} setBlock={setBlock} setFilterPatch={setFilterPatch} mergedFilters={mergedFilters} previewText={previewText} apiPreview={apiPreview} canWrite={canWrite} editingScheduleId={editingScheduleId} previewingId={previewingId} sendingId={sendingId} onPreview={() => previewSchedule()} onSave={saveSchedule} onSendAfterSave={() => saveSchedule(undefined, { sendAfter: true })} onCancel={() => { setEditingScheduleId(null); setScheduleForm(initialSchedule); setApiPreview(null); }} />
      ) : null}

      {activeTab === "history" ? (
        <HistoryTab envios={envios} total={historyTotal} page={historyPage} filters={historyFilters} setFilters={setHistoryFilters} loading={loadingHistory} destinatarios={destinatarios} selectedEnvio={selectedEnvio} setSelectedEnvio={setSelectedEnvio} onLoad={() => loadHistory(1)} onPage={(page) => loadHistory(page)} />
      ) : null}

      {activeTab === "destinations" ? (
        <DestinationsTab destinatarios={destinatarios} recipientForm={recipientForm} setRecipientForm={setRecipientForm} editingRecipientId={editingRecipientId} canWrite={canWrite} onSubmit={saveRecipient} onEdit={editRecipient} onDelete={(id) => deleteEntity("destinatario", id)} onCancel={() => { setEditingRecipientId(null); setRecipientForm(initialRecipient); }} />
      ) : null}
    </section>
  );
}

function Header({ updatedAt }: { updatedAt: string | null }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-caramel">Norwyn</p>
        <h1 className="mt-1 text-4xl font-black leading-none text-brand-teal md:text-5xl">Relatorios</h1>
        <p className="mt-2 max-w-2xl text-base font-semibold text-brand-teal/70">Agende, envie e acompanhe relatorios executivos pelo Telegram.</p>
      </div>
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-sand bg-white px-4 py-2 text-sm font-bold text-brand-teal shadow-sm">
        <Clock className="h-4 w-4 text-brand-sky" />
        Atualizado em {dateTime(updatedAt)}
      </div>
    </div>
  );
}

function OverviewTab({ activeSchedules, sentToday, nextSchedule, errors, activeRecipients, agendamentos, envios, destinatarios, onCreate, onOpenHistory }: { activeSchedules: number; sentToday: number; nextSchedule: RelatorioAgendamento | undefined; errors: RelatorioEnvio[]; activeRecipients: number; agendamentos: RelatorioAgendamento[]; envios: RelatorioEnvio[]; destinatarios: RelatorioDestinatario[]; onCreate: () => void; onOpenHistory: (envio: RelatorioEnvio) => void; }) {
  const upcoming = agendamentos.filter(scheduleActive).slice(0, 4);
  const latest = envios.slice(0, 5);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<CalendarClock className="h-5 w-5" />} label="Agendamentos ativos" value={String(activeSchedules)} helper="Recorrentes e prontos" tone="green" />
        <MetricCard icon={<Send className="h-5 w-5" />} label="Envios hoje" value={String(sentToday)} helper={todayIso()} tone="blue" />
        <MetricCard icon={<Clock className="h-5 w-5" />} label="Proximo envio" value={nextSchedule?.horario?.slice(0, 5) ?? "-"} helper={nextSchedule?.nome ?? "Nada programado"} tone="amber" />
        <MetricCard icon={<XCircle className="h-5 w-5" />} label="Falhas recentes" value={String(errors.length)} helper="Ultimos registros" tone={errors.length ? "red" : "green"} />
        <MetricCard icon={<UserRound className="h-5 w-5" />} label="Destinos ativos" value={String(activeRecipients)} helper="Telegram primeiro" tone="purple" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle icon={<CalendarClock className="h-4 w-4" />} title="Proximos agendamentos" subtitle="O que deve sair nos proximos ciclos." />
            <ActionButton onClick={onCreate} icon={<Plus className="h-4 w-4" />} label="Criar relatorio" primary />
          </div>
          <div className="mt-4 grid gap-3">
            {upcoming.length ? upcoming.map((item) => (
              <div key={item.id} className="rounded-[20px] border border-brand-sand/80 bg-brand-cream/45 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-brand-teal">{item.nome}</p>
                    <p className="mt-1 text-xs font-semibold text-brand-teal/60">{frequenciaLabels[item.frequencia] ?? item.frequencia} · {item.horario?.slice(0, 5) ?? "sem horario"} · {recipientName(item.destinatario_id, destinatarios)}</p>
                  </div>
                  <Pill tone="green">Ativo</Pill>
                </div>
                <p className="mt-3 text-xs font-bold text-brand-teal/65">{(item.incluir_modulos ?? []).map(blockLabel).join(" · ") || "Blocos nao definidos"}</p>
              </div>
            )) : <EmptyState text="Nenhum agendamento ativo no momento." />}
          </div>
        </Card>
        <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
          <SectionTitle icon={<History className="h-4 w-4" />} title="Ultimos envios" subtitle="Historico recente, manual e agendado." />
          <div className="mt-4 grid gap-3">
            {latest.length ? latest.map((envio) => (
              <button key={envio.id} type="button" onClick={() => onOpenHistory(envio)} className="rounded-[20px] border border-brand-sand/80 bg-white p-5 text-left shadow-sm transition hover:border-brand-sky hover:bg-brand-cream/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-brand-teal">{envio.assunto ?? tipoLabels[envio.tipo_resumo] ?? envio.tipo_resumo}</p>
                    <p className="mt-1 text-xs font-semibold text-brand-teal/60">{dateTime(envio.created_at)} · {envio.origem}</p>
                  </div>
                  <Pill tone={envio.status === "erro" ? "red" : envio.status === "enviado" ? "green" : "blue"}>{envio.status}</Pill>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-brand-teal/70">{envio.resumo ?? envio.destino ?? "Sem resumo registrado."}</p>
              </button>
            )) : <EmptyState text="Nenhum envio registrado ainda." />}
          </div>
        </Card>
      </div>
      {errors.length ? (
        <Card className="rounded-[24px] border-red-100 bg-red-50/70 p-6 shadow-soft">
          <SectionTitle icon={<XCircle className="h-4 w-4" />} title="Precisa de atencao" subtitle="Falhas recentes de envio." />
          <div className="mt-4 grid gap-2">
            {errors.slice(0, 4).map((envio) => (
              <button key={envio.id} type="button" onClick={() => onOpenHistory(envio)} className="rounded-md border border-red-100 bg-white p-3 text-left text-sm font-bold text-brand-teal">{envio.assunto ?? "Relatorio"} · {envio.erro ?? "Falha sem detalhe tecnico."}</button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SchedulesTab({ agendamentos, destinatarios, sendingId, canWrite, onCreate, onEdit, onDuplicate, onToggle, onSendNow, onDelete }: { agendamentos: RelatorioAgendamento[]; destinatarios: RelatorioDestinatario[]; sendingId: string | null; canWrite: boolean; onCreate: () => void; onEdit: (item: RelatorioAgendamento) => void; onDuplicate: (item: RelatorioAgendamento) => void; onToggle: (item: RelatorioAgendamento) => void; onSendNow: (id: string) => void; onDelete: (id: string) => void; }) {
  return (
    <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SectionTitle icon={<CalendarClock className="h-4 w-4" />} title="Agendamentos" subtitle="Recorrentes, unicos e envios sob demanda." />
        {canWrite ? <ActionButton onClick={onCreate} icon={<Plus className="h-4 w-4" />} label="Novo agendamento" primary /> : null}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {agendamentos.length ? agendamentos.map((item) => (
          <ScheduleCard key={item.id} item={item} recipient={recipientName(item.destinatario_id, destinatarios)} sending={sendingId === item.id} canWrite={canWrite} onEdit={() => onEdit(item)} onDuplicate={() => onDuplicate(item)} onToggle={() => onToggle(item)} onSendNow={() => onSendNow(item.id)} onDelete={() => onDelete(item.id)} />
        )) : <EmptyState text="Ainda nao ha agendamentos configurados." />}
      </div>
    </Card>
  );
}

function ComposeTab({ activeStep, setActiveStep, scheduleForm, setScheduleForm, destinatarios, selectedBlocks, setBlock, setFilterPatch, mergedFilters, previewText, apiPreview, canWrite, editingScheduleId, previewingId, sendingId, onPreview, onSave, onSendAfterSave, onCancel }: { activeStep: StepKey; setActiveStep: (step: StepKey) => void; scheduleForm: DraftSchedule; setScheduleForm: React.Dispatch<React.SetStateAction<DraftSchedule>>; destinatarios: RelatorioDestinatario[]; selectedBlocks: string[]; setBlock: (key: string, patch: Partial<{ enabled: boolean; periodo: RelatorioPeriodo; empty_behavior: "omit" | "show_empty" }>) => void; setFilterPatch: (patch: Partial<RelatorioFiltros>) => void; mergedFilters: () => RelatorioFiltros; previewText: string; apiPreview: string | null; canWrite: boolean; editingScheduleId: string | null; previewingId: string | null; sendingId: string | null; onPreview: () => void; onSave: (event?: FormEvent<HTMLFormElement>, options?: { stay?: boolean; sendAfter?: boolean }) => Promise<RelatorioAgendamento | null>; onSendAfterSave: () => void; onCancel: () => void; }) {
  const filters = mergedFilters();
  return (
    <form onSubmit={(event) => onSave(event)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
      <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5">
          <SectionTitle icon={<Send className="h-4 w-4" />} title={editingScheduleId ? "Editar relatorio" : "Novo envio"} subtitle="Monte a mensagem, escolha o destino e envie pelo Telegram." />
          <div className="flex flex-wrap gap-2 rounded-[22px] border border-brand-sand/80 bg-brand-cream/45 p-2.5">
            {steps.map((step) => (
              <button key={step.key} type="button" onClick={() => setActiveStep(step.key)} className={`rounded-[18px] px-4 py-3 text-sm font-black transition ${activeStep === step.key ? "bg-brand-teal text-white shadow-sm" : "bg-white text-brand-teal hover:bg-brand-cream"}`}>{step.label}</button>
            ))}
          </div>
        </div>

        {activeStep === "content" ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome do relatorio"><input value={scheduleForm.nome} onChange={(e) => setScheduleForm((c) => ({ ...c, nome: e.target.value }))} className="input-like min-h-12 text-[15px]" placeholder="Daily da Ju" /></Field>
              <Field label="Tipo"><select value={scheduleForm.tipo_resumo} onChange={(e) => setScheduleForm((c) => ({ ...c, tipo_resumo: e.target.value as RelatorioTipoResumo }))} className="input-like min-h-12 text-[15px]">{Object.entries(tipoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            </div>
            <Field label="Descricao curta"><textarea value={scheduleForm.descricao} onChange={(e) => setScheduleForm((c) => ({ ...c, descricao: e.target.value }))} className="input-like min-h-28 text-[15px]" placeholder="Resumo para orientar quem vai receber." /></Field>
            <div>
              <p className="text-base font-black text-brand-teal">Blocos do relatorio</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {blockOptions.map((block) => {
                  const active = selectedBlocks.includes(block.key);
                  return (
                    <button key={block.key} type="button" onClick={() => setBlock(block.key, { enabled: !active, periodo: filters.blocos?.[block.key]?.periodo ?? block.defaultPeriod })} className={`rounded-[22px] border p-5 text-left shadow-sm transition ${active ? "border-brand-sky bg-brand-sky/15 ring-2 ring-brand-sky/20" : "border-brand-sand/80 bg-white hover:bg-brand-cream/40"}`}>
                      <div className="flex items-start gap-3">
                        <IconBubble tone={active ? "blue" : "neutral"}>{block.icon}</IconBubble>
                        <div><p className="text-lg font-black text-brand-teal">{block.label}</p><p className="mt-1.5 text-sm font-semibold text-brand-teal/70">{block.helper}</p></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {activeStep === "filters" ? (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nivel de detalhe"><select value={filters.nivel_detalhe ?? "normal"} onChange={(e) => setFilterPatch({ nivel_detalhe: e.target.value as RelatorioNivelDetalhe })} className="input-like min-h-12 text-[15px]"><option value="curto">Curto</option><option value="normal">Normal</option><option value="detalhado">Detalhado</option></select></Field>
              <Field label="Recomendacao Norwyn"><select value={filters.include_recommendation === false ? "nao" : "sim"} onChange={(e) => setFilterPatch({ include_recommendation: e.target.value === "sim" })} className="input-like min-h-12 text-[15px]"><option value="sim">Incluir</option><option value="nao">Nao incluir</option></select></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {selectedBlocks.map((key) => (
                <Field key={key} label={`Periodo · ${blockLabel(key)}`}><select value={filters.blocos?.[key]?.periodo ?? "hoje"} onChange={(e) => setBlock(key, { periodo: e.target.value as RelatorioPeriodo })} className="input-like min-h-12 text-[15px]">{Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              ))}
            </div>
            {selectedBlocks.includes("aluno_360") ? (
              <Field label="Aluno 360 · IDs canonicos"><textarea value={(filters.customer_ids ?? []).join("\n")} onChange={(e) => setFilterPatch({ customer_ids: e.target.value.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean) })} className="input-like min-h-28" placeholder="Cole um customer_id por linha. Busca visual pode entrar em uma proxima iteracao sem mudar o motor." /></Field>
            ) : null}
          </div>
        ) : null}

        {activeStep === "recipient" ? (
          <div className="mt-5 space-y-4">
            <Field label="Destino Telegram"><select value={scheduleForm.destinatario_id} onChange={(e) => setScheduleForm((c) => ({ ...c, destinatario_id: e.target.value }))} className="input-like min-h-12 text-[15px]"><option value="">Escolha um destino</option>{destinatarios.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.telegram_chat_id ?? "sem chat ID"}</option>)}</select></Field>
            <div className="grid gap-3 md:grid-cols-2">
              {destinatarios.filter((item) => item.ativo !== false).slice(0, 6).map((item) => <div key={item.id} className="rounded-[20px] border border-brand-sand/80 bg-white p-5 shadow-sm"><p className="text-sm font-black text-brand-teal">{item.nome}</p><p className="mt-1 text-xs font-semibold text-brand-teal/60">{canalLabels[item.canal_preferencial] ?? item.canal_preferencial} · {item.telegram_chat_id ?? "sem Telegram"}</p></div>)}
            </div>
          </div>
        ) : null}

        {activeStep === "when" ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Quando"><select value={scheduleForm.frequencia} onChange={(e) => setScheduleForm((c) => ({ ...c, frequencia: e.target.value as RelatorioFrequencia }))} className="input-like min-h-12 text-[15px]">{Object.entries(frequenciaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Horario"><input type="time" value={scheduleForm.horario} onChange={(e) => setScheduleForm((c) => ({ ...c, horario: e.target.value }))} className="input-like min-h-12 text-[15px]" /></Field>
            <label className="flex items-center gap-3 rounded-md border border-brand-sand bg-white p-4 text-sm font-black text-brand-teal"><input type="checkbox" checked={scheduleForm.ativo} onChange={(e) => setScheduleForm((c) => ({ ...c, ativo: e.target.checked }))} /> Agendamento ativo</label>
            <div className="rounded-md border border-brand-sand bg-brand-cream/40 p-4 text-sm font-semibold text-brand-teal/70">Canal funcional nesta fase: Telegram. PDF/e-mail ficam preparados no modelo, sem envio ativo.</div>
          </div>
        ) : null}

        {activeStep === "preview" ? <div className="mt-5"><TelegramPreview text={apiPreview ?? previewText} /></div> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-brand-sand pt-4">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-md border border-brand-sand bg-white px-4 py-2 text-sm font-black text-brand-teal"><X className="h-4 w-4" /> Limpar</button>
          <div className="flex flex-wrap gap-2">
            <ActionButton type="button" onClick={onPreview} icon={previewingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} label="Pre-visualizar" />
            {canWrite ? <ActionButton type="submit" icon={<FileText className="h-4 w-4" />} label="Salvar agendamento" primary /> : null}
            {canWrite ? <ActionButton type="button" onClick={onSendAfterSave} icon={sendingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} label="Enviar agora" primary /> : null}
          </div>
        </div>
      </Card>
      <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft"><SectionTitle icon={<Smartphone className="h-4 w-4" />} title="Preview Telegram" subtitle="Representa a mensagem final com os blocos selecionados." /><div className="mt-4"><TelegramPreview text={apiPreview ?? previewText} /></div></Card>
    </form>
  );
}

function HistoryTab({ envios, total, page, filters, setFilters, loading, destinatarios, selectedEnvio, setSelectedEnvio, onLoad, onPage }: { envios: RelatorioEnvio[]; total: number; page: number; filters: { q: string; status: string; origin: string; channel: string; from: string; to: string }; setFilters: React.Dispatch<React.SetStateAction<{ q: string; status: string; origin: string; channel: string; from: string; to: string }>>; loading: boolean; destinatarios: RelatorioDestinatario[]; selectedEnvio: RelatorioEnvio | null; setSelectedEnvio: (envio: RelatorioEnvio | null) => void; onLoad: () => void; onPage: (page: number) => void; }) {
  const maxPage = Math.max(1, Math.ceil(total / 25));
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
      <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
        <SectionTitle icon={<History className="h-4 w-4" />} title="Historico de envios" subtitle="Completo, paginado e sem limite artificial de 1000 registros." />
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Busca"><input value={filters.q ?? ""} onChange={(e) => setFilters((c) => ({ ...c, q: e.target.value }))} className="input-like min-h-12 text-[15px]" placeholder="Assunto, destino..." /></Field>
          <Field label="Status"><select value={filters.status ?? ""} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))} className="input-like min-h-12 text-[15px]"><option value="">Todos</option><option value="enviado">Enviado</option><option value="preparado">Preparado</option><option value="erro">Erro</option><option value="ignorado">Ignorado</option></select></Field>
          <Field label="Origem"><select value={filters.origin ?? ""} onChange={(e) => setFilters((c) => ({ ...c, origin: e.target.value }))} className="input-like min-h-12 text-[15px]"><option value="">Todas</option><option value="manual">Manual</option><option value="agendado">Agendado</option><option value="preview">Preview</option></select></Field>
          <Field label="Canal"><select value={filters.channel ?? ""} onChange={(e) => setFilters((c) => ({ ...c, channel: e.target.value }))} className="input-like min-h-12 text-[15px]"><option value="">Todos</option><option value="telegram">Telegram</option></select></Field>
          <Field label="De"><input type="date" value={filters.from ?? ""} onChange={(e) => setFilters((c) => ({ ...c, from: e.target.value }))} className="input-like min-h-12 text-[15px]" /></Field>
          <Field label="Ate"><input type="date" value={filters.to ?? ""} onChange={(e) => setFilters((c) => ({ ...c, to: e.target.value }))} className="input-like min-h-12 text-[15px]" /></Field>
        </div>
        <div className="mt-3 flex justify-end"><ActionButton onClick={onLoad} icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} label="Filtrar" /></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {envios.length ? envios.map((envio) => <EnvioRow key={envio.id} envio={envio} selected={selectedEnvio?.id === envio.id} onClick={() => setSelectedEnvio(envio)} />) : <EmptyState text="Nenhum envio encontrado para os filtros." />}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-brand-teal/70"><span>{total} registro(s) · pagina {page} de {maxPage}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-md border border-brand-sand bg-white px-3 py-2 disabled:opacity-40">Anterior</button><button type="button" disabled={page >= maxPage} onClick={() => onPage(page + 1)} className="rounded-md border border-brand-sand bg-white px-3 py-2 disabled:opacity-40">Proxima</button></div></div>
      </Card>
      <HistoryDetails envio={selectedEnvio} destinatarios={destinatarios} onClose={() => setSelectedEnvio(null)} />
    </div>
  );
}

function DestinationsTab({ destinatarios, recipientForm, setRecipientForm, editingRecipientId, canWrite, onSubmit, onEdit, onDelete, onCancel }: { destinatarios: RelatorioDestinatario[]; recipientForm: RecipientDraft; setRecipientForm: React.Dispatch<React.SetStateAction<RecipientDraft>>; editingRecipientId: string | null; canWrite: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onEdit: (item: RelatorioDestinatario) => void; onDelete: (id: string) => void; onCancel: () => void; }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]">
      <Card className="order-1 rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={<Mail className="h-4 w-4" />} title="Destinos cadastrados" subtitle="Grupos e chats disponiveis para os envios." />
          {canWrite ? <ActionButton onClick={onCancel} icon={<Plus className="h-4 w-4" />} label="Novo destino" primary /> : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          {destinatarios.length ? destinatarios.map((item) => (
            <div key={item.id} className="rounded-[20px] border border-brand-sand/80 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-brand-teal">{item.nome}</p>
                  <p className="mt-1 text-sm font-semibold text-brand-teal/70">{item.tipo_destino} · {item.telegram_chat_id ?? "sem chat ID"}</p>
                  <p className="mt-1 text-sm font-semibold text-brand-teal/60">Ultimo envio: {dateTime(item.last_sent_at)}</p>
                </div>
                <Pill tone={item.ativo === false ? "neutral" : "green"}>{item.ativo === false ? "Inativo" : "Ativo"}</Pill>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-sand pt-3">
                <ActionButton onClick={() => onEdit(item)} icon={<Pencil className="h-4 w-4" />} label="Editar" />
                {canWrite ? <ActionButton onClick={() => onDelete(item.id)} icon={<Trash2 className="h-4 w-4" />} label="Excluir" danger /> : null}
              </div>
            </div>
          )) : <EmptyState text="Nenhum destino configurado." />}
        </div>
      </Card>
      <Card className="order-2 rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
        <SectionTitle icon={<UserRound className="h-4 w-4" />} title={editingRecipientId ? "Editar destino" : "Novo destino"} subtitle="Use este painel quando precisar cadastrar ou ajustar um destino." />
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <Field label="Nome"><input value={recipientForm.nome} onChange={(e) => setRecipientForm((c) => ({ ...c, nome: e.target.value }))} className="input-like min-h-12 text-[15px]" /></Field>
          <div className="grid gap-4 md:grid-cols-2"><Field label="Tipo"><select value={recipientForm.tipo_destino} onChange={(e) => setRecipientForm((c) => ({ ...c, tipo_destino: e.target.value }))} className="input-like min-h-12 text-[15px]"><option value="grupo">Grupo</option><option value="individual">Individual</option><option value="canal">Canal</option><option value="outro">Outro</option></select></Field><Field label="Perfil"><select value={recipientForm.perfil_alvo} onChange={(e) => setRecipientForm((c) => ({ ...c, perfil_alvo: e.target.value }))} className="input-like min-h-12 text-[15px]"><option value="ju">Especialista</option><option value="suporte">Suporte</option><option value="operacional">Operacional</option><option value="marketing">Marketing</option><option value="comercial">Comercial</option><option value="jeff">Admin</option></select></Field></div>
          <Field label="Telegram chat ID"><input value={recipientForm.telegram_chat_id} onChange={(e) => setRecipientForm((c) => ({ ...c, telegram_chat_id: e.target.value }))} className="input-like min-h-12 text-[15px]" placeholder="-100..." /></Field>
          <Field label="Observacao"><textarea value={recipientForm.observacao} onChange={(e) => setRecipientForm((c) => ({ ...c, observacao: e.target.value }))} className="input-like min-h-28 text-[15px]" /></Field>
          <label className="flex min-h-12 items-center gap-3 rounded-[16px] border border-brand-sand bg-white px-4 py-3 text-sm font-black text-brand-teal"><input type="checkbox" checked={recipientForm.ativo} onChange={(e) => setRecipientForm((c) => ({ ...c, ativo: e.target.checked }))} /> Destino ativo</label>
          <div className="flex flex-wrap gap-2 pt-2">{canWrite ? <ActionButton type="submit" icon={<CheckCircle2 className="h-4 w-4" />} label="Salvar destino" primary /> : null}<ActionButton type="button" onClick={onCancel} icon={<X className="h-4 w-4" />} label="Cancelar" /></div>
        </form>
      </Card>
    </div>
  );
}
function ScheduleCard({ item, recipient, sending, canWrite, onEdit, onDuplicate, onToggle, onSendNow, onDelete }: { item: RelatorioAgendamento; recipient: string; sending: boolean; canWrite: boolean; onEdit: () => void; onDuplicate: () => void; onToggle: () => void; onSendNow: () => void; onDelete: () => void; }) {
  const active = scheduleActive(item);
  return (
    <div className="rounded-[22px] border border-brand-sand/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-brand-teal">{item.nome}</h3><Pill tone={active ? "green" : item.status === "rascunho" ? "amber" : "neutral"}>{active ? "Ativo" : item.status}</Pill><Pill tone="blue">{canalLabels[item.canal] ?? item.canal}</Pill></div>
          <p className="mt-2 text-[15px] font-semibold text-brand-teal/75">{recipient} · {frequenciaLabels[item.frequencia] ?? item.frequencia} · {item.horario?.slice(0, 5) ?? "sem horario"}</p>
          <div className="mt-3 flex flex-wrap gap-2">{(item.incluir_modulos ?? []).map((key) => <Pill key={key} tone="neutral">{blockLabel(key)}</Pill>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm font-bold text-brand-teal/75 sm:grid-cols-3 lg:min-w-[360px]">
          <span><strong className="block text-brand-teal">Proximo</strong>{dateTime(item.next_run_at)}</span>
          <span><strong className="block text-brand-teal">Ultimo</strong>{dateTime(item.last_run_at)}</span>
          <span><strong className="block text-brand-teal">Tipo</strong>{tipoLabels[item.tipo_resumo] ?? item.tipo_resumo}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-sand pt-3">
        <ActionButton onClick={onEdit} icon={<Pencil className="h-4 w-4" />} label="Editar" />
        <ActionButton onClick={onDuplicate} icon={<Copy className="h-4 w-4" />} label="Duplicar" />
        <ActionButton onClick={onToggle} icon={active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} label={active ? "Pausar" : "Reativar"} />
        <ActionButton onClick={onSendNow} icon={sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} label="Enviar agora" primary />
        {canWrite ? <ActionButton onClick={onDelete} icon={<Trash2 className="h-4 w-4" />} label="Excluir" danger /> : null}
      </div>
    </div>
  );
}

function EnvioRow({ envio, selected, onClick }: { envio: RelatorioEnvio; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[20px] border p-5 text-left shadow-sm transition ${selected ? "border-brand-sky bg-brand-sky/15 ring-2 ring-brand-sky/20" : "border-brand-sand/80 bg-white hover:bg-brand-cream/40"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-black text-brand-teal">{envio.assunto ?? tipoLabels[envio.tipo_resumo] ?? envio.tipo_resumo}</p><p className="mt-1 text-xs font-semibold text-brand-teal/60">{dateTime(envio.created_at)} · {envio.destino ?? "sem destino"} · {envio.origem}</p></div><Pill tone={envio.status === "erro" ? "red" : envio.status === "enviado" ? "green" : "blue"}>{envio.status}</Pill></div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-brand-teal/70">{envio.resumo ?? envio.erro ?? "Sem resumo."}</p>
    </button>
  );
}

function HistoryDetails({ envio, destinatarios, onClose }: { envio: RelatorioEnvio | null; destinatarios: RelatorioDestinatario[]; onClose: () => void }) {
  if (!envio) return <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft"><SectionTitle icon={<Eye className="h-4 w-4" />} title="Detalhe do envio" subtitle="Selecione um registro para ver conteudo, filtros e erros." /><EmptyState text="Nenhum envio selecionado." /></Card>;
  return (
    <Card className="rounded-[24px] border-brand-sand/80 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3"><SectionTitle icon={<Eye className="h-4 w-4" />} title="Detalhe do envio" subtitle={dateTime(envio.created_at)} /><button type="button" onClick={onClose} className="rounded-full border border-brand-sand bg-white p-2 text-brand-teal"><X className="h-4 w-4" /></button></div>
      <div className="mt-4 grid gap-3 text-sm font-semibold text-brand-teal/70">
        <InfoLine label="Status" value={envio.status} />
        <InfoLine label="Origem" value={envio.origem} />
        <InfoLine label="Destino" value={envio.destino ?? recipientName(envio.destinatario_id ?? "", destinatarios)} />
        <InfoLine label="Blocos" value={(envio.modulos ?? []).map(blockLabel).join(" · ") || "Nao registrado"} />
        {envio.erro ? <InfoLine label="Erro" value={envio.erro} danger /> : null}
      </div>
      <div className="mt-4"><TelegramPreview text={envio.mensagem ?? "Conteudo nao registrado para este envio."} /></div>
      <details className="mt-4 rounded-md border border-brand-sand bg-brand-cream/30 p-3 text-xs font-semibold text-brand-teal/70"><summary className="cursor-pointer font-black text-brand-teal">Filtros e metadados</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify({ filtros: envio.filtros, metadata: envio.metadata }, null, 2)}</pre></details>
    </Card>
  );
}

function MetricCard({ icon, label, value, helper, tone }: { icon: ReactNode; label: string; value: string; helper: string; tone: "green" | "blue" | "amber" | "red" | "purple" }) {
  return <Card className="rounded-[26px] border-brand-sand/80 bg-white p-6 shadow-soft"><div className="flex items-start gap-4"><IconBubble tone={tone}>{icon}</IconBubble><div><p className="text-sm font-black text-brand-teal/65">{label}</p><p className="mt-3 text-4xl font-black leading-none text-brand-teal">{value}</p><p className="mt-2 text-sm font-bold text-brand-teal/70">{helper}</p></div></div></Card>;
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return <div className="flex items-start gap-3"><IconBubble tone="blue">{icon}</IconBubble><div><h2 className="text-xl font-black leading-tight text-brand-teal">{title}</h2><p className="mt-1.5 text-[15px] font-semibold text-brand-teal/70">{subtitle}</p></div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-black text-brand-teal/80"><span>{label}</span>{children}</label>;
}

function ActionButton({ icon, label, onClick, primary = false, danger = false, type = "button" }: { icon: ReactNode; label: string; onClick?: () => void; primary?: boolean; danger?: boolean; type?: "button" | "submit" }) {
  const color = primary ? "bg-brand-teal text-white hover:bg-brand-teal/90" : danger ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border-brand-sand bg-white text-brand-teal hover:bg-brand-cream";
  return <button type={type} onClick={onClick} className={`inline-flex min-h-11 items-center gap-2 rounded-[16px] border px-4 py-2.5 text-sm font-black transition ${color}`}>{icon}{label}</button>;
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "blue" | "amber" | "red" | "purple" | "neutral" }) {
  const colors: Record<string, string> = { green: "bg-emerald-50 text-emerald-700 border-emerald-100", blue: "bg-sky-50 text-sky-700 border-sky-100", amber: "bg-amber-50 text-amber-700 border-amber-100", red: "bg-red-50 text-red-700 border-red-100", purple: "bg-violet-50 text-violet-700 border-violet-100", neutral: "bg-brand-cream text-brand-teal/75 border-brand-sand" };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black ${colors[tone]}`}>{children}</span>;
}

function IconBubble({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "blue" | "amber" | "red" | "purple" | "neutral" }) {
  const colors: Record<string, string> = { green: "bg-emerald-100 text-emerald-700", blue: "bg-sky-100 text-sky-700", amber: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700", purple: "bg-violet-100 text-violet-700", neutral: "bg-brand-cream text-brand-teal" };
  return <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${colors[tone]}`}>{children}</span>;
}

function TelegramPreview({ text }: { text: string }) {
  return <div className="rounded-[26px] border border-[#17384a] bg-[#0b1f2d] p-6 shadow-soft"><pre className="max-h-[620px] overflow-auto whitespace-pre-wrap font-sans text-[15px] font-semibold leading-8 text-white/95">{text}</pre></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-brand-sand bg-brand-cream/35 p-6 text-[15px] font-bold text-brand-teal/70">{text}</div>;
}

function InfoLine({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="rounded-[18px] border border-brand-sand/80 bg-white p-4"><span className="block text-xs font-black text-brand-teal/60">{label}</span><span className={danger ? "text-red-700" : "text-brand-teal"}>{value}</span></div>;
}

function buildPreview(form: DraftSchedule, destinatarios: RelatorioDestinatario[]) {
  const filters = { ...defaultFilters, ...(form.filtros ?? {}), blocos: { ...defaultFilters.blocos, ...(form.filtros?.blocos ?? {}) } };
  const selected = Object.entries(filters.blocos ?? {}).filter(([, config]) => config?.enabled).map(([key]) => key);
  const recipient = recipientName(form.destinatario_id, destinatarios);
  const lines: string[] = [];
  if (form.tipo_resumo === "aluno_360") lines.push("👤 Aluno 360 — Norwyn");
  else lines.push("☀️ Bom dia — Norwyn");
  lines.push(`📅 ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date())}`);
  if (recipient !== "Destino nao definido") lines.push(`Para: ${recipient}`);
  lines.push("");
  for (const key of selected) {
    if (key === "agenda") lines.push("📅 Agenda", "• Hoje: compromissos do periodo selecionado", "");
    if (key === "decisoes") lines.push("🎯 Precisa de voce", "• Decisoes e pendencias abertas entram aqui", "");
    if (key === "presence") lines.push("🛡️ Saude digital", "✅ Ativos e links monitorados entram aqui", "");
    if (key === "marketing_instagram") lines.push("📈 Marketing · Instagram", "Seguidores, variacao e destaque entram aqui", "");
    if (key === "marketing_ads") lines.push("📣 Marketing · Ads", "Investimento, alcance e campanhas entram aqui", "");
    if (key === "comercial") lines.push("💰 Comercial", "Vendas confirmadas e receita validada entram aqui", "");
    if (key === "financeiro") lines.push("💳 Financeiro", "Entradas, saidas e previsoes conhecidas entram aqui", "");
    if (key === "interacoes") lines.push("💬 Interacoes", "Comentarios, directs e suporte entram aqui", "");
    if (key === "aluno_360") {
      const count = filters.customer_ids?.length ?? 0;
      lines.push("👤 Aluno 360", count ? `• ${count} aluno(s) selecionado(s)` : "• Selecione um ou mais alunos para gerar o bloco", "");
    }
    if (key === "recomendacoes") lines.push("💡 Norwyn recomenda", "Recomendacao executiva curta com base nos blocos selecionados", "");
  }
  if (!selected.length) lines.push("Escolha ao menos um bloco para montar o relatorio.", "");
  lines.push("Norwyn · Relatorio gerado automaticamente");
  return lines.join("\n").trim();
}

function dateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function todayIso() {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());
}

function scheduleActive(item: RelatorioAgendamento) {
  return item.ativo !== false && item.status !== "pausado";
}

function blockLabel(key: string) {
  return blockOptions.find((item) => item.key === key)?.label ?? key.replace(/_/g, " ");
}

function recipientName(id: string, destinatarios: RelatorioDestinatario[]) {
  return destinatarios.find((item) => item.id === id)?.nome ?? "Destino nao definido";
}




function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}



