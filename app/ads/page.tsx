import { AppShell } from "@/components/layout/AppShell";
import { AdsDashboard } from "@/modules/ads/components/AdsDashboard";
import { getAdsContext } from "@/modules/ads/services/ads-server";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const context = await getAdsContext();

  return (
    <AppShell activeItem="ads" allowedItems={context.allowedModules}>
      <AdsDashboard context={context} />
    </AppShell>
  );
}
