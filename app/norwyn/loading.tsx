export default function NorwynLoading() {
  return (
    <section className="space-y-6" aria-label="Carregando Home" aria-busy="true">
      <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] p-6 shadow-[var(--ds-shadow-sm)]">
        <div className="h-3 w-20 animate-pulse rounded-full bg-brand-sky/20" />
        <div className="mt-4 h-8 w-56 max-w-full animate-pulse rounded-md bg-brand-teal/10" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-md bg-brand-teal/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] shadow-[var(--ds-shadow-sm)]" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] shadow-[var(--ds-shadow-sm)]" />
    </section>
  );
}
