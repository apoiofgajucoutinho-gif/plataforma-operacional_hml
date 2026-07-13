import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  pullAllGoogleCalendarConnectionsToAgenda,
  pullGoogleCalendarEventsToAgenda,
} from "@/modules/agenda/services/agenda-server";

function isAuthorizedAutomatedSync(request: Request) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();

  return Boolean(cronHeader || (env.n8nIngestToken && token === env.n8nIngestToken));
}

export async function GET(request: Request) {
  if (!isAuthorizedAutomatedSync(request)) {
    return NextResponse.json({ error: "Sincronizacao automatica nao autorizada." }, { status: 401 });
  }

  const result = await pullAllGoogleCalendarConnectionsToAgenda();

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function POST() {
  try {
    const supabase = await createClient();
    const dataClient = createAdminClient() ?? supabase;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUser = user ?? getLocalBypassUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const localMembership = user ? null : await getLocalBypassMembership(dataClient);
    const { data: membership, error: membershipError } = localMembership
      ? { data: localMembership, error: null }
      : await dataClient
          .from("tenant_members")
          .select("tenant_id, role")
          .eq("user_id", currentUser.id)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();

    if (membershipError || !membership) {
      throw membershipError ?? new Error("Usuario sem tenant vinculado.");
    }

    const allowedModules =
      membership.role === "ADMIN"
        ? [{ module: "agenda", can_write: true }]
        : (
            await dataClient
              .from("tenant_module_permissions")
              .select("module, can_write")
              .eq("tenant_id", membership.tenant_id)
              .eq("role", membership.role)
              .eq("module", "agenda")
              .limit(1)
          ).data ?? [];

    if (!allowedModules.some((item: { module: string; can_write: boolean }) => item.module === "agenda" && item.can_write)) {
      return NextResponse.json({ error: "Seu perfil nao possui permissao de escrita na Agenda." }, { status: 403 });
    }

    const result = await pullGoogleCalendarEventsToAgenda({
      tenantId: membership.tenant_id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao importar eventos do Google." },
      { status: 400 },
    );
  }
}
