import { NextResponse } from "next/server";
import {
  createAgendaEvent,
  syncAgendaEventWithGoogle,
} from "@/modules/agenda/services/agenda-server";
import type { AgendaEventInput } from "@/modules/agenda/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AgendaEventInput;
    const event = await createAgendaEvent(payload);
    const googleSync = await syncAgendaEventWithGoogle(event);

    return NextResponse.json(
      {
        event: googleSync.event,
        googleSync: {
          ok: googleSync.ok,
          error: googleSync.error,
          googleEventId: googleSync.googleEventId ?? null,
          accountEmail: googleSync.accountEmail ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar evento." },
      { status: 400 },
    );
  }
}
