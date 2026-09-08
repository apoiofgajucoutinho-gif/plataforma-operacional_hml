import type { ReactNode } from "react";
import { clsx } from "clsx";

type SectionShellProps = {
  id: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  className?: string;
  children: ReactNode;
};

export function SectionShell({
  id,
  eyebrow,
  title,
  intro,
  className,
  children,
}: SectionShellProps) {
  return (
    <section id={id} className={clsx("px-5 py-16 sm:px-8 lg:px-10", className)}>
      <div className="mx-auto w-full max-w-6xl">
        {(eyebrow || title || intro) && (
          <div className="mb-10 max-w-3xl">
            {eyebrow && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6f4e]">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-3xl font-semibold leading-tight text-[#153f4a] sm:text-4xl">
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 text-base leading-7 text-[#536a6f]">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
