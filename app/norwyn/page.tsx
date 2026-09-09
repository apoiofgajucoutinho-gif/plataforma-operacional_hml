import { AppShell } from "@/components/layout/AppShell";
import { NorwynDashboard } from "@/modules/norwyn/components/NorwynDashboard";
import { getNorwynContext } from "@/modules/norwyn/services/norwyn-server";

export default async function NorwynPage() {
  const context = await getNorwynContext();

  return (
    <AppShell activeItem="norwyn" allowedItems={context.allowedModules} role={"role" in context ? context.role : null}>
      <NorwynDashboard context={context} />
    </AppShell>
  );
}


