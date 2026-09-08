import type { LandingConfig } from "@/lib/norwyn/landing-types";

type FooterProps = {
  config: LandingConfig;
};

export function Footer({ config }: FooterProps) {
  return (
    <footer className="bg-[#102f38] px-5 py-9 text-sm text-white/62 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">{config.hero.productName}</p>
          <p className="mt-1">{config.footer.legalName}</p>
          <p className="mt-2 max-w-2xl text-xs leading-5">{config.footer.legalNote}</p>
        </div>
        <nav className="flex flex-wrap gap-4">
          <a href={config.footer.termsUrl} className="hover:text-white">
            Termos
          </a>
          <a href={config.footer.privacyUrl} className="hover:text-white">
            Privacidade
          </a>
          <span>Suporte: {config.footer.supportEmail}</span>
        </nav>
      </div>
    </footer>
  );
}
