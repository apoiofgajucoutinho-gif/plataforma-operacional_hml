import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runPresenceAutomation } from "@/modules/presence/services/presence-automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const authorization = request.headers.get("authorization");
  const token = env.n8nIngestToken;
  return cronHeader === "1" || (Boolean(token) && authorization === `Bearer ${token}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const searchParams = new URL(request.url).searchParams;
    const response = await runPresenceAutomation({
      force: searchParams.get("force") === "1",
      discover: searchParams.get("discover") === "1",
      simulate: searchParams.get("simulate") === "1",
      limit: Number(searchParams.get("limit") ?? 120),
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha na rotina Presence" }, { status: 500 });
  }
}
