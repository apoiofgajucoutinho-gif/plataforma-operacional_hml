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
  n8nIngestToken: process.env.N8N_INGEST_TOKEN,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  instagramDefaultTenantName: process.env.INSTAGRAM_DEFAULT_TENANT_NAME ?? "Juliana Coutinho",
  norwynFunnelLabTenantId: process.env.NORWYN_FUNNEL_LAB_TENANT_ID,
  activeCampaignBaseUrl: process.env.ACTIVE_CAMPAIGN_BASE_URL,
  activeCampaignApiKey: process.env.ACTIVE_CAMPAIGN_API_KEY,
  activeCampaignWebhookSecret: process.env.ACTIVE_CAMPAIGN_WEBHOOK_SECRET,
  activeCampaignSendEnabled: process.env.ACTIVE_CAMPAIGN_SEND_ENABLED === "true",
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
