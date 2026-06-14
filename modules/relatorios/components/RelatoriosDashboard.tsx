"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Bell, CheckCircle2, Clock, Mail, Pencil, Plus, Send, Settings, Smartphone, Trash2, X, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  RelatorioAgendamento,
  RelatorioCanal,
  RelatorioDestinatario,
  RelatorioEnvio,
  RelatorioFrequencia,
  RelatoriosContext,
  RelatorioTipoResumo,
} from "@/modules/relatorios/types";

type TabKey = "reports" | "admin";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "reports", label: "Reports" },
  { key: "admin", label: "Admin" },
];

const tipoLabels: Record<RelatorioTipoResumo, string> = {
  resumo_executivo: "Resumo executivo",
  resumo_suporte: "Resumo suporte",
  alerta_tecnico: "Alerta tecnico",
  agenda: "Agenda",
  ocorrencias: "Ocorrencias",
  financeiro: "Financeiro",
};

const canalLabels: Record<RelatorioCanal, string> = {
  telegram: "Telegram",
  email: "E-mail",
  whatsapp: "WhatsApp futuro",
};

const frequenciaLabels: Record<RelatorioFrequencia, string> = {
  sob_demanda: "Sob demanda",
  diario: "Diario",
  semanal: "Semanal",
  mensal: "Mensal",
  imediato: "Imediato",
};

const moduleOptions = ["agenda", "instagram", "ads", "objetivos", "financeiro", "ocorrencias", "adocao"];

const initialRecipient = {
  nome: "",
  perfil_alvo: "operacional",
  canal_preferencial: "telegram" as RelatorioCanal,
  email: "",
  telegram_chat_id: "",
  whatsapp: "",
  ativo: true,
};

const initialSchedule = {
  destinatario_id: "",
  nome: "",
  tipo_resumo: "resumo_executivo" as RelatorioTipoResumo,
  canal: "telegram" as RelatorioCanal,
  frequencia: "diario" as RelatorioFrequencia,
  horario: "07:30",
  incluir_modulos: ["agenda", "financeiro", "ocorrencias"],
  ativo: true,
};

function dateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "enviado") return "bg-emerald-100 text-emerald-700";
  if (status === "erro") return "bg-rose-100 text-rose-700";
  if (status === "ignorado") return "bg-brand-sand text-brand-teal";
  return "bg-blue-100 text-blue-700";
}

function canalIcon(canal: RelatorioCanal) {
  if (canal === "telegram") return <Send className="h-4 w-4" />;
  if (canal === "email") return <Mail className="h-4 w-4" />;
  return <Smartphone className="h-4 w-4" />;
}

export function RelatoriosDashboard({ context }: { context: RelatoriosContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("reports");
  const [destinatarios, setDestinatarios] = useState(context.destinatarios);
  const [agendamentos, setAgendamentos] = useState(context.agendamentos);
  const [envios, setEnvios] = useState(context.envios);
  const [recipientForm, setRecipientForm] = useState(initialRecipient);
  const [scheduleForm, setScheduleForm] = useState(initialSchedule);
  const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [sendingNowId, setSendingNowId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visibleTabs = context.canWrite ? tabs : tabs.filter((tab) => tab.key !== "admin");
  const sentToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return envios.filter((envio) => envio.created_at.slice(0, 10) === today && envio.status === "enviado").length;
  }, [envios]);
  const errors = envios.filter((envio) => envio.status === "erro").length;
  const prepared = envios.filter((envio) => envio.status === "preparado").length;
  const activeSchedules = agendamentos.filter((item) => item.ativo).length;

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "relatorios",
        pagePath: "/relatorios",
        pageLabel: activeTab === "reports" ? "Relatorios: Reports" : "Relatorios: Admin",
      }),
      keepalive: true,
    });
  }, [activeTab]);

  async function saveEntity(entity: "destinatario" | "agendamento", payload: Record<string, unknown>, id?: string | null) {
    setMessage("Salvando...");
    const response = await fetch("/api/relatorios", {
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

  async function deleteEntity(entity: "destinatario" | "agendamento", id: string) {
    if (!window.confirm("Deseja excluir este registro?")) return;
    setMessage("Excluindo...");
    const response = await fetch("/api/relatorios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, action: "delete", id }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Nao foi possivel excluir.");
      return;
    }
    if (entity === "destinatario") {
      setDestinatarios((items) => items.filter((item) => item.id !== id));
    } else {
      setAgendamentos((items) => items.filter((item) => item.id !== id));
    }
    setMessage("Registro excluido.");
  }

  async function sendNow(scheduleId: string) {
    setSendingNowId(scheduleId);
    setMessage("Enviando report agora...");
    const response = await fetch("/api/relatorios/send-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });
    const result = await response.json();
    setSendingNowId(null);
    if (!response.ok) {
      setMessage(result.error ?? "Nao foi possivel enviar agora.");
      return;
    }
    if (result.data) {
      setEnvios((items) => [result.data, ...items]);
    }
    setMessage("Report enviado no Telegram.");
  }

  async function saveRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await saveEntity("destinatario", recipientForm, editingRecipientId);
    if (!saved) return;
    setDestinatarios((items) =>
      (editingRecipientId ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items]).sort((left, right) =>
        left.nome.localeCompare(right.nome),
      ),
    );
    setRecipientForm(initialRecipient);
    setEditingRecipientId(null);
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...scheduleForm,
      horario: scheduleForm.horario || null,
      timezone: "America/Sao_Paulo",
      filtros: {},
    };
    const saved = await saveEntity("agendamento", payload, editingScheduleId);
    if (!saved) return;
    setAgendamentos((items) => (editingScheduleId ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items]));
    setScheduleForm(initialSchedule);
    setEditingScheduleId(null);
  }

  function editRecipient(item: RelatorioDestinatario) {
    setEditingRecipientId(item.id);
    setRecipientForm({
      nome: item.nome,
      perfil_alvo: item.perfil_alvo,
      canal_preferencial: item.canal_preferencial,
      email: item.email ?? "",
      telegram_chat_id: item.telegram_chat_id ?? "",
      whatsapp: item.whatsapp ?? "",
      ativo: item.ativo,
    });
    setMessage("Editando destinatario.");
  }

  function editSchedule(item: RelatorioAgendamento) {
    setEditingScheduleId(item.id);
    setScheduleForm({
      destinatario_id: item.destinatario_id,
      nome: item.nome,
      tipo_resumo: item.tipo_resumo,
      canal: item.canal,
      frequencia: item.frequencia,
      horario: item.horario?.slice(0, 5) ?? "",
      incluir_modulos: item.incluir_modulos,
      ativo: item.ativo,
    });
    setMessage("Editando agendamento.");
  }

  function cancelRecipientEdit() {
    setEditingRecipientId(null);
    setRecipientForm(initialRecipient);
  }

  function cancelScheduleEdit() {
    setEditingScheduleId(null);
    setScheduleForm(initialSchedule);
  }

  if (context.diagnostic) {
    return (
      <section className="space-y-6">
        <Header updatedAt={context.updatedAt} />
        <Card className="p-8">
          <h2 className="text-xl font-black text-brand-teal">Relatorios indisponivel</h2>
          <p className="mt-3 text-brand-teal/70">{context.diagnostic}</p>
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

      {message ? <p className="rounded-md bg-brand-sand/50 px-4 py-3 text-sm font-bold text-brand-teal">{message}</p> : null}

      {activeTab === "reports" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<CheckCircle2 />} label="Enviados hoje" value={sentToday} helper="com status enviado" />
            <Metric icon={<Clock />} label="Preparados" value={prepared} helper="aguardando retorno do n8n" />
            <Metric icon={<XCircle />} label="Com erro" value={errors} helper="falha de envio ou destino" />
            <Metric icon={<Bell />} label="Agendamentos ativos" value={activeSchedules} helper="rotinas configuradas" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-5">
              <h2 className="text-xl font-black text-brand-teal">Rotinas configuradas</h2>
              <div className="mt-4 space-y-3">
                {agendamentos.map((item) => {
                  const recipient = destinatarios.find((destinatario) => destinatario.id === item.destinatario_id);
                  return (
                    <div key={item.id} className="rounded-md border border-brand-sand bg-white/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-brand-teal">{item.nome}</p>
                          <p className="mt-1 text-sm text-brand-teal/65">
                            {recipient?.nome ?? "Sem destinatario"} - {tipoLabels[item.tipo_resumo]} - {item.horario?.slice(0, 5) ?? "sob demanda"}
                          </p>
                        </div>
                        <Badge value={item.ativo ? "Ativo" : "Pausado"} tone={item.ativo ? "ok" : "neutral"} />
                      </div>
                    </div>
                  );
                })}
                {!agendamentos.length ? <p className="text-sm font-bold text-brand-teal/60">Nenhum agendamento cadastrado.</p> : null}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-brand-sand p-5">
                <h2 className="text-xl font-black text-brand-teal">Historico de envios</h2>
              </div>
              <EnviosTable envios={envios} destinatarios={destinatarios} />
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "admin" && context.canWrite ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5">
            <FormTitle
              icon={editingRecipientId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              title={editingRecipientId ? "Editar destinatario" : "Destinatario"}
              helper="Quem recebe os resumos e alertas."
            />
            <form onSubmit={saveRecipient} className="mt-5 grid gap-4">
              <Field label="Nome">
                <input className="input" required value={recipientForm.nome} onChange={(event) => setRecipientForm((current) => ({ ...current, nome: event.target.value }))} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Perfil">
                  <select className="input" value={recipientForm.perfil_alvo} onChange={(event) => setRecipientForm((current) => ({ ...current, perfil_alvo: event.target.value }))}>
                    <option value="ju">Ju</option>
                    <option value="jeff">Jeff</option>
                    <option value="suporte">Suporte</option>
                    <option value="marketing">Marketing</option>
                    <option value="operacional">Operacional</option>
                  </select>
                </Field>
                <Field label="Canal preferencial">
                  <select className="input" value={recipientForm.canal_preferencial} onChange={(event) => setRecipientForm((current) => ({ ...current, canal_preferencial: event.target.value as RelatorioCanal }))}>
                    <option value="telegram">Telegram</option>
                    <option value="email">E-mail</option>
                    <option value="whatsapp">WhatsApp futuro</option>
                  </select>
                </Field>
                <Field label="Telegram chat ID">
                  <input className="input" value={recipientForm.telegram_chat_id} onChange={(event) => setRecipientForm((current) => ({ ...current, telegram_chat_id: event.target.value }))} />
                </Field>
                <Field label="E-mail">
                  <input type="email" className="input" value={recipientForm.email} onChange={(event) => setRecipientForm((current) => ({ ...current, email: event.target.value }))} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-md bg-brand-teal px-4 py-3 text-sm font-black text-white">{editingRecipientId ? "Atualizar destinatario" : "Salvar destinatario"}</button>
                {editingRecipientId ? (
                  <button type="button" onClick={cancelRecipientEdit} className="inline-flex items-center gap-2 rounded-md border border-brand-sand px-4 py-3 text-sm font-black text-brand-teal">
                    <X className="h-4 w-4" />
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <FormTitle
              icon={editingScheduleId ? <Pencil className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
              title={editingScheduleId ? "Editar agendamento" : "Agendamento"}
              helper="Quando e qual resumo deve sair."
            />
            <form onSubmit={saveSchedule} className="mt-5 grid gap-4">
              <Field label="Nome">
                <input className="input" required value={scheduleForm.nome} onChange={(event) => setScheduleForm((current) => ({ ...current, nome: event.target.value }))} />
              </Field>
              <Field label="Destinatario">
                <select className="input" required value={scheduleForm.destinatario_id} onChange={(event) => setScheduleForm((current) => ({ ...current, destinatario_id: event.target.value }))}>
                  <option value="">Selecione</option>
                  {destinatarios.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tipo">
                  <select className="input" value={scheduleForm.tipo_resumo} onChange={(event) => setScheduleForm((current) => ({ ...current, tipo_resumo: event.target.value as RelatorioTipoResumo }))}>
                    {Object.entries(tipoLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                  </select>
                </Field>
                <Field label="Frequencia">
                  <select className="input" value={scheduleForm.frequencia} onChange={(event) => setScheduleForm((current) => ({ ...current, frequencia: event.target.value as RelatorioFrequencia }))}>
                    {Object.entries(frequenciaLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                  </select>
                </Field>
                <Field label="Horario">
                  <input type="time" className="input" value={scheduleForm.horario} onChange={(event) => setScheduleForm((current) => ({ ...current, horario: event.target.value }))} />
                </Field>
              </div>
              <Field label="Modulos incluidos">
                <div className="grid gap-2 sm:grid-cols-2">
                  {moduleOptions.map((module) => (
                    <label key={module} className="flex items-center gap-2 rounded-md border border-brand-sand bg-white px-3 py-2 text-sm font-bold text-brand-teal">
                      <input
                        type="checkbox"
                        checked={scheduleForm.incluir_modulos.includes(module)}
                        onChange={(event) => {
                          setScheduleForm((current) => ({
                            ...current,
                            incluir_modulos: event.target.checked
                              ? [...current.incluir_modulos, module]
                              : current.incluir_modulos.filter((item) => item !== module),
                          }));
                        }}
                      />
                      {module}
                    </label>
                  ))}
                </div>
              </Field>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-md bg-brand-teal px-4 py-3 text-sm font-black text-white">{editingScheduleId ? "Atualizar agendamento" : "Salvar agendamento"}</button>
                {editingScheduleId ? (
                  <button type="button" onClick={cancelScheduleEdit} className="inline-flex items-center gap-2 rounded-md border border-brand-sand px-4 py-3 text-sm font-black text-brand-teal">
                    <X className="h-4 w-4" />
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden xl:col-span-2">
            <div className="border-b border-brand-sand p-5">
              <h2 className="text-xl font-black text-brand-teal">Configurações cadastradas</h2>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <List title="Destinatarios">
                {destinatarios.map((item) => (
                  <ListItem
                    key={item.id}
                    title={item.nome}
                    helper={`${item.perfil_alvo} - ${canalLabels[item.canal_preferencial]}`}
                    onEdit={() => editRecipient(item)}
                    onDelete={() => deleteEntity("destinatario", item.id)}
                  />
                ))}
              </List>
              <List title="Agendamentos">
                {agendamentos.map((item) => (
                  <ListItem
                    key={item.id}
                    title={item.nome}
                    helper={`${tipoLabels[item.tipo_resumo]} - ${frequenciaLabels[item.frequencia]}`}
                    onEdit={() => editSchedule(item)}
                    onSendNow={() => sendNow(item.id)}
                    sendingNow={sendingNowId === item.id}
                    onDelete={() => deleteEntity("agendamento", item.id)}
                  />
                ))}
              </List>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function Header({ updatedAt }: { updatedAt: string | null }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-brand-clay">Relatorios e alertas</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-brand-teal">Reports operacionais</h1>
        <p className="mt-3 max-w-3xl text-lg text-brand-teal/70">
          Resumos executivos, lembretes e alertas enviados por canal configurado, com historico e controle.
        </p>
      </div>
      <span className="text-sm font-bold text-brand-teal/60">Base atualizada em {dateTime(updatedAt)}</span>
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

function EnviosTable({ envios, destinatarios }: { envios: RelatorioEnvio[]; destinatarios: RelatorioDestinatario[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Destinatario</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Canal</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Erro</th>
          </tr>
        </thead>
        <tbody>
          {envios.map((envio) => {
            const destinatario = destinatarios.find((item) => item.id === envio.destinatario_id);
            return (
              <tr key={envio.id} className="border-b border-brand-sand/70">
                <td className="px-4 py-3 font-bold text-brand-teal">{dateTime(envio.created_at)}</td>
                <td className="px-4 py-3 text-brand-teal">{destinatario?.nome ?? envio.destino ?? "-"}</td>
                <td className="px-4 py-3 text-brand-teal/75">{tipoLabels[envio.tipo_resumo]}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-brand-teal">
                    {canalIcon(envio.canal)}
                    {canalLabels[envio.canal]}
                  </span>
                </td>
                <td className="px-4 py-3"><Badge value={envio.status} /></td>
                <td className="max-w-[260px] truncate px-4 py-3 text-brand-teal/60">{envio.erro ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!envios.length ? <p className="p-5 text-sm font-bold text-brand-teal/60">Nenhum envio registrado ainda.</p> : null}
    </div>
  );
}

function Badge({ value, tone }: { value: string; tone?: "ok" | "neutral" }) {
  const className = tone === "ok" ? "bg-emerald-100 text-emerald-700" : tone === "neutral" ? "bg-brand-sand text-brand-teal" : statusClass(value);
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>{value}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-brand-teal">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
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

function List({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-black text-brand-teal">{title}</h3>
      <div className="mt-3 divide-y divide-brand-sand overflow-hidden rounded-md border border-brand-sand">{children}</div>
    </div>
  );
}

function ListItem({
  title,
  helper,
  onEdit,
  onSendNow,
  sendingNow,
  onDelete,
}: {
  title: string;
  helper: string;
  onEdit: () => void;
  onSendNow?: () => void;
  sendingNow?: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white/70 p-4">
      <div>
        <p className="font-black text-brand-teal">{title}</p>
        <p className="text-sm text-brand-teal/60">{helper}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {onSendNow ? (
          <button
            type="button"
            onClick={onSendNow}
            disabled={sendingNow}
            className="inline-flex items-center gap-2 rounded-md border border-brand-sand px-3 py-2 text-xs font-black text-brand-teal disabled:opacity-60"
            title="Enviar agora"
          >
            <Send className="h-4 w-4" />
            {sendingNow ? "Enviando" : "Enviar agora"}
          </button>
        ) : null}
        <button type="button" onClick={onEdit} className="rounded-md border border-brand-sand p-2 text-brand-teal" title="Editar">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} className="rounded-md border border-brand-sand p-2 text-rose-700" title="Excluir">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
