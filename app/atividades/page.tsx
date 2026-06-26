import { AppShell } from "@/components/layout/AppShell";
import { AtividadesDashboard } from "@/modules/atividades/components/AtividadesDashboard";
import { getAtividadesContext } from "@/modules/atividades/services/atividades-server";

export const dynamic = "force-dynamic";

export default async function AtividadesPage() {
  const context = await getAtividadesContext();

  return (
    <AppShell activeItem="atividades" allowedItems={context.allowedModules}>
      <AtividadesDashboard context={context} />
    </AppShell>
  );
}
