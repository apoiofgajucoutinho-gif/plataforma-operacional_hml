"use client";

import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";
import { trackNorwynEvent } from "@/lib/norwyn/tracking";

type FAQProps = {
  items: FaqItem[];
};

export function FAQ({ items }: FAQProps) {
  return (
    <SectionShell
      id="faq"
      eyebrow="FAQ"
      title="Perguntas frequentes"
      intro="Respostas iniciais parametrizadas para homologação. Os pontos comerciais permanecem marcados como a confirmar."
      className="bg-white"
    >
      <div className="divide-y divide-[#e5d8cf] rounded-md border border-[#e5d8cf] bg-[#fbf8f4]">
        {items.map((item) => (
          <details
            key={item.id}
            className="group p-5"
            onToggle={(event) => {
              if (event.currentTarget.open) {
                trackNorwynEvent({
                  name: "faq_open",
                  params: { faq_id: item.id },
                });
              }
            }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[#153f4a]">
              {item.question}
              <ChevronDown
                aria-hidden
                className="h-5 w-5 shrink-0 text-[#9d6f4e] transition group-open:rotate-180"
              />
            </summary>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#536a6f]">{item.answer}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}