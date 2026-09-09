export type AtividadeTime = "marketing" | "suporte" | "especialista" | "gestao_dados";
export type AtividadeStatus =
  | "backlog"
  | "hoje"
  | "em_andamento"
  | "aguardando_validacao"
  | "bloqueada"
  | "concluida"
  | "ignorada"
  | "cancelada";
export type AtividadePrioridade = "baixa" | "media" | "alta" | "urgente";
export type AtividadeCategoriaProjeto = "lancamento" | "acao_venda" | "campanha" | "operacao" | "outro";
export type AtividadeRecorrenciaFrequencia = "diaria" | "semanal" | "mensal";

export type AtividadeProjeto = {
  id: string;
  tenant_id: string;
  nome: string;
  categoria: AtividadeCategoriaProjeto;
  descricao: string | null;
  time_responsavel: AtividadeTime;
  responsavel_nome: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: AtividadeStatus;
  template_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AtividadeTarefa = {
  id: string;
  tenant_id: string;
  projeto_id: string | null;
  parent_id: string | null;
  titulo: string;
  descricao: string | null;
  time_responsavel: AtividadeTime;
  responsavel_nome: string | null;
  status: AtividadeStatus;
  prioridade: AtividadePrioridade;
  data_inicio: string | null;
  prazo: string | null;
  concluida_em: string | null;
  concluida_at?: string | null;
  validacao_obrigatoria: boolean;
  validada_em?: string | null;
  motivo_ignorado: string | null;
  ignorada_motivo?: string | null;
  recorrencia_id: string | null;
  ordem: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  campaign_id?: string | null;
  source_module?: string | null;
  source_event?: string | null;
  product_id?: string | null;
  person_id?: string | null;
  student_id?: string | null;
  content_id?: string | null;
  incident_id?: string | null;
  due_at?: string | null;
  approval_required?: boolean | null;
  blocked_reason?: string | null;
  waiting_on?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AtividadeTemplate = {
  id: string;
  tenant_id: string;
  nome: string;
  categoria: AtividadeCategoriaProjeto;
  descricao: string | null;
  duracao_dias: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type AtividadeTemplateTarefa = {
  id: string;
  tenant_id: string;
  template_id: string;
  titulo: string;
  descricao: string | null;
  time_responsavel: AtividadeTime;
  prioridade: AtividadePrioridade;
  offset_inicio_dias: number;
  offset_prazo_dias: number;
  validacao_obrigatoria: boolean;
  depende_ordem: number | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type AtividadeRecorrencia = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  time_responsavel: AtividadeTime;
  responsavel_nome: string | null;
  prioridade: AtividadePrioridade;
  frequencia: AtividadeRecorrenciaFrequencia;
  dias_semana: number[];
  dia_mes: number | null;
  proxima_execucao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type AtividadeLog = {
  id: string;
  tenant_id: string;
  entidade: string;
  entidade_id: string | null;
  acao: string;
  descricao: string | null;
  user_id: string | null;
  created_at: string;
};

export type AtividadesContext = {
  tenant: { id: string; nome: string } | null;
  allowedModules: string[];
  diagnostic: string | null;
  canWrite: boolean;
  canAdmin: boolean;
  role: string | null;
  projetos: AtividadeProjeto[];
  tarefas: AtividadeTarefa[];
  templates: AtividadeTemplate[];
  templateTarefas: AtividadeTemplateTarefa[];
  recorrencias: AtividadeRecorrencia[];
  logs: AtividadeLog[];
  updatedAt: string | null;
};
