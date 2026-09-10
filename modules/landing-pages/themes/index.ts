import type { LandingThemeTokens } from "@/modules/landing-pages/types";

export const julianaDefaultTheme: LandingThemeTokens = {
  key: "juliana-default",
  name: "Juliana Default",
  background: "#F8F4EC",
  surface: "#FFFDF8",
  elevated: "#FFFFFF",
  text: "#173F3F",
  muted: "#65716D",
  primary: "#173F3F",
  accent: "#C6914B",
  cta: "#B8752A",
  ctaText: "#FFFFFF",
  border: "#E6D8C5",
};

export const blackFridayDemoTheme: LandingThemeTokens = {
  key: "black-friday-demo",
  name: "Black Friday Demo",
  background: "#101312",
  surface: "#181D1B",
  elevated: "#222925",
  text: "#F6F0E7",
  muted: "#BFB3A4",
  primary: "#F6F0E7",
  accent: "#D2A85D",
  cta: "#D2A85D",
  ctaText: "#101312",
  border: "#3A332A",
};

export const landingThemes = [julianaDefaultTheme, blackFridayDemoTheme];

export function themeByKey(key: string | null | undefined) {
  return landingThemes.find((theme) => theme.key === key) ?? julianaDefaultTheme;
}
