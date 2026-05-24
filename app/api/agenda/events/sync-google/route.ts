import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const dataClient = createAdminClient() ?? supabase;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await dataClient
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      throw membershipError ?? new Error("Usuario sem tenant vinculado.");
    }

    const { data: event, error: eventError } = await dataClient
      .from("agenda_eventos")
      .select("*")
      .eq("id", eventId)
      .eq("tenant_id", membership.tenant_id)
      .returns<AgendaEvent[]>()
      .single();

    if (eventError || !event) {
      throw eventError ?? new Error("Evento nao encontrado.");
    }

    const { data: connection, error: connectionError } = await dataClient
      .from("google_calendar_connections")
      .select("account_email, refresh_token")
      .eq("tenant_id", event.tenant_id)
      .returns<{ account_email: string; refresh_token: string }[]>()
      .maybeSingle();

    if (connectionError || !connection) {
      throw connectionError ?? new Error("Tenant sem conexao Google Calendar.");
    }

    const token = await refreshGoogleAccessToken(connection.refresh_token);

    const googleEvent = await upsertGoogleCalendarEvent({
      event,
      accessToken: token.access_token,
    });

    const { data: updatedEvent } = await dataClient
      .from("agenda_eventos")
      .update({ google_event_id: googleEvent.id as string })
      .eq("id", event.id)
      .select("*")
      .returns<AgendaEvent[]>()
      .single();

    return NextResponse.json({
      googleEvent,
      googleEventId: googleEvent.id,
      accountEmail: connection.account_email,
      event: updatedEvent ?? { ...event, google_event_id: googleEvent.id },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar." },
      { status: 400 },
    );
  }
}
