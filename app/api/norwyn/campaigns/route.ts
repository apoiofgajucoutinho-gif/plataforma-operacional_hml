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

    if (!permission?.can_write) return { error: "Sem permissao para editar campanhas Norwyn.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id as string, userId: currentUser.id as string, role: membership.role as string };
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value]),
  );
}

async function loadCampaignBundle(dataClient: SupabaseAny, tenantId: string) {
  const [campaigns, materials, versions, approvals, qaReviews, qaItems] = await Promise.all([
    dataClient
      .from("campaigns")
      .select("id, tenant_id, name, type, objective_id, mission_external_key, product_id, status, starts_at, ends_at, target_sales, target_revenue, plan_json, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false }),
    dataClient
      .from("campaign_materials")
      .select("id, tenant_id, campaign_id, material_type, title, status, channel, current_version_id, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false }),
    dataClient
      .from("campaign_material_versions")
      .select("id, tenant_id, campaign_id, material_id, version_number, title, content, change_note, source, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    dataClient
      .from("campaign_approvals")
      .select("id, tenant_id, campaign_id, material_id, version_id, approver_id, approver_name, status, decided_at, observation, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    dataClient
      .from("marketing_qa_reviews")
      .select("id, tenant_id, campaign_id, material_id, material_version_id, reviewer_type, provider, model, status, overall_score, summary, blocking_reasons, warnings, suggested_content, input_size, duration_ms, success, error_message, usage_json, metadata, created_by, created_at, completed_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    dataClient
      .from("marketing_qa_review_items")
      .select("id, tenant_id, review_id, category, severity, status, title, description, evidence, suggested_fix, field_reference, resolution_note, resolved_by, resolved_at, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = campaigns.error ?? materials.error ?? versions.error ?? approvals.error ?? qaReviews.error ?? qaItems.error;
  if (firstError) throw new Error(firstError.message);

  return {
    campaigns: campaigns.data ?? [],
    campaignMaterials: materials.data ?? [],
    campaignMaterialVersions: versions.data ?? [],
    campaignApprovals: approvals.data ?? [],
    marketingQAReviews: qaReviews.data ?? [],
    marketingQAReviewItems: qaItems.data ?? [],
  };
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "upsert_campaign") {
      const campaign = body.campaign ?? {};
      const name = String(campaign.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Nome da campanha e obrigatorio." }, { status: 400 });

      const payload = compactPayload({
        id: campaign.id || undefined,
        tenant_id: auth.tenantId,
        name,
        type: campaign.type || "Campanha",
        objective_id: campaign.objective_id,
        mission_external_key: campaign.mission_external_key,
        product_id: campaign.product_id,
        status: campaign.status || "draft",
        starts_at: campaign.starts_at,
        ends_at: campaign.ends_at,
        target_sales: campaign.target_sales,
        target_revenue: campaign.target_revenue,
        plan_json: campaign.plan_json && typeof campaign.plan_json === "object" ? campaign.plan_json : {},
        created_by: auth.userId,
      });
      const { error } = await auth.dataClient.from("campaigns").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "upsert_material") {
      const material = body.material ?? {};
      const title = String(material.title ?? "").trim();
      const campaignId = String(material.campaign_id ?? body.campaign_id ?? "").trim();
      if (!campaignId || !title) return NextResponse.json({ error: "Campanha e titulo do material sao obrigatorios." }, { status: 400 });

      const payload = compactPayload({
        id: material.id || undefined,
        tenant_id: auth.tenantId,
        campaign_id: campaignId,
        material_type: material.material_type || "briefing",
        title,
        status: material.status || "draft",
        channel: material.channel,
        current_version_id: material.current_version_id,
        metadata: material.metadata && typeof material.metadata === "object" ? material.metadata : {},
        created_by: auth.userId,
      });
      const { error } = await auth.dataClient.from("campaign_materials").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "create_material_with_version") {
      const material = body.material ?? {};
      const version = body.version ?? {};
      const title = String(material.title ?? version.title ?? "").trim();
      const campaignId = String(material.campaign_id ?? body.campaign_id ?? "").trim();
      if (!campaignId || !title) return NextResponse.json({ error: "Campanha e titulo do material sao obrigatorios." }, { status: 400 });

      const materialPayload = compactPayload({
        tenant_id: auth.tenantId,
        campaign_id: campaignId,
        material_type: material.material_type || "briefing",
        title,
        status: material.status || "draft",
        channel: material.channel,
        metadata: material.metadata && typeof material.metadata === "object" ? material.metadata : {},
        created_by: auth.userId,
      });
      const { data: insertedMaterial, error: materialError } = await auth.dataClient
        .from("campaign_materials")
        .insert(materialPayload)
        .select("id")
        .single();
      if (materialError) throw new Error(materialError.message);

      const versionPayload = compactPayload({
        tenant_id: auth.tenantId,
        campaign_id: campaignId,
        material_id: insertedMaterial.id,
        version_number: 1,
        title: String(version.title ?? title).trim(),
        content: version.content ?? "",
        change_note: version.change_note || "Primeira versao do material.",
        source: version.source || "manual",
        metadata: version.metadata && typeof version.metadata === "object" ? version.metadata : {},
        created_by: auth.userId,
      });
      const { data: insertedVersion, error: versionError } = await auth.dataClient
        .from("campaign_material_versions")
        .insert(versionPayload)
        .select("id")
        .single();
      if (versionError) throw new Error(versionError.message);

      await auth.dataClient
        .from("campaign_materials")
        .update({ current_version_id: insertedVersion.id, updated_at: new Date().toISOString() })
        .eq("tenant_id", auth.tenantId)
        .eq("id", insertedMaterial.id);
    } else if (action === "create_version") {
      const version = body.version ?? {};
      const materialId = String(version.material_id ?? body.material_id ?? "").trim();
      const campaignId = String(version.campaign_id ?? body.campaign_id ?? "").trim();
      const title = String(version.title ?? "").trim();
      if (!materialId || !campaignId || !title) return NextResponse.json({ error: "Campanha, material e titulo da versao sao obrigatorios." }, { status: 400 });

      const { data: maxRows, error: maxError } = await auth.dataClient
        .from("campaign_material_versions")
        .select("version_number")
        .eq("tenant_id", auth.tenantId)
        .eq("material_id", materialId)
        .order("version_number", { ascending: false })
        .limit(1);
      if (maxError) throw new Error(maxError.message);
      const nextVersion = Number(maxRows?.[0]?.version_number ?? 0) + 1;

      const payload = compactPayload({
        tenant_id: auth.tenantId,
        campaign_id: campaignId,
        material_id: materialId,
        version_number: version.version_number ?? nextVersion,
        title,
        content: version.content ?? "",
        change_note: version.change_note,
        source: version.source || "manual",
        metadata: version.metadata && typeof version.metadata === "object" ? version.metadata : {},
        created_by: auth.userId,
      });
      const { data, error } = await auth.dataClient.from("campaign_material_versions").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await auth.dataClient
        .from("campaign_materials")
        .update({ current_version_id: data.id, updated_at: new Date().toISOString() })
        .eq("tenant_id", auth.tenantId)
        .eq("id", materialId);
    } else if (action === "create_approval") {
      const approval = body.approval ?? {};
      const campaignId = String(approval.campaign_id ?? body.campaign_id ?? "").trim();
      const materialId = String(approval.material_id ?? body.material_id ?? "").trim();
      const versionId = String(approval.version_id ?? body.version_id ?? "").trim();
      if (!campaignId || !materialId || !versionId) return NextResponse.json({ error: "Campanha, material e versao sao obrigatorios." }, { status: 400 });
      const status = String(approval.status || "requested");
      const observation = String(approval.observation ?? "");

      if (["approved", "ready", "pronto"].includes(status)) {
        const { data: latestBlockedReview, error: blockedError } = await auth.dataClient
          .from("marketing_qa_reviews")
          .select("id, status")
          .eq("tenant_id", auth.tenantId)
          .eq("material_version_id", versionId)
          .eq("status", "blocked")
          .order("created_at", { ascending: false })
          .limit(1);
        if (blockedError) throw new Error(blockedError.message);
        if (latestBlockedReview?.length && (auth.role !== "ADMIN" || observation.trim().length < 12)) {
          return NextResponse.json(
            { error: "Esta versao possui bloqueio critico do Marketing QA. Apenas ADMIN pode aprovar com justificativa explicita." },
            { status: 409 },
          );
        }
      }

      const payload = compactPayload({
        tenant_id: auth.tenantId,
        campaign_id: campaignId,
        material_id: materialId,
        version_id: versionId,
        approver_name: approval.approver_name,
        status,
        decided_at: approval.decided_at || (status !== "requested" ? new Date().toISOString() : null),
        observation,
        created_by: auth.userId,
      });
      const { error } = await auth.dataClient.from("campaign_approvals").insert(payload);
      if (error) throw new Error(error.message);
    } else {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const bundle = await loadCampaignBundle(auth.dataClient, auth.tenantId);
    return NextResponse.json({ ...bundle, message: "Campanhas atualizadas." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
}
