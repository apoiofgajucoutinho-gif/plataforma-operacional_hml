import { NextResponse } from "next/server";
import { assertRelatoriosWriteAccess } from "@/modules/relatorios/services/relatorios-server";

export async function POST(request: Request) {
  const body = await request.json();
  const action = String(body.action ?? "");

  try {
    const auth = await assertRelatoriosWriteAccess();

    if (action === "cancel_prepared") {
      const { data, error } = await auth.dataClient
        .from("relatorio_envios")
        .update({
          status: "ignorado",
          erro: "Envio cancelado manualmente.",
        })
        .eq("tenant_id", auth.tenantId)
        .eq("status", "preparado")
        .select("*");

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, data: data ?? [] });
    }

    if (action === "clear_history") {
      const { error } = await auth.dataClient.from("relatorio_envios").delete().eq("tenant_id", auth.tenantId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar historico." },
      { status: 400 },
    );
  }
}
