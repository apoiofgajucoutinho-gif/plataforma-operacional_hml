import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ComercialAluno,
  ComercialBusinessProfile,
  ComercialBusinessTaxRule,
  ComercialContext,
  ComercialNorwynProduct,
  ComercialProduto,
  ComercialRawImport,
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

async function fetchTenantRows({
  client,
  table,
  tenantId,
  orderColumn,
  ascending,
  nullsFirst,
  maxRows = 20000,
}: {
  client: SupabaseAny;
  table: string;
  tenantId: string;
  orderColumn: string;
  ascending: boolean;
  nullsFirst?: boolean;
  maxRows?: number;
}) {
  const pageSize = 1000;
  const rows: Array<Record<string, unknown>> = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("tenant_id", tenantId)
      .order(orderColumn, { ascending, nullsFirst })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

export async function getComercialContext(): Promise<ComercialContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const dataClient = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();

  if (!currentUser) redirect("/login");

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const {
    membership,
    error: membershipError,
    source,
  } = localMembership
    ? { membership: localMembership, error: null, source: "local_bypass" }
    : await getMembershipByUserId(currentUser.id);

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
    const [tenantResult, vendasResult, recebiveisResult, alunosResult, produtosResult, rawImportsResult, norwynProductsResult, businessProfileResult, taxRulesResult] = await Promise.all([
      dataClient.from("tenants").select("id, nome").eq("id", membership.tenant_id).maybeSingle(),
      fetchTenantRows({
        client: dataClient,
        table: "comercial_vendas",
        tenantId: membership.tenant_id,
        orderColumn: "data_compra",
        ascending: false,
        nullsFirst: false,
      }),
      fetchTenantRows({
        client: dataClient,
        table: "comercial_recebiveis",
        tenantId: membership.tenant_id,
        orderColumn: "data_prevista",
        ascending: true,
        nullsFirst: false,
      }),
      fetchTenantRows({
        client: dataClient,
        table: "comercial_alunos",
        tenantId: membership.tenant_id,
        orderColumn: "ultima_compra_at",
        ascending: false,
        nullsFirst: false,
      }),
      dataClient
        .from("comercial_produtos")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("nome"),
      dataClient
        .from("comercial_hotmart_raw")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("received_at", { ascending: false })
        .limit(50),
      dataClient
        .from("products")
        .select("id, tenant_id, nome_oficial, produto_base, categoria, fiscal_category, preco_oficial, percentual_coproducao, ativo, product_aliases(id, alias, produto_base, principal, ativo), product_components(id, componente, categoria, ativo)")
        .eq("tenant_id", membership.tenant_id)
        .order("nome_oficial"),
      dataClient
        .from("business_profile")
        .select("id, tenant_id, company_name, tax_regime, default_coproduction_percent, hotmart_percent_fee, hotmart_fixed_fee, hotmart_withdraw_fee, gateway_percent_fee, status")
        .eq("tenant_id", membership.tenant_id)
        .eq("status", "current")
        .maybeSingle(),
      dataClient
        .from("business_tax_rules")
        .select("id, tenant_id, business_profile_id, category, cnae, tax_percent, description, starts_at, ends_at, status")
        .eq("tenant_id", membership.tenant_id)
        .order("category"),
    ]);

    if (produtosResult.error) throw new Error(produtosResult.error.message);
    if (rawImportsResult.error) throw new Error(rawImportsResult.error.message);

    const vendas = asNumberRows(vendasResult) as ComercialVenda[];
    const recebiveis = asNumberRows(recebiveisResult) as ComercialRecebivel[];
    const alunos = alunosResult as ComercialAluno[];
    const produtos = produtosResult.data as ComercialProduto[];
    const rawImports = rawImportsResult.data as ComercialRawImport[];
    const norwynProducts = norwynProductsResult.error ? [] : (norwynProductsResult.data as ComercialNorwynProduct[]);
    const businessProfile = businessProfileResult.error ? null : (businessProfileResult.data as ComercialBusinessProfile | null);
    const taxRules = taxRulesResult.error ? [] : (taxRulesResult.data as ComercialBusinessTaxRule[]);

    return {
      tenant: tenantResult.data,
      allowedModules,
      diagnostic: null,
      updatedAt: latestDate([...vendas, ...recebiveis, ...alunos, ...produtos, ...rawImports]),
      canWrite,
      vendas,
      recebiveis,
      alunos,
      produtos,
      norwynProducts,
      businessProfile,
      taxRules,
      rawImports,
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
    norwynProducts: [],
    businessProfile: null,
    taxRules: [],
    rawImports: [],
  };
}
