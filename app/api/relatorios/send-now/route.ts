import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { assertRelatoriosWriteAccess, getRelatorioDispatchByScheduleId, getRelatorioDispatchFromDraft, getRelatorioPreviewFromDraft, updateRelatorioEnvioStatus } from "@/modules/relatorios/services/relatorios-server";

function normalizeTelegramError(errorText: string) {
  if (errorText.includes("bot can't send messages to the bot")) return "Telegram recusou o envio porque o Telegram chat ID configurado pertence a um bot. Use o chat ID de uma pessoa ou grupo onde o bot esteja presente.";
  if (errorText.includes("chat not found")) return "Telegram nao encontrou o chat. Confirme se o chat ID esta correto e se o bot ja recebeu uma mensagem ou esta no grupo.";
  if (errorText.includes("bot was blocked by the user")) return "Telegram recusou o envio porque o usuario bloqueou o bot ou ainda nao iniciou conversa com ele.";
  return errorText || "Falha ao enviar mensagem no Telegram.";
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!env.telegramBotToken) throw new Error("TELEGRAM_BOT_TOKEN nao configurado na Vercel.");
  const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
  const baseBody = { chat_id: chatId, text, disable_web_page_preview: true };
  const markdownResponse = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...baseBody, parse_mode: "Markdown" }) });
  if (markdownResponse.ok) return markdownResponse.json();
  const plainResponse = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(baseBody) });
  if (!plainResponse.ok) throw new Error(normalizeTelegramError(await plainResponse.text()));
  return plainResponse.json();
}

export async function POST(request: Request) {
  const body = await request.json();
  const scheduleId = String(body.scheduleId ?? "");
  const previewOnly = Boolean(body.previewOnly);
  const draftPayload = body.payload;
  if (!scheduleId && !draftPayload) return NextResponse.json({ error: "scheduleId ou configuracao do relatorio obrigatoria." }, { status: 400 });
  let logId: string | null = null;

  try {
    const auth = await assertRelatoriosWriteAccess();
    const dispatch = draftPayload
      ? previewOnly
        ? await getRelatorioPreviewFromDraft(draftPayload)
        : await getRelatorioDispatchFromDraft(draftPayload)
      : await getRelatorioDispatchByScheduleId(scheduleId, { origin: previewOnly ? "preview" : "manual", createLog: !previewOnly, requireActive: false });
    logId = dispatch.log?.id ?? null;

    if (dispatch.schedule.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Agendamento nao pertence ao tenant atual." }, { status: 403 });
    if (previewOnly) return NextResponse.json({ ok: true, preview: { subject: dispatch.subject, text: dispatch.text, summary: dispatch.summary, modules: dispatch.modules, requestedModules: dispatch.requestedModules, filters: dispatch.filters, diagnostics: dispatch.diagnostics } });
    if (!dispatch.log) return NextResponse.json({ error: "Falha ao criar historico do envio." }, { status: 400 });

    if (dispatch.channel !== "telegram") {
      await updateRelatorioEnvioStatus({ logId: dispatch.log.id, status: "erro", error: "Envio imediato implementado apenas para Telegram neste momento." });
      return NextResponse.json({ error: "Envio imediato implementado apenas para Telegram neste momento." }, { status: 400 });
    }
    if (!dispatch.telegramChatId) {
      await updateRelatorioEnvioStatus({ logId: dispatch.log.id, status: "erro", error: "Destinatario sem telegram_chat_id configurado." });
      return NextResponse.json({ error: "Destinatario sem telegram_chat_id configurado." }, { status: 400 });
    }

    const telegram = await sendTelegramMessage(dispatch.telegramChatId, dispatch.text);
    const envio = await updateRelatorioEnvioStatus({ logId: dispatch.log.id, status: "enviado", metadata: { telegram, immediate: true } });
    return NextResponse.json({ ok: true, data: envio });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar report agora.";
    if (logId) await updateRelatorioEnvioStatus({ logId, status: "erro", error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
