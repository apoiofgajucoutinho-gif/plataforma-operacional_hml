import { NextResponse } from "next/server";
import { getAllowedModulesForUser, getLandingPathFromAllowedModules } from "@/lib/auth/access";
import { getLocalBypassAllowedModules, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const localUser = getLocalBypassUser();

  if (!user) {
    if (localUser) {
      return NextResponse.json({
        path: getLandingPathFromAllowedModules(getLocalBypassAllowedModules()),
      });
    }

    return NextResponse.json({ path: "/login" });
  }

  const allowedModules = await getAllowedModulesForUser(user.id);
  if (allowedModules.length === 0) {
    await supabase.auth.signOut();
    return NextResponse.json({
      path: "/login?error=unauthorized",
      error: "Usuario sem permissao de acesso.",
    });
  }

  return NextResponse.json({ path: getLandingPathFromAllowedModules(allowedModules) });
}
