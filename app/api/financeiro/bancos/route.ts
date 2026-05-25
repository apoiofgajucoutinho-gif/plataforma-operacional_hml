import { NextResponse } from "next/server";
import { createFinanceiroBanco } from "@/modules/financeiro/services/financeiro-server";

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
