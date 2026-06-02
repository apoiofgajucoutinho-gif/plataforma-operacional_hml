"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  Clock3,
  List,
  Lightbulb,
  GraduationCap,
  MapPin,
  Maximize2,
  Minimize2,
  Pencil,
  Stethoscope,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  AgendaEvent,
  AgendaEventInput,
  AgendaEventStatus,
  AgendaEventType,
} from "@/modules/agenda/types";

const eventTypes: Array<{ value: AgendaEventType; label: string }> = [
  { value: "paciente", label: "Paciente" },
  { value: "palestra", label: "Palestra" },
  { value: "aula", label: "Aula" },
  { value: "interno", label: "Interno" },
];

const eventStatuses: Array<{ value: AgendaEventStatus; label: string }> = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "concluido", label: "Concluido" },
  { value: "cancelado", label: "Cancelado" },
];

const typeStyles: Record<AgendaEventType, string> = {
  paciente: "agenda-type-badge agenda-type-paciente",
  palestra: "agenda-type-badge agenda-type-palestra",
  aula: "agenda-type-badge agenda-type-aula",
  interno: "agenda-type-badge agenda-type-interno",
};

const typeMetrics: Array<{
  value: AgendaEventType;
  label: string;
  Icon: typeof Stethoscope;
  className: string;
}> = [
  {
    value: "paciente",
    label: "Pacientes",
    Icon: Stethoscope,
    className: "bg-[#EAF6F4] text-brand-teal",
  },
  {
    value: "palestra",
    label: "Palestras",
    Icon: BriefcaseBusiness,
    className: "bg-[#F3E8DD] text-[#7A4E32]",
  },
  {
    value: "aula",
    label: "Aulas",
    Icon: GraduationCap,
    className: "bg-[#EAF2FA] text-brand-teal",
  },
  {
    value: "interno",
    label: "Internos",
    Icon: BookOpen,
    className: "bg-brand-cream text-brand-teal",
  },
];

type TimelineFilter = "today" | "next7" | "month";
type TimelineView = "calendar" | "list" | "gantt";

function toDateInputValue(date: Date) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function defaultBusinessStart() {
  const date = new Date();
  date.setHours(8, 0, 0, 0);
  return date;
}

function endAfterStart(startValue: string) {
  return toDateInputValue(addHours(new Date(startValue), 1));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCompactDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBaseDateTime(value: string | null | undefined) {
  if (!value) return "Sem atualizacao registrada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toMonthInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function isSameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

function isWithinNextDays(date: Date, days: number) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + days);
  end.setHours(23, 59, 59, 999);

  return date >= now && date <= end;
}

function isSameMonth(date: Date, monthValue: string) {
  return toMonthInputValue(date) === monthValue;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function sortEvents(events: AgendaEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );
}

function overlapsAgendaEvent(event: AgendaEvent, payload: AgendaEventInput) {
  if (event.status === "cancelado") return false;

  const existingStart = new Date(event.inicio).getTime();
  const existingEnd = new Date(event.fim).getTime();
  const nextStart = new Date(payload.inicio).getTime();
  const nextEnd = new Date(payload.fim).getTime();

  return existingStart < nextEnd && existingEnd > nextStart;
}

function getEventFormValues(form: HTMLFormElement): AgendaEventInput {
  const formData = new FormData(form);

  return {
    titulo: String(formData.get("titulo") ?? ""),
    tipo: String(formData.get("tipo") ?? "paciente") as AgendaEventType,
    status: String(formData.get("status") ?? "agendado") as AgendaEventStatus,
    inicio: new Date(String(formData.get("inicio"))).toISOString(),
    fim: new Date(String(formData.get("fim"))).toISOString(),
    local: String(formData.get("local") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
  };
}

export function AgendaBoard({
  initialEvents,
  tenantName,
  isTenantReady,
  currentUser,
  diagnostic,
  updatedAt,
}: {
  initialEvents: AgendaEvent[];
  tenantName: string;
  isTenantReady: boolean;
  currentUser: {
    id: string;
    email: string | null;
  };
  diagnostic: string | null;
  updatedAt?: string | null;
}) {
  const [events, setEvents] = useState(sortEvents(initialEvents));
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("next7");
  const [timelineView, setTimelineView] = useState<TimelineView>("calendar");
  const [selectedMonth, setSelectedMonth] = useState(toMonthInputValue(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const defaultStart = useMemo(() => toDateInputValue(defaultBusinessStart()), []);
  const defaultEnd = useMemo(() => endAfterStart(defaultStart), [defaultStart]);
  const [formStart, setFormStart] = useState(defaultStart);
  const [formEnd, setFormEnd] = useState(defaultEnd);

  useEffect(() => {
    if (editingEvent) {
      const nextStart = toDateInputValue(new Date(editingEvent.inicio));
      const nextEnd = toDateInputValue(new Date(editingEvent.fim));
      setFormStart(nextStart);
      setFormEnd(new Date(nextEnd) > new Date(nextStart) ? nextEnd : endAfterStart(nextStart));
      return;
    }

    setFormStart(defaultStart);
    setFormEnd(defaultEnd);
  }, [defaultEnd, defaultStart, editingEvent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isTenantReady) {
      setMessage("Vincule seu usuario a um tenant antes de salvar eventos.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload = getEventFormValues(event.currentTarget);
    if (new Date(payload.fim) <= new Date(payload.inicio)) {
      setMessage("A data/hora final precisa ser depois do inicio.");
      setIsSaving(false);
      return;
    }

    const conflict = events.find(
      (item) => item.id !== editingEvent?.id && overlapsAgendaEvent(item, payload),
    );

    if (conflict) {
      setMessage(`Já existe um agendamento nesse horário: ${conflict.titulo} em ${formatDateTime(conflict.inicio)}.`);
      setIsSaving(false);
      return;
    }

    const endpoint = editingEvent
      ? `/api/agenda/events/${editingEvent.id}`
      : "/api/agenda/events";

    try {
      const response = await fetch(endpoint, {
        method: editingEvent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        event?: AgendaEvent;
        error?: string;
        googleSync?: {
          ok: boolean;
          error?: string | null;
          googleEventId?: string | null;
          accountEmail?: string | null;
        };
      };

      if (!response.ok || !result.event) {
        throw new Error(result.error ?? "Nao foi possivel salvar o evento.");
      }

      setEvents((current) => {
        const nextEvents = editingEvent
          ? current.map((item) => (item.id === result.event!.id ? result.event! : item))
          : [...current, result.event!];

        return sortEvents(nextEvents);
      });
      setEditingEvent(null);
      setFormStart(defaultStart);
      setFormEnd(defaultEnd);
      const googleMessage = result.googleSync?.ok
        ? " Google Agenda sincronizado."
        : ` Google Agenda pendente: ${result.googleSync?.error ?? "revise a conexao OAuth."}`;

      setMessage(`${editingEvent ? "Agendamento atualizado." : "Evento salvo no banco."}${googleMessage}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar evento.");
    } finally {
      setIsSaving(false);
    }
  }

  const formDefaults = editingEvent
    ? {
        titulo: editingEvent.titulo,
        tipo: editingEvent.tipo,
        status: editingEvent.status,
        inicio: toDateInputValue(new Date(editingEvent.inicio)),
        fim: toDateInputValue(new Date(editingEvent.fim)),
        local: editingEvent.local ?? "",
        descricao: editingEvent.descricao ?? "",
      }
    : {
        titulo: "",
        tipo: "paciente" as AgendaEventType,
        status: "agendado" as AgendaEventStatus,
        inicio: formStart,
        fim: formEnd,
        local: "",
        descricao: "",
      };

  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.inicio);

    return eventDate >= new Date() && event.status !== "cancelado";
  });
  const todayEvents = upcomingEvents.filter((event) =>
    isSameDay(new Date(event.inicio), new Date()),
  );
  const nextSevenDaysEvents = upcomingEvents.filter((event) =>
    isWithinNextDays(new Date(event.inicio), 7),
  );
  const monthEvents = events.filter((event) =>
    isSameMonth(new Date(event.inicio), selectedMonth),
  );
  const visibleTimelineEvents =
    timelineFilter === "today"
      ? todayEvents
      : timelineFilter === "next7"
        ? nextSevenDaysEvents
        : monthEvents;
  const nextEvent = upcomingEvents[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-clay">{tenantName}</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-teal sm:text-4xl">
            Agenda operacional
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-teal/70">
            Eventos de pacientes, palestras e aulas com base multiempresa, responsividade
            e controle operacional desde o primeiro modulo.
          </p>
        </div>
        <p className="rounded-md bg-white/45 px-3 py-2 text-xs font-semibold text-brand-teal/55 sm:mt-12 sm:text-right">
          Base atualizada em {formatBaseDateTime(updatedAt)}
        </p>
      </header>

      {!isTenantReady ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-brand-teal">
            Seu usuario ainda nao esta vinculado a um tenant.
          </p>
          <p className="mt-1 text-sm text-brand-teal/70">
            Crie o tenant inicial pela migration e vincule o usuario em tenant_members.
          </p>
          <div className="mt-4 space-y-2 rounded-md bg-brand-cream p-3 text-sm text-brand-teal">
            <p className="font-semibold">Usuario logado neste ambiente:</p>
            <p className="break-all">Email: {currentUser.email ?? "sem email"}</p>
            <p className="break-all">User ID: {currentUser.id}</p>
            {diagnostic ? (
              <p className="break-all text-brand-clay">Diagnostico: {diagnostic}</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        {typeMetrics.map(({ value, label, Icon, className }) => (
          <Metric
            key={value}
            label={label}
            value={events.filter((event) => event.tipo === value).length}
            icon={<Icon className="h-5 w-5" />}
            className={className}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-teal">Proximos eventos</h2>
              <p className="mt-1 text-sm text-brand-teal/70">
                Hoje, proximos 7 dias e mes selecionado para acompanhamento rapido.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center md:min-w-[360px]">
              <MiniMetric label="Hoje" value={todayEvents.length} />
              <MiniMetric label="7 dias" value={nextSevenDaysEvents.length} />
              <MiniMetric label="Mes" value={monthEvents.length} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(nextSevenDaysEvents.length > 0 ? nextSevenDaysEvents.slice(0, 3) : upcomingEvents.slice(0, 3)).map(
              (event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-brand-sand/70 bg-white/70 p-3"
                >
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-bold ${typeStyles[event.tipo]}`}
                  >
                    {event.tipo}
                  </span>
                  <p className="mt-3 truncate text-sm font-semibold text-brand-teal">
                    {event.titulo}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand-teal/60">
                    {formatCompactDateTime(event.inicio)}
                  </p>
                </div>
              ),
            )}
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-brand-teal/70">
                Nenhum evento futuro cadastrado.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-teal text-white">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-brand-teal">Insight de lembrete</h2>
              <p className="mt-2 text-sm leading-6 text-brand-teal/70">
                {nextEvent
                  ? `Proximo evento: ${nextEvent.titulo}, ${formatDateTime(nextEvent.inicio)}${nextEvent.local ? ` em ${nextEvent.local}` : ""}.`
                  : "Sem eventos futuros no periodo carregado. Cadastre o proximo compromisso para manter a rotina visivel."}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-teal text-white">
                {editingEvent ? <Pencil className="h-5 w-5" /> : <CalendarPlus className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-brand-teal">
                  {editingEvent ? "Editar evento" : "Novo evento"}
                </h2>
                <p className="text-sm text-brand-teal/70">
                  {editingEvent ? "Atualiza o agendamento selecionado." : "Salva no banco primeiro."}
                </p>
              </div>
            </div>
            {editingEvent ? (
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setMessage(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-md text-brand-teal transition hover:bg-brand-cream"
                aria-label="Cancelar edicao"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <form key={editingEvent?.id ?? "new"} onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field
              label="Titulo"
              name="titulo"
              placeholder="Consulta, aula ou palestra"
              initialValue={formDefaults.titulo}
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Tipo" name="tipo" options={eventTypes} initialValue={formDefaults.tipo} />
              <Field label="Local" name="local" placeholder="Sala, online..." initialValue={formDefaults.local} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Field
                label="Inicio"
                name="inicio"
                type="datetime-local"
                value={formStart}
                onChange={(value) => {
                  setFormStart(value);
                  if (new Date(formEnd) <= new Date(value)) {
                    setFormEnd(endAfterStart(value));
                  }
                }}
              />
              <Field
                label="Fim"
                name="fim"
                type="datetime-local"
                value={formEnd}
                min={formStart}
                onChange={(value) => setFormEnd(value)}
              />
            </div>
            <SelectField
              label="Status"
              name="status"
              options={eventStatuses}
              initialValue={formDefaults.status}
            />
            <label className="space-y-1 text-sm font-semibold text-brand-teal">
              Observacoes
              <textarea
                name="descricao"
                rows={4}
                defaultValue={formDefaults.descricao}
                className="w-full resize-none rounded-md border border-brand-sand bg-white px-3 py-2 outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
                placeholder="Detalhes operacionais do compromisso"
              />
            </label>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving
                ? "Salvando..."
                : editingEvent
                  ? "Salvar alteracoes"
                  : isTenantReady
                    ? "Salvar evento"
                    : "Vincular tenant para salvar"}
            </Button>
            {editingEvent ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setEditingEvent(null);
                  setMessage(null);
                }}
              >
                Cancelar edicao
              </Button>
            ) : null}
            {message ? <p className="text-sm text-brand-teal/75">{message}</p> : null}
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-brand-sand/70 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-semibold text-brand-teal">Linha do tempo</h2>
              <div className="flex flex-wrap items-center gap-2">
                <FilterButton
                  isActive={timelineView === "calendar"}
                  onClick={() => setTimelineView("calendar")}
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendario
                </FilterButton>
                <FilterButton
                  isActive={timelineView === "list"}
                  onClick={() => setTimelineView("list")}
                >
                  <List className="h-4 w-4" />
                  Lista
                </FilterButton>
                <FilterButton
                  isActive={timelineView === "gantt"}
                  onClick={() => setTimelineView("gantt")}
                >
                  <BarChart3 className="h-4 w-4" />
                  Gantt
                </FilterButton>
                <span className="mx-1 hidden h-7 w-px bg-brand-sand/70 sm:block" />
                <FilterButton
                  isActive={timelineFilter === "today"}
                  onClick={() => setTimelineFilter("today")}
                >
                  Hoje
                </FilterButton>
                <FilterButton
                  isActive={timelineFilter === "next7"}
                  onClick={() => setTimelineFilter("next7")}
                >
                  Proximos 7d
                </FilterButton>
                <FilterButton
                  isActive={timelineFilter === "month"}
                  onClick={() => setTimelineFilter("month")}
                >
                  Mes
                </FilterButton>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value);
                    setTimelineFilter("month");
                  }}
                  className="h-10 rounded-md border border-brand-sand bg-white px-3 text-sm font-semibold text-brand-teal outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
                />
              </div>
            </div>
          </div>
          {timelineView === "calendar" ? (
            <CalendarView
              events={visibleTimelineEvents}
              selectedMonth={selectedMonth}
              onEdit={(event) => {
                setEditingEvent(event);
                setMessage(null);
              }}
            />
          ) : timelineView === "gantt" ? (
            <GanttView events={visibleTimelineEvents} />
          ) : (
            <ListView
              events={visibleTimelineEvents}
              onEdit={(event) => {
                setEditingEvent(event);
                setMessage(null);
              }}
            />
          )}
        </Card>
      </section>
    </div>
  );
}

function ListView({
  events,
  onEdit,
}: {
  events: AgendaEvent[];
  onEdit: (event: AgendaEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-brand-teal/70">
        Nenhum evento encontrado para este filtro.
      </p>
    );
  }

  return (
    <div className="divide-y divide-brand-sand/60">
      {events.map((event) => (
        <article
          key={event.id}
          className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"
        >
          <EventSummary event={event} />
          <Button type="button" variant="secondary" onClick={() => onEdit(event)} className="md:w-32">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </article>
      ))}
    </div>
  );
}

function EventSummary({ event }: { event: AgendaEvent }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${typeStyles[event.tipo]}`}>
          {event.tipo}
        </span>
        <span className="text-xs font-semibold uppercase text-brand-teal/50">
          {event.status}
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-brand-teal">{event.titulo}</h3>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-brand-teal/70">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" />
          {formatDateTime(event.inicio)}
        </span>
        {event.local ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {event.local}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CalendarView({
  events,
  selectedMonth,
  onEdit,
}: {
  events: AgendaEvent[];
  selectedMonth: string;
  onEdit: (event: AgendaEvent) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [year, month] = selectedMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingDays = firstDay.getDay();
  const cells = Array.from({ length: Math.ceil((leadingDays + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - leadingDays + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const today = new Date();

  const renderCalendar = () => (
    <div className={isExpanded ? "p-3 sm:p-5" : "p-4"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold capitalize text-brand-teal">
          {monthLabel(selectedMonth)}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-brand-teal/55">
            {events.length} eventos no filtro
          </span>
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3 text-xs"
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isExpanded ? "Reduzir" : "Expandir"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-brand-sand/70 text-sm">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
          <div
            key={day}
            className="bg-brand-cream px-2 py-2 text-center text-xs font-black uppercase text-brand-clay"
          >
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          const cellDate = day ? new Date(year, month - 1, day) : null;
          const allDayEvents = cellDate
            ? events.filter((event) => isSameDay(new Date(event.inicio), cellDate))
            : [];
          const dayEvents = allDayEvents.slice(0, isExpanded ? 8 : 3);
          const isToday = cellDate ? isSameDay(cellDate, today) : false;

          return (
            <div
              key={`${day ?? "empty"}-${index}`}
              className={`${isExpanded ? "min-h-[150px] sm:min-h-[175px]" : "min-h-[112px]"} border-t border-brand-sand/70 bg-white/75 p-2`}
            >
              {day ? (
                <>
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${isToday ? "bg-brand-clay text-white" : "text-brand-teal/65"}`}>
                    {day}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-xs font-bold ${isExpanded ? "whitespace-normal break-words leading-snug" : "truncate"} ${typeStyles[event.tipo]}`}
                        title={`${event.titulo} - ${formatDateTime(event.inicio)}`}
                      >
                        {event.titulo}
                      </button>
                    ))}
                    {allDayEvents.length > dayEvents.length ? (
                      <button
                        type="button"
                        className="px-2 text-left text-xs font-semibold text-brand-clay hover:underline"
                        onClick={() => setIsExpanded(true)}
                      >
                        +{allDayEvents.length - dayEvents.length} mais
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
      {events.length === 0 ? (
        <p className="px-1 py-6 text-sm text-brand-teal/70">
          Nenhum evento encontrado para este filtro.
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      {isExpanded ? (
        <div className="fixed inset-3 z-50 overflow-auto rounded-xl border border-brand-sand/70 bg-brand-cream/95 shadow-soft backdrop-blur">
          {renderCalendar()}
        </div>
      ) : (
        renderCalendar()
      )}

      {selectedEvent ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-xl border border-brand-sand bg-white p-5 shadow-soft dark:border-slate-600 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className={`mb-3 inline-flex rounded-md px-2 py-1 text-xs font-bold ${typeStyles[selectedEvent.tipo]}`}>
                  {eventTypes.find((type) => type.value === selectedEvent.tipo)?.label ?? selectedEvent.tipo}
                </span>
                <h4 className="text-xl font-black text-brand-teal dark:text-slate-50">
                  {selectedEvent.titulo}
                </h4>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-brand-teal/60 hover:bg-brand-cream dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setSelectedEvent(null)}
                aria-label="Fechar detalhes"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm font-semibold text-brand-teal/75 dark:text-slate-300">
              <p>
                <span className="font-black text-brand-teal dark:text-slate-100">Inicio:</span>{" "}
                {formatDateTime(selectedEvent.inicio)}
              </p>
              <p>
                <span className="font-black text-brand-teal dark:text-slate-100">Fim:</span>{" "}
                {formatDateTime(selectedEvent.fim)}
              </p>
              {selectedEvent.local ? (
                <p>
                  <span className="font-black text-brand-teal dark:text-slate-100">Local:</span>{" "}
                  {selectedEvent.local}
                </p>
              ) : null}
              <p>
                <span className="font-black text-brand-teal dark:text-slate-100">Status:</span>{" "}
                {selectedEvent.status}
              </p>
              {selectedEvent.descricao ? (
                <p className="whitespace-pre-wrap rounded-lg bg-brand-cream p-3 dark:bg-slate-800">
                  {selectedEvent.descricao}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setSelectedEvent(null)}>
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const event = selectedEvent;
                  setSelectedEvent(null);
                  onEdit(event);
                }}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function GanttView({ events }: { events: AgendaEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-brand-teal/70">
        Nenhum evento encontrado para este filtro.
      </p>
    );
  }

  const sorted = sortEvents(events);
  const start = new Date(sorted[0].inicio);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sorted[sorted.length - 1].fim);
  end.setHours(0, 0, 0, 0);
  const totalDays = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1);
  const days = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <div className="overflow-x-auto p-4">
      <div className="min-w-[900px] overflow-hidden rounded-lg border border-brand-sand/70">
        <div className="grid bg-brand-cream text-xs font-black uppercase text-brand-clay" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(42px, 1fr))` }}>
          <div className="border-r border-brand-sand/70 px-3 py-3">Evento</div>
          {days.map((day) => (
            <div key={day.toISOString()} className="border-r border-brand-sand/50 px-2 py-3 text-center">
              {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(day)}
            </div>
          ))}
        </div>
        {sorted.map((event) => {
          const eventStart = new Date(event.inicio);
          eventStart.setHours(0, 0, 0, 0);
          const eventEnd = new Date(event.fim);
          eventEnd.setHours(0, 0, 0, 0);
          const offset = Math.max(Math.round((eventStart.getTime() - start.getTime()) / 86400000), 0);
          const span = Math.max(Math.round((eventEnd.getTime() - eventStart.getTime()) / 86400000) + 1, 1);

          return (
            <div key={event.id} className="grid border-t border-brand-sand/70 text-sm" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(42px, 1fr))` }}>
              <div className="truncate border-r border-brand-sand/70 px-3 py-3 font-semibold text-brand-teal" title={event.titulo}>
                {event.titulo}
              </div>
              <div className="relative col-span-full col-start-2 grid min-h-[48px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(42px, 1fr))` }}>
                {days.map((day) => <div key={day.toISOString()} className="border-r border-brand-sand/40" />)}
                <div
                  className={`absolute top-3 h-6 rounded-md border px-2 text-xs font-bold leading-6 ${typeStyles[event.tipo]}`}
                  style={{
                    left: `${(offset / days.length) * 100}%`,
                    width: `${(Math.min(span, days.length - offset) / days.length) * 100}%`,
                  }}
                  title={`${event.titulo} - ${formatDateTime(event.inicio)}`}
                >
                  <span className="block truncate">{event.titulo}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  initialValue,
  value,
  min,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  initialValue?: string;
  value?: string;
  min?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm font-semibold text-brand-teal">
      {label}
      <input
        name={name}
        type={type}
        required={name !== "local"}
        placeholder={placeholder}
        min={min}
        defaultValue={initialValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="h-11 w-full rounded-md border border-brand-sand bg-white px-3 outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
      />
    </label>
  );
}

function SelectField<TValue extends string>({
  label,
  name,
  options,
  initialValue,
}: {
  label: string;
  name: string;
  options: Array<{ value: TValue; label: string }>;
  initialValue: TValue;
}) {
  return (
    <label className="space-y-1 text-sm font-semibold text-brand-teal">
      {label}
      <select
        name={name}
        defaultValue={initialValue}
        className="h-11 w-full rounded-md border border-brand-sand bg-white px-3 outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterButton({
  children,
  isActive,
  onClick,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition ${
        isActive
          ? "bg-brand-teal text-white"
          : "border border-brand-sand bg-white text-brand-teal hover:bg-brand-cream"
      }`}
    >
      {children}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-brand-cream px-3 py-2">
      <p className="text-xs font-semibold uppercase text-brand-teal/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-brand-teal">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  className: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-teal/70">{label}</p>
        <span className={`agenda-metric-icon flex h-9 w-9 items-center justify-center rounded-md ${className}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-brand-teal">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-brand-teal/50">
        eventos ativos
      </p>
    </Card>
  );
}
