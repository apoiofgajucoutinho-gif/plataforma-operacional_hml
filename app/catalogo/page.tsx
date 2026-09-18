import { AppShell } from "@/components/layout/AppShell";
import { CatalogoDashboard } from "@/modules/catalogo/components/CatalogoDashboard";
import { getCatalogContext } from "@/modules/catalogo/services/catalogo-server";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const context = await getCatalogContext();

  return (
    <AppShell activeItem="catalogo" allowedItems={context.allowedModules} role={context.role}>
      <CatalogoDashboard context={context} />
    </AppShell>
  );
}
