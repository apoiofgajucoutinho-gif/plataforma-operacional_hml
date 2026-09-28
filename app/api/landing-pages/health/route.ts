import { NextResponse } from "next/server";
import { functionalRoleFor } from "@/lib/auth/roles";
import { runLandingHealthV1 } from "@/modules/landing-pages/health/landing-health";
import { getLandingAccess } from "@/modules/landing-pages/services/landing-pages-server";

export const dynamic = "force-dynamic";

export async function POST() {
  const access = await getLandingAccess();
  if (!access) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (functionalRoleFor(access.role) !== "ADMIN") return NextResponse.json({ error: "Apenas ADMIN pode executar o diagnóstico técnico." }, { status: 403 });
  try {
    const result = await runLandingHealthV1(access.client, access.tenantId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao verificar a Saúde da LP." }, { status: 500 });
  }
}
