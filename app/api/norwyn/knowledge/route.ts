import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseAny = any;

const writableRoles = new Set(["ADMIN", "SUPORTE"]);

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

    if (!permission?.can_write) return { error: "Sem permissao para registrar conhecimento Norwyn.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id };
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items.slice(0, 10) : [];
  if (!items.length) return NextResponse.json({ data: { saved: 0 } });

  let saved = 0;
  const errors: string[] = [];

  for (const item of items) {
    const sourceKey = String(item.source_key ?? "").trim();
    const title = String(item.title ?? "").trim();
    const knowledgeType = String(item.knowledge_type ?? "padrao").trim();
    if (!sourceKey || !title) continue;

    const { error } = await auth.dataClient.rpc("norwyn_upsert_knowledge", {
      target_tenant_id: auth.tenantId,
      p_source_module: String(item.source_module ?? "norwyn"),
      p_knowledge_type: knowledgeType,
      p_title: title,
      p_summary: item.summary ? String(item.summary) : null,
      p_source_key: sourceKey,
      p_product_id: item.product_id ?? null,
      p_produto_base: item.produto_base ?? null,
      p_mission_id: item.mission_id ?? null,
      p_evidence: item.evidence ?? [],
      p_metadata: item.metadata ?? {},
      p_confidence_score: Number(item.confidence_score ?? 50),
    });

    if (error) {
      errors.push(error.message);
      continue;
    }
    saved += 1;
  }

  return NextResponse.json({ data: { saved, errors } });
}
