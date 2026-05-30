from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\Jass_\Download_HD\Insight (1).xlsx")
OUTPUT = ROOT / "supabase" / "migrations" / "0021_instagram_ads_seed.sql"

COLUMNS = [
    "data_referencia",
    "campanha",
    "conjunto",
    "anuncio",
    "status",
    "objetivo",
    "alcance",
    "impressoes",
    "cliques",
    "ctr",
    "cpc",
    "cpm",
    "frequencia",
    "valor_gasto",
    "conversoes",
    "leads",
    "performance_status",
    "performance_score",
    "created_at",
]


def sql_text(value: object) -> str:
    if value is None:
        return "null"
    text = str(value).replace("'", "''")
    return f"'{text}'"


def sql_num(value: object, default: str = "0") -> str:
    if value is None or value == "":
        return default
    return str(Decimal(str(value)))


def parse_date(value: object) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value or "").strip()
    if not text:
        return "1970-01-01"
    return text[:10]


def parse_timestamptz(value: object) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    text = str(value or "").strip()
    return text or datetime.utcnow().isoformat()


def main() -> None:
    workbook = openpyxl.load_workbook(SOURCE, data_only=True, read_only=True)
    sheet = workbook["Ads"]
    rows = list(sheet.iter_rows(values_only=True))
    headers = [str(item or "").strip() for item in rows[0]]
    index = {name: headers.index(name) for name in COLUMNS if name in headers}

    value_rows: list[str] = []
    for row in rows[1:]:
        campanha = str(row[index["campanha"]] or "").strip()
        anuncio = str(row[index["anuncio"]] or "").strip()
        data_referencia = parse_date(row[index["data_referencia"]])
        if not campanha or not anuncio or data_referencia == "1970-01-01":
            continue

        value_rows.append(
            "("
            + ", ".join(
                [
                    sql_text(data_referencia),
                    sql_text(campanha),
                    sql_text(row[index["conjunto"]]),
                    sql_text(anuncio),
                    sql_text(str(row[index["status"]] or "UNKNOWN").strip().upper()),
                    sql_text(row[index["objetivo"]]),
                    sql_num(row[index["alcance"]]),
                    sql_num(row[index["impressoes"]]),
                    sql_num(row[index["cliques"]]),
                    sql_num(row[index["ctr"]]),
                    sql_num(row[index["cpc"]]),
                    sql_num(row[index["cpm"]]),
                    sql_num(row[index["frequencia"]]),
                    sql_num(row[index["valor_gasto"]]),
                    sql_num(row[index["conversoes"]]),
                    sql_num(row[index["leads"]]),
                    sql_text(str(row[index["performance_status"]] or "OK").strip().upper()),
                    sql_num(row[index["performance_score"]]),
                    sql_text(parse_timestamptz(row[index["created_at"]])),
                ]
            )
            + ")"
        )

    chunks = []
    chunk_size = 100
    for position in range(0, len(value_rows), chunk_size):
        chunk = value_rows[position : position + chunk_size]
        chunks.append(
            """
with tenant_scope as (
  select id as tenant_id
  from public.tenants
  where lower(nome) like '%juliana coutinho%'
  order by created_at
  limit 1
),
vals (
  data_referencia, campanha, conjunto, anuncio, status, objetivo, alcance, impressoes,
  cliques, ctr, cpc, cpm, frequencia, valor_gasto, conversoes, leads,
  performance_status, performance_score, imported_at
) as (
  values
"""
            + ",\n".join(chunk)
            + """
)
insert into public.instagram_ads_daily (
  tenant_id, data_referencia, campanha, conjunto, anuncio, status, objetivo, alcance,
  impressoes, cliques, ctr, cpc, cpm, frequencia, valor_gasto, conversoes,
  leads, performance_status, performance_score, imported_at
)
select
  t.tenant_id, v.data_referencia::date, v.campanha, v.conjunto, v.anuncio, v.status,
  v.objetivo, v.alcance::integer, v.impressoes::integer, v.cliques::integer,
  v.ctr::numeric, v.cpc::numeric, v.cpm::numeric, v.frequencia::numeric,
  v.valor_gasto::numeric, v.conversoes::integer, v.leads::integer,
  v.performance_status, v.performance_score::numeric, v.imported_at::timestamptz
from tenant_scope t
cross join vals v
on conflict (tenant_id, row_key) do update set
  status = excluded.status,
  objetivo = excluded.objetivo,
  alcance = excluded.alcance,
  impressoes = excluded.impressoes,
  cliques = excluded.cliques,
  ctr = excluded.ctr,
  cpc = excluded.cpc,
  cpm = excluded.cpm,
  frequencia = excluded.frequencia,
  valor_gasto = excluded.valor_gasto,
  conversoes = excluded.conversoes,
  leads = excluded.leads,
  performance_status = excluded.performance_status,
  performance_score = excluded.performance_score,
  imported_at = excluded.imported_at,
  updated_at = now();
"""
        )

    OUTPUT.write_text(
        "-- Auto-generated by scripts/generate_ads_seed.py\n"
        f"-- Source: {SOURCE}\n\n"
        "begin;\n"
        + "\n".join(chunks)
        + "\ncommit;\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT} with {len(value_rows)} rows.")


if __name__ == "__main__":
    main()
