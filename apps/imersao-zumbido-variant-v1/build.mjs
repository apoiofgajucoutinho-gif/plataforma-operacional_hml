import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("assets", "dist/assets", { recursive: true });

for (const file of ["meta-pixel.css", "hotmart-attribution-bridge.js", "norwyn-tracking.js", "meta-pixel.js", "ga4.js", "app.js"]) {
  cpSync(file, `dist/${file}`);
}

const ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "";
const html = readFileSync("index.html", "utf8").replace("__GA4_MEASUREMENT_ID__", ga4MeasurementId.replace(/[<>&\"']/g, ""));
writeFileSync("dist/index.html", html);
