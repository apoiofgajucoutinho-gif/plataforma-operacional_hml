import { AppShell } from "@/components/layout/AppShell";
import { NorwynModulePage } from "@/modules/norwyn/components/NorwynModulePage";
import { getNorwynModuleContext } from "@/modules/norwyn/services/norwyn-module-server";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NorwynStandaloneModulePage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await getNorwynModuleContext("produtos-alunos", resolvedSearchParams);
  const view = firstParam(resolvedSearchParams.view);
  const activeItem = view === "students" ? "alunos" : view === "products" ? "produtos" : "produtos-alunos";

  return (
    <AppShell activeItem={activeItem} allowedItems={context.allowedModules} role={context.role}>
      <NorwynModulePage context={context} searchParams={resolvedSearchParams} />
    </AppShell>
  );
}
