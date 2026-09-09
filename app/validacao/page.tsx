import { AppShell } from "@/components/layout/AppShell";
import { ValidationCenter } from "@/modules/validacao/components/ValidationCenter";
import { getValidationContext } from "@/modules/validacao/services/validation-server";

export const dynamic = "force-dynamic";

export default async function ValidationPage() {
  const context = await getValidationContext("hotmart");

  return (
    <AppShell activeItem="validacao" allowedItems={context.allowedModules} role={context.role}>
      <ValidationCenter context={context} />
    </AppShell>
  );
}

