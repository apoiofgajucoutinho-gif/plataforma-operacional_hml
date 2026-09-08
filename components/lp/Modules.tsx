import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";

type ModulesProps = {
  config: LandingConfig;
};

export function Modules({ config }: ModulesProps) {
  return (
    <SectionShell
      id="modulos"
      eyebrow="Conteúdo"
      title={config.modules.headline}
      intro={config.modules.intro}
      className="bg-white"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {config.modules.items.map((module) => (
          <article key={module.id} className="rounded-md border border-[#e5d8cf] bg-[#fbf8f4] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9d6f4e]">
              {module.status === "a_confirmar" ? "a confirmar" : module.status}
            </p>
            <h3 className="mt-4 text-xl font-semibold text-[#153f4a]">{module.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#536a6f]">{module.description}</p>
            {module.items && (
              <ul className="mt-5 space-y-2 text-sm text-[#536a6f]">
                {module.items.map((item) => (
                  <li key={item} className="border-t border-[#e5d8cf] pt-2">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
