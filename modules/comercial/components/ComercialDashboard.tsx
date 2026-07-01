"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  GraduationCap,
  PackageCheck,
  Radar,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ExportButtons } from "@/components/ui/ExportButtons";
import type {
  ComercialAluno,
  ComercialBusinessProfile,
  ComercialBusinessTaxRule,
  ComercialContext,
  ComercialNorwynProduct,
  ComercialRawImport,
  ComercialRecebivel,
  ComercialVenda,
  ComercialStatusGroup,
} from "@/modules/comercial/types";

type TabKey = "launch" | "overview" | "sales" | "receivables" | "students" | "products" | "reconciliation" | "admin";
type PeriodKey = "today" | "yesterday" | "7d" | "15d" | "30d" | "month" | "all";
type LaunchPeriodKey = "today" | "yesterday" | "7d" | "15d" | "30d" | "month" | "launch" | "all" | "custom";
type TableKey = "sales" | "receivables" | "students";
type LaunchSalesSortKey = "latest" | "gross_desc" | "status" | "product" | "buyer";
type LaunchProductSortKey = "revenue_desc" | "sales_desc" | "pending_desc" | "share_desc" | "name";
type LaunchStatusSortKey = "order" | "count_desc" | "revenue_desc";
type LaunchSourceSortKey = "revenue_desc" | "sales_desc" | "ticket_desc" | "source";
type HypothesisResult = "pendente" | "confirmada" | "parcial" | "descartada";
type EventDomain = "commercial" | "learning" | "unknown";
type CommercialGlobalFiltersState = {
  product: string;
  status: string;
  payment: string;
  source: string;
};

type LaunchHypothesisFeedback = {
  id: string;
  hypothesis: string;
  result: HypothesisResult;
  comment: string;
  updatedAt: string;
  user: string;
};

type HotmartLossClassification = {
  motivoOriginalHotmart: string;
  categoriaMotivoNorwyn: string;
  recuperabilidade: "Alta" | "Media" | "Baixa" | "Indefinida";
  hipoteseOperacional: string;
  acaoSugerida: string;
  origemProvavel: "Cliente/Pagamento" | "Plataforma/Gateway" | "Comercial/Operacional" | "Indefinida" | "Nao informado";
  evidencias: string[];
};

const PAGE_SIZE = 20;

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "launch", label: "Lançamento" },
  { key: "overview", label: "Visão Geral" },
  { key: "sales", label: "Vendas" },
  { key: "receivables", label: "Recebíveis" },
  { key: "students", label: "Alunos" },
  { key: "products", label: "Produtos" },
  { key: "reconciliation", label: "Conciliação" },
  { key: "admin", label: "Admin" },
];

const periods: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "15d", label: "15 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Mês" },
  { key: "all", label: "Tudo" },
];

const launchPeriods: Array<{ key: LaunchPeriodKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "15d", label: "15 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Mês" },
  { key: "launch", label: "Lançamento" },
  { key: "all", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
];

const launchSalesSortOptions: Array<{ key: LaunchSalesSortKey; label: string }> = [
  { key: "latest", label: "Mais recentes" },
  { key: "gross_desc", label: "Maior valor" },
  { key: "status", label: "Status" },
  { key: "product", label: "Produto" },
  { key: "buyer", label: "Comprador" },
];

const launchProductSortOptions: Array<{ key: LaunchProductSortKey; label: string }> = [
  { key: "revenue_desc", label: "Maior receita" },
  { key: "sales_desc", label: "Mais vendas" },
  { key: "pending_desc", label: "Mais pendentes" },
  { key: "share_desc", label: "Maior participacao" },
  { key: "name", label: "Produto A-Z" },
];

const launchStatusSortOptions: Array<{ key: LaunchStatusSortKey; label: string }> = [
  { key: "order", label: "Ordem do funil" },
  { key: "count_desc", label: "Maior volume" },
  { key: "revenue_desc", label: "Maior receita" },
];

const launchSourceSortOptions: Array<{ key: LaunchSourceSortKey; label: string }> = [
  { key: "revenue_desc", label: "Maior receita" },
  { key: "sales_desc", label: "Mais vendas" },
  { key: "ticket_desc", label: "Maior ticket" },
  { key: "source", label: "Origem A-Z" },
];

const commercialStatusValues = new Set([
  "APPROVED",
  "COMPLETE",
  "STARTED",
  "WAITING_PAYMENT",
  "PRINTED_BILLET",
  "PROCESSING_TRANSACTION",
  "UNDER_ANALISYS",
  "UNDER_ANALYSIS",
  "PRE_ORDER",
  "OVERDUE",
  "CANCELLED",
  "CANCELED",
  "EXPIRED",
  "NO_FUNDS",
  "BLOCKED",
  "PROTESTED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CHARGEBACK",
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",
  "PURCHASE_CANCELED",
  "PURCHASE_CANCELLED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_BILLET_PRINTED",
  "PURCHASE_DELAYED",
  "PURCHASE_PROTEST",
  "PURCHASE_EXPIRED",
]);

const learningEventValues = new Set([
  "CLUB_FIRST_ACCESS",
  "CLUB_MODULE_COMPLETED",
  "CLUB_COURSE_COMPLETED",
  "CLUB_LESSON_COMPLETED",
  "CLUB_LESSON_STARTED",
  "COURSE_STARTED",
  "COURSE_COMPLETED",
  "LESSON_STARTED",
  "LESSON_COMPLETED",
  "MODULE_STARTED",
  "MODULE_COMPLETED",
  "QUIZ_COMPLETED",
  "CERTIFICATE_GENERATED",
  "LOGIN",
  "FIRST_ACCESS",
]);

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Base ainda sem atualizacao";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateForFilter(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthShort(value: number) {
  return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][value] ?? "-";
}

function isTodayOrFuture(value: string | null | undefined) {
  const date = dateForFilter(value);
  if (!date) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date >= today;
}

function rawImportEvent(row: ComercialRawImport) {
  const event = row.payload?.event ?? row.payload?.event_name ?? row.payload?.webhook_event ?? row.payload?.type;
  return typeof event === "string" && event.trim() ? event.trim() : "evento Hotmart";
}

function rawImportSource(row: ComercialRawImport) {
  const event = rawImportEvent(row).toLowerCase();
  if (event === "sales_history") return "Histórico";
  return "Tempo real";
}

function withinHours(value: string | null | undefined, hours: number) {
  const date = dateForFilter(value);
  if (!date) return false;
  return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseInputDate(value: string, fallback: Date, end = false) {
  const date = dateForFilter(value);
  if (!date) return fallback;
  return end ? endOfLocalDay(date) : startOfLocalDay(date);
}

function saleDate(row: ComercialVenda) {
  return dateForFilter(row.data_compra ?? row.data_aprovacao ?? row.last_event_at ?? row.imported_at ?? row.created_at);
}

function isTestTransaction(row: ComercialVenda) {
  return row.transaction_id.toUpperCase().startsWith("TESTE-");
}

function minutesSince(value: string | null | undefined) {
  const date = dateForFilter(value);
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

const commercialGroupLabels: Record<ComercialStatusGroup, string> = {
  confirmed: "Confirmada",
  pending: "Pendente",
  lost: "Perdida",
  refunded: "Reembolsada",
  chargeback: "Chargeback",
  unknown: "Nao mapeada",
};

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "unknown").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function commercialGroupFromStatus(status: string | null | undefined): ComercialStatusGroup {
  const normalized = normalizeStatus(status);
  if (["APPROVED", "COMPLETE", "PURCHASE_APPROVED", "PURCHASE_COMPLETE"].includes(normalized)) return "confirmed";
  if (["STARTED", "WAITING_PAYMENT", "PRINTED_BILLET", "PROCESSING_TRANSACTION", "UNDER_ANALISYS", "UNDER_ANALYSIS", "PRE_ORDER", "OVERDUE", "PURCHASE_BILLET_PRINTED", "PURCHASE_DELAYED"].includes(normalized)) return "pending";
  if (["REFUNDED", "PARTIALLY_REFUNDED", "PURCHASE_REFUNDED"].includes(normalized)) return "refunded";
  if (["CHARGEBACK", "PURCHASE_CHARGEBACK"].includes(normalized)) return "chargeback";
  if (["CANCELLED", "CANCELED", "EXPIRED", "NO_FUNDS", "BLOCKED", "PROTESTED", "PURCHASE_CANCELED", "PURCHASE_CANCELLED", "PURCHASE_EXPIRED", "PURCHASE_PROTEST"].includes(normalized)) return "lost";
  return "unknown";
}

function commercialGroup(row: ComercialVenda): ComercialStatusGroup {
  return row.grupo_comercial ?? commercialGroupFromStatus(row.status_normalizado ?? row.status_original ?? row.status);
}

function rawPayloadForSale(row: ComercialVenda, rawImports: ComercialRawImport[]) {
  return rawImports.find((item) => item.transaction_id === row.transaction_id)?.payload ?? null;
}

function findPayloadValue(payload: unknown, keys: string[]): unknown {
  if (!payload || typeof payload !== "object") return null;
  const stack: unknown[] = [payload];
  const normalizedKeys = keys.map((key) => key.toLowerCase());

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (normalizedKeys.includes(key.toLowerCase()) && value !== null && value !== undefined && value !== "") {
        return value;
      }
      if (value && typeof value === "object") stack.push(value);
    }
  }

  return null;
}

function eventDomainFromValue(value: string | null | undefined): EventDomain {
  const normalized = normalizeStatus(value);
  if (commercialStatusValues.has(normalized)) return "commercial";
  if (learningEventValues.has(normalized) || normalized.startsWith("CLUB_")) return "learning";
  if (normalized.includes("LESSON") || normalized.includes("MODULE") || normalized.includes("COURSE") || normalized.includes("CERTIFICATE")) {
    return "learning";
  }
  return "unknown";
}

function eventDomainLabel(domain: EventDomain) {
  if (domain === "commercial") return "Comercial";
  if (domain === "learning") return "Educacional";
  return "Nao mapeado";
}

function saleEventDomain(row: ComercialVenda, rawImports: ComercialRawImport[] = []): EventDomain {
  const values = [row.status_normalizado, row.status_original, row.status];
  if (values.some((value) => eventDomainFromValue(value) === "commercial")) return "commercial";
  if (values.some((value) => eventDomainFromValue(value) === "learning")) return "learning";

  const payload = rawPayloadForSale(row, rawImports);
  const eventValue = findPayloadValue(payload, ["event", "event_name", "webhook_event", "type"]);
  return typeof eventValue === "string" ? eventDomainFromValue(eventValue) : "unknown";
}

function rawImportEventDomain(row: ComercialRawImport): EventDomain {
  const event = rawImportEvent(row);
  const eventDomain = eventDomainFromValue(event);
  if (eventDomain !== "unknown") return eventDomain;
  const status = findPayloadValue(row.payload, ["status", "transaction_status", "purchase_status", "event"]);
  return typeof status === "string" ? eventDomainFromValue(status) : "unknown";
}

function isCommercialSale(row: ComercialVenda, rawImports: ComercialRawImport[] = []) {
  return saleEventDomain(row, rawImports) === "commercial";
}

function stringFromPayload(payload: unknown, keys: string[]) {
  const value = findPayloadValue(payload, keys);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const HOTMART_LOSS_REASON_KEYS = [
  "cancel_reason",
  "cancellation_reason",
  "reason",
  "reason_code",
  "status_reason",
  "decline_reason",
  "refused_reason",
  "payment_refused_reason",
  "refusal_reason",
  "gateway_message",
  "gateway_response",
  "acquirer_message",
  "acquirer_return_code",
  "bank_response",
  "payment_error",
  "payment_error_code",
  "error_message",
  "risk_analysis",
  "fraud_reason",
  "antifraud_status",
  "blocked_reason",
  "refund_reason",
  "chargeback_reason",
  "dispute_reason",
];

function paymentText(row: ComercialVenda, payload: unknown) {
  return [
    row.forma_pagamento,
    stringFromPayload(payload, ["method", "payment_method", "payment_method_type"]),
    row.parcelas > 1 ? `${row.parcelas}x` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function classifyHotmartLoss(row: ComercialVenda, rawImports: ComercialRawImport[]): HotmartLossClassification {
  const status = normalizeStatus(row.status_original ?? row.status);
  const payment = normalizeStatus(row.forma_pagamento);
  const payload = rawPayloadForSale(row, rawImports);
  const motivoOriginalHotmart = stringFromPayload(payload, HOTMART_LOSS_REASON_KEYS) ?? "Nao informado pela Hotmart";
  const motivo = motivoOriginalHotmart.toLowerCase();
  const isCreditCard = /CREDIT_CARD|CARD|CARTAO/.test(payment) || /CREDIT_CARD|CARD|CARTAO/i.test(paymentText(row, payload));
  const isPix = /PIX/.test(payment);
  const isBillet = /BILLET|BOLETO/.test(payment);
  let categoriaMotivoNorwyn = "Motivo nao informado";

  if (status === "CANCELLED" || status === "CANCELED") {
    if (motivoOriginalHotmart === "Nao informado pela Hotmart" && isCreditCard) categoriaMotivoNorwyn = "Cancelamento no cartao sem motivo informado";
    else if (/restri[cç][aã]o.*cart|card restriction|restricted card|cart[aã]o.*restr/i.test(motivo)) categoriaMotivoNorwyn = "Cartao recusado/restrito";
    else if (/transa[cç][aã]o recusada|transaction refused|declined|refused/i.test(motivo)) categoriaMotivoNorwyn = "Transacao recusada";
    else if (/dados.*cart|card data|invalid card|cart[aã]o.*inv[aá]lid/i.test(motivo)) categoriaMotivoNorwyn = "Dados de pagamento incorretos";
    else if (motivoOriginalHotmart !== "Nao informado pela Hotmart") categoriaMotivoNorwyn = "Cancelamento com motivo Hotmart";
    else categoriaMotivoNorwyn = "Cancelamento sem motivo informado";
  } else if (status === "EXPIRED" && isPix) categoriaMotivoNorwyn = "PIX expirado";
  else if (status === "EXPIRED" && isBillet) categoriaMotivoNorwyn = "Boleto expirado";
  else if (["WAITING_PAYMENT", "PRINTED_BILLET", "STARTED", "PROCESSING_TRANSACTION", "UNDER_ANALISYS", "UNDER_ANALYSIS", "PRE_ORDER", "OVERDUE"].includes(status)) categoriaMotivoNorwyn = "Pagamento pendente";
  else if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(status)) categoriaMotivoNorwyn = "Reembolso";
  else if (status === "CHARGEBACK") categoriaMotivoNorwyn = "Chargeback";
  else if (status === "BLOCKED") categoriaMotivoNorwyn = "Bloqueio/antifraude";
  else if (status === "PROTESTED") categoriaMotivoNorwyn = "Protestado";
  else if (commercialGroup(row) === "lost") categoriaMotivoNorwyn = "Outro";

  const highRecovery = ["PIX expirado", "Boleto expirado", "Pagamento pendente", "Dados de pagamento incorretos", "Transacao recusada"];
  const mediumRecovery = ["Cancelamento no cartao sem motivo informado", "Cartao recusado/restrito", "Cancelamento sem motivo informado", "Cancelamento com motivo Hotmart"];
  const lowRecovery = ["Reembolso", "Chargeback", "Bloqueio/antifraude", "Protestado"];
  const recuperabilidade = highRecovery.includes(categoriaMotivoNorwyn)
    ? "Alta"
    : mediumRecovery.includes(categoriaMotivoNorwyn)
      ? "Media"
      : lowRecovery.includes(categoriaMotivoNorwyn)
        ? "Baixa"
        : "Indefinida";

  let origemProvavel: HotmartLossClassification["origemProvavel"] = "Indefinida";
  if (["Cartao recusado/restrito", "Transacao recusada", "Dados de pagamento incorretos"].includes(categoriaMotivoNorwyn)) origemProvavel = "Cliente/Pagamento";
  else if (["PIX expirado", "Boleto expirado", "Pagamento pendente"].includes(categoriaMotivoNorwyn)) origemProvavel = "Cliente/Pagamento";
  else if (categoriaMotivoNorwyn === "Bloqueio/antifraude") origemProvavel = "Plataforma/Gateway";
  else if (categoriaMotivoNorwyn.includes("sem motivo informado")) origemProvavel = "Nao informado";

  const hypothesisByCategory: Record<string, string> = {
    "Cancelamento no cartao sem motivo informado": "Compra cancelada em tentativa por cartao. A Hotmart nao informou o motivo tecnico no payload.",
    "Cartao recusado/restrito": "A tentativa pode ter sido recusada por restricao do cartao.",
    "Transacao recusada": "O payload sugere uma transacao recusada, mas a causa exata depende do motivo original informado.",
    "Dados de pagamento incorretos": "A tentativa pode ter falhado por dados de pagamento preenchidos incorretamente.",
    "PIX expirado": "Pagamento via PIX expirou antes da confirmacao.",
    "Boleto expirado": "Pagamento via boleto expirou antes da confirmacao.",
    "Pagamento pendente": "Pagamento ainda indica pendencia ou processamento e precisa de acompanhamento antes de ser tratado como venda.",
    Reembolso: "Venda foi reembolsada. A causa comercial precisa ser avaliada pelo motivo original quando ele existir.",
    Chargeback: "Venda entrou em chargeback e deve ser tratada como risco financeiro.",
    "Bloqueio/antifraude": "O status sugere bloqueio ou antifraude, mas a causa exata depende do retorno da Hotmart/gateway.",
    Protestado: "O status sugere protesto e baixa recuperabilidade operacional.",
  };
  const actionByCategory: Record<string, string> = {
    "Cancelamento no cartao sem motivo informado": "Oferecer nova tentativa de pagamento ou alternativa via PIX.",
    "Cartao recusado/restrito": "Orientar nova tentativa com outro cartao ou PIX.",
    "Transacao recusada": "Orientar nova tentativa com outro cartao ou PIX.",
    "Dados de pagamento incorretos": "Orientar revisao dos dados de pagamento.",
    "PIX expirado": "Reenviar link/QR Code de pagamento se ainda fizer sentido comercial.",
    "Boleto expirado": "Reenviar link de pagamento ou oferecer PIX.",
    "Pagamento pendente": "Acompanhar confirmacao antes de considerar venda perdida.",
    Reembolso: "Nao tratar como recuperacao automatica; avaliar motivo do reembolso.",
    Chargeback: "Tratar como risco financeiro, nao como oportunidade simples de recuperacao.",
    "Bloqueio/antifraude": "Nao tratar como recuperacao simples; validar retorno do gateway/Hotmart.",
    Protestado: "Registrar e acompanhar como risco financeiro.",
  };
  const evidencias = [
    `status = ${row.status_original ?? row.status ?? "-"}`,
    `grupo_comercial = ${commercialGroupLabels[commercialGroup(row)]}`,
    `payment_type = ${row.forma_pagamento ?? "-"}`,
    stringFromPayload(payload, ["method", "payment_method", "payment_method_type"]) ? `method = ${stringFromPayload(payload, ["method", "payment_method", "payment_method_type"])}` : null,
    row.parcelas ? `installments = ${row.parcelas}` : null,
    row.source_sck ? `source_sck = ${row.source_sck}` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    motivoOriginalHotmart,
    categoriaMotivoNorwyn,
    recuperabilidade,
    hipoteseOperacional: hypothesisByCategory[categoriaMotivoNorwyn] ?? "A Hotmart nao informou causa suficiente para afirmar a origem exata da perda.",
    acaoSugerida: actionByCategory[categoriaMotivoNorwyn] ?? "Analisar manualmente antes de acionar recuperacao.",
    origemProvavel,
    evidencias,
  };
}

function riskSales(rows: ComercialVenda[]) {
  return rows.filter((row) => ["pending", "lost", "refunded", "chargeback"].includes(commercialGroup(row)));
}

function buildRiskRows(rows: ComercialVenda[], rawImports: ComercialRawImport[]) {
  return riskSales(rows)
    .map((row) => {
      const classification = classifyHotmartLoss(row, rawImports);

      return {
        sale: row,
        product: row.produto_nome || row.hotmart_product_id || "Produto nao informado",
        classification,
        reason: classification.categoriaMotivoNorwyn,
        reasonDetail: classification.motivoOriginalHotmart,
        payment: `${row.forma_pagamento ?? "-"} ${row.parcelas > 1 ? `${row.parcelas}x` : ""}`.trim(),
        value: row.valor_bruto,
        status: row.status_original ?? row.status,
        group: commercialGroup(row),
        suggestion: classification.acaoSugerida,
        buyer: row.comprador_nome ?? row.comprador_email ?? "Comprador nao informado",
        priority: row.valor_bruto >= 500 ? "Alta" : row.valor_bruto >= 150 ? "Media" : "Baixa",
        transactionId: row.transaction_id,
      };
    })
    .sort((a, b) => b.value - a.value || compareText(a.product, b.product));
}

type LaunchRiskRow = ReturnType<typeof buildRiskRows>[number];

function buildLossReasonRows(riskRows: LaunchRiskRow[]) {
  const groups = new Map<string, LaunchRiskRow[]>();
  riskRows.forEach((row) => groups.set(row.classification.categoriaMotivoNorwyn, [...(groups.get(row.classification.categoriaMotivoNorwyn) ?? []), row]));
  const total = riskRows.length || 1;
  return Array.from(groups.entries())
    .map(([reason, rows]) => ({
      reason,
      count: rows.length,
      value: rows.reduce((sum, row) => sum + row.value, 0),
      share: (rows.length / total) * 100,
      example: rows[0]?.classification.motivoOriginalHotmart ?? "-",
    }))
    .sort((a, b) => b.value - a.value || b.count - a.count);
}

type LaunchLossReasonRow = ReturnType<typeof buildLossReasonRows>[number];

function buildProductLossRows(riskRows: LaunchRiskRow[]) {
  const groups = new Map<string, LaunchRiskRow[]>();
  riskRows.forEach((row) => groups.set(row.product, [...(groups.get(row.product) ?? []), row]));
  const totalValue = riskRows.reduce((sum, row) => sum + row.value, 0) || 1;
  return Array.from(groups.entries())
    .map(([product, rows]) => {
      const value = rows.reduce((sum, row) => sum + row.value, 0);
      return {
        product,
        losses: rows.length,
        value,
        share: (value / totalValue) * 100,
        topReason: buildLossReasonRows(rows)[0]?.reason ?? "-",
      };
    })
    .sort((a, b) => b.value - a.value || b.losses - a.losses);
}

type LaunchProductLossRow = ReturnType<typeof buildProductLossRows>[number];

function buildTimelineRows(rows: ComercialVenda[]) {
  return [...rows]
    .sort((a, b) => saleTime(b) - saleTime(a))
    .map((row) => ({
      sale: row,
      date: row.data_compra ?? row.data_aprovacao ?? row.last_event_at ?? row.imported_at ?? row.created_at,
      product: row.produto_nome ?? "Produto nao informado",
      status: row.status_original ?? row.status,
      group: commercialGroup(row),
      value: row.valor_bruto,
      buyer: row.comprador_nome ?? row.comprador_email ?? "Comprador nao informado",
      payment: `${row.forma_pagamento ?? "-"} ${row.parcelas > 1 ? `${row.parcelas}x` : ""}`.trim(),
      transactionId: row.transaction_id,
    }));
}

type LaunchTimelineRow = ReturnType<typeof buildTimelineRows>[number];

function groupTone(group: ComercialStatusGroup): "ok" | "warn" | undefined {
  if (group === "confirmed") return "ok";
  if (["pending", "lost", "refunded", "chargeback"].includes(group)) return "warn";
  return undefined;
}

function hasGap(row: ComercialVenda, gap: string) {
  return Array.isArray(row.data_lacunas) && row.data_lacunas.includes(gap);
}

function isConfirmed(row: ComercialVenda) {
  return commercialGroup(row) === "confirmed";
}

function isRefundedOrChargeback(row: ComercialVenda) {
  return ["refunded", "chargeback"].includes(commercialGroup(row));
}

function filterReceivablesByPeriod(rows: ComercialRecebivel[], period: PeriodKey) {
  if (period === "all") return rows;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = period === "today"
    ? new Date(start.getTime() + 24 * 60 * 60 * 1000)
    : period === "yesterday"
      ? start
      : period === "month"
        ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
        : new Date(start.getTime() + (period === "7d" ? 7 : period === "15d" ? 15 : 30) * 24 * 60 * 60 * 1000);
  const rangeStart = period === "yesterday" ? new Date(start.getTime() - 24 * 60 * 60 * 1000) : start;

  return rows.filter((row) => {
    if (!row.data_prevista) return false;
    const date = new Date(`${row.data_prevista}T00:00:00`);
    return date >= rangeStart && date < end;
  });
}

function filterSalesByPeriod(rows: ComercialVenda[], period: PeriodKey) {
  if (period === "all") return rows;
  const now = new Date();
  const today = startOfLocalDay(now);
  const start = period === "yesterday"
    ? addDays(today, -1)
    : period === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : period === "today"
        ? today
        : addDays(today, -((period === "7d" ? 7 : period === "15d" ? 15 : 30) - 1));
  const end = period === "yesterday" ? endOfLocalDay(start) : endOfLocalDay(now);

  return rows.filter((row) => inRange(saleDate(row), { start, end, label: "", bucket: "day" }));
}

function productFilterValue(row: ComercialVenda) {
  return row.produto_nome?.trim() || row.produto_id || row.hotmart_product_id || "Produto nao informado";
}

function paymentFilterValue(row: ComercialVenda) {
  const payment = normalizeStatus(row.forma_pagamento);
  if (payment.includes("PIX")) return "PIX";
  if (payment.includes("CARD") || payment.includes("CREDIT") || payment.includes("CARTAO")) return "Cartao";
  if (payment.includes("BILLET") || payment.includes("BOLETO")) return "Boleto";
  if (payment.includes("PAYPAL")) return "PayPal";
  return payment === "UNKNOWN" ? "Nao informado" : "Outros";
}

function sourceFilterValue(row: ComercialVenda) {
  return row.source_sck?.trim() || "Sem origem";
}

function uniqueFilterOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function applyCommercialGlobalFilters(rows: ComercialVenda[], filters: CommercialGlobalFiltersState) {
  return rows.filter((row) => {
    if (filters.product !== "all" && productFilterValue(row) !== filters.product) return false;
    if (filters.status !== "all" && commercialGroup(row) !== filters.status) return false;
    if (filters.payment !== "all" && paymentFilterValue(row) !== filters.payment) return false;
    if (filters.source !== "all" && sourceFilterValue(row) !== filters.source) return false;
    return true;
  });
}

function filterByDate<T>(rows: T[], getDate: (row: T) => string | null | undefined, year: string, month: string) {
  return rows.filter((row) => {
    const date = dateForFilter(getDate(row));
    if (!date) return year === "all" && month === "all";
    if (year !== "all" && String(date.getFullYear()) !== year) return false;
    if (month !== "all" && String(date.getMonth() + 1).padStart(2, "0") !== month) return false;
    return true;
  });
}

function uniqueYears(...values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map(dateForFilter)
        .filter(Boolean)
        .map((date) => String(date!.getFullYear())),
    ),
  ).sort((a, b) => Number(b) - Number(a));
}

function uniqueMonthsForYear(values: Array<string | null | undefined>, year: string) {
  return Array.from(
    new Set(
      values
        .map(dateForFilter)
        .filter((date) => Boolean(date) && (year === "all" || String(date!.getFullYear()) === year))
        .map((date) => String(date!.getMonth() + 1).padStart(2, "0")),
    ),
  ).sort((a, b) => Number(a) - Number(b));
}

function paginate<T>(rows: T[], page: number) {
  return rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

function pageCount(rowsLength: number) {
  return Math.max(1, Math.ceil(rowsLength / PAGE_SIZE));
}

type LaunchRange = {
  label: string;
  start: Date | null;
  end: Date | null;
  bucket: "hour" | "day";
};

type LaunchAlert = {
  type: "informação" | "atenção" | "crítico" | "oportunidade";
  title: string;
  text: string;
  evidence: string;
  suggestion: string;
};

function buildLaunchRange(period: LaunchPeriodKey, launchName: string, launchStart: string, launchEnd: string): LaunchRange {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);

  if (period === "today") return { label: "Hoje", start: todayStart, end: todayEnd, bucket: "hour" };
  if (period === "yesterday") {
    const yesterday = addDays(todayStart, -1);
    return { label: "Ontem", start: yesterday, end: endOfLocalDay(yesterday), bucket: "hour" };
  }
  if (period === "7d") return { label: "Últimos 7 dias", start: addDays(todayStart, -6), end: todayEnd, bucket: "day" };
  if (period === "15d") return { label: "Últimos 15 dias", start: addDays(todayStart, -14), end: todayEnd, bucket: "day" };
  if (period === "30d") return { label: "Últimos 30 dias", start: addDays(todayStart, -29), end: todayEnd, bucket: "day" };
  if (period === "month") return { label: "Mês atual", start: new Date(now.getFullYear(), now.getMonth(), 1), end: todayEnd, bucket: "day" };
  if (period === "launch") {
    return {
      label: launchName || "Lançamento",
      start: parseInputDate(launchStart, todayStart),
      end: parseInputDate(launchEnd, todayEnd, true),
      bucket: "day",
    };
  }
  if (period === "custom") {
    return {
      label: "Personalizado",
      start: parseInputDate(launchStart, todayStart),
      end: parseInputDate(launchEnd, todayEnd, true),
      bucket: "day",
    };
  }
  return { label: "Tudo", start: null, end: null, bucket: "day" };
}

function inRange(date: Date | null, range: LaunchRange) {
  if (!date) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function launchSaleRows(rows: ComercialVenda[], range: LaunchRange, rawImports: ComercialRawImport[] = []) {
  return rows
    .filter((row) => !isTestTransaction(row))
    .filter((row) => isCommercialSale(row, rawImports))
    .filter((row) => range.start || range.end ? inRange(saleDate(row), range) : Boolean(saleDate(row)))
    .sort((a, b) => (saleDate(b)?.getTime() ?? 0) - (saleDate(a)?.getTime() ?? 0));
}

function uniqueBuyerCount(rows: ComercialVenda[]) {
  return new Set(rows.map((sale) => sale.comprador_email ?? sale.comprador_nome).filter(Boolean)).size;
}

function grossTotal(rows: ComercialVenda[]) {
  return rows.reduce((sum, sale) => sum + sale.valor_bruto, 0);
}

function normalizeProductKey(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findNorwynProductForSale(sale: ComercialVenda, products: ComercialNorwynProduct[]) {
  const candidates = [
    sale.produto_nome,
    sale.hotmart_product_id,
    typeof sale.metadata?.product_name === "string" ? sale.metadata.product_name : null,
    typeof sale.metadata?.product_id === "string" ? sale.metadata.product_id : null,
  ]
    .map(normalizeProductKey)
    .filter(Boolean);

  if (!candidates.length) return null;

  return products.find((product) => {
    const productKeys = [
      product.nome_oficial,
      product.produto_base,
      ...(product.product_aliases ?? []).filter((alias) => alias.ativo !== false).flatMap((alias) => [alias.alias, alias.produto_base]),
    ]
      .map(normalizeProductKey)
      .filter(Boolean);

    return candidates.some((candidate) => productKeys.some((key) => key === candidate || candidate.includes(key) || key.includes(candidate)));
  }) ?? null;
}

function activeTaxRuleFor(category: string | null | undefined, date: string | null | undefined, rules: ComercialBusinessTaxRule[]) {
  if (!category) return null;
  const target = dateForFilter(date) ?? new Date();
  const categoryKey = normalizeProductKey(category);

  return rules
    .filter((rule) => normalizeProductKey(rule.category) === categoryKey && rule.status !== "archived")
    .filter((rule) => {
      const start = dateForFilter(rule.starts_at);
      const end = dateForFilter(rule.ends_at);
      return (!start || start <= target) && (!end || end >= target);
    })
    .sort((a, b) => (dateForFilter(b.starts_at)?.getTime() ?? 0) - (dateForFilter(a.starts_at)?.getTime() ?? 0))[0] ?? null;
}

function buildEstimatedFinancials({
  rows,
  products,
  profile,
  taxRules,
}: {
  rows: ComercialVenda[];
  products: ComercialNorwynProduct[];
  profile: ComercialBusinessProfile | null;
  taxRules: ComercialBusinessTaxRule[];
}) {
  const confirmed = rows.filter(isConfirmed);
  const gross = grossTotal(confirmed);
  let configuredGross = 0;
  let configuredSales = 0;
  let coproduction = 0;

  let tax = 0;
  const taxBuckets = new Map<string, { category: string; gross: number; tax: number; percent: number }>();
  const pendingProducts = new Map<string, { product: string; gross: number; reasons: Set<string> }>();

  function addPending(sale: ComercialVenda, reasons: string[]) {
    const productName = sale.produto_nome ?? sale.hotmart_product_id ?? "Produto sem mapeamento";
    const current = pendingProducts.get(productName) ?? { product: productName, gross: 0, reasons: new Set<string>() };
    current.gross += sale.valor_bruto;
    reasons.forEach((reason) => current.reasons.add(reason));
    pendingProducts.set(productName, current);
  }

  confirmed.forEach((sale) => {
    const product = findNorwynProductForSale(sale, products);
    const rule = activeTaxRuleFor(product?.fiscal_category, sale.data_aprovacao ?? sale.data_compra, taxRules);

    const reasons: string[] = [];
    if (!profile) reasons.push("sem Business Profile");
    if (!product) reasons.push("sem alias/produto base");
    if (product && !product.fiscal_category) reasons.push("sem categoria fiscal");
    if (product && product.percentual_coproducao === null) reasons.push("sem coproducao");
    if (product && product.preco_oficial === null) reasons.push("sem preco");
    if (product?.fiscal_category && !rule) reasons.push("sem regra tributaria");

    if (reasons.length) {
      addPending(sale, reasons);
      return;
    }

    configuredGross += sale.valor_bruto;
    configuredSales += 1;
    coproduction += sale.valor_bruto * ((product!.percentual_coproducao ?? 0) / 100);
    const appliedRule = rule!;
    const saleTax = sale.valor_bruto * ((appliedRule.tax_percent ?? 0) / 100);
    tax += saleTax;
    const key = appliedRule.category;
    const current = taxBuckets.get(key) ?? { category: key, gross: 0, tax: 0, percent: appliedRule.tax_percent ?? 0 };
    current.gross += sale.valor_bruto;
    current.tax += saleTax;
    taxBuckets.set(key, current);
  });

  const hotmartPercentFee = configuredGross * ((profile?.hotmart_percent_fee ?? 0) / 100);
  const gatewayFee = configuredGross * ((profile?.gateway_percent_fee ?? 0) / 100);
  const fixedFee = configuredSales * (profile?.hotmart_fixed_fee ?? 0);
  const pendingGross = Math.max(0, gross - configuredGross);
  const coveragePercent = gross ? (configuredGross / gross) * 100 : null;
  const estimatedNet = configuredSales ? configuredGross - hotmartPercentFee - fixedFee - gatewayFee - coproduction - tax : null;
  const pendingList = [...pendingProducts.values()]
    .map((item) => ({ product: item.product, gross: item.gross, reasons: [...item.reasons] }))
    .sort((a, b) => b.gross - a.gross);

  return {
    gross,
    sales: confirmed.length,
    configuredGross,
    configuredSales,
    pendingGross,
    coveragePercent,
    hotmartPercentFee,
    fixedFee,
    gatewayFee,
    coproduction,
    tax,
    estimatedNet,
    taxBuckets: [...taxBuckets.values()].sort((a, b) => b.gross - a.gross),
    pendingProducts: pendingList,
    unmappedProducts: pendingList.map((item) => item.product),
    hasProfile: Boolean(profile),
  };
}

function buildTemporalRows(rows: ComercialVenda[], range: LaunchRange) {
  const groups = new Map<string, ComercialVenda[]>();
  rows.forEach((row) => {
    const date = saleDate(row);
    if (!date) return;
    const key = range.bucket === "hour"
      ? `${String(date.getHours()).padStart(2, "0")}h`
      : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return Array.from(groups.entries())
    .map(([label, sales]) => {
      const confirmed = sales.filter(isConfirmed);
      return {
        label,
        vendas: confirmed.length,
        receita: grossTotal(confirmed),
        compradores: uniqueBuyerCount(confirmed),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildProductRows(rows: ComercialVenda[]) {
  const groups = new Map<string, ComercialVenda[]>();
  rows.forEach((row) => {
    const key = row.produto_nome || row.hotmart_product_id || "Produto não informado";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  const confirmedTotal = grossTotal(rows.filter(isConfirmed));
  return Array.from(groups.entries())
    .map(([name, sales]) => {
      const confirmed = sales.filter(isConfirmed);
      const revenue = grossTotal(confirmed);
      return {
        name,
        confirmed: confirmed.length,
        revenue,
        buyers: uniqueBuyerCount(confirmed),
        ticket: confirmed.length ? revenue / confirmed.length : 0,
        pending: sales.filter((sale) => commercialGroup(sale) === "pending").length,
        lost: sales.filter((sale) => commercialGroup(sale) === "lost").length,
        share: confirmedTotal ? (revenue / confirmedTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function buildStatusRows(rows: ComercialVenda[]) {
  const order: ComercialStatusGroup[] = ["confirmed", "pending", "lost", "refunded", "chargeback", "unknown"];
  const total = rows.length || 1;
  return order.map((group) => {
    const sales = rows.filter((row) => commercialGroup(row) === group);
    const statuses = Array.from(new Set(sales.map((row) => row.status_original ?? row.status))).filter(Boolean);
    return {
      group,
      label: commercialGroupLabels[group],
      count: sales.length,
      revenue: grossTotal(sales),
      percent: (sales.length / total) * 100,
      statuses,
    };
  }).filter((row) => row.count > 0 || row.group !== "unknown");
}

function buildSourceRows(rows: ComercialVenda[]) {
  const groups = new Map<string, ComercialVenda[]>();
  rows.forEach((row) => {
    const key = row.source_sck?.trim() || "Sem source_sck";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  const confirmedTotal = grossTotal(rows.filter(isConfirmed));
  return Array.from(groups.entries())
    .map(([source, sales]) => {
      const confirmed = sales.filter(isConfirmed);
      const revenue = grossTotal(confirmed);
      return {
        source,
        sales: confirmed.length,
        revenue,
        ticket: confirmed.length ? revenue / confirmed.length : 0,
        share: confirmedTotal ? (revenue / confirmedTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function buildPaymentRows(rows: ComercialVenda[]) {
  const groups = new Map<string, ComercialVenda[]>();
  rows.forEach((row) => {
    const key = paymentFilterValue(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  const confirmedTotal = grossTotal(rows.filter(isConfirmed));
  return Array.from(groups.entries())
    .map(([payment, sales]) => {
      const confirmed = sales.filter(isConfirmed);
      const revenue = grossTotal(confirmed);
      return {
        payment,
        sales: confirmed.length,
        revenue,
        pending: sales.filter((sale) => commercialGroup(sale) === "pending").length,
        lost: sales.filter((sale) => commercialGroup(sale) === "lost").length,
        share: confirmedTotal ? (revenue / confirmedTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || compareText(a.payment, b.payment));
}

function overviewRange(period: PeriodKey): LaunchRange {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  if (period === "today") return { label: "Hoje", start: todayStart, end: endOfLocalDay(now), bucket: "hour" };
  if (period === "yesterday") {
    const yesterday = addDays(todayStart, -1);
    return { label: "Ontem", start: yesterday, end: endOfLocalDay(yesterday), bucket: "hour" };
  }
  if (period === "month") {
    return {
      label: "Mês atual",
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      bucket: "day",
    };
  }
  if (period === "all") return { label: "Todo o histórico", start: null, end: null, bucket: "day" };
  const days = period === "7d" ? 7 : period === "15d" ? 15 : 30;
  return { label: `Últimos ${days} dias`, start: addDays(todayStart, -(days - 1)), end: endOfLocalDay(now), bucket: "day" };
}

function periodLabel(period: PeriodKey) {
  return periods.find((item) => item.key === period)?.label ?? "Período";
}

function statusLabel(value: string) {
  if (value === "all") return "Todos os status";
  const labels: Record<ComercialStatusGroup, string> = {
    confirmed: "Confirmadas",
    pending: "Pendentes",
    lost: "Perdidas",
    refunded: "Reembolsos",
    chargeback: "Chargebacks",
    unknown: "Não mapeadas",
  };
  return labels[value as ComercialStatusGroup] ?? value;
}

function compactFilterLabel(value: string, fallback: string) {
  return value === "all" ? fallback : value;
}

function viewingLabel(period: PeriodKey, filters: CommercialGlobalFiltersState) {
  return [
    statusLabel(filters.status),
    periodLabel(period),
    compactFilterLabel(filters.product, "Todos os produtos"),
    compactFilterLabel(filters.payment, "Todos os pagamentos"),
    compactFilterLabel(filters.source, "Todas as origens"),
  ].join(" • ");
}

function buildOverviewSummary({
  period,
  confirmed,
  gross,
  estimatedFinancials,
  topProduct,
  pending,
  lost,
  refunded,
  hasOfficialNet,
  hasOfficialReceivables,
}: {
  period: PeriodKey;
  confirmed: number;
  gross: number;
  estimatedFinancials: ReturnType<typeof buildEstimatedFinancials>;
  topProduct: string | null;
  pending: number;
  lost: number;
  refunded: number;
  hasOfficialNet: boolean;
  hasOfficialReceivables: boolean;
}) {
  const productText = topProduct ? ` O produto com maior participação foi ${topProduct}.` : "";
  const riskText = [
    pending ? `${pending} pendentes` : null,
    lost ? `${lost} perdas comerciais` : null,
    refunded ? `${refunded} reembolsos/chargebacks` : null,
  ].filter(Boolean).join(", ");
  const estimateText = estimatedFinancials.estimatedNet === null
    ? " Estimativa Norwyn de liquido/imposto ainda indisponivel porque nenhum produto configurado entrou no filtro."
    : ` Estimativa Norwyn: liquido de ${formatMoney(estimatedFinancials.estimatedNet)}, imposto/DAS de ${formatMoney(estimatedFinancials.tax)} e cobertura de ${estimatedFinancials.coveragePercent === null ? "-" : formatPercent(estimatedFinancials.coveragePercent)}.`;
  const dataText = !hasOfficialNet || !hasOfficialReceivables
    ? " Valores líquidos e recebíveis oficiais ainda não foram informados pela Hotmart neste payload."
    : " Valores líquidos e recebíveis oficiais estão disponíveis para o filtro atual.";

  return `No período ${periodLabel(period).toLowerCase()}, foram registradas ${confirmed} vendas confirmadas, com receita bruta de ${formatMoney(gross)}.${productText}${riskText ? ` Há ${riskText} no funil.` : ""}${estimateText}${dataText}`;
}

type LaunchTemporalRow = ReturnType<typeof buildTemporalRows>[number];
type LaunchProductRow = ReturnType<typeof buildProductRows>[number];
type LaunchStatusRow = ReturnType<typeof buildStatusRows>[number];
type LaunchSourceRow = ReturnType<typeof buildSourceRows>[number];

function saleTime(row: ComercialVenda) {
  return saleDate(row)?.getTime() ?? 0;
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").localeCompare(b ?? "", "pt-BR", { sensitivity: "base" });
}

function sortLaunchSales(rows: ComercialVenda[], sort: LaunchSalesSortKey) {
  const sorted = [...rows];
  if (sort === "gross_desc") return sorted.sort((a, b) => b.valor_bruto - a.valor_bruto);
  if (sort === "status") return sorted.sort((a, b) => compareText(a.status_original ?? a.status, b.status_original ?? b.status) || saleTime(b) - saleTime(a));
  if (sort === "product") return sorted.sort((a, b) => compareText(a.produto_nome, b.produto_nome) || saleTime(b) - saleTime(a));
  if (sort === "buyer") return sorted.sort((a, b) => compareText(a.comprador_nome ?? a.comprador_email, b.comprador_nome ?? b.comprador_email) || saleTime(b) - saleTime(a));
  return sorted.sort((a, b) => saleTime(b) - saleTime(a));
}

function sortLaunchProducts(rows: LaunchProductRow[], sort: LaunchProductSortKey) {
  const sorted = [...rows];
  if (sort === "sales_desc") return sorted.sort((a, b) => b.confirmed - a.confirmed || b.revenue - a.revenue);
  if (sort === "pending_desc") return sorted.sort((a, b) => b.pending - a.pending || b.revenue - a.revenue);
  if (sort === "share_desc") return sorted.sort((a, b) => b.share - a.share || b.revenue - a.revenue);
  if (sort === "name") return sorted.sort((a, b) => compareText(a.name, b.name));
  return sorted.sort((a, b) => b.revenue - a.revenue);
}

function sortLaunchStatus(rows: LaunchStatusRow[], sort: LaunchStatusSortKey) {
  const sorted = [...rows];
  if (sort === "count_desc") return sorted.sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  if (sort === "revenue_desc") return sorted.sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  return sorted;
}

function sortLaunchSources(rows: LaunchSourceRow[], sort: LaunchSourceSortKey) {
  const sorted = [...rows];
  if (sort === "sales_desc") return sorted.sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
  if (sort === "ticket_desc") return sorted.sort((a, b) => b.ticket - a.ticket || b.revenue - a.revenue);
  if (sort === "source") return sorted.sort((a, b) => compareText(a.source, b.source));
  return sorted.sort((a, b) => b.revenue - a.revenue);
}

function buildCommercialHypotheses({
  riskRows,
  productLossRows,
  lossReasonRows,
  sourceRows,
  productRows,
}: {
  riskRows: LaunchRiskRow[];
  productLossRows: LaunchProductLossRow[];
  lossReasonRows: LaunchLossReasonRow[];
  sourceRows: LaunchSourceRow[];
  productRows: LaunchProductRow[];
}) {
  const hypotheses: string[] = [];
  const topLossReason = lossReasonRows[0];
  const topLossProduct = productLossRows[0];
  const topSource = sourceRows[0];
  const topProduct = productRows[0];

  if (topLossReason) {
    hypotheses.push(`${topLossReason.reason} aparece como principal friccao comercial do periodo.`);
  }

  if (topLossProduct) {
    hypotheses.push(`${topLossProduct.product} concentra a maior parte da receita potencial em risco.`);
  }

  if (topSource && topSource.source !== "Sem source_sck") {
    hypotheses.push(`${topSource.source} e a origem com melhor leitura de receita bruta confirmada.`);
  }

  if (topProduct && topProduct.share >= 45) {
    hypotheses.push(`${topProduct.name} esta puxando o lancamento e pode orientar a mensagem comercial.`);
  }

  if (riskRows.some((row) => normalizeStatus(row.payment).includes("PIX") || normalizeStatus(row.payment).includes("BILLET") || normalizeStatus(row.payment).includes("BOLETO"))) {
    hypotheses.push("Pagamentos por PIX/boleto podem exigir acompanhamento mais rapido para evitar perda por prazo.");
  }

  if (!hypotheses.length) {
    hypotheses.push("O periodo ainda nao tem volume suficiente para uma hipotese comercial forte.");
  }

  return Array.from(new Set(hypotheses)).slice(0, 6);
}

function previousRange(range: LaunchRange): LaunchRange | null {
  if (!range.start || !range.end) return null;
  const duration = range.end.getTime() - range.start.getTime();
  const previousEnd = new Date(range.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { label: "Período anterior", start: previousStart, end: previousEnd, bucket: range.bucket };
}

function buildLaunchAlerts(rows: ComercialVenda[], rawImports: ComercialRawImport[], productRows: ReturnType<typeof buildProductRows>, riskRows: LaunchRiskRow[]) {
  const alerts: LaunchAlert[] = [];
  const latestSale = rows[0] ?? null;
  const lastMinutes = latestSale ? minutesSince(latestSale.data_compra ?? latestSale.data_aprovacao ?? latestSale.last_event_at ?? latestSale.imported_at) : null;
  const pending = rows.filter((sale) => commercialGroup(sale) === "pending");
  const boletoPix = pending.filter((sale) => normalizeStatus(sale.forma_pagamento).includes("BILLET") || normalizeStatus(sale.forma_pagamento).includes("BOLETO") || normalizeStatus(sale.forma_pagamento).includes("PIX"));
  const refunded = rows.filter(isRefundedOrChargeback);
  const missingSource = rows.filter((sale) => !sale.source_sck);
  const financialGap = rows.filter((sale) => sale.valor_liquido === null || sale.valor_liquido === undefined || sale.taxas === null || sale.taxas === undefined || !sale.expected_payment_date);
  const recentRaw = rawImports.filter((row) => withinHours(row.received_at, 1)).length;
  const riskTotal = riskRows.reduce((sum, row) => sum + row.value, 0);
  const topRiskProduct = buildProductLossRows(riskRows)[0];
  const topRiskPayment = Array.from(
    riskRows.reduce((map, row) => {
      const key = row.payment || "Sem pagamento";
      const current = map.get(key) ?? { payment: key, count: 0, value: 0 };
      map.set(key, { payment: key, count: current.count + 1, value: current.value + row.value });
      return map;
    }, new Map<string, { payment: string; count: number; value: number }>()),
  ).map(([, value]) => value).sort((a, b) => b.count - a.count || b.value - a.value)[0];

  alerts.push({
    type: latestSale && lastMinutes !== null && lastMinutes <= 120 ? "informação" : "atenção",
    title: latestSale ? "Última venda" : "Sem venda no período",
    text: latestSale && lastMinutes !== null ? `Última venda aconteceu há ${lastMinutes} minutos.` : "Nenhuma venda encontrada no período selecionado.",
    evidence: latestSale ? `${latestSale.transaction_id} · ${latestSale.produto_nome ?? "produto sem nome"}` : "Sem transações no filtro atual.",
    suggestion: latestSale ? "Acompanhar se o ritmo continua nas próximas horas." : "Validar se o filtro está correto ou se o lançamento está sem movimentação.",
  });

  if (!recentRaw) {
    alerts.push({
      type: "atenção",
      title: "Sem evento recente",
      text: "Sem novas vendas/eventos na última hora.",
      evidence: "0 eventos Hotmart recebidos nos últimos 60 minutos.",
      suggestion: "Verificar n8n/Hotmart apenas se uma venda real era esperada nesse intervalo.",
    });
  }

  if (pending.length) {
    alerts.push({
      type: "atenção",
      title: "Pagamentos pendentes",
      text: `Existem ${pending.length} pagamentos pendentes no período.`,
      evidence: `${boletoPix.length} pendentes parecem boleto/PIX aguardando confirmação.`,
      suggestion: "Acompanhar confirmação antes de considerar como venda realizada.",
    });
  }

  const dominant = productRows[0];
  if (dominant && dominant.share >= 60) {
    alerts.push({
      type: "oportunidade",
      title: "Produto dominante",
      text: `${dominant.name} concentra ${dominant.share.toFixed(1)}% da receita bruta confirmada.`,
      evidence: `${dominant.confirmed} vendas confirmadas e ${formatMoney(dominant.revenue)} de receita bruta.`,
      suggestion: "Usar esse produto como referência para leitura do lançamento atual.",
    });
  }

  if (riskRows.length) {
    alerts.push({
      type: "atenção",
      title: "Receita em risco",
      text: `${riskRows.length} oportunidades pendentes/perdidas somam ${formatMoney(riskTotal)} em valor bruto potencial.`,
      evidence: "Estimativa baseada em receita bruta potencial, nao em receita perdida oficial.",
      suggestion: "Priorizar casos com motivo de pagamento e maior valor bruto.",
    });
  }

  const missingDetailedReason = riskRows.filter((row) => row.classification.motivoOriginalHotmart === "Nao informado pela Hotmart");
  const cardLosses = riskRows.filter((row) => /CREDIT_CARD|CARD|CARTAO/.test(normalizeStatus(row.payment)));
  const recoverable = riskRows.filter((row) => ["Alta", "Media"].includes(row.classification.recuperabilidade));

  if (missingDetailedReason.length) {
    alerts.push({
      type: "atenção",
      title: "Motivo Hotmart ausente",
      text: `${missingDetailedReason.length} perdas nao possuem motivo detalhado informado pela Hotmart.`,
      evidence: "A categoria Norwyn e uma classificacao operacional derivada de status e pagamento.",
      suggestion: "Usar a categoria Norwyn como apoio, nao como causa oficial da perda.",
    });
  }

  if (cardLosses.length) {
    alerts.push({
      type: "atenção",
      title: "Perdas em cartao",
      text: `${cardLosses.length} perdas parecem relacionadas a tentativa por cartao.`,
      evidence: `${formatMoney(cardLosses.reduce((sum, row) => sum + row.value, 0))} em valor bruto potencial associado.`,
      suggestion: "Oferecer nova tentativa de pagamento ou PIX quando fizer sentido comercial.",
    });
  }

  if (recoverable.length) {
    alerts.push({
      type: "oportunidade",
      title: "Recuperacao comercial",
      text: `${recoverable.length} oportunidades tem recuperabilidade alta ou media.`,
      evidence: "Classificacao deterministica baseada em status, pagamento e motivo original quando disponivel.",
      suggestion: "Comecar pelos casos de maior valor e maior recuperabilidade.",
    });
  }

  if (topRiskProduct) {
    alerts.push({
      type: "atenção",
      title: "Produto com maior perda",
      text: `${topRiskProduct.product} concentra ${formatPercent(topRiskProduct.share)} da receita potencial em risco.`,
      evidence: `${topRiskProduct.losses} oportunidades e ${formatMoney(topRiskProduct.value)} em bruto potencial.`,
      suggestion: "Validar pagina, preco, link e argumento de recuperacao desse produto.",
    });
  }

  if (topRiskPayment) {
    alerts.push({
      type: "atenção",
      title: "Forma de pagamento sensivel",
      text: `${topRiskPayment.payment} aparece em ${topRiskPayment.count} oportunidades pendentes/perdidas.`,
      evidence: `${formatMoney(topRiskPayment.value)} em bruto potencial associado.`,
      suggestion: "Oferecer alternativa de pagamento quando fizer sentido.",
    });
  }

  if (refunded.length) {
    alerts.push({
      type: "crítico",
      title: "Reembolso ou chargeback",
      text: `Houve ${refunded.length} reembolsos/chargebacks no período.`,
      evidence: `${formatMoney(grossTotal(refunded))} em valor bruto associado.`,
      suggestion: "Validar motivo e não somar esses valores como venda saudável.",
    });
  }

  if (financialGap.length) {
    alerts.push({
      type: "informação",
      title: "Lacuna financeira",
      text: "Valor líquido, taxas ou recebíveis oficiais ainda não vieram em parte dos payloads Hotmart.",
      evidence: `${financialGap.length} vendas possuem lacunas financeiras.`,
      suggestion: "Usar receita bruta para leitura do lançamento e não tomar decisão por líquido/saldo ainda.",
    });
  }

  if (missingSource.length) {
    alerts.push({
      type: "atenção",
      title: "Origem ausente",
      text: `${missingSource.length} vendas não possuem source_sck informado.`,
      evidence: "Sem source_sck não há atribuição segura por campanha/origem.",
      suggestion: "Conferir UTMs/SCK nos links usados no lançamento.",
    });
  }

  return alerts.slice(0, 10);
}

export function ComercialDashboard({ context }: { context: ComercialContext }) {
  const [activeTab, setActiveTab] = useState<TabKey>("launch");
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [launchPeriod, setLaunchPeriod] = useState<LaunchPeriodKey>("today");
  const [launchName, setLaunchName] = useState("Mini lançamento — Junho/2026");
  const [launchStart, setLaunchStart] = useState("2026-06-01");
  const [launchEnd, setLaunchEnd] = useState("2026-06-30");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [commercialProductFilter, setCommercialProductFilter] = useState("all");
  const [commercialStatusFilter, setCommercialStatusFilter] = useState("all");
  const [commercialPaymentFilter, setCommercialPaymentFilter] = useState("all");
  const [commercialSourceFilter, setCommercialSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [receivablesPage, setReceivablesPage] = useState(1);
  const [studentsPage, setStudentsPage] = useState(1);

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "comercial",
        pagePath: "/comercial",
        pageLabel: activeTab === "overview" ? "Comercial: Visao Geral" : `Comercial: ${tabs.find((tab) => tab.key === activeTab)?.label ?? activeTab}`,
      }),
      keepalive: true,
    });
  }, [activeTab]);

  const visibleTabs = context.canWrite ? tabs : tabs.filter((tab) => tab.key !== "admin");
  const commercialSales = useMemo(
    () => context.vendas.filter((sale) => !isTestTransaction(sale) && isCommercialSale(sale, context.rawImports)),
    [context.rawImports, context.vendas],
  );
  const learningSales = useMemo(
    () => context.vendas.filter((sale) => saleEventDomain(sale, context.rawImports) === "learning"),
    [context.rawImports, context.vendas],
  );
  const commercialGlobalFilters = useMemo<CommercialGlobalFiltersState>(
    () => ({
      product: commercialProductFilter,
      status: commercialStatusFilter,
      payment: commercialPaymentFilter,
      source: commercialSourceFilter,
    }),
    [commercialPaymentFilter, commercialProductFilter, commercialSourceFilter, commercialStatusFilter],
  );
  const commercialFilterOptions = useMemo(
    () => ({
      products: uniqueFilterOptions(commercialSales.map(productFilterValue)),
      payments: uniqueFilterOptions(commercialSales.map(paymentFilterValue)),
      sources: uniqueFilterOptions(commercialSales.map(sourceFilterValue)),
    }),
    [commercialSales],
  );
  const overviewSales = useMemo(
    () => applyCommercialGlobalFilters(filterSalesByPeriod(commercialSales, period), commercialGlobalFilters),
    [commercialGlobalFilters, commercialSales, period],
  );
  const filteredReceivables = useMemo(() => filterReceivablesByPeriod(context.recebiveis, period), [context.recebiveis, period]);
  const confirmedSales = overviewSales.filter(isConfirmed);
  const pendingSales = overviewSales.filter((sale) => commercialGroup(sale) === "pending");
  const lostSales = overviewSales.filter((sale) => commercialGroup(sale) === "lost");
  const refundedSales = overviewSales.filter(isRefundedOrChargeback);
  const grossRevenue = confirmedSales.reduce((sum, sale) => sum + sale.valor_bruto, 0);
  const confirmedSalesWithNet = confirmedSales.filter((sale) => sale.valor_liquido !== null && sale.valor_liquido !== undefined);
  const netRevenue = confirmedSalesWithNet.reduce((sum, sale) => sum + Number(sale.valor_liquido), 0);
  const pendingGross = pendingSales.reduce((sum, sale) => sum + sale.valor_bruto, 0);
  const boletoPixPending = pendingSales.filter((sale) => normalizeStatus(sale.forma_pagamento).includes("BILLET") || normalizeStatus(sale.forma_pagamento).includes("BOLETO") || normalizeStatus(sale.forma_pagamento).includes("PIX"));
  const receivableTotal = filteredReceivables
    .filter((item) => ["previsto", "disponivel"].includes(item.status) && item.fonte_previsao === "hotmart" && item.valor_liquido !== null && item.valor_liquido !== undefined && isTodayOrFuture(item.data_prevista))
    .reduce((sum, item) => sum + Number(item.valor_liquido), 0);
  const realizedTotal = context.recebiveis
    .filter((item) => ["recebido", "disponivel"].includes(item.status) && item.fonte_previsao === "hotmart" && item.valor_liquido !== null && item.valor_liquido !== undefined)
    .reduce((sum, item) => sum + Number(item.valor_liquido), 0);
  const uniqueBuyers = new Set(confirmedSales.map((sale) => sale.comprador_email ?? sale.comprador_nome).filter(Boolean)).size;
  const grossTicket = confirmedSales.length ? grossRevenue / confirmedSales.length : 0;
  const netTicket = confirmedSalesWithNet.length ? netRevenue / confirmedSalesWithNet.length : 0;
  const unclassifiedSales = commercialSales.filter((sale) => !sale.produto_id).length;
  const dataGaps = commercialSales.filter((sale) => Array.isArray(sale.data_lacunas) && sale.data_lacunas.length > 0);
  const confirmedWithoutForecast = confirmedSales.filter((sale) => hasGap(sale, "expected_payment_date_missing"));
  const confirmedWithoutNet = confirmedSales.filter((sale) => hasGap(sale, "net_amount_missing") || sale.valor_liquido === null || sale.valor_liquido === undefined);
  const unmappedStatus = commercialSales.filter((sale) => commercialGroup(sale) === "unknown");
  const realtimeImports = context.rawImports.filter((row) => rawImportSource(row) === "Tempo real");
  const recentRealtimeImports = realtimeImports.filter((row) => withinHours(row.received_at, 24));
  const latestRawImport = context.rawImports[0] ?? null;
  const expiringStudents = context.alunos.filter((student) => {
    if (!student.acesso_expira_em) return false;
    const expiry = new Date(`${student.acesso_expira_em}T00:00:00`);
    const now = new Date();
    const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
    return expiry >= now && expiry <= limit;
  }).length;

  const allDates = [
    ...commercialSales.map((item) => item.data_compra ?? item.data_aprovacao),
    ...context.recebiveis.map((item) => item.data_prevista),
    ...context.alunos.map((item) => item.ultima_compra_at),
  ];
  const years = uniqueYears(...allDates);
  const months = uniqueMonthsForYear(allDates, yearFilter);

  const salesRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterByDate(commercialSales, (row) => row.data_compra ?? row.data_aprovacao, yearFilter, monthFilter)
      .filter((row) => statusFilter === "all" || commercialGroup(row) === statusFilter || row.status.toLowerCase() === statusFilter.toLowerCase())
      .filter((row) => {
        if (!term) return true;
        return [row.transaction_id, row.comprador_nome, row.comprador_email, row.produto_nome, row.forma_pagamento]
          .some((value) => String(value ?? "").toLowerCase().includes(term));
      });
  }, [commercialSales, monthFilter, search, statusFilter, yearFilter]);

  const receivableRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterByDate(filteredReceivables, (row) => row.data_prevista, yearFilter, monthFilter)
      .filter((row) => statusFilter === "all" || row.status === statusFilter || row.fonte_previsao === statusFilter)
      .filter((row) => {
        if (!term) return true;
        return [row.transaction_id, row.status, row.fonte_previsao].some((value) => String(value ?? "").toLowerCase().includes(term));
      })
      .sort((a, b) => {
        const aDate = dateForFilter(a.data_prevista)?.getTime() ?? 0;
        const bDate = dateForFilter(b.data_prevista)?.getTime() ?? 0;
        return period === "all" ? bDate - aDate : aDate - bDate;
      });
  }, [filteredReceivables, monthFilter, period, search, statusFilter, yearFilter]);

  const studentRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterByDate(context.alunos, (row) => row.ultima_compra_at ?? row.primeira_compra_at, yearFilter, monthFilter)
      .filter((row) => statusFilter === "all" || row.status_acesso === statusFilter)
      .filter((row) => {
        if (!term) return true;
        return [row.nome, row.email, row.telefone, row.status_acesso].some((value) => String(value ?? "").toLowerCase().includes(term));
      });
  }, [context.alunos, monthFilter, search, statusFilter, yearFilter]);
  const launchRange = useMemo(() => buildLaunchRange(launchPeriod, launchName, launchStart, launchEnd), [launchEnd, launchName, launchPeriod, launchStart]);
  const launchRows = useMemo(
    () => applyCommercialGlobalFilters(launchSaleRows(context.vendas, launchRange, context.rawImports), commercialGlobalFilters),
    [commercialGlobalFilters, context.rawImports, context.vendas, launchRange],
  );
  const launchConfirmed = launchRows.filter(isConfirmed);
  const launchPending = launchRows.filter((sale) => commercialGroup(sale) === "pending");
  const launchLost = launchRows.filter((sale) => commercialGroup(sale) === "lost");
  const launchRefunded = launchRows.filter(isRefundedOrChargeback);
  const launchGross = grossTotal(launchConfirmed);
  const launchUniqueBuyers = uniqueBuyerCount(launchConfirmed);
  const launchTicket = launchConfirmed.length ? launchGross / launchConfirmed.length : 0;
  const launchLatestSale = launchRows[0] ?? null;
  const launchTemporalRows = buildTemporalRows(launchRows, launchRange);
  const launchProductRows = buildProductRows(launchRows);
  const launchStatusRows = buildStatusRows(launchRows);
  const launchSourceRows = buildSourceRows(launchRows);
  const launchRiskRows = buildRiskRows(launchRows, context.rawImports);
  const launchLossReasonRows = buildLossReasonRows(launchRiskRows);
  const launchProductLossRows = buildProductLossRows(launchRiskRows);
  const launchTimelineRows = buildTimelineRows(launchRows);
  const launchPreviousRange = previousRange(launchRange);
  const launchPreviousRows = launchPreviousRange ? applyCommercialGlobalFilters(launchSaleRows(context.vendas, launchPreviousRange, context.rawImports), commercialGlobalFilters) : [];
  const launchPreviousConfirmed = launchPreviousRows.filter(isConfirmed);
  const launchAlerts = buildLaunchAlerts(launchRows, context.rawImports, launchProductRows, launchRiskRows);
  const launchRawLast24h = context.rawImports.filter((row) => withinHours(row.received_at, 24));
  const launchRawLastHour = context.rawImports.filter((row) => withinHours(row.received_at, 1));
  const launchDataGaps = launchRows.filter((sale) => Array.isArray(sale.data_lacunas) && sale.data_lacunas.length > 0);
  const launchMissingSource = launchRows.filter((sale) => !sale.source_sck);
  const launchMissingBuyerEmail = launchRows.filter((sale) => !sale.comprador_email);
  const launchMissingProduct = launchRows.filter((sale) => !sale.produto_id);
  const launchUnknownStatus = launchRows.filter((sale) => commercialGroup(sale) === "unknown");
  const launchEstimatedFinancials = buildEstimatedFinancials({
    rows: launchRows,
    products: context.norwynProducts,
    profile: context.businessProfile,
    taxRules: context.taxRules,
  });
  const overviewEstimatedFinancials = buildEstimatedFinancials({
    rows: overviewSales,
    products: context.norwynProducts,
    profile: context.businessProfile,
    taxRules: context.taxRules,
  });
  const officialReceivables = filteredReceivables.filter((item) => ["previsto", "disponivel"].includes(item.status) && item.fonte_previsao === "hotmart" && item.valor_liquido !== null && item.valor_liquido !== undefined && isTodayOrFuture(item.data_prevista));
  const hasOfficialNet = confirmedSalesWithNet.length > 0;
  const hasOfficialReceivables = officialReceivables.length > 0;
  const overviewTemporalRows = buildTemporalRows(overviewSales, overviewRange(period));
  const overviewProductRows = buildProductRows(overviewSales);
  const overviewStatusRows = buildStatusRows(overviewSales);
  const overviewPaymentRows = buildPaymentRows(overviewSales);
  const overviewSourceRows = buildSourceRows(overviewSales);
  const overviewViewingLabel = viewingLabel(period, commercialGlobalFilters);
  const overviewSummary = buildOverviewSummary({
    period,
    confirmed: confirmedSales.length,
    gross: grossRevenue,
    estimatedFinancials: overviewEstimatedFinancials,
    topProduct: overviewProductRows[0]?.name ?? null,
    pending: pendingSales.length,
    lost: lostSales.length,
    refunded: refundedSales.length,
    hasOfficialNet,
    hasOfficialReceivables,
  });

  useEffect(() => {
    setMonthFilter("all");
  }, [yearFilter]);

  useEffect(() => {
    setSalesPage(1);
    setReceivablesPage(1);
    setStudentsPage(1);
  }, [activeTab, monthFilter, period, search, statusFilter, yearFilter]);

  if (context.diagnostic) {
    return (
      <section className="space-y-6">
        <Header updatedAt={context.updatedAt} />
        <Card className="p-8">
          <h2 className="text-xl font-black text-brand-teal">Comercial indisponivel</h2>
          <p className="mt-3 text-brand-teal/70">{context.diagnostic}</p>
          <p className="mt-4 text-sm font-bold text-brand-teal/55">
            Se estiver testando local, aplique a migration `0037_comercial_module.sql` no Supabase usado pelo `.env.local`.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Header updatedAt={context.updatedAt} />

      <div className="flex flex-wrap gap-3">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md border px-5 py-3 text-sm font-black ${
              activeTab === tab.key ? "border-brand-clay bg-brand-clay text-white" : "border-brand-sand bg-white/80 text-brand-teal"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "launch" ? (
        <LaunchIntelligencePanel
          updatedAt={context.updatedAt}
          period={launchPeriod}
          setPeriod={setLaunchPeriod}
          launchName={launchName}
          setLaunchName={setLaunchName}
          launchStart={launchStart}
          setLaunchStart={setLaunchStart}
          launchEnd={launchEnd}
          setLaunchEnd={setLaunchEnd}
          filters={commercialGlobalFilters}
          filterOptions={commercialFilterOptions}
          onProductFilter={setCommercialProductFilter}
          onStatusFilter={setCommercialStatusFilter}
          onPaymentFilter={setCommercialPaymentFilter}
          onSourceFilter={setCommercialSourceFilter}
          range={launchRange}
          rows={launchRows}
          confirmed={launchConfirmed}
          pending={launchPending}
          lost={launchLost}
          refunded={launchRefunded}
          gross={launchGross}
          ticket={launchTicket}
          buyers={launchUniqueBuyers}
          latestSale={launchLatestSale}
          temporalRows={launchTemporalRows}
          productRows={launchProductRows}
          statusRows={launchStatusRows}
          sourceRows={launchSourceRows}
          riskRows={launchRiskRows}
          lossReasonRows={launchLossReasonRows}
          productLossRows={launchProductLossRows}
          timelineRows={launchTimelineRows}
          alerts={launchAlerts}
          previousConfirmed={launchPreviousConfirmed}
          allSales={commercialSales}
          rawImports={context.rawImports}
          learningIgnored={learningSales.length}
          rawLast24h={launchRawLast24h.length}
          rawLastHour={launchRawLastHour.length}
          latestRaw={latestRawImport}
          dataGaps={launchDataGaps.length}
          missingNet={launchRows.filter((sale) => sale.valor_liquido === null || sale.valor_liquido === undefined).length}
          missingFees={launchRows.filter((sale) => sale.taxas === null || sale.taxas === undefined).length}
          missingForecast={launchRows.filter((sale) => !sale.expected_payment_date).length}
          missingSource={launchMissingSource.length}
          missingBuyerEmail={launchMissingBuyerEmail.length}
          missingProduct={launchMissingProduct.length}
          unknownStatus={launchUnknownStatus.length}
          estimatedFinancials={launchEstimatedFinancials}
        />
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <OverviewFilterBar
            period={period}
            setPeriod={setPeriod}
            filters={commercialGlobalFilters}
            options={commercialFilterOptions}
            onProduct={setCommercialProductFilter}
            onStatus={setCommercialStatusFilter}
            onPayment={setCommercialPaymentFilter}
            onSource={setCommercialSourceFilter}
          />
          <div className="rounded-md border border-brand-sand bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-wide text-brand-teal/75">
            Visualizando: <span className="text-brand-teal">{overviewViewingLabel}</span>
          </div>

          <Card className="p-4">
            <p className="text-xs font-black uppercase text-brand-clay">Resumo do Período</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-brand-teal/75">{overviewSummary}</p>
            <div className="mt-3 inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-800">
              Fonte financeira: Receita Bruta Oficial Hotmart
            </div>
          </Card>

          {(confirmedWithoutNet.length > 0 || confirmedWithoutForecast.length > 0) ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              Receita líquida e recebíveis oficiais podem estar indisponíveis quando a Hotmart não retorna esses campos no payload.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<ReceiptText />} label="Vendas confirmadas" value={confirmedSales.length} helper="no período filtrado" />
            <Metric icon={<WalletCards />} label="Faturamento bruto" value={formatMoney(grossRevenue)} helper="receita bruta no período filtrado" />
            <Metric icon={<TrendingUp />} label="Lucro líquido estimado" value={overviewEstimatedFinancials.estimatedNet === null ? "Indisponível" : formatMoney(overviewEstimatedFinancials.estimatedNet)} helper="Estimativa Norwyn no filtro" />
            <Metric icon={<ReceiptText />} label="Imposto estimado" value={formatMoney(overviewEstimatedFinancials.tax)} helper="DAS estimado pelas regras vigentes" />
            <Metric
              icon={<CheckCircle2 />}
              label="Líquido informado"
              value={hasOfficialNet ? formatMoney(netRevenue) : "Indisponível"}
              helper={hasOfficialNet ? "líquido oficial retornado no filtro" : "Hotmart não informou líquido oficial"}
            />
            <Metric
              icon={<CalendarClock />}
              label="A receber oficial Hotmart"
              value={hasOfficialReceivables ? formatMoney(receivableTotal) : "Indisponível"}
              helper={hasOfficialReceivables ? "previsão oficial no período filtrado" : "sem previsão oficial no payload atual"}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="Pendentes" value={pendingSales.length} helper={formatMoney(pendingGross)} />
            <MiniMetric label="Boleto/PIX aguardando" value={boletoPixPending.length} helper="intenção de compra" />
            <MiniMetric label="Canceladas/recusadas" value={lostSales.length} helper="perdas de funil" />
            <MiniMetric label="Reembolsos/chargebacks" value={refundedSales.length} helper="deduções comerciais" />
            <MiniMetric label="Compradores únicos" value={uniqueBuyers} helper="confirmados no filtro" />
            <MiniMetric label="Ticket bruto" value={formatMoney(grossTicket)} helper="media confirmada" />
            <MiniMetric label="Ticket líquido" value={hasOfficialNet ? formatMoney(netTicket) : "Indisponível"} helper="somente vendas com líquido" />
            <MiniMetric label="Saldo realizado" value={realizedTotal > 0 ? formatMoney(realizedTotal) : "Indisponível"} helper="líquido Hotmart recebido/disponível" />
          </div>

          <EstimatedFinancialsCard title="Estimativa Norwyn do período" estimate={overviewEstimatedFinancials} />

          <div className="grid gap-4 xl:grid-cols-2">
            <DataCard title="Receita por período" helper="Receita bruta confirmada dentro dos filtros.">
              <SimpleTable
                headers={["Período", "Receita", "Vendas", "Compradores"]}
                rows={overviewTemporalRows.slice(0, 12).map((row) => [row.label, formatMoney(row.receita), row.vendas, row.compradores])}
                empty="Sem receita confirmada no filtro atual."
                minWidth="520px"
              />
            </DataCard>
            <DataCard title="Vendas por período" helper="Quantidade de vendas confirmadas por data ou hora.">
              <SimpleTable
                headers={["Período", "Vendas", "Receita", "Ticket bruto"]}
                rows={overviewTemporalRows.slice(0, 12).map((row) => [row.label, row.vendas, formatMoney(row.receita), row.vendas ? formatMoney(row.receita / row.vendas) : "-"])}
                empty="Sem vendas confirmadas no filtro atual."
                minWidth="520px"
              />
            </DataCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataCard title="Produtos" helper="Produtos com maior participação na receita bruta confirmada.">
              <SimpleTable
                headers={["Produto", "Vendas", "Receita", "Share"]}
                rows={overviewProductRows.slice(0, 8).map((row) => [row.name, row.confirmed, formatMoney(row.revenue), formatPercent(row.share)])}
                empty="Sem produtos no filtro atual."
                minWidth="620px"
              />
            </DataCard>
            <DataCard title="Status do Funil" helper="Distribuicao comercial sem eventos educacionais.">
              <SimpleTable
                headers={["Status", "Eventos", "Receita bruta", "%"]}
                rows={overviewStatusRows.map((row) => [row.label, row.count, formatMoney(row.revenue), formatPercent(row.percent)])}
                empty="Sem status no filtro atual."
                minWidth="560px"
              />
            </DataCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataCard title="Pagamentos" helper="Formas de pagamento das vendas confirmadas no filtro.">
              <SimpleTable
                headers={["Pagamento", "Vendas", "Receita", "Pendentes"]}
                rows={overviewPaymentRows.slice(0, 8).map((row) => [row.payment, row.sales, formatMoney(row.revenue), row.pending])}
                empty="Sem pagamentos no filtro atual."
                minWidth="560px"
              />
            </DataCard>
            <DataCard title="Origens" helper="Source/SCK informado pela Hotmart ou ausencia de origem.">
              <SimpleTable
                headers={["Origem", "Vendas", "Receita", "Share"]}
                rows={overviewSourceRows.slice(0, 8).map((row) => [row.source, row.sales, formatMoney(row.revenue), formatPercent(row.share)])}
                empty="Sem origens no filtro atual."
                minWidth="560px"
              />
            </DataCard>
          </div>

          <Card className="p-4">
            <div className="mb-3">
              <p className="text-xs font-black uppercase text-brand-clay">Lacunas de dados</p>
              <h2 className="mt-1 text-lg font-black text-brand-teal">Qualidade financeira do payload</h2>
            </div>
            <DataGapList
              total={dataGaps.length}
              withoutNet={confirmedWithoutNet.length}
              withoutForecast={confirmedWithoutForecast.length}
              unmapped={unmappedStatus.length}
            />
          </Card>

          <RealtimeValidationCard
            latest={latestRawImport}
            total={context.rawImports.length}
            realtimeCount={realtimeImports.length}
            recentRealtimeCount={recentRealtimeImports.length}
          />
        </div>
      ) : null}
      {activeTab === "sales" ? (
        <DataCard title="Vendas Hotmart" helper="Histórico e vendas atuais normalizadas pelo n8n.">
          <CommercialFilters
            table="sales"
            years={years}
            months={months}
            year={yearFilter}
            month={monthFilter}
            status={statusFilter}
            search={search}
            onYear={setYearFilter}
            onMonth={setMonthFilter}
            onStatus={setStatusFilter}
            onSearch={setSearch}
          />
          <SalesTable rows={paginate(salesRows, salesPage)} allRows={salesRows} />
          <Pagination page={salesPage} totalPages={pageCount(salesRows.length)} totalRows={salesRows.length} onPage={setSalesPage} />
        </DataCard>
      ) : null}
      {activeTab === "receivables" ? (
        <DataCard title="Recebíveis" helper="Previsão 7, 15, 30 dias, mês ou tudo. Somente previsão Hotmart com líquido informado entra no saldo a receber.">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <PeriodFilter period={period} setPeriod={setPeriod} />
            <ExportButtons
              label="Recebíveis Comercial"
              filename="comercial_recebiveis"
              columns={receivableExportColumns}
              rows={receivableRows}
            />
          </div>
          <CommercialFilters
            table="receivables"
            years={years}
            months={months}
            year={yearFilter}
            month={monthFilter}
            status={statusFilter}
            search={search}
            onYear={setYearFilter}
            onMonth={setMonthFilter}
            onStatus={setStatusFilter}
            onSearch={setSearch}
          />
          <ReceivablesTable rows={paginate(receivableRows, receivablesPage)} />
          <Pagination page={receivablesPage} totalPages={pageCount(receivableRows.length)} totalRows={receivableRows.length} onPage={setReceivablesPage} />
        </DataCard>
      ) : null}
      {activeTab === "students" ? (
        <DataCard title="Alunos" helper="Base comercial inicial. Último acesso/progresso dependem da integração Hotmart Club ou Cademí.">
          <CommercialFilters
            table="students"
            years={years}
            months={months}
            year={yearFilter}
            month={monthFilter}
            status={statusFilter}
            search={search}
            onYear={setYearFilter}
            onMonth={setMonthFilter}
            onStatus={setStatusFilter}
            onSearch={setSearch}
          />
          <StudentsTable rows={paginate(studentRows, studentsPage)} allRows={studentRows} />
          <Pagination page={studentsPage} totalPages={pageCount(studentRows.length)} totalRows={studentRows.length} onPage={setStudentsPage} />
        </DataCard>
      ) : null}
      {activeTab === "products" ? (
        <DataCard title="Produtos" helper="Mapeamento Hotmart para curso, centro de resultado e dias de acesso.">
          <div className="grid gap-3">
            {context.produtos.map((item) => (
              <div key={item.id} className="rounded-md border border-brand-sand bg-white/70 p-4">
                <p className="font-black text-brand-teal">{item.nome}</p>
                <p className="mt-1 text-sm text-brand-teal/60">
                  Hotmart ID: {item.hotmart_product_id ?? "-"} | Acesso: {item.dias_acesso ? `${item.dias_acesso} dias` : "não definido"}
                </p>
              </div>
            ))}
            {!context.produtos.length ? <EmptyState text="Nenhum produto importado ainda." /> : null}
          </div>
        </DataCard>
      ) : null}
      {activeTab === "reconciliation" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={<PackageCheck />} label="Produtos sem mapa" value={context.produtos.filter((item) => !item.curso_id).length} helper="vincular a curso/centro" />
          <Metric icon={<AlertTriangle />} label="Vendas sem produto" value={unclassifiedSales} helper="revisar antes do Financeiro" />
          <Metric icon={<RefreshCw />} label="Reembolsos/chargebacks" value={refundedSales.length} helper="deduções e perdas comerciais" />
          <Card className="p-5 md:col-span-3">
            <h2 className="text-xl font-black text-brand-teal">Validação do fluxo atual</h2>
            <p className="mt-1 text-sm text-brand-teal/60">Use este bloco para conferir se o workflow em tempo real está chegando sem depender do backfill histórico.</p>
            <RawImportsTable rows={context.rawImports.slice(0, 10)} />
          </Card>
        </div>
      ) : null}
      {activeTab === "admin" && context.canWrite ? (
        <DataCard title="Admin Comercial" helper="Nesta primeira entrega, o cadastro administrativo fica estruturado para a proxima etapa.">
          <p className="text-sm font-bold text-brand-teal/65">
            Proximo passo: permitir editar produtos, dias de acesso, curso vinculado e centro de resultado pela tela. Por enquanto, o n8n cria produtos automaticamente e deixa pendencias na Conciliacao.
          </p>
          <div className="mt-5">
            <h3 className="text-base font-black text-brand-teal">Eventos recebidos</h3>
            <p className="mt-1 text-sm text-brand-teal/60">
              Lista preservada para auditoria, incluindo eventos comerciais e educacionais.
            </p>
            <RawImportsTable rows={context.rawImports.slice(0, 20)} />
          </div>
        </DataCard>
      ) : null}
    </section>
  );
}

function Header({ updatedAt }: { updatedAt: string | null }) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-brand-clay">Hotmart e alunos</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-teal">Comercial</h1>
        <p className="mt-2 max-w-3xl text-base text-brand-teal/70">
          Vendas, recebiveis, alunos e produtos conectados a Hotmart antes de impactar Financeiro e DRE.
        </p>
      </div>
      <span className="text-sm font-bold text-brand-teal/60">Base atualizada em {formatDateTime(updatedAt)}</span>
    </header>
  );
}

function LaunchIntelligencePanel({
  updatedAt,
  period,
  setPeriod,
  launchName,
  setLaunchName,
  launchStart,
  setLaunchStart,
  launchEnd,
  setLaunchEnd,
  filters,
  filterOptions,
  onProductFilter,
  onStatusFilter,
  onPaymentFilter,
  onSourceFilter,
  range,
  rows,
  confirmed,
  pending,
  lost,
  refunded,
  gross,
  ticket,
  buyers,
  latestSale,
  temporalRows,
  productRows,
  statusRows,
  sourceRows,
  riskRows,
  lossReasonRows,
  productLossRows,
  timelineRows,
  alerts,
  previousConfirmed,
  allSales,
  rawImports,
  learningIgnored,
  rawLast24h,
  rawLastHour,
  latestRaw,
  dataGaps,
  missingNet,
  missingFees,
  missingForecast,
  missingSource,
  missingBuyerEmail,
  missingProduct,
  unknownStatus,
  estimatedFinancials,
}: {
  updatedAt: string | null;
  period: LaunchPeriodKey;
  setPeriod: (period: LaunchPeriodKey) => void;
  launchName: string;
  setLaunchName: (value: string) => void;
  launchStart: string;
  setLaunchStart: (value: string) => void;
  launchEnd: string;
  setLaunchEnd: (value: string) => void;
  filters: CommercialGlobalFiltersState;
  filterOptions: { products: string[]; payments: string[]; sources: string[] };
  onProductFilter: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onPaymentFilter: (value: string) => void;
  onSourceFilter: (value: string) => void;
  range: LaunchRange;
  rows: ComercialVenda[];
  confirmed: ComercialVenda[];
  pending: ComercialVenda[];
  lost: ComercialVenda[];
  refunded: ComercialVenda[];
  gross: number;
  ticket: number;
  buyers: number;
  latestSale: ComercialVenda | null;
  temporalRows: Array<{ label: string; vendas: number; receita: number; compradores: number }>;
  productRows: ReturnType<typeof buildProductRows>;
  statusRows: ReturnType<typeof buildStatusRows>;
  sourceRows: ReturnType<typeof buildSourceRows>;
  riskRows: LaunchRiskRow[];
  lossReasonRows: LaunchLossReasonRow[];
  productLossRows: LaunchProductLossRow[];
  timelineRows: LaunchTimelineRow[];
  alerts: LaunchAlert[];
  previousConfirmed: ComercialVenda[];
  allSales: ComercialVenda[];
  rawImports: ComercialRawImport[];
  learningIgnored: number;
  rawLast24h: number;
  rawLastHour: number;
  latestRaw: ComercialRawImport | null;
  dataGaps: number;
  missingNet: number;
  missingFees: number;
  missingForecast: number;
  missingSource: number;
  missingBuyerEmail: number;
  missingProduct: number;
  unknownStatus: number;
  estimatedFinancials: ReturnType<typeof buildEstimatedFinancials>;
}) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [launchCurvePage, setLaunchCurvePage] = useState(1);
  const [salesSort, setSalesSort] = useState<LaunchSalesSortKey>("latest");
  const [productSort, setProductSort] = useState<LaunchProductSortKey>("revenue_desc");
  const [statusSort, setStatusSort] = useState<LaunchStatusSortKey>("order");
  const [sourceSort, setSourceSort] = useState<LaunchSourceSortKey>("revenue_desc");
  const [selectedSale, setSelectedSale] = useState<ComercialVenda | null>(null);
  const [hypothesisFeedbacks, setHypothesisFeedbacks] = useState<LaunchHypothesisFeedback[]>([]);
  const topProduct = productRows[0];
  const riskTotal = riskRows.reduce((sum, row) => sum + row.value, 0);
  const riskPercent = gross ? (riskTotal / gross) * 100 : 0;
  const missingLossReasonCount = riskRows.filter((row) => row.classification.motivoOriginalHotmart === "Nao informado pela Hotmart").length;
  const cardLossCount = riskRows.filter((row) => /CREDIT_CARD|CARD|CARTAO/.test(normalizeStatus(row.payment))).length;
  const recoverableCount = riskRows.filter((row) => ["Alta", "Media"].includes(row.classification.recuperabilidade)).length;
  const previousGross = grossTotal(previousConfirmed);
  const previousTicket = previousConfirmed.length ? previousGross / previousConfirmed.length : 0;
  const variation = previousGross ? ((gross - previousGross) / previousGross) * 100 : null;
  const latestMinutes = latestSale ? minutesSince(latestSale.data_compra ?? latestSale.data_aprovacao ?? latestSale.last_event_at ?? latestSale.imported_at) : null;
  const todayRange = buildLaunchRange("today", launchName, launchStart, launchEnd);
  const yesterdayRange = buildLaunchRange("yesterday", launchName, launchStart, launchEnd);
  const sevenDayRange = buildLaunchRange("7d", launchName, launchStart, launchEnd);
  const todayConfirmed = launchSaleRows(allSales, todayRange, rawImports).filter(isConfirmed);
  const yesterdayConfirmed = launchSaleRows(allSales, yesterdayRange, rawImports).filter(isConfirmed);
  const sevenDayConfirmed = launchSaleRows(allSales, sevenDayRange, rawImports).filter(isConfirmed);
  const todayGross = grossTotal(todayConfirmed);
  const yesterdayGross = grossTotal(yesterdayConfirmed);
  const sevenDayAverage = grossTotal(sevenDayConfirmed) / 7;
  const todayVsYesterday = yesterdayGross ? ((todayGross - yesterdayGross) / yesterdayGross) * 100 : null;
  const todayVsSevenDayAverage = sevenDayAverage ? ((todayGross - sevenDayAverage) / sevenDayAverage) * 100 : null;
  const launchHypotheses = useMemo(
    () => buildCommercialHypotheses({ riskRows, productLossRows, lossReasonRows, sourceRows, productRows }),
    [riskRows, productLossRows, lossReasonRows, sourceRows, productRows],
  );
  const financialSummaryText = estimatedFinancials.estimatedNet === null
    ? " Estimativa Norwyn de liquido e imposto ainda indisponivel no filtro porque nenhum produto configurado entrou na leitura."
    : ` Estimativa Norwyn: liquido de ${formatMoney(estimatedFinancials.estimatedNet)}, imposto/DAS de ${formatMoney(estimatedFinancials.tax)} e cobertura de ${estimatedFinancials.coveragePercent === null ? "-" : formatPercent(estimatedFinancials.coveragePercent)}.`;
  const summary = confirmed.length
    ? `${range.label} registrou ${confirmed.length} vendas confirmadas, com receita bruta de ${formatMoney(gross)} e ticket medio bruto de ${formatMoney(ticket)}. ${topProduct ? `O produto com maior receita foi ${topProduct.name}.` : "Ainda nao ha produto dominante."}${financialSummaryText} Receita em risco estimada: ${formatMoney(riskTotal)} (${formatPercent(riskPercent)} da receita bruta confirmada). ${refunded.length ? `Houve ${refunded.length} reembolsos/chargebacks no periodo.` : "Nao ha reembolsos ou chargebacks no periodo."} ${pending.length ? `Existem ${pending.length} pagamentos pendentes que merecem acompanhamento.` : "Nao ha pagamentos pendentes no periodo."}`
    : `${range.label} ainda nao possui vendas confirmadas no filtro aplicado. Use a leitura de eventos recentes e pendentes para validar se o lancamento esta sem movimentacao ou se o filtro precisa ser ajustado.`;
  const sortedLatestSales = useMemo(() => sortLaunchSales(rows, salesSort), [rows, salesSort]);
  const sortedProductRows = useMemo(() => sortLaunchProducts(productRows, productSort), [productRows, productSort]);
  const sortedStatusRows = useMemo(() => sortLaunchStatus(statusRows, statusSort), [statusRows, statusSort]);
  const sortedSourceRows = useMemo(() => sortLaunchSources(sourceRows, sourceSort), [sourceRows, sourceSort]);
  const curveTotalPages = pageCount(temporalRows.length);
  const curvePage = Math.min(launchCurvePage, curveTotalPages);
  const curveRows = paginate(temporalRows, curvePage);

  useEffect(() => {
    setLaunchCurvePage(1);
  }, [period, launchStart, launchEnd, temporalRows.length]);

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    window.setTimeout(() => setCopiedSummary(false), 1800);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("comercial:launch-context");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { launchName?: string; launchStart?: string; launchEnd?: string; period?: LaunchPeriodKey };
      if (parsed.launchName) setLaunchName(parsed.launchName);
      if (parsed.launchStart) setLaunchStart(parsed.launchStart);
      if (parsed.launchEnd) setLaunchEnd(parsed.launchEnd);
      if (parsed.period) setPeriod(parsed.period);
    } catch {
      window.localStorage.removeItem("comercial:launch-context");
    }
  }, [setLaunchEnd, setLaunchName, setLaunchStart, setPeriod]);

  useEffect(() => {
    window.localStorage.setItem("comercial:launch-context", JSON.stringify({ launchName, launchStart, launchEnd, period }));
  }, [launchName, launchStart, launchEnd, period]);

  useEffect(() => {
    const saved = window.localStorage.getItem("comercial:launch-hypotheses-feedback");
    if (!saved) return;
    try {
      setHypothesisFeedbacks(JSON.parse(saved) as LaunchHypothesisFeedback[]);
    } catch {
      window.localStorage.removeItem("comercial:launch-hypotheses-feedback");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("comercial:launch-hypotheses-feedback", JSON.stringify(hypothesisFeedbacks));
  }, [hypothesisFeedbacks]);

  const feedbackById = useMemo(() => new Map(hypothesisFeedbacks.map((item) => [item.id, item])), [hypothesisFeedbacks]);
  const learnings = hypothesisFeedbacks.filter((item) => item.result !== "pendente");

  function hypothesisId(hypothesis: string) {
    return hypothesis.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function updateHypothesis(hypothesis: string, patch: Partial<LaunchHypothesisFeedback>) {
    const id = hypothesisId(hypothesis);
    setHypothesisFeedbacks((current) => {
      const existing = current.find((item) => item.id === id);
      const next: LaunchHypothesisFeedback = {
        id,
        hypothesis,
        result: existing?.result ?? "pendente",
        comment: existing?.comment ?? "",
        updatedAt: new Date().toISOString(),
        user: "Local",
        ...patch,
      };
      return existing ? current.map((item) => (item.id === id ? next : item)) : [...current, next];
    });
  }

  return (
    <div className="space-y-5 text-[0.9rem]">
      <Card className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge value="Coleta: Dados Hotmart" tone="ok" />
              <Badge value="Análise: Launch Intelligence Essentials" />
              <Badge value="Sem IA nesta versão" tone="warn" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-brand-teal">Launch Intelligence Essentials</h2>
            <p className="mt-2 text-brand-teal/65">Acompanhamento do lançamento em tempo real com dados reais da Hotmart.</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
            Receita líquida indisponível no payload da Hotmart. Recebíveis sem fonte oficial permanecem projetados.
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-brand-clay">Período</span>
          {launchPeriods.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
              className={`rounded-md border px-4 py-2 text-sm font-black ${period === item.key ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {(period === "launch" || period === "custom") ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_180px_180px]">
            <input value={launchName} onChange={(event) => setLaunchName(event.target.value)} className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal" />
            <input type="date" value={launchStart} onChange={(event) => setLaunchStart(event.target.value)} className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal" />
            <input type="date" value={launchEnd} onChange={(event) => setLaunchEnd(event.target.value)} className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal" />
          </div>
        ) : null}
      </Card>

      <CommercialGlobalFilters
        filters={filters}
        options={filterOptions}
        onProduct={onProductFilter}
        onStatus={onStatusFilter}
        onPayment={onPaymentFilter}
        onSource={onSourceFilter}
      />

      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Painel do Lançamento</p>
            <h3 className="mt-2 text-xl font-black text-brand-teal">{range.label}</h3>
            <p className="mt-2 text-sm font-bold text-brand-teal/60">
              {range.start ? formatDate(range.start.toISOString()) : "Início aberto"} a {range.end ? formatDate(range.end.toISOString()) : "Fim aberto"}
            </p>
          </div>
          <div className="grid gap-2 text-sm font-bold text-brand-teal/70">
            <p>Atualizado em: {formatDateTime(updatedAt)}</p>
            <p>Total de eventos Hotmart no período: {rows.length}</p>
            <p>Fonte: Hotmart via n8n · Coleta: Incremental + Webhook</p>
            <p>Financeiro líquido: indisponível no payload atual</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-black uppercase text-brand-clay">Resumo do Dia</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copySummary()}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-sand bg-white px-3 text-xs font-black text-brand-teal transition hover:bg-brand-cream"
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedSummary ? "Copiado" : "Copiar texto"}
            </button>
            <a
              href="/relatorios"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-sand bg-white px-3 text-xs font-black text-brand-teal transition hover:bg-brand-cream"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Enviar via Relatórios
            </a>
          </div>
        </div>
        <p className="mt-3 text-base font-bold leading-7 text-brand-teal">{summary}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<WalletCards />} label="Receita bruta" value={formatMoney(gross)} helper="oficial Hotmart" />
        <Metric icon={<ReceiptText />} label="Vendas confirmadas" value={confirmed.length} helper="APPROVED ou COMPLETE" />
        <Metric icon={<TrendingUp />} label="Lucro líquido estimado" value={estimatedFinancials.estimatedNet === null ? "Indisponível" : formatMoney(estimatedFinancials.estimatedNet)} helper="Estimativa Norwyn" />
        <Metric icon={<ReceiptText />} label="Imposto estimado" value={formatMoney(estimatedFinancials.tax)} helper="DAS estimado" />
        <Metric icon={<TrendingUp />} label="Ticket médio bruto" value={formatMoney(ticket)} helper="bruto / confirmadas" />
        <Metric icon={<Users />} label="Compradores únicos" value={buyers} helper="confirmados no filtro" />
        <Metric icon={<Clock3 />} label="Pendentes" value={pending.length} helper="aguardando pagamento/análise" />
        <Metric icon={<AlertTriangle />} label="Perdidas/canceladas" value={lost.length} helper="não entram como venda" />
        <Metric icon={<RefreshCw />} label="Reembolsos/chargebacks" value={refunded.length} helper="acompanhar separadamente" />
        <Metric icon={<Activity />} label="Última venda" value={latestSale ? formatDateTime(latestSale.data_compra ?? latestSale.data_aprovacao) : "-"} helper={latestMinutes !== null ? `há ${latestMinutes} min` : "sem venda no filtro"} />
      </div>

      <EstimatedFinancialsCard title="Estimativa Norwyn do lançamento" estimate={estimatedFinancials} />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DataCard title="Receita em Risco" helper="Estimativa de valor bruto potencial em pendentes, perdidas e reembolsadas.">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniMetric label="Valor em risco" value={formatMoney(riskTotal)} helper="bruto potencial" />
            <MiniMetric label="% sobre bruto" value={formatPercent(riskPercent)} helper="referencia operacional" />
            <MiniMetric label="Casos" value={riskRows.length} helper="pendentes/perdidos" />
            <MiniMetric label="Sem motivo Hotmart" value={missingLossReasonCount} helper="lacuna oficial" />
            <MiniMetric label="Em cartao" value={cardLossCount} helper="parece pagamento" />
            <MiniMetric label="Recuperaveis" value={recoverableCount} helper="alta/media" />
          </div>
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-800">
            Este valor nao e perda oficial. A causa exata depende do motivo original retornado pela Hotmart; quando ele nao vier, a categoria Norwyn e apenas apoio operacional.
          </p>
        </DataCard>
        <DataCard title="Comparativo executivo" helper="Leitura rapida do dia contra referencias recentes.">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniMetric label="Hoje" value={formatMoney(todayGross)} helper={`${todayConfirmed.length} vendas`} />
            <MiniMetric label="Ontem" value={todayVsYesterday === null ? "Sem base" : formatPercent(todayVsYesterday)} helper={formatMoney(yesterdayGross)} />
            <MiniMetric label="Media 7d" value={todayVsSevenDayAverage === null ? "Sem base" : formatPercent(todayVsSevenDayAverage)} helper={formatMoney(sevenDayAverage)} />
          </div>
        </DataCard>
      </div>

      <DataCard title="Oportunidades de Recuperacao" helper="Fila pratica para acompanhar pendentes, perdas e reembolsos de maior impacto.">
        <LaunchTableToolbar>
          <span className="text-xs font-black uppercase text-brand-teal/55">{riskRows.length} oportunidades</span>
          <ExportButtons label="Oportunidades de Recuperacao" filename="comercial_lancamento_oportunidades_recuperacao" columns={launchRiskExportColumns} rows={riskRows} />
        </LaunchTableToolbar>
        <RecoveryOpportunitiesDiagnosticTable rows={riskRows} onSelect={setSelectedSale} />
      </DataCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataCard title="Principais Motivos de Perda" helper="Classificacao Norwyn por regras em cima de status, pagamento e motivo original Hotmart quando disponivel.">
          <ExportButtons label="Principais Motivos de Perda" filename="comercial_lancamento_motivos_perda" columns={launchLossReasonExportColumns} rows={lossReasonRows} />
          <SimpleTable
            minWidth="680px"
            headers={["Categoria Norwyn", "Casos", "Valor bruto", "Participacao", "Motivo original"]}
            rows={lossReasonRows.map((row) => [row.reason, row.count, formatMoney(row.value), formatPercent(row.share), row.example])}
            empty="Sem motivos de perda no filtro atual."
          />
        </DataCard>
        <DataCard title="Produtos com Maior Perda" helper="Produtos com maior valor bruto potencial em risco.">
          <ExportButtons label="Produtos com Maior Perda" filename="comercial_lancamento_produtos_perda" columns={launchProductLossExportColumns} rows={productLossRows} />
          <SimpleTable
            minWidth="680px"
            headers={["Produto", "Oportunidades", "Valor bruto", "Participacao", "Principal motivo"]}
            rows={productLossRows.map((row) => [row.product, row.losses, formatMoney(row.value), formatPercent(row.share), row.topReason])}
            empty="Sem produtos com perda no filtro atual."
          />
        </DataCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="Curva do Lançamento" helper={range.bucket === "hour" ? "Evolução por hora no filtro atual." : "Evolução por dia no filtro atual."}>
          <div className="mb-3 flex justify-end">
            <ExportButtons label="Curva do Lançamento" filename="comercial_lancamento_curva" columns={launchCurveExportColumns} rows={temporalRows} />
          </div>
          <SimpleTable
            minWidth="620px"
            headers={["Período", "Vendas", "Receita bruta", "Compradores"]}
            rows={curveRows.map((row) => [row.label, row.vendas, formatMoney(row.receita), row.compradores])}
            empty="Sem vendas para montar a curva."
          />
          <Pagination page={curvePage} totalPages={curveTotalPages} totalRows={temporalRows.length} onPage={setLaunchCurvePage} />
        </DataCard>
        <DataCard title="Comparativos" helper="Compara o filtro atual com o período anterior equivalente.">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniMetric label="Receita atual" value={formatMoney(gross)} helper="bruta confirmada" />
            <MiniMetric label="Período anterior" value={formatMoney(previousGross)} helper={`${previousConfirmed.length} vendas`} />
            <MiniMetric label="Variação" value={variation === null ? "Sem base" : formatPercent(variation)} helper={`ticket anterior ${formatMoney(previousTicket)}`} />
          </div>
        </DataCard>
      </div>

      <DataCard title="Últimas Vendas" helper="As 10 vendas mais recentes do filtro.">
        <LaunchTableToolbar>
          <LaunchSortSelect label="Ordenar" value={salesSort} onChange={(value) => setSalesSort(value as LaunchSalesSortKey)} options={launchSalesSortOptions} />
          <ExportButtons label="Últimas Vendas" filename="comercial_lancamento_ultimas_vendas" columns={salesExportColumns} rows={sortedLatestSales} />
        </LaunchTableToolbar>
        <LatestSalesTable rows={sortedLatestSales.slice(0, 10)} rawImports={rawImports} onSelect={setSelectedSale} />
      </DataCard>

      <DataCard title="Linha do Tempo de Vendas" helper="Transações em ordem cronológica para leitura do ritmo comercial.">
        <LaunchTableToolbar>
          <span className="text-xs font-black uppercase text-brand-teal/55">{timelineRows.length} transações</span>
          <ExportButtons label="Linha do Tempo de Vendas" filename="comercial_lancamento_linha_tempo" columns={launchTimelineExportColumns} rows={timelineRows} />
        </LaunchTableToolbar>
        <SalesTimelineTable rows={timelineRows} onSelect={setSelectedSale} />
      </DataCard>

      <DataCard title="Produtos que puxaram o lançamento" helper="Ordenado por receita bruta confirmada.">
        <LaunchTableToolbar>
          <LaunchSortSelect label="Ordenar" value={productSort} onChange={(value) => setProductSort(value as LaunchProductSortKey)} options={launchProductSortOptions} />
          <ExportButtons label="Produtos que puxaram o lançamento" filename="comercial_lancamento_produtos" columns={launchProductExportColumns} rows={sortedProductRows} />
        </LaunchTableToolbar>
        <SimpleTable
          minWidth="900px"
          headers={["Produto", "Confirmadas", "Receita bruta", "Compradores", "Ticket", "Pendentes", "Perdidas", "Participação"]}
          rows={sortedProductRows.map((row) => [row.name, row.confirmed, formatMoney(row.revenue), row.buyers, formatMoney(row.ticket), row.pending, row.lost, formatPercent(row.share)])}
          empty="Sem produtos no filtro."
        />
      </DataCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataCard title="Status do Funil" helper="Agrupamento operacional dos status Hotmart.">
          <LaunchTableToolbar>
            <LaunchSortSelect label="Ordenar" value={statusSort} onChange={(value) => setStatusSort(value as LaunchStatusSortKey)} options={launchStatusSortOptions} />
            <ExportButtons label="Status do Funil" filename="comercial_lancamento_status_funil" columns={launchStatusExportColumns} rows={sortedStatusRows} />
          </LaunchTableToolbar>
          <SimpleTable
            minWidth="760px"
            headers={["Grupo", "Qtd.", "Valor bruto", "%", "Status originais"]}
            rows={sortedStatusRows.map((row) => [row.label, row.count, formatMoney(row.revenue), formatPercent(row.percent), row.statuses.join(", ") || "-"])}
            empty="Sem status no filtro."
          />
        </DataCard>
        <DataCard title="Origem das vendas" helper="Leitura por source_sck quando informado.">
          <LaunchTableToolbar>
            <LaunchSortSelect label="Ordenar" value={sourceSort} onChange={(value) => setSourceSort(value as LaunchSourceSortKey)} options={launchSourceSortOptions} />
            <ExportButtons label="Origem das vendas" filename="comercial_lancamento_origem_vendas" columns={launchSourceExportColumns} rows={sortedSourceRows} />
          </LaunchTableToolbar>
          <SimpleTable
            minWidth="680px"
            headers={["Origem", "Vendas", "Receita bruta", "Ticket", "Participação"]}
            rows={sortedSourceRows.map((row) => [row.source, row.sales, formatMoney(row.revenue), formatMoney(row.ticket), formatPercent(row.share)])}
            empty="Sem source_sck no filtro."
          />
        </DataCard>
      </div>

      <DataCard title="Radar do Lançamento" helper="Alertas por regras determinísticas, sem IA.">
        <div className="grid gap-3 md:grid-cols-2">
          {alerts.map((alert) => (
            <div key={`${alert.title}-${alert.evidence}`} className="rounded-md border border-brand-sand bg-white/80 p-4">
              <Badge value={alert.type} tone={alert.type === "crítico" || alert.type === "atenção" ? "warn" : alert.type === "oportunidade" ? "ok" : undefined} />
              <h3 className="mt-3 text-lg font-black text-brand-teal">{alert.title}</h3>
              <p className="mt-2 text-sm font-bold text-brand-teal">{alert.text}</p>
              <p className="mt-2 text-xs font-bold text-brand-teal/55">Evidência: {alert.evidence}</p>
              <p className="mt-1 text-xs font-bold text-brand-teal/55">Sugestão: {alert.suggestion}</p>
            </div>
          ))}
        </div>
      </DataCard>

      <CommercialHypothesesPanel
        hypotheses={launchHypotheses}
        feedbackById={feedbackById}
        learnings={learnings}
        onUpdate={updateHypothesis}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <DataCard title="Vendas chegando pelo n8n" helper="Validação operacional dos eventos recentes.">
          <div className="grid gap-3">
            <MiniMetric label="Última entrada" value={latestRaw ? formatDateTime(latestRaw.received_at) : "Sem evento"} helper={latestRaw ? rawImportSource(latestRaw) : "aguardando Hotmart"} />
            <MiniMetric label="Eventos 24h" value={rawLast24h} helper="raw imports recentes" />
            <MiniMetric label="Eventos 60min" value={rawLastHour} helper={rawLastHour ? "movimento recente" : "sem novas vendas/eventos"} />
          </div>
        </DataCard>
        <DataCard title="Lacunas de Dados" helper="Impacto direto na leitura financeira e operacional.">
          <ul className="space-y-2 text-sm font-bold text-brand-teal/70">
            <li>Motivo de cancelamento/recusa ausente: {missingLossReasonCount} - nao permite afirmar a causa exata da perda.</li>
            <li>Motivo de reembolso/chargeback/antifraude ausente: usar apenas como apoio operacional quando nao houver motivo oficial.</li>
            <li>Líquido ausente: {missingNet} · impede cálculo de lucro líquido real.</li>
            <li>Taxas ausentes: {missingFees} · impede apuração de custos Hotmart.</li>
            <li>Recebíveis oficiais ausentes: {missingForecast} · saldo a receber fica indisponível/projetado.</li>
            <li>Source_sck ausente: {missingSource} · limita atribuição por campanha.</li>
            <li>Comprador sem e-mail: {missingBuyerEmail} · dificulta identificação.</li>
            <li>Produto não mapeado: {missingProduct} · revisar antes de integrar ao Financeiro.</li>
            <li>Status desconhecido: {unknownStatus} · revisar mapeamento.</li>
            <li>Eventos educacionais preservados fora dos KPIs comerciais: {learningIgnored} · disponíveis para leitura futura de alunos/progresso.</li>
          </ul>
          <p className="mt-3 text-xs font-bold text-amber-700">{dataGaps} vendas possuem alguma lacuna registrada em data_lacunas.</p>
        </DataCard>
        <DataCard title="Confiáveis x Com Alerta" helper="Separação explícita para o mini lançamento.">
          <div className="grid gap-3 text-sm font-bold">
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-800">
              <p className="font-black">Confiável agora</p>
              <p>Vendas, receita bruta, status, produtos, compradores e forma de pagamento.</p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-800">
              <p className="font-black">Com alerta</p>
              <p>Receita líquida, saldo realizado, saldo a receber, taxas e recebíveis projetados.</p>
            </div>
          </div>
        </DataCard>
      </div>
      {selectedSale ? <TransactionDetailModal sale={selectedSale} rawImports={rawImports} onClose={() => setSelectedSale(null)} /> : null}
    </div>
  );
}

function Metric({ icon, label, value, helper }: { icon: ReactNode; label: string; value: ReactNode; helper: string }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-brand-clay">{label}</p>
          <p className="mt-1.5 break-words text-[1.55rem] font-black leading-tight text-brand-teal">{value}</p>
          <p className="mt-1.5 text-xs font-bold leading-snug text-brand-teal/55">{helper}</p>
        </div>
        <span className="rounded-lg bg-brand-cream p-2 text-brand-teal">{icon}</span>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value, helper }: { label: string; value: ReactNode; helper: string }) {
  return (
    <div className="min-w-0 rounded-md border border-brand-sand bg-white/70 p-3">
      <p className="text-xs font-black uppercase text-brand-clay">{label}</p>
      <p className="mt-2 break-words text-xl font-black leading-tight text-brand-teal">{value}</p>
      <p className="mt-1 text-xs font-bold text-brand-teal/55">{helper}</p>
    </div>
  );
}

function EstimatedFinancialsCard({
  title,
  estimate,
}: {
  title: string;
  estimate: ReturnType<typeof buildEstimatedFinancials>;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-brand-clay">{title}</p>
          <h3 className="mt-1 text-lg font-black text-brand-teal">Lucro líquido e imposto estimados</h3>
        </div>
        <span className="rounded-full bg-[#FFF3C7] px-3 py-1 text-[11px] font-black uppercase text-[#8A5B18]">Estimativa Norwyn</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <MiniMetric label="Receita bruta total" value={formatMoney(estimate.gross)} helper={`${estimate.sales} vendas confirmadas`} />
        <MiniMetric label="Receita configurada" value={formatMoney(estimate.configuredGross)} helper={`${estimate.configuredSales} vendas na estimativa`} />
        <MiniMetric label="Receita pendente" value={formatMoney(estimate.pendingGross)} helper="produtos sem configuracao completa" />
        <MiniMetric label="Taxas Hotmart" value={formatMoney(estimate.hotmartPercentFee + estimate.fixedFee)} helper="percentual + taxa fixa configurada" />
        <MiniMetric label="Coproducao" value={formatMoney(estimate.coproduction)} helper="por produto configurado" />
        <MiniMetric label="Imposto/DAS" value={formatMoney(estimate.tax)} helper="por regra tributaria vigente" />
        <MiniMetric label="Liquido estimado" value={estimate.estimatedNet === null ? "Indisponivel" : formatMoney(estimate.estimatedNet)} helper="nao oficial Hotmart" />
        <MiniMetric label="Cobertura" value={estimate.coveragePercent === null ? "-" : formatPercent(estimate.coveragePercent)} helper="receita configurada / total" />
      </div>
      {estimate.taxBuckets.length ? (
        <div className="mt-4 overflow-x-auto">
          <SimpleTable
            headers={["Categoria fiscal", "Receita bruta", "Alíquota", "Imposto estimado"]}
            rows={estimate.taxBuckets.map((bucket) => [bucket.category, formatMoney(bucket.gross), formatPercent(bucket.percent), formatMoney(bucket.tax)])}
            empty="Sem categoria fiscal aplicada."
            minWidth="560px"
          />
        </div>
      ) : null}
      <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
        Valores estimados pela Norwyn com base no Business Profile e nas regras tributarias configuradas. Nao substituem valores oficiais da Hotmart ou da contabilidade.
        {estimate.pendingProducts.length ? " Estimativa calculada parcialmente com base nos produtos configurados. Produtos sem configuracao financeira foram excluidos da estimativa e listados como pendencia." : ""}
      </p>
      {estimate.pendingProducts.length ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-black uppercase text-amber-900">Pendencias de configuracao</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {estimate.pendingProducts.slice(0, 6).map((item) => (
              <div key={item.product} className="rounded-md bg-white/70 p-2 text-xs font-bold text-amber-900">
                <p className="truncate">{item.product}</p>
                <p className="mt-1 text-amber-800/75">{formatMoney(item.gross)} - {item.reasons.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function DataGapList({
  total,
  withoutNet,
  withoutForecast,
  unmapped,
}: {
  total: number;
  withoutNet: number;
  withoutForecast: number;
  unmapped: number;
}) {
  if (!total) {
    return <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Sem lacunas críticas nos dados importados.</p>;
  }

  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-black">{total} vendas com lacunas de dados</p>
      <p className="mt-1 font-bold">
        {withoutNet} sem líquido informado · {withoutForecast} sem previsão de recebimento · {unmapped} com status não mapeado.
      </p>
      <p className="mt-1 text-xs font-bold opacity-80">Esses itens aparecem para conferência; o sistema não transforma valor bruto em líquido automaticamente.</p>
    </div>
  );
}

function PeriodFilter({ period, setPeriod }: { period: PeriodKey; setPeriod: (period: PeriodKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setPeriod(item.key)}
          className={`h-9 rounded-md border px-3 text-xs font-black ${period === item.key ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function OverviewFilterBar({
  period,
  setPeriod,
  filters,
  options,
  onProduct,
  onStatus,
  onPayment,
  onSource,
}: {
  period: PeriodKey;
  setPeriod: (period: PeriodKey) => void;
  filters: CommercialGlobalFiltersState;
  options: { products: string[]; payments: string[]; sources: string[] };
  onProduct: (value: string) => void;
  onStatus: (value: string) => void;
  onPayment: (value: string) => void;
  onSource: (value: string) => void;
}) {
  return (
    <Card className="p-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(360px,1.3fr)_minmax(180px,1fr)_170px_170px_minmax(180px,1fr)]">
        <div>
          <p className="mb-1.5 text-[11px] font-black uppercase text-brand-clay">Período</p>
          <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>
        <FilterSelect label="Produto" value={filters.product} onChange={onProduct}>
          <option value="all">Todos os produtos</option>
          {options.products.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Status" value={filters.status} onChange={onStatus}>
          <option value="all">Todos os status</option>
          {(["confirmed", "pending", "lost", "refunded", "chargeback", "unknown"] as ComercialStatusGroup[]).map((item) => (
            <option key={item} value={item}>{statusLabel(item)}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Pagamento" value={filters.payment} onChange={onPayment}>
          <option value="all">Todos os pagamentos</option>
          {options.payments.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Origem" value={filters.source} onChange={onSource}>
          <option value="all">Todas as origens</option>
          {options.sources.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </FilterSelect>
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase text-brand-clay">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-brand-sand bg-white px-2.5 text-xs font-bold text-brand-teal"
      >
        {children}
      </select>
    </label>
  );
}

function CommercialFilters({
  table,
  years,
  months,
  year,
  month,
  status,
  search,
  onYear,
  onMonth,
  onStatus,
  onSearch,
}: {
  table: TableKey;
  years: string[];
  months: string[];
  year: string;
  month: string;
  status: string;
  search: string;
  onYear: (value: string) => void;
  onMonth: (value: string) => void;
  onStatus: (value: string) => void;
  onSearch: (value: string) => void;
}) {
  const statusOptions =
    table === "students"
      ? ["ativo", "expirado", "reembolsado", "cancelado", "nao_validado"]
      : table === "receivables"
        ? ["previsto", "disponivel", "recebido", "atrasado", "cancelado", "reembolsado", "hotmart", "projetado", "manual"]
        : ["confirmed", "pending", "lost", "refunded", "chargeback", "unknown"];

  return (
    <div className="mb-4 grid gap-3 rounded-md border border-brand-sand bg-white/70 p-3 md:grid-cols-[1fr_160px_160px_180px]">
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Buscar por aluno, e-mail, transação ou produto"
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal outline-none focus:border-brand-clay"
      />
      <select
        value={year}
        onChange={(event) => onYear(event.target.value)}
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="all">Todos os anos</option>
        {years.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select
        value={month}
        onChange={(event) => onMonth(event.target.value)}
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="all">Todos os meses</option>
        {months.map((item) => (
          <option key={item} value={item}>{monthShort(Number(item) - 1)}/{year === "all" ? "todos" : year.slice(-2)}</option>
        ))}
      </select>
      <select
        value={status}
        onChange={(event) => onStatus(event.target.value)}
        className="h-11 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
      >
        <option value="all">Todos status</option>
        {statusOptions.map((item) => (
          <option key={item} value={item}>{table === "sales" ? commercialGroupLabels[item as ComercialStatusGroup] : item}</option>
        ))}
      </select>
    </div>
  );
}

function CommercialGlobalFilters({
  filters,
  options,
  onProduct,
  onStatus,
  onPayment,
  onSource,
}: {
  filters: CommercialGlobalFiltersState;
  options: { products: string[]; payments: string[]; sources: string[] };
  onProduct: (value: string) => void;
  onStatus: (value: string) => void;
  onPayment: (value: string) => void;
  onSource: (value: string) => void;
}) {
  return (
    <Card className="p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_170px_170px_1fr]">
        <select
          value={filters.product}
          onChange={(event) => onProduct(event.target.value)}
          className="h-9 rounded-md border border-brand-sand bg-white px-2.5 text-xs font-bold text-brand-teal"
        >
          <option value="all">Todos os produtos</option>
          {options.products.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(event) => onStatus(event.target.value)}
          className="h-9 rounded-md border border-brand-sand bg-white px-2.5 text-xs font-bold text-brand-teal"
        >
          <option value="all">Todos status</option>
          {(["confirmed", "pending", "lost", "refunded", "chargeback", "unknown"] as ComercialStatusGroup[]).map((item) => (
            <option key={item} value={item}>{commercialGroupLabels[item]}</option>
          ))}
        </select>
        <select
          value={filters.payment}
          onChange={(event) => onPayment(event.target.value)}
          className="h-9 rounded-md border border-brand-sand bg-white px-2.5 text-xs font-bold text-brand-teal"
        >
          <option value="all">Todos pagamentos</option>
          {options.payments.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select
          value={filters.source}
          onChange={(event) => onSource(event.target.value)}
          className="h-9 rounded-md border border-brand-sand bg-white px-2.5 text-xs font-bold text-brand-teal"
        >
          <option value="all">Todas origens</option>
          {options.sources.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
    </Card>
  );
}

function RealtimeValidationCard({
  latest,
  total,
  realtimeCount,
  recentRealtimeCount,
}: {
  latest: ComercialRawImport | null;
  total: number;
  realtimeCount: number;
  recentRealtimeCount: number;
}) {
  return (
    <Card className="p-5">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="text-xs font-black uppercase text-brand-clay">Validação Hotmart</p>
          <h2 className="mt-2 text-xl font-black text-brand-teal">Vendas atuais chegando pelo n8n</h2>
          <p className="mt-2 text-sm text-brand-teal/60">
            Use este quadro após testar uma compra/webhook. Se a venda chegou, a linha mais recente deve mudar quase na hora.
          </p>
        </div>
        <div className="rounded-md border border-brand-sand bg-brand-cream/40 p-4">
          <p className="text-xs font-black uppercase text-brand-clay">Última entrada</p>
          <p className="mt-2 text-lg font-black text-brand-teal">{latest ? formatDateTime(latest.received_at) : "Sem eventos"}</p>
          <p className="mt-1 text-sm font-bold text-brand-teal/60">{latest ? `${rawImportSource(latest)} · ${rawImportEvent(latest)}` : "Aguardando Hotmart"}</p>
        </div>
        <div className="rounded-md border border-brand-sand bg-brand-cream/40 p-4">
          <p className="text-xs font-black uppercase text-brand-clay">Tempo real</p>
          <p className="mt-2 text-2xl font-black text-brand-teal">{recentRealtimeCount}</p>
          <p className="mt-1 text-sm font-bold text-brand-teal/60">eventos nas últimas 24h · {realtimeCount} de {total} recentes</p>
        </div>
      </div>
    </Card>
  );
}

function RawImportsTable({ rows }: { rows: ComercialRawImport[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Recebido</th>
            <th className="px-4 py-3">Origem</th>
            <th className="px-4 py-3">Tipo do Evento</th>
            <th className="px-4 py-3">Evento</th>
            <th className="px-4 py-3">Transação</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{formatDateTime(row.received_at)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{rawImportSource(row)}</td>
              <td className="px-4 py-3"><Badge value={eventDomainLabel(rawImportEventDomain(row))} tone={rawImportEventDomain(row) === "commercial" ? "ok" : rawImportEventDomain(row) === "unknown" ? "warn" : undefined} /></td>
              <td className="px-4 py-3 text-brand-teal">{rawImportEvent(row)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{row.transaction_id ?? "-"}</td>
              <td className="px-4 py-3"><Badge value={row.status} tone={row.status === "processado" ? "ok" : row.status === "erro" ? "warn" : undefined} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Nenhuma entrada recente da Hotmart." /> : null}
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
  minWidth = "720px",
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  empty: string;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-brand-sand/70">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 font-bold text-brand-teal/80">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text={empty} /> : null}
    </div>
  );
}

function LatestSalesTable({ rows, rawImports, onSelect }: { rows: ComercialVenda[]; rawImports?: ComercialRawImport[]; onSelect?: (row: ComercialVenda) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1320px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Hora</th>
            <th className="px-4 py-3">Comprador</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Grupo</th>
            <th className="px-4 py-3">Categoria Norwyn</th>
            <th className="px-4 py-3 text-right">Bruto</th>
            <th className="px-4 py-3">Pagamento</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Transação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const group = commercialGroup(row);
            const classification = classifyHotmartLoss(row, rawImports ?? []);
            return (
              <tr key={row.id} className="border-b border-brand-sand/70">
                <td className="px-4 py-3 font-bold text-brand-teal">{formatDateTime(row.data_compra ?? row.data_aprovacao)}</td>
                <td className="px-4 py-3 text-brand-teal">{row.comprador_nome ?? row.comprador_email ?? "-"}</td>
                <td className="px-4 py-3 text-brand-teal/75">{row.produto_nome ?? "-"}</td>
                <td className="px-4 py-3"><Badge value={row.status_original ?? row.status} /></td>
                <td className="px-4 py-3"><Badge value={commercialGroupLabels[group]} tone={group === "confirmed" ? "ok" : group === "pending" || group === "lost" || group === "chargeback" ? "warn" : undefined} /></td>
                <td className="px-4 py-3 text-brand-teal/70">{group === "confirmed" ? "-" : classification.categoriaMotivoNorwyn}</td>
                <td className="px-4 py-3 text-right font-black text-brand-teal">{formatMoney(row.valor_bruto)}</td>
                <td className="px-4 py-3 text-brand-teal/65">{row.forma_pagamento ?? "-"} {row.parcelas > 1 ? `${row.parcelas}x` : ""}</td>
                <td className="px-4 py-3 text-brand-teal/65">{row.source_sck ?? "-"}</td>
                <td className="px-4 py-3 text-brand-teal/65">{row.transaction_id}</td>
                <td className="px-4 py-3">
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-brand-sand bg-white px-2 text-xs font-black text-brand-teal"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </button>
                  ) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Nenhuma venda no filtro atual." /> : null}
    </div>
  );
}

function RecoveryOpportunitiesTable({ rows, onSelect }: { rows: LaunchRiskRow[]; onSelect: (row: ComercialVenda) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1500px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-4 py-3">Comprador</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Motivo</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Valor potencial</th>
            <th className="px-4 py-3">Ação sugerida</th>
            <th className="px-4 py-3">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row) => (
            <tr key={row.sale.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3"><Badge value={row.priority} tone={row.priority === "Alta" ? "warn" : row.priority === "Baixa" ? "ok" : undefined} /></td>
              <td className="px-4 py-3 font-bold text-brand-teal">{row.buyer}</td>
              <td className="px-4 py-3 text-brand-teal/75">{row.product}</td>
              <td className="px-4 py-3 text-brand-teal/75">{row.reason}</td>
              <td className="px-4 py-3"><Badge value={commercialGroupLabels[row.group]} tone={groupTone(row.group)} /></td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{formatMoney(row.value)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{row.suggestion}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => onSelect(row.sale)} className="inline-flex h-8 items-center gap-1 rounded-md border border-brand-sand bg-white px-2 text-xs font-black text-brand-teal">
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Sem oportunidades de recuperação no filtro atual." /> : null}
    </div>
  );
}

function RecoveryOpportunitiesDiagnosticTable({ rows, onSelect }: { rows: LaunchRiskRow[]; onSelect: (row: ComercialVenda) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1500px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Forma de pagamento</th>
            <th className="px-4 py-3 text-right">Valor bruto potencial</th>
            <th className="px-4 py-3">Motivo original Hotmart</th>
            <th className="px-4 py-3">Categoria Norwyn</th>
            <th className="px-4 py-3">Recuperabilidade</th>
            <th className="px-4 py-3">Origem provavel</th>
            <th className="px-4 py-3">Acao sugerida</th>
            <th className="px-4 py-3">Transacao</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row) => (
            <tr key={row.sale.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 text-brand-teal/75">{row.product}</td>
              <td className="px-4 py-3"><Badge value={row.status} tone={groupTone(row.group)} /></td>
              <td className="px-4 py-3 text-brand-teal/65">{row.payment}</td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{formatMoney(row.value)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{row.classification.motivoOriginalHotmart}</td>
              <td className="px-4 py-3 text-brand-teal/75">{row.classification.categoriaMotivoNorwyn}</td>
              <td className="px-4 py-3"><Badge value={row.classification.recuperabilidade} tone={row.classification.recuperabilidade === "Alta" ? "ok" : row.classification.recuperabilidade === "Baixa" ? "warn" : undefined} /></td>
              <td className="px-4 py-3 text-brand-teal/70">{row.classification.origemProvavel}</td>
              <td className="px-4 py-3 text-brand-teal/70">{row.classification.acaoSugerida}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => onSelect(row.sale)} className="inline-flex h-8 items-center gap-1 rounded-md border border-brand-sand bg-white px-2 text-xs font-black text-brand-teal">
                  <Eye className="h-3.5 w-3.5" />
                  {row.transactionId}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Sem oportunidades de recuperacao no filtro atual." /> : null}
    </div>
  );
}

function SalesTimelineTable({ rows, onSelect }: { rows: LaunchTimelineRow[]; onSelect: (row: ComercialVenda) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Data/hora</th>
            <th className="px-4 py-3">Comprador</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Pagamento</th>
            <th className="px-4 py-3 text-right">Bruto</th>
            <th className="px-4 py-3">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row) => (
            <tr key={row.sale.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{formatDateTime(row.date)}</td>
              <td className="px-4 py-3 text-brand-teal">{row.buyer}</td>
              <td className="px-4 py-3 text-brand-teal/75">{row.product}</td>
              <td className="px-4 py-3"><Badge value={row.status} tone={groupTone(row.group)} /></td>
              <td className="px-4 py-3 text-brand-teal/65">{row.payment}</td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{formatMoney(row.value)}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => onSelect(row.sale)} className="inline-flex h-8 items-center gap-1 rounded-md border border-brand-sand bg-white px-2 text-xs font-black text-brand-teal">
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Sem transações na linha do tempo." /> : null}
    </div>
  );
}

function TransactionDetailModal({ sale, rawImports, onClose }: { sale: ComercialVenda; rawImports: ComercialRawImport[]; onClose: () => void }) {
  const classification = classifyHotmartLoss(sale, rawImports);
  const rows = [
    ["Transação", sale.transaction_id],
    ["Comprador", sale.comprador_nome ?? sale.comprador_email ?? "-"],
    ["Produto", sale.produto_nome ?? "-"],
    ["Status original", sale.status_original ?? sale.status],
    ["Grupo comercial", commercialGroupLabels[commercialGroup(sale)]],
    ["Pagamento", `${sale.forma_pagamento ?? "-"} ${sale.parcelas > 1 ? `${sale.parcelas}x` : ""}`.trim()],
    ["Valor bruto", formatMoney(sale.valor_bruto)],
    ["Valor líquido", sale.valor_liquido === null || sale.valor_liquido === undefined ? "Indisponível no payload" : formatMoney(Number(sale.valor_liquido))],
    ["Taxas", sale.taxas === null || sale.taxas === undefined ? "Indisponível no payload" : formatMoney(Number(sale.taxas))],
    ["Source", sale.source_sck ?? "-"],
    ["Compra", formatDateTime(sale.data_compra ?? sale.data_aprovacao)],
    ["Lacunas", sale.data_lacunas?.join(", ") || "-"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Detalhe da transação</p>
            <h3 className="mt-1 text-xl font-black text-brand-teal">{sale.transaction_id}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-brand-sand bg-white p-2 text-brand-teal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md border border-brand-sand bg-brand-cream/30 p-3">
              <p className="text-xs font-black uppercase text-brand-clay">{label}</p>
              <p className="mt-1 break-words text-sm font-bold text-brand-teal">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-black uppercase text-brand-clay">Diagnostico da Perda</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["Motivo original Hotmart", classification.motivoOriginalHotmart],
              ["Categoria Norwyn", classification.categoriaMotivoNorwyn],
              ["Hipotese operacional", classification.hipoteseOperacional],
              ["Recuperabilidade", classification.recuperabilidade],
              ["Origem provavel", classification.origemProvavel],
              ["Acao sugerida", classification.acaoSugerida],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/70 p-3">
                <p className="text-xs font-black uppercase text-brand-clay">{label}</p>
                <p className="mt-1 text-sm font-bold text-brand-teal">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md bg-white/70 p-3">
            <p className="text-xs font-black uppercase text-brand-clay">Evidencias usadas</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold text-brand-teal/70">
              {classification.evidencias.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommercialHypothesesPanel({
  hypotheses,
  feedbackById,
  learnings,
  onUpdate,
}: {
  hypotheses: string[];
  feedbackById: Map<string, LaunchHypothesisFeedback>;
  learnings: LaunchHypothesisFeedback[];
  onUpdate: (hypothesis: string, patch: Partial<LaunchHypothesisFeedback>) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <DataCard title="Hipóteses comerciais" helper="Leitura determinística para validar com a especialista.">
        <div className="grid gap-3">
          {hypotheses.map((hypothesis) => {
            const id = hypothesis.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const feedback = feedbackById.get(id);
            return (
              <div key={hypothesis} className="rounded-md border border-brand-sand bg-white/70 p-3">
                <p className="font-black text-brand-teal">{hypothesis}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
                  <select
                    value={feedback?.result ?? "pendente"}
                    onChange={(event) => onUpdate(hypothesis, { result: event.target.value as HypothesisResult })}
                    className="h-10 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="parcial">Parcial</option>
                    <option value="descartada">Descartada</option>
                  </select>
                  <input
                    value={feedback?.comment ?? ""}
                    onChange={(event) => onUpdate(hypothesis, { comment: event.target.value })}
                    placeholder="Comentário local sobre a hipótese"
                    className="h-10 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </DataCard>
      <DataCard title="Aprendizados do lançamento" helper="Conclusões preservadas localmente para retro.">
        <SimpleTable
          minWidth="520px"
          headers={["Hipótese", "Resultado", "Comentário"]}
          rows={learnings.map((item) => [item.hypothesis, item.result, item.comment || "-"])}
          empty="Nenhum aprendizado registrado ainda."
        />
      </DataCard>
    </div>
  );
}

function LaunchTableToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      {children}
    </div>
  );
}

function LaunchSortSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ key: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-black uppercase text-brand-teal/60">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-brand-sand bg-white px-3 text-xs font-black normal-case text-brand-teal"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function DataCard({ title, helper, children }: { title: string; helper: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-brand-sand p-4">
        <h2 className="text-lg font-black text-brand-teal">{title}</h2>
        <p className="text-xs font-bold text-brand-teal/60">{helper}</p>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

const salesExportColumns = [
  { header: "Compra", value: (row: ComercialVenda) => formatDate(row.data_compra ?? row.data_aprovacao) },
  { header: "Aluno", value: (row: ComercialVenda) => row.comprador_nome ?? row.comprador_email ?? "-" },
  { header: "E-mail", value: (row: ComercialVenda) => row.comprador_email ?? "-" },
  { header: "Produto", value: (row: ComercialVenda) => row.produto_nome ?? "-" },
  { header: "Status original", value: (row: ComercialVenda) => row.status_original ?? row.status },
  { header: "Grupo", value: (row: ComercialVenda) => commercialGroupLabels[commercialGroup(row)] },
  { header: "Pagamento", value: (row: ComercialVenda) => `${row.forma_pagamento ?? "-"} ${row.parcelas > 1 ? `${row.parcelas}x` : ""}`.trim() },
  { header: "Bruto", value: (row: ComercialVenda) => row.valor_bruto },
  { header: "Liquido", value: (row: ComercialVenda) => row.valor_liquido ?? "" },
  { header: "Taxas", value: (row: ComercialVenda) => row.taxas ?? "" },
  { header: "Previsao recebimento", value: (row: ComercialVenda) => formatDate(row.expected_payment_date) },
  { header: "SCK", value: (row: ComercialVenda) => row.source_sck ?? "" },
  { header: "Lacunas", value: (row: ComercialVenda) => Array.isArray(row.data_lacunas) ? row.data_lacunas.join("; ") : "" },
];

const launchCurveExportColumns = [
  { header: "Periodo", value: (row: LaunchTemporalRow) => row.label },
  { header: "Vendas", value: (row: LaunchTemporalRow) => row.vendas },
  { header: "Receita bruta", value: (row: LaunchTemporalRow) => row.receita },
  { header: "Compradores", value: (row: LaunchTemporalRow) => row.compradores },
];

const launchProductExportColumns = [
  { header: "Produto", value: (row: LaunchProductRow) => row.name },
  { header: "Confirmadas", value: (row: LaunchProductRow) => row.confirmed },
  { header: "Receita bruta", value: (row: LaunchProductRow) => row.revenue },
  { header: "Compradores", value: (row: LaunchProductRow) => row.buyers },
  { header: "Ticket", value: (row: LaunchProductRow) => row.ticket },
  { header: "Pendentes", value: (row: LaunchProductRow) => row.pending },
  { header: "Perdidas", value: (row: LaunchProductRow) => row.lost },
  { header: "Participacao", value: (row: LaunchProductRow) => row.share },
];

const launchStatusExportColumns = [
  { header: "Grupo", value: (row: LaunchStatusRow) => row.label },
  { header: "Quantidade", value: (row: LaunchStatusRow) => row.count },
  { header: "Valor bruto", value: (row: LaunchStatusRow) => row.revenue },
  { header: "Percentual", value: (row: LaunchStatusRow) => row.percent },
  { header: "Status originais", value: (row: LaunchStatusRow) => row.statuses.join("; ") },
];

const launchSourceExportColumns = [
  { header: "Origem", value: (row: LaunchSourceRow) => row.source },
  { header: "Vendas", value: (row: LaunchSourceRow) => row.sales },
  { header: "Receita bruta", value: (row: LaunchSourceRow) => row.revenue },
  { header: "Ticket", value: (row: LaunchSourceRow) => row.ticket },
  { header: "Participacao", value: (row: LaunchSourceRow) => row.share },
];

const launchRiskExportColumns = [
  { header: "Prioridade", value: (row: LaunchRiskRow) => row.priority },
  { header: "Produto", value: (row: LaunchRiskRow) => row.product },
  { header: "Status", value: (row: LaunchRiskRow) => row.status },
  { header: "Grupo", value: (row: LaunchRiskRow) => commercialGroupLabels[row.group] },
  { header: "Pagamento", value: (row: LaunchRiskRow) => row.payment },
  { header: "Valor potencial", value: (row: LaunchRiskRow) => row.value },
  { header: "Motivo original Hotmart", value: (row: LaunchRiskRow) => row.classification.motivoOriginalHotmart },
  { header: "Categoria Norwyn", value: (row: LaunchRiskRow) => row.classification.categoriaMotivoNorwyn },
  { header: "Recuperabilidade", value: (row: LaunchRiskRow) => row.classification.recuperabilidade },
  { header: "Origem provavel", value: (row: LaunchRiskRow) => row.classification.origemProvavel },
  { header: "Hipotese operacional", value: (row: LaunchRiskRow) => row.classification.hipoteseOperacional },
  { header: "Acao sugerida", value: (row: LaunchRiskRow) => row.classification.acaoSugerida },
  { header: "Evidencias", value: (row: LaunchRiskRow) => row.classification.evidencias.join("; ") },
  { header: "Transacao", value: (row: LaunchRiskRow) => row.transactionId },
];

const launchLossReasonExportColumns = [
  { header: "Motivo", value: (row: LaunchLossReasonRow) => row.reason },
  { header: "Casos", value: (row: LaunchLossReasonRow) => row.count },
  { header: "Valor bruto", value: (row: LaunchLossReasonRow) => row.value },
  { header: "Participacao", value: (row: LaunchLossReasonRow) => row.share },
  { header: "Exemplo", value: (row: LaunchLossReasonRow) => row.example },
];

const launchProductLossExportColumns = [
  { header: "Produto", value: (row: LaunchProductLossRow) => row.product },
  { header: "Oportunidades", value: (row: LaunchProductLossRow) => row.losses },
  { header: "Valor bruto", value: (row: LaunchProductLossRow) => row.value },
  { header: "Participacao", value: (row: LaunchProductLossRow) => row.share },
  { header: "Principal motivo", value: (row: LaunchProductLossRow) => row.topReason },
];

const launchTimelineExportColumns = [
  { header: "Data", value: (row: LaunchTimelineRow) => formatDateTime(row.date) },
  { header: "Comprador", value: (row: LaunchTimelineRow) => row.buyer },
  { header: "Produto", value: (row: LaunchTimelineRow) => row.product },
  { header: "Status", value: (row: LaunchTimelineRow) => row.status },
  { header: "Grupo", value: (row: LaunchTimelineRow) => commercialGroupLabels[row.group] },
  { header: "Pagamento", value: (row: LaunchTimelineRow) => row.payment },
  { header: "Bruto", value: (row: LaunchTimelineRow) => row.value },
  { header: "Transacao", value: (row: LaunchTimelineRow) => row.transactionId },
];

const receivableExportColumns = [
  { header: "Previsao", value: (row: ComercialRecebivel) => formatDate(row.data_prevista) },
  { header: "Transacao", value: (row: ComercialRecebivel) => row.transaction_id },
  { header: "Parcela", value: (row: ComercialRecebivel) => `${row.parcela_numero}/${row.total_parcelas}` },
  { header: "Fonte", value: (row: ComercialRecebivel) => row.fonte_previsao },
  { header: "Status", value: (row: ComercialRecebivel) => row.status },
  { header: "Valor bruto", value: (row: ComercialRecebivel) => row.valor_bruto },
  { header: "Valor liquido", value: (row: ComercialRecebivel) => row.valor_liquido ?? "" },
];

const studentExportColumns = [
  { header: "Aluno", value: (row: ComercialAluno) => row.nome ?? "-" },
  { header: "E-mail", value: (row: ComercialAluno) => row.email },
  { header: "Telefone", value: (row: ComercialAluno) => row.telefone ?? "-" },
  { header: "Primeira compra", value: (row: ComercialAluno) => formatDate(row.primeira_compra_at) },
  { header: "Ultima compra", value: (row: ComercialAluno) => formatDate(row.ultima_compra_at) },
  { header: "Expira em", value: (row: ComercialAluno) => formatDate(row.acesso_expira_em) },
  { header: "Status", value: (row: ComercialAluno) => row.status_acesso },
];

function SalesTable({ rows, allRows }: { rows: ComercialVenda[]; allRows?: ComercialVenda[] }) {
  return (
    <div className="overflow-x-auto">
      {allRows ? (
        <div className="mb-3 flex justify-end">
          <ExportButtons label="Vendas Comercial" filename="comercial_vendas" columns={salesExportColumns} rows={allRows} />
        </div>
      ) : null}
      <table className="w-full min-w-[1240px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Compra</th>
            <th className="px-4 py-3">Aluno</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Grupo</th>
            <th className="px-4 py-3">Pagamento</th>
            <th className="px-4 py-3 text-right">Bruto</th>
            <th className="px-4 py-3 text-right">Liquido</th>
            <th className="px-4 py-3">Previsao</th>
            <th className="px-4 py-3">Lacunas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{formatDate(row.data_compra ?? row.data_aprovacao)}</td>
              <td className="px-4 py-3 text-brand-teal">{row.comprador_nome ?? row.comprador_email ?? "-"}</td>
              <td className="px-4 py-3 text-brand-teal/75">{row.produto_nome ?? "-"}</td>
              <td className="px-4 py-3"><Badge value={row.status_original ?? row.status} /></td>
              <td className="px-4 py-3"><Badge value={commercialGroupLabels[commercialGroup(row)]} tone={commercialGroup(row) === "confirmed" ? "ok" : commercialGroup(row) === "unknown" ? "warn" : undefined} /></td>
              <td className="px-4 py-3 text-brand-teal/65">{row.forma_pagamento ?? "-"} {row.parcelas > 1 ? `${row.parcelas}x` : ""}</td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{formatMoney(row.valor_bruto)}</td>
              <td className="px-4 py-3 text-right text-brand-teal/75">
                {row.valor_liquido === null || row.valor_liquido === undefined ? (
                  <span className="text-xs font-bold text-amber-700">Não informado</span>
                ) : (
                  formatMoney(row.valor_liquido)
                )}
              </td>
              <td className="px-4 py-3 text-brand-teal/70">{formatDate(row.expected_payment_date)}</td>
              <td className="px-4 py-3 text-xs font-bold text-brand-teal/60">{Array.isArray(row.data_lacunas) && row.data_lacunas.length ? row.data_lacunas.join(", ") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Nenhuma venda importada ainda." /> : null}
    </div>
  );
}

function ReceivablesTable({ rows, compact = false }: { rows: ComercialRecebivel[]; compact?: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Previsao</th>
            <th className="px-4 py-3">Transacao</th>
            <th className="px-4 py-3">Parcela</th>
            <th className="px-4 py-3">Fonte</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{formatDate(row.data_prevista)}</td>
              <td className="px-4 py-3 text-brand-teal">{row.transaction_id}</td>
              <td className="px-4 py-3 text-brand-teal/70">{row.parcela_numero}/{row.total_parcelas}</td>
              <td className="px-4 py-3"><Badge value={row.fonte_previsao} tone={row.fonte_previsao === "hotmart" ? "ok" : "warn"} /></td>
              <td className="px-4 py-3"><Badge value={row.status} /></td>
              <td className="px-4 py-3 text-right font-black text-brand-teal">{row.valor_liquido === null || row.valor_liquido === undefined ? <span className="text-xs font-bold text-amber-700">Não informado</span> : formatMoney(row.valor_liquido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text={compact ? "Nenhum recebivel no periodo." : "Nenhum recebivel importado ainda."} /> : null}
    </div>
  );
}

function StudentsTable({ rows, allRows }: { rows: ComercialAluno[]; allRows?: ComercialAluno[] }) {
  return (
    <div className="overflow-x-auto">
      {allRows ? (
        <div className="mb-3 flex justify-end">
          <ExportButtons label="Alunos Comercial" filename="comercial_alunos" columns={studentExportColumns} rows={allRows} />
        </div>
      ) : null}
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#F3DDE1] text-xs uppercase text-brand-clay">
          <tr>
            <th className="px-4 py-3">Aluno</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Ultima compra</th>
            <th className="px-4 py-3">Expira em</th>
            <th className="px-4 py-3">Ultimo acesso</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-sand/70">
              <td className="px-4 py-3 font-bold text-brand-teal">{row.nome ?? "-"}</td>
              <td className="px-4 py-3 text-brand-teal">{row.email}</td>
              <td className="px-4 py-3 text-brand-teal/70">{formatDate(row.ultima_compra_at)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{formatDate(row.acesso_expira_em)}</td>
              <td className="px-4 py-3 text-brand-teal/70">{formatDate(row.ultimo_acesso_at)}</td>
              <td className="px-4 py-3"><Badge value={row.status_acesso} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="Nenhum aluno importado ainda." /> : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalRows,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  onPage: (page: number) => void;
}) {
  const start = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalRows);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-brand-teal/65">
      <span>
        {start}-{end} de {totalRows} registros
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-brand-sand bg-white px-3 text-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
        <span className="rounded-md bg-brand-cream px-3 py-2">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-brand-sand bg-white px-3 text-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
        >
          Avançar
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Badge({ value, tone }: { value: string; tone?: "ok" | "warn" }) {
  const className =
    tone === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-100 text-amber-700"
        : "bg-brand-sand text-brand-teal";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>{value}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-5 text-sm font-bold text-brand-teal/60">{text}</p>;
}
