const assert = require("node:assert/strict");
const fs = require("node:fs");

const file = "D:/Jass_/Download_HD/sales_history_20260907191655_AFF6D01314581712279880348008.csv";
const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const lines = text.trim().split(/\r?\n/);
const headers = lines[0].split(";");
const rows = lines.slice(1).map((line) => {
  const cells = line.split(";");
  return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
});
const cents = (value) => Math.round(Number(String(value || "0").replace(",", ".")) * 100);
const sum = (items, column) => items.reduce((total, row) => total + cents(row[column]), 0);
const byStatus = rows.reduce((acc, row) => {
  const status = row["Status da transação"];
  acc[status] = (acc[status] ?? 0) + 1;
  return acc;
}, {});
const confirmed = rows.filter((row) => ["Aprovado", "Completo"].includes(row["Status da transação"]));
const pending = rows.filter((row) => ["Atrasado", "Aguardando Pagto"].includes(row["Status da transação"]));
const lost = rows.filter((row) => ["Expirado", "Cancelado"].includes(row["Status da transação"]));
const refunded = rows.filter((row) => row["Status da transação"] === "Reembolsado");

assert.equal(new Set(rows.map((row) => row["Código da transação"])).size, 79);
assert.deepEqual(byStatus, {
  Atrasado: 8,
  Aprovado: 4,
  "Aguardando Pagto": 1,
  Completo: 45,
  Expirado: 6,
  Reembolsado: 10,
  Cancelado: 5,
});
assert.equal(confirmed.length, 49);
assert.equal(pending.length, 9);
assert.equal(lost.length, 11);
assert.equal(refunded.length, 10);
assert.equal(confirmed.length + pending.length + lost.length + refunded.length, 79);
assert.equal(sum(rows, "Faturamento líquido do(a) Produtor(a)"), 1765268);
assert.equal(sum(confirmed, "Faturamento líquido do(a) Produtor(a)"), 1441803);
assert.equal(Math.round((refunded.length / (confirmed.length + refunded.length)) * 10000) / 100, 16.95);
console.log("Golden Hotmart 30d PASS", { confirmed: confirmed.length, totalNet: "R$ 17.652,68", refundRate: "16,95%" });
