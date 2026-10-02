import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedDecisions = new Set(["Aceitei", "Ignorei", "Fiz diferente"]);

function text(value: unknown, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: Request) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "servico_indisponivel" }, { status: 503 });
  const { data: membership } = await admin.from("tenant_members")
    .select("tenant_id,role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();
  if (!membership || !["ADMIN", "ESPECIALISTA"].includes(membership.role)) {
    return NextResponse.json({ ok: false, error: "sem_permissao" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const decision = text(body?.decision, 40);
  const campaignId = text(body?.campaign_id, 80);
  if (!body || !decision || !allowedDecisions.has(decision) || !campaignId) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const { data: campaign } = await admin.from("campaigns")
    .select("id,product_id")
    .eq("id", campaignId)
    .eq("tenant_id", membership.tenant_id)
    .limit(1)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ ok: false, error: "campanha_nao_encontrada" }, { status: 404 });

  const learningId = text(body.learning_id, 80);
  const now = new Date().toISOString();
  const feedback = {
    action_taken: decision,
    action_executed: text(body.action_executed, 500),
    observation: text(body.observation, 1000),
    decided_at: now,
    decided_by: user.id,
  };

  if (learningId) {
    const { data: existing } = await admin.from("norwyn_campaign_learnings")
      .select("id,evidence")
      .eq("id", learningId)
      .eq("tenant_id", membership.tenant_id)
      .eq("campaign_id", campaign.id)
      .limit(1)
      .maybeSingle();
    if (!existing) return NextResponse.json({ ok: false, error: "memoria_nao_encontrada" }, { status: 404 });
    const evidence = { ...record(existing.evidence), ...feedback };
    const { error } = await admin.from("norwyn_campaign_learnings").update({ evidence, updated_at: now }).eq("id", existing.id);
    if (error) return NextResponse.json({ ok: false, error: "falha_ao_registrar" }, { status: 500 });
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const confidence = text(body.confidence, 20);
  const confidenceMap: Record<string, string> = { Alta: "HIGH", Média: "MEDIUM", Baixa: "LOW" };
  const evidence = {
    ...feedback,
    ad_key: text(body.ad_key, 160),
    ad_name: text(body.ad_name, 240),
    state: text(body.state, 160),
    evidence: text(body.evidence, 1500),
    review_condition: text(body.review, 500),
    source: "traffic_intelligence_v2_1",
  };
  const { data, error } = await admin.from("norwyn_campaign_learnings").insert({
    tenant_id: membership.tenant_id,
    campaign_id: campaign.id,
    product_id: campaign.product_id,
    learning_type: "WHAT_TO_TEST",
    title: text(body.detected, 240) ?? "Decisão humana sobre recomendação",
    detail: text(body.recommended, 1500),
    evidence,
    confidence: confidenceMap[confidence ?? ""] ?? "UNKNOWN",
    status: "active",
  }).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: "falha_ao_registrar" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
