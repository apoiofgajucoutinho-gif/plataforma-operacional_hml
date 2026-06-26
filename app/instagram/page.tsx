import { AppShell } from "@/components/layout/AppShell";
import { InstagramDashboard } from "@/modules/instagram/components/InstagramDashboard";
import { getInstagramAccessContext, getInstagramContext } from "@/modules/instagram/services/instagram-server";

export const dynamic = "force-dynamic";

export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const requestedEditorial = params.tab === "editorial-intelligence";

  if (requestedEditorial) {
    const access = await getInstagramAccessContext();
    const authorized = access.role === "ADMIN" || access.role === "SUPORTE";

    if (!authorized) {
      return (
        <AppShell activeItem="instagram" allowedItems={access.allowedModules}>
          <div className="rounded-lg border border-white/80 bg-white/[0.85] p-6 shadow-soft">
            <h1 className="text-xl font-semibold text-brand-teal">Acesso restrito</h1>
            <p className="mt-2 text-sm text-brand-teal/70">
              Esta funcionalidade está disponível apenas para perfis autorizados durante a fase Beta.
            </p>
          </div>
        </AppShell>
      );
    }
  }

  const context = await getInstagramContext();
  const editorialAuthorized = context.role === "ADMIN" || context.role === "SUPORTE";

  return (
    <AppShell activeItem="instagram" allowedItems={context.allowedModules}>
      <InstagramDashboard
        context={context}
        initialTab={requestedEditorial ? "editorial" : "insights"}
        editorialAuthorized={editorialAuthorized}
        editorialAccessDenied={requestedEditorial && !editorialAuthorized}
      />
    </AppShell>
  );
}
