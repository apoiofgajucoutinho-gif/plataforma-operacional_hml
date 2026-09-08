import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export type ValidationStatus = "validado" | "a_confirmar" | "placeholder";

export type AttributionKey =
  | "sck"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term";

export type LandingCta = {
  id: string;
  label: string;
  href: string;
  sectionId: string;
  variant?: "primary" | "secondary";
  isCheckout?: boolean;
};

export type HeroProof = {
  label: string;
  status?: ValidationStatus;
};

export type MethodPhase = {
  id: string;
  order: number;
  name: string;
  eyebrow: string;
  description: string;
};

export type LandingModule = {
  id: string;
  title: string;
  description: string;
  status?: ValidationStatus;
  items?: string[];
};

export type Benefit = {
  id: string;
  title: string;
  description: string;
  icon?: ComponentType<LucideProps>;
};

export type Testimonial = {
  id: string;
  type: "text" | "video";
  quote: string;
  name: string;
  meta?: string;
  status: ValidationStatus;
  videoLabel?: string;
};

export type OfferConfig = {
  title: string;
  statusLabel: string;
  price: string;
  installment: string;
  checkoutUrl: string | null;
  access: string;
  support: string;
  bonus: string[];
  cta: LandingCta;
};

export type GuaranteeConfig = {
  title: string;
  description: string;
  status: ValidationStatus;
};

export type ExpertConfig = {
  name: string;
  title: string;
  bio: string;
  authority: string[];
  imageStatus: ValidationStatus;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  status?: ValidationStatus;
};

export type LandingConfig = {
  slug: string;
  productId: string;
  environment: "hml" | "production";
  hero: {
    productName: string;
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCta: LandingCta;
    secondaryCta: LandingCta;
    proofs: HeroProof[];
    imageStatus: ValidationStatus;
  };
  transformation: {
    beforeTitle: string;
    afterTitle: string;
    beforeItems: string[];
    afterItems: string[];
    closing: string;
  };
  method: {
    headline: string;
    intro: string;
    phases: MethodPhase[];
  };
  modules: {
    headline: string;
    intro: string;
    items: LandingModule[];
  };
  differentials: Benefit[];
  benefits: Benefit[];
  testimonials: Testimonial[];
  offer: OfferConfig;
  guarantee: GuaranteeConfig;
  expert: ExpertConfig;
  faq: FaqItem[];
  finalCta: {
    headline: string;
    subheadline: string;
    cta: LandingCta;
  };
  footer: {
    legalName: string;
    supportEmail: string;
    termsUrl: string;
    privacyUrl: string;
    legalNote: string;
  };
  tracking: {
    eventEndpoint: string;
    attributionKeys: AttributionKey[];
  };
};
