const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const appRoot = path.join(root, "apps", "imersao-zumbido-variant-v1");
const read = (file) => fs.readFileSync(path.join(appRoot, file), "utf8");
const html = read("index.html");
const tracking = read("norwyn-tracking.js");
const pixel = read("meta-pixel.js");
const ga4 = read("ga4.js");
const bridgeClient = read("hotmart-attribution-bridge.js");
const eventRoute = fs.readFileSync(path.join(root, "app", "api", "norwyn", "lp-events", "route.ts"), "utf8");
const bridgeRoute = fs.readFileSync(path.join(root, "app", "api", "norwyn", "attribution-bridge", "route.ts"), "utf8");
const cors = fs.readFileSync(path.join(root, "lib", "norwyn", "lp-cors.ts"), "utf8");
const runtime = read("app.js");

const sections = ["hero", "pain", "practice_change", "pillars", "modules", "science", "teachers", "proof", "offer", "faq", "final_cta"];
for (const section of sections) assert.match(html, new RegExp(`data-norwyn-section=["']${section}["']`), `missing section ${section}`);

assert.doesNotMatch(html, /href=["']#["']/, "real CTAs cannot use href=#");
assert.match(html, /B47092539B\?off=lov69pen/);
assert.match(html, /Aula ao vivo em<br>05\/10 às 19h/);
assert.match(tracking, /landingKey:\s*["']imersao-zumbido["']/);
assert.match(tracking, /landingVersion:\s*["']variant_v1["']/);
assert.match(tracking, /productId:\s*["']imersao_zumbido["']/);
for (const route of ["/ads", "/bio", "/stories", "/whats"]) assert.match(tracking, new RegExp(`['\"]${route}['\"]`));
for (const event of ["lp_section_view", "lp_cta_click"]) assert.match(eventRoute, new RegExp(event));
assert.match(bridgeRoute, /DEFAULT_LANDING_KEY\s*=\s*["']imersao_zumbido["']/);
assert.match(bridgeRoute, /ALLOWED_LANDING_KEYS/);
assert.match(bridgeClient, /LANDING_KEY\s*=\s*["']imersao-zumbido["']/);
assert.match(cors, /https:\/\/imersao-zumbido\.fgajulianacoutinho\.com\.br/);
assert.match(cors, /authorizedVariantPreviewOrigin/);
assert.match(pixel, /1421640192678969/);
assert.doesNotMatch(pixel, /["']Purchase["']/);
assert.doesNotMatch(ga4, /purchase\s*:/i);
assert.match(ga4, /NEXT_PUBLIC_GA4_MEASUREMENT_ID|__NORWYN_RUNTIME_CONFIG__/);
for (const asset of ["hero", "ciencia", "extra_scene", "juliana2", "elisa2", "emblema-abelha-laurel-v7", "emblema-zumbido"]) {
  assert.equal(fs.existsSync(path.join(appRoot, "assets", `${asset}.webp`)), true, `missing optimized ${asset}.webp`);
  assert.equal(fs.existsSync(path.join(appRoot, "assets", `${asset}.png`)), true, `missing original ${asset}.png fallback`);
}
assert.match(html, /<source[^>]+\.webp[^>]+type=["']image\/webp["']/);
assert.match(html, /loading=["']lazy["']/);
assert.match(html, /data-lazy-background=["']science["']/);
assert.match(html, /data-lazy-background=["']offer["']/);
assert.match(runtime, /rootMargin:\s*["']600px 0px["']/);

console.log("Imersao Zumbido variant_v1 contract PASS");
