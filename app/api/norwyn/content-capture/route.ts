import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runContentCapture } from "@/modules/norwyn/services/content-capture";
import {
  detectContentSource,
  transcribeMediaFromUrl,
  type ContentSourceDetection,
  type ContentTranscriptionResult,
} from "@/modules/norwyn/services/content-transcription";
import { CONTENT_CAPTURE_STATUS, isContentCaptureProcessingStatus } from "@/modules/norwyn/types/content-capture-status";

export const runtime = "nodejs";
export const maxDuration = 300;

type SupabaseAny = any;

const writableRoles = new Set(["ADMIN", "SUPORTE"]);
const captureSelect =
  "id, tenant_id, title, capture_type, drive_url, status, product_id, mission_id, campaign_id, objective_id, description, summary, transcript, transcript_source, transcript_status, transcript_segments, file_id, file_name, file_type, file_size, duration_seconds, topics, pain_points, objections, cases, quotes, cta, products_detected, related_missions, tags, knowledge_generated, similar_content, similar_campaigns, winning_plays, provider, model, duration_ms, success, error_message, usage_json, metadata, processing_metadata, result_version, result_versions, primary_product_id, manually_selected_product_id, confidence, processing_started_at, processing_completed_at, created_by, created_at, updated_at";

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

    if (!permission?.can_write) return { error: "Sem permissao para processar Content Capture.", status: 403 as const };
  }

  return {
    dataClient,
    tenantId: membership.tenant_id as string,
    userId: currentUser.id as string,
    role: membership.role as string,
  };
}

async function fetchContentCaptures(dataClient: SupabaseAny, tenantId: string) {
  const { data } = await dataClient
    .from("content_capture")
    .select(captureSelect)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function validReferenceUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function sourceMetadata(source: ContentSourceDetection) {
  return {
    source_type: source.type,
    source_label: source.label,
    source_id: source.id ?? null,
    source_limitation: source.limitation ?? null,
  };
}

function isProcessingStatus(value: unknown) {
  return isContentCaptureProcessingStatus(cleanString(value));
}

function contentCaptureDbError(error: { message?: string } | null | undefined) {
  if (error?.message?.includes("content_capture_status_check")) {
    return "Nao foi possivel iniciar o processamento. A captura anterior foi preservada. Tente novamente apos atualizar a pagina.";
  }

  return error?.message ?? "Nao foi possivel salvar o Content Capture.";
}

async function loadContext(dataClient: SupabaseAny, tenantId: string) {
  const [productsResult, campaignsResult, contentEventsResult, signalsResult] = await Promise.all([
    dataClient
      .from("products")
      .select("id, tenant_id, nome_oficial, produto_base, categoria, fiscal_category, financial_notes, descricao, status, tipo, preco_oficial, duracao, unidade_duracao, link_oferta, percentual_coproducao, percentual_hotmart, percentual_gateway, percentual_imposto, receita_liquida_estimada_pct, observacoes, ativo, source, manually_edited_at, metadata, product_aliases(id, alias, produto_base, origem, confianca, principal, ativo, source, manually_edited_at), product_components(id, componente, categoria, ordem, duracao, unidade_duracao, link, observacoes, ativo, source, manually_edited_at), product_batches(id, turma, inicio, fim, status, meta_alunos, alunos, receita_meta, receita_real, observacoes, ativo, source, manually_edited_at)")
      .eq("tenant_id", tenantId)
      .limit(500),
    dataClient
      .from("campaigns")
      .select("id, tenant_id, name, type, objective_id, mission_external_key, product_id, status, starts_at, ends_at, target_sales, target_revenue, plan_json, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .limit(100),
    dataClient
      .from("norwyn_content_events")
      .select("id, tenant_id, source, source_id, event_type, subtype, title, caption, published_at, influence_hours, mission_id, campaign_id, product_tags, theme_tags, objective, funnel_stage, cta, performance_snapshot, metadata, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("published_at", { ascending: false })
      .limit(500),
    dataClient
      .from("norwyn_signals")
      .select("id, tenant_id, provider, category, subcategory, title, description, starts_at, ends_at, priority, impact_score, compatibility_score, urgency_score, confidence_score, final_score, status, suggested_angle, suggested_action, recommended_tone, avoid_tone, mission_tags, product_tags, audience_tags, content_format_suggestions, source_name, source_url, metadata, created_by, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .neq("status", "archived")
      .limit(300),
  ]);

  return {
    products: productsResult.data ?? [],
    campaigns: campaignsResult.data ?? [],
    contentEvents: contentEventsResult.data ?? [],
    signals: signalsResult.data ?? [],
  };
}

type ResultOptions = {
  statusOverride?: string;
  transcriptOverride?: string;
  transcriptSource?: string;
  transcriptStatus?: string;
  transcriptSegments?: Array<Record<string, unknown>>;
  transcription?: ContentTranscriptionResult | null;
  errorMessage?: string | null;
};

function resultToUpdatePayload(
  result: Awaited<ReturnType<typeof runContentCapture>>,
  missionName: string | null,
  previous?: Record<string, unknown>,
  options: ResultOptions = {},
) {
  const currentVersion = Number(previous?.result_version ?? 0) || 0;
  const previousVersions = Array.isArray(previous?.result_versions) ? previous.result_versions : [];
  const nextVersions =
    previous && previous.summary
      ? [
          {
            result_version: currentVersion || 1,
            summary: previous.summary,
            transcript: previous.transcript,
            topics: previous.topics,
            pain_points: previous.pain_points,
            objections: previous.objections,
            cases: previous.cases,
            quotes: previous.quotes,
            cta: previous.cta,
            products_detected: previous.products_detected,
            knowledge_generated: previous.knowledge_generated,
            provider: previous.provider,
            model: previous.model,
            archived_at: new Date().toISOString(),
          },
          ...previousVersions,
        ].slice(0, 10)
      : previousVersions;

  return {
    status: options.statusOverride ?? (result.success ? CONTENT_CAPTURE_STATUS.COMPLETED : CONTENT_CAPTURE_STATUS.ERROR),
    summary: result.summary,
    transcript: options.transcriptOverride ?? result.transcript,
    transcript_source: options.transcriptSource ?? result.transcript_source,
    transcript_status: options.transcriptStatus ?? result.transcript_status,
    transcript_segments: options.transcriptSegments ?? previous?.transcript_segments ?? [],
    file_id: options.transcription?.file_id ?? previous?.file_id ?? null,
    file_name: options.transcription?.file_name ?? previous?.file_name ?? null,
    file_type: options.transcription?.file_type ?? previous?.file_type ?? null,
    file_size: options.transcription?.file_size ?? previous?.file_size ?? null,
    duration_seconds: options.transcription?.duration_seconds ?? previous?.duration_seconds ?? null,
    topics: result.topics,
    pain_points: result.pain_points,
    objections: result.objections,
    cases: result.cases,
    quotes: result.quotes,
    cta: result.cta,
    products_detected: result.products_detected,
    related_missions: result.related_missions,
    tags: result.tags,
    knowledge_generated: result.knowledge_generated,
    similar_content: result.similar_content,
    similar_campaigns: result.similar_campaigns,
    winning_plays: result.winning_plays,
    provider: result.provider,
    model: result.model,
    duration_ms: result.duration_ms,
    success: result.success && (options.transcription ? options.transcription.success : true),
    error_message: options.errorMessage ?? result.error_message,
    usage_json: result.usage_json,
    metadata: {
      ...(previous?.metadata && typeof previous.metadata === "object" ? previous.metadata : {}),
      ...result.metadata,
      mission_name: missionName,
      reference_only: !(options.transcription?.success || options.transcriptSource === "manual_edit"),
      transcription: options.transcription
        ? {
            success: options.transcription.success,
            source: options.transcription.transcript_source,
            status: options.transcription.transcript_status,
            file_id: options.transcription.file_id,
            file_name: options.transcription.file_name,
            file_type: options.transcription.file_type,
            file_size: options.transcription.file_size,
            duration_ms: options.transcription.duration_ms,
            error_message: options.transcription.error_message,
          }
        : undefined,
    },
    processing_metadata: {
      ...result.processing_metadata,
      transcription: options.transcription?.processing_metadata ?? null,
    },
    result_version: previous ? currentVersion + 1 : 1,
    result_versions: nextVersions,
    primary_product_id:
      typeof previous?.manually_selected_product_id === "string"
        ? previous.manually_selected_product_id
        : result.primary_product_id,
    confidence: result.confidence,
    processing_completed_at: new Date().toISOString(),
  };
}

async function persistKnowledge(dataClient: SupabaseAny, tenantId: string, captureId: string, productId: string | null, missionId: string | null, title: string, driveUrl: string, captureType: "video" | "audio", result: Awaited<ReturnType<typeof runContentCapture>>) {
  const detectedProductBase =
    typeof result.products_detected[0]?.produto_base === "string"
      ? result.products_detected[0]?.produto_base
      : null;

  await dataClient.rpc("norwyn_upsert_knowledge", {
    target_tenant_id: tenantId,
    p_source_module: "Content Capture",
    p_knowledge_type: "aprendizado",
    p_title: title,
    p_summary: result.summary,
    p_source_key: `content_capture:${captureId}`,
    p_product_id: productId,
    p_produto_base: detectedProductBase,
    p_mission_id: missionId,
    p_evidence: [
      `Link de referencia: ${driveUrl}`,
      ...result.topics.slice(0, 4).map((topic) => `Topico: ${topic}`),
      ...result.quotes.slice(0, 3).map((quote) => `Frase: ${quote}`),
    ],
    p_metadata: {
      capture_id: captureId,
      capture_type: captureType,
      status: result.success ? CONTENT_CAPTURE_STATUS.COMPLETED : CONTENT_CAPTURE_STATUS.ERROR,
      decision: result.knowledge_generated?.decision ?? null,
      pain_points: result.knowledge_generated?.pain_points_human ?? result.pain_points,
      objections: result.knowledge_generated?.objections_human ?? result.objections,
      cta: result.knowledge_generated?.cta_suggestions ?? result.cta,
      related_products: result.knowledge_generated?.related_products ?? result.products_detected,
      tags: result.tags,
      provider: result.provider,
      model: result.model,
      reference_only: true,
    },
    p_confidence_score: Number(result.confidence ?? result.knowledge_generated?.confianca ?? 60),
  });
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const action = cleanString(body.action);

  if (action === "select_product") {
    const captureId = cleanString(body.capture_id ?? body.captureId);
    const productId = cleanString(body.product_id ?? body.productId) || null;
    if (!captureId) return NextResponse.json({ error: "Informe a captura." }, { status: 400 });
    const { error } = await auth.dataClient
      .from("content_capture")
      .update({
        manually_selected_product_id: productId,
        primary_product_id: productId,
        metadata: { manual_product_selection: true, manual_product_updated_at: new Date().toISOString() },
      })
      .eq("tenant_id", auth.tenantId)
      .eq("id", captureId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      message: productId ? "Produto principal atualizado manualmente." : "Vinculo manual removido.",
      contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId),
    });
  }

  if (action === "reprocess") {
    const captureId = cleanString(body.capture_id ?? body.captureId);
    if (!captureId) return NextResponse.json({ error: "Informe a captura para reprocessar." }, { status: 400 });

    const { data: existing, error: existingError } = await auth.dataClient
      .from("content_capture")
      .select(captureSelect)
      .eq("tenant_id", auth.tenantId)
      .eq("id", captureId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: existingError?.message ?? "Captura nao encontrada." }, { status: 404 });
    }

    if (isProcessingStatus(existing.status)) {
      return NextResponse.json({ error: "Esta captura ja esta em processamento. Aguarde a conclusao antes de reprocessar." }, { status: 409 });
    }

    const manualTranscript = cleanString(body.manual_transcript ?? body.manualTranscript);
    const source = detectContentSource(existing.drive_url);
    await auth.dataClient
      .from("content_capture")
      .update({
        status: manualTranscript ? CONTENT_CAPTURE_STATUS.ANALYZING : CONTENT_CAPTURE_STATUS.WAITING,
        processing_started_at: new Date().toISOString(),
        processing_completed_at: null,
        error_message: null,
        metadata: {
          ...(existing.metadata ?? {}),
          ...sourceMetadata(source),
          queued_at: new Date().toISOString(),
          manual_transcript_queued: Boolean(manualTranscript),
        },
        ...(manualTranscript
          ? {
              transcript: manualTranscript,
              transcript_source: "manual_edit",
              transcript_status: "completed",
              transcript_segments: [],
            }
          : {}),
      })
      .eq("tenant_id", auth.tenantId)
      .eq("id", captureId);

    if (manualTranscript) {
      return NextResponse.json({
        message: "Transcricao manual salva. Analise colocada na fila.",
        captureId,
        startProcessing: true,
        contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId),
      });
    }

    return NextResponse.json({
      message: "Captura colocada na fila para transcricao e analise.",
      captureId,
      startProcessing: true,
      contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId),
    });
  }

  if (action === "process") {
    const captureId = cleanString(body.capture_id ?? body.captureId);
    if (!captureId) return NextResponse.json({ error: "Informe a captura para processar." }, { status: 400 });

    const { data: existing, error: existingError } = await auth.dataClient
      .from("content_capture")
      .select(captureSelect)
      .eq("tenant_id", auth.tenantId)
      .eq("id", captureId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: existingError?.message ?? "Captura nao encontrada." }, { status: 404 });
    }

    if (isProcessingStatus(existing.status) && existing.status !== CONTENT_CAPTURE_STATUS.ANALYZING) {
      return NextResponse.json({
        message: "Captura ja esta em processamento.",
        captureId,
        contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId),
      });
    }

    const source = detectContentSource(existing.drive_url);
    if (source.type === "unsupported") {
      await auth.dataClient
        .from("content_capture")
        .update({
          status: CONTENT_CAPTURE_STATUS.ERROR,
          transcript_status: "unsupported",
          error_message: source.limitation ?? "Fonte nao suportada para transcricao.",
          processing_completed_at: new Date().toISOString(),
          metadata: {
            ...(existing.metadata ?? {}),
            ...sourceMetadata(source),
          },
        })
        .eq("tenant_id", auth.tenantId)
        .eq("id", captureId);
      return NextResponse.json({
        message: source.limitation ?? "Fonte nao suportada para transcricao.",
        captureId,
        contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId),
      });
    }

    await auth.dataClient
      .from("content_capture")
      .update({
        status: existing.transcript_source === "manual_edit" && existing.transcript ? CONTENT_CAPTURE_STATUS.ANALYZING : CONTENT_CAPTURE_STATUS.ACCESSING_FILE,
        processing_started_at: existing.processing_started_at ?? new Date().toISOString(),
        processing_completed_at: null,
        error_message: null,
        metadata: {
          ...(existing.metadata ?? {}),
          ...sourceMetadata(source),
          processing_mode: "async_route",
        },
      })
      .eq("tenant_id", auth.tenantId)
      .eq("id", captureId);

    const context = await loadContext(auth.dataClient, auth.tenantId);
    const missionName = cleanString(existing.metadata?.mission_name);
    const hasManualTranscript = existing.transcript_source === "manual_edit" && Boolean(cleanString(existing.transcript));
    if (!hasManualTranscript) {
      await auth.dataClient.from("content_capture").update({ status: CONTENT_CAPTURE_STATUS.TRANSCRIBING }).eq("tenant_id", auth.tenantId).eq("id", captureId);
    }
    const transcription = hasManualTranscript ? null : await transcribeMediaFromUrl(existing.drive_url);
    const analysisText = (hasManualTranscript ? cleanString(existing.transcript) : "") || transcription?.full_text || existing.transcript || existing.description;
    await auth.dataClient.from("content_capture").update({ status: CONTENT_CAPTURE_STATUS.ANALYZING }).eq("tenant_id", auth.tenantId).eq("id", captureId);
    const result = await runContentCapture({
      title: existing.title,
      captureType: existing.capture_type === "audio" ? "audio" : "video",
      driveUrl: existing.drive_url,
      description: analysisText,
      selectedProductId: existing.manually_selected_product_id ?? existing.product_id ?? null,
      selectedMissionId: existing.mission_id,
      selectedMissionName: missionName,
      selectedCampaignId: existing.campaign_id,
      selectedObjectiveId: existing.objective_id,
      ...context,
    });

    const partialError = transcription && !transcription.success ? transcription.error_message : null;
    const updatePayload = resultToUpdatePayload(result, missionName, existing, {
      statusOverride: partialError ? CONTENT_CAPTURE_STATUS.PARTIAL : result.success ? CONTENT_CAPTURE_STATUS.COMPLETED : CONTENT_CAPTURE_STATUS.ERROR,
      transcriptOverride: analysisText || result.transcript,
      transcriptSource: hasManualTranscript ? "manual_edit" : transcription?.transcript_source ?? existing.transcript_source ?? result.transcript_source,
      transcriptStatus: hasManualTranscript ? "completed" : transcription?.transcript_status ?? existing.transcript_status ?? result.transcript_status,
      transcriptSegments: hasManualTranscript ? [] : (transcription?.segments as Array<Record<string, unknown>> | undefined),
      transcription,
      errorMessage: partialError ?? result.error_message,
    });
    const { error: updateError } = await auth.dataClient.from("content_capture").update(updatePayload).eq("tenant_id", auth.tenantId).eq("id", captureId);
    if (updateError) return NextResponse.json({ error: contentCaptureDbError(updateError) }, { status: 500 });

    await persistKnowledge(auth.dataClient, auth.tenantId, captureId, updatePayload.primary_product_id ?? existing.product_id, existing.mission_id, existing.title, existing.drive_url, existing.capture_type, result);

    return NextResponse.json({
      message: hasManualTranscript
        ? "Transcricao manual analisada."
        : partialError
          ? `Captura reprocessada parcialmente: ${partialError}`
          : "Transcricao real salva e analise reprocessada.",
      captureId,
      contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId),
    });
  }

  const title = cleanString(body.title);
  const driveUrl = cleanString(body.drive_url ?? body.driveUrl);
  const captureType = body.capture_type === "audio" || body.captureType === "audio" ? "audio" : "video";

  if (!title) return NextResponse.json({ error: "Informe um titulo para o conteudo." }, { status: 400 });
  if (!driveUrl || !validReferenceUrl(driveUrl)) {
    return NextResponse.json({ error: "Informe um link valido do Google Drive ou YouTube." }, { status: 400 });
  }

  const source = detectContentSource(driveUrl);
  if (source.type === "unsupported") {
    return NextResponse.json({ error: source.limitation ?? "Fonte nao suportada. Use Google Drive ou YouTube publico." }, { status: 400 });
  }

  const description = cleanString(body.description).slice(0, 18000) || null;
  const productId = body.product_id || body.productId || null;
  const missionId = cleanString(body.mission_id ?? body.missionId) || null;
  const missionName = cleanString(body.mission_name ?? body.missionName) || null;
  const campaignId = body.campaign_id || body.campaignId || null;
  const objectiveId = cleanString(body.objective_id ?? body.objectiveId) || null;

  const { data: capture, error: insertError } = await auth.dataClient
    .from("content_capture")
    .insert({
      tenant_id: auth.tenantId,
      title,
      capture_type: captureType,
      drive_url: driveUrl,
      status: CONTENT_CAPTURE_STATUS.WAITING,
      product_id: productId,
      primary_product_id: productId,
      mission_id: missionId,
      campaign_id: campaignId,
      objective_id: objectiveId,
      description,
      transcript_source: description ? "manual_notes" : source.type === "youtube" ? "youtube_url" : "drive_reference",
      transcript_status: description ? "partial" : "missing",
      result_version: 1,
      processing_started_at: new Date().toISOString(),
      created_by: auth.userId,
      metadata: {
        mission_name: missionName,
        reference_only: true,
        queued_at: new Date().toISOString(),
        ...sourceMetadata(source),
      },
    })
    .select("id")
    .single();

  if (insertError || !capture?.id) {
    return NextResponse.json({ error: contentCaptureDbError(insertError) }, { status: 500 });
  }

  return NextResponse.json({
    message: `Captura criada. Fonte detectada: ${source.label}. Processamento iniciado em segundo plano.`,
    captureId: capture.id,
    startProcessing: true,
    contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId),
  });
}

export async function GET() {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ contentCaptures: await fetchContentCaptures(auth.dataClient, auth.tenantId) });
}
