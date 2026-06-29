"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Compass,
  LayoutDashboard,
  LineChart,
  LogOut,
  MonitorSmartphone,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Sun,
  Target,
} from "lucide-react";
import { clsx } from "clsx";
import { TrackPageView } from "@/components/adoption/TrackPageView";
import { readyModules } from "@/lib/auth/modules";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { label: "Norwyn", href: "/norwyn", icon: Compass, key: "norwyn" },
  { label: "Agenda", href: "/agenda", icon: CalendarDays, key: "agenda" },
  { label: "Instagram", href: "/instagram", icon: BarChart3, key: "instagram" },
  { label: "Ads", href: "/ads", icon: Target, key: "ads" },
  { label: "Objetivos", href: "/objetivos", icon: Sparkles, key: "objetivos" },
  { label: "Financeiro", href: "/financeiro", icon: CircleDollarSign, key: "financeiro" },
  { label: "Comercial", href: "/comercial", icon: BriefcaseBusiness, key: "comercial" },
  { label: "Ocorrencias", href: "/ocorrencias", icon: AlertTriangle, key: "ocorrencias" },
  { label: "Adocao", href: "/adocao", icon: LineChart, key: "adocao" },
  { label: "Atividades", href: "/atividades", icon: Activity, key: "atividades" },
  { label: "Relatorios", href: "/relatorios", icon: LayoutDashboard, key: "relatorios" },
  { label: "Admin", href: "/admin", icon: Settings, key: "admin" },
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
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const visibleNavigation = allowedItems
    ? navigation.filter((item) => allowedItems.includes(item.key) || allowedItems.includes("admin"))
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
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const metadataName = data.user?.user_metadata?.nome;
      setUserLabel(typeof metadataName === "string" && metadataName.trim() ? metadataName : data.user?.email ?? null);
    });
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

  useEffect(() => {
    let timeoutId: number;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void signOut();
      }, 30 * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, []);

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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div
      className="min-h-screen lg:grid"
      style={{ gridTemplateColumns: isCollapsed ? "70px minmax(0,1fr)" : "224px minmax(0,1fr)" }}
    >
      <aside className="app-sidebar flex border-b border-white/70 bg-brand-teal px-4 py-4 text-white transition-[width] lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href="/" className="flex justify-center">
            <Image
              src="/brand/logo-horizontal-fundo-escuro.png"
              alt="Juliana Coutinho"
              width={220}
              height={122}
              priority
              className={clsx("h-16 w-auto object-contain transition-all lg:h-24", isCollapsed && "lg:h-12 lg:max-w-12")}
            />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="app-sidebar-toggle mx-auto hidden h-10 w-10 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20 lg:mt-5 lg:flex"
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
            const isReady = readyModules.includes(item.key);
            const isDisabled = !isReady;

            return (
              <Link
                key={item.label}
                href={isDisabled ? "#" : item.href}
                aria-disabled={isDisabled}
                onClick={(event) => {
                  if (isDisabled) event.preventDefault();
                }}
                title={isDisabled ? "Modulo em desenvolvimento. Em breve estara disponivel." : item.label}
                data-active={isActive}
                data-disabled={isDisabled}
                className={clsx(
                  "app-nav-item flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                  isCollapsed && "lg:min-w-0 lg:justify-center lg:px-0",
                  isDisabled && "cursor-not-allowed opacity-55",
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
      </aside>

      <TrackPageView activeItem={activeItem} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {userLabel ? (
            <div className="theme-toggle hidden max-w-[260px] truncate rounded-full border border-brand-sand/50 bg-white/60 px-3 py-2 text-xs font-semibold text-brand-teal/75 shadow-sm sm:block">
              {userLabel}
            </div>
          ) : null}
          <div className="theme-toggle grid grid-cols-3 gap-1 rounded-full border border-brand-sand/50 bg-white/60 p-1 shadow-sm" aria-label="Selecionar tema" role="group">
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
                    "theme-toggle-option flex h-8 w-8 items-center justify-center rounded-full text-brand-teal/55 transition hover:bg-brand-cream hover:text-brand-teal",
                    isActive && "bg-white text-brand-teal ring-1 ring-brand-clay/50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sair"
            aria-label="Sair"
            className="theme-toggle-option flex h-10 w-10 items-center justify-center rounded-full border border-brand-sand/50 bg-white/60 text-brand-teal/70 shadow-sm transition hover:bg-brand-cream hover:text-brand-teal"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
