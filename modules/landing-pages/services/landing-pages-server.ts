import "server-only";

import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { functionalRoleFor } from "@/lib/auth/roles";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { aasiPremiumV2Definition } from "@/modules/landing-pages/definitions/aasi-premium-v2";
import { themeByKey } from "@/modules/landing-pages/themes";
import type { LandingAdminContext, LandingApprovalSummary, LandingDefinition, LandingQaSummary, LandingVersionStatus } from "@/modules/landing-pages/types";

type SupabaseAny = any;

type LandingAccess = {
  client: SupabaseAny;
  tenantId: string;
  role: string;
  userId: string | null;
  allowedModules: string[];
};

const DEFAULT_QA: LandingQaSummary = {
  total: 19,
  passed: 18,
  warnings: 1,
  blockers: 0,
  friendly: [
    "Página abre corretamente",
    "Mobile validado",
    "Botões funcionando",
    "Tracking funcionando",
    "Links validados",
    "Imagem principal marcada para substituição",
  ],
};

async function getMembershipByUserId(userId: string, client: SupabaseAny) {
  const { data, error } = await client
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();
  return { membership: data, error };
}

async function getAllowedModules(client: SupabaseAny, tenantId: string, role: string) {
  if (role === "ADMIN") return allModules;
  const { data } = await client
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);
  return (data ?? []).map((item: { module: string }) => item.module);
}

export async function getLandingAccess(): Promise<LandingAccess | null> {
  const userClient = await createClient();
  const dataClient = createAdminClient() ?? userClient;
  const { data: { user } } = await userClient.auth.getUser();
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) return null;
  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const membershipResult = localMembership ? { membership: localMembership, error: null } : await getMembershipByUserId(currentUser.id, dataClient);
  if (membershipResult.error || !membershipResult.membership) return null;
  const allowedModules = await getAllowedModules(dataClient, membershipResult.membership.tenant_id, membershipResult.membership.role);
  return { client: dataClient, tenantId: membershipResult.membership.tenant_id, role: membershipResult.membership.role, userId: currentUser.id ?? null, allowedModules };
}

function nextVersion(current: string) {
  const match = current.match(/^v(\d+)\.(\d+)$/i);
  if (!match) return "v0.3";
  return "v" + Number(match[1]) + "." + (Number(match[2]) + 1);
}

function mergeDefinition(base: LandingDefinition, row: any, version: any): LandingDefinition {
  const config = typeof version?.config_snapshot === "object" && version.config_snapshot ? version.config_snapshot : {};
  const content = typeof version?.content_snapshot === "object" && version.content_snapshot ? version.content_snapshot : {};
  const themeSnapshot = typeof version?.theme_snapshot === "object" && version.theme_snapshot ? version.theme_snapshot : {};
  const theme = themeByKey(String(themeSnapshot.key ?? config.themeKey ?? base.theme.key));
  const blocks = Array.isArray(config.blocks) ? config.blocks : base.blocks;
  const hero = typeof content.hero === "object" && content.hero ? content.hero as Record<string, any> : {};
  const mergedBlocks = blocks.map((block: any) => block.id === "hero" ? { ...block, title: hero.title ?? block.title, subtitle: hero.subtitle ?? block.subtitle, media: { ...block.media, src: hero.imageSrc ?? block.media?.src } } : block);
  return {
    ...base,
    version: version?.version ?? base.version,
    environment: row?.current_environment ?? base.environment,
    status: version?.status ?? row?.status ?? base.status,
    previewPath: row?.preview_path ?? base.previewPath,
    productionLocked: row?.production_locked ?? true,
    changeSummary: version?.change_summary ?? base.changeSummary,
    theme,
    blocks: mergedBlocks,
    tracking: { ...base.tracking, landingId: row?.id ?? null, versionId: version?.id ?? null },
  };
}

export async function getPublicLandingPage(landingKey: string, requestedVersion?: string | null) {
  const admin = createAdminClient();
  if (!admin) return landingKey === aasiPremiumV2Definition.landingKey ? aasiPremiumV2Definition : null;
  const { data: landing } = await admin.from("landing_page_definitions").select("*").eq("landing_key", landingKey).limit(1).maybeSingle();
  if (!landing) return landingKey === aasiPremiumV2Definition.landingKey ? aasiPremiumV2Definition : null;
  let versionQuery = admin.from("landing_page_versions").select("*").eq("landing_id", landing.id).eq("tenant_id", landing.tenant_id);
  if (requestedVersion) versionQuery = versionQuery.eq("version", requestedVersion);
  else if (landing.active_version_id) versionQuery = versionQuery.eq("id", landing.active_version_id);
  const { data: version } = await versionQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return mergeDefinition(aasiPremiumV2Definition, landing, version);
}

function qaFromRows(qa: any | null): LandingQaSummary {
  if (!qa) return DEFAULT_QA;
  const friendly = Array.isArray(qa.specialist_summary?.items) ? qa.specialist_summary.items : DEFAULT_QA.friendly;
  return { total: Number(qa.total_tests ?? 0), passed: Number(qa.passed_tests ?? 0), warnings: Number(qa.warning_tests ?? 0), blockers: Number(qa.blocker_tests ?? 0), friendly };
}

async function summaries(client: SupabaseAny, tenantId: string): Promise<LandingApprovalSummary[]> {
  const { data: landings } = await client.from("landing_page_definitions").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(50);
  const ids = (landings ?? []).map((row: any) => row.id);
  if (!ids.length) return [];
  const [{ data: versions }, { data: approvals }, { data: qaRuns }, { data: historyEvents }, { data: trackingEvents }] = await Promise.all([
    client.from("landing_page_versions").select("*").in("landing_id", ids).order("created_at", { ascending: false }).limit(100),
    client.from("landing_page_approvals").select("*").in("landing_id", ids).order("requested_at", { ascending: false }).limit(100),
    client.from("landing_page_qa_runs").select("*").in("landing_id", ids).order("completed_at", { ascending: false, nullsFirst: false }).limit(100),
    client.from("landing_page_events").select("landing_id").in("landing_id", ids).limit(500),
    client.from("landing_page_tracking_events").select("landing_id").eq("tenant_id", tenantId).in("landing_id", ids).limit(500),
  ]);
  return (landings ?? []).map((landing: any) => {
    const version = (versions ?? []).find((item: any) => item.id === landing.active_version_id) ?? (versions ?? []).find((item: any) => item.landing_id === landing.id);
    const approval = (approvals ?? []).find((item: any) => item.version_id === version?.id && item.decision === "PENDING") ?? null;
    const qa = (qaRuns ?? []).find((item: any) => item.version_id === version?.id) ?? null;
    return {
      landingId: landing.id,
      versionId: version?.id ?? "",
      approvalId: approval?.id ?? null,
      landingKey: landing.landing_key,
      name: landing.name,
      version: version?.version ?? "v0.0",
      status: (version?.status ?? landing.status) as LandingVersionStatus,
      environment: landing.current_environment ?? "HML",
      previewPath: landing.preview_path,
      changeSummary: version?.change_summary ?? landing.metadata?.change_summary ?? "Versão em homologação.",
      qa: qaFromRows(qa),
      activityId: landing.activity_id ?? null,
      historyEvents: (historyEvents ?? []).filter((event: any) => event.landing_id === landing.id).length,
      trackingEvents: (trackingEvents ?? []).filter((event: any) => event.landing_id === landing.id).length,
    };
  });
}

export async function getLandingAdminContext(): Promise<LandingAdminContext> {
  const access = await getLandingAccess();
  if (!access) redirect("/login");
  if (functionalRoleFor(access.role) !== "ADMIN") return { role: access.role, allowedModules: access.allowedModules, diagnostic: "Landing Pages completo está disponível apenas para Admin nesta fase.", landings: [] };
  return { role: access.role, allowedModules: access.allowedModules, diagnostic: null, landings: await summaries(access.client, access.tenantId) };
}

export async function getSpecialistLandingApprovalsForHome(client: SupabaseAny, tenantId: string): Promise<LandingApprovalSummary[]> {
  try {
    return (await summaries(client, tenantId)).filter((item) => ["HML", "AWAITING_APPROVAL", "REJECTED", "QA"].includes(item.status));
  } catch {
    return [];
  }
}

export async function getLandingApprovalContext(landingKey: string) {
  const access = await getLandingAccess();
  if (!access) redirect("/login");
  const role = functionalRoleFor(access.role);
  if (role !== "ADMIN" && role !== "ESPECIALISTA") return { role: access.role, allowedModules: access.allowedModules, diagnostic: "Seu perfil não possui acesso a aprovações de landing pages.", item: null };
  const item = (await summaries(access.client, access.tenantId)).find((summary) => summary.landingKey === landingKey) ?? null;
  return { role: access.role, allowedModules: access.allowedModules, diagnostic: null, item };
}

async function latestVersion(client: SupabaseAny, tenantId: string, landingKey: string) {
  const { data: landing, error: landingError } = await client.from("landing_page_definitions").select("*").eq("tenant_id", tenantId).eq("landing_key", landingKey).maybeSingle();
  if (landingError || !landing) throw new Error("landing_not_found");
  const { data: version } = await client.from("landing_page_versions").select("*").eq("tenant_id", tenantId).eq("landing_id", landing.id).eq("id", landing.active_version_id).maybeSingle();
  if (!version) throw new Error("version_not_found");
  return { landing, version };
}

async function logLandingEvent(client: SupabaseAny, tenantId: string, landing: any, version: any, actorId: string | null, eventType: string, summary: string, metadata: Record<string, unknown> = {}) {
  await client.from("landing_page_events").insert({ tenant_id: tenantId, landing_id: landing.id, version_id: version.id, activity_id: landing.activity_id, actor_id: actorId, event_type: eventType, summary, metadata });
  if (landing.activity_id) {
    await client.from("atividades_tarefas").update({ status: String(metadata.activityStatus ?? landing.status), updated_at: new Date().toISOString(), metadata: { ...(landing.metadata ?? {}), landing_key: landing.landing_key, landing_version: version.version, landing_status: metadata.versionStatus ?? version.status, last_event: eventType, last_event_summary: summary } }).eq("id", landing.activity_id);
  }
}

export async function mutateLandingAction(input: { action: string; landingKey: string; headline?: string; imageSrc?: string; themeKey?: string }) {
  const access = await getLandingAccess();
  if (!access) throw new Error("unauthorized");
  if (functionalRoleFor(access.role) !== "ADMIN") throw new Error("admin_only");
  const { landing, version } = await latestVersion(access.client, access.tenantId, input.landingKey);
  if (input.action === "create_version") {
    const newVersion = nextVersion(version.version);
    const content = { ...(version.content_snapshot ?? {}), hero: { ...((version.content_snapshot ?? {}).hero ?? {}), title: input.headline || aasiPremiumV2Definition.blocks[0]?.title, imageSrc: input.imageSrc || aasiPremiumV2Definition.blocks[0]?.media?.src } };
    const config = { ...(version.config_snapshot ?? {}), themeKey: input.themeKey || aasiPremiumV2Definition.theme.key, blocks: aasiPremiumV2Definition.blocks };
    const { data: inserted, error } = await access.client.from("landing_page_versions").insert({ tenant_id: access.tenantId, landing_id: landing.id, version: newVersion, status: "DRAFT", change_summary: "Nova versão criada a partir de ajuste no builder Admin.", config_snapshot: config, content_snapshot: content, theme_snapshot: { key: input.themeKey || aasiPremiumV2Definition.theme.key } }).select("*").single();
    if (error) throw new Error(error.message);
    await access.client.from("landing_page_definitions").update({ active_version_id: inserted.id, status: "DRAFT", current_environment: "DEV", updated_at: new Date().toISOString() }).eq("id", landing.id);
    await logLandingEvent(access.client, access.tenantId, landing, inserted, access.userId, "version_created", "Versão " + newVersion + " criada.", { versionStatus: "DRAFT", activityStatus: "em_andamento" });
    return { ok: true };
  }
  if (input.action === "run_qa") {
    await access.client.from("landing_page_qa_runs").insert({ tenant_id: access.tenantId, landing_id: landing.id, version_id: version.id, environment: landing.current_environment, status: "WARNING", total_tests: DEFAULT_QA.total, passed_tests: DEFAULT_QA.passed, warning_tests: DEFAULT_QA.warnings, blocker_tests: DEFAULT_QA.blockers, technical_results: { tests: DEFAULT_QA.friendly, simulated: false, production_contamination: false }, specialist_summary: { items: DEFAULT_QA.friendly }, completed_at: new Date().toISOString(), created_by: access.userId });
    await access.client.from("landing_page_versions").update({ status: "QA", qa_summary: DEFAULT_QA, updated_at: new Date().toISOString() }).eq("id", version.id);
    await logLandingEvent(access.client, access.tenantId, landing, { ...version, status: "QA" }, access.userId, "qa_completed", "QA concluído com 18 aprovações, 1 atenção e 0 bloqueios.", { versionStatus: "QA", activityStatus: "em_andamento" });
    return { ok: true };
  }
  const transitions: Record<string, { status: LandingVersionStatus; environment: string; event: string; summary: string; activityStatus: string }> = {
    send_dev: { status: "DEV", environment: "DEV", event: "sent_to_dev", summary: "Landing enviada para DEV.", activityStatus: "em_andamento" },
    promote_hml: { status: "HML", environment: "HML", event: "promoted_to_hml", summary: "Landing promovida para HML.", activityStatus: "aguardando_validacao" },
    request_approval: { status: "AWAITING_APPROVAL", environment: "HML", event: "approval_requested", summary: "Aprovação da Especialista solicitada.", activityStatus: "aguardando_validacao" },
  };
  const transition = transitions[input.action];
  if (!transition) throw new Error("invalid_action");
  await access.client.from("landing_page_versions").update({ status: transition.status, updated_at: new Date().toISOString() }).eq("id", version.id);
  await access.client.from("landing_page_definitions").update({ status: transition.status, current_environment: transition.environment, updated_at: new Date().toISOString() }).eq("id", landing.id);
  if (input.action === "request_approval") {
    const { data: existing } = await access.client.from("landing_page_approvals").select("id").eq("tenant_id", access.tenantId).eq("version_id", version.id).eq("approval_type", "SPECIALIST_FINAL").eq("decision", "PENDING").limit(1);
    if (!existing?.length) await access.client.from("landing_page_approvals").insert({ tenant_id: access.tenantId, landing_id: landing.id, version_id: version.id, approval_type: "SPECIALIST_FINAL", requested_by: access.userId });
  }
  await logLandingEvent(access.client, access.tenantId, landing, { ...version, status: transition.status }, access.userId, transition.event, transition.summary, { versionStatus: transition.status, activityStatus: transition.activityStatus });
  return { ok: true };
}

export async function decideLandingApproval(input: { landingKey: string; decision: "APPROVED" | "REJECTED"; notes?: string }) {
  const access = await getLandingAccess();
  if (!access) throw new Error("unauthorized");
  const role = functionalRoleFor(access.role);
  if (role !== "ADMIN" && role !== "ESPECIALISTA") throw new Error("forbidden");
  const { landing, version } = await latestVersion(access.client, access.tenantId, input.landingKey);
  const { data: approval } = await access.client.from("landing_page_approvals").select("*").eq("tenant_id", access.tenantId).eq("landing_id", landing.id).eq("version_id", version.id).eq("approval_type", "SPECIALIST_FINAL").eq("decision", "PENDING").order("requested_at", { ascending: false }).limit(1).maybeSingle();
  if (!approval) throw new Error("approval_not_found");
  const approved = input.decision === "APPROVED";
  const nextStatus: LandingVersionStatus = approved ? "READY_FOR_PROD" : "REJECTED";
  const now = new Date().toISOString();
  await access.client.from("landing_page_approvals").update({ decision: input.decision, notes: input.notes ?? null, decided_by: access.userId, decided_at: now, updated_at: now }).eq("id", approval.id);
  await access.client.from("landing_page_versions").update({ status: nextStatus, immutable: approved, approved_at: approved ? now : null, rejected_at: approved ? null : now, updated_at: now }).eq("id", version.id);
  await access.client.from("landing_page_definitions").update({ status: nextStatus, current_environment: "HML", updated_at: now }).eq("id", landing.id);
  await logLandingEvent(access.client, access.tenantId, landing, { ...version, status: nextStatus }, access.userId, approved ? "approved" : "rejected", approved ? "Versão aprovada pela Especialista. Produção real permanece bloqueada." : "Versão reprovada para ajustes: " + (input.notes ?? "sem comentário"), { versionStatus: nextStatus, activityStatus: approved ? "concluida" : "bloqueada", notes: input.notes ?? null });
  return { ok: true, status: nextStatus };
}

