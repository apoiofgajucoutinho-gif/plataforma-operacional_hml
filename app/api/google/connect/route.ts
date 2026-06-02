import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isGoogleCalendarConfigured } from "@/services/google/calendar";

export async function GET(request: NextRequest) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { error: "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI." },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const dataClient = createAdminClient() ?? supabase;
  const { data: membership } = await dataClient
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(new URL("/agenda?google=no-tenant", request.url));
  }

  if (membership.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/agenda?google=admin-required", request.url));
  }

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", env.googleClientId!);
  authorizationUrl.searchParams.set("redirect_uri", env.googleRedirectUri!);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set(
    "scope",
    [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  );
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("prompt", "consent select_account");
  authorizationUrl.searchParams.set("include_granted_scopes", "true");
  authorizationUrl.searchParams.set("state", membership.tenant_id);

  const preferredEmail =
    env.googleCalendarConnectionEmail ||
    (env.googleCalendarId?.includes("@") ? env.googleCalendarId : "");
  if (preferredEmail) {
    authorizationUrl.searchParams.set("login_hint", preferredEmail);
  }

  return NextResponse.redirect(authorizationUrl);
}
