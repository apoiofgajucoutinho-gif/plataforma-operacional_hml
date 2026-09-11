import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
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

  return { membership: data, error };
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules;

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item: { module: string }) => item.module);
}

function inferFinanceProfile(role: string, stored?: FinPerfil | null): FinPerfil | null {
  if (role === "ADMIN") return "admin";
  if (role === "OPERACIONAL" || role === "SUPORTE") return "suporte";
  if (role === "ESPECIALISTA") return "especialista";
  return stored ?? null;
}

async function getFinanceiroAuth(): Promise<FinanceiroAuth> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  const adminClient = createAdminClient();
  const profileClient = adminClient ?? userClient;
  const currentUser = user ?? getLocalBypassUser();

  if (!currentUser) redirect("/login");

  const localMembership = user ? null : await getLocalBypassMembership(profileClient);
  const { membership, error: membershipError } = localMembership
    ? { membership: localMembership, error: null }
    : await getMembershipByUserId(currentUser.id);

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error("Usuario sem tenant vinculado.");

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, profileClient);
  if (!allowedModules.includes("financeiro")) {
    throw new Error("Seu perfil nao possui acesso ao modulo Financeiro.");
  }

  const { data: finProfile } = await profileClient
    .from("fin_perfis_usuario")
    .select("perfil, ativo")
    .eq("tenant_id", membership.tenant_id)
    .eq("user_id", currentUser.id)
    .eq("ativo", true)
    .maybeSingle();

  const perfil = inferFinanceProfile(membership.role, finProfile?.perfil ?? null);
  if (!perfil) throw new Error("Seu usuario ainda nao possui perfil financeiro ativo.");

  return {
    userId: currentUser.id,
    userEmail: currentUser.email ?? null,
    tenantId: membership.tenant_id,
    role: membership.role,
    perfil,
    allowedModules,
    dataClient: adminClient ?? userClient,
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

async function fetchPaged<T>(queryFactory: () => SupabaseAny, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

export async function getFinanceiroContext(): Promise<FinanceiroContext> {
  try {
    const auth = await getFinanceiroAuth();
    const canSeeAdminData = auth.perfil === "admin" || auth.perfil === "suporte";

    const [
      tenantResult,
      bancosResult,
      cartoesResult,
      centrosResult,
      naturezasResult,
      categoriasResult,
      subcategoriasResult,
      cursosResult,
      lancamentos,
      dreResult,
      dreCentroResult,
      dreCursoResult,
      faturasResult,
    ] = await Promise.all([
      auth.dataClient.from("tenants").select("id, nome").eq("id", auth.tenantId).maybeSingle(),
      canSeeAdminData || auth.perfil === "especialista"
        ? auth.dataClient.from("fin_bancos").select("*").eq("tenant_id", auth.tenantId).order("nome")
        : Promise.resolve({ data: [] }),
      canSeeAdminData || auth.perfil === "especialista"
        ? auth.dataClient.from("fin_cartoes").select("*").eq("tenant_id", auth.tenantId).order("nome")
        : Promise.resolve({ data: [] }),
      auth.dataClient.from("fin_centros_resultado").select("*").eq("tenant_id", auth.tenantId).order("nome"),
      auth.dataClient.from("fin_naturezas").select("*").eq("tenant_id", auth.tenantId).order("nome"),
      auth.dataClient.from("fin_categorias").select("*").eq("tenant_id", auth.tenantId).order("nome"),
      auth.dataClient.from("fin_subcategorias").select("*").eq("tenant_id", auth.tenantId).order("nome"),
      auth.dataClient.from("fin_cursos").select("*").eq("tenant_id", auth.tenantId).order("nome"),
      fetchPaged<FinLancamento>(() => auth.dataClient
        .from("fin_lancamentos")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .order("data_pagamento", { ascending: false })
        .order("created_at", { ascending: false }), 1000),
      auth.dataClient.from("fin_v_dre_consolidado").select("*").eq("tenant_id", auth.tenantId).order("mes_competencia", { ascending: false }),
      auth.dataClient.from("fin_v_dre_por_centro").select("*").eq("tenant_id", auth.tenantId).order("mes_competencia", { ascending: false }),
      auth.dataClient.from("fin_v_dre_por_curso").select("*").eq("tenant_id", auth.tenantId).order("mes_competencia", { ascending: false }),
      canSeeAdminData
        ? auth.dataClient.from("fin_v_fatura_cartao").select("*").eq("tenant_id", auth.tenantId).order("mes_vencimento", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    const normalizedLancamentos = asNumber(lancamentos as unknown as Record<string, unknown>[]) as FinLancamento[];

    return {
      tenant: tenantResult.data ? { id: tenantResult.data.id, nome: tenantResult.data.nome } : null,
      userEmail: auth.userEmail,
      role: auth.role,
      perfil: auth.perfil,
      allowedModules: auth.allowedModules,
      diagnostic: null,
      updatedAt: getLatestTimestamp(normalizedLancamentos),
      bancos: asNumber(bancosResult.data) as FinBanco[],
      cartoes: asNumber(cartoesResult.data) as FinCartao[],
      centros: centrosResult.data ?? ([] as FinCentroResultado[]),
      naturezas: naturezasResult.data ?? ([] as FinNatureza[]),
      categorias: categoriasResult.data ?? ([] as FinCategoria[]),
      subcategorias: subcategoriasResult.data ?? ([] as FinSubcategoria[]),
      cursos: cursosResult.data ?? ([] as FinCurso[]),
      lancamentos: normalizedLancamentos,
      dre: asNumber(dreResult.data) as FinDre[],
      drePorCentro: asNumber(dreCentroResult.data) as FinDreCentro[],
      drePorCurso: asNumber(dreCursoResult.data) as FinDreCurso[],
      faturas: asNumber(faturasResult.data) as FinFaturaCartao[],
      commercialSales: [],
      adsRows: [],
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
      role: null,
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
      commercialSales: [],
      adsRows: [],
    };
  }
}

function lancamentoPayload(input: CreateLancamentoPayload, tenantId?: string, userId?: string) {
  const dataPagamento = input.data_pagamento;
  const status = input.status;
  return {
    ...(tenantId ? { tenant_id: tenantId } : {}),
    data_pagamento: dataPagamento,
    mes_competencia: input.mes_competencia,
    data_vencimento: input.data_vencimento || dataPagamento,
    data_realizacao: status === "realizado" ? (input.data_realizacao || dataPagamento) : null,
    tipo: input.tipo,
    status,
    natureza_fluxo: input.natureza_fluxo || "operacional",
    comportamento: input.comportamento || "nao_aplicavel",
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
    responsavel: input.responsavel || null,
    origem: "manual",
    fonte_original: "manual",
    classificacao_status: "trusted",
    ...(userId ? { created_by: userId } : {}),
  };
}

function assertCanWriteLancamentos(auth: FinanceiroAuth) {
  if (auth.perfil !== "admin" && auth.perfil !== "suporte" && auth.perfil !== "especialista") {
    throw new Error("Seu perfil financeiro nao pode alterar lancamentos.");
  }
}

function validateLancamentoInput(input: CreateLancamentoPayload) {
  if (!input.descricao?.trim()) throw new Error("Informe uma descricao.");
  if (!input.valor || input.valor <= 0) throw new Error("Informe um valor maior que zero.");
}

export async function createFinanceiroLancamento(input: CreateLancamentoPayload) {
  const auth = await getFinanceiroAuth();
  assertCanWriteLancamentos(auth);
  validateLancamentoInput(input);

  const { data, error } = await auth.dataClient
    .from("fin_lancamentos")
    .insert(lancamentoPayload(input, auth.tenantId, auth.userId))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateFinanceiroLancamento(input: CreateLancamentoPayload & { id?: string }) {
  const auth = await getFinanceiroAuth();
  assertCanWriteLancamentos(auth);
  if (!input.id) throw new Error("Informe o lancamento para editar.");
  validateLancamentoInput(input);

  const { data, error } = await auth.dataClient
    .from("fin_lancamentos")
    .update(lancamentoPayload(input))
    .eq("id", input.id)
    .eq("tenant_id", auth.tenantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFinanceiroLancamento(input: { id?: string }) {
  const auth = await getFinanceiroAuth();
  assertCanWriteLancamentos(auth);
  if (!input.id) throw new Error("Informe o lancamento para excluir.");

  const { data, error } = await auth.dataClient
    .from("fin_lancamentos")
    .delete()
    .eq("id", input.id)
    .eq("tenant_id", auth.tenantId)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

function assertAdmin(auth: FinanceiroAuth) {
  if (auth.perfil !== "admin") throw new Error("Apenas admin financeiro pode alterar este cadastro.");
}

export async function createFinanceiroBanco(input: { nome: string; apelido?: string | null; saldo_inicial?: number }) {
  const auth = await getFinanceiroAuth();
  assertAdmin(auth);
  const { data, error } = await auth.dataClient.from("fin_bancos").insert({ tenant_id: auth.tenantId, nome: input.nome.trim(), apelido: input.apelido?.trim() || null, saldo_inicial: input.saldo_inicial || 0, ativo: true }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateFinanceiroBanco(input: { id: string; nome: string; apelido?: string | null; saldo_inicial?: number; ativo?: boolean }) {
  const auth = await getFinanceiroAuth();
  assertAdmin(auth);
  const { data, error } = await auth.dataClient.from("fin_bancos").update({ nome: input.nome.trim(), apelido: input.apelido?.trim() || null, saldo_inicial: input.saldo_inicial || 0, ativo: input.ativo ?? true }).eq("id", input.id).eq("tenant_id", auth.tenantId).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createFinanceiroCartao(input: { nome: string; banco_id: string; dia_fechamento: number; dia_vencimento: number; limite?: number | null }) {
  const auth = await getFinanceiroAuth();
  assertAdmin(auth);
  const { data, error } = await auth.dataClient.from("fin_cartoes").insert({ tenant_id: auth.tenantId, nome: input.nome.trim(), banco_id: input.banco_id, dia_fechamento: input.dia_fechamento, dia_vencimento: input.dia_vencimento, limite: input.limite || null, ativo: true }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateFinanceiroCartao(input: { id: string; nome: string; banco_id: string; dia_fechamento: number; dia_vencimento: number; limite?: number | null; ativo?: boolean }) {
  const auth = await getFinanceiroAuth();
  assertAdmin(auth);
  const { data, error } = await auth.dataClient.from("fin_cartoes").update({ nome: input.nome.trim(), banco_id: input.banco_id, dia_fechamento: input.dia_fechamento, dia_vencimento: input.dia_vencimento, limite: input.limite || null, ativo: input.ativo ?? true }).eq("id", input.id).eq("tenant_id", auth.tenantId).select("*").single();
  if (error) throw new Error(error.message);
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
  if (!nome) throw new Error("Informe o nome do cadastro.");
  if (tipo === "centro" || tipo === "curso") return { tenant_id: tenantId, nome, ativo: input.ativo ?? true };
  if (tipo === "categoria") return { tenant_id: tenantId, nome, tipo: input.tipo, natureza_id: input.natureza_id || null, dre_grupo: input.dre_grupo || "despesas_operacionais", natureza_fluxo_padrao: input.natureza_fluxo_padrao || null, comportamento_padrao: input.comportamento_padrao || null, ativo: input.ativo ?? true };
  return { tenant_id: tenantId, nome, categoria_id: input.categoria_id, dre_grupo: input.dre_grupo || null, natureza_fluxo_padrao: input.natureza_fluxo_padrao || null, comportamento_padrao: input.comportamento_padrao || null, ativo: input.ativo ?? true };
}

async function ensureFinanceiroAdmin() {
  const auth = await getFinanceiroAuth();
  assertAdmin(auth);
  return auth;
}

export async function createFinanceiroCadastro(input: Record<string, unknown>) {
  const tipo = input.tipo_cadastro as FinanceiroCadastroTipo;
  const auth = await ensureFinanceiroAdmin();
  const { data, error } = await auth.dataClient.from(cadastroTable(tipo)).insert(cadastroPayload(tipo, auth.tenantId, input)).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateFinanceiroCadastro(input: Record<string, unknown>) {
  const tipo = input.tipo_cadastro as FinanceiroCadastroTipo;
  const id = String(input.id ?? "");
  const auth = await ensureFinanceiroAdmin();
  const { data, error } = await auth.dataClient.from(cadastroTable(tipo)).update(cadastroPayload(tipo, auth.tenantId, input)).eq("id", id).eq("tenant_id", auth.tenantId).select("*").single();
  if (error) throw new Error(error.message);
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
  if (countError) throw new Error(countError.message);

  let relatedCount = lancamentosCount ?? 0;
  if (tipo === "categoria") {
    const { count: subCount, error: subError } = await auth.dataClient.from("fin_subcategorias").select("id", { count: "exact", head: true }).eq("tenant_id", auth.tenantId).eq("categoria_id", id);
    if (subError) throw new Error(subError.message);
    relatedCount += subCount ?? 0;
  }

  if (relatedCount > 0) {
    const { data, error } = await auth.dataClient.from(table).update({ ativo: false }).eq("id", id).eq("tenant_id", auth.tenantId).select("*").single();
    if (error) throw new Error(error.message);
    return { data, softDeleted: true, relatedCount };
  }

  const { error } = await auth.dataClient.from(table).delete().eq("id", id).eq("tenant_id", auth.tenantId);
  if (error) throw new Error(error.message);
  return { data: null, softDeleted: false, relatedCount: 0 };
}
