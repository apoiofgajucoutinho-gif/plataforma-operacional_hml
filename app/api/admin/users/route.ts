import { NextResponse } from "next/server";
import { findAuthUserByEmail } from "@/lib/auth/registered-users";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/modules/admin/types";

const roles = new Set(["ADMIN", "SUPORTE", "MARKETING_PARTNER", "CLINICA", "USER"]);

async function requireAdmin() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) return { error: "Nao autenticado.", status: 401 as const };

  const admin = createAdminClient();
  if (!admin) return { error: "Service role nao configurada.", status: 500 as const };

  const { data: membership } = await admin
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "ADMIN") {
    return { error: "Seu perfil nao possui acesso ao modulo Admin.", status: 403 as const };
  }

  return { admin, tenantId: membership.tenant_id, currentUserId: user.id };
}

function normalizeRole(value: unknown): AdminRole {
  const role = typeof value === "string" ? value : "USER";
  return (roles.has(role) ? role : "USER") as AdminRole;
}

async function syncFinanceiroProfile(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  tenantId: string,
  userId: string,
  role: AdminRole,
) {
  const perfil = role === "ADMIN" ? "admin" : role === "SUPORTE" ? "suporte" : role === "MARKETING_PARTNER" ? "marketing" : null;

  if (!perfil) {
    await admin
      .from("fin_perfis_usuario")
      .update({ ativo: false })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);
    return;
  }

  await admin.from("fin_perfis_usuario").upsert(
    {
      tenant_id: tenantId,
      user_id: userId,
      perfil,
      centros_permitidos: [],
      ativo: true,
    },
    { onConflict: "tenant_id,user_id" },
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = normalizeRole(body.role);
  const ativo = body.ativo !== false;

  if (action === "delete") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "Usuario invalido." }, { status: 400 });
    if (userId === auth.currentUserId) {
      return NextResponse.json({ error: "Voce nao pode excluir o proprio cadastro." }, { status: 400 });
    }

    const { error } = await auth.admin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  }

  if (!email) {
    return NextResponse.json({ error: "Informe um e-mail valido." }, { status: 400 });
  }

  if (action === "create") {
    const existingUser = await findAuthUserByEmail(email);
    const userResult = existingUser
      ? { data: { user: existingUser }, error: null }
      : await auth.admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { nome },
        });

    if (userResult.error || !userResult.data.user) {
      return NextResponse.json({ error: userResult.error?.message ?? "Nao foi possivel criar o usuario." }, { status: 400 });
    }

    await auth.admin.from("profiles").upsert({ id: userResult.data.user.id, nome: nome || null });
    await auth.admin.from("tenant_members").upsert(
      {
        tenant_id: auth.tenantId,
        user_id: userResult.data.user.id,
        role,
        ativo,
      },
      { onConflict: "tenant_id,user_id" },
    );
    await syncFinanceiroProfile(auth.admin, auth.tenantId, userResult.data.user.id, role);

    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "Usuario invalido." }, { status: 400 });

    const { error: userError } = await auth.admin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (userError) return NextResponse.json({ error: userError.message }, { status: 400 });

    await auth.admin.from("profiles").upsert({ id: userId, nome: nome || null });
    await auth.admin.from("tenant_members").upsert(
      {
        tenant_id: auth.tenantId,
        user_id: userId,
        role,
        ativo,
      },
      { onConflict: "tenant_id,user_id" },
    );
    await syncFinanceiroProfile(auth.admin, auth.tenantId, userId, role);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
