import { AppShell } from "@/components/layout/AppShell";
import { CatalogoDashboardP02 } from "@/modules/catalogo/components/CatalogoDashboardP02";
import { getCatalogContext } from "@/modules/catalogo/services/catalogo-server";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const context = await getCatalogContext();

  return (
    <AppShell activeItem="catalogo" allowedItems={context.allowedModules} role={context.role}>
      <CatalogoDashboardP02 context={context} />
    </AppShell>
  );
}

