import { AppShell } from "@/components/layout/AppShell";
import { NorwynModulePage } from "@/modules/norwyn/components/NorwynModulePage";
import { getNorwynModuleContext } from "@/modules/norwyn/services/norwyn-module-server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function NorwynStandaloneModulePage({ searchParams }: PageProps) {
  const context = await getNorwynModuleContext("resultados");

  return (
    <AppShell activeItem="resultados" allowedItems={context.allowedModules} role={context.role}>
      <NorwynModulePage context={context} searchParams={searchParams} />
    </AppShell>
  );
}
