import { NextResponse } from "next/server";
import {
  createFinanceiroBanco,
  updateFinanceiroBanco,
} from "@/modules/financeiro/services/financeiro-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createFinanceiroBanco(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar banco.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = await updateFinanceiroBanco(body);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao editar banco.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
