import { env } from "@/lib/env";
import type { AgendaEvent } from "@/modules/agenda/types";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: "Bearer";
};

export function isGoogleCalendarConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleRedirectUri);
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  if (!isGoogleCalendarConfigured()) {
    throw new Error("Google Calendar OAuth nao configurado.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Falha ao renovar token do Google Calendar.");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function upsertGoogleCalendarEvent(params: {
  event: AgendaEvent;
  accessToken: string;
}) {
  const { event, accessToken } = params;
  const calendarId = encodeURIComponent(env.googleCalendarId);
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
  const url = event.google_event_id
    ? `${baseUrl}/${encodeURIComponent(event.google_event_id)}`
    : baseUrl;

  const response = await fetch(url, {
    method: event.google_event_id ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.titulo,
      description: event.descricao ?? undefined,
      location: event.local ?? undefined,
      start: { dateTime: event.inicio, timeZone: "America/Sao_Paulo" },
      end: { dateTime: event.fim, timeZone: "America/Sao_Paulo" },
    }),
  });

  if (!response.ok) {
    throw new Error("Falha ao sincronizar evento com Google Calendar.");
  }

  return (await response.json()) as { id: string; htmlLink?: string };
}
