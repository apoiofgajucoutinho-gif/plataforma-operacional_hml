import { env } from "@/lib/env";
import type { AgendaEvent } from "@/modules/agenda/types";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: "Bearer";
};

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  updated?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
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
    const details = await response.text().catch(() => "");
    throw new Error(
      details
        ? `Falha ao renovar token do Google Calendar: ${details.slice(0, 240)}`
        : "Falha ao renovar token do Google Calendar.",
    );
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

export async function deleteGoogleCalendarEvent(params: {
  googleEventId: string;
  accessToken: string;
}) {
  const calendarId = encodeURIComponent(env.googleCalendarId);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
    params.googleEventId,
  )}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const details = await response.text().catch(() => "");
    throw new Error(
      details
        ? `Nao foi possivel remover no Google Agenda automaticamente. Detalhe: ${details.slice(0, 180)}`
        : "Nao foi possivel remover no Google Agenda automaticamente.",
    );
  }

  return { ok: true };
}

export async function listGoogleCalendarEvents(params: {
  accessToken: string;
  timeMin: string;
  timeMax: string;
}) {
  const events: GoogleCalendarEvent[] = [];
  const calendarId = encodeURIComponent(env.googleCalendarId);
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("showDeleted", "true");
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("timeMin", params.timeMin);
    url.searchParams.set("timeMax", params.timeMax);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Falha ao buscar eventos do Google Calendar.");
    }

    const body = (await response.json()) as GoogleCalendarEventsResponse;
    events.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return events;
}
