import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isGoogleCalendarConfigured } from "@/services/google/calendar";

type GoogleOAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: "Bearer";
  expires_in: number;
};

type GoogleUserInfo = {
  email: string;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tenantId = url.searchParams.get("state");

  if (!code || !tenantId || !isGoogleCalendarConfigured()) {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      redirect_uri: env.googleRedirectUri!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/agenda?google=error", request.url));
  }

  const token = (await tokenResponse.json()) as GoogleOAuthTokenResponse;

  if (!token.refresh_token) {
    return NextResponse.redirect(new URL("/agenda?google=missing-refresh", request.url));
  }

  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );
  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  const supabase = await createClient();
  await supabase.from("google_calendar_connections").upsert(
    {
      tenant_id: tenantId,
      account_email: userInfo.email,
      refresh_token: token.refresh_token,
      scopes: token.scope.split(" "),
    },
    { onConflict: "tenant_id,account_email" },
  );

  return NextResponse.redirect(new URL("/agenda?google=connected", request.url));
}
