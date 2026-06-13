export type OcorrenciaCadastroTipo = "categoria" | "tipo_falha" | "plataforma" | "responsavel" | "canal" | "produto";
export type OcorrenciaPrioridade = "baixa" | "media" | "alta" | "urgente";
export type OcorrenciaStatus = "aberto" | "em_andamento" | "resolvido" | "reaberto" | "cancelado" | "ignorado";
export type OcorrenciaOrigemFalha = "marketing" | "operacao_interna" | "plataforma_externa" | "financeiro" | "cliente" | "indefinido";
export type OcorrenciaImpacto = "baixo" | "medio" | "alto" | "critico";
export type OcorrenciaImpactoFinanceiro =
  | "sem_impacto"
  | "venda_perdida"
  | "reembolso"
  | "chargeback"
  | "desconto_concedido"
  | "custo_extra";
export type OcorrenciaRecorrencia = "primeira_ocorrencia" | "recorrente" | "ja_reportado";
export type OcorrenciaStatusCobranca = "nao_aplicavel" | "em_analise" | "enviado" | "respondido" | "resolvido";
export type OcorrenciaPlanoStatus = "pendente" | "em_andamento" | "feito" | "cancelado";

export type OcorrenciaCadastro = {
  id: string;
  tenant_id: string;
  tipo: OcorrenciaCadastroTipo;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type OcorrenciaChamado = {
  id: string;
  tenant_id: string;
  nome_cliente: string | null;
  email_cliente: string | null;
  telefone: string | null;
  instagram: string | null;
  data_chamado: string;
  canal: string;
  categoria: string;
  erro_motivo: string;
  plataforma_erro: string | null;
  solucao_realizada: string | null;
  prioridade: OcorrenciaPrioridade;
  tempo_solucao_minutos: number | null;
  status: OcorrenciaStatus;
  avaliacao: number | null;
  responsavel: string | null;
  observacao: string | null;
  origem_falha: OcorrenciaOrigemFalha;
  responsavel_falha: string | null;
  tipo_falha: string | null;
  produto_curso: string | null;
  campanha_nome: string | null;
  conjunto_anuncio: string | null;
  criativo_nome: string | null;
  link_relacionado: string | null;
  impacto_financeiro_tipo: OcorrenciaImpactoFinanceiro;
  impacto_financeiro_valor: number;
  impacto_financeiro_estimado: number | null;
  impacto_estimativa_criterio: string | null;
  impacto_estimativa_confianca: "baixa" | "media" | "alta" | null;
  valor_informado_marketing: number | null;
  valor_apurado_ads: number | null;
  impressoes_impactadas: number | null;
  alcance_impactado: number | null;
  resultados_impactados: number | null;
  impacto_cliente: OcorrenciaImpacto;
  primeira_resposta_at: string | null;
  resolvido_at: string | null;
  sla_prazo_at: string | null;
  sla_cumprido: boolean | null;
  evidencia_url: string | null;
  recorrencia: OcorrenciaRecorrencia;
  acao_preventiva: string | null;
  cobrar_marketing: boolean;
  motivo_cobranca: string | null;
  enviado_marketing_at: string | null;
  resposta_marketing: string | null;
  status_cobranca: OcorrenciaStatusCobranca;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OcorrenciaPlanoAcao = {
  id: string;
  tenant_id: string;
  chamado_id: string | null;
  titulo: string;
  descricao: string | null;
  prioridade: OcorrenciaPrioridade;
  status: OcorrenciaPlanoStatus;
  responsavel: string | null;
  prazo: string | null;
  origem: "manual" | "sugerido";
  created_at: string;
  updated_at: string;
};

export type OcorrenciasContext = {
  tenant: { id: string; nome: string } | null;
  allowedModules: string[];
  diagnostic: string | null;
  canWrite: boolean;
  chamados: OcorrenciaChamado[];
  cadastros: OcorrenciaCadastro[];
  planos: OcorrenciaPlanoAcao[];
  updatedAt: string | null;
};
