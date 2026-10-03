export type IntradaySnapshot = Record<string, unknown> & {
  collected_at?: string;
  row_key?: string;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  anuncio?: string | null;
};

export function buildIntradayDelta(rows: IntradaySnapshot[]) {
  const timestamps = [...new Set(rows.map((row) => String(row.collected_at ?? "")).filter(Boolean))]
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  if (timestamps.length < 2) {
    return {
      available: false, since: null, spend: null, linkClicks: null, checkouts: null, metaPurchases: null, confirmedSales: null,
      reason: rows.length ? "Aguardando a próxima coleta do mesmo dia para calcular o primeiro delta real." : "Nenhum snapshot intradiário foi registrado para este dia.",
      collectedAt: timestamps[0] ?? null, perAd: [],
    };
  }

  const [currentAt, previousAt] = timestamps;
  const current = rows.filter((row) => row.collected_at === currentAt);
  const previous = rows.filter((row) => row.collected_at === previousAt);
  const keyOf = (row: IntradaySnapshot) => String(row.row_key ?? `${row.campaign_id ?? ""}|${row.adset_id ?? ""}|${row.ad_id ?? ""}|${row.anuncio ?? ""}`);
  const previousByKey = new Map(previous.map((row) => [keyOf(row), row]));
  const delta = (row: IntradaySnapshot, field: string) => Number(row[field] ?? 0) - Number(previousByKey.get(keyOf(row))?.[field] ?? 0);
  const sum = (field: string) => current.reduce((total, row) => total + delta(row, field), 0);
  const perAd = current.filter((row) => previousByKey.has(keyOf(row))).map((row) => ({
    adId: row.ad_id ?? null,
    adName: String(row.anuncio ?? "Anúncio sem nome"),
    spend: delta(row, "valor_gasto"), impressions: delta(row, "impressoes"), clicks: delta(row, "cliques"),
    linkClicks: delta(row, "link_clicks"), outbound: delta(row, "outbound_clicks"), lpv: delta(row, "landing_page_views"),
    checkouts: delta(row, "initiate_checkouts"), metaPurchases: delta(row, "meta_purchases"),
  })).sort((left, right) => right.spend - left.spend);

  return {
    available: true,
    since: new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(previousAt)),
    collectedAt: currentAt,
    spend: sum("valor_gasto"), linkClicks: sum("link_clicks"), checkouts: sum("initiate_checkouts"), metaPurchases: sum("meta_purchases"),
    confirmedSales: null,
    reason: "Comparação entre as duas últimas coletas do mesmo dia; não representa tendência.",
    perAd,
  };
}
