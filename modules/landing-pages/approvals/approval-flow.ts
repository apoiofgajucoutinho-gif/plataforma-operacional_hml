import type { LandingVersionStatus } from "@/modules/landing-pages/types";

export function statusAfterApproval(decision: "APPROVED" | "REJECTED"): LandingVersionStatus {
  return decision === "APPROVED" ? "READY_FOR_PROD" : "REJECTED";
}

export function requiresNewVersionAfterDecision(status: LandingVersionStatus) {
  return status === "APPROVED" || status === "READY_FOR_PROD" || status === "REJECTED";
}
