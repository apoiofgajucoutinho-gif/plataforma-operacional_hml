import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Optional local env file.
  }
}

async function fetchAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert(supabaseUrl, "Missing NEXT_PUBLIC_SUPABASE_URL.");
assert(serviceRoleKey, "Missing SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: upload, error: uploadError } = await supabase
  .from("norwyn_validation_uploads")
  .select("*")
  .eq("validation_type", "HOTMART")
  .order("uploaded_at", { ascending: false })
  .limit(1)
  .single();

if (uploadError) throw new Error(uploadError.message);
assert(upload, "No Hotmart validation upload found.");

const { count: stagingRows, error: stagingError } = await supabase
  .from("norwyn_hotmart_validation_rows")
  .select("id", { count: "exact", head: true })
  .eq("upload_id", upload.id);

if (stagingError) throw new Error(stagingError.message);

const comparisons = await fetchAll(() =>
  supabase
    .from("norwyn_hotmart_validation_comparisons")
    .select("match_status,event_class,sale_comparable,normalized_transaction_id")
    .eq("upload_id", upload.id),
);

const byStatus = comparisons.reduce((acc, row) => {
  acc[row.match_status] = (acc[row.match_status] ?? 0) + 1;
  return acc;
}, {});

const nonComparable = comparisons.filter((row) => row.match_status === "NON_COMPARABLE");
const clubOnlyNorwyn = comparisons.filter(
  (row) =>
    row.match_status === "ONLY_NORWYN" &&
    ["PRODUCT_ACCESS_EVENT", "MODULE_EVENT", "CHECKOUT_EVENT"].includes(row.event_class),
);
const hotmartSide =
  (byStatus.MATCH_EXACT ?? 0) + (byStatus.MATCH_DIVERGENT ?? 0) + (byStatus.ONLY_HOTMART ?? 0);
const norwynComparableSide =
  (byStatus.MATCH_EXACT ?? 0) + (byStatus.MATCH_DIVERGENT ?? 0) + (byStatus.ONLY_NORWYN ?? 0);

assert(upload.row_count > 1000, `Expected upload row_count > 1000, got ${upload.row_count}.`);
assert(stagingRows === upload.row_count, `Expected staging rows ${upload.row_count}, got ${stagingRows}.`);
assert(hotmartSide === upload.unique_transaction_count, `Expected Hotmart side ${upload.unique_transaction_count}, got ${hotmartSide}.`);
assert(norwynComparableSide === Number(upload.summary?.norwyn_sale_comparable ?? norwynComparableSide), "Norwyn comparable invariant failed.");
assert(nonComparable.length === Number(upload.summary?.non_comparable_events ?? nonComparable.length), "NON_COMPARABLE invariant failed.");
assert(clubOnlyNorwyn.length === 0, `Expected no Club/checkout events as ONLY_NORWYN, got ${clubOnlyNorwyn.length}.`);
assert(!((byStatus.MATCH_EXACT ?? 0) === 1000 && (byStatus.ONLY_NORWYN ?? 0) === 1000), "Old 1000/1000 limit pattern is still present.");

console.log(JSON.stringify({
  upload_id: upload.id,
  row_count: upload.row_count,
  unique_transaction_count: upload.unique_transaction_count,
  staging_rows: stagingRows,
  comparison_rows: comparisons.length,
  by_status: byStatus,
  non_comparable: nonComparable.length,
  club_only_norwyn: clubOnlyNorwyn.length,
}, null, 2));
