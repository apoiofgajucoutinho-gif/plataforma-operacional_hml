"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  LineChart,
  MonitorSmartphone,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
} from "lucide-react";
import { clsx } from "clsx";
import { TrackPageView } from "@/components/adoption/TrackPageView";

const navigation = [
  { label: "Agenda", href: "/agenda", icon: CalendarDays, key: "agenda" },
  { label: "Instagram", href: "/instagram", icon: BarChart3, key: "instagram" },
  { label: "Adocao", href: "/adocao", icon: LineChart, key: "adocao" },
  { label: "Financeiro", href: "#", icon: CircleDollarSign, key: "financeiro" },
  { label: "Atividades", href: "#", icon: Activity, key: "atividades" },
  { label: "Relatorios", href: "#", icon: LayoutDashboard, key: "relatorios" },
  { label: "Admin", href: "#", icon: Settings, key: "admin" },
];

type ThemeMode = "system" | "light" | "dark";

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
  icon: typeof MonitorSmartphone;
}> = [
  { value: "system", label: "Tema do sistema", icon: MonitorSmartphone },
  { value: "light", label: "Tema claro", icon: Sun },
  { value: "dark", label: "Tema escuro", icon: Moon },
];

export function AppShell({
  children,
  activeItem = "agenda",
  allowedItems,
}: {
  children: ReactNode;
  activeItem?: string;
  allowedItems?: string[];
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const visibleNavigation = allowedItems
    ? navigation.filter((item) => allowedItems.includes(item.key))
    : navigation;

  useEffect(() => {
    const stored = window.localStorage.getItem("platform-sidebar-collapsed");
    if (stored) {
      setIsCollapsed(stored === "true");
    }

    const storedTheme = window.localStorage.getItem("platform-theme-mode");
    if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") {
      setThemeMode(storedTheme);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const resolvedTheme = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themeMode = themeMode;
    }

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  function toggleSidebar() {
    setIsCollapsed((current) => {
      window.localStorage.setItem("platform-sidebar-collapsed", String(!current));
      return !current;
    });
  }

  function updateThemeMode(nextThemeMode: ThemeMode) {
    setThemeMode(nextThemeMode);
    window.localStorage.setItem("platform-theme-mode", nextThemeMode);
  }

  return (
    <div
      className="min-h-screen lg:grid"
      style={{ gridTemplateColumns: isCollapsed ? "70px minmax(0,1fr)" : "224px minmax(0,1fr)" }}
    >
      <aside className="app-sidebar flex border-b border-white/70 bg-brand-teal px-4 py-4 text-white transition-[width] lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href="/agenda" className={clsx("block", isCollapsed && "lg:flex lg:justify-center")}>
            <Image
              src="/brand/logo-horizontal-fundo-escuro.png"
              alt="Juliana Coutinho"
              width={220}
              height={122}
              priority
              className={clsx("h-16 w-auto object-contain transition-all lg:h-24", isCollapsed && "lg:h-12")}
            />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="app-sidebar-toggle hidden h-10 w-10 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20 lg:mt-5 lg:flex"
            aria-label={isCollapsed ? "Abrir menu lateral" : "Fechar menu lateral"}
            title={isCollapsed ? "Abrir menu" : "Fechar menu"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-1 lg:overflow-visible">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeItem;

            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                data-active={isActive}
                className={clsx(
                  "app-nav-item flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                  isCollapsed && "lg:min-w-0 lg:justify-center lg:px-0",
                  isActive
                    ? "bg-white !text-brand-teal shadow-sm hover:bg-white"
                    : "text-brand-cream hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className={clsx(isCollapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={clsx("hidden lg:mt-auto lg:flex", isCollapsed ? "lg:justify-center" : "lg:justify-center")}>
          <div
            className={clsx(
              "theme-toggle grid gap-1 rounded-full border border-white/15 bg-black/15 p-1 shadow-sm",
              isCollapsed ? "grid-cols-1" : "grid-cols-3",
            )}
            aria-label="Selecionar tema"
            role="group"
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = option.value === themeMode;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateThemeMode(option.value)}
                  title={option.label}
                  aria-label={option.label}
                  className={clsx(
                    "theme-toggle-option flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white",
                    isActive && "bg-white/10 text-white ring-1 ring-white/70",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <TrackPageView activeItem={activeItem} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
