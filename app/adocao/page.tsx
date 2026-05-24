import { AppShell } from "@/components/layout/AppShell";
import { AdocaoDashboard } from "@/modules/adocao/components/AdocaoDashboard";
import { getAdocaoContext } from "@/modules/adocao/services/adocao-server";

export const dynamic = "force-dynamic";

export default async function AdocaoPage() {
  const context = await getAdocaoContext();

  return (
    <AppShell activeItem="adocao" allowedItems={context.allowedModules}>
      <AdocaoDashboard
        events={context.events}
        diagnostic={context.diagnostic}
        updatedAt={context.updatedAt}
      />
    </AppShell>
  );
}
