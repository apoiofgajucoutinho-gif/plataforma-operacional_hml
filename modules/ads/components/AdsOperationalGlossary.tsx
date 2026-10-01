"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { adsDoNotConfuse, adsGlossaryTerms, adsMethodologyRules, type AdsGlossaryCategory } from "@/modules/ads/data/operational-glossary";

const categories: Array<"Todos" | AdsGlossaryCategory> = ["Todos", "Mídia paga", "Página e pós-clique", "Atribuição", "Público", "Criativo", "Norwyn"];

export function AdsOperationalGlossary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Todos");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visible = useMemo(() => adsGlossaryTerms.filter((item) => {
    if (category !== "Todos" && item.category !== category) return false;
    if (!normalizedQuery) return true;
    return [item.name, item.acronym, item.definition, item.shortHelp, item.source, ...item.related].join(" ").toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  }), [category, normalizedQuery]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><BookOpen className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase text-brand-clay">Glossário operacional</p><h2 className="mt-1 text-2xl font-bold text-brand-teal">Entenda o número antes de decidir</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/65">Cada termo separa a fórmula comum do mercado da regra realmente usada pela Norwyn. As definições curtas já estão estruturadas para futuros tooltips.</p></div></div>
          <label className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl border border-brand-sand bg-white px-4 text-brand-teal/60"><Search className="h-4 w-4" /><span className="sr-only">Buscar termo</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-base text-brand-teal outline-none placeholder:text-brand-teal/40" placeholder="Buscar CTR, atribuição, LPV..." /></label>
          <div className="mt-4 flex flex-wrap gap-2">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={clsx("min-h-10 rounded-full border px-4 text-sm font-bold", category === item ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal")}>{item}</button>)}</div>
        </Card>
        <Card className="bg-brand-teal p-6 text-white"><p className="text-xs font-bold uppercase text-white/65">Não confunda</p><ul className="mt-3 grid gap-2 text-sm leading-5 sm:grid-cols-2">{adsDoNotConfuse.map((item) => <li key={item} className="border-b border-white/15 pb-2">{item}</li>)}</ul></Card>
      </div>

      <Card className="p-5"><p className="text-xs font-bold uppercase text-brand-clay">Regras metodológicas Norwyn</p><div className="mt-3 grid gap-2 md:grid-cols-2">{adsMethodologyRules.map((rule) => <p key={rule} className="rounded-xl bg-brand-cream px-4 py-3 text-sm font-semibold leading-5 text-brand-teal">{rule}</p>)}</div></Card>

      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-brand-teal">{visible.length} termos</h2><p className="text-sm font-semibold text-brand-teal/50">{category}</p></div>
      {visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map((item) => (
        <Card key={item.slug} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-clay">{item.category}</p><h3 className="mt-1 text-xl font-bold text-brand-teal">{item.name}</h3></div>{item.acronym ? <span className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-black text-sky-800">{item.acronym}</span> : null}</div>
          <p className="mt-3 text-base leading-7 text-brand-teal/75">{item.definition}</p>
          <dl className="mt-5 grid gap-4 text-sm leading-6 sm:grid-cols-2">
            <GlossaryField label="Exemplo prático" value={item.example} />
            <GlossaryField label="Padrão de mercado" value={item.marketRule} />
            <GlossaryField label="Na Norwyn" value={item.norwynRule} />
            <GlossaryField label="Por que usamos assim" value={item.reason} />
            <GlossaryField label="Fonte" value={item.source} />
            <GlossaryField label="Limitações e cuidados" value={item.limitations} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">{item.related.map((related) => <span key={related} className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-teal/70">{related}</span>)}</div>
        </Card>
      ))}</div> : <Card className="p-8 text-center text-sm font-semibold text-brand-teal/55">Nenhum termo encontrado.</Card>}
    </div>
  );
}

function GlossaryField({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold text-brand-clay">{label}</dt><dd className="mt-1 text-brand-teal/70">{value}</dd></div>;
}
