import { NextResponse } from "next/server";
import { bulkUpdateCatalogOffers } from "@/modules/catalogo/services/catalogo-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await bulkUpdateCatalogOffers(body);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar pendencias.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
