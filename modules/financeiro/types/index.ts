export type FinTipo = "entrada" | "saida";
export type FinStatus = "previsto" | "realizado" | "cancelado";
export type FinFormaPagamento =
  | "conta_bancaria"
  | "cartao_credito"
  | "pix"
  | "boleto"
  | "dinheiro";
export type FinPerfil = "admin" | "suporte" | "marketing" | "especialista";
export type FinNaturezaFluxo = "operacional" | "nao_operacional";
export type FinComportamento = "fixo" | "variavel" | "nao_aplicavel";
export type FinClassificacaoStatus = "trusted" | "partial" | "review" | "unknown";

export type FinTenant = {
  id: string;
  nome: string;
};

export type FinBanco = {
  id: string;
  tenant_id: string;
  nome: string;
  apelido: string | null;
  saldo_inicial: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FinCartao = {
  id: string;
  tenant_id: string;
  banco_id: string;
  nome: string;
  dia_fechamento: number;
  dia_vencimento: number;
  limite: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FinCentroResultado = {
  id: string;
  tenant_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FinNatureza = {
  id: string;
  tenant_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FinCategoria = {
  id: string;
  tenant_id: string;
  natureza_id: string | null;
  tipo: FinTipo;
  nome: string;
  dre_grupo: string;
  natureza_fluxo_padrao?: FinNaturezaFluxo | null;
  comportamento_padrao?: FinComportamento | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FinSubcategoria = {
  id: string;
  tenant_id: string;
  categoria_id: string;
  nome: string;
  dre_grupo: string | null;
  natureza_fluxo_padrao?: FinNaturezaFluxo | null;
  comportamento_padrao?: FinComportamento | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FinCurso = {
  id: string;
  tenant_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FinLancamento = {
  id: string;
  tenant_id: string;
  data_pagamento: string;
  mes_competencia: string;
  data_vencimento?: string | null;
  data_realizacao?: string | null;
  tipo: FinTipo;
  status: FinStatus;
  natureza_fluxo?: FinNaturezaFluxo;
  comportamento?: FinComportamento;
  centro_resultado_id: string;
  categoria_id: string;
  subcategoria_id: string | null;
  banco_id: string | null;
  cartao_id: string | null;
  curso_id: string | null;
  forma_pagamento: FinFormaPagamento;
  qtd_parcelas: number;
  parcela_numero: number;
  descricao: string;
  valor: number;
  observacao: string | null;
  origem: string;
  fonte_original?: string | null;
  referencia_externa?: string | null;
  responsavel?: string | null;
  anexo_url?: string | null;
  classificacao_status?: FinClassificacaoStatus;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type FinDre = {
  tenant_id: string;
  mes_competencia: string;
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  custos_diretos: number;
  lucro_bruto: number;
  vendas_marketing: number;
  despesas_administrativas: number;
  despesas_pessoal: number;
  ebitda: number;
  depreciacao: number;
  ebit: number;
  resultado_financeiro: number;
  irpj_csll: number;
  lucro_liquido: number;
};

export type FinDreCentro = FinDre & {
  centro_resultado_id: string;
  centro_resultado: string;
};

export type FinDreCurso = {
  tenant_id: string;
  curso_id: string;
  curso: string;
  mes_competencia: string;
  receita_bruta: number;
  deducoes: number;
  taxas_plataforma: number;
  coproducao: number;
  comissoes_afiliados: number;
  outros_custos_diretos: number;
  margem_contribuicao: number;
};

export type FinFaturaCartao = {
  tenant_id: string;
  cartao_id: string;
  cartao_nome: string;
  banco_id: string;
  mes_vencimento: string;
  primeiro_vencimento: string;
  ultimo_vencimento: string;
  valor_estimado: number;
  qtd_lancamentos: number;
};

export type FinanceiroCommercialSale = {
  id: string;
  transaction_id: string | null;
  produto_id: string | null;
  produto_nome: string | null;
  comprador_email: string | null;
  status_original: string | null;
  status_normalizado: string | null;
  grupo_comercial: string | null;
  commercial_transaction?: boolean | null;
  sale_confirmed?: boolean | null;
  revenue_eligible?: boolean | null;
  student_eligible?: boolean | null;
  sale_comparable?: boolean | null;
  event_class?: string | null;
  eligibility_reason?: string | null;
  moeda: string | null;
  valor_bruto: number | null;
  data_compra: string | null;
  data_aprovacao: string | null;
  data_reembolso: string | null;
  imported_at: string | null;
  last_event_at: string | null;
};

export type FinanceiroAdsRow = {
  id: string;
  data_referencia: string;
  campanha: string | null;
  valor_gasto: number | null;
  meta_purchases?: number | null;
  meta_purchase_value?: number | null;
  updated_at?: string | null;
  imported_at?: string | null;
};

export type FinanceiroContext = {
  tenant: FinTenant | null;
  userEmail: string | null;
  role: string | null;
  perfil: FinPerfil | null;
  allowedModules: string[];
  diagnostic: string | null;
  updatedAt: string | null;
  bancos: FinBanco[];
  cartoes: FinCartao[];
  centros: FinCentroResultado[];
  naturezas: FinNatureza[];
  categorias: FinCategoria[];
  subcategorias: FinSubcategoria[];
  cursos: FinCurso[];
  lancamentos: FinLancamento[];
  dre: FinDre[];
  drePorCentro: FinDreCentro[];
  drePorCurso: FinDreCurso[];
  faturas: FinFaturaCartao[];
  commercialSales: FinanceiroCommercialSale[];
  adsRows: FinanceiroAdsRow[];
};

export type CreateLancamentoPayload = {
  tipo: FinTipo;
  status: FinStatus;
  data_pagamento: string;
  mes_competencia: string;
  data_vencimento?: string | null;
  data_realizacao?: string | null;
  natureza_fluxo?: FinNaturezaFluxo;
  comportamento?: FinComportamento;
  centro_resultado_id: string;
  categoria_id: string;
  subcategoria_id?: string | null;
  curso_id?: string | null;
  forma_pagamento: FinFormaPagamento;
  banco_id?: string | null;
  cartao_id?: string | null;
  qtd_parcelas?: number;
  descricao: string;
  valor: number;
  observacao?: string | null;
  responsavel?: string | null;
};
