const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "apps", "imersao-zumbido-variant-v1", "dist");
const expectGa4 = process.env.EXPECT_GA4 === "1";
const shortPaths = new Set(["/ads", "/bio", "/stories", "/whats"]);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

function localFile(url) {
  const pathname = new URL(url, "http://127.0.0.1").pathname;
  if (pathname === "/" || shortPaths.has(pathname)) return path.join(dist, "index.html");
  const candidate = path.resolve(dist, `.${pathname}`);
  return candidate.startsWith(dist) ? candidate : null;
}

const server = http.createServer((request, response) => {
  const file = localFile(request.url);
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream", "x-robots-tag": "noindex, nofollow" });
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  const screenshots = [
    ["desktop", { width: 1440, height: 1100 }],
    ["tablet", { width: 834, height: 1112 }],
    ["mobile", { width: 390, height: 844 }],
  ];
  const performanceMetrics = [];

  for (const [name, viewport] of screenshots) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.route("https://plataf-op-hml.vercel.app/api/norwyn/lp-events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"stored":false}' }));
    await page.route("https://plataf-op-hml.vercel.app/api/norwyn/attribution-bridge**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"enabled":false,"mode":"smoke"}' }));
    await page.goto("http://127.0.0.1:4173/?traffic_type=test", { waitUntil: "networkidle" });
    assert.equal(await page.locator("body").evaluate((node) => node.scrollWidth <= node.clientWidth + 1), true, `${name} has horizontal overflow`);
    const initialAssets = await page.evaluate(() => performance.getEntriesByType("resource")
      .filter((entry) => /\/assets\/.+\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => ({ name: entry.name.split("/").pop(), bytes: entry.encodedBodySize })));
    assert.ok(initialAssets.some((asset) => asset.name === "hero.webp"));
    assert.equal(initialAssets.some((asset) => asset.name === "extra_scene.webp"), false);
    assert.equal(await page.locator('[data-lazy-background="offer"]').evaluate((node) => node.classList.contains("is-image-loaded")), false);
    for (const selector of ['[data-lazy-background="science"]', '[data-lazy-background="offer"]', "footer"]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
    }
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    assert.equal(await page.locator('[data-lazy-background="science"]').evaluate((node) => node.classList.contains("is-image-loaded")), true);
    assert.equal(await page.locator('[data-lazy-background="offer"]').evaluate((node) => node.classList.contains("is-image-loaded")), true);
    const finalAssets = await page.evaluate(() => performance.getEntriesByType("resource")
      .filter((entry) => /\/assets\/.+\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => ({ name: entry.name.split("/").pop(), bytes: entry.encodedBodySize })));
    for (const asset of ["hero.webp", "ciencia.webp", "extra_scene.webp", "juliana2.webp", "elisa2.webp", "emblema-abelha-laurel-v7.webp", "emblema-zumbido.webp"]) {
      assert.ok(finalAssets.some((entry) => entry.name === asset), `${name} did not load ${asset}`);
    }
    performanceMetrics.push({
      name,
      initialBytes: initialAssets.reduce((total, asset) => total + asset.bytes, 0),
      fullPageBytes: finalAssets.reduce((total, asset) => total + asset.bytes, 0),
      assets: finalAssets.map((asset) => asset.name),
    });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, "tmp", `imersao-zumbido-variant-v1-${name}.png`), fullPage: true });
    await context.close();
  }

  const deniedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const deniedPage = await deniedContext.newPage();
  let deniedPixelRequests = 0;
  await deniedPage.route("https://plataf-op-hml.vercel.app/api/norwyn/lp-events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"stored":false}' }));
  await deniedPage.route("https://plataf-op-hml.vercel.app/api/norwyn/attribution-bridge**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"enabled":false,"mode":"smoke"}' }));
  await deniedPage.route("https://connect.facebook.net/**", (route) => {
    deniedPixelRequests += 1;
    return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  await deniedPage.goto("http://127.0.0.1:4173/?traffic_type=test", { waitUntil: "networkidle" });
  await deniedPage.getByRole("button", { name: "Agora não" }).click();
  assert.equal(await deniedPage.evaluate(() => window.NorwynMetaPixel.state.initialized), false);
  assert.equal(deniedPixelRequests, 0, "Meta Pixel must remain blocked when consent is denied");
  await deniedContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const events = [];
  let checkoutUrl = null;
  let pixelAfterCheckout = null;
  await page.exposeFunction("__captureCheckoutPixel", (snapshot) => {
    pixelAfterCheckout = snapshot;
  });
  await page.route("https://plataf-op-hml.vercel.app/api/norwyn/lp-events", async (route) => {
    events.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"stored":false}' });
  });
  await page.route("https://plataf-op-hml.vercel.app/api/norwyn/attribution-bridge**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"enabled":true,"mode":"smoke"}' });
      return;
    }
    const body = JSON.parse(route.request().postData() || "{}");
    assert.equal(body.landing_key, "imersao-zumbido");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: true, bridged: true, sck: "nw_variant_smoke_1234", checkout_url: "https://pay.hotmart.com/B47092539B?off=lov69pen&sck=nw_variant_smoke_1234&utm_source=meta" }) });
  });
  await page.route("https://connect.facebook.net/**", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.route("https://www.googletagmanager.com/**", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.route("https://pay.hotmart.com/**", async (route) => {
    checkoutUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Checkout smoke</title>" });
  });

  const query = "traffic_type=test&bridge_test=1&utm_source=explicit_meta&utm_medium=paid&utm_campaign=imersao_zumbido&utm_content=ad06&campaign_id=cmp1&adset_id=set1&ad_id=ad06&fbclid=fb-smoke";
  await page.goto(`http://127.0.0.1:4173/ads?${query}`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.addEventListener("norwyn:event", (event) => {
      if (event.detail?.event !== "checkout_click") return;
      window.__captureCheckoutPixel({
        state: { ...window.NorwynMetaPixel.state },
        calls: (window.fbq?.queue || []).map((args) => Array.from(args)),
      });
    });
  });
  const touch = await page.evaluate(() => window.norwyn.context().currentTouch);
  assert.equal(touch.entry_source, "meta_ads");
  assert.equal(touch.utm_source, "explicit_meta", "explicit attribution must win over route defaults");
  assert.equal(touch.ad_id, "ad06");
  await page.getByRole("button", { name: "Permitir medição" }).click();

  for (const section of ["hero", "pain", "practice_change", "pillars", "modules", "science", "teachers", "proof", "offer", "faq", "final_cta"]) {
    await page.locator(`[data-norwyn-section="${section}"]`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1150);
  }

  const pixelState = await page.evaluate(() => window.NorwynMetaPixel.state);
  assert.equal(pixelState.pageViewSent, true);
  assert.equal(pixelState.viewContentSent, true);
  assert.equal(pixelState.offerViewSent, true);
  assert.equal(pixelState.initiateCheckoutSent, false);
  const ga4BeforeCheckout = await page.evaluate(() => ({
    configured: window.NorwynGa4.state.configured,
    initialized: window.NorwynGa4.state.initialized,
    eventNames: (window.dataLayer || []).filter((item) => item?.[0] === "event").map((item) => item[1]),
  }));
  assert.equal(ga4BeforeCheckout.configured, expectGa4);
  assert.equal(ga4BeforeCheckout.initialized, expectGa4);
  if (expectGa4) {
    assert.ok(ga4BeforeCheckout.eventNames.includes("page_view"));
    assert.ok(ga4BeforeCheckout.eventNames.includes("lp_section_view"));
    assert.ok(ga4BeforeCheckout.eventNames.includes("view_offer"));
    assert.equal(ga4BeforeCheckout.eventNames.includes("purchase"), false);
  }
  await page.locator('[data-cta-id="final_primary"]').click({ noWaitAfter: true });
  await page.waitForTimeout(700);
  assert.ok(pixelAfterCheckout, "checkout pixel state was not captured before navigation");
  assert.equal(pixelAfterCheckout.state.initiateCheckoutSent, true);
  const pixelEventNames = pixelAfterCheckout.calls.map((call) => call[1]).filter(Boolean);
  assert.equal(pixelEventNames.filter((name) => name === "PageView").length, 1);
  assert.equal(pixelEventNames.filter((name) => name === "ViewContent").length, 1);
  assert.equal(pixelEventNames.filter((name) => name === "ViewOffer").length, 1);
  assert.equal(pixelEventNames.filter((name) => name === "InitiateCheckout").length, 1);
  assert.equal(pixelEventNames.includes("Purchase"), false);

  const sectionEvents = events.filter((event) => event.event === "lp_section_view");
  assert.equal(new Set(sectionEvents.map((event) => event.event_data.section_id)).size, 11);
  assert.ok(events.some((event) => event.event === "lp_cta_click" && event.event_data.cta_id === "final_primary"));
  assert.ok(events.some((event) => event.event === "checkout_click"));
  for (const event of events) {
    assert.equal(event.landing_key, "imersao-zumbido");
    assert.equal(event.landing_version, "variant_v1");
    assert.equal(event.product_id, "imersao_zumbido");
  }
  assert.match(checkoutUrl || "", /B47092539B/);
  assert.match(checkoutUrl || "", /off=lov69pen/);
  assert.match(checkoutUrl || "", /sck=nw_variant_smoke_1234/);
  assert.equal(events.some((event) => event.event === "Purchase"), false);

  await context.close();
  await browser.close();
  server.close();
  console.log("Imersao Zumbido variant_v1 browser QA PASS", { events: events.length, sections: sectionEvents.length, screenshots: screenshots.length, performanceMetrics });
})().catch(async (error) => {
  server.close();
  console.error(error);
  process.exit(1);
});
