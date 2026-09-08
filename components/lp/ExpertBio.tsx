import type { LandingConfig } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";

type ExpertBioProps = {
  config: LandingConfig;
};

export function ExpertBio({ config }: ExpertBioProps) {
  const { expert } = config;

  return (
    <SectionShell id="juliana" eyebrow="Sobre Juliana" title="Quem conduz a formação" className="bg-[#fbf8f4]">
      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div className="min-h-[24rem] rounded-md border border-[#e1d3ca] bg-[linear-gradient(145deg,#efe4dc,#d7e7e6)] p-6">
          <div className="flex h-full min-h-[21rem] items-end rounded-md border border-white/50 bg-white/35 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d6f4e]">
                {expert.imageStatus}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#153f4a]">Foto de Juliana a confirmar</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9d6f4e]">
            {expert.title}
          </p>
          <h3 className="mt-3 text-3xl font-semibold text-[#153f4a]">{expert.name}</h3>
          <p className="mt-5 text-base leading-8 text-[#536a6f]">{expert.bio}</p>
          <ul className="mt-7 space-y-3">
            {expert.authority.map((item) => (
              <li key={item} className="border-l border-[#cbb7aa] pl-4 text-sm leading-6 text-[#536a6f]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
