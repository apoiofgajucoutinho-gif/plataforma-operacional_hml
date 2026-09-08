import { NextResponse } from "next/server";

const allowedEvents = new Set([
  "landing_view",
  "cta_view",
  "cta_click",
  "scroll_depth",
  "video_play",
  "video_progress",
  "testimonial_view",
  "testimonial_interaction",
  "faq_open",
  "form_start",
  "form_submit",
  "checkout_click",
  "page_error",
]);

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const eventName = "name" in payload ? payload.name : null;
  const environment = "environment" in payload ? payload.environment : null;

  if (typeof eventName !== "string" || !allowedEvents.has(eventName)) {
    return NextResponse.json({ ok: false, error: "evento_invalido" }, { status: 400 });
  }

  if (environment !== "hml") {
    return NextResponse.json({ ok: false, error: "ambiente_invalido" }, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      stored: false,
      note: "Evento validado em HML. Persistencia definitiva a conectar ao pipeline Norwyn.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
