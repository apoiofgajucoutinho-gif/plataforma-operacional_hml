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
      .eq("module", "norwyn")
      .maybeSingle();

    if (!permission?.can_write) return { error: "Sem permissao para alterar Operational OS.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id as string, userId: currentUser.id as string };
}

function clean<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value]));
}

async function createTimeline(dataClient: SupabaseAny, input: Record<string, unknown>) {
  await dataClient.from("norwyn_timeline_events").insert(input);
}

async function createOperationalTask(dataClient: SupabaseAny, input: {
  tenantId: string;
  title: string;
  sourceModule: string;
  sourceEvent: string;
  productId?: string | null;
  studentId?: string | null;
}) {
  const { data, error } = await dataClient
    .from("atividades_tarefas")
    .insert({
      tenant_id: input.tenantId,
      titulo: input.title,
      time_responsavel: "suporte",
      status: "hoje",
      prioridade: "alta",
      source_module: input.sourceModule,
      source_event: input.sourceEvent,
      product_id: input.productId ?? null,
      student_id: input.studentId ?? null,
      metadata: { source: "operational_os_closure" },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "relationship_review") {
      const status = String(body.status ?? "confirmed");
      const reviewId = String(body.review_id ?? "");
      const resolvedProductId = body.resolved_product_id ? String(body.resolved_product_id) : null;
      if (!reviewId) return NextResponse.json({ error: "review_id obrigatorio." }, { status: 400 });
      const { data, error } = await auth.dataClient
        .from("norwyn_relationship_reviews")
        .update({
          status,
          resolved_product_id: resolvedProductId,
          resolved_by: auth.userId,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", auth.tenantId)
        .eq("id", reviewId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ data, message: "Relacionamento atualizado." });
    }

    if (action === "support_create") {
      const ticket = clean({
        tenant_id: auth.tenantId,
        person_key: body.person_key,
        student_email: body.student_email,
        student_id: body.student_id,
        product_id: body.product_id,
        topic: body.topic,
        status: body.status || "open",
        priority: body.priority || "medium",
        assigned_to: body.assigned_to || "OPERACIONAL",
        metadata: body.metadata ?? {},
      });
      if (!ticket.topic) return NextResponse.json({ error: "topic obrigatorio." }, { status: 400 });
      const { data, error } = await auth.dataClient.from("norwyn_support_tickets").insert(ticket).select("*").single();
      if (error) throw new Error(error.message);
      await createTimeline(auth.dataClient, {
        tenant_id: auth.tenantId,
        event_type: "SUPPORT_OPENED",
        title: String(ticket.topic),
        occurred_at: new Date().toISOString(),
        source_module: "Support",
        source_id: data.id,
        product_id: data.product_id,
        student_id: data.student_id,
        metadata: { student_email: data.student_email },
      });
      return NextResponse.json({ data, message: "Suporte aberto." });
    }

    if (action === "support_update") {
      const ticketId = String(body.ticket_id ?? "");
      if (!ticketId) return NextResponse.json({ error: "ticket_id obrigatorio." }, { status: 400 });
      const payload = clean({
        status: body.status,
        priority: body.priority,
        resolution: body.resolution,
        resolved_at: ["resolved", "closed"].includes(String(body.status)) ? new Date().toISOString() : body.resolved_at,
        updated_at: new Date().toISOString(),
      });
      const { data, error } = await auth.dataClient.from("norwyn_support_tickets").update(payload).eq("tenant_id", auth.tenantId).eq("id", ticketId).select("*").single();
      if (error) throw new Error(error.message);
      await createTimeline(auth.dataClient, {
        tenant_id: auth.tenantId,
        event_type: ["resolved", "closed"].includes(data.status) ? "SUPPORT_RESOLVED" : "SUPPORT_UPDATED",
        title: data.topic,
        occurred_at: new Date().toISOString(),
        source_module: "Support",
        source_id: data.id,
        product_id: data.product_id,
        student_id: data.student_id,
        metadata: { status: data.status },
      });
      return NextResponse.json({ data, message: "Suporte atualizado." });
    }

    if (action === "support_activity") {
      const ticketId = String(body.ticket_id ?? "");
      const { data: ticket, error: ticketError } = await auth.dataClient.from("norwyn_support_tickets").select("*").eq("tenant_id", auth.tenantId).eq("id", ticketId).single();
      if (ticketError) throw new Error(ticketError.message);
      const activityId = await createOperationalTask(auth.dataClient, {
        tenantId: auth.tenantId,
        title: String(body.title ?? `Retornar suporte: ${ticket.topic}`),
        sourceModule: "Support",
        sourceEvent: "SUPPORT_FOLLOW_UP",
        productId: ticket.product_id,
        studentId: ticket.student_id,
      });
      await auth.dataClient.from("norwyn_support_tickets").update({ activity_id: activityId, updated_at: new Date().toISOString() }).eq("tenant_id", auth.tenantId).eq("id", ticketId);
      return NextResponse.json({ activity_id: activityId, message: "Atividade criada para suporte." });
    }

    if (action === "certificate_create") {
      const activityId = await createOperationalTask(auth.dataClient, {
        tenantId: auth.tenantId,
        title: "Solicitar certificado",
        sourceModule: "Certificate",
        sourceEvent: "CERTIFICATE_REQUESTED",
        productId: body.product_id ?? null,
        studentId: body.student_id ?? null,
      });
      const payload = clean({
        tenant_id: auth.tenantId,
        person_key: body.person_key,
        student_email: body.student_email,
        student_id: body.student_id,
        product_id: body.product_id,
        request_date: body.request_date || new Date().toISOString().slice(0, 10),
        evidence_reference: body.evidence_reference,
        status: "TASK_OPERATIONAL_CREATED",
        activity_id: activityId,
        metadata: body.metadata ?? {},
      });
      const { data, error } = await auth.dataClient.from("norwyn_certificate_requests").insert(payload).select("*").single();
      if (error) throw new Error(error.message);
      await createTimeline(auth.dataClient, {
        tenant_id: auth.tenantId,
        event_type: "CERTIFICATE_REQUESTED",
        title: data.evidence_reference ?? "Solicitacao de certificado",
        occurred_at: new Date().toISOString(),
        source_module: "Certificate",
        source_id: data.id,
        product_id: data.product_id,
        student_id: data.student_id,
        activity_id: activityId,
        metadata: { status: data.status, student_email: data.student_email },
      });
      return NextResponse.json({ data, message: "Solicitacao de certificado criada." });
    }

    if (action === "certificate_update") {
      const requestId = String(body.request_id ?? "");
      const status = String(body.status ?? "");
      if (!requestId || !status) return NextResponse.json({ error: "request_id e status obrigatorios." }, { status: 400 });
      const { data, error } = await auth.dataClient
        .from("norwyn_certificate_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("tenant_id", auth.tenantId)
        .eq("id", requestId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await createTimeline(auth.dataClient, {
        tenant_id: auth.tenantId,
        event_type: `CERTIFICATE_${status}`,
        title: data.evidence_reference ?? "Certificado atualizado",
        occurred_at: new Date().toISOString(),
        source_module: "Certificate",
        source_id: data.id,
        product_id: data.product_id,
        student_id: data.student_id,
        activity_id: data.activity_id,
        metadata: { status },
      });
      return NextResponse.json({ data, message: "Certificado atualizado." });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado.", tracking_id: crypto.randomUUID() }, { status: 400 });
  }
}

