import { NextResponse } from "next/server";
import { createCatalogOffer, updateCatalogOffer } from "@/modules/catalogo/services/catalogo-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createCatalogOffer(body);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = await updateCatalogOffer(body);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
