import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseAny = any;

async function getAuthContext() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const dataClient: SupabaseAny = createAdminClient() ?? userClient;
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
  if (membership.role !== "ADMIN") {
    const { data: permission } = await dataClient
      .from("tenant_module_permissions")
      .select("can_write")
      .eq("tenant_id", membership.tenant_id)
      .eq("role", membership.role)
      .eq("module", "atividades")
      .maybeSingle();
    if (!permission?.can_write) return { error: "Sem permissao para criar tarefa Mission OS.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id as string, userId: currentUser.id as string };
}

function clean(value: unknown, max = 3000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const title = clean(body.title, 220);
    const landingKey = clean(body.landing_key, 120);
    const campaignKey = clean(body.campaign_key, 180);
    const ruleId = clean(body.rule_id, 180);
    const contentHash = clean(body.content_hash, 120);
    const severity = clean(body.severity, 40) || "WARNING";
    const evidence = Array.isArray(body.evidence) ? body.evidence.map((item: unknown) => clean(item, 600)).filter(Boolean) : [];
    const signature = `norwyn-readiness:${campaignKey}:${landingKey}:${ruleId}:${contentHash}`;

    if (!title || !landingKey || !campaignKey || !ruleId || !contentHash) {
      return NextResponse.json({ error: "Dados da issue incompletos." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await auth.dataClient
      .from("atividades_tarefas")
      .select("id, titulo, status")
      .eq("tenant_id", auth.tenantId)
      .ilike("descricao", `%${signature}%`)
      .limit(1)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) {
      return NextResponse.json({ task: existing, duplicate: true, mission_os_id: `TASK-${String(existing.id).slice(0, 8).toUpperCase()}` });
    }

    const description = [
      clean(body.description, 1200),
      "",
      `Campanha: ${campaignKey}`,
      `Landing: ${landingKey}`,
      `URL: ${clean(body.url, 1000)}`,
      `Prioridade QA: ${severity}`,
      `Regra QA: ${ruleId}`,
      `Snapshot/hash: ${contentHash}`,
      `Detectado em: ${clean(body.detected_at, 80)}`,
      "",
      "Evidencias:",
      ...evidence.map((item: string) => `- ${item}`),
      "",
      `Assinatura: ${signature}`,
    ].join("\n");

    const priority = severity === "BLOCKER" || severity === "CRITICAL" ? "alta" : severity === "WARNING" ? "media" : "baixa";
    const { data, error } = await auth.dataClient
      .from("atividades_tarefas")
      .insert({
        tenant_id: auth.tenantId,
        titulo: title,
        descricao: description,
        time_responsavel: "marketing",
        prioridade: priority,
        status: "backlog",
        data_inicio: new Date().toISOString().slice(0, 10),
        validacao_obrigatoria: true,
        created_by: auth.userId,
      })
      .select("id, titulo, status")
      .single();
    if (error) throw new Error(error.message);

    await auth.dataClient.from("atividades_logs").insert({
      tenant_id: auth.tenantId,
      entidade: "tarefa",
      entidade_id: data.id,
      acao: "create",
      descricao: `Norwyn Campaign Readiness: ${title}`,
      user_id: auth.userId,
    });

    return NextResponse.json({ task: data, duplicate: false, mission_os_id: `TASK-${String(data.id).slice(0, 8).toUpperCase()}` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao criar tarefa." }, { status: 500 });
  }
}
