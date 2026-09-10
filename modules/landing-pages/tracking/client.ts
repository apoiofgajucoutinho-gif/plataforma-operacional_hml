"use client";

import type { LandingBlock, LandingDefinition } from "@/modules/landing-pages/types";

function ensureSessionId() {
  const current = window.sessionStorage.getItem("norwyn_lp_session");
  if (current) return current;
  const next = crypto.randomUUID();
  window.sessionStorage.setItem("norwyn_lp_session", next);
  return next;
}

function attribution() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    sck: params.get("sck"),
  };
}

export async function postLandingEvent(landing: LandingDefinition, event: { name: string; block?: LandingBlock; ctaId?: string }) {
  await fetch(landing.tracking.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      name: event.name,
      landing_id: landing.tracking.landingId ?? null,
      version_id: landing.tracking.versionId ?? null,
      landing_key: landing.landingKey,
      landing_version: landing.version,
      environment: landing.environment.toLowerCase(),
      campaign_id: landing.campaignKey,
      product_id: landing.productKey,
      block_id: event.block?.id ?? null,
      block_type: event.block?.type ?? null,
      cta_id: event.ctaId ?? null,
      session_id: ensureSessionId(),
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      ...attribution(),
    }),
  }).catch(() => null);
}
