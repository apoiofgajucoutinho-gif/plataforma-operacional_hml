const assert = require("node:assert/strict");

async function fetchTenantRowsPaged(client, table, select, tenantId, options = {}) {
  const pageSize = options.pageSize ?? 1000;
  const maxRows = options.maxRows ?? 50000;
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    let query = client.from(table).select(select).eq("tenant_id", tenantId).range(from, from + pageSize - 1);
    if (options.order) query = query.order(options.order, { ascending: options.ascending ?? false, nullsFirst: false });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function fakeClient(size) {
  const data = Array.from({ length: size }, (_, index) => ({ tenant_id: "tenant", customer_id: `c${index + 1}`, ltv_brl: index + 1 }));
  return {
    calls: [],
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        range(from, to) { this.fromIndex = from; this.toIndex = to; return this; },
        order() { return this; },
        async then(resolve) {
          const page = data.slice(this.fromIndex, this.toIndex + 1);
          resolve({ data: page, error: null });
        },
      };
    },
  };
}

(async () => {
  const rows = await fetchTenantRowsPaged(fakeClient(2501), "norwyn_customer_student_360", "*", "tenant", { pageSize: 1000, maxRows: 5000 });
  assert.equal(rows.length, 2501);
  assert.equal(rows.at(-1).customer_id, "c2501");
  const firstPage = rows.slice(0, 50);
  assert.equal(firstPage.length, 50);
  const ltvSum = rows.reduce((sum, row) => sum + row.ltv_brl, 0);
  assert.equal(ltvSum, (2501 * 2502) / 2);
  console.log("Student 360 pagination PASS", { total: rows.length, pageSize: firstPage.length, ltvSum });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
