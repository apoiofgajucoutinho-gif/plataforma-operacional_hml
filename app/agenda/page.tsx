import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { AgendaBoard } from "@/modules/agenda/components/AgendaBoard";
import { getAgendaContext } from "@/modules/agenda/services/agenda-server";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  if (!hasPublicSupabaseEnv()) {
    return (
      <AppShell activeItem="agenda">
        <div className="mx-auto max-w-3xl">
          <Card className="p-6">
            <p className="text-sm font-semibold uppercase text-brand-clay">
              Configuracao pendente
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-teal">
              Supabase ainda nao foi conectado
            </h1>
            <p className="mt-3 text-sm leading-6 text-brand-teal/70">
              Crie o arquivo .env.local no projeto e preencha as chaves publicas do
              Supabase. Depois reinicie o servidor local.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-md bg-brand-teal p-4 text-sm text-white">
{`NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
            </pre>
          </Card>
        </div>
      </AppShell>
    );
  }

  const context = await getAgendaContext();

  return (
    <AppShell activeItem="agenda" allowedItems={context.allowedModules}>
      <AgendaBoard
        initialEvents={context.events}
        tenantName={context.tenant?.nome ?? "Sem tenant vinculado"}
        isTenantReady={Boolean(context.tenant)}
        currentUser={{
          id: context.user.id,
          email: context.user.email ?? null,
        }}
        diagnostic={context.diagnostic}
        updatedAt={context.updatedAt}
      />
    </AppShell>
  );
}
