import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseAny = any;

const writableRoles = new Set(["ADMIN", "SUPORTE"]);
const writableActions = new Set(["create", "update", "archive", "delete", "status"]);

const allowedFields = new Set([
  "provider",
  "category",
  "subcategory",
  "title",
  "description",
  "starts_at",
  "ends_at",
  "priority",
  "impact_score",
  "compatibility_score",
  "urgency_score",
  "confidence_score",
  "status",
  "suggested_angle",
  "suggested_action",
  "recommended_tone",
  "avoid_tone",
  "mission_tags",
  "product_tags",
  "audience_tags",
  "content_format_suggestions",
  "source_name",
  "source_url",
  "metadata",
]);

async function getAuthContext() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const admin = createAdminClient();
  const dataClient: SupabaseAny = admin ?? userClient;
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) return { error: "Nao autenticado.", status: 401 as const };

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const { data: membership } = localMembership
    ? { data: localMembership }
    : await dataClient
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", currentUser.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

  if (!membership) return { error: "Usuario sem tenant ativo.", status: 403 as const };

  if (!writableRoles.has(membership.role)) {
    const { data: permission } = await dataClient
      .from("tenant_module_permissions")
      .select("can_write")
      .eq("tenant_id", membership.tenant_id)
      .eq("role", membership.role)
      .eq("module", "norwyn")
      .maybeSingle();

    if (!permission?.can_write) return { error: "Sem permissao para alterar signals da Norwyn.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id, userId: currentUser.id };
}

function cleanPayload(payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!allowedFields.has(key)) continue;
    if (value === "") {
      cleaned[key] = null;
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

export async function POST(request: Request) {
  const body = await request.json();
  const action = String(body.action ?? "create");
  if (!writableActions.has(action)) {
    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  }

  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const payload = cleanPayload({ ...(body.payload ?? {}), tenant_id: auth.tenantId });

  if (action === "archive" || action === "delete") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    const { data, error } = await auth.dataClient
      .from("norwyn_signals")
      .update({ status: "archived" })
      .eq("tenant_id", auth.tenantId)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  if (action === "update" || action === "status") {
    const id = String(body.id ?? body.payload?.id ?? "");
    if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    delete payload.id;
    const { data, error } = await auth.dataClient
      .from("norwyn_signals")
      .update(payload)
      .eq("tenant_id", auth.tenantId)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  delete payload.id;
  const { data, error } = await auth.dataClient
    .from("norwyn_signals")
    .insert({ ...payload, tenant_id: auth.tenantId, created_by: auth.userId })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
