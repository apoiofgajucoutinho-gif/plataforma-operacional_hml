import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isGoogleCalendarConfigured,
  refreshGoogleAccessToken,
  upsertGoogleCalendarEvent,
} from "@/services/google/calendar";
import type { AgendaEvent } from "@/modules/agenda/types";

export async function POST(request: Request) {
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        { error: "Google Calendar OAuth ainda nao configurado." },
        { status: 422 },
      );
    }

    const { eventId } = (await request.json()) as { eventId: string };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const { data: event, error: eventError } = await supabase
      .from("agenda_eventos")
      .select("*")
      .eq("id", eventId)
      .returns<AgendaEvent[]>()
      .single();

    if (eventError || !event) {
      throw eventError ?? new Error("Evento nao encontrado.");
    }

    const { data: connection, error: connectionError } = await supabase
      .from("google_calendar_connections")
      .select("refresh_token")
      .eq("tenant_id", event.tenant_id)
      .maybeSingle();

    if (connectionError || !connection) {
      throw connectionError ?? new Error("Tenant sem conexao Google Calendar.");
    }

    const token = await refreshGoogleAccessToken(connection.refresh_token);
    const googleEvent = await upsertGoogleCalendarEvent({
      event,
      accessToken: token.access_token,
    });

    await supabase
      .from("agenda_eventos")
      .update({ google_event_id: googleEvent.id })
      .eq("id", event.id);

    return NextResponse.json({ googleEvent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar." },
      { status: 400 },
    );
  }
}
