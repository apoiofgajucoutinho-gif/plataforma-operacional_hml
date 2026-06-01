"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function TrackPageView({ activeItem }: { activeItem: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (activeItem === "instagram") return;

    void fetch("/api/adoption/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: activeItem,
        pagePath: pathname,
        pageLabel: defaultPageLabel(activeItem, pathname),
      }),
      keepalive: true,
    });
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
