import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getRelatorioDispatchByScheduleId } from "@/modules/relatorios/services/relatorios-server";

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
  const scheduleId = url.searchParams.get("scheduleId");
  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId obrigatorio." }, { status: 400 });
  }

  try {
    const dispatch = await getRelatorioDispatchByScheduleId(scheduleId);

    return NextResponse.json({
      ok: true,
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao preparar report." },
      { status: 400 },
    );
  }
}
