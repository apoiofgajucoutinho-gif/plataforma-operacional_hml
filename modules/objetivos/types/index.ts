export type ObjetivosModulo = "geral" | "instagram" | "ads" | "faturamento";
export type ObjetivosOrigem = "automatica" | "estrategica";
export type ObjetivosPeriodo = "mensal" | "quarter" | "semestral" | "anual";
export type ObjetivosUnidade = "numero" | "moeda" | "percentual";
export type ObjetivosDirecao = "maior_melhor" | "menor_melhor";

export type ObjetivosMeta = {
  id: string;
  tenant_id: string;
  modulo: ObjetivosModulo;
  titulo: string;
  descricao: string | null;
  tipo_origem: ObjetivosOrigem;
  indicador_key: string;
  unidade: ObjetivosUnidade;
  direcao: ObjetivosDirecao;
  periodo_tipo: ObjetivosPeriodo;
  ano: number;
  mes: number | null;
  quarter: number | null;
  semestre: number | null;
  meta_alcancavel: number;
  meta_alta: number | null;
  meta_super: number | null;
  atual_manual: number | null;
  plano_acao_padrao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  atual: number;
  percentual: number;
  status: "critico" | "atencao" | "dentro" | "supermeta";
  gap: number;
  periodoLabel: string;
};

export type ObjetivosOkr = {
  id: string;
  tenant_id: string;
  objetivo: string;
  descricao: string | null;
  periodo_tipo: ObjetivosPeriodo;
  ano: number;
  mes: number | null;
  quarter: number | null;
  semestre: number | null;
  responsavel: string | null;
  status: string;
  confianca: number;
  ativo: boolean;
  keyResults: ObjetivosKeyResult[];
};

export type ObjetivosKeyResult = {
  id: string;
  okr_id: string;
  titulo: string;
  indicador_key: string | null;
  unidade: ObjetivosUnidade;
  direcao: ObjetivosDirecao;
  meta: number;
  atual_manual: number;
  peso: number;
  progresso: number;
};

export type ObjetivosPlano = {
  id: string;
  meta_id: string | null;
  okr_id: string | null;
  titulo: string;
  descricao: string | null;
  prioridade: "baixa" | "media" | "alta";
  status: "pendente" | "em_andamento" | "feito" | "cancelado";
  responsavel: string | null;
  prazo: string | null;
  origem: "manual" | "sugerido";
};

export type ObjetivosContext = {
  tenant: { id: string; nome: string } | null;
  allowedModules: string[];
  diagnostic: string | null;
  canWrite: boolean;
  metas: ObjetivosMeta[];
  okrs: ObjetivosOkr[];
  planos: ObjetivosPlano[];
  updatedAt: string | null;
};
