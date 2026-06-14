import { NextResponse } from "next/server";
import { assertRelatoriosWriteAccess } from "@/modules/relatorios/services/relatorios-server";

const writableEntities = new Set(["destinatario", "agendamento"]);

function tableFor(entity: string) {
  if (entity === "destinatario") return "relatorio_destinatarios";
  return "relatorio_agendamentos";
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value === "") return [key, null];
      return [key, value];
    }),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const entity = String(body.entity ?? "");
  const action = String(body.action ?? "create");

  if (!writableEntities.has(entity)) {
    return NextResponse.json({ error: "Entidade invalida." }, { status: 400 });
  }

  try {
    const auth = await assertRelatoriosWriteAccess();
    const table = tableFor(entity);

    if (action === "delete") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });

      const { error } = await auth.dataClient.from(table).delete().eq("tenant_id", auth.tenantId).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    const payload = cleanPayload({ ...(body.payload ?? {}), tenant_id: auth.tenantId });

    if (action === "update") {
      const id = String(body.id ?? payload.id ?? "");
      if (!id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
      delete payload.id;

      const { data, error } = await auth.dataClient
        .from(table)
        .update(payload)
        .eq("tenant_id", auth.tenantId)
        .eq("id", id)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    delete payload.id;
    const { data, error } = await auth.dataClient.from(table).insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar relatorio." },
      { status: 400 },
    );
  }
}
