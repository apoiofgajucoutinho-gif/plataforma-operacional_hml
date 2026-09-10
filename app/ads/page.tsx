import { AppShell } from "@/components/layout/AppShell";
import { AdsDashboard } from "@/modules/ads/components/AdsDashboard";
import { getAdsContext } from "@/modules/ads/services/ads-server";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function AdsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const context = await getAdsContext(resolvedSearchParams);

  return (
    <AppShell activeItem="ads" allowedItems={context.allowedModules} role={context.role}>
      <AdsDashboard context={context} basePath="/ads" searchParams={resolvedSearchParams} />
    </AppShell>
  );
}