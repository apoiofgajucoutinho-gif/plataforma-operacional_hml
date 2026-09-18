import { NextResponse } from "next/server";
import { checkCatalogSalesLink } from "@/modules/catalogo/services/catalogo-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const linkId = typeof body.linkId === "string" ? body.linkId : null;
    if (!linkId) return NextResponse.json({ error: "linkId obrigatorio" }, { status: 400 });
    const data = await checkCatalogSalesLink(linkId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao verificar link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
