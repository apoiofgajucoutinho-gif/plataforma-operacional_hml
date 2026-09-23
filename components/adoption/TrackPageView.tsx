"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let lastPageView: { key: string; at: number } | null = null;

function adoptionSession() {
  const now = Date.now();
  try {
    const stored = JSON.parse(sessionStorage.getItem("norwyn_adoption_session") ?? "null") as { id?: string; lastActivityAt?: number } | null;
    const id = stored?.id && stored.lastActivityAt && now - stored.lastActivityAt <= SESSION_TIMEOUT_MS ? stored.id : crypto.randomUUID();
    sessionStorage.setItem("norwyn_adoption_session", JSON.stringify({ id, lastActivityAt: now }));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function pageLoadMeasurement() {
  try {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!navigation || navigation.duration <= 0) return null;
    const measurementKey = `norwyn_navigation_measured:${performance.timeOrigin}`;
    if (sessionStorage.getItem(measurementKey)) return null;
    sessionStorage.setItem(measurementKey, "1");
    return Math.round(navigation.duration);
  } catch {
    return null;
  }
}

function sendEvent(payload: Record<string, unknown>) {
  void fetch("/api/adoption/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
}

export function TrackPageView({ activeItem }: { activeItem: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (activeItem === "instagram") return;
    const pageLabel = defaultPageLabel(activeItem, pathname);
    const key = `${activeItem}:${pathname}:${pageLabel}`;
    const now = Date.now();
    if (lastPageView?.key === key && now - lastPageView.at < 2000) return;
    lastPageView = { key, at: now };
    const pageLoadMs = pageLoadMeasurement();
    sendEvent({ module: activeItem, pagePath: pathname, pageLabel, eventName: "page_view", sessionId: adoptionSession(), ...(pageLoadMs == null ? {} : { pageLoadMs }) });
  }, [activeItem, pathname]);

  useEffect(() => {
    const reportError = (type: string, message: string) => sendEvent({ module: activeItem, pagePath: pathname || "/", pageLabel: defaultPageLabel(activeItem, pathname || "/"), eventName: "error", sessionId: adoptionSession(), errorType: type, errorMessage: message.slice(0, 180), outcome: "error" });
    const onError = (event: ErrorEvent) => reportError(event.error?.name || "frontend_error", event.message || "Falha ao carregar a página");
    const onRejection = (event: PromiseRejectionEvent) => reportError("unhandled_rejection", event.reason instanceof Error ? event.reason.message : "Falha assíncrona não tratada");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [activeItem, pathname]);

  return null;
}

function defaultPageLabel(activeItem: string, pathname: string) {
  if (activeItem === "agenda") return "Agenda";
  if (activeItem === "adocao") return "Adoção";
  if (activeItem === "ads") return "Ads: Visão Geral";
  if (activeItem === "financeiro") return "Financeiro: Início";
  if (activeItem === "objetivos") return "Objetivos: Visao Geral";
  if (activeItem === "admin") return "Admin: Users";
  if (activeItem === "instagram") return "Instagram";

  return pathname;
}
