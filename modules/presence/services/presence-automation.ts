import "server-only";

import { discoverInternalLinks, runPresenceCheck, runPresenceSimulations } from "@/modules/presence/services/presence-monitor";
import {
  duePresenceAssets,
  isPresenceAutomationWindow,
  nextPresenceAutomationRun,
  PRESENCE_AUTOMATION_HOURS,
  PRESENCE_AUTOMATION_TIMEZONE,
  resolvePresenceCronAccess,
} from "@/modules/presence/services/presence-server";

type RunPresenceAutomationParams = {
  force?: boolean;
  discover?: boolean;
  simulate?: boolean;
  limit?: number;
  now?: Date;
};

export async function runPresenceAutomation(params: RunPresenceAutomationParams = {}) {
  const now = params.now ?? new Date();
  const shouldRun = params.force || isPresenceAutomationWindow(now);
  const schedule = {
    timezone: PRESENCE_AUTOMATION_TIMEZONE,
    local_hours: PRESENCE_AUTOMATION_HOURS.map((hour) => `${String(hour).padStart(2, "0")}:00`),
    next_run_at: nextPresenceAutomationRun(now),
  };

  if (!shouldRun) {
    return { ok: true, skipped: true, reason: "outside_presence_automation_window", checked: 0, schedule, results: [] as Array<Record<string, unknown>> };
  }

  const { dataClient, tenantId } = await resolvePresenceCronAccess();
  const assets = await duePresenceAssets(dataClient, tenantId, params.limit ?? 120);
  const results: Array<Record<string, unknown>> = [];

  for (const asset of assets) {
    try {
      const { check } = await runPresenceCheck(dataClient, asset, { origin: "automatic", retryOnFailure: true });
      results.push({ asset_id: asset.id, name: asset.name, status: check.status, health_score: check.health_score, http_status: check.http_status });
    } catch (error) {
      results.push({ asset_id: asset.id, name: asset.name, error: error instanceof Error ? error.message : "Falha na checagem" });
    }
  }

  const discovery = [];
  if (params.discover) {
    const mainAssets = assets.filter((asset: any) => asset.asset_type === "main_site").slice(0, 1);
    for (const asset of mainAssets) {
      try {
        discovery.push({ asset_id: asset.id, ...(await discoverInternalLinks(dataClient, asset)) });
      } catch (error) {
        discovery.push({ asset_id: asset.id, error: error instanceof Error ? error.message : "Falha no discovery" });
      }
    }
  }

  const simulations = params.simulate ? await runPresenceSimulations(dataClient, tenantId) : null;

  return {
    ok: true,
    skipped: false,
    tenant_id: tenantId,
    checked: results.length,
    discovered: discovery,
    simulations,
    schedule,
    results,
  };
}
