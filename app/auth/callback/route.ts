import { NextResponse, type NextRequest } from "next/server";
import { getLandingPathForUser } from "@/lib/auth/access";
import { userHasActiveMembership } from "@/lib/auth/registered-users";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && await userHasActiveMembership(user.id)) {
      return NextResponse.redirect(new URL(await getLandingPathForUser(user.id), request.url));
    }

    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
}
