import type { CSSProperties, ReactNode } from "react";
import type { LandingBlock, LandingDefinition } from "@/modules/landing-pages/types";
import { LandingTrackingRuntime } from "@/modules/landing-pages/tracking/LandingTrackingRuntime";
import { TrackedLandingCta } from "@/modules/landing-pages/tracking/TrackedLandingCta";

function BlockShell({ block, children, wide = false }: { block: LandingBlock; children: ReactNode; wide?: boolean }) {
  return (
    <section id={block.id} data-block-type={block.type} className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <div className={wide ? "mx-auto max-w-6xl" : "mx-auto max-w-4xl"}>{children}</div>
    </section>
  );
}

function Eyebrow({ value }: { value?: string }) {
  if (!value) return null;
  return <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--lp-accent)]">{value}</p>;
}

function TextBlock({ block }: { block: LandingBlock }) {
  return (
    <BlockShell block={block}>
      <div className="space-y-5">
        <Eyebrow value={block.eyebrow} />
        {block.title ? <h2 className="text-3xl font-semibold leading-tight text-[color:var(--lp-text)] sm:text-4xl">{block.title}</h2> : null}
        {block.body ? <p className="max-w-3xl text-lg leading-8 text-[color:var(--lp-muted)]">{block.body}</p> : null}
        {block.items?.length ? (
          <div className="grid gap-4 pt-3 md:grid-cols-3">
            {block.items.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[color:var(--lp-border)] bg-[color:var(--lp-elevated)] p-5 shadow-[0_18px_50px_rgba(23,63,63,0.08)]">
                <h3 className="text-base font-semibold text-[color:var(--lp-text)]">{item.title}</h3>
                {item.body ? <p className="mt-2 text-sm leading-6 text-[color:var(--lp-muted)]">{item.body}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </BlockShell>
  );
}

function HeroBlock({ block, landing }: { block: LandingBlock; landing: LandingDefinition }) {
  return (
    <section id={block.id} data-block-type={block.type} className="px-5 pb-12 pt-10 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] bg-[color:var(--lp-primary)] p-7 text-white shadow-[0_24px_70px_rgba(23,63,63,0.18)] md:grid-cols-[1.15fr_0.85fr] md:p-10 lg:p-12">
        <div className="flex flex-col justify-center space-y-6">
          <Eyebrow value={block.eyebrow} />
          <h1 className="text-4xl font-semibold leading-[1.04] sm:text-5xl lg:text-6xl">{block.title}</h1>
          {block.subtitle ? <p className="max-w-2xl text-lg leading-8 text-white/82">{block.subtitle}</p> : null}
          {block.body ? <p className="max-w-xl text-sm leading-6 text-white/68">{block.body}</p> : null}
          {block.cta ? (
            <div className="flex flex-wrap gap-3 pt-2">
              <TrackedLandingCta landing={landing} block={block} cta={block.cta} />
              {block.cta.secondaryHref && block.cta.secondaryLabel ? (
                <a href={block.cta.secondaryHref} className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 text-sm font-bold text-white hover:bg-white/10">{block.cta.secondaryLabel}</a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="relative min-h-[260px] overflow-hidden rounded-[1.5rem] border border-white/12 bg-white/10 p-6">
          {block.media?.src ? <img src={block.media.src} alt={block.media.alt} className="h-full w-full object-contain" /> : null}
          {block.media?.status === "review" ? <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[color:var(--lp-primary)]">Imagem em revisão</span> : null}
        </div>
      </div>
    </section>
  );
}

function OfferBlock({ block, landing }: { block: LandingBlock; landing: LandingDefinition }) {
  return (
    <BlockShell block={block} wide>
      <div className="grid gap-6 rounded-[2rem] border border-[color:var(--lp-border)] bg-[color:var(--lp-elevated)] p-7 shadow-[0_18px_50px_rgba(23,63,63,0.08)] md:grid-cols-[1fr_auto] md:items-center md:p-9">
        <div className="space-y-3">
          <Eyebrow value={block.eyebrow} />
          <h2 className="text-3xl font-semibold text-[color:var(--lp-text)]">{block.title}</h2>
          {block.subtitle ? <p className="text-base font-medium text-[color:var(--lp-text)]/80">{block.subtitle}</p> : null}
          {block.body ? <p className="max-w-3xl text-sm leading-6 text-[color:var(--lp-muted)]">{block.body}</p> : null}
        </div>
        {block.cta ? <TrackedLandingCta landing={landing} block={block} cta={block.cta} /> : null}
      </div>
    </BlockShell>
  );
}

function renderBlock(block: LandingBlock, landing: LandingDefinition) {
  if (!block.enabled) return null;
  if (block.type === "HERO") return <HeroBlock key={block.id} block={block} landing={landing} />;
  if (block.type === "OFFER" || block.type === "CTA") return <OfferBlock key={block.id} block={block} landing={landing} />;
  return <TextBlock key={block.id} block={block} />;
}

export function LandingPageRenderer({ landing }: { landing: LandingDefinition }) {
  const style = {
    "--lp-bg": landing.theme.background,
    "--lp-surface": landing.theme.surface,
    "--lp-elevated": landing.theme.elevated,
    "--lp-text": landing.theme.text,
    "--lp-muted": landing.theme.muted,
    "--lp-primary": landing.theme.primary,
    "--lp-accent": landing.theme.accent,
    "--lp-cta": landing.theme.cta,
    "--lp-cta-text": landing.theme.ctaText,
    "--lp-border": landing.theme.border,
  } as CSSProperties;

  return (
    <main style={style} className="min-h-screen bg-[color:var(--lp-bg)] text-[color:var(--lp-text)]">
      <LandingTrackingRuntime landing={landing} />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 text-sm sm:px-8 lg:px-12">
        <a href="#hero" className="font-black uppercase tracking-[0.2em] text-[color:var(--lp-primary)]">Norwyn</a>
        <span className="rounded-full border border-[color:var(--lp-border)] bg-[color:var(--lp-surface)] px-3 py-1 text-xs font-bold text-[color:var(--lp-muted)]">{landing.environment} - {landing.version}</span>
      </div>
      {landing.blocks.map((block) => renderBlock(block, landing))}
    </main>
  );
}
