import { NextResponse } from "next/server";
import { canAccessMissionFeature } from "@/lib/auth/roles";
import { getNorwynContext } from "@/modules/norwyn/services/norwyn-server";
import { buildLifecycleSnapshot, mission1ValidationPackCsv, mission1ValidationPackFilename, type Mission1ValidationPack, type Mission1ValidationPackVariant } from "@/modules/norwyn/services/lifecycle";
import type { NorwynContext } from "@/modules/norwyn/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = key(item) || "EMPTY";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function validationDiagnostics(context: NorwynContext, pack: Mission1ValidationPack) {
  const people = pack.people;
  const zumbidoTransactionsFound = context.commercialSales.filter((sale) => {
    const name = String(sale.produto_nome ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const hotmartId = String(sale.hotmart_product_id ?? "");
    return hotmartId === "1266044" || ["5548267", "5555696", "8221278", "8221336"].includes(hotmartId) || name.includes("zumbido");
  }).length;

  return {
    build_version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_URL ?? "local",
    commercial_rows_loaded: context.commercialSales.length,
    commercial_unique_buyers: new Set(context.commercialSales.map((sale) => String(sale.comprador_email ?? "").trim().toLowerCase()).filter(Boolean)).size,
    zumbido_transactions_found: zumbidoTransactionsFound,
    validation_members: people.length,
    status_counts: countBy(people, (person) => person.status),
    origin_counts: countBy(people, (person) => person.originEvidenceStatus),
    confirmed_origin_count: people.filter((person) => person.originEvidenceStatus !== "ZUMBIDO_NOT_FOUND").length,
    not_found_count: people.filter((person) => person.originEvidenceStatus === "ZUMBIDO_NOT_FOUND").length,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant") === "review" ? "review" : "final";
  const debug = url.searchParams.get("debug") === "1";

  try {
    const context = await getNorwynContext();
  if (!canAccessMissionFeature(context.role)) {
    return new Response("Missões não estão disponíveis para este perfil.", { status: 403 });
  }
    const pack = buildLifecycleSnapshot(context).executionClosure.validationPack;
    const diagnostics = validationDiagnostics(context, pack);

    if (debug) {
      return NextResponse.json(diagnostics, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
    }

    const csv = mission1ValidationPackCsv(pack, variant as Mission1ValidationPackVariant);
    const baseFilename = mission1ValidationPackFilename(variant as Mission1ValidationPackVariant);
    const timestamp = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replaceAll(".", "").replace("T", "").replace("Z", "").slice(0, 14);
    const filename = baseFilename.replace(/\.csv$/, `-${timestamp}.csv`);

    console.info("mission1_validation_pack_export", diagnostics);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Norwyn-Build-Version": diagnostics.build_version,
        "X-Norwyn-Commercial-Rows": String(diagnostics.commercial_rows_loaded),
        "X-Norwyn-Not-Found": String(diagnostics.not_found_count),
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado.", tracking_id: crypto.randomUUID() },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}




