import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Plataforma Operacional",
  description: "Relatorios, operacoes e automacao multiempresa.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

const themeInitScript = `(function(){try{var mode=localStorage.getItem('platform-theme-mode')||'system';if(mode!=='light'&&mode!=='dark'&&mode!=='system')mode='system';var dark=mode==='dark'||(mode==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.themeMode=mode;}catch(e){document.documentElement.dataset.theme='light';document.documentElement.dataset.themeMode='system';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
