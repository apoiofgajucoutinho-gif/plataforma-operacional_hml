import { NextResponse } from "next/server";
import { resolvePresenceApiAccess } from "@/modules/presence/services/presence-server";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["main_site", "internal_page", "landing_page", "checkout", "support", "form", "other"]);

export async function POST(request: Request) {
  const access = await resolvePresenceApiAccess();
  if (access.error) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!access.isAdmin) return NextResponse.json({ error: "Apenas Admin pode adicionar ativos" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const assetType = typeof body.asset_type === "string" && allowedTypes.has(body.asset_type) ? body.asset_type : "other";
  const owner = typeof body.owner === "string" ? body.owner.trim() : "Juliana Coutinho";
  const isCritical = Boolean(body.is_critical);

  if (!name || !url) return NextResponse.json({ error: "Nome e URL sao obrigatorios" }, { status: 400 });
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL invalida" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return NextResponse.json({ error: "Use uma URL HTTP ou HTTPS" }, { status: 400 });

  const { data, error } = await access.dataClient
    .from("digital_assets")
    .insert({
      tenant_id: access.tenantId,
      name,
      url: parsed.toString(),
      asset_type: assetType,
      environment: parsed.hostname.endsWith("vercel.app") ? "hml" : "prod_external",
      owner,
      is_critical: isCritical,
      monitoring_enabled: true,
      monitor_content: assetType !== "checkout",
      monitor_links: assetType === "main_site" || assetType === "internal_page" || assetType === "landing_page",
      monitor_performance: true,
      expected_content: assetType === "checkout" ? [] : ["Juliana Coutinho"],
      forbidden_patterns: ["casino", "bet", "aposta", "slot", "crypto spam", "adult", "pharma spam"],
      thresholds: { response_warning_ms: 1500, response_critical_ms: 3000, timeout_ms: 15000 },
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Ativo adicionado", asset: data });
}