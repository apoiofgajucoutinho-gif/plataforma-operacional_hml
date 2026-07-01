import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseAny = any;

const writableRoles = new Set(["ADMIN", "SUPORTE"]);

async function getAuthContext() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const admin = createAdminClient();
  const dataClient: SupabaseAny = admin ?? userClient;
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) return { error: "Nao autenticado.", status: 401 as const };

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const { data: membership } = localMembership
    ? { data: localMembership }
    : await dataClient
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", currentUser.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

  if (!membership) return { error: "Usuario sem tenant ativo.", status: 403 as const };

  if (!writableRoles.has(membership.role)) {
    const { data: permission } = await dataClient
      .from("tenant_module_permissions")
      .select("can_write")
      .eq("tenant_id", membership.tenant_id)
      .eq("role", membership.role)
      .eq("module", "norwyn")
      .maybeSingle();

    if (!permission?.can_write) return { error: "Sem permissao para editar produtos Norwyn.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id as string, userId: currentUser.id as string };
}

async function loadProducts(dataClient: SupabaseAny, tenantId: string) {
  const { data, error } = await dataClient
    .from("products")
    .select("id, tenant_id, nome_oficial, produto_base, categoria, fiscal_category, financial_notes, descricao, status, tipo, preco_oficial, duracao, unidade_duracao, link_oferta, percentual_coproducao, percentual_hotmart, percentual_gateway, percentual_imposto, receita_liquida_estimada_pct, observacoes, ativo, source, manually_edited_at, product_aliases(id, alias, produto_base, origem, confianca, principal, ativo, source, manually_edited_at), product_components(id, componente, categoria, ordem, duracao, unidade_duracao, link, observacoes, ativo, source, manually_edited_at), product_batches(id, turma, inicio, fim, status, meta_alunos, alunos, receita_meta, receita_real, observacoes, ativo, source, manually_edited_at)")
    .eq("tenant_id", tenantId)
    .order("produto_base", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

function manualStamp(userId: string) {
  return {
    source: "manual",
    manually_edited_at: new Date().toISOString(),
    manually_edited_by: userId,
  };
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value]),
  );
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "upsert_product") {
      const product = body.product ?? {};
      const nomeOficial = String(product.nome_oficial ?? "").trim();
      const produtoBase = String(product.produto_base ?? "").trim();
      if (!nomeOficial || !produtoBase) return NextResponse.json({ error: "Nome oficial e produto base sao obrigatorios." }, { status: 400 });

      const payload = compactPayload({
        id: product.id || undefined,
        tenant_id: auth.tenantId,
        nome_oficial: nomeOficial,
        produto_base: produtoBase,
        categoria: product.categoria,
        fiscal_category: product.fiscal_category,
        financial_notes: product.financial_notes,
        descricao: product.descricao,
        status: product.status || "ativo",
        tipo: product.tipo || "Entrada",
        preco_oficial: product.preco_oficial,
        duracao: product.duracao,
        unidade_duracao: product.unidade_duracao,
        link_oferta: product.link_oferta,
        percentual_coproducao: product.percentual_coproducao,
        percentual_hotmart: product.percentual_hotmart,
        percentual_gateway: product.percentual_gateway,
        percentual_imposto: product.percentual_imposto,
        observacoes: product.observacoes,
        ativo: product.ativo !== false,
        ...manualStamp(auth.userId),
      });
      const { error } = await auth.dataClient.from("products").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "toggle_product") {
      const { error } = await auth.dataClient
        .from("products")
        .update({ ativo: Boolean(body.ativo), status: body.ativo ? "ativo" : "arquivado", ...manualStamp(auth.userId) })
        .eq("tenant_id", auth.tenantId)
        .eq("id", body.id);
      if (error) throw new Error(error.message);
    } else if (action === "upsert_alias") {
      const alias = body.alias ?? {};
      const payload = compactPayload({
        id: alias.id || undefined,
        tenant_id: auth.tenantId,
        product_id: body.product_id,
        alias: alias.alias,
        produto_base: alias.produto_base,
        origem: alias.origem || "Manual",
        confianca: alias.confianca ?? 80,
        principal: alias.principal === true,
        ativo: true,
        ...manualStamp(auth.userId),
      });
      const { error } = await auth.dataClient.from("product_aliases").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "toggle_alias") {
      const { error } = await auth.dataClient.from("product_aliases").update({ ativo: Boolean(body.ativo), ...manualStamp(auth.userId) }).eq("tenant_id", auth.tenantId).eq("id", body.id);
      if (error) throw new Error(error.message);
    } else if (action === "upsert_component") {
      const component = body.component ?? {};
      const payload = compactPayload({
        id: component.id || undefined,
        tenant_id: auth.tenantId,
        product_id: body.product_id,
        componente: component.componente,
        categoria: component.categoria || "Curso",
        ordem: component.ordem ?? 1,
        duracao: component.duracao,
        unidade_duracao: component.unidade_duracao,
        link: component.link,
        observacoes: component.observacoes,
        ativo: true,
        ...manualStamp(auth.userId),
      });
      const { error } = await auth.dataClient.from("product_components").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "toggle_component") {
      const { error } = await auth.dataClient.from("product_components").update({ ativo: Boolean(body.ativo), ...manualStamp(auth.userId) }).eq("tenant_id", auth.tenantId).eq("id", body.id);
      if (error) throw new Error(error.message);
    } else if (action === "upsert_batch") {
      const batch = body.batch ?? {};
      const payload = compactPayload({
        id: batch.id || undefined,
        tenant_id: auth.tenantId,
        product_id: body.product_id,
        turma: batch.turma,
        inicio: batch.inicio,
        fim: batch.fim,
        status: batch.status || "planejada",
        meta_alunos: batch.meta_alunos,
        alunos: batch.alunos,
        receita_meta: batch.receita_meta,
        receita_real: batch.receita_real,
        observacoes: batch.observacoes,
        ativo: true,
        ...manualStamp(auth.userId),
      });
      const { error } = await auth.dataClient.from("product_batches").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "toggle_batch") {
      const { error } = await auth.dataClient.from("product_batches").update({ ativo: Boolean(body.ativo), ...manualStamp(auth.userId) }).eq("tenant_id", auth.tenantId).eq("id", body.id);
      if (error) throw new Error(error.message);
    } else {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const products = await loadProducts(auth.dataClient, auth.tenantId);
    return NextResponse.json({ products, message: "Catalogo de produtos atualizado." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
}
