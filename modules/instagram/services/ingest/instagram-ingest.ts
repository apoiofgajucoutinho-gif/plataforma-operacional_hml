import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InstagramPostType } from "@/modules/instagram/types";
import type { Json } from "@/types/database";

type RawInstagramRow = Record<string, unknown>;

type NormalizedInstagramRow = {
  data_coleta: string | null;
  post_id: string;
  tipo_postagem: string | null;
  tipo: InstagramPostType;
  likes: number;
  comentarios: number;
  data_postagem: string;
  hora_postagem: string | null;
  legenda: string | null;
  permalink: string | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  engajamento_score: number | null;
  engajamento_classificacao: "Bom" | "Medio" | "Ruim" | "N/A";
  raw_payload: Json;
};

export type InstagramImportPayload = {
  tenantName?: string;
  accountName?: string;
  username?: string;
  source?: string;
  rows?: RawInstagramRow[];
};

function firstValue(row: RawInstagramRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function toInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function toRequiredInteger(value: unknown) {
  return toInteger(value) ?? 0;
}

function toText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function normalizePostId(value: unknown) {
  const text = toText(value);

  if (!text) {
    return null;
  }

  const number = Number(text);

  if (Number.isFinite(number) && Number.isInteger(number)) {
    return String(number);
  }

  return text;
}

function normalizePostType(value: unknown): InstagramPostType {
  const text = String(value ?? "").toLowerCase();

  if (text.includes("reel") || text.includes("video")) {
    return "Reels";
  }

  if (
    text.includes("carousel") ||
    text.includes("carross") ||
    text.includes("carros") ||
    text.includes("album")
  ) {
    return "Carrossel";
  }

  if (text.includes("image") || text.includes("foto") || text.includes("static") || text.includes("estat")) {
    return "Estatico";
  }

  return "Outro";
}

function normalizeDate(value: unknown) {
  const text = toText(value);

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);

  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;

    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function normalizeTime(value: unknown) {
  const text = toText(value);

  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    return null;
  }

  const [, hour, minute, second = "00"] = match;

  return `${hour.padStart(2, "0")}:${minute}:${second}`;
}

function engagement(params: {
  likes: number;
  comentarios: number;
  saved: number | null;
  reach: number | null;
}) {
  const { likes, comentarios, saved, reach } = params;

  if (!reach || reach <= 0 || (likes <= 0 && comentarios <= 0)) {
    return {
      score: null,
      classification: "N/A" as const,
    };
  }

  const rate = (likes + comentarios + (saved ?? 0)) / reach;

  if (rate >= 0.05) {
    return { score: rate, classification: "Bom" as const };
  }

  if (rate >= 0.02) {
    return { score: rate, classification: "Medio" as const };
  }

  return { score: rate, classification: "Ruim" as const };
}

function normalizeRow(row: RawInstagramRow): NormalizedInstagramRow {
  const postId = normalizePostId(firstValue(row, ["post_id", "id"]));
  const dataPostagem = normalizeDate(
    firstValue(row, ["data_postagem", "data postagem", "postagem", "date"]),
  );
  const permalink = toText(firstValue(row, ["permalink", "link", "url"]));

  if (!postId) {
    throw new Error("Linha sem post_id.");
  }

  if (!dataPostagem) {
    throw new Error(`Post ${postId} sem data_postagem valida.`);
  }

  const likes = toRequiredInteger(firstValue(row, ["likes", "curtidas"]));
  const comentarios = toRequiredInteger(
    firstValue(row, ["comentarios", "comentários", "comments"]),
  );
  const reach = toInteger(firstValue(row, ["reach", "alcance"]));
  const saved = toInteger(firstValue(row, ["saved", "salvos"]));
  const shares = toInteger(firstValue(row, ["shares", "compartilhamentos"]));
  const engagementResult = engagement({ likes, comentarios, saved, reach });
  const tipoPostagem = toText(
    firstValue(row, ["tipo_postagem", "tipo postagem", "tipo", "type", "formato"]),
  );

  return {
    data_coleta: toText(firstValue(row, ["data_coleta", "data coleta", "collected_at"])),
    post_id: postId,
    tipo_postagem: tipoPostagem,
    tipo: normalizePostType(tipoPostagem),
    likes,
    comentarios,
    data_postagem: dataPostagem,
    hora_postagem: normalizeTime(
      firstValue(row, ["hora_postagem", "hora postagem", "horario", "hora"]),
    ),
    legenda: toText(firstValue(row, ["legenda", "caption", "titulo", "title", "descricao"])),
    permalink,
    reach,
    saved,
    shares,
    engajamento_score: engagementResult.score,
    engajamento_classificacao: engagementResult.classification,
    raw_payload: row as Json,
  };
}

export async function importInstagramRows(payload: InstagramImportPayload) {
  const admin = createAdminClient();

  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada no servidor.");
  }

  const rows = payload.rows ?? [];
  const tenantName =
    payload.tenantName ?? process.env.INSTAGRAM_DEFAULT_TENANT_NAME ?? "Juliana Coutinho";
  const accountName =
    payload.accountName ?? process.env.INSTAGRAM_DEFAULT_ACCOUNT_NAME ?? tenantName;
  const username =
    payload.username ?? process.env.INSTAGRAM_DEFAULT_USERNAME ?? "fga.jucoutinho";
  const source = payload.source ?? "n8n";
  const startedAt = new Date().toISOString();
  let failedRows = 0;
  let processedRows = 0;
  const errors: string[] = [];

  const { data: existingTenant, error: existingTenantError } = await admin
    .from("tenants")
    .select("id, nome")
    .eq("nome", tenantName)
    .limit(1)
    .maybeSingle();

  if (existingTenantError) {
    throw existingTenantError;
  }

  const { data: createdTenant, error: tenantError } = existingTenant
    ? { data: existingTenant, error: null }
    : await admin
        .from("tenants")
        .insert({ nome: tenantName, tipo: "cliente" })
        .select("id, nome")
        .single();

  const tenant = createdTenant;

  if (tenantError || !tenant) {
    throw tenantError ?? new Error("Nao foi possivel criar/localizar tenant.");
  }

  const { data: account, error: accountError } = await admin
    .from("instagram_accounts")
    .upsert(
      {
        tenant_id: tenant.id,
        nome: accountName,
        username,
        ativo: true,
      },
      { onConflict: "tenant_id,username" },
    )
    .select("id, tenant_id")
    .single();

  if (accountError || !account) {
    throw accountError ?? new Error("Nao foi possivel criar/localizar conta Instagram.");
  }

  for (const row of rows) {
    try {
      const normalized = normalizeRow(row);
      const { data: post, error: postError } = await admin
        .from("instagram_posts")
        .upsert(
          {
            tenant_id: tenant.id,
            account_id: account.id,
            post_id: normalized.post_id,
            data_coleta: normalized.data_coleta,
            data_postagem: normalized.data_postagem,
            hora_postagem: normalized.hora_postagem,
            tipo_original: normalized.tipo_postagem,
            tipo: normalized.tipo,
            legenda: normalized.legenda,
            permalink: normalized.permalink,
            raw_payload: normalized.raw_payload,
          },
          { onConflict: "tenant_id,post_id" },
        )
        .select("id")
        .single();

      if (postError || !post) {
        throw postError ?? new Error("Falha ao gravar post.");
      }

      const { error: metricError } = await admin.from("instagram_metrics").upsert(
        {
          tenant_id: tenant.id,
          account_id: account.id,
          post_id: post.id,
          likes: normalized.likes,
          comentarios: normalized.comentarios,
          alcance: normalized.reach,
          salvos: normalized.saved,
          compartilhamentos: normalized.shares,
          engajamento_score: normalized.engajamento_score,
          engajamento_classificacao: normalized.engajamento_classificacao,
          origem: source,
          imported_at: new Date().toISOString(),
          raw_payload: normalized.raw_payload,
        },
        { onConflict: "tenant_id,post_id,origem" },
      );

      if (metricError) {
        throw metricError;
      }

      processedRows += 1;
    } catch (error) {
      failedRows += 1;
      errors.push(error instanceof Error ? error.message : "Erro desconhecido.");
    }
  }

  await admin.from("instagram_import_runs").insert({
    tenant_id: tenant.id,
    account_id: account.id,
    source,
    status: failedRows > 0 ? "completed_with_errors" : "completed",
    total_rows: rows.length,
    inserted_rows: processedRows,
    updated_rows: 0,
    failed_rows: failedRows,
    error_message: errors.slice(0, 5).join(" | ") || null,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  return {
    tenant,
    account,
    totalRows: rows.length,
    processedRows,
    failedRows,
    errors: errors.slice(0, 10),
  };
}
