import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { Benefits } from "@/components/lp/Benefits";
import { ExpertBio } from "@/components/lp/ExpertBio";
import { FAQ } from "@/components/lp/FAQ";
import { FinalCTA } from "@/components/lp/FinalCTA";
import { Footer } from "@/components/lp/Footer";
import { Guarantee } from "@/components/lp/Guarantee";
import { Hero } from "@/components/lp/Hero";
import { HmlBadge } from "@/components/lp/HmlBadge";
import { Method } from "@/components/lp/Method";
import { Modules } from "@/components/lp/Modules";
import { Offer } from "@/components/lp/Offer";
import { Testimonials } from "@/components/lp/Testimonials";
import { TrackingRuntime } from "@/components/lp/TrackingRuntime";
import { Transformation } from "@/components/lp/Transformation";

type NorwynLandingPageProps = {
  config: LandingConfig;
};

export function NorwynLandingPage({ config }: NorwynLandingPageProps) {
  return (
    <main className="min-h-screen bg-white text-[#153f4a]">
      <HmlBadge />
      <TrackingRuntime eventEndpoint={config.tracking.eventEndpoint} checkoutUrl={config.offer.checkoutUrl} />
      <Hero config={config} />
      <Transformation config={config} />
      <Method config={config} />
      <Modules config={config} />
      <Benefits
        id="diferenciais"
        eyebrow="Diferenciais"
        title="O que diferencia a proposta recuperada"
        intro="Os diferenciais preservam a lógica comercial identificada: foco em AASI, aplicação clínica, raciocínio profissional e acompanhamento."
        items={config.differentials}
        tone="soft"
      />
      <Testimonials testimonials={config.testimonials} />
      <Benefits
        id="beneficios"
        eyebrow="Benefícios"
        title="O que muda na prática clínica"
        intro="Cards modulares para destacar benefícios sem prender o template a esta oferta específica."
        items={config.benefits}
      />
      <Offer config={config} />
      <Guarantee config={config} />
      <ExpertBio config={config} />
      <FAQ items={config.faq} />
      <FinalCTA config={config} />
      <Footer config={config} />
    </main>
  );
}
