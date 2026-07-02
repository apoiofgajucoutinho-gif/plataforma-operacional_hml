export type FinancialPercentKind = "fee" | "tax" | "partnership" | "generic";

type BusinessProfileLike = {
  default_coproduction_percent?: number | string | null;
  hotmart_percent_fee?: number | string | null;
  hotmart_fixed_fee?: number | string | null;
  hotmart_withdraw_fee?: number | string | null;
  gateway_percent_fee?: number | string | null;
};

function hasOnlyIntegerDigits(value: string) {
  return /^-?\d+$/.test(value.trim());
}

function sanitizeNumberInput(value: string) {
  return value
    .replace(/[^\d,.-]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function parseFinancialNumberInput(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const sanitized = sanitizeNumberInput(value);
  if (!sanitized || sanitized === "-" || sanitized === "," || sanitized === ".") return null;

  const commaIndex = sanitized.lastIndexOf(",");
  const dotIndex = sanitized.lastIndexOf(".");
  let normalized = sanitized;

  if (commaIndex >= 0 && dotIndex >= 0) {
    normalized = commaIndex > dotIndex
      ? sanitized.replace(/\./g, "").replace(",", ".")
      : sanitized.replace(/,/g, "");
  } else if (commaIndex >= 0) {
    normalized = sanitized.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex >= 0) {
    const decimalDigits = sanitized.length - dotIndex - 1;
    normalized = decimalDigits === 3 && sanitized.split(".").length === 2
      ? sanitized.replace(/\./g, "")
      : sanitized;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeFinancialPercent(
  value: number | string | null | undefined,
  kind: FinancialPercentKind = "generic",
) {
  const parsed = parseFinancialNumberInput(value);
  if (parsed == null) return null;

  const abs = Math.abs(parsed);
  if (abs === 0) return 0;

  if (kind === "fee") {
    if (abs > 30 && abs <= 100) return parsed / 10;
    if (abs > 100) return parsed / 100;
    return parsed;
  }

  if (kind === "tax") {
    if (abs > 100) return parsed / 100;
    if (abs > 50 && abs <= 100) return parsed / 10;
    return parsed;
  }

  if (kind === "partnership") {
    if (abs > 100) return parsed / 100;
    return parsed;
  }

  if (abs > 100) return parsed / 100;
  return parsed;
}

export function normalizeFinancialMoney(value: number | string | null | undefined) {
  const parsed = parseFinancialNumberInput(value);
  if (parsed == null) return null;
  if (Number.isInteger(parsed) && Math.abs(parsed) >= 100) return parsed / 100;
  return parsed;
}

export function formatFinancialInput(value: number | string | null | undefined, decimals = 2) {
  const parsed = parseFinancialNumberInput(value);
  if (parsed == null) return "";
  return parsed.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentInput(value: number | string | null | undefined, kind: FinancialPercentKind = "generic") {
  const normalized = normalizeFinancialPercent(value, kind);
  return normalized == null ? "" : formatFinancialInput(normalized);
}

export function formatMoneyInput(value: number | string | null | undefined) {
  const normalized = normalizeFinancialMoney(value);
  return normalized == null ? "" : formatFinancialInput(normalized);
}

export function normalizeBusinessProfile<T extends BusinessProfileLike | null | undefined>(profile: T) {
  if (!profile) return profile;
  return {
    ...profile,
    default_coproduction_percent: normalizeFinancialPercent(profile.default_coproduction_percent, "partnership"),
    hotmart_percent_fee: normalizeFinancialPercent(profile.hotmart_percent_fee, "fee"),
    hotmart_fixed_fee: normalizeFinancialMoney(profile.hotmart_fixed_fee),
    hotmart_withdraw_fee: normalizeFinancialMoney(profile.hotmart_withdraw_fee),
    gateway_percent_fee: normalizeFinancialPercent(profile.gateway_percent_fee, "fee"),
  };
}

export const FinancialConfig = {
  parseNumber: parseFinancialNumberInput,
  normalizePercent: normalizeFinancialPercent,
  normalizeMoney: normalizeFinancialMoney,
  normalizeBusinessProfile,
  formatInput: formatFinancialInput,
  formatPercentInput,
  formatMoneyInput,
  integerInputWasProbablyCents: hasOnlyIntegerDigits,
};
