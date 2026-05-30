from __future__ import annotations

import json
import os
import hashlib
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\Jass_\Download_HD\Insight (1).xlsx")


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return {**values, **os.environ}


def request_json(method: str, url: str, key: str, payload: object | None = None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        url,
        data=data,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urlopen(request, timeout=60) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else None


def parse_date(value: object) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value or "").strip()
    return text[:10]


def to_int(value: object) -> int:
    return int(Decimal(str(value or 0)))


def to_float(value: object) -> float:
    return float(Decimal(str(value or 0)))


def main() -> None:
    env = load_env()
    supabase_url = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    service_key = env["SUPABASE_SERVICE_ROLE_KEY"]

    tenants = request_json(
        "GET",
        f"{supabase_url}/rest/v1/tenants?select=id&nome=ilike.{quote('*juliana coutinho*')}&limit=1",
        service_key,
    )
    if not tenants:
        raise RuntimeError("Tenant Juliana Coutinho nao encontrado.")

    tenant_id = tenants[0]["id"]

    workbook = openpyxl.load_workbook(SOURCE, data_only=True, read_only=True)
    sheet = workbook["Ads"]
    rows = list(sheet.iter_rows(values_only=True))
    headers = [str(item or "").strip() for item in rows[0]]
    index = {name: headers.index(name) for name in headers}

    payload = []
    for row in rows[1:]:
        campanha = str(row[index["campanha"]] or "").strip()
        anuncio = str(row[index["anuncio"]] or "").strip()
        data_referencia = parse_date(row[index["data_referencia"]])
        if not campanha or not anuncio or not data_referencia:
            continue

        payload.append(
            {
                "tenant_id": tenant_id,
                "data_referencia": data_referencia,
                "campanha": campanha,
                "conjunto": str(row[index["conjunto"]] or "").strip() or None,
                "anuncio": anuncio,
                "status": str(row[index["status"]] or "UNKNOWN").strip().upper(),
                "objetivo": str(row[index["objetivo"]] or "").strip() or None,
                "alcance": to_int(row[index["alcance"]]),
                "impressoes": to_int(row[index["impressoes"]]),
                "cliques": to_int(row[index["cliques"]]),
                "ctr": to_float(row[index["ctr"]]),
                "cpc": to_float(row[index["cpc"]]),
                "cpm": to_float(row[index["cpm"]]),
                "frequencia": to_float(row[index["frequencia"]]),
                "valor_gasto": to_float(row[index["valor_gasto"]]),
                "conversoes": to_int(row[index["conversoes"]]),
                "leads": to_int(row[index["leads"]]),
                "performance_status": str(row[index["performance_status"]] or "OK").strip().upper(),
                "performance_score": to_float(row[index["performance_score"]]),
                "imported_at": str(row[index["created_at"]] or datetime.utcnow().isoformat()),
                "row_key": hashlib.md5(
                    f"{data_referencia}|{campanha}|{str(row[index['conjunto']] or '').strip()}|{anuncio}".encode(
                        "utf-8",
                    ),
                ).hexdigest(),
            }
        )

    deduped = {item["row_key"]: item for item in payload}
    payload = list(deduped.values())

    for offset in range(0, len(payload), 100):
        chunk = payload[offset : offset + 100]
        request_json(
            "POST",
            f"{supabase_url}/rest/v1/instagram_ads_daily?on_conflict=tenant_id,row_key",
            service_key,
            chunk,
        )
        print(f"Imported {min(offset + len(chunk), len(payload))}/{len(payload)}")


if __name__ == "__main__":
    main()
