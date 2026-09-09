"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";

const preservedKeys = [
  "funnel_session_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaign_key",
  "audience_key",
  "creative_key",
  "campaign_id",
  "adset_id",
  "ad_id",
  "creative_id",
  "sck",
  "source_sck",
];

export function FunnelDestinationClient() {
  const [status, setStatus] = useState<"pending" | "sent" | "error">("pending");
  const [message, setMessage] = useState("Registrando chegada no destino seguro.");
  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const sessionId = params.get("funnel_session_id") ?? "";

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("funnel_session_id ausente no destino.");
      return;
    }

    const payload = {
      funnel_session_id: sessionId,
      event_type: "TEST_DESTINATION_VIEW",
      environment: "test",
      page_url: window.location.href,
      campaign_id: params.get("campaign_id"),
      adset_id: params.get("adset_id"),
      ad_id: params.get("ad_id"),
      creative_id: params.get("creative_id"),
      campaign_key: params.get("campaign_key"),
      audience_key: params.get("audience_key"),
      creative_key: params.get("creative_key"),
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      sck: params.get("sck"),
      source_sck: params.get("source_sck") ?? params.get("sck"),
      video_id: "test_vsl_01",
      metadata: { destination: "safe_test_page" },
    };

    fetch("/api/norwyn/funnel-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Falha ao registrar destino.");
        setStatus("sent");
        setMessage("Destino registrado como TEST_DESTINATION_VIEW.");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Erro desconhecido.");
      });
  }, [params, sessionId]);

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-4 py-6 text-[#123c3f] sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-4xl gap-5">
        <div className="rounded-md border-2 border-red-300 bg-red-50 p-4 text-red-900">
          <div className="flex items-center gap-2 font-black uppercase">
            <AlertTriangle className="h-5 w-5" />
            DESTINO DE TESTE - NAO E CHECKOUT
          </div>
          <p className="mt-2 text-sm">
            Nenhuma compra foi iniciada. Esta pagina existe apenas para validar preservacao de parametros e evento final de teste.
          </p>
        </div>

        <div className="rounded-md border border-[#e4d6c4] bg-white p-5">
          <p className="text-xs font-black uppercase text-[#9b5d49]">Norwyn Funnel Lab</p>
          <h1 className="mt-2 text-2xl font-semibold">Pagina final segura</h1>
          <p className="mt-3 flex items-center gap-2 text-sm">
            {status === "sent" ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : null}
            {message}
          </p>

          <div className="mt-5 rounded-md bg-[#f7f3ec] p-3">
            <p className="text-[10px] font-black uppercase text-[#9b5d49]">Funnel session id</p>
            <p className="mt-1 break-all font-mono text-xs">{sessionId || "ausente"}</p>
          </div>

          <div className="mt-5 grid gap-2">
            <p className="text-[10px] font-black uppercase text-[#9b5d49]">Parametros preservados</p>
            {preservedKeys.map((key) => (
              <div key={key} className="grid gap-1 rounded-md border border-[#e4d6c4] p-2 text-xs sm:grid-cols-[180px_1fr]">
                <span className="font-bold">{key}</span>
                <span className="break-all text-[#123c3f]/70">{params.get(key) ?? "ausente"}</span>
              </div>
            ))}
          </div>

          <a href="/norwyn-lab/funnel-test" className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-[#e4d6c4] px-4 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao lab
          </a>
        </div>
      </section>
    </main>
  );
}
