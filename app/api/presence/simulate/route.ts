import { NextResponse } from "next/server";
import { runPresenceSimulations } from "@/modules/presence/services/presence-monitor";
import { resolvePresenceApiAccess } from "@/modules/presence/services/presence-server";

export const dynamic = "force-dynamic";

export async function POST() {
  const access = await resolvePresenceApiAccess();
  if (access.error) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!access.isAdmin) return NextResponse.json({ error: "Apenas Admin pode executar simulacoes" }, { status: 403 });

  const result = await runPresenceSimulations(access.dataClient, access.tenantId);
  return NextResponse.json({ message: "Simulacoes registradas e recuperacao validada", ...result });
}