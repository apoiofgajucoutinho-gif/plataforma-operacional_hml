import { AppShell } from "@/components/layout/AppShell";
import { FinanceiroDashboard } from "@/modules/financeiro/components/FinanceiroDashboard";
import { getFinanceiroContext } from "@/modules/financeiro/services/financeiro-server";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const context = await getFinanceiroContext();

  return (
    <AppShell activeItem="financeiro" allowedItems={context.allowedModules}>
      <FinanceiroDashboard context={context} />
    </AppShell>
  );
}
