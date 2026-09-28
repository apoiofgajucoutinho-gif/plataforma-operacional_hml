import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

for (const file of ["index.html", "styles.css", "testimonials.css", "hotmart-attribution-bridge.js", "norwyn-tracking.js", "app.js"]) {
  cpSync(file, `dist/${file}`);
}
cpSync("imersao-zumbido", "dist/imersao-zumbido", { recursive: true });

console.log("Static HML build ready");
