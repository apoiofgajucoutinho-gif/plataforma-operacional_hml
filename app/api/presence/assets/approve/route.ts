import { NextResponse } from "next/server";
import { approveDiscoveredLink } from "@/modules/presence/services/presence-monitor";
import { resolvePresenceApiAccess } from "@/modules/presence/services/presence-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await resolvePresenceApiAccess();
  if (access.error) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!access.isAdmin) return NextResponse.json({ error: "Apenas Admin pode aprovar sublinks" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const linkId = typeof body.linkId === "string" ? body.linkId : null;
  const action = body.action === "monitor" || body.action === "critical" || body.action === "ignored" ? body.action : null;
  if (!linkId || !action) return NextResponse.json({ error: "linkId e action sao obrigatorios" }, { status: 400 });

  const result = await approveDiscoveredLink(access.dataClient, { tenantId: access.tenantId, linkId, action, userId: access.user.id });
  return NextResponse.json({ message: "Sublink revisado", ...result });
}