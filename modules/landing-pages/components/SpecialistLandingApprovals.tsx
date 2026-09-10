"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { LandingApprovalSummary } from "@/modules/landing-pages/types";

function statusLabel(status: string) {
  const labels: Record<string, string> = { HML: "Homologação", AWAITING_APPROVAL: "Aguardando sua aprovação", REJECTED: "Precisa de ajustes", READY_FOR_PROD: "Aprovado", QA: "Em testes", DEV: "Em construção", DRAFT: "Em construção" };
  return labels[status] ?? status;
}

export function SpecialistLandingApprovals({ items }: { items: LandingApprovalSummary[] }) {
  const [visibleItems, setVisibleItems] = useState(items);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = visibleItems.filter((item) => item.status !== "READY_FOR_PROD").slice(0, 3);
  if (!active.length) return null;

  async function decide(item: LandingApprovalSummary, decision: "APPROVED" | "REJECTED") {
    const notes = decision === "REJECTED" ? window.prompt("Qual ajuste precisa ser feito?") : "";
    if (decision === "REJECTED" && !notes?.trim()) return;
    startTransition(async () => {
      const response = await fetch("/api/landing-pages/approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingKey: item.landingKey, decision, notes }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(json.error ?? "Não foi possível registrar a decisão."); return; }
      if (json.item) setVisibleItems((current) => current.map((entry) => entry.landingKey === item.landingKey ? json.item : entry));
      setMessage(decision === "APPROVED" ? "Aprovação registrada." : "Reprovação registrada para ajustes.");
    });
  }

  return (
    <section className="rounded-[1.4rem] border border-brand-sand bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-clay">Em construção</p>
          <h2 className="mt-1 text-xl font-semibold text-brand-teal">Aguardando sua validação</h2>
        </div>
        <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-teal/70">{active.length} item(ns)</span>
      </div>
      {message ? <p className="mt-3 rounded-lg bg-brand-cream/70 p-2 text-sm font-bold text-brand-teal">{message}</p> : null}
      <div className="mt-4 grid gap-3">
        {active.map((item) => (
          <article key={item.versionId} className="rounded-xl border border-brand-sand/80 bg-brand-cream/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-brand-teal">{item.name}</h3>
                <p className="mt-1 text-sm text-brand-teal/65">Etapa: {statusLabel(item.status)} - Versão {item.version}</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-teal/75">{item.changeSummary}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-teal/70">{item.qa.passed} aprovados - {item.qa.warnings} atenção - {item.qa.blockers} bloqueios</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={item.previewPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-brand-teal px-3 py-2 text-xs font-black text-white"><ExternalLink className="h-4 w-4" /> Ver preview</a>
              <Link href={`/landing-pages/approvals/${item.landingKey}`} className="rounded-lg border border-brand-sand bg-white px-3 py-2 text-xs font-black text-brand-teal">Resumo dos testes</Link>
              <button type="button" disabled={pending} onClick={() => decide(item, "APPROVED")} className="inline-flex items-center gap-2 rounded-lg bg-brand-clay px-3 py-2 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Aprovar</button>
              <button type="button" disabled={pending} onClick={() => decide(item, "REJECTED")} className="inline-flex items-center gap-2 rounded-lg border border-brand-sand bg-white px-3 py-2 text-xs font-black text-brand-teal disabled:opacity-50"><XCircle className="h-4 w-4" /> Reprovar</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
