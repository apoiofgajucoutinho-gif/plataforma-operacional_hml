import { NextResponse } from "next/server";
import {
  createFinanceiroCartao,
  updateFinanceiroCartao,
} from "@/modules/financeiro/services/financeiro-server";

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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = await updateFinanceiroCartao(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao editar cartao.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
