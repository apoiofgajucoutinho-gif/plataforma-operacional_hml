import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AgendaEvent, AgendaEventInput } from "@/modules/agenda/types";

export async function getAgendaContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      user,
      tenant: null,
      events: [] as AgendaEvent[],
    };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const { data: events } = await supabase
    .from("agenda_eventos")
    .select("*")
    .eq("tenant_id", membership.tenant_id)
    .gte("inicio", new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString())
    .order("inicio", { ascending: true })
    .returns<AgendaEvent[]>();

  return {
    user,
    tenant: {
      id: membership.tenant_id,
      nome: tenant?.nome ?? "Organizacao",
    },
    events: events ?? [],
  };
}

export async function createAgendaEvent(input: AgendaEventInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuario nao autenticado.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new Error("Usuario sem tenant vinculado.");
  }

  const { data, error } = await supabase
    .from("agenda_eventos")
    .insert({
      tenant_id: membership.tenant_id,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      tipo: input.tipo,
      inicio: input.inicio,
      fim: input.fim,
      local: input.local ?? null,
      responsavel_id: user.id,
    })
    .select("*")
    .returns<AgendaEvent[]>()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
