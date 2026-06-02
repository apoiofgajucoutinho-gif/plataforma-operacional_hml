const googleCalendarId = process.env.GOOGLE_CALENDAR_ID;
const centralGoogleCalendarId =
  googleCalendarId && googleCalendarId !== "primary"
    ? googleCalendarId
    : "fga.jucoutinho@gmail.com";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  googleCalendarId: centralGoogleCalendarId,
  googleCalendarConnectionEmail:
    process.env.GOOGLE_CALENDAR_CONNECTION_EMAIL ??
    process.env.GOOGLE_CALENDAR_OWNER_EMAIL ??
    "",
};

export function hasPublicSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function assertPublicSupabaseEnv() {
  if (!hasPublicSupabaseEnv()) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}
