import type { Benefit } from "@/lib/norwyn/landing-types";
import { SectionShell } from "@/components/lp/SectionShell";

type BenefitsProps = {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  items: Benefit[];
  tone?: "white" | "soft";
};

export function Benefits({ id, eyebrow, title, intro, items, tone = "white" }: BenefitsProps) {
  return (
    <SectionShell
      id={id}
      eyebrow={eyebrow}
      title={title}
      intro={intro}
      className={tone === "soft" ? "bg-[#f7f2ed]" : "bg-white"}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.id} className="rounded-md border border-[#e4d7ce] bg-white p-6">
              {Icon && (
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#e9f3f1] text-[#2d7b73]">
                  <Icon aria-hidden className="h-5 w-5" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-[#153f4a]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#536a6f]">{item.description}</p>
            </article>
          );
        })}
      </div>
    </SectionShell>
  );
}
