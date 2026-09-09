import "server-only";
import { env } from "@/lib/env";

export type ActiveCampaignConnectionStatus = "CONFIGURED" | "NOT_CONFIGURED";
export type ActiveCampaignContactStatus = "ACTIVE_SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "SUPPRESSED" | "NOT_FOUND" | "UNKNOWN" | "NOT_SYNCED";

export type ActiveCampaignContactTruth = {
  status: ActiveCampaignContactStatus;
  contactId: string | null;
  evidence: Record<string, unknown>;
};

type ActiveCampaignContact = {
  id?: string;
  email?: string;
  cdate?: string;
  udate?: string;
  deleted?: string;
  bounced_hard?: string;
  bounced_soft?: string;
  bounced_date?: string | null;
  unsubscribed?: string;
  lists?: Array<{ status?: string; list?: string }>;
};

function baseUrl() {
  return env.activeCampaignBaseUrl?.replace(/\/+$/, "") ?? null;
}

export function activeCampaignConnectionStatus(): ActiveCampaignConnectionStatus {
  return baseUrl() && env.activeCampaignApiKey ? "CONFIGURED" : "NOT_CONFIGURED";
}

export function activeCampaignAudit() {
  const configured = activeCampaignConnectionStatus() === "CONFIGURED";
  return {
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    hasBaseUrl: Boolean(baseUrl()),
    hasApiKey: Boolean(env.activeCampaignApiKey),
    hasWebhookSecret: Boolean(env.activeCampaignWebhookSecret),
    sendEnabled: env.activeCampaignSendEnabled,
    evidence: configured
      ? "Credenciais server-side encontradas. Envio real continua bloqueado por ACTIVE_CAMPAIGN_SEND_ENABLED."
      : "Defina ACTIVE_CAMPAIGN_BASE_URL, ACTIVE_CAMPAIGN_API_KEY e ACTIVE_CAMPAIGN_WEBHOOK_SECRET no HML para sync/event return real.",
  };
}

export function mapActiveCampaignContactStatus(contact: ActiveCampaignContact | null | undefined): ActiveCampaignContactTruth {
  if (!contact) {
    return {
      status: "NOT_FOUND",
      contactId: null,
      evidence: { reason: "email not found in ActiveCampaign contact search" },
    };
  }

  if (contact.deleted === "1") {
    return { status: "SUPPRESSED", contactId: contact.id ?? null, evidence: { deleted: contact.deleted } };
  }
  if (contact.bounced_hard === "1" || contact.bounced_soft === "1" || contact.bounced_date) {
    return {
      status: "BOUNCED",
      contactId: contact.id ?? null,
      evidence: { bounced_hard: contact.bounced_hard, bounced_soft: contact.bounced_soft, bounced_date: contact.bounced_date ?? null },
    };
  }
  if (contact.unsubscribed === "1" || contact.lists?.some((list) => list.status === "2")) {
    return { status: "UNSUBSCRIBED", contactId: contact.id ?? null, evidence: { unsubscribed: contact.unsubscribed, lists: contact.lists ?? [] } };
  }
  if (contact.lists?.some((list) => list.status === "1")) {
    return { status: "ACTIVE_SUBSCRIBED", contactId: contact.id ?? null, evidence: { lists: contact.lists } };
  }
  return { status: "UNKNOWN", contactId: contact.id ?? null, evidence: { reason: "contact found but list/subscription state is insufficient", lists: contact.lists ?? [] } };
}

export function emailPolicyDecision(status: ActiveCampaignContactStatus, commercialBlock: boolean) {
  if (commercialBlock) return "BLOCKED" as const;
  if (["UNSUBSCRIBED", "BOUNCED", "SUPPRESSED"].includes(status)) return "BLOCKED" as const;
  return "REVIEW_REQUIRED" as const;
}

export async function fetchActiveCampaignContactByEmail(email: string): Promise<ActiveCampaignContactTruth> {
  if (activeCampaignConnectionStatus() !== "CONFIGURED") {
    return {
      status: "NOT_SYNCED",
      contactId: null,
      evidence: { reason: "ActiveCampaign credentials not configured" },
    };
  }

  const response = await fetch(`${baseUrl()}/api/3/contacts?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      "Api-Token": env.activeCampaignApiKey!,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      status: "UNKNOWN",
      contactId: null,
      evidence: { reason: "ActiveCampaign request failed", status: response.status },
    };
  }
  const payload = await response.json().catch(() => ({})) as { contacts?: ActiveCampaignContact[] };
  return mapActiveCampaignContactStatus(payload.contacts?.[0]);
}

export function normalizeActiveCampaignWebhookEvent(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("sent")) return "SENT";
  if (text.includes("deliver")) return "DELIVERED";
  if (text.includes("open")) return "OPENED";
  if (text.includes("click")) return "CLICKED";
  if (text.includes("unsubscribe")) return "UNSUBSCRIBED";
  if (text.includes("bounce")) return "BOUNCED";
  return "NOT_INSTRUMENTED";
}
