import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";

const navigation = [
  { label: "Agenda", href: "/agenda", icon: CalendarDays, active: true },
  { label: "Instagram", href: "#", icon: BarChart3 },
  { label: "Financeiro", href: "#", icon: CircleDollarSign },
  { label: "Atividades", href: "#", icon: Activity },
  { label: "Relatorios", href: "#", icon: LayoutDashboard },
  { label: "Admin", href: "#", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-white/70 bg-brand-teal px-5 py-4 text-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between lg:block">
          <Link href="/agenda" className="block">
            <Image
              src="/brand/logo-horizontal-fundo-escuro.png"
              alt="Juliana Coutinho"
              width={220}
              height={122}
              priority
              className="h-16 w-auto object-contain lg:h-24"
            />
          </Link>
          <span className="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold lg:mt-4 lg:inline-flex">
            DEV
          </span>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-1 lg:overflow-visible">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={clsx(
                  "flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white",
                  item.active && "bg-white text-brand-teal hover:bg-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
