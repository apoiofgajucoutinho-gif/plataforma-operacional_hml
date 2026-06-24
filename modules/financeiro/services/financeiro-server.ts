import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateLancamentoPayload,
  FinBanco,
  FinCartao,
  FinCategoria,
  FinCentroResultado,
  FinCurso,
  FinDre,
  FinDreCentro,
  FinDreCurso,
  FinFaturaCartao,
  FinLancamento,
  FinNatureza,
  FinPerfil,
  FinSubcategoria,
  FinanceiroContext,
} from "@/modules/financeiro/types";

type SupabaseAny = any;
type FinanceiroCadastroTipo = "centro" | "categoria" | "subcategoria" | "curso";

type FinanceiroAuth = {
  userId: string;
  userEmail: string | null;
  tenantId: string;
  role: string;
  perfil: FinPerfil;
  allowedModules: string[];
  dataClient: SupabaseAny;
};

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return {
    membership: data,
    error,
    source: admin ? "service_role" : "rls",
  };
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") {
    return allModules;
  }

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item: { module: string }) => item.module);
}

async function getFinanceiroAuth(): Promise<FinanceiroAuth> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { membership, error: membershipError } = await getMembershipByUserId(user.id);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    throw new Error("Usuario sem tenant vinculado.");
  }

  const adminClient = createAdminClient();
  const profileClient = adminClient ?? userClient;
  const allowedModules = await getAllowedModules(
    membership.tenant_id,
    membership.role,
    profileClient,
  );

  if (!allowedModules.includes("financeiro")) {
    throw new Error("Seu perfil nao possui acesso ao modulo Financeiro.");
  }

    const { data: finProfile } = await profileClient
      .from("fin_perfis_usuario")
    .select("perfil, ativo")
    .eq("tenant_id", membership.tenant_id)
    .eq("user_id", user.id)
    .eq("ativo", true)
      .maybeSingle();

  const inferredPerfil = membership.role === "SUPORTE" ? "suporte" : null;
  const perfil = finProfile?.perfil ?? inferredPerfil;

  if (!perfil) {
    throw new Error("Seu usuario ainda nao possui perfil financeiro ativo.");
  }

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    tenantId: membership.tenant_id,
    role: membership.role,
    perfil,
    allowedModules,
    dataClient: perfil === "admin" ? (adminClient ?? userClient) : userClient,
  };
}

function asNumber<T extends Record<string, unknown>>(rows: T[] | null | undefined) {
  return (rows ?? []).map((row) => {
    const next = { ...row };
    for (const [key, value] of Object.entries(next)) {
      if (typeof value === "string" && value !== "" && !Number.isNaN(Number(value))) {
        next[key as keyof typeof next] = Number(value) as never;
      }
    }
    return next;
  });
}

function getLatestTimestamp(rows: Array<{ updated_at?: string | null; created_at?: string | null }>) {
  return rows
    .map((row) => row.updated_at ?? row.created_at ?? null)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

export async function getFinanceiroContext(): Promise<FinanceiroContext> {
  try {
    const auth = await getFinanceiroAuth();
    const isAdmin = auth.perfil === "admin";
    const canSeeAdminData = auth.perfil === "admin" || auth.perfil === "suporte";

    const { data: tenant } = await auth.dataClient
      .from("tenants")
      .select("id, nome")
      .eq("id", auth.tenantId)
      .maybeSingle();

    const [
      bancosResult,
      cartoesResult,
      centrosResult,
      naturezasResult,
      categoriasResult,
      subcategoriasResult,
      cursosResult,
      lancamentosResult,
      dreResult,
      dreCentroResult,
      dreCursoResult,
      faturasResult,
    ] = await Promise.all([
      canSeeAdminData
        ? auth.dataClient.from("fin_bancos").select("*").eq("tenant_id", auth.tenantId).order("nome")
        : Promise.resolve({ data: [] }),
      canSeeAdminData
        ? auth.dataClient.from("fin_cartoes").select("*").eq("tenant_id", auth.tenantId).order("nome")
        : Promise.resolve({ data: [] }),
      auth.dataClient
        .from("fin_centros_resultado")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("nome"),
      auth.dataClient
        .from("fin_naturezas")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("nome"),
      auth.dataClient
        .from("fin_categorias")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("nome"),
      auth.dataClient
        .from("fin_subcategorias")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("nome"),
      auth.dataClient
        .from("fin_cursos")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("nome"),
      auth.dataClient
        .from("fin_lancamentos")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .gte("data_pagamento", "2025-12-01")
        .order("data_pagamento", { ascending: false })
        .limit(1200),
      auth.dataClient
        .from("fin_v_dre_consolidado")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("mes_competencia", { ascending: false }),
      auth.dataClient
        .from("fin_v_dre_por_centro")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("mes_competencia", { ascending: false }),
      auth.dataClient
        .from("fin_v_dre_por_curso")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("mes_competencia", { ascending: false }),
      canSeeAdminData
        ? auth.dataClient
            .from("fin_v_fatura_cartao")
            .select("*")
            .eq("tenant_id", auth.tenantId)
            .order("mes_vencimento", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    const lancamentos = asNumber(lancamentosResult.data) as FinLancamento[];

    return {
      tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
      userEmail: auth.userEmail,
      perfil: auth.perfil,
      allowedModules: auth.allowedModules,
      diagnostic: null,
      updatedAt: getLatestTimestamp(lancamentos),
      bancos: asNumber(bancosResult.data) as FinBanco[],
      cartoes: asNumber(cartoesResult.data) as FinCartao[],
      centros: centrosResult.data ?? ([] as FinCentroResultado[]),
      naturezas: naturezasResult.data ?? ([] as FinNatureza[]),
      categorias: categoriasResult.data ?? ([] as FinCategoria[]),
      subcategorias: subcategoriasResult.data ?? ([] as FinSubcategoria[]),
      cursos: cursosResult.data ?? ([] as FinCurso[]),
      lancamentos,
      dre: asNumber(dreResult.data) as FinDre[],
      drePorCentro: asNumber(dreCentroResult.data) as FinDreCentro[],
      drePorCurso: asNumber(dreCursoResult.data) as FinDreCurso[],
      faturas: asNumber(faturasResult.data) as FinFaturaCartao[],
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Falha ao carregar financeiro.";

    return {
      tenant: null,
      userEmail: null,
      perfil: null,
      allowedModules: [],
      diagnostic: message,
      updatedAt: null,
      bancos: [],
      cartoes: [],
      centros: [],
      naturezas: [],
      categorias: [],
      subcategorias: [],
      cursos: [],
      lancamentos: [],
      dre: [],
      drePorCentro: [],
      drePorCurso: [],
      faturas: [],
    };
  }
}

export async function createFinanceiroLancamento(input: CreateLancamentoPayload) {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin" && auth.perfil !== "suporte") {
    throw new Error("Seu perfil financeiro nao pode criar lancamentos.");
  }

  if (!input.descricao?.trim()) {
    throw new Error("Informe uma descricao.");
  }

  if (!input.valor || input.valor <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }

  const payload = {
    tenant_id: auth.tenantId,
    data_pagamento: input.data_pagamento,
    mes_competencia: input.mes_competencia,
    tipo: input.tipo,
    status: input.status,
    centro_resultado_id: input.centro_resultado_id,
    categoria_id: input.categoria_id,
    subcategoria_id: input.subcategoria_id || null,
    curso_id: input.curso_id || null,
    forma_pagamento: input.forma_pagamento,
    banco_id: input.banco_id || null,
    cartao_id: input.cartao_id || null,
    qtd_parcelas: input.qtd_parcelas || 1,
    descricao: input.descricao.trim(),
    valor: input.valor,
    observacao: input.observacao || null,
    origem: "manual",
    created_by: auth.userId,
  };

  const { data, error } = await auth.dataClient
    .from("fin_lancamentos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateFinanceiroLancamento(input: CreateLancamentoPayload & { id?: string }) {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin" && auth.perfil !== "suporte") {
    throw new Error("Seu perfil financeiro nao pode editar lancamentos.");
  }

  if (!input.id) {
    throw new Error("Informe o lancamento para editar.");
  }

  if (!input.descricao?.trim()) {
    throw new Error("Informe uma descricao.");
  }

  if (!input.valor || input.valor <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }

  const payload = {
    data_pagamento: input.data_pagamento,
    mes_competencia: input.mes_competencia,
    tipo: input.tipo,
    status: input.status,
    centro_resultado_id: input.centro_resultado_id,
    categoria_id: input.categoria_id,
    subcategoria_id: input.subcategoria_id || null,
    curso_id: input.curso_id || null,
    forma_pagamento: input.forma_pagamento,
    banco_id: input.banco_id || null,
    cartao_id: input.cartao_id || null,
    qtd_parcelas: input.qtd_parcelas || 1,
    descricao: input.descricao.trim(),
    valor: input.valor,
    observacao: input.observacao || null,
  };

  const { data, error } = await auth.dataClient
    .from("fin_lancamentos")
    .update(payload)
    .eq("id", input.id)
    .eq("tenant_id", auth.tenantId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteFinanceiroLancamento(input: { id?: string }) {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin" && auth.perfil !== "suporte") {
    throw new Error("Seu perfil financeiro nao pode excluir lancamentos.");
  }

  if (!input.id) {
    throw new Error("Informe o lancamento para excluir.");
  }

  const { data, error } = await auth.dataClient
    .from("fin_lancamentos")
    .delete()
    .eq("id", input.id)
    .eq("tenant_id", auth.tenantId)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createFinanceiroBanco(input: {
  nome: string;
  apelido?: string | null;
  saldo_inicial?: number;
}) {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin") {
    throw new Error("Apenas admin financeiro pode criar bancos.");
  }

  const { data, error } = await auth.dataClient
    .from("fin_bancos")
    .insert({
      tenant_id: auth.tenantId,
      nome: input.nome.trim(),
      apelido: input.apelido?.trim() || null,
      saldo_inicial: input.saldo_inicial || 0,
      ativo: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateFinanceiroBanco(input: {
  id: string;
  nome: string;
  apelido?: string | null;
  saldo_inicial?: number;
  ativo?: boolean;
}) {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin") {
    throw new Error("Apenas admin financeiro pode editar bancos.");
  }

  const { data, error } = await auth.dataClient
    .from("fin_bancos")
    .update({
      nome: input.nome.trim(),
      apelido: input.apelido?.trim() || null,
      saldo_inicial: input.saldo_inicial || 0,
      ativo: input.ativo ?? true,
    })
    .eq("id", input.id)
    .eq("tenant_id", auth.tenantId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createFinanceiroCartao(input: {
  nome: string;
  banco_id: string;
  dia_fechamento: number;
  dia_vencimento: number;
  limite?: number | null;
}) {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin") {
    throw new Error("Apenas admin financeiro pode criar cartoes.");
  }

  const { data, error } = await auth.dataClient
    .from("fin_cartoes")
    .insert({
      tenant_id: auth.tenantId,
      nome: input.nome.trim(),
      banco_id: input.banco_id,
      dia_fechamento: input.dia_fechamento,
      dia_vencimento: input.dia_vencimento,
      limite: input.limite || null,
      ativo: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateFinanceiroCartao(input: {
  id: string;
  nome: string;
  banco_id: string;
  dia_fechamento: number;
  dia_vencimento: number;
  limite?: number | null;
  ativo?: boolean;
}) {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin") {
    throw new Error("Apenas admin financeiro pode editar cartoes.");
  }

  const { data, error } = await auth.dataClient
    .from("fin_cartoes")
    .update({
      nome: input.nome.trim(),
      banco_id: input.banco_id,
      dia_fechamento: input.dia_fechamento,
      dia_vencimento: input.dia_vencimento,
      limite: input.limite || null,
      ativo: input.ativo ?? true,
    })
    .eq("id", input.id)
    .eq("tenant_id", auth.tenantId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function cadastroTable(tipo: FinanceiroCadastroTipo) {
  if (tipo === "centro") return "fin_centros_resultado";
  if (tipo === "categoria") return "fin_categorias";
  if (tipo === "subcategoria") return "fin_subcategorias";
  return "fin_cursos";
}

function cadastroLinkColumn(tipo: FinanceiroCadastroTipo) {
  if (tipo === "centro") return "centro_resultado_id";
  if (tipo === "categoria") return "categoria_id";
  if (tipo === "subcategoria") return "subcategoria_id";
  return "curso_id";
}

function cadastroPayload(tipo: FinanceiroCadastroTipo, tenantId: string, input: Record<string, unknown>) {
  const nome = String(input.nome ?? "").trim();
  if (!nome) {
    throw new Error("Informe o nome do cadastro.");
  }

  if (tipo === "centro") {
    return { tenant_id: tenantId, nome, ativo: input.ativo ?? true };
  }

  if (tipo === "curso") {
    return { tenant_id: tenantId, nome, ativo: input.ativo ?? true };
  }

  if (tipo === "categoria") {
    return {
      tenant_id: tenantId,
      nome,
      tipo: input.tipo,
      natureza_id: input.natureza_id || null,
      dre_grupo: input.dre_grupo || "despesas_operacionais",
      ativo: input.ativo ?? true,
    };
  }

  return {
    tenant_id: tenantId,
    nome,
    categoria_id: input.categoria_id,
    dre_grupo: input.dre_grupo || null,
    ativo: input.ativo ?? true,
  };
}

async function ensureFinanceiroAdmin() {
  const auth = await getFinanceiroAuth();
  if (auth.perfil !== "admin") {
    throw new Error("Apenas admin financeiro pode alterar cadastros.");
  }

  return auth;
}

export async function createFinanceiroCadastro(input: Record<string, unknown>) {
  const tipo = input.tipo_cadastro as FinanceiroCadastroTipo;
  const table = cadastroTable(tipo);
  const auth = await ensureFinanceiroAdmin();
  const payload = cadastroPayload(tipo, auth.tenantId, input);

  const { data, error } = await auth.dataClient
    .from(table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateFinanceiroCadastro(input: Record<string, unknown>) {
  const tipo = input.tipo_cadastro as FinanceiroCadastroTipo;
  const id = String(input.id ?? "");
  const table = cadastroTable(tipo);
  const auth = await ensureFinanceiroAdmin();
  const payload = cadastroPayload(tipo, auth.tenantId, input);

  const { data, error } = await auth.dataClient
    .from(table)
    .update(payload)
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteFinanceiroCadastro(input: Record<string, unknown>) {
  const tipo = input.tipo_cadastro as FinanceiroCadastroTipo;
  const id = String(input.id ?? "");
  const table = cadastroTable(tipo);
  const linkColumn = cadastroLinkColumn(tipo);
  const auth = await ensureFinanceiroAdmin();

  const { count: lancamentosCount, error: countError } = await auth.dataClient
    .from("fin_lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", auth.tenantId)
    .eq(linkColumn, id);

  if (countError) {
    throw new Error(countError.message);
  }

  let relatedCount = lancamentosCount ?? 0;
  if (tipo === "categoria") {
    const { count: subCount, error: subError } = await auth.dataClient
      .from("fin_subcategorias")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", auth.tenantId)
      .eq("categoria_id", id);

    if (subError) {
      throw new Error(subError.message);
    }

    relatedCount += subCount ?? 0;
  }

  if (relatedCount > 0) {
    const { data, error } = await auth.dataClient
      .from(table)
      .update({ ativo: false })
      .eq("id", id)
      .eq("tenant_id", auth.tenantId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { data, softDeleted: true, relatedCount };
  }

  const { error } = await auth.dataClient
    .from(table)
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);

  if (error) {
    throw new Error(error.message);
  }

  return { data: null, softDeleted: false, relatedCount: 0 };
}
