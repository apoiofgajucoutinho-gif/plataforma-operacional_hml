import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";

type TransformationProps = {
  config: LandingConfig;
};

export function Transformation({ config }: TransformationProps) {
  const { transformation } = config;

  return (
    <SectionShell
      id="transformacao"
      eyebrow="Problema e transformação"
      title="Da insegurança na adaptação ao raciocínio clínico estruturado"
      intro={transformation.closing}
      className="bg-white"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-[#eadfd7] bg-[#fbf8f4] p-7">
          <h3 className="text-xl font-semibold text-[#153f4a]">{transformation.beforeTitle}</h3>
          <ul className="mt-6 space-y-4">
            {transformation.beforeItems.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-[#536a6f]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9d6f4e]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-[#cfe0dd] bg-[#eff7f5] p-7">
          <h3 className="text-xl font-semibold text-[#153f4a]">{transformation.afterTitle}</h3>
          <ul className="mt-6 space-y-4">
            {transformation.afterItems.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-[#2d5d63]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d7b73]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
