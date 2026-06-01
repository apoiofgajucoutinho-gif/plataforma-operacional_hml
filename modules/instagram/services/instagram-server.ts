import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { InstagramContext, InstagramPostMetric } from "@/modules/instagram/types";

const allModules = ["agenda", "instagram", "ads", "objetivos", "financeiro", "adocao", "atividades", "relatorios", "admin"];

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

async function getAllowedModules(tenantId: string, role: string) {
  if (role === "ADMIN") {
    return allModules;
  }

  const dataClient = createAdminClient() ?? (await createClient());
  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item) => item.module as string);
}

export async function getInstagramContext(): Promise<InstagramContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { membership, error: membershipError, source } = await getMembershipByUserId(
    user.id,
  );

  if (membershipError) {
    return {
      tenant: null,
      account: null,
      posts: [],
      importRun: null,
      updatedAt: null,
      diagnostic: `${source}: ${membershipError.message}`,
      allowedModules: [],
    };
  }

  if (!membership) {
    return {
      tenant: null,
      account: null,
      posts: [],
      importRun: null,
      updatedAt: null,
      diagnostic: "Nenhum tenant ativo encontrado para este usuario.",
      allowedModules: [],
    };
  }

  const dataClient = createAdminClient() ?? userClient;
  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role);

  if (!allowedModules.includes("instagram")) {
    return {
      tenant: null,
      account: null,
      posts: [],
      importRun: null,
      updatedAt: null,
      diagnostic: "Seu perfil nao possui acesso ao modulo Instagram.",
      allowedModules,
    };
  }

  const { data: tenant } = await dataClient
    .from("tenants")
    .select("id, nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const { data: account, error: accountError } = await dataClient
    .from("instagram_accounts")
    .select("id, nome, username")
    .eq("tenant_id", membership.tenant_id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (accountError) {
    return {
      tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
      account: null,
      posts: [],
      importRun: null,
      updatedAt: null,
      diagnostic: accountError.message,
      allowedModules,
    };
  }

  if (!account) {
    return {
      tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
      account: null,
      posts: [],
      importRun: null,
      updatedAt: null,
      diagnostic:
        "Nenhuma conta Instagram encontrada. Execute a migration e o seed da planilha Insight.xlsx.",
      allowedModules,
    };
  }

  const { data: posts, error: postsError } = await dataClient
    .from("instagram_posts")
    .select("id, post_id, data_postagem, hora_postagem, tipo, legenda, permalink")
    .eq("tenant_id", membership.tenant_id)
    .eq("account_id", account.id)
    .order("data_postagem", { ascending: false });

  if (postsError) {
    return {
      tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
      account,
      posts: [],
      importRun: null,
      updatedAt: null,
      diagnostic: postsError.message,
      allowedModules,
    };
  }

  const postIds = (posts ?? []).map((post) => post.id);
  const { data: metrics } =
    postIds.length > 0
      ? await dataClient
          .from("instagram_metrics")
          .select(
            "post_id, likes, comentarios, alcance, salvos, compartilhamentos, engajamento_score, engajamento_classificacao, imported_at, updated_at",
          )
          .eq("tenant_id", membership.tenant_id)
          .in("post_id", postIds)
      : { data: [] };

  const metricsByPost = new Map((metrics ?? []).map((metric) => [metric.post_id, metric]));
  const combined: InstagramPostMetric[] = (posts ?? []).map((post) => {
    const metric = metricsByPost.get(post.id);

    return {
      id: post.id,
      post_id: post.post_id,
      data_postagem: post.data_postagem,
      hora_postagem: post.hora_postagem,
      tipo: post.tipo,
      legenda: post.legenda,
      permalink: post.permalink,
      likes: metric?.likes ?? 0,
      comentarios: metric?.comentarios ?? 0,
      alcance: metric?.alcance ?? null,
      salvos: metric?.salvos ?? null,
      compartilhamentos: metric?.compartilhamentos ?? null,
      engajamento_score: metric?.engajamento_score ?? null,
      engajamento_classificacao: metric?.engajamento_classificacao ?? "N/A",
    };
  });
  const updatedAt = (metrics ?? [])
    .map((metric) => metric.imported_at ?? metric.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const { data: importRun } = await dataClient
    .from("instagram_import_runs")
    .select("source, status, total_rows, finished_at")
    .eq("tenant_id", membership.tenant_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    account,
    posts: combined,
    importRun: importRun ?? null,
    updatedAt,
    diagnostic: null,
    allowedModules,
  };
}
