"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Columns3,
  FileText,
  Flag,
  GanttChartSquare,
  LayoutList,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type {
  AtividadesContext,
  AtividadeCategoriaProjeto,
  AtividadePrioridade,
  AtividadeRecorrenciaFrequencia,
  AtividadeStatus,
  AtividadeTarefa,
  AtividadeTime,
} from "@/modules/atividades/types";

type Tab = "visao" | "projetos" | "atividades" | "recorrencias" | "templates" | "gestao" | "admin";
type ViewMode = "kanban" | "lista" | "calendario" | "gantt";
type PeriodFilter = "hoje" | "amanha" | "7d" | "15d" | "mes" | "ano" | "tudo";

const tabs: Array<[Tab, string]> = [
  ["visao", "Visão Geral"],
  ["projetos", "Projetos"],
  ["atividades", "Atividades"],
  ["recorrencias", "Recorrências"],
  ["templates", "Templates"],
  ["gestao", "Gestão à Vista"],
  ["admin", "Admin"],
];

const teams: Array<[AtividadeTime, string]> = [
  ["marketing", "Marketing"],
  ["suporte", "Suporte"],
  ["especialista", "Especialista"],
  ["gestao_dados", "Gestão/Dados"],
];

const statuses: Array<[AtividadeStatus, string]> = [
  ["backlog", "Backlog"],
  ["hoje", "Hoje"],
  ["em_andamento", "Em andamento"],
  ["aguardando_validacao", "Aguardando validação"],
  ["bloqueada", "Bloqueada"],
  ["concluida", "Concluída"],
  ["ignorada", "Ignorada"],
  ["cancelada", "Cancelada"],
];

const priorities: Array<[AtividadePrioridade, string]> = [
  ["baixa", "Baixa"],
  ["media", "Média"],
  ["alta", "Alta"],
  ["urgente", "Urgente"],
];

const categoryLabels: Record<AtividadeCategoriaProjeto, string> = {
  lancamento: "Lançamento",
  acao_venda: "Ação de Venda",
  campanha: "Campanha",
  operacao: "Operação",
  outro: "Outro",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function periodRange(period: PeriodFilter) {
  const today = todayIso();
  if (period === "hoje") return { start: today, end: today };
  if (period === "amanha") return { start: addDays(1), end: addDays(1) };
  if (period === "7d") return { start: today, end: addDays(7) };
  if (period === "15d") return { start: today, end: addDays(15) };
  if (period === "mes") {
    const date = new Date();
    return {
      start: firstDayOfMonth(),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (period === "ano") {
    const year = new Date().getFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return { start: "1900-01-01", end: "2999-12-31" };
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(
    new Date(`${value}T12:00:00`),
  );
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

function statusLabel(value: AtividadeStatus) {
  return statuses.find(([status]) => status === value)?.[1] ?? value;
}

function teamLabel(value: AtividadeTime) {
  return teams.find(([team]) => team === value)?.[1] ?? value;
}

function priorityTone(priority: AtividadePrioridade) {
  if (priority === "urgente") return "bg-rose-50 text-rose-700 border-rose-200";
  if (priority === "alta") return "bg-orange-50 text-orange-700 border-orange-200";
  if (priority === "media") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function statusTone(status: AtividadeStatus) {
  if (status === "concluida") return "bg-emerald-50 text-emerald-700";
  if (status === "bloqueada" || status === "cancelada") return "bg-rose-50 text-rose-700";
  if (status === "aguardando_validacao") return "bg-amber-50 text-amber-700";
  if (status === "ignorada") return "bg-brand-cream text-brand-teal/65";
  return "bg-blue-50 text-blue-700";
}

function isLate(task: AtividadeTarefa) {
  if (!task.prazo || ["concluida", "ignorada", "cancelada"].includes(task.status)) return false;
  return task.prazo < todayIso();
}

function emptyTask(team: AtividadeTime = "suporte") {
  return {
    titulo: "",
    descricao: "",
    time_responsavel: team,
    responsavel_nome: "",
    prioridade: "media" as AtividadePrioridade,
    status: "backlog" as AtividadeStatus,
    data_inicio: todayIso(),
    prazo: addDays(1),
    projeto_id: "",
    validacao_obrigatoria: false,
  };
}

export function AtividadesDashboard({ context }: { context: AtividadesContext }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("visao");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [period, setPeriod] = useState<PeriodFilter>("7d");
  const [teamFilter, setTeamFilter] = useState<"todos" | AtividadeTime>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | AtividadeStatus>("todos");
  const [projectFilter, setProjectFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleTabs = tabs.filter(([tab]) => tab !== "admin" || context.canAdmin);
  const allowedTeams = useMemo(() => {
    if (context.role === "MARKETING_PARTNER") return ["marketing"] as AtividadeTime[];
    if (context.role === "CLINICA") return ["especialista"] as AtividadeTime[];
    return teams.map(([team]) => team);
  }, [context.role]);

  const filteredTasks = useMemo(() => {
    const range = periodRange(period);
    const needle = query.trim().toLowerCase();
    return context.tarefas.filter((task) => {
      const date = task.prazo ?? task.data_inicio ?? task.created_at.slice(0, 10);
      if (date < range.start || date > range.end) return false;
      if (teamFilter !== "todos" && task.time_responsavel !== teamFilter) return false;
      if (statusFilter !== "todos" && task.status !== statusFilter) return false;
      if (projectFilter !== "todos" && task.projeto_id !== projectFilter) return false;
      if (needle && !`${task.titulo} ${task.descricao ?? ""} ${task.responsavel_nome ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [context.tarefas, period, projectFilter, query, statusFilter, teamFilter]);

  const metrics = useMemo(() => {
    const today = todayIso();
    const week = addDays(7);
    const active = context.tarefas.filter((task) => !["concluida", "ignorada", "cancelada"].includes(task.status));
    const done = context.tarefas.filter((task) => task.status === "concluida");
    const late = active.filter(isLate);
    const validation = active.filter((task) => task.status === "aguardando_validacao");
    const blocked = active.filter((task) => task.status === "bloqueada");
    const dueToday = active.filter((task) => (task.prazo ?? task.data_inicio) === today);
    const next7 = active.filter((task) => {
      const date = task.prazo ?? task.data_inicio;
      return date && date >= today && date <= week;
    });
    const onTimeDone = done.filter((task) => !task.prazo || !task.concluida_at || task.concluida_at.slice(0, 10) <= task.prazo);
    return {
      active,
      late,
      validation,
      blocked,
      dueToday,
      next7,
      done,
      onTimePercent: done.length ? Math.round((onTimeDone.length / done.length) * 100) : 0,
    };
  }, [context.tarefas]);

  useEffect(() => {
    const supabase = createClient() as any;
    const channel = supabase
      .channel("atividades-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "atividades_tarefas" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "atividades_projetos" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "atividades_recorrencias" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "atividades",
        pagePath: "/atividades",
        pageLabel: `Atividades: ${visibleTabs.find(([tab]) => tab === activeTab)?.[1] ?? "Visão Geral"}`,
      }),
      keepalive: true,
    });
  }, [activeTab, visibleTabs]);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4500);
  }

  async function mutate(body: Record<string, unknown>, success: string) {
    const response = await fetch("/api/atividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      notify(payload.error ?? "Falha ao salvar atividade.");
      return;
    }
    notify(success);
    router.refresh();
  }

  function updateTask(task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success = "Atividade atualizada.") {
    startTransition(() => {
      void mutate({ entity: "tarefa", action: "update", id: task.id, payload: patch }, success);
    });
  }

  function deleteTask(task: AtividadeTarefa) {
    const action = task.projeto_id ? "cancelar/ignorar" : "excluir";
    if (!window.confirm(`Deseja ${action} "${task.titulo}"?`)) return;
    startTransition(() => {
      if (task.projeto_id) {
        void mutate(
          {
            entity: "tarefa",
            action: "update",
            id: task.id,
            payload: { status: "ignorada", ignorada_motivo: "Ignorada manualmente pelo usuário." },
          },
          "Atividade de projeto ignorada com histórico preservado.",
        );
      } else {
        void mutate({ entity: "tarefa", action: "delete", id: task.id }, "Atividade excluída.");
      }
    });
  }

  function generateRecurring() {
    startTransition(async () => {
      const response = await fetch("/api/atividades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_recurring", until: addDays(30) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify(payload.error ?? "Falha ao gerar recorrências.");
        return;
      }
      notify(`${payload.created ?? 0} atividades recorrentes geradas para os próximos 30 dias.`);
      router.refresh();
    });
  }

  if (context.diagnostic) {
    return (
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm font-bold uppercase text-brand-clay">Atividades</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-teal">Acesso indisponível</h1>
        <p className="mt-3 text-sm leading-6 text-brand-teal/70">{context.diagnostic}</p>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-[1480px] space-y-6">
      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-clay">Operação e Projetos</p>
          <h1 className="mt-2 text-4xl font-semibold text-brand-teal">Atividades</h1>
          <p className="mt-2 max-w-3xl text-base leading-7 text-brand-teal/70">
            Projetos, rotinas, tarefas e gestão à vista para acompanhar execução, atrasos, validações e responsabilidades.
          </p>
        </div>
        <div className="text-sm font-semibold text-brand-teal/60">{updatedAtLabel(context.updatedAt)}</div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-white/70 bg-white/70 p-2 shadow-soft">
        {visibleTabs.map(([tab, label]) => (
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
            {label}
          </button>
        ))}
      </nav>

      {message ? (
        <div className="rounded-md border border-brand-sand bg-white/80 px-4 py-3 text-sm font-semibold text-brand-teal shadow-soft">
          {message}
        </div>
      ) : null}

      {activeTab === "visao" ? (
        <OverviewTab context={context} metrics={metrics} generateRecurring={generateRecurring} isPending={isPending} />
      ) : null}
      {activeTab === "projetos" ? (
        <ProjectsTab context={context} canWrite={context.canWrite} mutate={mutate} isPending={isPending} />
      ) : null}
      {activeTab === "atividades" ? (
        <ActivitiesTab
          context={context}
          tasks={filteredTasks}
          period={period}
          setPeriod={setPeriod}
          teamFilter={teamFilter}
          setTeamFilter={setTeamFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          query={query}
          setQuery={setQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          allowedTeams={allowedTeams}
          updateTask={updateTask}
          deleteTask={deleteTask}
          mutate={mutate}
          canWrite={context.canWrite}
          isPending={isPending}
        />
      ) : null}
      {activeTab === "recorrencias" ? (
        <RecurrencesTab context={context} mutate={mutate} generateRecurring={generateRecurring} canWrite={context.canWrite} isPending={isPending} />
      ) : null}
      {activeTab === "templates" ? (
        <TemplatesTab context={context} mutate={mutate} canAdmin={context.canAdmin} isPending={isPending} />
      ) : null}
      {activeTab === "gestao" ? (
        <ManagementTab context={context} tasks={context.tarefas} updateTask={updateTask} />
      ) : null}
      {activeTab === "admin" && context.canAdmin ? (
        <AdminTab context={context} />
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Clock;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700"
        : tone === "bad"
          ? "bg-rose-50 text-rose-700"
          : "bg-brand-cream text-brand-teal";

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-4 top-3 h-1 rounded-full bg-brand-clay/70" />
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-brand-clay/75">{label}</p>
          <p className="mt-3 text-3xl font-black text-brand-teal">{value}</p>
          <p className="mt-1 text-sm font-semibold text-brand-teal/55">{detail}</p>
        </div>
        <span className={clsx("rounded-md p-3", toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

function OverviewTab({
  context,
  metrics,
  generateRecurring,
  isPending,
}: {
  context: AtividadesContext;
  metrics: {
    active: AtividadeTarefa[];
    late: AtividadeTarefa[];
    validation: AtividadeTarefa[];
    blocked: AtividadeTarefa[];
    dueToday: AtividadeTarefa[];
    next7: AtividadeTarefa[];
    done: AtividadeTarefa[];
    onTimePercent: number;
  };
  generateRecurring: () => void;
  isPending: boolean;
}) {
  const teamLoad = teams.map(([team, label]) => ({
    team,
    label,
    total: metrics.active.filter((task) => task.time_responsavel === team).length,
    late: metrics.late.filter((task) => task.time_responsavel === team).length,
  }));
  const maxLoad = Math.max(...teamLoad.map((item) => item.total), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Hoje" value={metrics.dueToday.length} detail="atividades vencendo hoje" icon={Clock} tone="warn" />
        <MetricCard label="Atrasadas" value={metrics.late.length} detail="exigem priorização" icon={AlertTriangle} tone={metrics.late.length ? "bad" : "good"} />
        <MetricCard label="Em validação" value={metrics.validation.length} detail="aguardando aceite final" icon={ShieldCheck} tone="warn" />
        <MetricCard label="Dentro do prazo" value={`${metrics.onTimePercent}%`} detail="das concluídas" icon={CheckCircle2} tone="good" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-brand-teal">Prioridades operacionais</h2>
              <p className="text-sm text-brand-teal/60">Atrasos, hoje e próximos 7 dias para orientar a execução.</p>
            </div>
            {context.canWrite ? (
              <Button disabled={isPending} onClick={generateRecurring}>
                <RefreshCw className="h-4 w-4" />
                Gerar recorrências
              </Button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PriorityList title="Atrasadas" rows={metrics.late.slice(0, 6)} />
            <PriorityList title="Hoje" rows={metrics.dueToday.slice(0, 6)} />
            <PriorityList title="Próximos 7 dias" rows={metrics.next7.slice(0, 6)} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold text-brand-teal">Carga por time</h2>
          <p className="text-sm text-brand-teal/60">Mostra onde está a maior pressão operacional.</p>
          <div className="mt-5 space-y-4">
            {teamLoad.map((item) => (
              <div key={item.team}>
                <div className="flex items-center justify-between text-sm font-bold text-brand-teal">
                  <span>{item.label}</span>
                  <span>{item.total} abertas · {item.late} atrasadas</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-brand-sand/60">
                  <div
                    className="h-2 rounded-full bg-brand-clay"
                    style={{ width: `${Math.max(6, (item.total / maxLoad) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PriorityList({ title, rows }: { title: string; rows: AtividadeTarefa[] }) {
  return (
    <div className="rounded-md border border-brand-sand/70 bg-white/55 p-4">
      <h3 className="font-bold text-brand-teal">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((task) => <TaskMini key={task.id} task={task} />) : <p className="text-sm text-brand-teal/55">Nenhuma atividade.</p>}
      </div>
    </div>
  );
}

function TaskMini({ task }: { task: AtividadeTarefa }) {
  return (
    <div className="rounded-md border border-brand-sand/60 bg-white/70 p-3">
      <div className="flex flex-wrap gap-2">
        <Badge>{teamLabel(task.time_responsavel)}</Badge>
        <Badge className={priorityTone(task.prioridade)}>{priorities.find(([value]) => value === task.prioridade)?.[1]}</Badge>
      </div>
      <p className="mt-2 text-sm font-black text-brand-teal">{task.titulo}</p>
      <p className="text-xs font-semibold text-brand-teal/55">Prazo: {dateLabel(task.prazo)}</p>
    </div>
  );
}

function ProjectsTab({
  context,
  canWrite,
  mutate,
  isPending,
}: {
  context: AtividadesContext;
  canWrite: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    nome: "",
    categoria: "lancamento" as AtividadeCategoriaProjeto,
    descricao: "",
    time_responsavel: "gestao_dados" as AtividadeTime,
    responsavel_nome: "",
    data_inicio: todayIso(),
    data_fim: addDays(20),
    template_id: "",
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
      {canWrite ? (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-brand-clay" />
            <h2 className="text-xl font-bold text-brand-teal">Novo projeto</h2>
          </div>
          <div className="mt-5 space-y-3">
            <Field label="Nome" value={form.nome} onChange={(value) => setForm({ ...form, nome: value })} />
            <Select label="Categoria" value={form.categoria} onChange={(value) => {
              const template = context.templates.find((item) => item.categoria === value && item.ativo);
              setForm({
                ...form,
                categoria: value as AtividadeCategoriaProjeto,
                template_id: template?.id ?? "",
                data_fim: addDays(template?.duracao_dias ?? 10),
              });
            }} options={Object.entries(categoryLabels)} />
            <Select label="Template" value={form.template_id} onChange={(value) => setForm({ ...form, template_id: value })} options={[["", "Sem template"], ...context.templates.filter((item) => item.ativo).map((item) => [item.id, `${item.nome} · ${item.duracao_dias} dias`] as [string, string])]} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Time" value={form.time_responsavel} onChange={(value) => setForm({ ...form, time_responsavel: value as AtividadeTime })} options={teams} />
              <Field label="Responsável" value={form.responsavel_nome} onChange={(value) => setForm({ ...form, responsavel_nome: value })} placeholder="Ju, Jeff, Ryan..." />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Início" type="date" value={form.data_inicio} onChange={(value) => setForm({ ...form, data_inicio: value })} />
              <Field label="Fim planejado" type="date" value={form.data_fim} onChange={(value) => setForm({ ...form, data_fim: value })} />
            </div>
            <TextArea label="Descrição" value={form.descricao} onChange={(value) => setForm({ ...form, descricao: value })} />
            <Button
              disabled={isPending || !form.nome.trim()}
              onClick={() =>
                void mutate(
                  {
                    entity: "projeto",
                    action: "create",
                    payload: { ...form, template_id: form.template_id || null },
                  },
                  form.template_id ? "Projeto criado e tarefas do template geradas." : "Projeto criado.",
                )
              }
            >
              Criar projeto
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="text-xl font-bold text-brand-teal">Projetos ativos</h2>
        <div className="mt-4 grid gap-3">
          {context.projetos.map((project) => {
            const tasks = context.tarefas.filter((task) => task.projeto_id === project.id);
            const done = tasks.filter((task) => task.status === "concluida").length;
            const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            return (
              <div key={project.id} className="rounded-lg border border-brand-sand/70 bg-white/65 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{categoryLabels[project.categoria]}</Badge>
                      <Badge>{teamLabel(project.time_responsavel)}</Badge>
                      <Badge className={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
                    </div>
                    <h3 className="mt-2 text-lg font-black text-brand-teal">{project.nome}</h3>
                    <p className="text-sm text-brand-teal/60">{project.descricao}</p>
                  </div>
                  <div className="text-right text-sm font-bold text-brand-teal/60">
                    <p>{dateLabel(project.data_inicio)} → {dateLabel(project.data_fim)}</p>
                    <p>{tasks.length} tarefas · {progress}%</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-brand-sand/60">
                  <div className="h-2 rounded-full bg-brand-clay" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
          {!context.projetos.length ? <p className="text-sm text-brand-teal/60">Nenhum projeto cadastrado ainda.</p> : null}
        </div>
      </Card>
    </div>
  );
}

function ActivitiesTab(props: {
  context: AtividadesContext;
  tasks: AtividadeTarefa[];
  period: PeriodFilter;
  setPeriod: (value: PeriodFilter) => void;
  teamFilter: "todos" | AtividadeTime;
  setTeamFilter: (value: "todos" | AtividadeTime) => void;
  statusFilter: "todos" | AtividadeStatus;
  setStatusFilter: (value: "todos" | AtividadeStatus) => void;
  projectFilter: string;
  setProjectFilter: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  allowedTeams: AtividadeTime[];
  updateTask: (task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success?: string) => void;
  deleteTask: (task: AtividadeTarefa) => void;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
  canWrite: boolean;
  isPending: boolean;
}) {
  const [form, setForm] = useState(emptyTask(props.allowedTeams[0] ?? "suporte"));

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder="Buscar atividade, responsável ou descrição..."
              className="h-11 rounded-md border border-brand-sand bg-white/75 px-3 text-sm font-semibold text-brand-teal outline-none focus:border-brand-clay md:col-span-2"
            />
            <Select compact value={props.teamFilter} onChange={(value) => props.setTeamFilter(value as "todos" | AtividadeTime)} options={[["todos", "Todos os times"], ...teams.filter(([team]) => props.allowedTeams.includes(team))]} />
            <Select compact value={props.statusFilter} onChange={(value) => props.setStatusFilter(value as "todos" | AtividadeStatus)} options={[["todos", "Todos status"], ...statuses]} />
            <Select compact value={props.projectFilter} onChange={props.setProjectFilter} options={[["todos", "Todos projetos"], ...props.context.projetos.map((project) => [project.id, project.nome] as [string, string])]} />
            <Select compact value={props.period} onChange={(value) => props.setPeriod(value as PeriodFilter)} options={[
              ["hoje", "Hoje"],
              ["amanha", "Amanhã"],
              ["7d", "7 dias"],
              ["15d", "15 dias"],
              ["mes", "Mês"],
              ["ano", "Ano"],
              ["tudo", "Tudo"],
            ]} />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["kanban", Columns3, "Kanban"],
              ["lista", LayoutList, "Lista"],
              ["calendario", CalendarDays, "Calendário"],
              ["gantt", GanttChartSquare, "Gantt"],
            ] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => props.setViewMode(mode)}
                className={clsx(
                  "inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-bold",
                  props.viewMode === mode
                    ? "border-brand-teal bg-brand-teal text-white"
                    : "border-brand-sand bg-white/60 text-brand-teal",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        {props.canWrite ? (
          <Card className="p-5">
            <h2 className="text-xl font-bold text-brand-teal">Nova atividade</h2>
            <div className="mt-4 space-y-3">
              <Field label="Título" value={form.titulo} onChange={(value) => setForm({ ...form, titulo: value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Time" value={form.time_responsavel} onChange={(value) => setForm({ ...form, time_responsavel: value as AtividadeTime })} options={teams.filter(([team]) => props.allowedTeams.includes(team))} />
                <Field label="Responsável" value={form.responsavel_nome} onChange={(value) => setForm({ ...form, responsavel_nome: value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Prioridade" value={form.prioridade} onChange={(value) => setForm({ ...form, prioridade: value as AtividadePrioridade })} options={priorities} />
                <Select label="Projeto" value={form.projeto_id} onChange={(value) => setForm({ ...form, projeto_id: value })} options={[["", "Atividade solta"], ...props.context.projetos.map((project) => [project.id, project.nome] as [string, string])]} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Início" type="date" value={form.data_inicio} onChange={(value) => setForm({ ...form, data_inicio: value })} />
                <Field label="Prazo" type="date" value={form.prazo} onChange={(value) => setForm({ ...form, prazo: value })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-brand-teal">
                <input type="checkbox" checked={form.validacao_obrigatoria} onChange={(event) => setForm({ ...form, validacao_obrigatoria: event.target.checked })} />
                Exigir validação final
              </label>
              <TextArea label="Descrição" value={form.descricao} onChange={(value) => setForm({ ...form, descricao: value })} />
              <Button
                disabled={props.isPending || !form.titulo.trim()}
                onClick={() =>
                  void props.mutate(
                    {
                      entity: "tarefa",
                      action: "create",
                      payload: { ...form, projeto_id: form.projeto_id || null, responsavel_nome: form.responsavel_nome || null },
                    },
                    "Atividade criada.",
                  )
                }
              >
                Criar atividade
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="overflow-hidden p-0">
          {props.viewMode === "kanban" ? <KanbanView tasks={props.tasks} updateTask={props.updateTask} deleteTask={props.deleteTask} /> : null}
          {props.viewMode === "lista" ? <ListView tasks={props.tasks} updateTask={props.updateTask} deleteTask={props.deleteTask} /> : null}
          {props.viewMode === "calendario" ? <CalendarView tasks={props.tasks} /> : null}
          {props.viewMode === "gantt" ? <GanttView tasks={props.tasks} /> : null}
        </Card>
      </div>
    </div>
  );
}

function KanbanView({
  tasks,
  updateTask,
  deleteTask,
}: {
  tasks: AtividadeTarefa[];
  updateTask: (task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success?: string) => void;
  deleteTask: (task: AtividadeTarefa) => void;
}) {
  const columns: Array<[string, (task: AtividadeTarefa) => boolean]> = [
    ["Hoje", (task) => (task.prazo ?? task.data_inicio) === todayIso() || task.status === "hoje"],
    ["Amanhã", (task) => (task.prazo ?? task.data_inicio) === addDays(1)],
    ["Semana", (task) => {
      const date = task.prazo ?? task.data_inicio;
      return Boolean(date && date >= todayIso() && date <= addDays(7));
    }],
  ];

  return (
    <div className="grid gap-0 md:grid-cols-3">
      {columns.map(([title, predicate]) => (
        <div key={title} className="min-h-[460px] border-b border-brand-sand/70 p-4 md:border-b-0 md:border-r">
          <h3 className="font-black text-brand-teal">{title}</h3>
          <div className="mt-4 space-y-3">
            {tasks.filter(predicate).map((task) => (
              <TaskCard key={task.id} task={task} updateTask={updateTask} deleteTask={deleteTask} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({
  tasks,
  updateTask,
  deleteTask,
}: {
  tasks: AtividadeTarefa[];
  updateTask: (task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success?: string) => void;
  deleteTask: (task: AtividadeTarefa) => void;
}) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#F0DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Atividade</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Prazo</th>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-sand/70">
          {tasks.map((task) => (
            <tr key={task.id} className={clsx(isLate(task) && "bg-rose-50/50")}>
              <td className="px-4 py-3 font-bold text-brand-teal">{task.titulo}</td>
              <td className="px-4 py-3 text-brand-teal/70">{teamLabel(task.time_responsavel)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{dateLabel(task.prazo)}</td>
              <td className="px-4 py-3"><Badge className={priorityTone(task.prioridade)}>{priorities.find(([value]) => value === task.prioridade)?.[1]}</Badge></td>
              <td className="px-4 py-3"><StatusSelect task={task} updateTask={updateTask} /></td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => deleteTask(task)} className="text-brand-clay hover:text-rose-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ tasks }: { tasks: AtividadeTarefa[] }) {
  const range = Array.from({ length: 31 }, (_, index) => addDays(index));
  return (
    <div className="p-4">
      <h3 className="text-lg font-black text-brand-teal">Calendário operacional</h3>
      <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-lg border border-brand-sand/70">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day} className="bg-brand-cream px-3 py-2 text-center text-xs font-black uppercase text-brand-clay">{day}</div>
        ))}
        {range.map((date) => {
          const dayTasks = tasks.filter((task) => (task.prazo ?? task.data_inicio) === date);
          return (
            <div key={date} className="min-h-28 border-t border-brand-sand/70 p-2">
              <p className="text-xs font-black text-brand-teal/60">{dateLabel(date).slice(0, 5)}</p>
              <div className="mt-2 space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="truncate rounded bg-brand-teal/10 px-2 py-1 text-xs font-bold text-brand-teal" title={task.titulo}>
                    {task.titulo}
                  </div>
                ))}
                {dayTasks.length > 3 ? <p className="text-xs font-bold text-brand-clay">+{dayTasks.length - 3} mais</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GanttView({ tasks }: { tasks: AtividadeTarefa[] }) {
  const days = Array.from({ length: 15 }, (_, index) => addDays(index));
  return (
    <div className="overflow-auto p-4">
      <h3 className="text-lg font-black text-brand-teal">Gantt simples · próximos 15 dias</h3>
      <div className="mt-4 min-w-[980px] overflow-hidden rounded-lg border border-brand-sand/70">
        <div className="grid grid-cols-[280px_repeat(15,minmax(44px,1fr))] bg-brand-cream text-xs font-black uppercase text-brand-clay">
          <div className="border-r border-brand-sand/70 px-3 py-3">Atividade</div>
          {days.map((day) => <div key={day} className="border-r border-brand-sand/70 px-2 py-3 text-center">{dateLabel(day).slice(0, 5)}</div>)}
        </div>
        {tasks.slice(0, 40).map((task) => (
          <div key={task.id} className="grid grid-cols-[280px_repeat(15,minmax(44px,1fr))] border-t border-brand-sand/70">
            <div className="border-r border-brand-sand/70 px-3 py-3 text-sm font-bold text-brand-teal">{task.titulo}</div>
            {days.map((day) => {
              const active = day >= (task.data_inicio ?? task.prazo ?? day) && day <= (task.prazo ?? task.data_inicio ?? day);
              return (
                <div key={day} className="border-r border-brand-sand/70 p-2">
                  {active ? <div className="h-6 rounded bg-brand-clay/35" title={task.titulo} /> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  updateTask,
  deleteTask,
}: {
  task: AtividadeTarefa;
  updateTask: (task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success?: string) => void;
  deleteTask: (task: AtividadeTarefa) => void;
}) {
  return (
    <div className={clsx("rounded-lg border bg-white/75 p-4 shadow-sm", isLate(task) ? "border-rose-200" : "border-brand-sand/70")}>
      <div className="flex flex-wrap gap-2">
        <Badge>{teamLabel(task.time_responsavel)}</Badge>
        <Badge className={priorityTone(task.prioridade)}>{priorities.find(([value]) => value === task.prioridade)?.[1]}</Badge>
        {task.validacao_obrigatoria ? <Badge className="bg-amber-50 text-amber-700">validação</Badge> : null}
      </div>
      <h4 className="mt-3 font-black text-brand-teal">{task.titulo}</h4>
      <p className="mt-1 line-clamp-2 text-sm text-brand-teal/60">{task.descricao}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-brand-teal/55">
        <span>Prazo: {dateLabel(task.prazo)}</span>
        <span>{task.responsavel_nome ?? "Sem responsável"}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusSelect task={task} updateTask={updateTask} />
        <button type="button" onClick={() => deleteTask(task)} className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-clay">
          <Trash2 className="h-3.5 w-3.5" />
          {task.projeto_id ? "Ignorar" : "Excluir"}
        </button>
      </div>
    </div>
  );
}

function StatusSelect({
  task,
  updateTask,
}: {
  task: AtividadeTarefa;
  updateTask: (task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success?: string) => void;
}) {
  return (
    <select
      value={task.status}
      onChange={(event) => {
        const status = event.target.value as AtividadeStatus;
        updateTask(
          task,
          {
            status,
            concluida_at: status === "concluida" ? new Date().toISOString() : null,
          },
          "Status atualizado.",
        );
      }}
      className="h-9 rounded-md border border-brand-sand bg-white/75 px-2 text-xs font-bold text-brand-teal"
    >
      {statuses.map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}

function RecurrencesTab({
  context,
  mutate,
  generateRecurring,
  canWrite,
  isPending,
}: {
  context: AtividadesContext;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
  generateRecurring: () => void;
  canWrite: boolean;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    time_responsavel: "suporte" as AtividadeTime,
    responsavel_nome: "Ryan",
    prioridade: "media" as AtividadePrioridade,
    frequencia: "diaria" as AtividadeRecorrenciaFrequencia,
    dias_semana: [1, 2, 3, 4, 5],
    dia_mes: "",
    proxima_execucao: todayIso(),
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
      {canWrite ? (
        <Card className="p-5">
          <h2 className="text-xl font-bold text-brand-teal">Nova recorrência</h2>
          <div className="mt-4 space-y-3">
            <Field label="Título" value={form.titulo} onChange={(value) => setForm({ ...form, titulo: value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Time" value={form.time_responsavel} onChange={(value) => setForm({ ...form, time_responsavel: value as AtividadeTime })} options={teams} />
              <Field label="Responsável" value={form.responsavel_nome} onChange={(value) => setForm({ ...form, responsavel_nome: value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Frequência" value={form.frequencia} onChange={(value) => setForm({ ...form, frequencia: value as AtividadeRecorrenciaFrequencia })} options={[["diaria", "Diária"], ["semanal", "Semanal"], ["mensal", "Mensal"]]} />
              <Select label="Prioridade" value={form.prioridade} onChange={(value) => setForm({ ...form, prioridade: value as AtividadePrioridade })} options={priorities} />
            </div>
            <Field label="Próxima geração" type="date" value={form.proxima_execucao} onChange={(value) => setForm({ ...form, proxima_execucao: value })} />
            <TextArea label="Descrição" value={form.descricao} onChange={(value) => setForm({ ...form, descricao: value })} />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isPending || !form.titulo.trim()}
                onClick={() =>
                  void mutate(
                    {
                      entity: "recorrencia",
                      action: "create",
                      payload: {
                        ...form,
                        dia_mes: form.dia_mes ? Number(form.dia_mes) : null,
                      },
                    },
                    "Recorrência cadastrada.",
                  )
                }
              >
                Salvar recorrência
              </Button>
              <Button variant="secondary" disabled={isPending} onClick={generateRecurring}>
                Gerar próximos 30 dias
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="text-xl font-bold text-brand-teal">Rotinas configuradas</h2>
        <div className="mt-4 grid gap-3">
          {context.recorrencias.map((item) => (
            <div key={item.id} className="rounded-lg border border-brand-sand/70 bg-white/65 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{teamLabel(item.time_responsavel)}</Badge>
                    <Badge>{item.frequencia}</Badge>
                    <Badge className={priorityTone(item.prioridade)}>{item.prioridade}</Badge>
                  </div>
                  <h3 className="mt-2 font-black text-brand-teal">{item.titulo}</h3>
                  <p className="text-sm text-brand-teal/60">{item.descricao}</p>
                </div>
                <p className="text-sm font-bold text-brand-teal/60">Próxima: {dateLabel(item.proxima_execucao)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TemplatesTab({
  context,
  mutate,
  canAdmin,
  isPending,
}: {
  context: AtividadesContext;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
  canAdmin: boolean;
  isPending: boolean;
}) {
  const [templateTask, setTemplateTask] = useState({
    template_id: context.templates[0]?.id ?? "",
    titulo: "",
    descricao: "",
    time_responsavel: "marketing" as AtividadeTime,
    prioridade: "media" as AtividadePrioridade,
    offset_inicio_dias: "0",
    offset_prazo_dias: "1",
    validacao_obrigatoria: false,
    ordem: "1",
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[0.65fr_1.35fr]">
      {canAdmin ? (
        <Card className="p-5">
          <h2 className="text-xl font-bold text-brand-teal">Adicionar tarefa ao template</h2>
          <div className="mt-4 space-y-3">
            <Select label="Template" value={templateTask.template_id} onChange={(value) => setTemplateTask({ ...templateTask, template_id: value })} options={context.templates.map((item) => [item.id, item.nome] as [string, string])} />
            <Field label="Título da tarefa" value={templateTask.titulo} onChange={(value) => setTemplateTask({ ...templateTask, titulo: value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Time" value={templateTask.time_responsavel} onChange={(value) => setTemplateTask({ ...templateTask, time_responsavel: value as AtividadeTime })} options={teams} />
              <Select label="Prioridade" value={templateTask.prioridade} onChange={(value) => setTemplateTask({ ...templateTask, prioridade: value as AtividadePrioridade })} options={priorities} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Ordem" type="number" value={templateTask.ordem} onChange={(value) => setTemplateTask({ ...templateTask, ordem: value })} />
              <Field label="Início D+" type="number" value={templateTask.offset_inicio_dias} onChange={(value) => setTemplateTask({ ...templateTask, offset_inicio_dias: value })} />
              <Field label="Prazo D+" type="number" value={templateTask.offset_prazo_dias} onChange={(value) => setTemplateTask({ ...templateTask, offset_prazo_dias: value })} />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-brand-teal">
              <input type="checkbox" checked={templateTask.validacao_obrigatoria} onChange={(event) => setTemplateTask({ ...templateTask, validacao_obrigatoria: event.target.checked })} />
              Exigir validação final
            </label>
            <TextArea label="Descrição" value={templateTask.descricao} onChange={(value) => setTemplateTask({ ...templateTask, descricao: value })} />
            <Button
              disabled={isPending || !templateTask.titulo.trim()}
              onClick={() =>
                void mutate(
                  {
                    entity: "template_tarefa",
                    action: "create",
                    payload: {
                      ...templateTask,
                      offset_inicio_dias: Number(templateTask.offset_inicio_dias),
                      offset_prazo_dias: Number(templateTask.offset_prazo_dias),
                      ordem: Number(templateTask.ordem),
                    },
                  },
                  "Tarefa adicionada ao template.",
                )
              }
            >
              Adicionar ao template
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="text-xl font-bold text-brand-teal">Templates de projeto</h2>
        <div className="mt-4 space-y-4">
          {context.templates.map((template) => (
            <div key={template.id} className="rounded-lg border border-brand-sand/70 bg-white/65 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge>{categoryLabels[template.categoria]}</Badge>
                  <h3 className="mt-2 text-lg font-black text-brand-teal">{template.nome}</h3>
                  <p className="text-sm text-brand-teal/60">{template.descricao}</p>
                </div>
                <p className="text-sm font-bold text-brand-teal/60">{template.duracao_dias} dias</p>
              </div>
              <div className="mt-4 space-y-2">
                {context.templateTarefas.filter((task) => task.template_id === template.id).map((task) => (
                  <div key={task.id} className="grid gap-2 rounded-md border border-brand-sand/60 bg-white/70 p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                    <Badge>{task.ordem}</Badge>
                    <div>
                      <p className="font-bold text-brand-teal">{task.titulo}</p>
                      <p className="text-xs text-brand-teal/55">{teamLabel(task.time_responsavel)} · D+{task.offset_inicio_dias} até D+{task.offset_prazo_dias}</p>
                    </div>
                    <Badge className={priorityTone(task.prioridade)}>{task.prioridade}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ManagementTab({
  context,
  tasks,
  updateTask,
}: {
  context: AtividadesContext;
  tasks: AtividadeTarefa[];
  updateTask: (task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success?: string) => void;
}) {
  const marketingTasks = tasks.filter((task) => task.time_responsavel === "marketing" && !["concluida", "cancelada", "ignorada"].includes(task.status));
  const late = marketingTasks.filter(isLate);
  const validation = marketingTasks.filter((task) => task.status === "aguardando_validacao");
  const next = marketingTasks
    .filter((task) => {
      const date = task.prazo ?? task.data_inicio;
      return date && date >= todayIso() && date <= addDays(7);
    })
    .slice(0, 12);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Marketing aberto" value={marketingTasks.length} detail="tarefas em cobrança" icon={Megaphone} />
        <MetricCard label="Atrasadas" value={late.length} detail="levar para a reunião" icon={AlertTriangle} tone={late.length ? "bad" : "good"} />
        <MetricCard label="Em validação" value={validation.length} detail="dependem da Ju/Admin" icon={ShieldCheck} tone="warn" />
        <MetricCard label="Projetos ativos" value={context.projetos.filter((project) => project.time_responsavel === "marketing" || project.categoria !== "operacao").length} detail="com relação ao marketing" icon={Flag} />
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-5 w-5 text-brand-clay" />
          <div>
            <h2 className="text-xl font-bold text-brand-teal">Gestão à Vista · Reunião Marketing</h2>
            <p className="text-sm text-brand-teal/60">Use esta tela para cobrar pendências, validar entregas e registrar o que precisa avançar.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <MeetingColumn title="Atrasadas" tasks={late} updateTask={updateTask} />
          <MeetingColumn title="Aguardando validação" tasks={validation} updateTask={updateTask} />
          <MeetingColumn title="Próximos 7 dias" tasks={next} updateTask={updateTask} />
        </div>
      </Card>
    </div>
  );
}

function MeetingColumn({
  title,
  tasks,
  updateTask,
}: {
  title: string;
  tasks: AtividadeTarefa[];
  updateTask: (task: AtividadeTarefa, patch: Partial<AtividadeTarefa>, success?: string) => void;
}) {
  return (
    <div className="rounded-lg border border-brand-sand/70 bg-white/55 p-4">
      <h3 className="font-black text-brand-teal">{title}</h3>
      <div className="mt-3 space-y-3">
        {tasks.length ? tasks.map((task) => (
          <div key={task.id} className="rounded-md border border-brand-sand/70 bg-white/70 p-3">
            <div className="flex flex-wrap gap-2">
              <Badge className={priorityTone(task.prioridade)}>{task.prioridade}</Badge>
              <Badge className={statusTone(task.status)}>{statusLabel(task.status)}</Badge>
            </div>
            <p className="mt-2 font-black text-brand-teal">{task.titulo}</p>
            <p className="text-xs font-semibold text-brand-teal/55">Prazo {dateLabel(task.prazo)} · {task.responsavel_nome ?? "sem responsável"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="h-9 px-3 text-xs" variant="secondary" onClick={() => updateTask(task, { status: "aguardando_validacao" })}>Validar</Button>
              <Button className="h-9 px-3 text-xs" variant="secondary" onClick={() => updateTask(task, { status: "concluida", concluida_at: new Date().toISOString() })}>Concluir</Button>
            </div>
          </div>
        )) : <p className="text-sm text-brand-teal/55">Nada para tratar.</p>}
      </div>
    </div>
  );
}

function AdminTab({ context }: { context: AtividadesContext }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-xl font-bold text-brand-teal">Regras do módulo</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-brand-teal/70">
          <p><strong>Times:</strong> Marketing, Suporte, Especialista e Gestão/Dados.</p>
          <p><strong>Validação:</strong> tarefas marcadas com validação obrigatória podem ficar em “Aguardando validação” antes de concluídas.</p>
          <p><strong>Exclusão:</strong> tarefas de projeto devem ser ignoradas/canceladas para preservar histórico.</p>
          <p><strong>Recorrências:</strong> podem ser geradas para os próximos 30 dias e editadas/canceladas depois.</p>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-xl font-bold text-brand-teal">Logs recentes</h2>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
          {context.logs.map((log) => (
            <div key={log.id} className="rounded-md border border-brand-sand/70 bg-white/60 p-3">
              <p className="text-sm font-black text-brand-teal">{log.acao} · {log.entidade}</p>
              <p className="text-xs text-brand-teal/60">{log.descricao ?? "Sem descrição"} · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(log.created_at))}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex rounded-full border border-brand-sand/60 bg-brand-cream px-2.5 py-1 text-xs font-black text-brand-teal", className)}>
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
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

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-brand-teal">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-md border border-brand-sand bg-white/75 px-3 py-3 text-sm font-semibold text-brand-teal outline-none transition focus:border-brand-clay"
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

  if (compact) return input;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-brand-teal">{label}</span>
      {input}
    </label>
  );
}
