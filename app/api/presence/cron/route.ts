import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { discoverInternalLinks, runPresenceCheck, runPresenceSimulations } from "@/modules/presence/services/presence-monitor";
import { duePresenceAssets, resolvePresenceCronAccess } from "@/modules/presence/services/presence-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const authorization = request.headers.get("authorization");
  const token = env.n8nIngestToken;
  return cronHeader === "1" || (Boolean(token) && authorization === `Bearer ${token}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { dataClient, tenantId } = await resolvePresenceCronAccess();
  const searchParams = new URL(request.url).searchParams;
  const force = searchParams.get("force") === "1";
  const shouldDiscover = searchParams.get("discover") === "1";
  const shouldSimulate = searchParams.get("simulate") === "1";
  const assets = force ? ((await dataClient.from("digital_assets").select("*").eq("tenant_id", tenantId).eq("monitoring_enabled", true).limit(20)).data ?? []) : await duePresenceAssets(dataClient, tenantId);
  const results = [];

  for (const asset of assets.slice(0, 10)) {
    try {
      const { check } = await runPresenceCheck(dataClient, asset);
      results.push({ asset_id: asset.id, name: asset.name, status: check.status, health_score: check.health_score });
    } catch (error) {
      results.push({ asset_id: asset.id, name: asset.name, error: error instanceof Error ? error.message : "Falha na checagem" });
    }
  }

  const discovery = [];
  if (shouldDiscover) {
    const mainAssets = assets.filter((asset: any) => asset.asset_type === "main_site").slice(0, 1);
    for (const asset of mainAssets) {
      try {
        discovery.push({ asset_id: asset.id, ...(await discoverInternalLinks(dataClient, asset)) });
      } catch (error) {
        discovery.push({ asset_id: asset.id, error: error instanceof Error ? error.message : "Falha no discovery" });
      }
    }
  }

  const simulations = shouldSimulate ? await runPresenceSimulations(dataClient, tenantId) : null;

  return NextResponse.json({ ok: true, checked: results.length, discovered: discovery, simulations, frequency_model: { critical_minutes: 5, normal_minutes: 15, scheduler: "endpoint_ready_not_added_to_vercel_json" }, results });
}