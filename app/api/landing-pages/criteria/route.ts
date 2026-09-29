import { NextResponse } from "next/server";
import { functionalRoleFor } from "@/lib/auth/roles";
import { mergeLandingCriteria, mergeLandingMaturity } from "@/modules/landing-pages/analytics/landing-insights";
import { getLandingAccess } from "@/modules/landing-pages/services/landing-pages-server";

export const dynamic = "force-dynamic";

function bounded(value: unknown, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : null;
}

export async function POST(request: Request) {
  const access = await getLandingAccess();
  if (!access) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const role = functionalRoleFor(access.role);
  if (role !== "ADMIN" && role !== "ESPECIALISTA") return NextResponse.json({ error: "Sem permissão para editar critérios." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const landingKey = String(body?.landingKey ?? "");
  const criterionKey = String(body?.criterionKey ?? "");
  const configType = body?.configType === "maturity" ? "maturity" : "criterion";
  if (!landingKey || (configType === "criterion" && !criterionKey)) return NextResponse.json({ error: "Landing Page e critério são obrigatórios." }, { status: 400 });

  const { data: definition, error: readError } = await access.client.from("landing_page_definitions")
    .select("id,active_version_id,metadata").eq("tenant_id", access.tenantId).eq("landing_key", landingKey).maybeSingle();
  if (readError || !definition) return NextResponse.json({ error: "Landing Page não encontrada." }, { status: 404 });
  if (configType === "maturity") {
    const previewMinSessions = bounded(body?.previewMinSessions, 0, 1000000);
    const observationMinSessions = bounded(body?.observationMinSessions, 1, 1000000);
    const insightMinSessions = bounded(body?.insightMinSessions, 1, 1000000);
    if ([previewMinSessions, observationMinSessions, insightMinSessions].some((value) => value === null)) return NextResponse.json({ error: "Revise os limiares de maturidade." }, { status: 400 });
    if (!((previewMinSessions as number) < (observationMinSessions as number) && (observationMinSessions as number) < (insightMinSessions as number))) return NextResponse.json({ error: "Use limiares crescentes: Prévia, Em observação e Insight." }, { status: 400 });
    const previous = mergeLandingMaturity(definition.metadata?.insight_maturity);
    const updatedAt = new Date().toISOString();
    const next = { previewMinSessions, observationMinSessions, insightMinSessions, updatedAt, updatedBy: access.userName };
    const metadata = { ...(definition.metadata ?? {}), insight_maturity: next };
    const { error: updateError } = await access.client.from("landing_page_definitions").update({ metadata, updated_at: updatedAt }).eq("id", definition.id).eq("tenant_id", access.tenantId);
    if (updateError) return NextResponse.json({ error: "Não foi possível salvar a maturidade." }, { status: 500 });
    const { error: auditError } = await access.client.from("landing_page_events").insert({
      tenant_id: access.tenantId, landing_id: definition.id, version_id: definition.active_version_id,
      event_type: "insight_maturity_updated", actor_id: access.userId,
      summary: `${access.userName} atualizou os níveis de maturidade dos Insights.`, metadata: { previous, next },
    });
    if (auditError) {
      await access.client.from("landing_page_definitions").update({ metadata: definition.metadata ?? {}, updated_at: new Date().toISOString() }).eq("id", definition.id).eq("tenant_id", access.tenantId);
      return NextResponse.json({ error: "Não foi possível registrar a auditoria; nenhuma alteração foi mantida." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, maturity: next }, { headers: { "Cache-Control": "no-store" } });
  }
  const current = mergeLandingCriteria(definition.metadata?.insight_criteria);
  const previous = current.find((item) => item.key === criterionKey);
  if (!previous) return NextResponse.json({ error: "Critério inválido." }, { status: 400 });
  const thresholdPercent = bounded(body?.thresholdPercent, 0, 100);
  const windowDays = bounded(body?.windowDays, 1, 90);
  const minSessions = bounded(body?.minSessions, 0, 1000000);
  const mediumSample = bounded(body?.mediumSample, 1, 1000000);
  const highSample = bounded(body?.highSample, 1, 1000000);
  if ([thresholdPercent, windowDays, minSessions, mediumSample, highSample].some((value) => value === null)) return NextResponse.json({ error: "Revise os valores numéricos." }, { status: 400 });
  if ((highSample as number) < (mediumSample as number)) return NextResponse.json({ error: "A amostra alta deve ser maior ou igual à amostra média." }, { status: 400 });
  const updatedAt = new Date().toISOString();
  const next = {
    ...previous,
    thresholdPercent: thresholdPercent as number,
    windowDays: windowDays as number,
    minSessions: minSessions as number,
    mediumSample: mediumSample as number,
    highSample: highSample as number,
    active: body?.active !== false,
    updatedAt,
    updatedBy: access.userName,
  };
  const criteria = current.map((item) => item.key === criterionKey ? next : item);
  const metadata = { ...(definition.metadata ?? {}), insight_criteria: criteria };
  const { error: updateError } = await access.client.from("landing_page_definitions").update({ metadata, updated_at: updatedAt })
    .eq("id", definition.id).eq("tenant_id", access.tenantId);
  if (updateError) return NextResponse.json({ error: "Não foi possível salvar o critério." }, { status: 500 });
  const { error: auditError } = await access.client.from("landing_page_events").insert({
    tenant_id: access.tenantId,
    landing_id: definition.id,
    version_id: definition.active_version_id,
    event_type: "insight_criterion_updated",
    actor_id: access.userId,
    summary: `${access.userName} atualizou o critério ${next.name}.`,
    metadata: { criterion_key: criterionKey, previous, next },
  });
  if (auditError) {
    await access.client.from("landing_page_definitions").update({ metadata: definition.metadata ?? {}, updated_at: new Date().toISOString() })
      .eq("id", definition.id).eq("tenant_id", access.tenantId);
    return NextResponse.json({ error: "Não foi possível registrar a auditoria; nenhuma alteração foi mantida." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, criterion: next }, { headers: { "Cache-Control": "no-store" } });
}
