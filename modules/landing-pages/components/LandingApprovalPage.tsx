"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { LandingApprovalSummary } from "@/modules/landing-pages/types";

function statusLabel(status: string) {
  const labels: Record<string, string> = { DRAFT: "Em construção", DEV: "DEV", QA: "Em testes", HML: "Homologação", AWAITING_APPROVAL: "Aguardando aprovação", REJECTED: "Precisa de ajustes", READY_FOR_PROD: "Aprovado e pronto para produção futura" };
  return labels[status] ?? status;
}

export function LandingApprovalPage({ item, diagnostic }: { item: LandingApprovalSummary | null; diagnostic?: string | null }) {
  const [current, setCurrent] = useState(item);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(diagnostic ?? null);
  const [pending, startTransition] = useTransition();

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!current) return;
    if (decision === "REJECTED" && !notes.trim()) {
      setMessage("Informe o ajuste necessário antes de reprovar.");
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/landing-pages/approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingKey: current.landingKey, decision, notes }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(json.error ?? "Não foi possível registrar a decisão."); return; }
      setCurrent(json.item ?? current);
      setMessage(decision === "APPROVED" ? "Versão aprovada. Produção real continua bloqueada." : "Reprovação registrada e devolvida para ajustes.");
    });
  }

  if (!current) return <main className="min-h-screen bg-[color:var(--ds-bg)] p-6"><div className="rounded-lg border border-brand-sand bg-white p-5 text-sm text-brand-teal">{message ?? "Nenhuma aprovação encontrada."}</div></main>;

  return (
    <main className="min-h-screen bg-[color:var(--ds-bg)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-brand-sand bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-clay">Validação da Especialista</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-teal">{current.name}</h1>
          <p className="mt-2 text-sm text-brand-teal/70">Tipo: Landing Page - Versão {current.version} - Ambiente {current.environment}</p>
          <p className="mt-4 rounded-lg bg-brand-cream/70 p-3 text-sm font-bold text-brand-teal">Etapa atual: {statusLabel(current.status)}</p>
        </header>

        {message ? <div className="rounded-lg border border-brand-sand bg-white p-3 text-sm text-brand-teal">{message}</div> : null}

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-2xl border border-brand-sand bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-teal">O que está sendo alterado</h2>
            <p className="mt-3 text-sm leading-6 text-brand-teal/75">{current.changeSummary}</p>
            <a href={current.previewPath} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-black text-white"><ExternalLink className="h-4 w-4" /> Abrir preview</a>
          </article>
          <article className="rounded-2xl border border-brand-sand bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-teal">Resumo dos testes</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <Metric label="Aprovados" value={current.qa.passed} />
              <Metric label="Atenções" value={current.qa.warnings} />
              <Metric label="Bloqueios" value={current.qa.blockers} />
            </div>
            <ul className="mt-4 space-y-2 text-sm text-brand-teal/75">
              {current.qa.friendly.map((item) => <li key={item} className="rounded-lg bg-brand-cream/60 px-3 py-2">{item}</li>)}
            </ul>
          </article>
        </section>

        <section className="rounded-2xl border border-brand-sand bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-teal">Decisão</h2>
          <label className="mt-3 grid gap-1 text-sm font-bold text-brand-teal">Comentário para ajustes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 rounded-lg border border-brand-sand p-3 text-sm font-medium" placeholder="Ex.: Trocar a imagem principal e revisar o texto da garantia." />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={pending || current.status === "READY_FOR_PROD"} onClick={() => decide("APPROVED")} className="inline-flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Aprovar versão</button>
            <button type="button" disabled={pending} onClick={() => decide("REJECTED")} className="inline-flex items-center gap-2 rounded-lg border border-brand-sand px-4 py-2 text-sm font-black text-brand-teal disabled:opacity-50"><XCircle className="h-4 w-4" /> Reprovar e solicitar ajustes</button>
            <Link href="/norwyn" className="rounded-lg px-4 py-2 text-sm font-bold text-brand-teal/70">Voltar para Home</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-brand-cream/60 p-3"><p className="text-xl font-semibold text-brand-teal">{value}</p><p className="text-xs font-bold text-brand-teal/60">{label}</p></div>;
}
