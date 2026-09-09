const assert = require("node:assert/strict");

const pageSize = 20;

function buildDataset(size = 1501) {
  return Array.from({ length: size }, (_, index) => {
    const n = index + 1;
    const product = n % 7 === 0 ? "Formação AASI" : n % 5 === 0 ? "MRC" : n % 3 === 0 ? "Ajustes Finos" : "Imersão Zumbido";
    return {
      tenant_id: "tenant",
      customer_id: `cust-${String(n).padStart(4, "0")}`,
      display_name: n === 1234 ? "Juliana Golden" : `Cliente ${String(n).padStart(4, "0")}`,
      email: n === 1234 ? "Ju.Golden@Example.com" : `cliente${String(n).padStart(4, "0")}@example.com`,
      products_summary: `${product}; Produto ${n % 11}`,
      first_product: product,
      latest_product: product,
      lifecycle_status: n % 13 === 0 ? "LEAD" : n % 2 === 0 ? "STUDENT" : "BUYER",
      data_quality_status: n % 17 === 0 ? "REVIEW" : n % 19 === 0 ? "PARTIAL" : "TRUSTED",
      student_status: n % 13 === 0 ? "NOT_APPLICABLE" : n % 4 === 0 ? "ACTIVE" : "STUDENT",
      next_opportunity: n % 23 === 0 ? "REVISAR_IDENTIDADE" : n % 7 === 0 ? "CLIENTE_MULTIPRODUTO" : "ACESSO_DESCONHECIDO",
      ltv_brl: size - n + 0.5,
      purchase_count: (n % 5) + 1,
      product_count: (n % 4) + 1,
      module_completed_events: n % 9,
      last_access_at: `2026-08-${String((n % 28) + 1).padStart(2, "0")}`,
    };
  });
}

function includes(value, needle) {
  return String(value ?? "").toLocaleLowerCase("pt-BR").includes(String(needle ?? "").toLocaleLowerCase("pt-BR"));
}

const sortColumns = {
  person: "display_name",
  lifecycle: "lifecycle_status",
  ltv_brl: "ltv_brl",
  purchase_count: "purchase_count",
  student_status: "student_status",
  access: "last_access_at",
  progress: "module_completed_events",
  opportunity: "next_opportunity",
  quality: "data_quality_status",
};

function queryCustomers(rows, params = {}) {
  const page = Math.max(1, Number(params.page ?? 1));
  const sort = sortColumns[params.sort] ? params.sort : "ltv_brl";
  const direction = params.direction === "asc" ? "asc" : "desc";
  let filtered = rows.filter((row) => row.tenant_id === "tenant");
  if (params.q) {
    filtered = filtered.filter((row) => includes(row.display_name, params.q) || includes(row.email, params.q) || includes(row.products_summary, params.q) || includes(row.first_product, params.q) || includes(row.latest_product, params.q));
  }
  if (params.product) {
    filtered = filtered.filter((row) => includes(row.products_summary, params.product) || includes(row.first_product, params.product) || includes(row.latest_product, params.product));
  }
  if (params.lifecycle && params.lifecycle !== "all") filtered = filtered.filter((row) => row.lifecycle_status === params.lifecycle);
  if (params.studentStatus && params.studentStatus !== "all") filtered = filtered.filter((row) => row.student_status === params.studentStatus);
  if (params.quality && params.quality !== "all") filtered = filtered.filter((row) => row.data_quality_status === params.quality);
  if (params.opportunity && params.opportunity !== "all") filtered = filtered.filter((row) => row.next_opportunity === params.opportunity);

  const column = sortColumns[sort];
  filtered = filtered.slice().sort((a, b) => {
    const av = a[column];
    const bv = b[column];
    const compare = typeof av === "number" && typeof bv === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR");
    if (compare !== 0) return direction === "asc" ? compare : -compare;
    return a.customer_id.localeCompare(b.customer_id);
  });

  const from = (page - 1) * pageSize;
  return { count: filtered.length, rows: filtered.slice(from, from + pageSize) };
}

function buildQuery(current, page, overrides = {}) {
  const values = { ...current, page, ...overrides };
  if (overrides.q !== undefined || overrides.product !== undefined || overrides.lifecycle !== undefined || overrides.studentStatus !== undefined || overrides.quality !== undefined || overrides.opportunity !== undefined) {
    values.page = 1;
  }
  return values;
}

function fetchProfile(rows, customerId) {
  return rows.find((row) => row.tenant_id === "tenant" && row.customer_id === customerId) ?? null;
}

const rows = buildDataset();
assert.equal(rows.length, 1501);

const all = queryCustomers(rows, { page: 1 });
assert.equal(all.count, 1501, "limpar filtros deve restaurar universo completo");
assert.equal(all.rows.length, 20, "listagem deve permanecer paginada em 20 registros");

const nameSearch = queryCustomers(rows, { q: "juliana golden" });
assert.equal(nameSearch.count, 1, "busca por nome deve ser case-insensitive");
assert.equal(nameSearch.rows[0].customer_id, "cust-1234");

const emailSearch = queryCustomers(rows, { q: "ju.golden@example.com" });
assert.equal(emailSearch.count, 1, "busca por email deve ser case-insensitive");
assert.equal(emailSearch.rows[0].customer_id, "cust-1234");

const productSearch = queryCustomers(rows, { product: "formação aasi" });
assert.ok(productSearch.count > 200, "busca por produto deve consultar universo completo");
assert.ok(productSearch.rows.every((row) => includes(row.products_summary, "formação aasi")));

const combined = queryCustomers(rows, { product: "MRC", lifecycle: "STUDENT", quality: "TRUSTED", opportunity: "ACESSO_DESCONHECIDO" });
assert.ok(combined.count > 0, "combinação de 2+ filtros deve retornar conjunto real");
assert.ok(combined.rows.every((row) => includes(row.products_summary, "MRC") && row.lifecycle_status === "STUDENT" && row.data_quality_status === "TRUSTED" && row.next_opportunity === "ACESSO_DESCONHECIDO"));

const paged = queryCustomers(rows, { product: "Ajustes", page: 2, sort: "person", direction: "asc" });
assert.equal(paged.rows.length, 20, "filtro + paginação deve continuar paginado em 20 registros");
assert.ok(paged.count > 50);

const sortAsc = queryCustomers(rows, { sort: "ltv_brl", direction: "asc" });
const sortDesc = queryCustomers(rows, { sort: "ltv_brl", direction: "desc" });
assert.ok(sortAsc.rows[0].ltv_brl < sortAsc.rows.at(-1).ltv_brl, "ASC deve ordenar globalmente antes de paginar");
assert.ok(sortDesc.rows[0].ltv_brl > sortDesc.rows.at(-1).ltv_brl, "DESC deve ordenar globalmente antes de paginar");
assert.notEqual(sortAsc.rows[0].customer_id, sortDesc.rows[0].customer_id, "ASC/DESC devem mudar a janela retornada");

const filterAfterPage2 = buildQuery({ page: 2, sort: "ltv_brl", direction: "desc" }, 2, { product: "MRC" });
assert.equal(filterAfterPage2.page, 1, "mudança de filtro deve resetar para página 1");

const selectedFromPage = queryCustomers(rows, { product: "MRC", page: 2, sort: "person", direction: "asc" }).rows[3];
const profile = fetchProfile(rows, selectedFromPage.customer_id);
assert.equal(profile.customer_id, selectedFromPage.customer_id, "perfil deve abrir por customer_id canônico");
assert.equal(fetchProfile(rows, "missing"), null, "perfil inexistente deve retornar estado vazio/erro");

console.log("Student 360 filters/sort/profile PASS", {
  total: all.count,
  nameSearch: nameSearch.count,
  emailSearch: emailSearch.count,
  productSearch: productSearch.count,
  combined: combined.count,
  pagedRows: paged.rows.length,
  selectedCustomerId: profile.customer_id,
});

