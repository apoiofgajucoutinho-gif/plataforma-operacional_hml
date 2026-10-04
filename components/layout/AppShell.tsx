"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Compass,
  FileText,
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
  Tags,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { TrackPageView } from "@/components/adoption/TrackPageView";
import { navigationDefinitionsForRole } from "@/components/layout/app-navigation";
import type { NavigationIconKey } from "@/components/layout/app-navigation";
import { readyModules } from "@/lib/auth/modules";
import { functionalRoleFor } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  key: string;
  module: string;
  group: string;
  adminOnly?: boolean;
};

const navigationIcons: Record<NavigationIconKey, LucideIcon> = {
  activity: Activity,
  alert: AlertTriangle,
  "bar-chart": BarChart3,
  bot: Bot,
  briefcase: BriefcaseBusiness,
  calendar: CalendarDays,
  clipboard: ClipboardCheck,
  compass: Compass,
  dollar: CircleDollarSign,
  "file-text": FileText,
  layout: LayoutDashboard,
  "line-chart": LineChart,
  monitor: MonitorSmartphone,
  settings: Settings,
  sparkles: Sparkles,
  tags: Tags,
  target: Target,
  users: UsersRound,
};

function navigationForRole(role: unknown): NavigationItem[] {
  return navigationDefinitionsForRole(role).map((item) => ({ ...item, icon: navigationIcons[item.icon] }));
}

function groupedNavigation(items: NavigationItem[]) {
  const groups: Array<{ label: string; items: NavigationItem[] }> = [];
  for (const item of items) {
    const existing = groups.find((group) => group.label === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }
  return groups;
}

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

export function AppShell({ children, activeItem = "agenda", allowedItems, role }: { children: ReactNode; activeItem?: string; allowedItems?: string[]; role?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("platform-theme-mode");
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const roleNavigation = navigationForRole(role);
  const functionalRole = functionalRoleFor(role);
  const visibleNavigation = roleNavigation.filter((item) => {
    if (item.adminOnly && functionalRole !== "ADMIN") return false;
    return !allowedItems || allowedItems.includes(item.module) || allowedItems.includes(item.key) || allowedItems.includes("admin");
  });
  const groups = groupedNavigation(visibleNavigation);
  const prefetchKey = visibleNavigation.map((item) => item.href).join("|");
  const pendingItem = pendingHref
    ? visibleNavigation.find((item) => {
      const pendingUrl = new URL(pendingHref, "http://local");
      const itemUrl = new URL(item.href, "http://local");
      return pendingUrl.pathname === itemUrl.pathname;
    })
    : null;

  useEffect(() => {
    setPendingHref(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    visibleNavigation.forEach((item) => {
      if (readyModules.includes(item.module)) router.prefetch(item.href);
    });
  }, [router, prefetchKey]);

  useEffect(() => {
    const stored = window.localStorage.getItem("platform-sidebar-collapsed");
    if (stored) setIsCollapsed(stored === "true");

    const storedTheme = window.localStorage.getItem("platform-theme-mode");
    if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
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
      }, 60 * 60 * 1000);
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
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const resolvedTheme = nextThemeMode === "system" ? (media.matches ? "dark" : "light") : nextThemeMode;
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = nextThemeMode;
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function beginInternalNavigation(href: string) {
    window.dispatchEvent(new Event("norwyn:navigation"));
    setPendingHref(href);
  }

  return (
    <div className="min-h-screen bg-[color:var(--ds-bg)] lg:grid" style={{ gridTemplateColumns: isCollapsed ? "78px minmax(0,1fr)" : "248px minmax(0,1fr)" }}>
      <aside className="app-sidebar flex border-b border-white/70 bg-brand-teal px-4 py-4 text-white transition-[width] lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href="/norwyn" prefetch={false} onClick={() => beginInternalNavigation("/norwyn")} className="flex justify-center">
            <Image
              src="/brand/logo-horizontal-fundo-escuro.png"
              alt="Juliana Coutinho"
              width={220}
              height={122}
              priority
              className={clsx("h-14 w-auto object-contain transition-all lg:h-20", isCollapsed && "lg:h-11 lg:max-w-11")}
            />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="app-sidebar-toggle mx-auto hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 lg:mt-5 lg:flex"
            aria-label={isCollapsed ? "Abrir menu lateral" : "Fechar menu lateral"}
            title={isCollapsed ? "Abrir menu" : "Fechar menu"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-6 lg:overflow-visible" aria-label="Navegação principal">
          {groups.map((group) => (
            <div key={group.label} className="contents lg:block">
              <p className={clsx("mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/45", isCollapsed && "lg:hidden")}>{group.label}</p>
              <div className="flex gap-2 lg:block lg:space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const itemUrl = new URL(item.href, "http://local");
                  const itemTab = itemUrl.searchParams.get("tab");
                  const currentTab = searchParams.get("tab");
                  const pendingUrl = pendingHref ? new URL(pendingHref, "http://local") : null;
                  const isPendingItem = pendingUrl?.pathname === itemUrl.pathname;
                  const isSamePath = itemUrl.pathname === pathname;
                  const isCurrentActive = itemTab ? isSamePath && itemTab === currentTab : isSamePath && !currentTab && item.key === activeItem;
                  const isActive = isPendingItem || isCurrentActive;
                  const isReady = readyModules.includes(item.module);
                  const isDisabled = !isReady;

                  return (
                    <Link
                      key={item.key}
                      href={isDisabled ? "#" : item.href}
                      aria-disabled={isDisabled}
                      prefetch={false}
                      onMouseEnter={() => { if (!isDisabled) router.prefetch(item.href); }}
                      onFocus={() => { if (!isDisabled) router.prefetch(item.href); }}
                      onClick={(event) => {
                        if (isDisabled) {
                          event.preventDefault();
                          return;
                        }
                        beginInternalNavigation(item.href);
                      }}
                      title={isDisabled ? "Módulo em desenvolvimento. Em breve estará disponível." : item.label}
                      data-active={isActive}
                      data-disabled={isDisabled}
                      className={clsx(
                        "app-nav-item flex min-w-max items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition",
                        isCollapsed && "lg:min-w-0 lg:justify-center lg:px-0",
                        isDisabled && "cursor-not-allowed opacity-55",
                        isPendingItem && "animate-pulse",
                        isActive ? "bg-white !text-brand-teal shadow-sm hover:bg-white" : "text-brand-cream hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className={clsx(isCollapsed && "lg:hidden")}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <TrackPageView activeItem={activeItem} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8" aria-busy={Boolean(pendingHref)}>
        {pendingHref ? (
          <div className="sticky top-0 z-40 -mx-4 mb-4 rounded-b-2xl border-b border-brand-sky/30 bg-white/85 px-4 py-3 text-sm font-semibold text-brand-teal shadow-[0_14px_35px_rgba(0,62,78,0.08)] backdrop-blur sm:-mx-6 lg:-mx-8 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-clay" />
              <span>Abrindo {pendingItem?.label ?? "módulo"}...</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-sky/15">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-teal" />
            </div>
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {userLabel ? (
            <div className="theme-toggle hidden max-w-[260px] truncate rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-text-secondary)] shadow-[var(--ds-shadow-sm)] sm:block">
              {userLabel}
            </div>
          ) : null}
          <div className="theme-toggle grid grid-cols-3 gap-1 rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] p-1 shadow-[var(--ds-shadow-sm)]" aria-label="Selecionar tema" role="group">
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
            className="theme-toggle-option flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface)] text-brand-teal/70 shadow-[var(--ds-shadow-sm)] transition hover:bg-brand-cream hover:text-brand-teal"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
