import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { pullGoogleCalendarEventsToAgenda } from "@/modules/agenda/services/agenda-server";
import {
  isGoogleCalendarConfigured,
  upsertGoogleCalendarEvent,
} from "@/services/google/calendar";
import type { AgendaEvent } from "@/modules/agenda/types";

type GoogleOAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: "Bearer";
  expires_in: number;
};

type GoogleUserInfo = {
  email: string;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tenantId = url.searchParams.get("state");

  if (!code || !tenantId || !isGoogleCalendarConfigured()) {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      redirect_uri: env.googleRedirectUri!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/agenda?google=error", request.url));
  }

  const token = (await tokenResponse.json()) as GoogleOAuthTokenResponse;

  if (!token.refresh_token) {
    return NextResponse.redirect(new URL("/agenda?google=missing-refresh", request.url));
  }

  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );
  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
  const preferredEmail =
    env.googleCalendarConnectionEmail ||
    (env.googleCalendarId?.includes("@") ? env.googleCalendarId : "");

  if (!userInfo.email) {
    return NextResponse.redirect(new URL("/agenda?google=missing-email", request.url));
  }

  if (preferredEmail && userInfo.email.toLowerCase() !== preferredEmail.toLowerCase()) {
    return NextResponse.redirect(new URL("/agenda?google=wrong-account", request.url));
  }

  const supabase = await createClient();
  const dataClient = createAdminClient() ?? supabase;
  await dataClient.from("google_calendar_connections").upsert(
    {
      tenant_id: tenantId,
      account_email: userInfo.email,
      refresh_token: token.refresh_token,
      scopes: token.scope.split(" "),
    },
    { onConflict: "tenant_id,account_email" },
  );

  const { data: events } = await dataClient
    .from("agenda_eventos")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("google_event_id", null)
    .gte("fim", new Date().toISOString())
    .order("inicio", { ascending: true })
    .limit(50)
    .returns<AgendaEvent[]>();

  let synced = 0;
  for (const event of events ?? []) {
    try {
      const googleEvent = await upsertGoogleCalendarEvent({
        event,
        accessToken: token.access_token,
      });

      await dataClient
        .from("agenda_eventos")
        .update({ google_event_id: googleEvent.id })
        .eq("id", event.id);

      synced += 1;
    } catch {
      // Keep OAuth connection successful even if a legacy event fails to sync.
    }
  }

  const pulled = await pullGoogleCalendarEventsToAgenda({
    tenantId,
    accessToken: token.access_token,
  });

  const imported = pulled.ok ? pulled.imported : 0;
  const updated = pulled.ok ? pulled.updated : 0;
  const cancelled = pulled.ok ? pulled.cancelled : 0;
  if (synced > 0 || imported > 0 || updated > 0 || cancelled > 0) {
    return NextResponse.redirect(
      new URL(
        `/agenda?google=connected&synced=${synced}&imported=${imported}&updated=${updated}&cancelled=${cancelled}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(new URL("/agenda?google=connected", request.url));
}
