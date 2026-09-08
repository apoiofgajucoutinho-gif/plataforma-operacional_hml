"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTrackedUrl,
  getNorwynAttribution,
  readNorwynDebugState,
  trackNorwynEvent,
} from "@/lib/norwyn/tracking";

type TrackingRuntimeProps = {
  eventEndpoint: string;
  checkoutUrl: string | null;
};

export function TrackingRuntime({ eventEndpoint, checkoutUrl: rawCheckoutUrl }: TrackingRuntimeProps) {
  const [debugState, setDebugState] = useState<ReturnType<typeof readNorwynDebugState> | null>(
    null,
  );
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "1";
  }, []);

  useEffect(() => {
    getNorwynAttribution();
    trackNorwynEvent({ name: "landing_view" }, eventEndpoint);

    const thresholds = [25, 50, 75, 90];
    const reached = new Set<number>();
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percent = Math.round((window.scrollY / scrollable) * 100);
      for (const threshold of thresholds) {
        if (percent >= threshold && !reached.has(threshold)) {
          reached.add(threshold);
          trackNorwynEvent({ name: "scroll_depth", params: { percent: threshold } }, eventEndpoint);
        }
      }
    };

    const ctaObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          trackNorwynEvent(
            {
              name: "cta_view",
              params: {
                cta_id: target.dataset.norwynCtaId ?? "unknown",
                section_id: target.dataset.norwynSectionId ?? "unknown",
              },
            },
            eventEndpoint,
          );
          ctaObserver.unobserve(target);
        }
      },
      { threshold: 0.45 },
    );

    const testimonialObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          trackNorwynEvent(
            {
              name: "testimonial_view",
              params: { testimonial_id: target.dataset.norwynTestimonialId ?? "unknown" },
            },
            eventEndpoint,
          );
          testimonialObserver.unobserve(target);
        }
      },
      { threshold: 0.4 },
    );

    document
      .querySelectorAll<HTMLElement>("[data-norwyn-cta-id]")
      .forEach((node) => ctaObserver.observe(node));
    document
      .querySelectorAll<HTMLElement>("[data-norwyn-testimonial-id]")
      .forEach((node) => testimonialObserver.observe(node));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("error", () =>
      trackNorwynEvent({ name: "page_error", params: { error_type: "window_error" } }, eventEndpoint),
    );

    return () => {
      window.removeEventListener("scroll", onScroll);
      ctaObserver.disconnect();
      testimonialObserver.disconnect();
    };
  }, [eventEndpoint]);

  useEffect(() => {
    if (!debugEnabled) return;

    const refresh = () => {
      setDebugState(readNorwynDebugState());
      setCheckoutUrl(buildTrackedUrl(rawCheckoutUrl, "#oferta"));
    };

    refresh();
    window.addEventListener("norwyn:event", refresh);
    return () => window.removeEventListener("norwyn:event", refresh);
  }, [rawCheckoutUrl, debugEnabled]);

  if (!debugEnabled || !debugState) return null;

  return (
    <aside className="fixed bottom-3 left-3 z-50 max-h-[70vh] w-[min(24rem,calc(100vw-1.5rem))] overflow-auto rounded-md border border-[#d8c5b7] bg-white/95 p-4 text-xs text-[#153f4a] shadow-2xl backdrop-blur">
      <p className="mb-2 font-semibold uppercase tracking-[0.16em] text-[#9d6f4e]">
        Admin debug HML
      </p>
      <dl className="space-y-1">
        <div>
          <dt className="font-semibold">session_id</dt>
          <dd className="break-all">{debugState.attribution.session_id}</dd>
        </div>
        <div>
          <dt className="font-semibold">sck</dt>
          <dd>{debugState.attribution.sck ?? "ausente"}</dd>
        </div>
        <div>
          <dt className="font-semibold">UTMs</dt>
          <dd className="break-words">
            {Object.entries(debugState.attribution)
              .filter(([key]) => key.startsWith("utm_"))
              .map(([key, value]) => `${key}=${value ?? "ausente"}`)
              .join(" | ")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">ultimo evento</dt>
          <dd>{debugState.lastEvent?.name ?? "nenhum"}</dd>
        </div>
        <div>
          <dt className="font-semibold">eventos na sessão</dt>
          <dd>{debugState.events.length}</dd>
        </div>
        <div>
          <dt className="font-semibold">checkout gerado</dt>
          <dd className="break-all">{checkoutUrl}</dd>
        </div>
      </dl>
    </aside>
  );
}