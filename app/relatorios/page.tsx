import { AppShell } from "@/components/layout/AppShell";
import { RelatoriosDashboard } from "@/modules/relatorios/components/RelatoriosDashboard";
import { getRelatoriosContext } from "@/modules/relatorios/services/relatorios-server";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const context = await getRelatoriosContext();

  return (
    <AppShell activeItem="relatorios" allowedItems={context.allowedModules}>
      <RelatoriosDashboard context={context} />
    </AppShell>
  );
}
