import { ShieldCheck } from "lucide-react";
import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";

type GuaranteeProps = {
  config: LandingConfig;
};

export function Guarantee({ config }: GuaranteeProps) {
  return (
    <SectionShell id="garantia" className="bg-white">
      <div className="rounded-md border border-[#d8c8bd] bg-[#fbf8f4] p-7 sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#e9f3f1] text-[#2d7b73]">
            <ShieldCheck aria-hidden className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d6f4e]">
              {config.guarantee.status}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#153f4a]">{config.guarantee.title}</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#536a6f]">
              {config.guarantee.description}
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
