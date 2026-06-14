import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  assertRelatoriosWriteAccess,
  getRelatorioDispatchByScheduleId,
  updateRelatorioEnvioStatus,
} from "@/modules/relatorios/services/relatorios-server";

async function sendTelegramMessage(chatId: string, text: string) {
  if (!env.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN nao configurado na Vercel.");
  }

  const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
  const baseBody = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };

  const markdownResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...baseBody, parse_mode: "Markdown" }),
  });

  if (markdownResponse.ok) return markdownResponse.json();

  const plainResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baseBody),
  });

  if (!plainResponse.ok) {
    const errorText = await plainResponse.text();
    throw new Error(errorText || "Falha ao enviar mensagem no Telegram.");
  }

  return plainResponse.json();
}

export async function POST(request: Request) {
  const body = await request.json();
  const scheduleId = String(body.scheduleId ?? "");
  if (!scheduleId) return NextResponse.json({ error: "scheduleId obrigatorio." }, { status: 400 });

  try {
    const auth = await assertRelatoriosWriteAccess();
    const dispatch = await getRelatorioDispatchByScheduleId(scheduleId);

    if (dispatch.schedule.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Agendamento nao pertence ao tenant atual." }, { status: 403 });
    }

    if (dispatch.channel !== "telegram") {
      await updateRelatorioEnvioStatus({
        logId: dispatch.log.id,
        status: "erro",
        error: "Envio imediato implementado apenas para Telegram neste momento.",
      });
      return NextResponse.json({ error: "Envio imediato implementado apenas para Telegram neste momento." }, { status: 400 });
    }

    if (!dispatch.telegramChatId) {
      await updateRelatorioEnvioStatus({
        logId: dispatch.log.id,
        status: "erro",
        error: "Destinatario sem telegram_chat_id configurado.",
      });
      return NextResponse.json({ error: "Destinatario sem telegram_chat_id configurado." }, { status: 400 });
    }

    const telegram = await sendTelegramMessage(dispatch.telegramChatId, dispatch.text);
    const envio = await updateRelatorioEnvioStatus({
      logId: dispatch.log.id,
      status: "enviado",
      metadata: { telegram, immediate: true },
    });

    return NextResponse.json({ ok: true, data: envio });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao enviar report agora." },
      { status: 400 },
    );
  }
}
