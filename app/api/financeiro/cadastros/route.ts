import { NextResponse } from "next/server";
import {
  createFinanceiroCadastro,
  deleteFinanceiroCadastro,
  updateFinanceiroCadastro,
} from "@/modules/financeiro/services/financeiro-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createFinanceiroCadastro(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar cadastro.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = await updateFinanceiroCadastro(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao editar cadastro.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const data = await deleteFinanceiroCadastro(body);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao excluir cadastro.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
