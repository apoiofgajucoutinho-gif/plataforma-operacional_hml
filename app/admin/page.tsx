import { AppShell } from "@/components/layout/AppShell";
import { AdminDashboard } from "@/modules/admin/components/AdminDashboard";
import { getAdminContext } from "@/modules/admin/services/admin-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await getAdminContext();

  return (
    <AppShell activeItem="admin" allowedItems={context.allowedModules}>
      <AdminDashboard context={context} />
    </AppShell>
  );
}
