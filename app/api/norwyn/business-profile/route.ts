import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { FinancialConfig } from "@/lib/financial-config";
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

    if (!permission?.can_write) return { error: "Sem permissao para editar Business Profile.", status: 403 as const };
  }

  return { dataClient, tenantId: membership.tenant_id as string, userId: currentUser.id as string };
}

function manualStamp(userId: string) {
  return {
    source: "manual",
    manually_edited_at: new Date().toISOString(),
    manually_edited_by: userId,
  };
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value]),
  );
}

async function loadBusinessProfile(dataClient: SupabaseAny, tenantId: string) {
  const { data: profile, error: profileError } = await dataClient
    .from("business_profile")
    .select("id, tenant_id, company_name, cnpj, tax_regime, default_coproduction_percent, hotmart_percent_fee, hotmart_fixed_fee, hotmart_withdraw_fee, gateway_percent_fee, observations, starts_at, ends_at, status, source, source_key, manually_edited_at")
    .eq("tenant_id", tenantId)
    .eq("status", "current")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  const { data: taxRules, error: taxError } = await dataClient
    .from("business_tax_rules")
    .select("id, tenant_id, business_profile_id, category, cnae, tax_percent, description, starts_at, ends_at, status, observations, source, source_key, manually_edited_at")
    .eq("tenant_id", tenantId)
    .order("category", { ascending: true })
    .order("starts_at", { ascending: false });

  if (taxError) throw new Error(taxError.message);

  return { businessProfile: profile ?? null, taxRules: taxRules ?? [] };
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "upsert_profile") {
      const profile = body.profile ?? {};
      const companyName = String(profile.company_name ?? "").trim();
      if (!companyName) return NextResponse.json({ error: "Nome da empresa e obrigatorio." }, { status: 400 });

      const payload = compactPayload({
        id: profile.id || undefined,
        tenant_id: auth.tenantId,
        company_name: companyName,
        cnpj: profile.cnpj,
        tax_regime: profile.tax_regime,
        default_coproduction_percent: FinancialConfig.normalizePercent(profile.default_coproduction_percent, "partnership"),
        hotmart_percent_fee: FinancialConfig.normalizePercent(profile.hotmart_percent_fee, "fee"),
        hotmart_fixed_fee: FinancialConfig.normalizeMoney(profile.hotmart_fixed_fee),
        hotmart_withdraw_fee: FinancialConfig.normalizeMoney(profile.hotmart_withdraw_fee),
        gateway_percent_fee: FinancialConfig.normalizePercent(profile.gateway_percent_fee, "fee"),
        observations: profile.observations,
        starts_at: profile.starts_at,
        ends_at: profile.ends_at,
        status: profile.status || "current",
        source_key: profile.source_key || `manual-${auth.tenantId}`,
        ...manualStamp(auth.userId),
      });
      const { error } = await auth.dataClient.from("business_profile").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "upsert_tax_rule") {
      const rule = body.taxRule ?? {};
      const category = String(rule.category ?? "").trim();
      if (!category || !rule.business_profile_id) return NextResponse.json({ error: "Categoria e perfil financeiro sao obrigatorios." }, { status: 400 });

      const payload = compactPayload({
        id: rule.id || undefined,
        tenant_id: auth.tenantId,
        business_profile_id: rule.business_profile_id,
        category,
        cnae: rule.cnae,
        tax_percent: FinancialConfig.normalizePercent(rule.tax_percent, "tax"),
        description: rule.description,
        starts_at: rule.starts_at,
        ends_at: rule.ends_at,
        status: rule.status || "current",
        observations: rule.observations,
        source_key: rule.source_key || `manual-${category.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        ...manualStamp(auth.userId),
      });
      const { error } = await auth.dataClient.from("business_tax_rules").upsert(payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    } else if (action === "archive_tax_rule") {
      const { error } = await auth.dataClient
        .from("business_tax_rules")
        .update({ status: "archived", ends_at: body.ends_at || new Date().toISOString().slice(0, 10), ...manualStamp(auth.userId) })
        .eq("tenant_id", auth.tenantId)
        .eq("id", body.id);
      if (error) throw new Error(error.message);
    } else {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const payload = await loadBusinessProfile(auth.dataClient, auth.tenantId);
    return NextResponse.json({ ...payload, message: "Business Profile atualizado." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
}
