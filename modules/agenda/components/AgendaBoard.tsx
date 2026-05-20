"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AgendaEvent, AgendaEventInput, AgendaEventType } from "@/modules/agenda/types";

const eventTypes: Array<{ value: AgendaEventType; label: string }> = [
  { value: "paciente", label: "Paciente" },
  { value: "palestra", label: "Palestra" },
  { value: "aula", label: "Aula" },
  { value: "interno", label: "Interno" },
];

const typeStyles: Record<AgendaEventType, string> = {
  paciente: "bg-[#EAF6F4] text-brand-teal",
  palestra: "bg-[#F3E8DD] text-[#7A4E32]",
  aula: "bg-[#EAF2FA] text-brand-teal",
  interno: "bg-brand-cream text-brand-teal",
};

function toDateInputValue(date: Date) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
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

export function AgendaBoard({
  initialEvents,
  tenantName,
  isTenantReady,
}: {
  initialEvents: AgendaEvent[];
  tenantName: string;
  isTenantReady: boolean;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [isCreating, setIsCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const defaultStart = useMemo(() => toDateInputValue(new Date(Date.now() + 3600000)), []);
  const defaultEnd = useMemo(() => toDateInputValue(new Date(Date.now() + 7200000)), []);

  async function handleCreate(formData: FormData) {
    setIsCreating(true);
    setMessage(null);

    const payload: AgendaEventInput = {
      titulo: String(formData.get("titulo") ?? ""),
      tipo: String(formData.get("tipo") ?? "paciente") as AgendaEventType,
      inicio: new Date(String(formData.get("inicio"))).toISOString(),
      fim: new Date(String(formData.get("fim"))).toISOString(),
      local: String(formData.get("local") ?? ""),
      descricao: String(formData.get("descricao") ?? ""),
    };

    try {
      const response = await fetch("/api/agenda/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { event?: AgendaEvent; error?: string };

      if (!response.ok || !result.event) {
        throw new Error(result.error ?? "Nao foi possivel criar o evento.");
      }

      setEvents((current) =>
        [...current, result.event!].sort(
          (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
        ),
      );
      setMessage("Evento salvo no banco.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao criar evento.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSync(eventId: string) {
    setSyncingId(eventId);
    setMessage(null);

    try {
      const response = await fetch("/api/agenda/events/sync-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const result = (await response.json()) as {
        googleEvent?: { id: string };
        error?: string;
      };

      if (!response.ok || !result.googleEvent) {
        throw new Error(result.error ?? "Nao foi possivel sincronizar.");
      }

      setEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? { ...event, google_event_id: result.googleEvent!.id }
            : event,
        ),
      );
      setMessage("Evento sincronizado com Google Calendar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao sincronizar.");
    } finally {
      setSyncingId(null);
    }
  }

  const todayEvents = events.filter((event) => {
    const date = new Date(event.inicio);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-brand-clay">{tenantName}</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-teal sm:text-4xl">
            Agenda operacional
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-teal/70">
            Eventos de pacientes, palestras e aulas com base multiempresa e preparo para
            sincronizacao com Google Agenda.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-brand-teal">
          <CheckCircle2 className="h-4 w-4 text-brand-clay" />
          DEV conectado a Supabase
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/75 px-4 py-3">
        <p className="text-sm font-semibold text-brand-teal">
          Google Agenda preparado via OAuth por tenant.
        </p>
        <a
          href="/api/google/connect"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-sand bg-white px-3 text-sm font-semibold text-brand-teal transition hover:bg-brand-cream"
        >
          <ExternalLink className="h-4 w-4" />
          Conectar Google
        </a>
      </div>

      {!isTenantReady ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-brand-teal">
            Seu usuario ainda nao esta vinculado a um tenant.
          </p>
          <p className="mt-1 text-sm text-brand-teal/70">
            Crie o tenant inicial pela migration e vincule o usuario em tenant_members.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-teal text-white">
              <CalendarPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-brand-teal">Novo evento</h2>
              <p className="text-sm text-brand-teal/70">Salva no banco primeiro.</p>
            </div>
          </div>

          <form action={handleCreate} className="mt-5 space-y-4">
            <Field label="Titulo" name="titulo" placeholder="Consulta, aula ou palestra" />
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-semibold text-brand-teal">
                Tipo
                <select
                  name="tipo"
                  className="h-11 w-full rounded-md border border-brand-sand bg-white px-3 outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
                >
                  {eventTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Local" name="local" placeholder="Sala, online..." />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Inicio" name="inicio" type="datetime-local" defaultValue={defaultStart} />
              <Field label="Fim" name="fim" type="datetime-local" defaultValue={defaultEnd} />
            </div>
            <label className="space-y-1 text-sm font-semibold text-brand-teal">
              Observacoes
              <textarea
                name="descricao"
                rows={4}
                className="w-full resize-none rounded-md border border-brand-sand bg-white px-3 py-2 outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
                placeholder="Detalhes operacionais do compromisso"
              />
            </label>
            <Button type="submit" className="w-full" disabled={!isTenantReady || isCreating}>
              {isCreating ? "Salvando..." : "Salvar evento"}
            </Button>
            {message ? <p className="text-sm text-brand-teal/75">{message}</p> : null}
          </form>
        </Card>

        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            <Metric label="Hoje" value={todayEvents.length} />
            <Metric label="Proximos 7 dias" value={events.length} />
            <Metric
              label="Google"
              value={events.filter((event) => event.google_event_id).length}
            />
          </section>

          <Card className="overflow-hidden">
            <div className="border-b border-brand-sand/70 px-5 py-4">
              <h2 className="text-lg font-semibold text-brand-teal">Linha do tempo</h2>
            </div>
            <div className="divide-y divide-brand-sand/60">
              {events.length === 0 ? (
                <p className="px-5 py-8 text-sm text-brand-teal/70">
                  Nenhum evento cadastrado ainda.
                </p>
              ) : (
                events.map((event) => (
                  <article
                    key={event.id}
                    className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-bold ${typeStyles[event.tipo]}`}
                        >
                          {event.tipo}
                        </span>
                        <span className="text-xs font-semibold uppercase text-brand-teal/50">
                          {event.status}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-brand-teal">
                        {event.titulo}
                      </h3>
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
                    <Button
                      variant={event.google_event_id ? "secondary" : "primary"}
                      onClick={() => handleSync(event.id)}
                      disabled={syncingId === event.id}
                      className="md:w-48"
                    >
                      {event.google_event_id ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {syncingId === event.id
                        ? "Sincronizando..."
                        : event.google_event_id
                          ? "Sincronizado"
                          : "Enviar Google"}
                    </Button>
                  </article>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-semibold text-brand-teal">
      {label}
      <input
        name={name}
        type={type}
        required={name !== "local"}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-brand-sand bg-white px-3 outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-brand-teal/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-brand-teal">{value}</p>
    </Card>
  );
}
