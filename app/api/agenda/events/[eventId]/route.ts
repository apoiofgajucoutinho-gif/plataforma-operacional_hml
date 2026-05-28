import { NextResponse } from "next/server";
import {
  syncAgendaEventWithGoogle,
  updateAgendaEvent,
} from "@/modules/agenda/services/agenda-server";
import type { AgendaEventInput } from "@/modules/agenda/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const payload = (await request.json()) as AgendaEventInput;
    const event = await updateAgendaEvent(eventId, payload);
    const googleSync = await syncAgendaEventWithGoogle(event);

    return NextResponse.json({
      event: googleSync.event,
      googleSync: {
        ok: googleSync.ok,
        error: googleSync.error,
        googleEventId: googleSync.googleEventId ?? null,
        accountEmail: googleSync.accountEmail ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar evento." },
      { status: 400 },
    );
  }
}
