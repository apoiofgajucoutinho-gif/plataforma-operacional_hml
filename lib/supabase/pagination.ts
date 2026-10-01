export async function collectSupabasePages<T>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  options?: { pageSize?: number; maxRows?: number },
) {
  const pageSize = options?.pageSize ?? 1000;
  const maxRows = options?.maxRows ?? 50000;
  const rows: T[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await loadPage(from, Math.min(from + pageSize - 1, maxRows - 1));
    if (error) return { data: rows, error, truncated: false };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null, truncated: false };
  }

  return { data: rows, error: null, truncated: true };
}
