import { AppShell } from "@/components/layout/AppShell";
import { AdminDashboard } from "@/modules/admin/components/AdminDashboard";
import { getAdminContext } from "@/modules/admin/services/admin-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await getAdminContext();

  return (
    <AppShell activeItem="admin" allowedItems={context.allowedModules} role={"role" in context ? context.role : null}>
      <AdminDashboard context={context} />
    </AppShell>
  );
}


