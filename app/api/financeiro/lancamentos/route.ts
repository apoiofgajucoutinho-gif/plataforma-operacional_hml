import { NextResponse } from "next/server";
import {
  createFinanceiroLancamento,
  deleteFinanceiroLancamento,
  updateFinanceiroLancamento,
} from "@/modules/financeiro/services/financeiro-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createFinanceiroLancamento(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar lancamento.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = await updateFinanceiroLancamento(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar lancamento.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const data = await deleteFinanceiroLancamento(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao excluir lancamento.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
