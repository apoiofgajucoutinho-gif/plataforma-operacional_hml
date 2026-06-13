import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseAny = any;

const writableEntities = new Set(["chamado", "cadastro", "plano"]);

async function getAuthContext() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Nao autenticado.", status: 401 as const };

  const admin = createAdminClient();
  const dataClient: SupabaseAny = admin ?? userClient;
  const { data: membership } = await dataClient
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!membership) return { error: "Usuario sem tenant ativo.", status: 403 as const };

  if (membership.role !== "ADMIN") {
    const { data: permission } = await dataClient
      .from("tenant_module_permissions")
      .select("can_write")
      .eq("tenant_id", membership.tenant_id)
      .eq("role", membership.role)
      .eq("module", "ocorrencias")
      .maybeSingle();

    if (!permission?.can_write) return { error: "Sem permissao para alterar ocorrencias.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id, userId: user.id };
}

function tableFor(entity: string) {
  if (entity === "chamado") return "ocorrencias_chamados";
  if (entity === "cadastro") return "ocorrencias_cadastros";
  return "ocorrencias_planos_acao";
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value === "") return [key, null];
      return [key, value];
    }),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const entity = String(body.entity ?? "");
  const action = String(body.action ?? "create");

  if (!writableEntities.has(entity)) {
    return NextResponse.json({ error: "Entidade invalida." }, { status: 400 });
  }

  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const table = tableFor(entity);
  const payload = cleanPayload({ ...(body.payload ?? {}), tenant_id: auth.tenantId });

  if (entity === "chamado" && action === "create") {
    payload.created_by = auth.userId;
  }

  if (action === "delete") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    const { error } = await auth.dataClient.from(table).delete().eq("tenant_id", auth.tenantId).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    const id = String(body.id ?? payload.id ?? "");
    if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    delete payload.id;
    const { data, error } = await auth.dataClient.from(table).update(payload).eq("tenant_id", auth.tenantId).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  delete payload.id;
  const { data, error } = await auth.dataClient.from(table).insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
