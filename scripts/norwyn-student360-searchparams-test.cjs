const assert = require("node:assert/strict");

function updateStudentSearchParams(current, changes = {}, options = {}) {
  const values = {
    view: "students",
    q: current.query ?? "",
    product: current.product ?? "",
    lifecycle: current.lifecycle ?? "all",
    quality: current.quality ?? "all",
    studentStatus: current.studentStatus ?? "all",
    opportunity: current.opportunity ?? "all",
    sort: current.sort ?? "ltv_brl",
    direction: current.direction ?? "desc",
    page: String(options.resetPage ? 1 : current.page ?? 1),
    ...changes,
  };
  if (options.clearCustomer) values.customerId = undefined;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (!value || value === "all") continue;
    if (key === "page" && value === "1") continue;
    if (key === "sort" && value === "ltv_brl") continue;
    if (key === "direction" && value === "desc") continue;
    params.set(key, value);
  }
  return `/produtos-alunos?${params.toString()}`;
}

function parse(url) {
  return Object.fromEntries(new URL(`https://hml.local${url}`).searchParams.entries());
}

const initial = {
  page: 3,
  query: "",
  product: "",
  lifecycle: "all",
  quality: "all",
  studentStatus: "all",
  opportunity: "all",
  sort: "ltv_brl",
  direction: "desc",
};

const filtered = parse(updateStudentSearchParams(initial, { q: "ana" }, { resetPage: true, clearCustomer: true }));
assert.equal(filtered.view, "students", "filtro deve preservar aba alunos");
assert.equal(filtered.q, "ana", "filtro deve ser adicionado");
assert.equal(filtered.page, undefined, "page=1 deve ser implícito depois de aplicar filtro");
assert.equal(filtered.sort, undefined, "sort padrão deve permanecer preservado implicitamente");
assert.equal(filtered.direction, undefined, "direction padrão deve permanecer preservado implicitamente");

const withFilter = { ...initial, page: 2, query: "ana", product: "AASI", sort: "person", direction: "asc" };
const sorted = parse(updateStudentSearchParams(withFilter, { sort: "ltv_brl", direction: "desc" }, { resetPage: true, clearCustomer: true }));
assert.equal(sorted.view, "students", "sort deve preservar aba alunos");
assert.equal(sorted.q, "ana", "sort deve preservar filtro de texto");
assert.equal(sorted.product, "AASI", "sort deve preservar filtro de produto");
assert.equal(sorted.page, undefined, "sort deve resetar para página 1");
assert.equal(sorted.sort, undefined, "ltv_brl desc volta a ser padrão implícito");

const opened = parse(updateStudentSearchParams(withFilter, { customerId: "cust-123", page: "2" }));
assert.equal(opened.view, "students", "abrir cliente deve preservar aba alunos");
assert.equal(opened.q, "ana", "abrir cliente deve preservar filtro");
assert.equal(opened.product, "AASI", "abrir cliente deve preservar produto");
assert.equal(opened.sort, "person", "abrir cliente deve preservar sort");
assert.equal(opened.direction, "asc", "abrir cliente deve preservar direção");
assert.equal(opened.page, "2", "abrir cliente deve preservar página atual");
assert.equal(opened.customerId, "cust-123", "abrir cliente deve adicionar customerId canônico");

const nextPage = parse(updateStudentSearchParams(withFilter, { customerId: undefined, page: "3" }));
assert.equal(nextPage.view, "students", "paginação deve preservar aba alunos");
assert.equal(nextPage.q, "ana", "paginação deve preservar filtro");
assert.equal(nextPage.sort, "person", "paginação deve preservar sort");
assert.equal(nextPage.direction, "asc", "paginação deve preservar direção");
assert.equal(nextPage.page, "3", "paginação deve mudar somente página");
assert.equal(nextPage.customerId, undefined, "paginação limpa seleção visual do cliente");

console.log("Student 360 searchParams preservation PASS", { filtered, sorted, opened, nextPage });
