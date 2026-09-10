import { AppShell } from "@/components/layout/AppShell";
import { LandingPagesAdminPage } from "@/modules/landing-pages/components/LandingPagesAdminPage";
import { getLandingAdminContext } from "@/modules/landing-pages/services/landing-pages-server";

export const dynamic = "force-dynamic";

export default async function LandingPagesPage() {
  const context = await getLandingAdminContext();
  return (
    <AppShell activeItem="landing-pages" allowedItems={context.allowedModules} role={context.role}>
      <LandingPagesAdminPage context={context} />
    </AppShell>
  );
}
