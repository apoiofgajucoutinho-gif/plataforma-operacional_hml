import { AppShell } from "@/components/layout/AppShell";
import { AgendaBoard } from "@/modules/agenda/components/AgendaBoard";
import { getAgendaContext } from "@/modules/agenda/services/agenda-server";

export default async function AgendaPage() {
  const context = await getAgendaContext();

  return (
    <AppShell>
      <AgendaBoard
        initialEvents={context.events}
        tenantName={context.tenant?.nome ?? "Sem tenant vinculado"}
        isTenantReady={Boolean(context.tenant)}
      />
    </AppShell>
  );
}
