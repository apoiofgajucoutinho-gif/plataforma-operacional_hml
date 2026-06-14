import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getRelatorioDispatchesDue } from "@/modules/relatorios/services/relatorios-server";

function hasValidToken(request: Request) {
  const expected = env.n8nIngestToken;
  if (!expected) return false;

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const headerToken = request.headers.get("x-n8n-token") ?? "";

  return bearer === expected || headerToken === expected;
}

export async function GET(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Token invalido." }, { status: 401 });
  }

  const url = new URL(request.url);
  const time = url.searchParams.get("time");
  const windowMinutes = Math.max(1, Math.min(60, Number(url.searchParams.get("windowMinutes") ?? 15)));

  if (!time) {
    return NextResponse.json({ error: "Parametro time obrigatorio no formato HH:mm." }, { status: 400 });
  }

  try {
    const dispatches = await getRelatorioDispatchesDue(time, windowMinutes);
    return NextResponse.json({
      ok: true,
      windowMinutes,
      count: dispatches.length,
      items: dispatches.map((dispatch) => ({
        logId: dispatch.log.id,
        scheduleId: dispatch.schedule.id,
        scheduleName: dispatch.schedule.nome,
        recipientName: dispatch.recipient.nome,
        channel: dispatch.channel,
        telegramChatId: dispatch.telegramChatId,
        email: dispatch.email,
        whatsapp: dispatch.whatsapp,
        subject: dispatch.subject,
        text: dispatch.text,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao buscar reports do horario." },
      { status: 400 },
    );
  }
}
