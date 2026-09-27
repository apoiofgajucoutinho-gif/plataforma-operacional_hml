const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const guard = fs.readFileSync(path.join(root, "lib/supabase/environment-guard.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/content-library/route.ts"), "utf8");
const docs = fs.readFileSync(path.join(root, "docs/environments.md"), "utf8");

assert.match(guard, /expectedSupabaseProjectRef/);
assert.match(guard, /supabase\.environment_mismatch/);
assert.match(guard, /A escrita foi bloqueada/);
assert.match(route, /assertExpectedSupabaseWriteTarget/);
assert.match(route, /action !== "suggest" && action !== "similar"/);
assert.match(docs, /plataf-op-hml/);
assert.match(docs, /oerdsmgiebquecqwcbox/);
assert.match(docs, /ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0/);

console.log("Norwyn environment guard: PASS");
