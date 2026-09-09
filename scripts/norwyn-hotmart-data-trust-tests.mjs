import assert from "node:assert/strict";

function parseHotmartNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const compact = value.replace(/\s/g, "").replace(/R\$/gi, "").replace(/[^0-9,.-]/g, "");
  if (!compact) return null;
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma >= 0 && lastDot >= 0
    ? (lastComma > lastDot ? "," : ".")
    : lastComma >= 0
      ? (compact.length - lastComma - 1 === 2 ? "," : null)
      : lastDot >= 0 && compact.length - lastDot - 1 === 2 ? "." : null;
  const normalized = decimalSeparator
    ? compact.replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "").replace(decimalSeparator, ".")
    : compact.replace(/[,.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const CONFIRMED = new Set(["APPROVED", "APROVADO", "COMPLETE", "COMPLETO", "COMPLETED"]);
const PENDING = new Set(["STARTED", "WAITING_PAYMENT", "PRINTED_BILLET", "PROCESSING_TRANSACTION", "UNDER_ANALISYS", "UNDER_ANALYSIS", "PRE_ORDER", "OVERDUE"]);
const LOST = new Set(["CANCELLED", "CANCELED", "CANCELADO", "CANCELADA", "EXPIRED", "EXPIRADO", "EXPIRADA", "NO_FUNDS", "BLOCKED", "PROTESTED"]);
const REFUNDED = new Set(["REFUNDED", "PARTIALLY_REFUNDED", "REEMBOLSADO", "REEMBOLSADA"]);
const CHARGEBACK = new Set(["CHARGEBACK"]);
const LEARNING = new Set(["CLUB_FIRST_ACCESS", "CLUB_MODULE_COMPLETED", "CLUB_COURSE_COMPLETED", "CLUB_LESSON_COMPLETED", "COURSE_STARTED", "COURSE_COMPLETED", "LESSON_STARTED", "LESSON_COMPLETED", "MODULE_STARTED", "MODULE_COMPLETED", "CERTIFICATE_GENERATED", "FIRST_ACCESS"]);
function normalizeStatus(value) { return String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_") || "UNKNOWN"; }
function groupFor(status) { const s = normalizeStatus(status); if (CONFIRMED.has(s)) return "confirmed"; if (PENDING.has(s)) return "pending"; if (REFUNDED.has(s)) return "refunded"; if (CHARGEBACK.has(s)) return "chargeback"; if (LOST.has(s)) return "lost"; return "unknown"; }
function classify({ status, transactionId, currency = "BRL" }) {
  const normalized = normalizeStatus(status);
  const eventClass = LEARNING.has(normalized) ? (normalized.includes("MODULE") ? "MODULE_EVENT" : "PRODUCT_ACCESS_EVENT") : transactionId ? "SALE_TRANSACTION" : "UNKNOWN_EVENT";
  const commercialTransaction = eventClass === "SALE_TRANSACTION";
  const saleConfirmed = commercialTransaction && groupFor(status) === "confirmed";
  const isBundleChild = transactionId ? /^HP\d+C\d+$/.test(transactionId) : false;
  return {
    eventClass,
    commercialTransaction,
    saleConfirmed,
    revenueEligible: saleConfirmed && currency === "BRL" && !isBundleChild,
    studentEligible: saleConfirmed && !isBundleChild,
    saleComparable: commercialTransaction,
  };
}

assert.equal(parseHotmartNumber(1234.56), 1234.56);
assert.equal(parseHotmartNumber("1234.56"), 1234.56);
assert.equal(parseHotmartNumber("1,234.56"), 1234.56);
assert.equal(parseHotmartNumber("1.234,56"), 1234.56);
assert.equal(parseHotmartNumber("1234,56"), 1234.56);
assert.deepEqual(classify({ status: "APPROVED", transactionId: "HP123", currency: "BRL" }), { eventClass: "SALE_TRANSACTION", commercialTransaction: true, saleConfirmed: true, revenueEligible: true, studentEligible: true, saleComparable: true });
assert.deepEqual(classify({ status: "COMPLETED", transactionId: "HP124", currency: "BRL" }), { eventClass: "SALE_TRANSACTION", commercialTransaction: true, saleConfirmed: true, revenueEligible: true, studentEligible: true, saleComparable: true });
assert.equal(classify({ status: "WAITING_PAYMENT", transactionId: "HP125", currency: "BRL" }).saleConfirmed, false);
assert.equal(classify({ status: "OVERDUE", transactionId: "HP126", currency: "BRL" }).saleConfirmed, false);
assert.equal(classify({ status: "CANCELLED", transactionId: "HP127", currency: "BRL" }).saleConfirmed, false);
assert.equal(classify({ status: "EXPIRED", transactionId: "HP128", currency: "BRL" }).saleConfirmed, false);
assert.equal(classify({ status: "REFUNDED", transactionId: "HP129", currency: "BRL" }).revenueEligible, false);
assert.equal(classify({ status: "CHARGEBACK", transactionId: "HP130", currency: "BRL" }).revenueEligible, false);
assert.equal(classify({ status: "APPROVED", transactionId: "HP123", currency: "USD" }).revenueEligible, false);
assert.equal(classify({ status: "COMPLETE", transactionId: "HP123C1", currency: "BRL" }).saleComparable, true);
assert.equal(classify({ status: "COMPLETE", transactionId: "HP123C1", currency: "BRL" }).revenueEligible, false);
assert.equal(classify({ status: "COMPLETE", transactionId: "HP123C1", currency: "BRL" }).studentEligible, false);
assert.equal(classify({ status: "CLUB_MODULE_COMPLETED", transactionId: null, currency: "BRL" }).commercialTransaction, false);
console.log("Hotmart data trust parser/classification tests passed");
