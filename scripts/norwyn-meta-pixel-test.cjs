const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("apps/imersao-zumbido-hml/meta-pixel.js", "utf8");
const html = fs.readFileSync("apps/imersao-zumbido-hml/index.html", "utf8");
const build = fs.readFileSync("apps/imersao-zumbido-hml/build.mjs", "utf8");

assert.match(source, /const PIXEL_ID = "1421640192678969"/);
assert.match(source, /traffic_type/);
assert.match(source, /meta_pixel_test/);
assert.match(source, /CONSENT_KEY/);
assert.match(source, /root\.fbq\("track", "PageView"\)/);
assert.match(source, /root\.fbq\("track", "ViewContent"/);
assert.match(source, /root\.fbq\("trackCustom", "ViewOffer"/);
assert.match(source, /root\.fbq\("track", "InitiateCheckout"/);
assert.doesNotMatch(source, /root\.fbq\([^\n]*"Purchase"/);
assert.match(source, /__norwynMetaPixelInitialized/);
assert.match(source, /eventName === "checkout_click"/);
assert.match(html, /meta-pixel\.css/);
assert.match(html, /meta-pixel\.js/);
assert.match(build, /meta-pixel\.css/);
assert.match(build, /meta-pixel\.js/);

console.log("Norwyn Meta Pixel HML regression PASS");
