const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const api = read("app/api/content-library/route.ts");
const library = read("modules/content-library/components/ContentLibrary.tsx");
const validation = read("modules/validacao/services/validation-server.ts");
const seed = read("supabase/seed/instagram_insight_import.sql")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

assert.match(api, /const PAGE_SIZE = 15;/, "content library must paginate at 15 items");
assert.match(api, /\.eq\("tenant_id", auth\.tenantId\)/, "queries must remain tenant scoped");
assert.match(api, /select\(select, \{ count: "exact" \}\)/, "pagination must use an exact server count");
assert.match(api, /norwyn_content_events/, "canonical content events table must be reused");
assert.match(api, /norwyn_validation_decisions/, "structured classification history must be reused");
assert.match(api, /generated_content: false/, "reuse action must never generate content in this phase");
assert.match(api, /similar_confirmed: Boolean\(body\.similar_confirmed\)/, "similar classification must be auditable");
assert.match(library, /window\.confirm\(/, "similar content expansion must require explicit confirmation");
assert.match(library, /Nada foi salvo/, "AI suggestions must be visibly non-persistent before confirmation");
assert.match(library, /15 por página/, "the UI must disclose the page size");
assert.match(api, /Ordenado por salvamentos/, "reuse ranking criteria must be transparent");
assert.match(api, /campaignSummary/, "campaign filters must return an operational summary");
assert.match(api, /rows\.length >= 5/, "format insights must require a minimum sample");
assert.match(api, /rows\.length >= 7/, "timing insights must require a minimum sample");
assert.match(library, /Amostra insuficiente para recomendação confiável/, "the UI must state when evidence is insufficient");
assert.match(library, /Não disponível/, "missing metrics must use a neutral state instead of a false zero");
assert.match(library, /Melhor para reaproveitar/, "the full sorting control must expose reuse ranking");
assert.match(library, /Título A → Z/, "the sorting control must support alphabetical order");
assert.match(library, /onError=\{\(\) => setFailed\(true\)\}/, "broken thumbnails must fall back without a broken image");
assert.match(library, /Ensinar à Norwyn/, "structured classification must remain available");
assert.match(api, /sort === "reuse"/, "reuse sorting must run server-side");
assert.match(api, /content_library\.load_failed/, "technical query failures must stay in server logs");
assert.doesNotMatch(library, /schemaErrors\.join/, "technical schema details must not be rendered to users");
assert.doesNotMatch(validation, /\.limit\(3000\)/, "validation RSC must not serialize the content corpus");
assert.ok(seed.includes("imersao"), "the current import corpus must contain the imersao search case");
assert.ok(seed.includes("zumbido"), "the current import corpus must contain the zumbido search case");

console.log("Norwyn content library regression: PASS");
