import { NextResponse } from "next/server";
import {
  importInstagramRows,
  type InstagramImportPayload,
} from "@/modules/instagram/services/ingest/instagram-ingest";

function isAuthorized(request: Request) {
  const token = process.env.N8N_INGEST_TOKEN;

  if (!token) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const ingestToken = request.headers.get("x-ingest-token");

  return bearerToken === token || ingestToken === token;
}

export async function POST(request: Request) {
  if (!process.env.N8N_INGEST_TOKEN) {
    return NextResponse.json(
      { error: "N8N_INGEST_TOKEN nao configurado no servidor." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as InstagramImportPayload | RawInstagramRow[];
    const payload = Array.isArray(body) ? { rows: body } : body;

    if (!payload.rows || !Array.isArray(payload.rows)) {
      return NextResponse.json(
        { error: "Envie um array em rows ou um array JSON direto." },
        { status: 400 },
      );
    }

    const result = await importInstagramRows(payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao importar Instagram." },
      { status: 400 },
    );
  }
}

type RawInstagramRow = Record<string, unknown>;
