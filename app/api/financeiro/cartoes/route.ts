import { NextResponse } from "next/server";
import { createFinanceiroCartao } from "@/modules/financeiro/services/financeiro-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createFinanceiroCartao(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar cartao.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
