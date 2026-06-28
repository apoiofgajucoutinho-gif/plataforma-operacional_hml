import { NextResponse } from "next/server";
import { importHotmartRows, type HotmartImportPayload } from "@/modules/comercial/services/ingest/hotmart-ingest";

function isAuthorized(request: Request) {
  const token = process.env.N8N_INGEST_TOKEN;
  if (!token) return false;

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const ingestToken = request.headers.get("x-ingest-token");

  return bearerToken === token || ingestToken === token;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, error: message }],
    },
    { status },
  );
}

export async function POST(request: Request) {
  if (!process.env.N8N_INGEST_TOKEN) {
    return errorResponse("N8N_INGEST_TOKEN nao configurado no servidor.", 503);
  }

  if (!isAuthorized(request)) {
    return errorResponse("Nao autorizado.", 401);
  }

  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return errorResponse("Body vazio. Envie { tenant_id, rows: [...] }.", 400);
    }

    const body = JSON.parse(rawBody) as HotmartImportPayload | Record<string, unknown>[];
    if (Array.isArray(body)) {
      return errorResponse("Payload invalido. Envie { tenant_id, rows: [...] }.", 400);
    }

    const payload = body;

    if (!payload || typeof payload !== "object") {
      return errorResponse("Payload invalido. Envie { tenant_id, rows: [...] }.", 400);
    }

    if (!payload.tenant_id) {
      return errorResponse("tenant_id obrigatorio para importar Hotmart.", 400);
    }

    if (!payload.rows || !Array.isArray(payload.rows)) {
      return errorResponse("Envie um array em rows no formato { tenant_id, rows: [...] }.", 400);
    }

    const result = await importHotmartRows(payload);
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Erro ao importar Hotmart.", 400);
  }
}
