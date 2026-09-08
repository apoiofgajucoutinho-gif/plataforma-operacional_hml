"use client";

import type { MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import type { LandingCta } from "@/lib/norwyn/landing-types";
import { buildTrackedUrl, trackNorwynEvent } from "@/lib/norwyn/tracking";

type TrackedCtaProps = {
  cta: LandingCta;
  productId: string;
  checkoutUrl?: string | null;
  className?: string;
};

export function TrackedCta({ cta, productId, checkoutUrl, className }: TrackedCtaProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const destinationUrl = cta.isCheckout ? buildTrackedUrl(checkoutUrl ?? null, "#oferta") : cta.href;

    trackNorwynEvent({
      name: "cta_click",
      params: {
        cta_id: cta.id,
        section_id: cta.sectionId,
        destination_url: destinationUrl,
      },
    });

    if (cta.isCheckout) {
      trackNorwynEvent({
        name: "checkout_click",
        params: {
          cta_id: cta.id,
          product_id: productId,
          destination_url: destinationUrl,
        },
      });

      if (!checkoutUrl) {
        event.preventDefault();
        document.getElementById("oferta")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
  }

  return (
    <a
      href={cta.isCheckout ? checkoutUrl ?? "#oferta" : cta.href}
      data-norwyn-cta-id={cta.id}
      data-norwyn-section-id={cta.sectionId}
      onClick={handleClick}
      className={clsx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#6aa9b8] focus:ring-offset-2",
        cta.variant === "secondary"
          ? "border border-[#d9c9bf] bg-white/75 text-[#153f4a] hover:bg-white"
          : "bg-[#153f4a] text-white shadow-[0_16px_34px_rgba(21,63,74,0.18)] hover:bg-[#0f323b]",
        className,
      )}
    >
      {cta.label}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </a>
  );
}