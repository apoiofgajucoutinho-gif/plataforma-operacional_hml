import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runMarketingQA } from "@/modules/norwyn/services/marketing-qa";

type SupabaseAny = any;

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
  if (membership.role !== "ADMIN") return { error: "Marketing QA com IA liberado apenas para ADMIN nesta beta.", status: 403 as const };

  return { dataClient, tenantId: membership.tenant_id as string, userId: currentUser.id as string, role: membership.role as string };
}

async function loadQA(dataClient: SupabaseAny, tenantId: string) {
  const [reviews, items] = await Promise.all([
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
  const firstError = reviews.error ?? items.error;
  if (firstError) throw new Error(firstError.message);
  return { marketingQAReviews: reviews.data ?? [], marketingQAReviewItems: items.data ?? [] };
}

async function loadReviewContext(dataClient: SupabaseAny, tenantId: string, versionId: string) {
  const { data: version, error: versionError } = await dataClient
    .from("campaign_material_versions")
    .select("id, tenant_id, campaign_id, material_id, version_number, title, content, change_note, source, metadata, created_by, created_at")
    .eq("tenant_id", tenantId)
    .eq("id", versionId)
    .maybeSingle();
  if (versionError) throw new Error(versionError.message);
  if (!version) throw new Error("Versao de material nao encontrada.");

  const [campaign, material, relatedMaterials] = await Promise.all([
    dataClient
      .from("campaigns")
      .select("id, tenant_id, name, type, objective_id, mission_external_key, product_id, status, starts_at, ends_at, target_sales, target_revenue, plan_json, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("id", version.campaign_id)
      .maybeSingle(),
    dataClient
      .from("campaign_materials")
      .select("id, tenant_id, campaign_id, material_type, title, status, channel, current_version_id, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("id", version.material_id)
      .maybeSingle(),
    dataClient
      .from("campaign_materials")
      .select("id, title, material_type, channel, status")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", version.campaign_id)
      .limit(20),
  ]);

  if (campaign.error) throw new Error(campaign.error.message);
  if (material.error) throw new Error(material.error.message);
  if (relatedMaterials.error) throw new Error(relatedMaterials.error.message);
  if (!campaign.data || !material.data) throw new Error("Campanha ou material nao encontrado.");

  let product: Record<string, any> | null = null;
  if (campaign.data.product_id) {
    const { data, error } = await dataClient
      .from("products")
      .select("id, tenant_id, nome_oficial, produto_base, categoria, fiscal_category, descricao, status, tipo, preco_oficial, duracao, unidade_duracao, link_oferta, observacoes, ativo, product_aliases(alias, origem, principal, ativo), product_components(componente, categoria, duracao, unidade_duracao, ativo)")
      .eq("tenant_id", tenantId)
      .eq("id", campaign.data.product_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    product = data ?? null;
  }

  return {
    campaign: campaign.data,
    material: material.data,
    version,
    product,
    relatedMaterials: relatedMaterials.data ?? [],
  };
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const action = String(body.action ?? "review");

    if (action === "resolve_item") {
      const itemId = String(body.item_id ?? "").trim();
      const note = String(body.resolution_note ?? "").trim();
      if (!itemId || !note) return NextResponse.json({ error: "Item e justificativa sao obrigatorios." }, { status: 400 });
      const { error } = await auth.dataClient
        .from("marketing_qa_review_items")
        .update({ status: "not_applicable", resolution_note: note, resolved_by: auth.userId, resolved_at: new Date().toISOString() })
        .eq("tenant_id", auth.tenantId)
        .eq("id", itemId);
      if (error) throw new Error(error.message);
      const qa = await loadQA(auth.dataClient, auth.tenantId);
      return NextResponse.json({ ...qa, message: "Item marcado como excecao." });
    }

    const versionId = String(body.material_version_id ?? body.version_id ?? "").trim();
    if (!versionId) return NextResponse.json({ error: "Versao do material e obrigatoria." }, { status: 400 });

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: processing, error: processingError } = await auth.dataClient
      .from("marketing_qa_reviews")
      .select("id")
      .eq("tenant_id", auth.tenantId)
      .eq("material_version_id", versionId)
      .eq("status", "processing")
      .gte("created_at", since)
      .limit(1);
    if (processingError) throw new Error(processingError.message);
    if (processing?.length) return NextResponse.json({ error: "Esta versao ja esta em revisao. Aguarde concluir." }, { status: 409 });

    const reviewContext = await loadReviewContext(auth.dataClient, auth.tenantId, versionId);

    const { data: insertedReview, error: insertError } = await auth.dataClient
      .from("marketing_qa_reviews")
      .insert({
        tenant_id: auth.tenantId,
        campaign_id: reviewContext.campaign.id,
        material_id: reviewContext.material.id,
        material_version_id: reviewContext.version.id,
        reviewer_type: "hybrid",
        provider: process.env.GEMINI_API_KEY ? "gemini" : "deterministic",
        model: process.env.GEMINI_MODEL || null,
        status: "processing",
        input_size: String(reviewContext.version.content ?? "").length,
        created_by: auth.userId,
        metadata: {
          beta: "Marketing QA V1",
          gemini_configured: Boolean(process.env.GEMINI_API_KEY),
        },
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    const result = await runMarketingQA(reviewContext);
    const completedAt = new Date().toISOString();

    const { error: updateError } = await auth.dataClient
      .from("marketing_qa_reviews")
      .update({
        provider: result.provider,
        model: result.model,
        status: result.status,
        overall_score: result.overall_score,
        summary: result.summary,
        blocking_reasons: result.blocking_reasons,
        warnings: result.warnings,
        suggested_content: result.suggested_content,
        duration_ms: result.duration_ms,
        success: result.success,
        error_message: result.error_message,
        usage_json: result.usage_json,
        metadata: result.metadata,
        completed_at: completedAt,
      })
      .eq("tenant_id", auth.tenantId)
      .eq("id", insertedReview.id);
    if (updateError) throw new Error(updateError.message);

    if (result.items.length) {
      const { error: itemsError } = await auth.dataClient.from("marketing_qa_review_items").insert(
        result.items.map((item) => ({
          tenant_id: auth.tenantId,
          review_id: insertedReview.id,
          category: item.category,
          severity: item.severity,
          status: item.status,
          title: item.title,
          description: item.description ?? null,
          evidence: item.evidence ?? null,
          suggested_fix: item.suggested_fix ?? null,
          field_reference: item.field_reference ?? null,
        })),
      );
      if (itemsError) throw new Error(itemsError.message);
    }

    const qa = await loadQA(auth.dataClient, auth.tenantId);
    return NextResponse.json({ ...qa, message: result.success ? "Marketing QA concluido." : "Marketing QA concluido com falha registrada." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado no Marketing QA." }, { status: 500 });
  }
}
