import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adoptionModuleLabels } from "@/modules/adocao/services/adoption-analytics";

const actionEvents = ["create", "update", "approve", "delete", "send", "run", "search", "export"];
const timelineEvents = ["page_view", ...actionEvents, "error"];
const periodDays: Record<string, number> = { today: 1, "7d": 7, "15d": 15, "30d": 30 };
const periodLabels: Record<string, string> = { today: "Hoje", "7d": "Últimos 7 dias", "15d": "Últimos 15 dias", "30d": "Últimos 30 dias", custom: "Período personalizado" };

function localDay(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function range(searchParams: URLSearchParams) {
  const key = searchParams.get("period") ?? "today";
  if (key === "custom") {
    const fromDay = searchParams.get("from");
    const toDay = searchParams.get("to");
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromDay ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(toDay ?? "") && fromDay! <= toDay!) {
      return { key, label: periodLabels[key], from: `${fromDay}T00:00:00-03:00`, to: `${toDay}T23:59:59.999-03:00` };
    }
  }
  const safeKey = key in periodDays ? key : "today";
  const to = new Date();
  const start = new Date(`${localDay(to)}T00:00:00-03:00`);
  start.setDate(start.getDate() - periodDays[safeKey] + 1);
  return { key: safeKey, label: periodLabels[safeKey], from: start.toISOString(), to: to.toISOString() };
}

function uuid(value: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function timelineItem(row: Record<string, any>, names: Map<string, string>) {
  const module = String(row.module ?? "");
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: String(row.id), userId: row.user_id ? String(row.user_id) : null,
    userName: names.get(String(row.user_id)) ?? "Usuário não identificado", module,
    moduleLabel: adoptionModuleLabels[module] ?? module,
    pageLabel: String(metadata.label ?? metadata.page_label ?? row.page_path ?? module),
    eventName: String(row.event_name), createdAt: String(row.created_at),
    outcome: typeof metadata.outcome === "string" ? metadata.outcome : null,
    errorType: typeof metadata.error_type === "string" ? metadata.error_type : null,
    statusCode: typeof metadata.status_code === "number" ? metadata.status_code : null,
    message: typeof metadata.error_message === "string" ? metadata.error_message : null,
  };
}

export async function GET(request: Request) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  const dataClient = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const membershipResult = localMembership ? { data: localMembership } : await dataClient.from("tenant_members").select("tenant_id, role").eq("user_id", currentUser.id).eq("ativo", true).limit(1).maybeSingle();
  const membership = membershipResult.data;
  if (!membership || membership.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito ao perfil ADMIN." }, { status: 403 });

  const url = new URL(request.url);
  const selectedUser = uuid(url.searchParams.get("user"));
  const selectedModule = /^[a-z0-9-]+$/i.test(url.searchParams.get("module") ?? "") ? url.searchParams.get("module") : null;
  const kind = ["all", "access", "action"].includes(url.searchParams.get("type") ?? "") ? url.searchParams.get("type")! : "all";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(10, Number(url.searchParams.get("pageSize")) || 20));
  const selectedRange = range(url.searchParams);

  const { data: raw, error: summaryError } = await dataClient.rpc("get_adoption_report_summary", {
    p_tenant_id: membership.tenant_id, p_from: selectedRange.from, p_to: selectedRange.to,
    p_user_id: selectedUser, p_role: null,
  });
  if (summaryError) return NextResponse.json({ error: "Não foi possível carregar o resumo de atividade." }, { status: 500 });

  const people = Array.isArray(raw?.people) ? raw.people : [];
  const names = new Map<string, string>(people.map((person: any) => [String(person.userId), String(person.name ?? "Usuário")]));
  let timelineQuery = dataClient.from("adoption_events")
    .select("id,user_id,module,page_path,event_name,metadata,created_at", { count: "exact" })
    .eq("tenant_id", membership.tenant_id).gte("created_at", selectedRange.from).lte("created_at", selectedRange.to)
    .order("created_at", { ascending: false });
  if (selectedUser) timelineQuery = timelineQuery.eq("user_id", selectedUser);
  if (selectedModule) timelineQuery = timelineQuery.eq("module", selectedModule);
  timelineQuery = kind === "access" ? timelineQuery.eq("event_name", "page_view") : kind === "action" ? timelineQuery.in("event_name", actionEvents) : timelineQuery.in("event_name", timelineEvents);
  const from = (page - 1) * pageSize;

  const pageViewsQuery = () => {
    let query = dataClient.from("adoption_events").select("created_at").eq("tenant_id", membership.tenant_id).eq("event_name", "page_view").gte("created_at", selectedRange.from).lte("created_at", selectedRange.to);
    if (selectedUser) query = query.eq("user_id", selectedUser);
    return query;
  };
  const [timelineResult, firstAccessResult, lastAccessResult] = await Promise.all([
    timelineQuery.range(from, from + pageSize - 1),
    pageViewsQuery().order("created_at", { ascending: true }).limit(1).maybeSingle(),
    pageViewsQuery().order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (timelineResult.error) return NextResponse.json({ error: "Não foi possível carregar a timeline." }, { status: 500 });

  const person = selectedUser ? people.find((item: any) => item.userId === selectedUser) ?? null : null;
  const actionCount = Number(raw?.actions ?? 0);
  const recentAction = Array.isArray(raw?.recentActions) ? raw.recentActions[0] : null;
  const summary = person ? {
    userId: person.userId, name: person.name, email: person.email ?? null, role: person.role ?? null,
    firstAccess: firstAccessResult.data?.created_at ?? null, lastAccess: lastAccessResult.data?.created_at ?? null,
    sessions: Number(person.sessions ?? 0), pageViews: Number(person.pageViews ?? 0),
    modulesVisited: (raw?.modules ?? []).map((item: any) => ({ key: item.module, label: adoptionModuleLabels[item.module] ?? item.module, views: Number(item.views ?? 0) })),
    actions: actionCount,
    lastAction: recentAction ? timelineItem({ id: recentAction.id, user_id: recentAction.userId, module: recentAction.module, page_path: recentAction.pagePath, event_name: recentAction.eventName, metadata: { page_label: recentAction.pageLabel }, created_at: recentAction.createdAt }, names) : null,
    status: actionCount > 0 ? "Navegou e realizou ações" : Number(person.pageViews ?? 0) > 0 ? "Somente navegação registrada" : "Sem atividade registrada",
  } : null;
  const total = timelineResult.count ?? 0;
  return NextResponse.json({
    summary,
    items: (timelineResult.data ?? []).map((item: Record<string, any>) => timelineItem(item, names)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    period: { from: selectedRange.from, to: selectedRange.to, label: selectedRange.label },
  });
}
