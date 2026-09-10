import { AppShell } from "@/components/layout/AppShell";
import { LandingApprovalPage } from "@/modules/landing-pages/components/LandingApprovalPage";
import { getLandingApprovalContext } from "@/modules/landing-pages/services/landing-pages-server";

export const dynamic = "force-dynamic";

export default async function LandingApprovalRoute({ params }: { params: Promise<{ landingKey: string }> }) {
  const { landingKey } = await params;
  const context = await getLandingApprovalContext(landingKey);
  return (
    <AppShell activeItem="norwyn" allowedItems={context.allowedModules} role={context.role}>
      <LandingApprovalPage item={context.item} diagnostic={context.diagnostic} />
    </AppShell>
  );
}
