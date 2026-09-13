import { AppShell } from "@/components/layout/AppShell";
import { getAdsContext } from "@/modules/ads/services/ads-server";
import { getInstagramContext } from "@/modules/instagram/services/instagram-server";
import { NorwynModulePage } from "@/modules/norwyn/components/NorwynModulePage";
import { getNorwynModuleContext } from "@/modules/norwyn/services/norwyn-module-server";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function firstParam(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function NorwynStandaloneModulePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const view = firstParam(resolvedSearchParams, "view") ?? "overview";
  const [context, adsContext, instagramContext] = await Promise.all([
    getNorwynModuleContext("marketing"),
    view === "ads" ? getAdsContext(resolvedSearchParams) : Promise.resolve(null),
    view === "instagram" ? getInstagramContext() : Promise.resolve(null),
  ]);

  return (
    <AppShell activeItem="marketing" allowedItems={context.allowedModules} role={context.role}>
      <NorwynModulePage context={context} searchParams={resolvedSearchParams} adsContext={adsContext} instagramContext={instagramContext} />
    </AppShell>
  );
}


