const batchSize = Number($items('Configuracao V9')[0]?.json?.upsert_batch_size || 50);
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
