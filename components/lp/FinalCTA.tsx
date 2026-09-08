import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { TrackedCta } from "@/components/lp/TrackedCta";

type FinalCTAProps = {
  config: LandingConfig;
};

export function FinalCTA({ config }: FinalCTAProps) {
  return (
    <section id="cta-final" className="bg-[#153f4a] px-5 py-16 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
          {config.finalCta.headline}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/72">
          {config.finalCta.subheadline}
        </p>
        <div className="mt-8">
          <TrackedCta
            cta={config.finalCta.cta}
            productId={config.productId}
            className="bg-white text-[#153f4a] hover:bg-[#f4f1ea]"
          />
        </div>
      </div>
    </section>
  );
}
