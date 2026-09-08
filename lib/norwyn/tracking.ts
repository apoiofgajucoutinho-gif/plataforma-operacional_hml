"use client";

import type { AttributionKey } from "@/lib/norwyn/landing-types";

export type NorwynEventName =
  | "landing_view"
  | "cta_view"
  | "cta_click"
  | "scroll_depth"
  | "video_play"
  | "video_progress"
  | "testimonial_view"
  | "testimonial_interaction"
  | "faq_open"
  | "form_start"
  | "form_submit"
  | "checkout_click"
  | "page_error";

export type NorwynEvent = {
  name: NorwynEventName;
  params?: Record<string, string | number | boolean | null>;
};

type Attribution = Record<AttributionKey, string | null> & {
  session_id: string;
};

const attributionKeys: AttributionKey[] = [
  "sck",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

const storageKey = "norwyn_lp_attribution_v1";
const eventsKey = "norwyn_lp_events_v1";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `nw_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readStoredAttribution(): Partial<Attribution> {
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Partial<Attribution>) : {};
  } catch {
    return {};
  }
}

export function getNorwynAttribution(): Attribution {
  const stored = readStoredAttribution();
  const params = new URLSearchParams(window.location.search);
  const attribution = {
    session_id: stored.session_id ?? createSessionId(),
    sck: stored.sck ?? null,
    utm_source: stored.utm_source ?? null,
    utm_medium: stored.utm_medium ?? null,
    utm_campaign: stored.utm_campaign ?? null,
    utm_content: stored.utm_content ?? null,
    utm_term: stored.utm_term ?? null,
  } satisfies Attribution;

  for (const key of attributionKeys) {
    const value = params.get(key);
    if (value) attribution[key] = value;
  }

  try {
    sessionStorage.setItem(storageKey, JSON.stringify(attribution));
  } catch {
    // Session storage can be unavailable in strict privacy modes.
  }

  return attribution;
}

export function buildTrackedUrl(destinationUrl: string | null, fallbackHash = "#oferta") {
  const attribution = getNorwynAttribution();
  const base = destinationUrl || `${window.location.origin}${window.location.pathname}${fallbackHash}`;
  const url = new URL(base, window.location.href);

  for (const key of attributionKeys) {
    const value = attribution[key];
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }

  return url.toString();
}

export function readNorwynDebugState() {
  const attribution = getNorwynAttribution();
  let events: Array<NorwynEvent & { at: string }> = [];

  try {
    events = JSON.parse(sessionStorage.getItem(eventsKey) ?? "[]") as Array<
      NorwynEvent & { at: string }
    >;
  } catch {
    events = [];
  }

  return {
    attribution,
    events,
    lastEvent: events.at(-1) ?? null,
  };
}

export function trackNorwynEvent(event: NorwynEvent, endpoint = "/api/norwyn/lp-events") {
  const attribution = getNorwynAttribution();
  const payload = {
    ...event,
    environment: "hml",
    product_id: "formacao-aasi-premium",
    page_url: window.location.href,
    attribution,
    occurred_at: new Date().toISOString(),
  };

  try {
    const previous = JSON.parse(sessionStorage.getItem(eventsKey) ?? "[]") as Array<
      NorwynEvent & { at: string }
    >;
    const next = [...previous, { ...event, at: payload.occurred_at }].slice(-80);
    sessionStorage.setItem(eventsKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("norwyn:event", { detail: payload }));
  } catch {
    // Debug persistence is best-effort only.
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    window.dispatchEvent(
      new CustomEvent("norwyn:event", {
        detail: {
          ...payload,
          name: "page_error",
          params: { error_type: "tracking_post_failed" },
        },
      }),
    );
  });
}
