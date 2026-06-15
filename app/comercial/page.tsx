import { AppShell } from "@/components/layout/AppShell";
import { ComercialDashboard } from "@/modules/comercial/components/ComercialDashboard";
import { getComercialContext } from "@/modules/comercial/services/comercial-server";

export const dynamic = "force-dynamic";

export default async function ComercialPage() {
  const context = await getComercialContext();

  return (
    <AppShell activeItem="comercial" allowedItems={context.allowedModules}>
      <ComercialDashboard context={context} />
    </AppShell>
  );
}
