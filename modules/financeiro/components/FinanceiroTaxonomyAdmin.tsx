"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  FinCategoria,
  FinCentroResultado,
  FinComportamento,
  FinNaturezaFluxo,
  FinSubcategoria,
  FinTipo,
  FinanceiroContext,
} from "@/modules/financeiro/types";

type CadastroTipo = "centro" | "categoria" | "subcategoria";
type Notice = { tone: "success" | "warning" | "error"; text: string } | null;

const tipoOptions: Array<[FinTipo, string]> = [["entrada", "Entrada"], ["saida", "Saída"]];
const naturezaOptions: Array<[FinNaturezaFluxo, string]> = [["operacional", "Operacional"], ["nao_operacional", "Não operacional"]];
const comportamentoOptions: Array<[FinComportamento, string]> = [["fixo", "Fixo"], ["variavel", "Variável"], ["nao_aplicavel", "Não aplicável"]];

export function FinanceiroTaxonomyAdmin({ context }: { context: FinanceiroContext }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [categoriaDraft, setCategoriaDraft] = useState({
    id: "",
    nome: "",
    tipo: "saida" as FinTipo,
    natureza_fluxo_padrao: "operacional" as FinNaturezaFluxo,
    comportamento_padrao: "variavel" as FinComportamento,
    ativo: true,
  });
  const [subcategoriaDraft, setSubcategoriaDraft] = useState({
    id: "",
    nome: "",
    categoria_id: context.categorias.find((item) => item.ativo)?.id ?? "",
    natureza_fluxo_padrao: "operacional" as FinNaturezaFluxo,
    comportamento_padrao: "variavel" as FinComportamento,
    ativo: true,
  });
  const [centroDraft, setCentroDraft] = useState({ id: "", nome: "", ativo: true });

  const refs = useMemo(() => {
    const category = new Map<string, number>();
    const subcategory = new Map<string, number>();
    const center = new Map<string, number>();
    for (const row of context.lancamentos) {
      category.set(row.categoria_id, (category.get(row.categoria_id) ?? 0) + 1);
      if (row.subcategoria_id) subcategory.set(row.subcategoria_id, (subcategory.get(row.subcategoria_id) ?? 0) + 1);
      center.set(row.centro_resultado_id, (center.get(row.centro_resultado_id) ?? 0) + 1);
    }
    return { category, subcategory, center };
  }, [context.lancamentos]);

  async function request(method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown>) {
    setNotice(null);
    const response = await fetch("/api/financeiro/cadastros", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar o cadastro.");
    if (method === "DELETE" && body.softDeleted) {
      setNotice({ tone: "warning", text: `Cadastro em uso por ${body.relatedCount} vínculo(s). Ele foi desativado para novos lançamentos.` });
    } else {
      setNotice({ tone: "success", text: "Cadastro atualizado." });
    }
    router.refresh();
  }

  function saveCategoria() {
    const method = categoriaDraft.id ? "PATCH" : "POST";
    startTransition(async () => {
      try {
        await request(method, { ...categoriaDraft, tipo_cadastro: "categoria" });
        setCategoriaDraft({ id: "", nome: "", tipo: "saida", natureza_fluxo_padrao: "operacional", comportamento_padrao: "variavel", ativo: true });
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha ao salvar categoria." });
      }
    });
  }

  function saveSubcategoria() {
    const method = subcategoriaDraft.id ? "PATCH" : "POST";
    startTransition(async () => {
      try {
        await request(method, { ...subcategoriaDraft, tipo_cadastro: "subcategoria" });
        setSubcategoriaDraft({ id: "", nome: "", categoria_id: context.categorias.find((item) => item.ativo)?.id ?? "", natureza_fluxo_padrao: "operacional", comportamento_padrao: "variavel", ativo: true });
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha ao salvar subcategoria." });
      }
    });
  }

  function saveCentro() {
    const method = centroDraft.id ? "PATCH" : "POST";
    startTransition(async () => {
      try {
        await request(method, { ...centroDraft, tipo_cadastro: "centro" });
        setCentroDraft({ id: "", nome: "", ativo: true });
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha ao salvar centro." });
      }
    });
  }

  function remove(tipo: CadastroTipo, id: string) {
    startTransition(async () => {
      try {
        await request("DELETE", { tipo_cadastro: tipo, id });
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "Falha ao remover cadastro." });
      }
    });
  }

  return (
    <Card className="rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-brand-teal">Administração da taxonomia</h2>
          <p className="mt-1 text-sm font-semibold text-brand-teal/60">Gerencie categorias, subcategorias e centros sem criar cadastros legados para novos lançamentos.</p>
        </div>
        {notice ? (
          <span className={clsx("rounded-full px-4 py-2 text-xs font-black", notice.tone === "success" ? "bg-emerald-50 text-emerald-700" : notice.tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-brand-clay")}>
            {notice.text}
          </span>
        ) : null}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <TaxonomyPanel title="Categorias" actionLabel={categoriaDraft.id ? "Salvar categoria" : "Criar categoria"} onSubmit={saveCategoria} disabled={isPending}>
          <AdminInput label="Nome" value={categoriaDraft.nome} onChange={(nome) => setCategoriaDraft({ ...categoriaDraft, nome })} />
          <AdminSelect label="Tipo permitido" value={categoriaDraft.tipo} onChange={(tipo) => setCategoriaDraft({ ...categoriaDraft, tipo: tipo as FinTipo })} options={tipoOptions} />
          <AdminSelect label="Natureza padrão" value={categoriaDraft.natureza_fluxo_padrao} onChange={(natureza_fluxo_padrao) => setCategoriaDraft({ ...categoriaDraft, natureza_fluxo_padrao: natureza_fluxo_padrao as FinNaturezaFluxo })} options={naturezaOptions} />
          <AdminSelect label="Comportamento padrão" value={categoriaDraft.comportamento_padrao} onChange={(comportamento_padrao) => setCategoriaDraft({ ...categoriaDraft, comportamento_padrao: comportamento_padrao as FinComportamento })} options={comportamentoOptions} />
          <ActiveToggle active={categoriaDraft.ativo} onChange={(ativo) => setCategoriaDraft({ ...categoriaDraft, ativo })} />
          <TaxonomyRows rows={context.categorias} getRefs={(row) => refs.category.get(row.id) ?? 0} getMeta={(row) => row.tipo === "entrada" ? "Entrada" : "Saída"} onEdit={(row) => setCategoriaDraft({ id: row.id, nome: row.nome, tipo: row.tipo, natureza_fluxo_padrao: row.natureza_fluxo_padrao ?? "operacional", comportamento_padrao: row.comportamento_padrao ?? "variavel", ativo: row.ativo })} onDelete={(row) => remove("categoria", row.id)} />
        </TaxonomyPanel>

        <TaxonomyPanel title="Subcategorias" actionLabel={subcategoriaDraft.id ? "Salvar subcategoria" : "Criar subcategoria"} onSubmit={saveSubcategoria} disabled={isPending}>
          <AdminInput label="Nome" value={subcategoriaDraft.nome} onChange={(nome) => setSubcategoriaDraft({ ...subcategoriaDraft, nome })} />
          <AdminSelect label="Categoria vinculada" value={subcategoriaDraft.categoria_id} onChange={(categoria_id) => setSubcategoriaDraft({ ...subcategoriaDraft, categoria_id })} options={context.categorias.filter((item) => item.ativo).map((item) => [item.id, `${item.tipo === "entrada" ? "Entrada" : "Saída"} · ${item.nome}`])} />
          <AdminSelect label="Natureza padrão" value={subcategoriaDraft.natureza_fluxo_padrao} onChange={(natureza_fluxo_padrao) => setSubcategoriaDraft({ ...subcategoriaDraft, natureza_fluxo_padrao: natureza_fluxo_padrao as FinNaturezaFluxo })} options={naturezaOptions} />
          <AdminSelect label="Comportamento padrão" value={subcategoriaDraft.comportamento_padrao} onChange={(comportamento_padrao) => setSubcategoriaDraft({ ...subcategoriaDraft, comportamento_padrao: comportamento_padrao as FinComportamento })} options={comportamentoOptions} />
          <ActiveToggle active={subcategoriaDraft.ativo} onChange={(ativo) => setSubcategoriaDraft({ ...subcategoriaDraft, ativo })} />
          <TaxonomyRows rows={context.subcategorias} getRefs={(row) => refs.subcategory.get(row.id) ?? 0} getMeta={(row) => context.categorias.find((item) => item.id === row.categoria_id)?.nome ?? "Sem categoria"} onEdit={(row) => setSubcategoriaDraft({ id: row.id, nome: row.nome, categoria_id: row.categoria_id, natureza_fluxo_padrao: row.natureza_fluxo_padrao ?? "operacional", comportamento_padrao: row.comportamento_padrao ?? "variavel", ativo: row.ativo })} onDelete={(row) => remove("subcategoria", row.id)} />
        </TaxonomyPanel>

        <TaxonomyPanel title="Centros de resultado" actionLabel={centroDraft.id ? "Salvar centro" : "Criar centro"} onSubmit={saveCentro} disabled={isPending}>
          <AdminInput label="Nome" value={centroDraft.nome} onChange={(nome) => setCentroDraft({ ...centroDraft, nome })} />
          <ActiveToggle active={centroDraft.ativo} onChange={(ativo) => setCentroDraft({ ...centroDraft, ativo })} />
          <TaxonomyRows rows={context.centros} getRefs={(row) => refs.center.get(row.id) ?? 0} getMeta={() => "Centro independente da categoria"} onEdit={(row) => setCentroDraft({ id: row.id, nome: row.nome, ativo: row.ativo })} onDelete={(row) => remove("centro", row.id)} />
        </TaxonomyPanel>
      </div>
    </Card>
  );
}

function TaxonomyPanel({ title, actionLabel, children, onSubmit, disabled }: { title: string; actionLabel: string; children: ReactNode; onSubmit: () => void; disabled: boolean }) {
  return (
    <div className="rounded-2xl border border-brand-sand/70 bg-white/55 p-4">
      <h3 className="text-lg font-black text-brand-teal">{title}</h3>
      <div className="mt-4 grid gap-3">{children}</div>
      <Button className="mt-4 w-full" disabled={disabled} onClick={onSubmit}>
        <Plus className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  );
}

function AdminInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-brand-teal/55">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-brand-sand/70 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-brand-teal outline-none focus:border-brand-teal" />
    </label>
  );
}

function AdminSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-brand-teal/55">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-brand-sand/70 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-brand-teal outline-none focus:border-brand-teal">
        {options.map(([id, labelText]) => <option key={id} value={id}>{labelText}</option>)}
      </select>
    </label>
  );
}

function ActiveToggle({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-brand-sand/70 bg-white px-3 py-2 text-sm font-black text-brand-teal">
      Cadastro ativo
      <input type="checkbox" checked={active} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand-teal" />
    </label>
  );
}

function TaxonomyRows<T extends { id: string; nome: string; ativo: boolean }>({ rows, getRefs, getMeta, onEdit, onDelete }: { rows: T[]; getRefs: (row: T) => number; getMeta: (row: T) => string; onEdit: (row: T) => void; onDelete: (row: T) => void }) {
  return (
    <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-brand-sand/60 bg-white/70">
      {rows.map((row) => {
        const refs = getRefs(row);
        return (
          <div key={row.id} className="grid grid-cols-[1fr_auto] gap-3 border-t border-brand-sand/55 p-3 first:border-t-0">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-brand-teal">{row.nome}</p>
                <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-black", row.ativo ? "bg-emerald-50 text-emerald-700" : "bg-brand-cream text-brand-teal/55")}>{row.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-brand-teal/55">{getMeta(row)} · {refs} lançamento(s)</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onEdit(row)} className="rounded-full p-2 text-brand-teal/65 hover:bg-brand-cream" title="Editar">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onDelete(row)} className="rounded-full p-2 text-brand-clay hover:bg-rose-50" title={refs > 0 ? "Desativar cadastro em uso" : "Excluir cadastro sem uso"}>
                {refs > 0 ? <CheckCircle2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}


