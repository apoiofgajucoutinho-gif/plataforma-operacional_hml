import { NextResponse } from "next/server";
import { processHotmartCsvUpload } from "@/modules/validacao/services/validation-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    if (!files.length) return NextResponse.json({ error: "Selecione pelo menos um CSV oficial da Hotmart." }, { status: 400 });
    const payload = [];
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        return NextResponse.json({ error: `O arquivo ${file.name} precisa ser CSV nesta versão da Central.` }, { status: 400 });
      }
      payload.push({ name: file.name, text: await file.text() });
    }
    const result = await processHotmartCsvUpload(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível processar o upload." }, { status: 400 });
  }
}
