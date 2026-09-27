import { AppShell } from "@/components/layout/AppShell";
import { LandingPagesAdminPage } from "@/modules/landing-pages/components/LandingPagesAdminPage";
import { getLandingDashboardContext } from "@/modules/landing-pages/services/landing-pages-dashboard";

export const dynamic = "force-dynamic";

export default async function LandingPagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getLandingDashboardContext(await searchParams);
  return (
    <AppShell activeItem="landing-pages" allowedItems={context.allowedModules} role={context.role}>
      <LandingPagesAdminPage context={context} />
    </AppShell>
  );
}
