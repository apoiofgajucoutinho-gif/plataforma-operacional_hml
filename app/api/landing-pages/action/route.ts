import { NextResponse } from "next/server";
import { getLandingAdminContext, mutateLandingAction } from "@/modules/landing-pages/services/landing-pages-server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  try {
    await mutateLandingAction(payload as { action: string; landingKey: string; headline?: string; imageSrc?: string; themeKey?: string });
    const context = await getLandingAdminContext();
    return NextResponse.json({ ok: true, landings: context.landings, message: "Landing atualizada." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "erro_desconhecido" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
