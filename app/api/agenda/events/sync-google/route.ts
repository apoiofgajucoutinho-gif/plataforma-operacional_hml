import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncAgendaEventWithGoogle } from "@/modules/agenda/services/agenda-server";
import type { AgendaEvent } from "@/modules/agenda/types";

export async function POST(request: Request) {
  try {
    const { eventId } = (await request.json()) as { eventId: string };
    const supabase = await createClient();
    const dataClient = createAdminClient() ?? supabase;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUser = user ?? getLocalBypassUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const localMembership = user ? null : await getLocalBypassMembership(dataClient);
    const { data: membership, error: membershipError } = localMembership
      ? { data: localMembership, error: null }
      : await dataClient
          .from("tenant_members")
          .select("tenant_id")
          .eq("user_id", currentUser.id)
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

    const googleSync = await syncAgendaEventWithGoogle(event);
    if (!googleSync.ok) {
      return NextResponse.json({ error: googleSync.error }, { status: 400 });
    }

    return NextResponse.json({
      googleEventId: googleSync.googleEventId,
      accountEmail: googleSync.accountEmail,
      event: googleSync.event,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar." },
      { status: 400 },
    );
  }
}
