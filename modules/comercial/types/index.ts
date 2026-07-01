export type ComercialTenant = {
  id: string;
  nome: string;
};

export type ComercialProduto = {
  id: string;
  tenant_id: string;
  plataforma: "hotmart" | "cademi" | "hotmart_club" | "manual";
  hotmart_product_id: string | null;
  nome: string;
  curso_id: string | null;
  centro_resultado_id: string | null;
  dias_acesso: number | null;
  ativo: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ComercialNorwynProduct = {
  id: string;
  tenant_id: string;
  nome_oficial: string;
  produto_base: string | null;
  categoria: string | null;
  fiscal_category: string | null;
  preco_oficial: number | null;
  percentual_coproducao: number | null;
  ativo: boolean;
  product_aliases?: Array<{
    id: string;
    alias: string;
    produto_base: string | null;
    principal: boolean;
    ativo: boolean;
  }>;
};

export type ComercialBusinessProfile = {
  id: string;
  tenant_id: string;
  company_name: string | null;
  tax_regime: string | null;
  default_coproduction_percent: number | null;
  hotmart_percent_fee: number | null;
  hotmart_fixed_fee: number | null;
  hotmart_withdraw_fee: number | null;
  gateway_percent_fee: number | null;
  status: string;
};

export type ComercialBusinessTaxRule = {
  id: string;
  tenant_id: string;
  business_profile_id: string | null;
  category: string;
  cnae: string | null;
  tax_percent: number | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
};

export type ComercialAluno = {
  id: string;
  tenant_id: string;
  nome: string | null;
  email: string;
  telefone: string | null;
  origem: string;
  primeira_compra_at: string | null;
  ultima_compra_at: string | null;
  status_acesso: "ativo" | "expirado" | "reembolsado" | "cancelado" | "nao_validado";
  acesso_expira_em: string | null;
  ultimo_acesso_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ComercialStatusGroup = "confirmed" | "pending" | "lost" | "refunded" | "chargeback" | "unknown";

export type ComercialVenda = {
  id: string;
  tenant_id: string;
  transaction_id: string;
  aluno_id: string | null;
  produto_id: string | null;
  hotmart_product_id: string | null;
  produto_nome: string | null;
  comprador_nome: string | null;
  comprador_email: string | null;
  status: string;
  status_original: string | null;
  status_normalizado: string | null;
  grupo_comercial: ComercialStatusGroup | null;
  forma_pagamento: string | null;
  parcelas: number;
  moeda: string;
  valor_bruto: number;
  valor_liquido: number | null;
  taxas: number | null;
  coproducao: number | null;
  data_compra: string | null;
  data_aprovacao: string | null;
  data_reembolso: string | null;
  data_chargeback: string | null;
  expected_payment_date: string | null;
  source_sck: string | null;
  origem: string;
  raw_id: string | null;
  last_event_at: string | null;
  imported_at: string | null;
  data_lacunas: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ComercialRecebivel = {
  id: string;
  tenant_id: string;
  venda_id: string | null;
  transaction_id: string;
  parcela_numero: number;
  total_parcelas: number;
  status: "previsto" | "disponivel" | "recebido" | "atrasado" | "cancelado" | "reembolsado";
  data_prevista: string | null;
  data_recebimento: string | null;
  valor_bruto: number;
  valor_liquido: number | null;
  fonte_previsao: "hotmart" | "projetado" | "manual";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ComercialRawImport = {
  id: string;
  tenant_id: string;
  event_id: string | null;
  transaction_id: string | null;
  payload: Record<string, unknown>;
  status: "recebido" | "processado" | "erro" | "ignorado";
  error: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ComercialContext = {
  tenant: ComercialTenant | null;
  allowedModules: string[];
  diagnostic: string | null;
  updatedAt: string | null;
  canWrite: boolean;
  vendas: ComercialVenda[];
  recebiveis: ComercialRecebivel[];
  alunos: ComercialAluno[];
  produtos: ComercialProduto[];
  norwynProducts: ComercialNorwynProduct[];
  businessProfile: ComercialBusinessProfile | null;
  taxRules: ComercialBusinessTaxRule[];
  rawImports: ComercialRawImport[];
};
