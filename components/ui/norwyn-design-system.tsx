import { clsx } from "clsx";
import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock3, Info, Minus, Sparkles } from "lucide-react";

type IconType = ComponentType<LucideProps>;
type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
type Trend = "up" | "down" | "flat";

const toneStyles: Record<Tone, { badge: string; icon: string; surface: string }> = {
  neutral: {
    badge: "border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] text-[color:var(--ds-text-secondary)]",
    icon: "bg-[color:var(--ds-bg-soft)] text-[color:var(--ds-text-secondary)]",
    surface: "border-[color:var(--ds-border)] bg-[color:var(--ds-surface)]",
  },
  primary: {
    badge: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-primary-soft)] text-[color:var(--ds-primary)]",
    icon: "bg-[color:var(--ds-primary-soft)] text-[color:var(--ds-primary)]",
    surface: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-primary-soft)]",
  },
  success: {
    badge: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-success-soft)] text-[color:var(--ds-success)]",
    icon: "bg-[color:var(--ds-success-soft)] text-[color:var(--ds-success)]",
    surface: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-success-soft)]",
  },
  warning: {
    badge: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-warning-soft)] text-[color:var(--ds-warning)]",
    icon: "bg-[color:var(--ds-warning-soft)] text-[color:var(--ds-warning)]",
    surface: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-warning-soft)]",
  },
  danger: {
    badge: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-danger-soft)] text-[color:var(--ds-danger)]",
    icon: "bg-[color:var(--ds-danger-soft)] text-[color:var(--ds-danger)]",
    surface: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-danger-soft)]",
  },
  info: {
    badge: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-info-soft)] text-[color:var(--ds-info)]",
    icon: "bg-[color:var(--ds-info-soft)] text-[color:var(--ds-info)]",
    surface: "border-[color:var(--ds-border-strong)] bg-[color:var(--ds-info-soft)]",
  },
};

export function PageHeader({ eyebrow, title, description, aside }: { eyebrow?: string; title: string; description?: string; aside?: ReactNode }) {
  return (
    <header className="rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] p-5 shadow-[var(--ds-shadow-sm)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="text-xs font-semibold uppercase text-[color:var(--ds-accent)]">{eyebrow}</p> : null}
          <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ds-text)] sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ds-text-secondary)]">{description}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase text-[color:var(--ds-accent)]">{eyebrow}</p> : null}
        <h2 className="text-xl font-semibold text-[color:var(--ds-text)]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] p-4 shadow-[var(--ds-shadow-sm)] backdrop-blur sm:p-5", className)}>
      {children}
    </section>
  );
}

export function MetricCard({ label, value, period, comparison, trend, status, tone = "neutral", icon: Icon }: { label: string; value: string; period?: string; comparison?: string; trend?: Trend; status?: string; tone?: Tone; icon?: IconType }) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : trend === "flat" ? Minus : null;
  return (
    <div className="min-w-0 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <IconPill icon={Icon} tone={tone} /> : null}
          <p className="min-w-0 text-sm font-medium leading-5 text-[color:var(--ds-text-secondary)]">{label}</p>
        </div>
        {status ? <StatusBadge tone={tone}>{status}</StatusBadge> : null}
      </div>
      <p className="mt-3 min-w-0 break-words text-2xl font-semibold leading-tight text-[color:var(--ds-text)] sm:text-3xl">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--ds-text-muted)]">
        {comparison ? (
          <span className={clsx("inline-flex items-center gap-1 font-semibold", tone === "danger" ? "text-[color:var(--ds-danger)]" : tone === "success" ? "text-[color:var(--ds-success)]" : "text-[color:var(--ds-text-secondary)]")}>
            {TrendIcon ? <TrendIcon className="h-3.5 w-3.5" /> : null}
            {comparison}
          </span>
        ) : null}
        {period ? <span>{period}</span> : null}
      </div>
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={clsx("inline-flex min-h-6 max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4", toneStyles[tone].badge)}>{children}</span>;
}

export function DataFreshness({ label, stale = false }: { label: string; stale?: boolean }) {
  const Icon = stale ? AlertTriangle : Clock3;
  return (
    <span className={clsx("inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium leading-5", stale ? toneStyles.warning.badge : toneStyles.info.badge)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function IconPill({ icon: Icon, tone = "neutral" }: { icon: IconType; tone?: Tone }) {
  return (
    <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", toneStyles[tone].icon)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function InsightCard({ title, children, tone = "info" }: { title: string; children: ReactNode; tone?: Tone }) {
  const Icon = tone === "warning" ? AlertTriangle : tone === "success" ? CheckCircle2 : tone === "primary" ? Sparkles : Info;
  return (
    <div className={clsx("rounded-[var(--ds-radius-md)] border p-4", toneStyles[tone].surface)}>
      <div className="flex gap-3">
        <IconPill icon={Icon} tone={tone} />
        <div>
          <p className="break-words font-semibold text-[color:var(--ds-text)]">{title}</p>
          <div className="mt-1 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ActionCard({ title, meta, description, action, tone = "neutral", icon: Icon }: { title: string; meta?: string; description?: string; action?: ReactNode; tone?: Tone; icon?: IconType }) {
  return (
    <div className="min-w-0 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {Icon ? <IconPill icon={Icon} tone={tone} /> : null}
          <div className="min-w-0">
          <p className="break-words font-semibold text-[color:var(--ds-text)]">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{description}</p> : null}
          </div>
        </div>
        {meta ? <StatusBadge tone={tone}>{meta}</StatusBadge> : null}
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function TaskCard({ title, context, due, priority, status, dependency }: { title: string; context?: string; due?: string; priority?: string; status?: string; dependency?: string }) {
  const tone: Tone = priority === "critical" ? "danger" : priority === "high" ? "warning" : "neutral";
  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold text-[color:var(--ds-text)]">{title}</p>
          {context ? <p className="mt-1 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{context}</p> : null}
        </div>
        {priority ? <StatusBadge tone={tone}>{priority}</StatusBadge> : null}
      </div>
      <div className="mt-4 grid gap-3 text-xs text-[color:var(--ds-text-muted)] sm:grid-cols-3">
        <span><b className="text-[color:var(--ds-text-secondary)]">Prazo:</b> {due ?? "Sem prazo"}</span>
        <span><b className="text-[color:var(--ds-text-secondary)]">Status:</b> {status ?? "Aberta"}</span>
        <span><b className="text-[color:var(--ds-text-secondary)]">Dependência:</b> {dependency ?? "-"}</span>
      </div>
    </div>
  );
}

export function EmptyState({ title = "Sem dados por enquanto", children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--ds-radius-md)] border border-dashed border-[color:var(--ds-border-strong)] bg-[color:var(--ds-bg-soft)] p-5 text-center">
      <p className="break-words font-semibold text-[color:var(--ds-text)]">{title}</p>
      {children ? <p className="mt-2 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{children}</p> : null}
    </div>
  );
}

