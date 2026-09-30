const batchSize = Number($env.SUPABASE_UPSERT_BATCH_SIZE || 50);
const rows = items.map(item => {
  const { _norwyn_mode, _norwyn_smoke_persist, ...snapshot } = item.json;
  return snapshot;
});
const batches = [];
for (let index = 0; index < rows.length; index += batchSize) {
  batches.push({
    json: {
      rows: rows.slice(index, index + batchSize),
      batch_size: Math.min(batchSize, rows.length - index),
      total_items: rows.length,
    },
  });
}
return batches;
