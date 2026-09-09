import { NextResponse } from "next/server";
import { runPresenceCheck } from "@/modules/presence/services/presence-monitor";
import { resolvePresenceApiAccess } from "@/modules/presence/services/presence-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await resolvePresenceApiAccess();
  if (access.error) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const assetId = typeof body.assetId === "string" ? body.assetId : null;
  if (!assetId) return NextResponse.json({ error: "assetId obrigatorio" }, { status: 400 });

  const { data: asset, error } = await access.dataClient.from("digital_assets").select("*").eq("tenant_id", access.tenantId).eq("id", assetId).maybeSingle();
  if (error || !asset) return NextResponse.json({ error: error?.message ?? "Ativo nao encontrado" }, { status: 404 });

  const { check } = await runPresenceCheck(access.dataClient, asset);
  return NextResponse.json({ message: "Checagem concluida", check });
}