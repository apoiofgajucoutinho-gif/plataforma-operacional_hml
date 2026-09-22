export type RelatorioCanal = "telegram" | "email" | "whatsapp" | "pdf";
export type RelatorioPerfilAlvo = "ju" | "jeff" | "suporte" | "marketing" | "operacional" | "comercial";
export type RelatorioTipoResumo =
  | "resumo_executivo"
  | "resumo_suporte"
  | "alerta_tecnico"
  | "agenda"
  | "ocorrencias"
  | "financeiro"
  | "lembrete_agendamento"
  | "marketing"
  | "comercial"
  | "presence"
  | "aluno_360"
  | "personalizado";
export type RelatorioFrequencia = "sob_demanda" | "unico" | "diario" | "dias_uteis" | "semanal" | "quinzenal" | "mensal" | "fechamento_mes" | "imediato";
export type RelatorioScheduleStatus = "ativo" | "pausado" | "rascunho";
export type RelatorioModoEnvio = "recorrente" | "unico";
export type RelatorioStatusEnvio = "preparado" | "enviado" | "erro" | "ignorado";
export type RelatorioOrigemEnvio = "manual" | "agendado" | "preview" | "sistema";
export type RelatorioPeriodo =
  | "hoje"
  | "amanha"
  | "proximos_2d"
  | "proximos_7d"
  | "proximos_15d"
  | "mes_atual"
  | "mes_anterior"
  | "ultimos_7d"
  | "ultimos_15d"
  | "ultimos_30d"
  | "ultimos_90d"
  | "ano_atual"
  | "pendentes";
export type RelatorioNivelDetalhe = "curto" | "normal" | "detalhado";
export type RelatorioTemplateKey =
  | "daily_ju"
  | "aluno_360"
  | "ju_resumo_executivo"
  | "ju_fechamento_dia"
  | "suporte_prioridades"
  | "jeff_alertas_tecnicos"
  | "especialista_agenda"
  | "marketing_performance"
  | "lembrete_agenda"
  | "operacional_atividades"
  | "personalizado";

export type RelatorioBlocoKey =
  | "agenda"
  | "decisoes"
  | "presence"
  | "marketing_instagram"
  | "marketing_ads"
  | "comercial"
  | "interacoes"
  | "atividades"
  | "financeiro"
  | "aluno_360"
  | "recomendacoes";

export type RelatorioBlocoConfig = {
  enabled: boolean;
  periodo: RelatorioPeriodo;
  detalhe?: RelatorioNivelDetalhe;
  empty_behavior?: "omit" | "show_empty";
};

export type RelatorioFiltros = {
  template_key?: RelatorioTemplateKey;
  nivel_detalhe?: RelatorioNivelDetalhe;
  enviar_apenas_com_alerta?: boolean;
  antecedencia_minutos?: number;
  periodo?: RelatorioPeriodo;
  produto_id?: string | null;
  customer_ids?: string[];
  include_recommendation?: boolean;
  blocos?: Partial<Record<RelatorioBlocoKey | string, RelatorioBlocoConfig>>;
};

export type RelatorioDestinatario = {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  perfil_alvo: RelatorioPerfilAlvo;
  tipo_destino: "grupo" | "individual" | "canal" | "outro";
  canal_preferencial: RelatorioCanal;
  email: string | null;
  telegram_chat_id: string | null;
  whatsapp: string | null;
  ativo: boolean;
  observacao: string | null;
  last_sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type RelatorioAgendamento = {
  id: string;
  tenant_id: string;
  destinatario_id: string;
  nome: string;
  descricao: string | null;
  tipo_resumo: RelatorioTipoResumo;
  canal: RelatorioCanal;
  frequencia: RelatorioFrequencia;
  modo_envio: RelatorioModoEnvio;
  status: RelatorioScheduleStatus;
  horario: string | null;
  timezone: string;
  dias_semana: number[];
  dia_mes: number | null;
  incluir_modulos: string[];
  filtros: RelatorioFiltros;
  filtros_conteudo: Record<string, unknown>;
  regras: Record<string, unknown>;
  observacao_interna: string | null;
  ativo: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  metadata: Record<string, unknown>;
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
  origem: RelatorioOrigemEnvio;
  assunto: string | null;
  resumo: string | null;
  mensagem: string | null;
  erro: string | null;
  modulos: string[];
  filtros: Record<string, unknown>;
  metadata: Record<string, unknown>;
  generated_at: string;
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
  enviosTotal: number;
  updatedAt: string | null;
};
