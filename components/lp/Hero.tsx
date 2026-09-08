import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { TrackedCta } from "@/components/lp/TrackedCta";

type HeroProps = {
  config: LandingConfig;
};

export function Hero({ config }: HeroProps) {
  const { hero } = config;

  return (
    <section id="hero" className="relative overflow-hidden bg-[#fbf8f4] px-5 pb-16 pt-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-[#e5d8cf] pb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#9d6f4e]">
        <span>{hero.productName}</span>
        <span className="rounded-full border border-[#d6c5ba] bg-white/70 px-3 py-1 text-[#7b6a61]">
          HML - não publicado
        </span>
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-20">
        <div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6f4e]">
            {hero.eyebrow}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.06] text-[#153f4a] sm:text-5xl lg:text-6xl">
            {hero.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#536a6f]">{hero.subheadline}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedCta cta={hero.primaryCta} productId={config.productId} />
            <TrackedCta cta={hero.secondaryCta} productId={config.productId} />
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {hero.proofs.map((proof) => (
              <div key={proof.label} className="border-l border-[#cbb7aa] pl-4">
                <p className="text-sm font-semibold text-[#153f4a]">{proof.label}</p>
                {proof.status !== "validado" && (
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9d6f4e]">
                    {proof.status === "a_confirmar" ? "a confirmar" : "placeholder"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[28rem] overflow-hidden rounded-md border border-[#e1d3ca] bg-[#ece5df] shadow-[0_28px_80px_rgba(21,63,74,0.14)]">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#f8f1ec_0%,#dfecef_52%,#c9b2a2_100%)]" />
          <div className="absolute inset-x-8 bottom-8 rounded-md border border-white/60 bg-white/70 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d6f4e]">
              Foto profissional
            </p>
            <p className="mt-2 text-lg font-semibold text-[#153f4a]">Juliana Coutinho</p>
            <p className="mt-2 text-sm leading-6 text-[#536a6f]">
              Placeholder elegante. Substituir pelo asset original ou foto aprovada.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
