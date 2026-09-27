import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { assertRelatoriosWriteAccess, getRelatorioDispatchByScheduleId, getRelatorioDispatchFromDraft, getRelatorioPreviewFromDraft, recordRelatorioEnvioFailure, updateRelatorioEnvioStatus } from "@/modules/relatorios/services/relatorios-server";

export const maxDuration = 60;

const generationTimeoutMs = 18_000;
const telegramTimeoutMs = 12_000;
const historyTimeoutMs = 5_000;

class SendNowError extends Error {
  constructor(public stage: "authentication" | "report" | "adoption" | "render" | "history" | "telegram" | "response", message: string, public code: string) {
    super(message);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, error: SendNowError) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(error), timeoutMs); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha inesperada.";
  return message.replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[redacted]").replace(/-?\d{8,}/g, "[redacted]").slice(0, 500);
}

function userMessage(stage: SendNowError["stage"], code: string) {
  if (stage === "telegram" && code === "TELEGRAM_TIMEOUT") return "O relatório foi gerado, mas o Telegram não respondeu a tempo. Tente novamente.";
  if (stage === "telegram") return "O relatório foi gerado, mas não foi possível enviá-lo pelo Telegram.";
  if (stage === "adoption") return "Não foi possível gerar o bloco Adoção. Tente novamente.";
  return "Não foi possível concluir o envio. Tente novamente.";
}

function normalizeTelegramError(errorText: string) {
  if (errorText.includes("bot can't send messages to the bot")) return "Telegram recusou o envio porque o Telegram chat ID configurado pertence a um bot. Use o chat ID de uma pessoa ou grupo onde o bot esteja presente.";
  if (errorText.includes("chat not found")) return "Telegram nao encontrou o chat. Confirme se o chat ID esta correto e se o bot ja recebeu uma mensagem ou esta no grupo.";
  if (errorText.includes("bot was blocked by the user")) return "Telegram recusou o envio porque o usuario bloqueou o bot ou ainda nao iniciou conversa com ele.";
  return errorText || "Falha ao enviar mensagem no Telegram.";
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!env.telegramBotToken) throw new Error("TELEGRAM_BOT_TOKEN nao configurado na Vercel.");
  const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), telegramTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }), signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new SendNowError("telegram", "Telegram timeout", "TELEGRAM_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(normalizeTelegramError(await response.text()));
  return response.json();
}

export async function POST(request: Request) {
  const totalStartedAt = performance.now();
  const timings: Record<string, number> = {};
  let scheduleId = "";
  let previewOnly = false;
  let draftPayload: any = null;
  let logId: string | null = null;
  let stage: SendNowError["stage"] = "authentication";

  try {
    const body = await request.json();
    scheduleId = String(body.scheduleId ?? "");
    previewOnly = Boolean(body.previewOnly);
    draftPayload = body.payload;
    if (!scheduleId && !draftPayload) return NextResponse.json({ error: "Configuração do relatório obrigatória." }, { status: 400 });

    const authStartedAt = performance.now();
    const auth = await assertRelatoriosWriteAccess();
    timings.authentication_ms = Math.round(performance.now() - authStartedAt);
    stage = draftPayload?.incluir_modulos?.includes?.("adocao") ? "adoption" : "report";
    const generationStartedAt = performance.now();
    const deadlineAt = Date.now() + generationTimeoutMs;
    const dispatch = await withTimeout(
      draftPayload
        ? previewOnly
          ? getRelatorioPreviewFromDraft(draftPayload, { deadlineAt })
          : getRelatorioDispatchFromDraft(draftPayload, { deadlineAt })
        : getRelatorioDispatchByScheduleId(scheduleId, { origin: previewOnly ? "preview" : "manual", createLog: !previewOnly, requireActive: false, deadlineAt }),
      generationTimeoutMs,
      new SendNowError(stage, "Report generation timeout", stage === "adoption" ? "ADOPTION_TIMEOUT" : "REPORT_TIMEOUT"),
    );
    timings.generation_ms = Math.round(performance.now() - generationStartedAt);
    Object.assign(timings, dispatch.timings ?? {});
    logId = dispatch.log?.id ?? null;

    if (dispatch.schedule.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Agendamento nao pertence ao tenant atual." }, { status: 403 });
    if (previewOnly) {
      timings.total_ms = Math.round(performance.now() - totalStartedAt);
      console.info("relatorios.send_now.timing", { preview: true, ...timings });
      return NextResponse.json({ ok: true, preview: { subject: dispatch.subject, text: dispatch.text, summary: dispatch.summary, modules: dispatch.modules, requestedModules: dispatch.requestedModules, filters: dispatch.filters, diagnostics: dispatch.diagnostics } });
    }
    if (!dispatch.log) return NextResponse.json({ error: "Falha ao criar historico do envio." }, { status: 400 });
    if (!dispatch.hasContent) {
      timings.total_ms = Math.round(performance.now() - totalStartedAt);
      console.info("relatorios.send_now.no_content", { logId: dispatch.log.id, ...timings });
      return NextResponse.json({ ok: true, skipped: true, reason: "sem_conteudo", data: dispatch.log, timings });
    }

    if (dispatch.channel !== "telegram") {
      await updateRelatorioEnvioStatus({ logId: dispatch.log.id, status: "erro", error: "Envio imediato implementado apenas para Telegram neste momento." });
      return NextResponse.json({ error: "Envio imediato implementado apenas para Telegram neste momento." }, { status: 400 });
    }
    if (!dispatch.telegramChatId) {
      await updateRelatorioEnvioStatus({ logId: dispatch.log.id, status: "erro", error: "Destinatario sem telegram_chat_id configurado." });
      return NextResponse.json({ error: "Destinatario sem telegram_chat_id configurado." }, { status: 400 });
    }

    stage = "telegram";
    const telegramStartedAt = performance.now();
    const telegram = await sendTelegramMessage(dispatch.telegramChatId, dispatch.text);
    timings.telegram_ms = Math.round(performance.now() - telegramStartedAt);
    stage = "history";
    const historyStartedAt = performance.now();
    const envio = await withTimeout(
      updateRelatorioEnvioStatus({ logId: dispatch.log.id, status: "enviado", metadata: { telegram_message_id: telegram?.result?.message_id ?? null, immediate: true, renderer: "telegram_v3", parse_mode: "HTML", duration_ms: Math.round(performance.now() - totalStartedAt), timings } }),
      historyTimeoutMs,
      new SendNowError("history", "History update timeout", "HISTORY_TIMEOUT"),
    );
    timings.history_final_ms = Math.round(performance.now() - historyStartedAt);
    timings.total_ms = Math.round(performance.now() - totalStartedAt);
    console.info("relatorios.send_now.timing", { preview: false, ...timings });
    return NextResponse.json({ ok: true, data: envio, timings });
  } catch (error) {
    const totalMs = Math.round(performance.now() - totalStartedAt);
    timings.total_ms = totalMs;
    const controlled = error instanceof SendNowError ? error : null;
    const failureStage = controlled?.stage ?? stage;
    const code = controlled?.code ?? "SEND_FAILED";
    const technicalMessage = safeError(error);
    try {
      if (logId) {
        await withTimeout(updateRelatorioEnvioStatus({ logId, status: "erro", error: technicalMessage, metadata: { failure_stage: failureStage, duration_ms: totalMs, timings } }), historyTimeoutMs, new SendNowError("history", "History update timeout", "HISTORY_TIMEOUT"));
      } else if (!previewOnly && (scheduleId || draftPayload)) {
        await withTimeout(recordRelatorioEnvioFailure({ scheduleId: scheduleId || undefined, payload: draftPayload ?? undefined, error: technicalMessage, stage: failureStage, durationMs: totalMs, timings }), historyTimeoutMs, new SendNowError("history", "History insert timeout", "HISTORY_TIMEOUT"));
      }
    } catch (historyError) {
      console.error("relatorios.send_now.history_failure", { stage: failureStage, error: safeError(historyError) });
    }
    console.error("relatorios.send_now.failure", { stage: failureStage, code, error: technicalMessage, ...timings });
    return NextResponse.json({ error: userMessage(failureStage, code), code, stage: failureStage }, { status: controlled?.code.includes("TIMEOUT") ? 504 : 400 });
  }
}
