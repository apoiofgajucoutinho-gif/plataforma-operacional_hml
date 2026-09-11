import json
from collections import defaultdict
from decimal import Decimal

import financeiro_v2_load_hml as base

SNAPSHOT_KEY = "financeiro_v2_prereconcile_20260911_0751"
CREATED_BY = "financeiro_v2_reconcile_hml"


def ensure_taxonomy():
    centers = [{"tenant_id": base.TENANT_ID, "nome": name, "ativo": True} for name in base.CENTERS]
    base.upsert("fin_centros_resultado", centers, "tenant_id,nome")
    banks = base.get_all("fin_bancos", select="id,nome", extra={"nome": "eq.Conta bancária principal"})
    if banks:
        bank = banks[0]
    else:
        bank = base.upsert("fin_bancos", [{"tenant_id": base.TENANT_ID, "nome": "Conta bancária principal", "apelido": "Caixa", "saldo_inicial": 0, "ativo": True}], "tenant_id,nome")[0]
    cards = base.get_all("fin_cartoes", select="id,nome", extra={"nome": "eq.Cartão corporativo"})
    if cards:
        card = cards[0]
    else:
        card = base.upsert("fin_cartoes", [{"tenant_id": base.TENANT_ID, "banco_id": bank["id"], "nome": "Cartão corporativo", "dia_fechamento": 5, "dia_vencimento": 12, "limite": None, "ativo": True}], "tenant_id,nome")[0]
    cats = []
    for tipo, name, dre, fluxo, comp, subs in base.CATEGORY_DEFS:
        cats.append({"tenant_id": base.TENANT_ID, "tipo": tipo, "nome": name, "dre_grupo": dre, "natureza_fluxo_padrao": fluxo, "comportamento_padrao": comp, "ativo": True})
    base.upsert("fin_categorias", cats, "tenant_id,tipo,nome")
    cats_db = {(r["tipo"], r["nome"]): r for r in base.get_all("fin_categorias", select="id,tipo,nome")}
    sub_rows = []
    for tipo, cat_name, dre, fluxo, comp, subs in base.CATEGORY_DEFS:
        cat = cats_db[(tipo, cat_name)]
        for sub in subs:
            sub_rows.append({"tenant_id": base.TENANT_ID, "categoria_id": cat["id"], "nome": sub, "dre_grupo": dre, "natureza_fluxo_padrao": fluxo, "comportamento_padrao": comp, "ativo": True})
    base.upsert("fin_subcategorias", sub_rows, "tenant_id,categoria_id,nome")
    centers_db = {r["nome"]: r for r in base.get_all("fin_centros_resultado", select="id,nome")}
    cats_db = {(r["tipo"], r["nome"]): r for r in base.get_all("fin_categorias", select="id,tipo,nome")}
    subs_db = {(r["categoria_id"], r["nome"]): r for r in base.get_all("fin_subcategorias", select="id,categoria_id,nome")}
    return bank, card, centers_db, cats_db, subs_db


def build_insert(row, classification, bank, card, centers_db, cats_db, subs_db):
    cat = cats_db[(classification["tipo"], classification["category"])]
    sub = subs_db[(cat["id"], classification["subcategory"])]
    d = row["Data"]
    forma = "cartao_credito" if base.norm(row["Pagamento"]) == "cartao de credito" else "conta_bancaria"
    return {
        "tenant_id": base.TENANT_ID,
        "data_pagamento": d,
        "data_vencimento": d,
        "data_realizacao": d,
        "mes_competencia": base.month_start(d),
        "tipo": classification["tipo"],
        "status": "realizado",
        "natureza_fluxo": classification["natureza_fluxo"],
        "comportamento": classification["comportamento"],
        "centro_resultado_id": centers_db[classification["center"]]["id"],
        "categoria_id": cat["id"],
        "subcategoria_id": sub["id"],
        "curso_id": None,
        "forma_pagamento": forma,
        "banco_id": None if forma == "cartao_credito" else bank["id"],
        "cartao_id": card["id"] if forma == "cartao_credito" else None,
        "qtd_parcelas": 1,
        "descricao": base.clean(row["Descricao"]),
        "valor": str(row["Valor"]),
        "observacao": None,
        "origem": "importacao",
        "fonte_original": "Fluxo de caixa V2.xlsx",
        "referencia_externa": f"{base.SOURCE_SHEET}!{row['source_row']}",
        "responsavel": None,
        "classificacao_status": classification["classificacao_status"],
        "metadata": {
            "source_file": base.SOURCE_FILE.name,
            "source_sheet": base.SOURCE_SHEET,
            "source_row": row["source_row"],
            "original": {k: base.clean(v) for k, v in row.items() if k != "Valor"},
            "taxonomy_notes": classification["notes"],
            "reconciliation": "p0_4_incremental",
        },
    }


def summarize(rows, classifications):
    totals = defaultdict(Decimal)
    status = defaultdict(int)
    for row, classification in zip(rows, classifications):
        totals[classification["tipo"]] += row["Valor"]
        status[classification["classificacao_status"]] += 1
    return {"count": len(rows), "totals": {k: str(v) for k, v in totals.items()}, "classification_status": dict(status)}


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    rows, ignored, headers, _ = base.read_sheet()
    classifications = [base.classify(r) for r in rows]
    existing = base.get_all("fin_lancamentos", select="id,referencia_externa,tipo,valor,fonte_original")
    existing_refs = {row["referencia_externa"] for row in existing if row.get("fonte_original") == "Fluxo de caixa V2.xlsx"}
    missing_pairs = [(r, c) for r, c in zip(rows, classifications) if f"{base.SOURCE_SHEET}!{r['source_row']}" not in existing_refs]
    present_pairs = [(r, c) for r, c in zip(rows, classifications) if f"{base.SOURCE_SHEET}!{r['source_row']}" in existing_refs]
    report = {
        "mode": "apply" if args.apply else "dry-run",
        "source_file": str(base.SOURCE_FILE),
        "sheet_rows_valid": summarize(rows, classifications),
        "ignored_rows": ignored,
        "present_in_hml": summarize([r for r, _ in present_pairs], [c for _, c in present_pairs]),
        "only_planilha": summarize([r for r, _ in missing_pairs], [c for _, c in missing_pairs]),
        "only_planilha_rows": [{"source_row": r["source_row"], "data": r["Data"], "tipo": c["tipo"], "descricao": base.clean(r["Descricao"]), "valor": str(r["Valor"]), "status": c["classificacao_status"], "notes": c["notes"]} for r, c in missing_pairs],
    }
    if not args.apply:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    if missing_pairs:
        snapshots = [{"tenant_id": base.TENANT_ID, "snapshot_key": SNAPSHOT_KEY, "lancamento_id": e["id"], "row_data": e, "created_by": CREATED_BY} for e in existing]
        for i in range(0, len(snapshots), base.BATCH_SIZE):
            base.upsert("fin_lancamentos_snapshot", snapshots[i:i + base.BATCH_SIZE], "tenant_id,snapshot_key,lancamento_id")
        bank, card, centers_db, cats_db, subs_db = ensure_taxonomy()
        inserts = [build_insert(r, c, bank, card, centers_db, cats_db, subs_db) for r, c in missing_pairs]
        inserted = []
        for i in range(0, len(inserts), base.BATCH_SIZE):
            inserted.extend(base.request("POST", "fin_lancamentos", inserts[i:i + base.BATCH_SIZE]))
        report["inserted"] = len(inserted)
        report["snapshot_key"] = SNAPSHOT_KEY
    else:
        report["inserted"] = 0
        report["snapshot_key"] = None

    after = base.get_all("fin_lancamentos", select="id,tipo,valor,fonte_original,classificacao_status,data_pagamento,referencia_externa")
    loaded = [row for row in after if row.get("fonte_original") == "Fluxo de caixa V2.xlsx"]
    totals = defaultdict(Decimal)
    for row in loaded:
        totals[row["tipo"]] += Decimal(str(row["valor"]))
    report["after"] = {
        "rows": len(loaded),
        "distinct_refs": len({row.get("referencia_externa") for row in loaded}),
        "min_date": min(row["data_pagamento"] for row in loaded),
        "max_date": max(row["data_pagamento"] for row in loaded),
        "totals": {k: str(v) for k, v in totals.items()},
        "review": sum(1 for row in loaded if row.get("classificacao_status") == "review"),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
