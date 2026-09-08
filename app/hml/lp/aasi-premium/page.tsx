import type { Metadata } from "next";
import { NorwynLandingPage } from "@/components/lp/NorwynLandingPage";
import { aasiPremiumConfig } from "@/config/aasi-premium";

export const metadata: Metadata = {
  title: "Formação AASI Premium - HML",
  description:
    "AASI Recuperada v1 em homologação. Página não publicada em produção.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AasiPremiumHmlPage() {
  return <NorwynLandingPage config={aasiPremiumConfig} />;
}
