import { CheckCircle2 } from "lucide-react";
import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";
import { TrackedCta } from "@/components/lp/TrackedCta";

type OfferProps = {
  config: LandingConfig;
};

export function Offer({ config }: OfferProps) {
  const { offer } = config;

  return (
    <SectionShell
      id="oferta"
      eyebrow="Oferta"
      title={offer.title}
      intro="Este bloco nasce parametrizado para preço, parcelamento, bônus, acesso, suporte, garantia e checkout. A HML não assume dados comerciais ainda não validados."
      className="bg-[#f7f2ed]"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <div className="rounded-md border border-[#d8c8bd] bg-white p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d6f4e]">
            {offer.statusLabel}
          </p>
          <p className="mt-6 text-4xl font-semibold text-[#153f4a]">{offer.price}</p>
          <p className="mt-3 text-base text-[#536a6f]">{offer.installment}</p>
          <div className="mt-8">
            <TrackedCta
              cta={offer.cta}
              productId={config.productId}
              checkoutUrl={offer.checkoutUrl}
              className="w-full"
            />
          </div>
          {!offer.checkoutUrl && (
            <p className="mt-4 text-xs leading-5 text-[#9d6f4e]">
              Checkout oficial ainda não configurado. O clique permanece na seção de oferta em HML.
            </p>
          )}
        </div>
        <div className="rounded-md border border-[#d8c8bd] bg-white p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[#153f4a]">Acesso</p>
              <p className="mt-2 text-sm leading-6 text-[#536a6f]">{offer.access}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#153f4a]">Suporte</p>
              <p className="mt-2 text-sm leading-6 text-[#536a6f]">{offer.support}</p>
            </div>
          </div>
          <ul className="mt-7 space-y-3">
            {offer.bonus.map((bonus) => (
              <li key={bonus} className="flex gap-3 text-sm leading-6 text-[#536a6f]">
                <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#2d7b73]" />
                {bonus}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
