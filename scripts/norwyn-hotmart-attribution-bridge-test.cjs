const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

global.location = { href: "https://imersaozumbido.fgajulianacoutinho.com.br/?utm_source=whatsapp" , search: "?utm_source=whatsapp" };
delete global.NorwynHotmartBridge;
require("../apps/imersao-zumbido-hml/hotmart-attribution-bridge.js");
const bridge = global.NorwynHotmartBridge;

assert.equal(bridge.isValid("https://pay.hotmart.com/B47092539B?off=lov69pen"), true);
assert.equal(bridge.isValid("https://pay.hotmart.com/B47092539B?off=changed"), false);

(async () => {
  bridge.state.enabled = false;
  bridge.state.ready = true;
  const off = await bridge.prepare({ currentTouch: { utm_source: "whatsapp" }, sessionId: "s1", visitorId: "v1" });
  assert.equal(off.bridged, false);
  assert.match(off.url, /B47092539B/);
  assert.match(off.url, /off=lov69pen/);
  assert.match(off.url, /utm_source=whatsapp/);

  bridge.state.enabled = true;
  const success = await bridge.prepare({ currentTouch: {}, sessionId: "s1", visitorId: "v1" }, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ bridged: true, sck: "nw_abcdefghijklmnopqrstuvwx", checkout_url: "https://pay.hotmart.com/B47092539B?off=lov69pen&sck=nw_abcdefghijklmnopqrstuvwx" }) }),
  });
  assert.equal(success.bridged, true);
  assert.match(success.url, /off=lov69pen/);
  assert.match(success.url, /sck=nw_/);

  for (const fetchImpl of [
    async () => { throw new Error("network"); },
    async () => ({ ok: false, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => ({ bridged: true, checkout_url: "https://evil.example/checkout" }) }),
  ]) {
    const failed = await bridge.prepare({ currentTouch: {}, sessionId: "s1", visitorId: "v1" }, { fetchImpl, timeoutMs: 5 });
    assert.equal(failed.bridged, false);
    assert.equal(bridge.isValid(failed.url), true);
    assert.match(failed.url, /off=lov69pen/);
  }

  const missingIdentity = await bridge.prepare({ currentTouch: { utm_source: "instagram" }, sessionId: null, visitorId: null });
  assert.equal(missingIdentity.url, bridge.CHECKOUT);

  const trackingSource = fs.readFileSync("apps/imersao-zumbido-hml/norwyn-tracking.js", "utf8");
  const sandbox = {
    URL, URLSearchParams, Date, Math, JSON,
    location: { href: "https://imersaozumbido.fgajulianacoutinho.com.br/whatsapp", search: "?utm_source=whatsapp", origin: "https://imersaozumbido.fgajulianacoutinho.com.br", pathname: "/" },
    document: { referrer: "" },
    localStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } },
    crypto: undefined,
    fetch: async () => ({ ok: true }),
    CustomEvent: function CustomEvent(name, init) { this.name = name; this.detail = init?.detail; },
  };
  sandbox.window = { ...sandbox, dispatchEvent() {} };
  vm.runInNewContext(trackingSource, sandbox);
  const first = sandbox.window.norwyn.context();
  const second = sandbox.window.norwyn.context();
  assert.equal(first.session.id, second.session.id, "memory fallback must preserve session when localStorage is blocked");
  assert.equal(first.visitorId, second.visitorId, "memory fallback must preserve visitor when localStorage is blocked");

  const route = fs.readFileSync("app/api/norwyn/attribution-bridge/route.ts", "utf8");
  assert.match(route, /HOTMART_ATTRIBUTION_BRIDGE/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /existing_sck_preserved/);
  assert.match(route, /off.*lov69pen/s);
  console.log("Hotmart Attribution Bridge regression PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
