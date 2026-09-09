import { NextResponse } from "next/server";
import { createValidationDecision } from "@/modules/validacao/services/validation-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const decision = await createValidationDecision(body);
    return NextResponse.json({ ok: true, decision });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível registrar a validação." }, { status: 400 });
  }
}
