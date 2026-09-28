import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseAny = any;

const writableEntities = new Set(["projeto", "tarefa", "template", "template_tarefa", "recorrencia"]);
const tableByEntity: Record<string, string> = {
  projeto: "atividades_projetos",
  tarefa: "atividades_tarefas",
  template: "atividades_templates",
  template_tarefa: "atividades_template_tarefas",
  recorrencia: "atividades_recorrencias",
};

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value === "") return [key, null];
      return [key, value];
    }),
  );
}

function roleCanTouchTeam(role: string, team: string | null | undefined) {
  if (role === "ADMIN" || role === "SUPORTE" || role === "ESPECIALISTA") return true;
  if (role === "OPERACIONAL") return team === "suporte";
  if (role === "MARKETING_PARTNER") return team === "marketing";
  if (role === "CLINICA") return team === "especialista";
  return false;
}

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

    if (membership.role !== "ESPECIALISTA" && membership.role !== "OPERACIONAL" && !permission?.can_write) return { error: "Sem permissao para alterar atividades.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id as string, role: membership.role as string, userId: currentUser.id };
}

async function writeLog(
  dataClient: SupabaseAny,
  input: { tenantId: string; entity: string; id?: string | null; action: string; description?: string | null; userId: string },
) {
  await dataClient.from("atividades_logs").insert({
    tenant_id: input.tenantId,
    entidade: input.entity,
    entidade_id: input.id ?? null,
    acao: input.action,
    detalhe: input.description ?? null,
    user_id: input.userId,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const entity = String(body.entity ?? "");
  const action = String(body.action ?? "create");

  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (action === "start_playbook") {
    const input = body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};
    const templateId = String(input.template_id ?? "");
    const name = String(input.nome ?? "").trim();
    const owner = String(input.responsavel_nome ?? "").trim();
    const targetDate = String(input.data_alvo ?? "");
    const productId = input.product_id ? String(input.product_id) : null;
    const campaignId = input.campaign_id ? String(input.campaign_id) : null;
    const landingPageId = input.landing_page_id ? String(input.landing_page_id) : null;
    if (!templateId || !name || !targetDate) return NextResponse.json({ error: "Template, nome e data alvo sao obrigatorios." }, { status: 400 });

    const { data: template } = await auth.dataClient.from("atividades_templates").select("id,nome,categoria,duracao_dias").eq("tenant_id", auth.tenantId).eq("id", templateId).eq("ativo", true).maybeSingle();
    if (!template) return NextResponse.json({ error: "Playbook nao encontrado." }, { status: 404 });
    const team = auth.role === "OPERACIONAL" ? "suporte" : auth.role === "ESPECIALISTA" ? "especialista" : "gestao_dados";
    const startedAt = new Date().toISOString().slice(0, 10);
    const contextMetadata = { playbook: template.nome, product_id: productId, campaign_id: campaignId, landing_page_id: landingPageId, target_date: targetDate, source: "playbook_v1" };
    const { data: project, error: projectError } = await auth.dataClient.from("atividades_projetos").insert({
      tenant_id: auth.tenantId,
      nome: name,
      categoria: template.categoria,
      descricao: `Playbook ${template.nome}. Contexto operacional registrado nas tarefas do projeto.`,
      time_responsavel: team,
      responsavel_nome: owner || null,
      data_inicio: startedAt,
      data_fim: targetDate,
      status: "em_andamento",
      template_id: template.id,
      created_by: auth.userId,
    }).select("*").single();
    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });

    try {
      const { data: expanded, error: expansionError } = await auth.dataClient.rpc("atividades_expandir_template", { p_projeto_id: project.id });
      if (expansionError) throw new Error(expansionError.message);
      const { error: taskUpdateError } = await auth.dataClient.from("atividades_tarefas").update({
        product_id: productId,
        campaign_id: campaignId,
        responsavel_nome: owner || null,
        source_module: "landing-pages",
        source_event: "playbook_started",
        metadata: contextMetadata,
      }).eq("tenant_id", auth.tenantId).eq("projeto_id", project.id);
      if (taskUpdateError) throw new Error(taskUpdateError.message);
      const { data: tasks, error: taskError } = await auth.dataClient.from("atividades_tarefas").select("*").eq("tenant_id", auth.tenantId).eq("projeto_id", project.id).order("ordem");
      if (taskError) throw new Error(taskError.message);
      const taskIds = (tasks ?? []).map((task: { id: string }) => task.id);
      const { count: dependencyCount } = taskIds.length
        ? await auth.dataClient.from("atividades_dependencias").select("id", { count: "exact", head: true }).eq("tenant_id", auth.tenantId).in("tarefa_id", taskIds)
        : { count: 0 };
      await writeLog(auth.dataClient, { tenantId: auth.tenantId, entity: "projeto", id: project.id, action: "start_playbook", description: `${template.nome}: ${expanded ?? 0} tarefas`, userId: auth.userId });
      return NextResponse.json({ project, tasks: tasks ?? [], created: expanded ?? 0, dependencies: dependencyCount ?? 0 });
    } catch (error) {
      await auth.dataClient.from("atividades_projetos").delete().eq("tenant_id", auth.tenantId).eq("id", project.id);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao iniciar playbook." }, { status: 400 });
    }
  }

  if (!writableEntities.has(entity)) {
    return NextResponse.json({ error: "Entidade invalida." }, { status: 400 });
  }

  const rawPayload = cleanPayload({ ...(body.payload ?? {}), tenant_id: auth.tenantId });
  const team = String(rawPayload.time_responsavel ?? "");
  const adminOnly = entity === "template" || entity === "template_tarefa";

  if (adminOnly && auth.role !== "ADMIN" && auth.role !== "SUPORTE") {
    return NextResponse.json({ error: "Apenas Admin/Suporte pode alterar templates." }, { status: 403 });
  }

  if (!adminOnly && team && !roleCanTouchTeam(auth.role, team)) {
    return NextResponse.json({ error: "Seu perfil nao pode alterar este time." }, { status: 403 });
  }

  const table = tableByEntity[entity];

  if (action === "delete") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });

    if (entity === "tarefa") {
      const { data: task } = await auth.dataClient
        .from("atividades_tarefas")
        .select("projeto_id, time_responsavel")
        .eq("tenant_id", auth.tenantId)
        .eq("id", id)
        .maybeSingle();

      if (!task) return NextResponse.json({ error: "Tarefa nao encontrada." }, { status: 404 });
      if (!roleCanTouchTeam(auth.role, task.time_responsavel)) {
        return NextResponse.json({ error: "Sem permissao para excluir esta tarefa." }, { status: 403 });
      }
      if (task.projeto_id && auth.role !== "ADMIN" && auth.role !== "SUPORTE") {
        return NextResponse.json({ error: "Tarefas de projeto devem ser ignoradas ou canceladas, nao excluidas." }, { status: 403 });
      }
    }

    const { error } = await auth.dataClient.from(table).delete().eq("tenant_id", auth.tenantId).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await writeLog(auth.dataClient, { tenantId: auth.tenantId, entity, id, action: "delete", userId: auth.userId });
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    const id = String(body.id ?? rawPayload.id ?? "");
    if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    delete rawPayload.id;

    const { data, error } = await auth.dataClient
      .from(table)
      .update(rawPayload)
      .eq("tenant_id", auth.tenantId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await writeLog(auth.dataClient, {
      tenantId: auth.tenantId,
      entity,
      id,
      action: "update",
      description: String(rawPayload.titulo ?? rawPayload.nome ?? ""),
      userId: auth.userId,
    });
    return NextResponse.json({ data });
  }

  delete rawPayload.id;
  if (entity === "projeto" || entity === "tarefa") rawPayload.created_by = auth.userId;

  const { data, error } = await auth.dataClient.from(table).insert(rawPayload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (entity === "projeto" && data.template_id) {
    await auth.dataClient.rpc("atividades_expandir_template", { p_projeto_id: data.id });
  }

  await writeLog(auth.dataClient, {
    tenantId: auth.tenantId,
    entity,
    id: data.id,
    action: "create",
    description: String(data.titulo ?? data.nome ?? ""),
    userId: auth.userId,
  });

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (body.action === "generate_recurring") {
    const until = String(body.until ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const { data, error } = await auth.dataClient.rpc("atividades_gerar_recorrencias", {
      p_tenant_id: auth.tenantId,
      p_ate: until,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await writeLog(auth.dataClient, {
      tenantId: auth.tenantId,
      entity: "recorrencia",
      action: "generate_recurring",
      description: `Geradas ${data ?? 0} atividades ate ${until}.`,
      userId: auth.userId,
    });
    return NextResponse.json({ created: data ?? 0 });
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
