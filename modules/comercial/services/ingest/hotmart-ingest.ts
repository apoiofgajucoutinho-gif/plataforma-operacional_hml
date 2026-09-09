import { createAdminClient } from "@/lib/supabase/admin";
import { extractTrackingFromPayload } from "@/modules/norwyn/services/tracking-hardening";

type RawRow = Record<string, unknown>;

type CommercialStatusGroup = "confirmed" | "pending" | "lost" | "refunded" | "chargeback" | "unknown";

export type HotmartImportPayload = {
  tenant_id?: string;
  rows: RawRow[];
};

export type HotmartImportResult = {
  ok: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
};

const CONFIRMED_STATUSES = new Set(["APPROVED", "APPROVADO", "COMPLETE", "COMPLETO", "COMPLETED"]);
const PENDING_STATUSES = new Set([
  "STARTED",
  "WAITING_PAYMENT",
  "PRINTED_BILLET",
  "PROCESSING_TRANSACTION",
  "UNDER_ANALISYS",
  "UNDER_ANALYSIS",
  "PRE_ORDER",
  "OVERDUE",
]);
const LOST_STATUSES = new Set(["CANCELLED", "CANCELED", "CANCELADO", "CANCELADA", "EXPIRED", "EXPIRADO", "EXPIRADA", "NO_FUNDS", "BLOCKED", "PROTESTED"]);
const REFUNDED_STATUSES = new Set(["REFUNDED", "PARTIALLY_REFUNDED", "REEMBOLSADO", "REEMBOLSADA"]);
const CHARGEBACK_STATUSES = new Set(["CHARGEBACK"]);
const LEARNING_EVENT_STATUSES = new Set([
  "CLUB_FIRST_ACCESS",
  "CLUB_MODULE_COMPLETED",
  "CLUB_COURSE_COMPLETED",
  "CLUB_LESSON_COMPLETED",
  "COURSE_STARTED",
  "COURSE_COMPLETED",
  "LESSON_STARTED",
  "LESSON_COMPLETED",
  "MODULE_STARTED",
  "MODULE_COMPLETED",
  "CERTIFICATE_GENERATED",
  "FIRST_ACCESS",
]);
const CHECKOUT_EVENT_STATUSES = new Set(["CHECKOUT_ABANDONMENT", "CHECKOUT_STARTED", "CART_ABANDONED"]);

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function parseHotmartNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;

  const compact = value
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/[^0-9,.-]/g, "");
  if (!compact) return null;

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma >= 0 && lastDot >= 0
    ? lastComma > lastDot ? "," : "."
    : lastComma >= 0
      ? compact.length - lastComma - 1 === 2 ? "," : null
      : lastDot >= 0 && compact.length - lastDot - 1 === 2 ? "." : null;

  const normalized = decimalSeparator
    ? compact
        .replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "")
        .replace(decimalSeparator, ".")
    : compact.replace(/[,.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = parseHotmartNumber(value);
    if (parsed !== null) return parsed;
    if (value && typeof value === "object") {
      const objectValue = value as Record<string, unknown>;
      const nested = numberValue(objectValue.value, objectValue.amount, objectValue.total, objectValue.price);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function integerValue(...values: unknown[]) {
  const value = numberValue(...values);
  return value ? Math.max(1, Math.round(value)) : 1;
}

function dateValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  return null;
}

function addMonthsIsoDate(value: string, months: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() !== day) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

function readPath(row: RawRow, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return null;
    return (current as Record<string, unknown>)[key];
  }, row);
}

function arrayValue(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  }
  return [];
}

function normalizeStatusValue(status: string | null) {
  if (!status) return "UNKNOWN";
  return status.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function commercialStatusGroup(statusNormalizado: string): CommercialStatusGroup {
  if (CONFIRMED_STATUSES.has(statusNormalizado)) return "confirmed";
  if (PENDING_STATUSES.has(statusNormalizado)) return "pending";
  if (REFUNDED_STATUSES.has(statusNormalizado)) return "refunded";
  if (CHARGEBACK_STATUSES.has(statusNormalizado)) return "chargeback";
  if (LOST_STATUSES.has(statusNormalizado)) return "lost";
  return "unknown";
}
function eventClassFor(statusNormalizado: string, transactionId: string | null) {
  if (LEARNING_EVENT_STATUSES.has(statusNormalizado)) return statusNormalizado.includes("MODULE") ? "MODULE_EVENT" : "PRODUCT_ACCESS_EVENT";
  if (CHECKOUT_EVENT_STATUSES.has(statusNormalizado)) return "CHECKOUT_EVENT";
  if (transactionId) return "SALE_TRANSACTION";
  return "UNKNOWN_EVENT";
}

function eligibilityFor(input: { statusNormalizado: string; grupoComercial: CommercialStatusGroup; currency: string; transactionId: string | null }) {
  const eventClass = eventClassFor(input.statusNormalizado, input.transactionId);
  const commercialTransaction = eventClass === "SALE_TRANSACTION";
  const isBundleChild = input.transactionId ? /^HP\d+C\d+$/.test(input.transactionId) : false;
  const saleConfirmed = commercialTransaction && input.grupoComercial === "confirmed";
  const currency = input.currency.trim().toUpperCase();
  const saleComparable = commercialTransaction;
  const revenueEligible = saleConfirmed && currency === "BRL" && !isBundleChild;
  const studentEligible = saleConfirmed && !isBundleChild;
  const eligibilityReason = !commercialTransaction
    ? "non_commercial_event"
    : !saleConfirmed
      ? "not_confirmed_status"
      : currency !== "BRL"
        ? "non_brl_currency"
        : isBundleChild
          ? "bundle_item_requires_review"
          : "brl_confirmed_sale";

  return { eventClass, commercialTransaction, saleConfirmed, saleComparable, revenueEligible, studentEligible, eligibilityReason };
}

function commissionValue(row: RawRow) {
  const direct = numberValue(
    row.valor_liquido,
    row.net_amount,
    row.producer_net_amount,
    readPath(row, "commission.value"),
    readPath(row, "commission.amount"),
    readPath(row, "data.commission.value"),
    readPath(row, "data.commission.amount"),
    readPath(row, "purchase.commission.value"),
    readPath(row, "data.purchase.commission.value"),
  );
  if (direct !== null) return direct;

  const commissions = arrayValue(
    row.commissions,
    readPath(row, "data.commissions"),
    readPath(row, "purchase.commissions"),
    readPath(row, "data.purchase.commissions"),
  );

  const producerCommission = commissions.find((item) => {
    const source = stringValue(item.source, item.role, item.type, item.name)?.toUpperCase() ?? "";
    return source.includes("PRODUCER") || source.includes("PRODUTOR") || source.includes("SELLER");
  });

  return producerCommission
    ? numberValue(producerCommission.value, producerCommission.amount, producerCommission.commission)
    : null;
}

function firstReceivableDate(row: RawRow) {
  const receivables = arrayValue(
    row.receivables,
    row.installments,
    readPath(row, "data.receivables"),
    readPath(row, "data.purchase.receivables"),
    readPath(row, "purchase.receivables"),
  );

  for (const item of receivables) {
    const date = dateValue(
      item.expected_payment_date,
      item.payment_date,
      item.release_date,
      item.due_date,
      item.date,
    );
    if (date) return date;
  }

  return null;
}

function normalizeRow(row: RawRow) {
  const tracking = extractTrackingFromPayload(row, stringValue(row.source_sck, row.sck, row.src));
  const transactionId = stringValue(
    row.transaction_id,
    row.transaction,
    row.purchase_transaction,
    readPath(row, "purchase.transaction"),
    readPath(row, "purchase.transaction.code"),
    readPath(row, "data.purchase.transaction"),
    readPath(row, "data.purchase.transaction.code"),
    readPath(row, "data.transaction"),
  );

  const productId = stringValue(
    row.hotmart_product_id,
    row.product_id,
    readPath(row, "product.id"),
    readPath(row, "data.product.id"),
    readPath(row, "purchase.product.id"),
    readPath(row, "data.purchase.product.id"),
  );
  const productName = stringValue(
    row.produto_nome,
    row.product_name,
    row.product,
    readPath(row, "product.name"),
    readPath(row, "data.product.name"),
    readPath(row, "purchase.product.name"),
    readPath(row, "data.purchase.product.name"),
  );
  const buyerEmail = stringValue(
    row.comprador_email,
    row.buyer_email,
    row.email,
    readPath(row, "buyer.email"),
    readPath(row, "data.buyer.email"),
    readPath(row, "purchase.buyer.email"),
    readPath(row, "data.purchase.buyer.email"),
  )?.toLowerCase() ?? null;
  const buyerName = stringValue(
    row.comprador_nome,
    row.buyer_name,
    row.name,
    readPath(row, "buyer.name"),
    readPath(row, "data.buyer.name"),
    readPath(row, "purchase.buyer.name"),
    readPath(row, "data.purchase.buyer.name"),
  );
  const buyerPhone = stringValue(
    row.telefone,
    row.buyer_phone,
    readPath(row, "buyer.phone"),
    readPath(row, "data.buyer.phone"),
    readPath(row, "purchase.buyer.phone"),
  );
  const statusOriginal = stringValue(
    row.status,
    row.purchase_status,
    readPath(row, "purchase.status"),
    readPath(row, "data.purchase.status"),
  ) ?? "unknown";
  const statusNormalizado = normalizeStatusValue(statusOriginal);
  const grupoComercial = commercialStatusGroup(statusNormalizado);
  const grossAmount = numberValue(
    row.valor_bruto,
    row.gross_amount,
    row.price,
    readPath(row, "price.value"),
    readPath(row, "purchase.price.value"),
    readPath(row, "purchase.full_price.value"),
    readPath(row, "data.purchase.price.value"),
    readPath(row, "data.purchase.full_price.value"),
  ) ?? 0;
  const netAmount = commissionValue(row);
  const fees = numberValue(
    row.taxas,
    row.fees,
    row.platform_fee,
    readPath(row, "purchase.fees.value"),
    readPath(row, "data.purchase.fees.value"),
  );
  const installments = integerValue(
    row.parcelas,
    row.installments,
    readPath(row, "payment.installments"),
    readPath(row, "data.payment.installments"),
    readPath(row, "purchase.payment.installments"),
    readPath(row, "data.purchase.payment.installments"),
  );
  const purchaseDate = dateValue(
    row.data_compra,
    row.purchase_date,
    readPath(row, "purchase.order_date"),
    readPath(row, "data.purchase.order_date"),
    readPath(row, "data.purchase.date"),
  );
  const approvedDate = dateValue(
    row.data_aprovacao,
    row.approved_date,
    readPath(row, "purchase.approved_date"),
    readPath(row, "data.purchase.approved_date"),
  ) ?? purchaseDate;
  const expectedDate = dateValue(
    row.expected_payment_date,
    row.release_date,
    readPath(row, "receivable.expected_payment_date"),
    readPath(row, "data.receivable.expected_payment_date"),
    readPath(row, "data.purchase.payment.expected_payment_date"),
    firstReceivableDate(row),
  );
  const eventDate = dateValue(
    row.event_date,
    row.created_at,
    readPath(row, "event.created_at"),
    readPath(row, "data.event.created_at"),
    purchaseDate,
  );
  const eligibility = eligibilityFor({ statusNormalizado, grupoComercial, currency: stringValue(row.moeda, row.currency, readPath(row, "price.currency_code"), readPath(row, "data.purchase.price.currency_code")) ?? "BRL", transactionId });
  const dataLacunas: string[] = [];

  if (!transactionId) dataLacunas.push("transaction_id_missing");
  if (!buyerEmail && !buyerName) dataLacunas.push("buyer_missing");
  if (!productId && !productName) dataLacunas.push("product_missing");
  if (grupoComercial === "unknown") dataLacunas.push("unmapped_status");
  if (grupoComercial === "confirmed" && netAmount === null) dataLacunas.push("net_amount_missing");
  if (grupoComercial === "confirmed" && !expectedDate) dataLacunas.push("expected_payment_date_missing");

  return {
    eventId: stringValue(row.event_id, row.id, readPath(row, "event.id"), readPath(row, "data.event.id")),
    transactionId,
    productId,
    productName,
    buyerEmail,
    buyerName,
    buyerPhone,
    statusOriginal,
    statusNormalizado,
    grupoComercial,
    paymentType: stringValue(
      row.forma_pagamento,
      row.payment_type,
      readPath(row, "payment.type"),
      readPath(row, "data.payment.type"),
      readPath(row, "purchase.payment.type"),
      readPath(row, "data.purchase.payment.type"),
    ),
    installments,
    currency: stringValue(
      row.moeda,
      row.currency,
      readPath(row, "price.currency_code"),
      readPath(row, "data.purchase.price.currency_code"),
    ) ?? "BRL",
    ...eligibility,
    grossAmount,
    netAmount,
    fees,
    coproduction: numberValue(row.coproducao, row.coproduction),
    purchaseDate,
    approvedDate,
    refundDate: dateValue(row.data_reembolso, row.refund_date, readPath(row, "purchase.refund_date"), readPath(row, "data.purchase.refund_date")),
    chargebackDate: dateValue(row.data_chargeback, row.chargeback_date, readPath(row, "purchase.chargeback_date"), readPath(row, "data.purchase.chargeback_date")),
    sourceSck: tracking.sourceSck,
    tracking,
    expectedDate,
    eventDate,
    dataLacunas,
  };
}

function receivableStatusFor(grupo: CommercialStatusGroup, expectedDate: string) {
  if (grupo === "refunded" || grupo === "chargeback") return "reembolsado";
  if (grupo === "lost") return "cancelado";
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${expectedDate.slice(0, 10)}T00:00:00`);
  return dueDate < todayDate ? "disponivel" : "previsto";
}

export async function importHotmartRows(payload: HotmartImportPayload): Promise<HotmartImportResult> {
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");

  const tenantId = payload.tenant_id;
  if (!tenantId) throw new Error("tenant_id obrigatorio para importar Hotmart.");
  if (!Array.isArray(payload.rows)) throw new Error("rows deve ser um array.");

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (const [index, row] of payload.rows.entries()) {
    try {
      const normalized = normalizeRow(row);
      if (!normalized.transactionId && normalized.commercialTransaction) {
        skipped += 1;
        errors.push({ row: index + 1, error: "Linha ignorada: transaction_id ausente em evento comercial." });
        continue;
      }

      const { data: raw, error: rawError } = await admin
        .from("comercial_hotmart_raw")
        .upsert(
          {
            tenant_id: tenantId,
            event_id: normalized.eventId,
            transaction_id: normalized.transactionId,
            payload: row,
            status: "processado",
            processed_at: new Date().toISOString(),
          },
          normalized.eventId ? { onConflict: "tenant_id,event_id" } : undefined,
        )
        .select("id")
        .single();
      if (rawError) throw rawError;

      if (!normalized.commercialTransaction) {
        await admin.from("norwyn_hotmart_learning_events").insert({
          tenant_id: tenantId,
          raw_id: raw.id,
          event_id: normalized.eventId,
          event_class: normalized.eventClass,
          learner_email: normalized.buyerEmail,
          learner_name: normalized.buyerName,
          product_external_id: normalized.productId,
          product_name: normalized.productName,
          occurred_at: normalized.eventDate,
          source: "hotmart",
          metadata: { payload: row, eligibility_reason: normalized.eligibilityReason },
        });
        imported += 1;
        continue;
      }

      let productId: string | null = null;
      if (normalized.productId || normalized.productName) {
        const productPayload = {
          tenant_id: tenantId,
          plataforma: "hotmart",
          hotmart_product_id: normalized.productId,
          nome: normalized.productName ?? normalized.productId ?? "Produto Hotmart sem nome",
        };

        if (normalized.productId) {
          const { data: product, error: productError } = await admin
            .from("comercial_produtos")
            .upsert(productPayload, { onConflict: "tenant_id,hotmart_product_id" })
            .select("id")
            .single();
          if (!productError) productId = product.id;
        } else {
          const { data: existingProduct } = await admin
            .from("comercial_produtos")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("plataforma", "hotmart")
            .eq("nome", productPayload.nome)
            .maybeSingle();

          if (existingProduct) {
            productId = existingProduct.id;
          } else {
            const { data: product, error: productError } = await admin
              .from("comercial_produtos")
              .insert(productPayload)
              .select("id")
              .single();
            if (!productError) productId = product.id;
          }
        }
      }

      let studentId: string | null = null;
      if (normalized.studentEligible && normalized.buyerEmail) {
        const { data: existingStudent } = await admin
          .from("comercial_alunos")
          .select("id, primeira_compra_at")
          .eq("tenant_id", tenantId)
          .eq("email", normalized.buyerEmail)
          .maybeSingle();

        const studentPayload = {
          tenant_id: tenantId,
          nome: normalized.buyerName,
          email: normalized.buyerEmail,
          telefone: normalized.buyerPhone,
          origem: "hotmart",
          primeira_compra_at: existingStudent?.primeira_compra_at ?? normalized.approvedDate ?? normalized.purchaseDate,
          ultima_compra_at: normalized.approvedDate ?? normalized.purchaseDate,
          status_acesso: normalized.grupoComercial === "refunded" || normalized.grupoComercial === "chargeback" ? "reembolsado" : "nao_validado",
        };

        const { data: student, error: studentError } = existingStudent
          ? await admin.from("comercial_alunos").update(studentPayload).eq("id", existingStudent.id).select("id").single()
          : await admin.from("comercial_alunos").insert(studentPayload).select("id").single();
        if (studentError) throw studentError;
        studentId = student.id;
      }

      const { data: existingSale } = await admin
        .from("comercial_vendas")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("transaction_id", normalized.transactionId)
        .maybeSingle();

      const salePayload = {
        tenant_id: tenantId,
        transaction_id: normalized.transactionId,
        aluno_id: studentId,
        produto_id: productId,
        hotmart_product_id: normalized.productId,
        produto_nome: normalized.productName,
        comprador_nome: normalized.buyerName,
        comprador_email: normalized.buyerEmail,
        status: normalized.statusOriginal,
        status_original: normalized.statusOriginal,
        status_normalizado: normalized.statusNormalizado,
        grupo_comercial: normalized.grupoComercial,
        commercial_transaction: normalized.commercialTransaction,
        sale_confirmed: normalized.saleConfirmed,
        revenue_eligible: normalized.revenueEligible,
        student_eligible: normalized.studentEligible,
        sale_comparable: normalized.saleComparable,
        event_class: normalized.eventClass,
        eligibility_reason: normalized.eligibilityReason,
        forma_pagamento: normalized.paymentType,
        parcelas: normalized.installments,
        moeda: normalized.currency,
        valor_bruto: normalized.grossAmount,
        valor_liquido: normalized.netAmount,
        taxas: normalized.fees,
        coproducao: normalized.coproduction,
        data_compra: normalized.purchaseDate,
        data_aprovacao: normalized.approvedDate,
        data_reembolso: normalized.refundDate,
        data_chargeback: normalized.chargebackDate,
        expected_payment_date: normalized.expectedDate ? normalized.expectedDate.slice(0, 10) : null,
        source_sck: normalized.sourceSck,
        origem: "hotmart",
        raw_id: raw.id,
        last_event_at: normalized.eventDate,
        imported_at: new Date().toISOString(),
        data_lacunas: normalized.dataLacunas,
        metadata: {
          importado_por: "n8n",
          eligibility_reason: normalized.eligibilityReason,
          net_amount_source: normalized.netAmount === null ? "missing" : "hotmart_payload",
          expected_payment_source: normalized.expectedDate ? "hotmart_payload" : "missing",
          tracking_source: normalized.tracking.trackingSource,
          tracking_confidence: normalized.tracking.trackingConfidence,
          tracking: {
            source_sck: normalized.tracking.sourceSck,
            utm_source: normalized.tracking.source,
            utm_medium: normalized.tracking.medium,
            utm_campaign: normalized.tracking.campaign,
            utm_content: normalized.tracking.content,
            utm_term: normalized.tracking.term,
            campaign_id: normalized.tracking.campaignId,
            adset_id: normalized.tracking.adsetId,
            ad_id: normalized.tracking.adId,
            fbclid: normalized.tracking.fbclid,
            gclid: normalized.tracking.gclid,
            click_id: normalized.tracking.clickId,
            landing_url: normalized.tracking.landingUrl,
            checkout_url: normalized.tracking.checkoutUrl,
          },
        },
      };

      const { data: sale, error: saleError } = await admin
        .from("comercial_vendas")
        .upsert(salePayload, { onConflict: "tenant_id,transaction_id" })
        .select("id")
        .single();
      if (saleError) throw saleError;

      if (normalized.revenueEligible && normalized.expectedDate) {
        const installments = Math.max(1, normalized.installments);
        const grossInstallment = normalized.grossAmount / installments;
        const netInstallment = normalized.netAmount === null ? null : normalized.netAmount / installments;
        const receivableStatus = receivableStatusFor(normalized.grupoComercial, normalized.expectedDate);
        const expectedBase = normalized.expectedDate.slice(0, 10);

        for (let installment = 1; installment <= installments; installment += 1) {
          const dueDate = addMonthsIsoDate(expectedBase, installment - 1);
          await admin.from("comercial_recebiveis").upsert(
            {
              tenant_id: tenantId,
              venda_id: sale.id,
              transaction_id: normalized.transactionId,
              parcela_numero: installment,
              total_parcelas: installments,
              status: receivableStatus,
              data_prevista: dueDate,
              valor_bruto: grossInstallment,
              valor_liquido: netInstallment,
              fonte_previsao: "hotmart",
              metadata: {
                expected_payment_source: "hotmart_payload",
                net_amount_source: normalized.netAmount === null ? "missing" : "hotmart_payload",
              },
            },
            { onConflict: "tenant_id,transaction_id,parcela_numero" },
          );

          await admin.from("comercial_parcelas").upsert(
            {
              tenant_id: tenantId,
              venda_id: sale.id,
              transaction_id: normalized.transactionId,
              parcela_numero: installment,
              total_parcelas: installments,
              status: receivableStatus === "reembolsado" ? "reembolsada" : receivableStatus === "cancelado" ? "cancelada" : "pendente",
              data_vencimento: dueDate,
              valor: grossInstallment,
              metadata: {
                fonte_previsao: "hotmart",
                net_amount_source: normalized.netAmount === null ? "missing" : "hotmart_payload",
              },
            },
            { onConflict: "tenant_id,transaction_id,parcela_numero" },
          );
        }
      }

      if (existingSale) updated += 1;
      else imported += 1;
    } catch (error) {
      errors.push({ row: index + 1, error: error instanceof Error ? error.message : "Erro desconhecido" });
    }
  }

  return {
    ok: errors.length === 0,
    imported,
    updated,
    skipped,
    errors,
  };
}



