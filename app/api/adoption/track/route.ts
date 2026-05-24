import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));
  const module = typeof body.module === "string" ? body.module : "unknown";
  const pagePath = typeof body.pagePath === "string" ? body.pagePath : "/";
  const pageLabel = typeof body.pageLabel === "string" ? body.pageLabel : pagePath;
  const admin = createAdminClient();
  const dataClient = admin ?? userClient;

  const { data: membership } = await dataClient
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: true });
  }

  await dataClient.from("adoption_events").insert({
    tenant_id: membership.tenant_id,
    user_id: user.id,
    module,
    page_path: pagePath,
    event_name: "page_view",
    metadata: {
      page_label: pageLabel,
      user_email: user.email,
      user_agent: request.headers.get("user-agent"),
    },
  });

  return NextResponse.json({ ok: true });
}
