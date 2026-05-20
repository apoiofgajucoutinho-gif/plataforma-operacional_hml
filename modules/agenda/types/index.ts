export type AgendaEventType = "palestra" | "paciente" | "aula" | "interno";
export type AgendaEventStatus = "agendado" | "confirmado" | "concluido" | "cancelado";

export type AgendaEvent = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  tipo: AgendaEventType;
  status: AgendaEventStatus;
  inicio: string;
  fim: string;
  local: string | null;
  responsavel_id: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AgendaEventInput = {
  titulo: string;
  descricao?: string;
  tipo: AgendaEventType;
  inicio: string;
  fim: string;
  local?: string;
};
