import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { updateRelatorioEnvioStatus } from "@/modules/relatorios/services/relatorios-server";

function hasValidToken(request: Request) {
  const expected = env.n8nIngestToken;
  if (!expected) return false;

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const headerToken = request.headers.get("x-n8n-token") ?? "";

  return bearer === expected || headerToken === expected;
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Token invalido." }, { status: 401 });
  }

  const body = await request.json();
  const logId = String(body.logId ?? "");
  const status = String(body.status ?? "");

  if (!logId) return NextResponse.json({ error: "logId obrigatorio." }, { status: 400 });
  if (!["enviado", "erro", "ignorado"].includes(status)) {
    return NextResponse.json({ error: "status invalido." }, { status: 400 });
  }

  try {
    const data = await updateRelatorioEnvioStatus({
      logId,
      status: status as "enviado" | "erro" | "ignorado",
      error: body.error ? String(body.error) : null,
      metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao registrar envio." },
      { status: 400 },
    );
  }
}
