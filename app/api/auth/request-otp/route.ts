import { NextResponse } from "next/server";
import { findAuthUserByEmail, userHasActiveMembership } from "@/lib/auth/registered-users";
import { createClient } from "@/lib/supabase/server";

const deniedMessage = "Usuario sem permissao de acesso. Solicite o cadastro a um administrador.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined;

  if (!email) {
    return NextResponse.json({ error: "Informe um e-mail valido." }, { status: 400 });
  }

  const user = await findAuthUserByEmail(email);
  if (!user || !(await userHasActiveMembership(user.id))) {
    return NextResponse.json({ error: deniedMessage }, { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
