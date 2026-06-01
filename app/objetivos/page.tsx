import { AppShell } from "@/components/layout/AppShell";
import { ObjetivosDashboard } from "@/modules/objetivos/components/ObjetivosDashboard";
import { getObjetivosContext } from "@/modules/objetivos/services/objetivos-server";

export default async function ObjetivosPage() {
  const context = await getObjetivosContext();

  return (
    <AppShell activeItem="objetivos" allowedItems={context.allowedModules}>
      <ObjetivosDashboard context={context} />
    </AppShell>
  );
}
