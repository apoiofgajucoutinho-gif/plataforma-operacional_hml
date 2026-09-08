"use client";

import { Play, Quote } from "lucide-react";
import type { Testimonial } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";
import { trackNorwynEvent } from "@/lib/norwyn/tracking";

type TestimonialsProps = {
  testimonials: Testimonial[];
};

export function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <SectionShell
      id="depoimentos"
      eyebrow="Prova social"
      title="Depoimentos preparados para receber evidências reais"
      intro="A estrutura suporta texto, vídeo, foto, nome e dados opcionais. Nesta HML, não fabricamos depoimentos: os cards abaixo estão marcados como placeholder."
      className="bg-[#153f4a] text-white"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {testimonials.map((testimonial) => (
          <article
            key={testimonial.id}
            data-norwyn-testimonial-id={testimonial.id}
            className="rounded-md border border-white/15 bg-white/[0.06] p-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10">
                {testimonial.type === "video" ? (
                  <Play aria-hidden className="h-5 w-5" />
                ) : (
                  <Quote aria-hidden className="h-5 w-5" />
                )}
              </div>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/70">
                {testimonial.status}
              </span>
            </div>
            {testimonial.type === "video" && (
              <button
                type="button"
                onClick={() => {
                  trackNorwynEvent({
                    name: "video_play",
                    params: { video_id: testimonial.id },
                  });
                  trackNorwynEvent({
                    name: "testimonial_interaction",
                    params: { testimonial_id: testimonial.id, action: "video_placeholder_click" },
                  });
                }}
                className="mb-6 flex aspect-video w-full items-center justify-center rounded-md border border-white/15 bg-black/20 text-sm font-semibold text-white/80"
              >
                {testimonial.videoLabel ?? "Vídeo"}
              </button>
            )}
            <p className="text-lg leading-8 text-white/88">&quot;{testimonial.quote}&quot;</p>
            <div className="mt-7 border-t border-white/12 pt-5">
              <p className="font-semibold text-white">{testimonial.name}</p>
              {testimonial.meta && <p className="mt-1 text-sm text-white/62">{testimonial.meta}</p>}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}