import { createAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

export type HotmartImportPayload = {
  tenant_id?: string;
  rows: RawRow[];
};

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const normalized = value.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
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

function addDaysIsoDate(value: string | null, days: number) {
  const base = value ? new Date(value) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
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

function normalizeRow(row: RawRow) {
  const transactionId = stringValue(
    row.transaction_id,
    row.transaction,
    row.purchase_transaction,
    readPath(row, "purchase.transaction"),
    readPath(row, "data.purchase.transaction"),
    readPath(row, "data.transaction"),
  );

  const productId = stringValue(
    row.hotmart_product_id,
    row.product_id,
    readPath(row, "product.id"),
    readPath(row, "data.product.id"),
    readPath(row, "purchase.product.id"),
  );
  const productName = stringValue(
    row.produto_nome,
    row.product_name,
    row.product,
    readPath(row, "product.name"),
    readPath(row, "data.product.name"),
    readPath(row, "purchase.product.name"),
  );
  const buyerEmail = stringValue(
    row.comprador_email,
    row.buyer_email,
    row.email,
    readPath(row, "buyer.email"),
    readPath(row, "data.buyer.email"),
    readPath(row, "purchase.buyer.email"),
  )?.toLowerCase();
  const buyerName = stringValue(
    row.comprador_nome,
    row.buyer_name,
    row.name,
    readPath(row, "buyer.name"),
    readPath(row, "data.buyer.name"),
    readPath(row, "purchase.buyer.name"),
  );
  const buyerPhone = stringValue(row.telefone, row.buyer_phone, readPath(row, "buyer.phone"), readPath(row, "data.buyer.phone"));
  const status = stringValue(row.status, row.purchase_status, readPath(row, "purchase.status"), readPath(row, "data.purchase.status")) ?? "unknown";
  const grossAmount =
    numberValue(
      row.valor_bruto,
      row.gross_amount,
      row.price,
      readPath(row, "price.value"),
      readPath(row, "purchase.price.value"),
      readPath(row, "data.purchase.price.value"),
    ) ?? 0;
  const netAmount = numberValue(row.valor_liquido, row.net_amount, readPath(row, "commission.value"), readPath(row, "data.commission.value"));
  const installments = integerValue(row.parcelas, row.installments, readPath(row, "payment.installments"), readPath(row, "data.payment.installments"));
  const purchaseDate = dateValue(row.data_compra, row.purchase_date, readPath(row, "purchase.order_date"), readPath(row, "data.purchase.order_date"));
  const approvedDate = dateValue(row.data_aprovacao, row.approved_date, readPath(row, "purchase.approved_date"), readPath(row, "data.purchase.approved_date")) ?? purchaseDate;
  const expectedDate = dateValue(
    row.data_prevista,
    row.expected_payment_date,
    row.release_date,
    readPath(row, "receivable.expected_payment_date"),
    readPath(row, "data.receivable.expected_payment_date"),
  );

  return {
    eventId: stringValue(row.event_id, row.id, readPath(row, "event.id"), readPath(row, "data.event.id")),
    transactionId,
    productId,
    productName,
    buyerEmail,
    buyerName,
    buyerPhone,
    status,
    paymentType: stringValue(row.forma_pagamento, row.payment_type, readPath(row, "payment.type"), readPath(row, "data.payment.type")),
    installments,
    currency: stringValue(row.moeda, row.currency, readPath(row, "price.currency_code"), readPath(row, "data.purchase.price.currency_code")) ?? "BRL",
    grossAmount,
    netAmount,
    fees: numberValue(row.taxas, row.fees, row.platform_fee),
    coproduction: numberValue(row.coproducao, row.coproduction),
    purchaseDate,
    approvedDate,
    refundDate: dateValue(row.data_reembolso, row.refund_date, readPath(row, "purchase.refund_date"), readPath(row, "data.purchase.refund_date")),
    chargebackDate: dateValue(row.data_chargeback, row.chargeback_date, readPath(row, "purchase.chargeback_date"), readPath(row, "data.purchase.chargeback_date")),
    sourceSck: stringValue(row.source_sck, row.sck, row.src, readPath(row, "tracking.source_sck"), readPath(row, "data.tracking.source_sck")),
    expectedDate,
    expectedSource: expectedDate ? "hotmart" : "projetado",
  };
}

export async function importHotmartRows(payload: HotmartImportPayload) {
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");

  const tenantId = payload.tenant_id;
  if (!tenantId) throw new Error("tenant_id obrigatorio para importar Hotmart.");

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (const [index, row] of payload.rows.entries()) {
    try {
      const normalized = normalizeRow(row);
      if (!normalized.transactionId || !normalized.buyerEmail) {
        skipped += 1;
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
        status_acesso: normalized.status.toLowerCase().includes("refund") ? "reembolsado" : "nao_validado",
      };

      const { data: student, error: studentError } = existingStudent
        ? await admin.from("comercial_alunos").update(studentPayload).eq("id", existingStudent.id).select("id").single()
        : await admin.from("comercial_alunos").insert(studentPayload).select("id").single();
      if (studentError) throw studentError;

      const salePayload = {
        tenant_id: tenantId,
        transaction_id: normalized.transactionId,
        aluno_id: student.id,
        produto_id: productId,
        hotmart_product_id: normalized.productId,
        produto_nome: normalized.productName,
        comprador_nome: normalized.buyerName,
        comprador_email: normalized.buyerEmail,
        status: normalized.status,
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
        source_sck: normalized.sourceSck,
        origem: "hotmart",
        raw_id: raw.id,
        metadata: { importado_por: "n8n" },
      };

      const { data: sale, error: saleError } = await admin
        .from("comercial_vendas")
        .upsert(salePayload, { onConflict: "tenant_id,transaction_id" })
        .select("id")
        .single();
      if (saleError) throw saleError;

      const expectedBase = normalized.expectedDate?.slice(0, 10) ?? addDaysIsoDate(normalized.approvedDate ?? normalized.purchaseDate, 30);
      const receivableStatus = normalized.status.toLowerCase().includes("refund") || normalized.status.toLowerCase().includes("chargeback") ? "reembolsado" : "previsto";
      const installments = Math.max(1, normalized.installments);
      const grossInstallment = normalized.grossAmount / installments;
      const netInstallment = normalized.netAmount ? normalized.netAmount / installments : null;

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
            fonte_previsao: normalized.expectedSource,
            metadata: {
              regra_projecao: normalized.expectedDate ? null : "data_aprovacao + 30 dias; parcelas mensais projetadas",
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
          status: receivableStatus === "reembolsado" ? "reembolsada" : "pendente",
          data_vencimento: dueDate,
          valor: grossInstallment,
          metadata: {
            fonte_previsao: normalized.expectedSource,
          },
          },
          { onConflict: "tenant_id,transaction_id,parcela_numero" },
        );
      }

      imported += 1;
    } catch (error) {
      errors.push({ row: index + 1, error: error instanceof Error ? error.message : "Erro desconhecido" });
    }
  }

  return {
    imported,
    skipped,
    errors,
  };
}
