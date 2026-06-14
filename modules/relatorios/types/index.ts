export type RelatorioCanal = "telegram" | "email" | "whatsapp";
export type RelatorioPerfilAlvo = "ju" | "jeff" | "suporte" | "marketing" | "operacional";
export type RelatorioTipoResumo =
  | "resumo_executivo"
  | "resumo_suporte"
  | "alerta_tecnico"
  | "agenda"
  | "ocorrencias"
  | "financeiro";
export type RelatorioFrequencia = "sob_demanda" | "diario" | "semanal" | "mensal" | "imediato";
export type RelatorioStatusEnvio = "preparado" | "enviado" | "erro" | "ignorado";

export type RelatorioDestinatario = {
  id: string;
  tenant_id: string;
  nome: string;
  perfil_alvo: RelatorioPerfilAlvo;
  canal_preferencial: RelatorioCanal;
  email: string | null;
  telegram_chat_id: string | null;
  whatsapp: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type RelatorioAgendamento = {
  id: string;
  tenant_id: string;
  destinatario_id: string;
  nome: string;
  tipo_resumo: RelatorioTipoResumo;
  canal: RelatorioCanal;
  frequencia: RelatorioFrequencia;
  horario: string | null;
  timezone: string;
  incluir_modulos: string[];
  filtros: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type RelatorioEnvio = {
  id: string;
  tenant_id: string;
  agendamento_id: string | null;
  destinatario_id: string | null;
  tipo_resumo: RelatorioTipoResumo;
  canal: RelatorioCanal;
  destino: string | null;
  status: RelatorioStatusEnvio;
  assunto: string | null;
  mensagem: string | null;
  erro: string | null;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RelatoriosContext = {
  tenant: { id: string; nome: string } | null;
  allowedModules: string[];
  diagnostic: string | null;
  canWrite: boolean;
  destinatarios: RelatorioDestinatario[];
  agendamentos: RelatorioAgendamento[];
  envios: RelatorioEnvio[];
  updatedAt: string | null;
};
