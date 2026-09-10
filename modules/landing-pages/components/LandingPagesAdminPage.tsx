"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, FlaskConical, Send, ShieldAlert } from "lucide-react";
import type { LandingAdminContext, LandingApprovalSummary } from "@/modules/landing-pages/types";

function statusLabel(status: string) {
  const labels: Record<string, string> = { DRAFT: "Em construção", DEV: "DEV", QA: "Em testes", HML: "Homologação", AWAITING_APPROVAL: "Aguardando aprovação", REJECTED: "Reprovado para ajustes", READY_FOR_PROD: "Ready for PROD" };
  return labels[status] ?? status;
}

export function LandingPagesAdminPage({ context }: { context: LandingAdminContext }) {
  const [items, setItems] = useState(context.landings);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(context.diagnostic);
  const item = items[0];
  const [headline, setHeadline] = useState("Domine a adaptação de AASI com método, segurança clínica e condução prática.");
  const [imageSrc, setImageSrc] = useState("/brand/logo-horizontal-fundo-escuro.png");
  const [themeKey, setThemeKey] = useState("juliana-default");

  async function run(action: string, payload: Record<string, unknown> = {}) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/landing-pages/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, landingKey: item?.landingKey ?? "aasi-premium-v2", ...payload }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(json.error ?? "Ação não concluída."); return; }
      setItems(Array.isArray(json.landings) ? json.landings : items);
      setMessage(json.message ?? "Atualizado.");
    });
  }

  if (context.diagnostic && !item) {
    return <main className="min-h-screen bg-[color:var(--ds-bg)] p-6"><div className="rounded-lg border border-amber-200 bg-white p-5 text-sm text-brand-teal">{context.diagnostic}</div></main>;
  }

  return (
    <main className="min-h-screen bg-[color:var(--ds-bg)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-clay">Landing System</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-teal">Landing Pages</h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-teal/70">Builder administrativo, versionamento, QA, aprovação e preparação de publicação. Produção real permanece bloqueada.</p>
          </div>
          <span className="rounded-full bg-brand-teal px-4 py-2 text-xs font-black text-white">ADMIN</span>
        </header>

        {message ? <div className="rounded-lg border border-brand-sand bg-white p-3 text-sm text-brand-teal">{message}</div> : null}
        {item ? <LandingAdminCard item={item} /> : null}

        <section className="grid gap-4 rounded-2xl border border-brand-sand bg-white p-5 shadow-sm lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-brand-teal">Configuração AASI V2</h2>
            <label className="grid gap-1 text-sm font-bold text-brand-teal">Headline
              <textarea value={headline} onChange={(event) => setHeadline(event.target.value)} className="min-h-24 rounded-lg border border-brand-sand p-3 text-sm font-medium" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-brand-teal">Imagem principal por URL/caminho
              <input value={imageSrc} onChange={(event) => setImageSrc(event.target.value)} className="h-11 rounded-lg border border-brand-sand px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-brand-teal">Tema
              <select value={themeKey} onChange={(event) => setThemeKey(event.target.value)} className="h-11 rounded-lg border border-brand-sand px-3 text-sm">
                <option value="juliana-default">Juliana Default</option>
                <option value="black-friday-demo">Black Friday Demo</option>
              </select>
            </label>
            <button type="button" disabled={pending} onClick={() => run("create_version", { headline, imageSrc, themeKey })} className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-black text-white disabled:opacity-50">Criar nova versão</button>
          </div>
          <div className="space-y-3 rounded-xl bg-brand-cream/60 p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-brand-clay">Pipeline</h3>
            <button type="button" disabled={pending} onClick={() => run("send_dev")} className="flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-bold text-brand-teal"><Send className="h-4 w-4" /> Enviar para DEV</button>
            <button type="button" disabled={pending} onClick={() => run("run_qa")} className="flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-bold text-brand-teal"><FlaskConical className="h-4 w-4" /> Executar QA</button>
            <button type="button" disabled={pending} onClick={() => run("promote_hml")} className="flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-bold text-brand-teal"><ExternalLink className="h-4 w-4" /> Promover para HML</button>
            <button type="button" disabled={pending} onClick={() => run("request_approval")} className="flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-sm font-bold text-brand-teal"><CheckCircle2 className="h-4 w-4" /> Solicitar aprovação</button>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900"><ShieldAlert className="mr-2 inline h-4 w-4" /> PROD real bloqueado nesta fase.</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function LandingAdminCard({ item }: { item: LandingApprovalSummary }) {
  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-brand-teal">{item.name}</h2>
          <p className="mt-1 text-sm text-brand-teal/70">{item.version} - {statusLabel(item.status)} - {item.environment}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-teal/75">{item.changeSummary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={item.previewPath} target="_blank" rel="noreferrer" className="rounded-lg border border-brand-sand px-3 py-2 text-sm font-bold text-brand-teal">Abrir preview</a>
          <Link href={`/landing-pages/approvals/${item.landingKey}`} className="rounded-lg bg-brand-clay px-3 py-2 text-sm font-bold text-white">Aprovação</Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-6">
        <Metric label="Testes" value={item.qa.total} />
        <Metric label="Aprovados" value={item.qa.passed} />
        <Metric label="Atenções" value={item.qa.warnings} />
        <Metric label="Bloqueios" value={item.qa.blockers} />
        <Metric label="Tracking" value={item.trackingEvents ?? 0} />
        <Metric label="Histórico" value={item.historyEvents ?? 0} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-brand-cream/60 p-4"><p className="text-xs font-bold text-brand-teal/60">{label}</p><p className="mt-1 text-2xl font-semibold text-brand-teal">{value}</p></div>;
}
