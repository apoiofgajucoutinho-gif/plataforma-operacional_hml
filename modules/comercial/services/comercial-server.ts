import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ComercialAluno,
  ComercialContext,
  ComercialProduto,
  ComercialRecebivel,
  ComercialVenda,
} from "@/modules/comercial/types";

type SupabaseAny = any;

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
  if (role === "ADMIN") return allModules;

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item: { module: string }) => item.module);
}

function asNumberRows<T extends Record<string, unknown>>(rows: T[] | null | undefined) {
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

function latestDate(rows: Array<{ updated_at?: string | null; created_at?: string | null }>) {
  return rows
    .map((row) => row.updated_at ?? row.created_at ?? null)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

export async function getComercialContext(): Promise<ComercialContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) redirect("/login");

  const { membership, error: membershipError, source } = await getMembershipByUserId(user.id);
  const dataClient = createAdminClient() ?? userClient;

  if (membershipError) {
    return emptyContext(`${source}: ${membershipError.message}`);
  }

  if (!membership) {
    return emptyContext("Nenhum tenant ativo encontrado para este usuario.");
  }

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, dataClient);
  const canRead = allowedModules.includes("comercial");
  const canWrite =
    membership.role === "ADMIN" ||
    Boolean(
      (
        await dataClient
          .from("tenant_module_permissions")
          .select("can_write")
          .eq("tenant_id", membership.tenant_id)
          .eq("role", membership.role)
          .eq("module", "comercial")
          .maybeSingle()
      ).data?.can_write,
    );

  if (!canRead) {
    return {
      ...emptyContext("Seu perfil nao possui acesso ao modulo Comercial."),
      allowedModules,
    };
  }

  try {
    const [tenantResult, vendasResult, recebiveisResult, alunosResult, produtosResult] = await Promise.all([
      dataClient.from("tenants").select("id, nome").eq("id", membership.tenant_id).maybeSingle(),
      dataClient
        .from("comercial_vendas")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("data_compra", { ascending: false, nullsFirst: false })
        .limit(500),
      dataClient
        .from("comercial_recebiveis")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("data_prevista", { ascending: true, nullsFirst: false })
        .limit(1000),
      dataClient
        .from("comercial_alunos")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("ultima_compra_at", { ascending: false, nullsFirst: false })
        .limit(500),
      dataClient
        .from("comercial_produtos")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("nome"),
    ]);

    if (vendasResult.error) throw new Error(vendasResult.error.message);
    if (recebiveisResult.error) throw new Error(recebiveisResult.error.message);
    if (alunosResult.error) throw new Error(alunosResult.error.message);
    if (produtosResult.error) throw new Error(produtosResult.error.message);

    const vendas = asNumberRows(vendasResult.data) as ComercialVenda[];
    const recebiveis = asNumberRows(recebiveisResult.data) as ComercialRecebivel[];
    const alunos = alunosResult.data as ComercialAluno[];
    const produtos = produtosResult.data as ComercialProduto[];

    return {
      tenant: tenantResult.data,
      allowedModules,
      diagnostic: null,
      updatedAt: latestDate([...vendas, ...recebiveis, ...alunos, ...produtos]),
      canWrite,
      vendas,
      recebiveis,
      alunos,
      produtos,
    };
  } catch (error) {
    return {
      ...emptyContext(error instanceof Error ? error.message : "Nao foi possivel carregar Comercial."),
      allowedModules,
      canWrite,
    };
  }
}

function emptyContext(diagnostic: string): ComercialContext {
  return {
    tenant: null,
    allowedModules: [],
    diagnostic,
    updatedAt: null,
    canWrite: false,
    vendas: [],
    recebiveis: [],
    alunos: [],
    produtos: [],
  };
}
