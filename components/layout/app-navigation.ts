export type NavigationIconKey =
  | "activity"
  | "alert"
  | "bar-chart"
  | "bot"
  | "briefcase"
  | "calendar"
  | "clipboard"
  | "compass"
  | "dollar"
  | "file-text"
  | "layout"
  | "line-chart"
  | "monitor"
  | "settings"
  | "sparkles"
  | "tags"
  | "target"
  | "users";

export type NavigationDefinition = {
  label: string;
  href: string;
  icon: NavigationIconKey;
  key: string;
  module: string;
  group: string;
  adminOnly?: boolean;
};

const adminNavigation: NavigationDefinition[] = [
  { label: "Início", href: "/norwyn", icon: "compass", key: "norwyn", module: "norwyn", group: "Principal" },
  { label: "Agenda", href: "/agenda", icon: "calendar", key: "agenda", module: "agenda", group: "Principal" },
  { label: "Atividades", href: "/atividades", icon: "activity", key: "atividades", module: "atividades", group: "Principal" },
  { label: "Comercial", href: "/comercial", icon: "briefcase", key: "comercial", module: "comercial", group: "Negócio" },
  { label: "Marketing", href: "/marketing", icon: "sparkles", key: "marketing", module: "norwyn", group: "Negócio" },
  { label: "Resultados", href: "/resultados", icon: "bar-chart", key: "resultados", module: "norwyn", group: "Negócio" },
  { label: "Financeiro", href: "/financeiro", icon: "dollar", key: "financeiro", module: "financeiro", group: "Negócio" },
  { label: "Produtos & Alunos", href: "/produtos-alunos", icon: "users", key: "produtos-alunos", module: "norwyn", group: "Negócio" },
  { label: "Catálogo", href: "/catalogo", icon: "tags", key: "catalogo", module: "catalogo", group: "Negócio" },
  { label: "Missões", href: "/missoes", icon: "target", key: "missoes", module: "norwyn", group: "Negócio" },
  { label: "Automações", href: "/automacoes", icon: "bot", key: "automacoes", module: "norwyn", group: "Negócio" },
  { label: "Validação", href: "/validacao", icon: "clipboard", key: "validacao", module: "validacao", group: "Negócio" },
  { label: "Presença", href: "/presence", icon: "monitor", key: "presence", module: "norwyn", group: "Avançado" },
  { label: "Landing Pages", href: "/landing-pages", icon: "layout", key: "landing-pages", module: "landing-pages", group: "Administração" },
  { label: "Suporte", href: "/ocorrencias", icon: "alert", key: "suporte", module: "ocorrencias", group: "Operação" },
  { label: "Alunos", href: "/produtos-alunos?view=students", icon: "users", key: "alunos", module: "norwyn", group: "Operação" },
  { label: "Usuários", href: "/admin", icon: "settings", key: "admin", module: "admin", group: "Administração" },
  { label: "Relatórios", href: "/relatorios", icon: "file-text", key: "relatorios", module: "relatorios", group: "Administração" },
  { label: "Adoção", href: "/adocao", icon: "activity", key: "adocao", module: "adocao", group: "Administração", adminOnly: true },
  { label: "Configurações", href: "/admin?tab=settings", icon: "settings", key: "configuracoes", module: "admin", group: "Administração" },
  { label: "Lifecycle", href: "/norwyn?tab=guide", icon: "line-chart", key: "lifecycle", module: "norwyn", group: "Avançado" },
  { label: "Product Identity", href: "/norwyn?tab=business", icon: "briefcase", key: "product-identity", module: "norwyn", group: "Avançado" },
  { label: "QA", href: "/norwyn?tab=evidence", icon: "bar-chart", key: "qa", module: "norwyn", group: "Avançado" },
  { label: "Lab", href: "/norwyn-lab/funnel-test", icon: "line-chart", key: "advanced", module: "norwyn", group: "Avançado" },
];

const specialistNavigation: NavigationDefinition[] = [
  { label: "Início", href: "/norwyn", icon: "compass", key: "norwyn", module: "norwyn", group: "Principal" },
  { label: "Agenda", href: "/agenda", icon: "calendar", key: "agenda", module: "agenda", group: "Principal" },
  { label: "Missões", href: "/missoes", icon: "target", key: "missoes", module: "norwyn", group: "Principal" },
  { label: "Marketing", href: "/marketing", icon: "sparkles", key: "marketing", module: "norwyn", group: "Trabalho" },
  { label: "Comercial", href: "/comercial", icon: "briefcase", key: "comercial", module: "comercial", group: "Trabalho" },
  { label: "Catálogo", href: "/catalogo", icon: "tags", key: "catalogo", module: "catalogo", group: "Trabalho" },
  { label: "Produtos & Alunos", href: "/produtos-alunos", icon: "users", key: "produtos-alunos", module: "norwyn", group: "Trabalho" },
  { label: "Resultados", href: "/resultados", icon: "bar-chart", key: "resultados", module: "norwyn", group: "Trabalho" },
  { label: "Relatórios", href: "/relatorios", icon: "file-text", key: "relatorios", module: "relatorios", group: "Trabalho" },
  { label: "Financeiro", href: "/financeiro", icon: "dollar", key: "financeiro", module: "financeiro", group: "Trabalho" },
  { label: "Automações", href: "/automacoes", icon: "bot", key: "automacoes", module: "norwyn", group: "Trabalho" },
  { label: "Presença", href: "/presence", icon: "monitor", key: "presence", module: "norwyn", group: "Trabalho" },
  { label: "Validação", href: "/validacao", icon: "clipboard", key: "validacao", module: "validacao", group: "Trabalho" },
];

const operationalNavigation: NavigationDefinition[] = [
  { label: "Início", href: "/norwyn", icon: "compass", key: "norwyn", module: "norwyn", group: "Principal" },
  { label: "Agenda", href: "/agenda", icon: "calendar", key: "agenda", module: "agenda", group: "Principal" },
  { label: "Atividades", href: "/atividades", icon: "activity", key: "atividades", module: "atividades", group: "Principal" },
  { label: "Suporte", href: "/ocorrencias", icon: "alert", key: "suporte", module: "ocorrencias", group: "Operação" },
  { label: "Alunos", href: "/produtos-alunos?view=students", icon: "users", key: "alunos", module: "norwyn", group: "Operação" },
  { label: "Financeiro", href: "/financeiro", icon: "dollar", key: "financeiro", module: "financeiro", group: "Operação" },
  { label: "Produtos", href: "/produtos-alunos?view=products", icon: "briefcase", key: "produtos", module: "norwyn", group: "Operação" },
  { label: "Catálogo", href: "/catalogo", icon: "tags", key: "catalogo", module: "catalogo", group: "Operação" },
  { label: "Relatórios", href: "/relatorios", icon: "file-text", key: "relatorios", module: "relatorios", group: "Operação" },
  { label: "Automações", href: "/automacoes", icon: "bot", key: "automacoes", module: "norwyn", group: "Operação" },
  { label: "Validação", href: "/validacao", icon: "clipboard", key: "validacao", module: "validacao", group: "Operação" },
];

// Kept explicit so SUPPORT never inherits ADMIN through a fallback.
const supportNavigation: NavigationDefinition[] = operationalNavigation.map((item) => ({ ...item }));

export function navigationDefinitionsForRole(role: unknown): NavigationDefinition[] {
  const normalizedRole = typeof role === "string" ? role.trim().toUpperCase() : "";
  if (normalizedRole === "ESPECIALISTA") return specialistNavigation;
  if (normalizedRole === "OPERACIONAL") return operationalNavigation;
  if (normalizedRole === "SUPORTE") return supportNavigation;
  return adminNavigation;
}
