import { NextResponse } from "next/server";
import { assertRelatoriosWriteAccess, listRelatorioEnvios } from "@/modules/relatorios/services/relatorios-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const result = await listRelatorioEnvios({
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 25),
      status: url.searchParams.get("status") ?? undefined,
      origin: url.searchParams.get("origin") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao carregar historico." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const action = String(body.action ?? "");

  try {
    const auth = await assertRelatoriosWriteAccess();

    if (action === "cancel_prepared") {
      const { data, error } = await auth.dataClient
        .from("relatorio_envios")
        .update({ status: "ignorado", erro: "Envio cancelado manualmente." })
        .eq("tenant_id", auth.tenantId)
        .eq("status", "preparado")
        .select("*");

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, data: data ?? [] });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao atualizar historico." }, { status: 400 });
  }
}
