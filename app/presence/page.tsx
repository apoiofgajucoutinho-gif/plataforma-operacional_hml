import { AppShell } from "@/components/layout/AppShell";
import { PresenceCenterPage } from "@/modules/presence/components/PresenceCenterPage";
import { getPresenceContext } from "@/modules/presence/services/presence-server";

export const dynamic = "force-dynamic";

export default async function PresencePage() {
  const context = await getPresenceContext();
  return (
    <AppShell activeItem="presence" allowedItems={context.allowedModules} role={context.role}>
      <PresenceCenterPage context={context} />
    </AppShell>
  );
}