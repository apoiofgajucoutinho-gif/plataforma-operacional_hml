import { AppShell } from "@/components/layout/AppShell";
import { InstagramDashboard } from "@/modules/instagram/components/InstagramDashboard";
import { getInstagramContext } from "@/modules/instagram/services/instagram-server";

export const dynamic = "force-dynamic";

export default async function InstagramPage() {
  const context = await getInstagramContext();

  return (
    <AppShell activeItem="instagram" allowedItems={context.allowedModules}>
      <InstagramDashboard context={context} />
    </AppShell>
  );
}
