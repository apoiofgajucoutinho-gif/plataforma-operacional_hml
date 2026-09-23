const telegramTimeZone = "America/Sao_Paulo";

export function escapeTelegramHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function getTelegramGreeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: telegramTimeZone }).format(now));
  if (hour >= 5 && hour < 12) return { icon: "☀️", text: "Bom dia" };
  if (hour >= 12 && hour < 18) return { icon: "☀️", text: "Boa tarde" };
  if (hour >= 18 && hour < 21) return { icon: "🌇", text: "Boa noite" };
  return { icon: "🌙", text: "Boa noite" };
}

export function formatTelegramDateTime(now = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: telegramTimeZone,
  }).format(now);
}

export function telegramGreetingHeader(now = new Date(), personalName?: string | null) {
  const greeting = getTelegramGreeting(now);
  const name = personalName?.trim();
  return `${greeting.icon} <b>${escapeTelegramHtml(greeting.text)}${name ? `, ${escapeTelegramHtml(name)}` : ""} — Norwyn</b>`;
}
