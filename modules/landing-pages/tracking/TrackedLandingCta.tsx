"use client";

import type { LandingBlock, LandingDefinition } from "@/modules/landing-pages/types";
import { postLandingEvent } from "@/modules/landing-pages/tracking/client";

export function TrackedLandingCta({ landing, block, cta }: { landing: LandingDefinition; block: LandingBlock; cta: { id: string; label: string; href: string } }) {
  return (
    <a
      href={cta.href}
      onClick={() => {
        void postLandingEvent(landing, { name: "cta_click", block, ctaId: cta.id });
      }}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--lp-cta)] px-5 text-sm font-black text-[color:var(--lp-cta-text)] shadow-[0_14px_35px_rgba(184,117,42,0.25)] hover:brightness-105"
    >
      {cta.label}
    </a>
  );
}
