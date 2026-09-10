import { NextResponse } from "next/server";
import { decideLandingApproval, getLandingApprovalContext } from "@/modules/landing-pages/services/landing-pages-server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  const body = payload as { landingKey?: string; decision?: "APPROVED" | "REJECTED"; notes?: string };
  if (!body.landingKey || (body.decision !== "APPROVED" && body.decision !== "REJECTED")) return NextResponse.json({ ok: false, error: "decisao_invalida" }, { status: 400 });
  try {
    await decideLandingApproval({ landingKey: body.landingKey, decision: body.decision, notes: body.notes });
    const context = await getLandingApprovalContext(body.landingKey);
    return NextResponse.json({ ok: true, item: context.item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "erro_desconhecido" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
