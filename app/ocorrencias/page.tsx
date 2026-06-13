import { AppShell } from "@/components/layout/AppShell";
import { OcorrenciasDashboard } from "@/modules/ocorrencias/components/OcorrenciasDashboard";
import { getOcorrenciasContext } from "@/modules/ocorrencias/services/ocorrencias-server";

export default async function OcorrenciasPage() {
  const context = await getOcorrenciasContext();

  return (
    <AppShell activeItem="ocorrencias" allowedItems={context.allowedModules}>
      <OcorrenciasDashboard context={context} />
    </AppShell>
  );
}
