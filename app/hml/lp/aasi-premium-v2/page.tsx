import type { Metadata } from "next";
import { LandingPageRenderer } from "@/modules/landing-pages/renderer/LandingPageRenderer";
import { getPublicLandingPage } from "@/modules/landing-pages/services/landing-pages-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Formação AASI Premium V2 - HML",
  description: "Landing AASI V2 em homologação. Página não publicada em produção.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function AasiPremiumV2Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const rawVersion = params.version;
  const version = Array.isArray(rawVersion) ? rawVersion[0] : rawVersion;
  const landing = await getPublicLandingPage("aasi-premium-v2", version);
  if (!landing) return null;
  return <LandingPageRenderer landing={landing} />;
}
