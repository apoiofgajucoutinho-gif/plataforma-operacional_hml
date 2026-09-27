const telegramTimeZone = "America/Sao_Paulo";

export const telegramParseMode = "HTML" as const;

export type TelegramReportBlock = {
  title: string;
  lines: string[];
  empty?: string;
};

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

export function renderTelegramReport(input: {
  title?: string | null;
  personalName?: string | null;
  blocks: TelegramReportBlock[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const header = input.title
    ? `<b>${escapeTelegramHtml(input.title)}</b>`
    : telegramGreetingHeader(now, input.personalName);
  const lines = [header, `📅 ${formatTelegramDateTime(now)}`, ""];

  for (const block of input.blocks) {
    lines.push(`<b>${escapeTelegramHtml(block.title)}</b>`);
    lines.push(...(block.lines.length ? block.lines.map(escapeTelegramHtml) : block.empty ? [escapeTelegramHtml(block.empty)] : []));
    lines.push("");
  }

  lines.push("Norwyn · Relatório gerado automaticamente");
  return lines.join("\n").trim();
}
