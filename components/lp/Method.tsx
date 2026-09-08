import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";

type MethodProps = {
  config: LandingConfig;
};

export function Method({ config }: MethodProps) {
  return (
    <SectionShell
      id="metodo"
      eyebrow="Método"
      title={config.method.headline}
      intro={config.method.intro}
      className="bg-[#f7f2ed]"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {config.method.phases.map((phase) => (
          <article key={phase.id} className="rounded-md border border-[#e0d1c7] bg-white p-7">
            <span className="text-sm font-semibold text-[#9d6f4e]">Fase {phase.order}</span>
            <h3 className="mt-4 text-2xl font-semibold text-[#153f4a]">{phase.name}</h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#718185]">
              {phase.eyebrow}
            </p>
            <p className="mt-5 text-sm leading-7 text-[#536a6f]">{phase.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
