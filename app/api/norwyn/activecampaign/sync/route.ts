import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { activeCampaignAudit, emailPolicyDecision, fetchActiveCampaignContactByEmail } from "@/modules/norwyn/services/active-campaign";

const tenantId = "ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0";
const runKey = "mission1_zumbido_to_ajustes_2026_08_25";

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function authorized(request: Request) {
  const token = request.headers.get("x-norwyn-token") ?? new URL(request.url).searchParams.get("token");
  return Boolean(env.n8nIngestToken && token === env.n8nIngestToken);
}

export async function GET() {
  return response({
    activeCampaign: activeCampaignAudit(),
    mode: "read_only",
    sendEnabled: env.activeCampaignSendEnabled,
    requiredEnv: ["ACTIVE_CAMPAIGN_BASE_URL", "ACTIVE_CAMPAIGN_API_KEY", "ACTIVE_CAMPAIGN_WEBHOOK_SECRET"],
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return response({ error: "unauthorized" }, 401);
  const admin = createAdminClient();
  if (!admin) return response({ error: "Supabase admin client indisponivel." }, 503);
  const audit = activeCampaignAudit();
  if (audit.status !== "CONFIGURED") {
    return response({ activeCampaign: audit, syncStatus: "NOT_CONFIGURED", touched: 0 });
  }

  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 25), 100);
  const { data: run, error: runError } = await admin
    .from("norwyn_lifecycle_eligibility_runs")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("run_key", runKey)
    .maybeSingle();
  if (runError) throw runError;
  if (!run?.id) return response({ error: "eligibility run not found" }, 404);

  const { data: members, error: memberError } = await admin
    .from("norwyn_lifecycle_eligibility_members")
    .select("person_key, customer_hash, status")
    .eq("tenant_id", tenantId)
    .eq("run_id", run.id)
    .eq("status", "ELIGIBLE")
    .limit(limit);
  if (memberError) throw memberError;

  let touched = 0;
  for (const member of members ?? []) {
    const truth = await fetchActiveCampaignContactByEmail(member.person_key);
    const policy = emailPolicyDecision(truth.status, false);
    const emailStatus =
      truth.status === "UNSUBSCRIBED" || truth.status === "BOUNCED" || truth.status === "SUPPRESSED"
        ? "OPTED_OUT"
        : "UNKNOWN";
    const { error } = await admin
      .from("norwyn_customer_channel_statuses")
      .upsert({
        tenant_id: tenantId,
        person_key: member.person_key,
        customer_hash: member.customer_hash,
        email_status: emailStatus,
        activecampaign_contact_id: truth.contactId,
        activecampaign_status: truth.status,
        email_policy_decision: policy,
        email_policy_evidence: truth.evidence,
        sync_status: "OK",
        last_synced_at: new Date().toISOString(),
        source: "activecampaign_read_only_sync",
        evidence: truth.evidence,
      }, { onConflict: "tenant_id,person_key" });
    if (error) throw error;
    touched += 1;
  }

  return response({ activeCampaign: audit, syncStatus: "OK", touched, sendEnabled: env.activeCampaignSendEnabled });
}
