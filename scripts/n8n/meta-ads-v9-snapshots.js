const snapshots = [];
for (const item of items) {
  for (const snapshot of item.json._config_snapshots || []) snapshots.push(snapshot);
}
const unique = new Map();
for (const snapshot of snapshots) {
  const key = [snapshot.entity_type, snapshot.entity_id, snapshot.config_hash].join('|');
  unique.set(key, snapshot);
}
const rows = Array.from(unique.values());
if (!rows.length) return [];
const first = items[0]?.json || {};
return rows.map(row => ({
  json: {
    ...row,
    _norwyn_mode: first._norwyn_mode || null,
    _norwyn_smoke_persist: first._norwyn_smoke_persist === true,
  },
}));
