import type { InstagramInteraction, InstagramPostMetric, InstagramPostType } from "@/modules/instagram/types";

export type Period = "today" | "7d" | "15d" | "30d" | "90d" | "custom";
export type OpportunityType =
  | "Alta utilidade educativa"
  | "Alta resposta pública"
  | "Alto alcance"
  | "Boa oportunidade de relacionamento"
  | "Boa oportunidade de venda"
  | "Boa oportunidade de autoridade"
  | "Tema em observação"
  | "Baixa aderência ao ciclo"
  | "Lacuna de dados";
export type ThemeClassification = "Alta oportunidade" | "Boa oportunidade" | "Observação" | "Baixa aderência ao ciclo" | "Lacuna";
export type RecommendedAction = "Criar Briefing" | "Adicionar ao Backlog" | "Explorar Melhor" | "Arquivar";

export type Opportunity = {
  id: string;
  theme: string;
  signal: string;
  rule: string;
  evidence: string;
  type: OpportunityType;
  potential: "Alto" | "Médio";
  confidence: "Alta" | "Média" | "Baixa";
  relatedPosts: InstagramPostMetric[];
  postReasons: Record<string, string>;
};

export type Gap = {
  title: string;
  impact: string;
  action: string;
};

export type CycleConfig = {
  period: Period;
  startDate: string;
  endDate: string;
  context: string;
  objective: string;
  priority: string;
  capacity: string;
  restrictions: string;
};

export type FormatSummary = {
  type: InstagramPostType;
  count: number;
  averageReach: number;
  averageSaved: number;
};

export type Recommendation = {
  id: string;
  title: string;
  theme: string;
  signal: string;
  classification: ThemeClassification;
  action: RecommendedAction;
  reasons: string[];
  dataUsed: string[];
  rule: string;
  rulesTriggered: string[];
  rulesReduced: string[];
  gaps: string[];
  evidence: string;
  relatedPosts: InstagramPostMetric[];
  priority: "Alta" | "Média";
  effort: "Baixo" | "Médio";
  confidence: "Alta" | "Média" | "Baixa";
  confidenceScore: number;
  confidenceReasons: string[];
  nextAction: RecommendedAction;
  hypothesis: string;
};

export type Briefing = {
  id: string;
  title: string;
  format: string;
  theme: string;
  objective: string;
  evidence: string;
  restrictions: string;
  cta: string;
  origin: string;
  createdAt: string;
};

export type Analysis = {
  posts: InstagramPostMetric[];
  comments: InstagramInteraction[];
  sanitizedComments: string[];
  totalReach: number;
  totalLikes: number;
  metricComments: number;
  totalSaved: number;
  totalShares: number;
  averageEngagement: number | null;
  formats: FormatSummary[];
  mostPublished?: FormatSummary;
  bestReach?: FormatSummary;
  bestSaved?: FormatSummary;
  topReach?: InstagramPostMetric;
  topSaved?: InstagramPostMetric;
  topComments?: InstagramPostMetric;
  opportunities: Opportunity[];
  recommendations: Recommendation[];
  observationBacklog: Recommendation[];
  briefings: Briefing[];
  gaps: Gap[];
  interactionsStatus: {
    checked: boolean;
    validComments: number;
    usable: boolean;
    message: string;
  };
};

export type EditorialDecisionEngine = {
  name: string;
  evaluate: (posts: InstagramPostMetric[], interactions: InstagramInteraction[], config: CycleConfig) => Analysis;
};

export const initialConfig: CycleConfig = {
  period: "30d",
  startDate: "",
  endDate: "",
  context: "",
  objective: "",
  priority: "",
  capacity: "3",
  restrictions: "",
};

export const periodOptions: Array<[Period, string]> = [
  ["today", "Hoje"],
  ["7d", "7 dias"],
  ["15d", "15 dias"],
  ["30d", "30 dias"],
  ["90d", "90 dias"],
  ["custom", "Personalizado"],
];

export function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function periodRange(config: CycleConfig) {
  const today = new Date(`${localDateKey()}T12:00:00`);
  if (config.period === "custom") return { start: config.startDate, end: config.endDate };
  const days = config.period === "today" ? 1 : Number(config.period.replace("d", ""));
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);
  return { start: localDateKey(start), end: localDateKey(today) };
}

export function compact(value: number) {
  if (Math.abs(value) < 1000) return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value / 1000)}k`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

export function filterLabel(period: Period) {
  if (period === "today") return "Hoje";
  if (period === "custom") return "Personalizado";
  return period;
}

export function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function postLabel(post: InstagramPostMetric) {
  const clean = post.legenda?.replace(/\s+/g, " ").trim();
  return clean ? `${clean.slice(0, 72)}${clean.length > 72 ? "..." : ""}` : `Post de ${formatDate(post.data_postagem)}`;
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function topBy(posts: InstagramPostMetric[], getter: (post: InstagramPostMetric) => number) {
  return [...posts].sort((left, right) => getter(right) - getter(left))[0];
}

function cycleHas(config: CycleConfig, terms: string[]) {
  const text = normalizeText(`${config.context} ${config.objective} ${config.priority}`);
  return terms.some((term) => text.includes(normalizeText(term)));
}

function isPersonalOrFamilyText(value: string) {
  return /(famil|pessoal|bastidor|filh|ferias|viagem|rotina|aniversario|vida real|jiu jitsu|jiujitsu|tatame|kimono)/.test(normalizeText(value));
}

function isPersonalOrFamily(post: InstagramPostMetric, theme: string) {
  return isPersonalOrFamilyText(`${theme} ${post.legenda ?? ""}`);
}

function confidenceLabel(score: number): "Alta" | "Média" | "Baixa" {
  if (score >= 70) return "Alta";
  if (score >= 40) return "Média";
  return "Baixa";
}

function normalizeEngagementScore(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function uniqueList(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function uniquePosts(posts: InstagramPostMetric[]) {
  const seen = new Set<string>();
  return posts.filter((post) => {
    const key = post.post_id || post.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeComment(value: string) {
  const sensitivePattern = /\b(?:diagn[oó]stico|laudo|medica(?:mento)?|doen[cç]a|tratamento|paciente|perda auditiva|zumbido|cirurgia|exame)\b/i;
  if (sensitivePattern.test(value)) return "";

  return value
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link removido]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[e-mail removido]")
    .replace(/@\w+/g, "[perfil removido]")
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g, "[telefone removido]")
    .replace(/\b(?:CPF|RG)\s*[:\-]?\s*[\d.-]+/gi, "[documento removido]")
    .trim()
    .slice(0, 220);
}

function isValidComment(interaction: InstagramInteraction, posts: InstagramPostMetric[]) {
  if (interaction.source !== "post_comment") return false;
  if (interaction.origem !== "n8n_instagram_comments_collector") return false;
  if (!interaction.external_id || !interaction.post_id || !interaction.message_text?.trim()) return false;
  return posts.some((post) => post.post_id === interaction.post_id);
}

function safeTopicFromInteraction(topic: string | null) {
  if (!topic || topic === "Sem tema definido" || topic === "Engajamento por CTA") return null;
  if (/risco|reclam/i.test(topic)) return null;
  return topic;
}

function inferEditorialTheme(post: InstagramPostMetric, comments: InstagramInteraction[]) {
  const commentTheme = comments.find((comment) => comment.post_id === post.post_id && safeTopicFromInteraction(comment.product_topic))?.product_topic;
  if (commentTheme) return commentTheme;

  const text = normalizeText(post.legenda ?? "");
  const themes: Array<[RegExp, string]> = [
    [/microfone.?sonda/, "Microfone-sonda"],
    [/verifica|validacao|validar/, "Verificação e Validação"],
    [/ajuste.?fino/, "Ajustes finos"],
    [/first.?fit/, "First-fit"],
    [/raciocinio.?clinico|raciocinio clinico|caso clinico/, "Raciocínio Clínico"],
    [/aasi|aparelho auditivo|audiolog/, "AASI"],
    [/formacao|curso|aula|alun/, "Formação AASI"],
    [/crianca|criancas|familia|filh|bastidor|vida real|ferias|rotina/, "Bastidores/Relacionamento"],
    [/jiu jitsu|jiujitsu|kimono|tatame|faixa|luta/, "Bastidores/Relacionamento"],
  ];
  return themes.find(([pattern]) => pattern.test(text))?.[1] ?? "Tema não identificado";
}

function themeNeedsValidation(theme: string) {
  return theme === "Tema não identificado";
}

function candidateOpportunityType(item: Recommendation): OpportunityType {
  if (item.classification === "Baixa aderência ao ciclo") return "Baixa aderência ao ciclo";
  if (item.classification === "Lacuna") return "Lacuna de dados";
  if (item.signal === "Alta resposta pública") return "Alta resposta pública";
  if (item.signal === "Alto salvamento") return "Alta utilidade educativa";
  if (item.signal === "Alto alcance") return "Alto alcance";
  if (item.action === "Criar Briefing" && /venda|produto|aasi|formacao/i.test(normalizeText(item.theme))) return "Boa oportunidade de venda";
  if (/relacionamento|conexao|bastidores/i.test(normalizeText(item.theme))) return "Boa oportunidade de relacionamento";
  return "Tema em observação";
}

function makeRecommendation(input: {
  id: string;
  post: InstagramPostMetric;
  theme: string;
  signal: string;
  title: string;
  evidence: string;
  rule: string;
  action: RecommendedAction;
  classification: ThemeClassification;
  baseReasons: string[];
  dataUsed: string[];
  hypothesis: string;
  config: CycleConfig;
  filteredPosts: InstagramPostMetric[];
  postComments: InstagramInteraction[];
  averages: { reach: number; saved: number; comments: number; shares: number };
  effort: "Baixo" | "Médio";
}) {
  const rulesTriggered: string[] = [input.rule];
  const rulesReduced: string[] = [];
  const gaps: string[] = [];
  const confidenceReasons: string[] = [];
  let score = 42;

  if (input.filteredPosts.length >= 8) { score += 12; confidenceReasons.push("Volume suficiente de posts no período."); }
  else if (input.filteredPosts.length >= 4) { score += 7; confidenceReasons.push("Volume mínimo de posts disponível."); }
  else { score -= 16; rulesReduced.push("Poucos posts no período."); gaps.push("Baixo volume de posts para comparação."); }

  const reachAbove = (input.post.alcance ?? 0) > input.averages.reach && (input.post.alcance ?? 0) > 0;
  const savedAbove = (input.post.salvos ?? 0) > input.averages.saved && (input.post.salvos ?? 0) > 0;
  const commentsAbove = input.post.comentarios > input.averages.comments && input.post.comentarios > 0;
  const sharesAbove = (input.post.compartilhamentos ?? 0) > input.averages.shares && (input.post.compartilhamentos ?? 0) > 0;

  if (reachAbove || savedAbove || commentsAbove || sharesAbove) { score += 12; confidenceReasons.push("Métrica principal acima da média do período."); }
  else { score -= 8; rulesReduced.push("Métrica isolada ou próxima da média."); }

  const wantsRelationship = cycleHas(input.config, ["relacionamento", "comunidade", "conexao", "conversa", "maior resposta", "ferias", "agenda reduzida", "congresso"]);
  const wantsSales = cycleHas(input.config, ["venda", "pre-lancamento", "lancamento", "aasi premium", "produto", "obje", "aquecer"]);
  const wantsEducation = cycleHas(input.config, ["educacao", "educativo", "autoridade", "fortalecer autoridade", "carrossel", "planejamento"]);
  const personal = isPersonalOrFamily(input.post, input.theme);
  const productTheme = /aasi|formacao|curso|preco|inscricao|compr|obje/i.test(normalizeText(input.theme + " " + (input.post.legenda ?? "")));
  const technicalTheme = /verificacao|validacao|ajustes|microfone|first|raciocinio|aasi|formacao/i.test(normalizeText(input.theme));

  if (!themeNeedsValidation(input.theme)) { score += 12; confidenceReasons.push("Tema editorial identificado."); }
  else { score -= 16; rulesReduced.push("Tema editorial não identificado."); gaps.push("Este post gerou sinal de engajamento, mas o tema editorial precisa de validação manual."); }

  if (wantsRelationship && (commentsAbove || personal)) { score += 12; confidenceReasons.push("Contexto e prioridade favorecem conversa, vínculo ou bastidores."); }
  else if (wantsRelationship && savedAbove && !commentsAbove) { score -= 8; rulesReduced.push("Sinal educativo menos aderente a relacionamento neste ciclo."); }

  if (wantsSales && productTheme) { score += 12; confidenceReasons.push("Tema conectado a produto, objeção ou intenção comercial."); }
  else if (wantsSales && !productTheme) { score -= 10; rulesReduced.push("Tema pouco conectado à intenção de venda do ciclo."); }

  if (wantsEducation && (savedAbove || input.post.tipo === "Carrossel" || technicalTheme)) { score += 12; confidenceReasons.push("Formato ou tema sustenta utilidade educativa/autoridade."); }
  else if (wantsEducation && personal) { score -= 16; rulesReduced.push("Conteúdo pessoal tem baixa aderência ao objetivo educativo."); }

  if (!wantsRelationship && personal) {
    score -= 24;
    rulesReduced.push("Tema familiar/pessoal fora do contexto de relacionamento.");
    gaps.push("Revisar se o tema pessoal faz sentido para o ciclo atual antes de usar como conteúdo editorial.");
  }

  if (input.postComments.length) { score += 10; confidenceReasons.push("Comentários públicos válidos foram considerados."); }
  else { score -= 10; rulesReduced.push("Sem comentários textuais válidos associados."); gaps.push("A análise depende mais de métrica do que da linguagem da audiência."); }

  if ((input.action === "Criar Briefing" && (input.post.tipo === "Carrossel" || input.post.tipo === "Reels")) || input.effort === "Baixo") {
    score += 6;
    confidenceReasons.push("Formato ou esforço compatível com a ação recomendada.");
  }

  if (input.action === "Arquivar") score -= 18;
  if (input.classification === "Baixa aderência ao ciclo") score -= 18;
  if (input.classification === "Lacuna") score -= 20;

  score = Math.max(0, Math.min(100, score));
  if (!confidenceReasons.length) confidenceReasons.push("Score calculado pelas regras disponíveis no período.");

  return {
    id: input.id,
    title: input.title,
    theme: input.theme,
    signal: input.signal,
    classification: input.classification,
    action: input.action,
    reasons: input.baseReasons,
    dataUsed: input.dataUsed,
    rule: input.rule,
    rulesTriggered,
    rulesReduced,
    gaps,
    evidence: input.evidence,
    relatedPosts: [input.post],
    priority: score >= 70 ? "Alta" : "Média",
    effort: input.effort,
    confidence: confidenceLabel(score),
    confidenceScore: score,
    confidenceReasons,
    nextAction: input.action,
    hypothesis: input.hypothesis,
  } satisfies Recommendation;
}

function uniqueRecommendations(items: Recommendation[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.theme}-${item.signal}-${item.relatedPosts[0]?.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function consolidateRecommendationsByTheme(items: Recommendation[]) {
  const grouped = new Map<string, Recommendation[]>();
  uniqueRecommendations(items).forEach((item) => {
    const key = normalizeText(item.theme || "Tema não identificado") || "tema-nao-identificado";
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });

  return [...grouped.values()].map((group) => {
    const primary = [...group].sort((left, right) => right.confidenceScore - left.confidenceScore)[0];
    const relatedPosts = uniquePosts(group.flatMap((item) => item.relatedPosts));
    const signals = uniqueList(group.map((item) => item.signal));
    const rules = uniqueList(group.flatMap((item) => item.rulesTriggered));
    const reducers = uniqueList(group.flatMap((item) => item.rulesReduced));
    const gaps = uniqueList(group.flatMap((item) => item.gaps));
    const confidenceReasons = uniqueList(group.flatMap((item) => item.confidenceReasons));
    const dataUsed = uniqueList(group.flatMap((item) => item.dataUsed));
    const reasons = uniqueList(group.flatMap((item) => item.reasons)).slice(0, 3);
    const averageScore = Math.round(average(group.map((item) => item.confidenceScore)));
    const score = Math.max(0, Math.min(96, Math.round((primary.confidenceScore * 0.7) + (averageScore * 0.3) - Math.max(0, relatedPosts.length - 3))));
    const themeUnknown = themeNeedsValidation(primary.theme);
    const finalScore = themeUnknown ? Math.min(score, 62) : score;
    const action = themeUnknown && primary.action === "Criar Briefing" ? "Explorar Melhor" : primary.action;
    const classification = themeUnknown && primary.classification === "Alta oportunidade" ? "Observação" : primary.classification;

    return {
      ...primary,
      id: `theme-${normalizeText(primary.theme).replace(/[^a-z0-9]+/g, "-") || primary.id}`,
      signal: signals.join(" + "),
      rule: rules.join(" + "),
      rulesTriggered: rules,
      rulesReduced: reducers,
      gaps,
      confidenceReasons,
      dataUsed,
      reasons,
      relatedPosts,
      action,
      nextAction: action,
      classification,
      confidenceScore: finalScore,
      confidence: confidenceLabel(finalScore),
      priority: finalScore >= 70 ? "Alta" : "Média",
      evidence: relatedPosts.length > 1
        ? `${relatedPosts.length} posts apontam para este mesmo tema editorial.`
        : primary.evidence,
    } satisfies Recommendation;
  });
}

function buildAnalysis(posts: InstagramPostMetric[], interactions: InstagramInteraction[], config: CycleConfig): Analysis {
  const range = periodRange(config);
  const filteredPosts = posts.filter((post) => post.data_postagem >= range.start && post.data_postagem <= range.end);
  const filteredComments = interactions.filter((interaction) => {
    const date = interaction.interaction_at.slice(0, 10);
    return date >= range.start && date <= range.end && isValidComment(interaction, filteredPosts);
  });
  const commentsByPost = new Map<string, InstagramInteraction[]>();
  filteredComments.forEach((comment) => {
    if (!comment.post_id) return;
    commentsByPost.set(comment.post_id, [...(commentsByPost.get(comment.post_id) ?? []), comment]);
  });
  const sanitizedComments = filteredComments
    .map((comment) => sanitizeComment(comment.message_text ?? ""))
    .filter((comment) => comment.length >= 3 && !comment.includes("[documento removido]"))
    .slice(0, 5);

  const formatMap = new Map<InstagramPostType, InstagramPostMetric[]>();
  filteredPosts.forEach((post) => formatMap.set(post.tipo, [...(formatMap.get(post.tipo) ?? []), post]));
  const formats = [...formatMap.entries()].map(([type, grouped]) => ({
    type,
    count: grouped.length,
    averageReach: average(grouped.map((post) => post.alcance ?? 0)),
    averageSaved: average(grouped.map((post) => post.salvos ?? 0)),
  }));

  const totalReach = filteredPosts.reduce((sum, post) => sum + (post.alcance ?? 0), 0);
  const totalLikes = filteredPosts.reduce((sum, post) => sum + post.likes, 0);
  const metricComments = filteredPosts.reduce((sum, post) => sum + post.comentarios, 0);
  const totalSaved = filteredPosts.reduce((sum, post) => sum + (post.salvos ?? 0), 0);
  const totalShares = filteredPosts.reduce((sum, post) => sum + (post.compartilhamentos ?? 0), 0);
  const averages = {
    reach: average(filteredPosts.map((post) => post.alcance ?? 0)),
    saved: average(filteredPosts.map((post) => post.salvos ?? 0)),
    comments: average(filteredPosts.map((post) => post.comentarios)),
    shares: average(filteredPosts.map((post) => post.compartilhamentos ?? 0)),
  };
  const topReach = topBy(filteredPosts, (post) => post.alcance ?? 0);
  const topSaved = topBy(filteredPosts, (post) => post.salvos ?? 0);
  const topComments = topBy(filteredPosts, (post) => post.comentarios);
  const topShares = topBy(filteredPosts, (post) => post.compartilhamentos ?? 0);
  const mostPublished = [...formats].sort((left, right) => right.count - left.count)[0];
  const bestReach = [...formats].sort((left, right) => right.averageReach - left.averageReach)[0];
  const bestSaved = [...formats].sort((left, right) => right.averageSaved - left.averageSaved)[0];

  const wantsRelationship = cycleHas(config, ["relacionamento", "comunidade", "conexao", "conversa", "maior resposta", "ferias", "agenda reduzida", "congresso"]);
  const wantsSales = cycleHas(config, ["venda", "pre-lancamento", "lancamento", "aasi premium", "produto", "obje", "aquecer"]);
  const wantsEducation = cycleHas(config, ["educacao", "educativo", "autoridade", "fortalecer autoridade", "carrossel", "planejamento"]);
  const reducedAgenda = cycleHas(config, ["ferias", "agenda reduzida"]);

  const candidates: Recommendation[] = [];
  const build = (post: InstagramPostMetric | undefined, details: Omit<Parameters<typeof makeRecommendation>[0], "post" | "theme" | "filteredPosts" | "postComments" | "averages" | "config"> & { theme?: string }) => {
    if (!post) return;
    const postComments = post.post_id ? commentsByPost.get(post.post_id) ?? [] : [];
    const theme = details.theme ?? inferEditorialTheme(post, postComments);
    candidates.push(makeRecommendation({ ...details, post, theme, filteredPosts, postComments, averages, config }));
  };

  build(topComments, {
    id: "comment-topic",
    signal: "Alta resposta pública",
    title: wantsRelationship ? "Explorar conversa gerada pela audiência" : "Validar o tema que mais gerou comentários",
    evidence: `${postLabel(topComments)} concentrou ${topComments?.comentarios ?? 0} comentários no período.`,
    rule: "Comentários acima da média do período",
    action: wantsRelationship ? "Explorar Melhor" : "Adicionar ao Backlog",
    classification: wantsRelationship ? "Boa oportunidade" : "Observação",
    baseReasons: ["Comentários indicam resposta pública.", wantsRelationship ? "O ciclo atual favorece relacionamento e conversa." : "Precisa validar o tema antes de virar briefing."],
    dataUsed: ["Comentários", "Legenda", "Contexto do ciclo"],
    hypothesis: "Pode haver uma conversa latente que vale transformar em pauta após validação humana.",
    effort: reducedAgenda ? "Baixo" : "Médio",
  });

  build(topSaved, {
    id: "saved-series",
    signal: "Alto salvamento",
    title: "Transformar utilidade percebida em pauta educativa",
    evidence: `${postLabel(topSaved)} teve ${topSaved?.salvos ?? 0} salvamentos.`,
    rule: "Carrossel ou post acima da média de salvamentos",
    action: wantsRelationship && !wantsEducation ? "Adicionar ao Backlog" : "Criar Briefing",
    classification: wantsRelationship && !wantsEducation ? "Observação" : "Alta oportunidade",
    baseReasons: ["Salvamentos sinalizam utilidade percebida.", wantsEducation ? "O objetivo atual favorece educação/autoridade." : "Pode ser usado como repertório para o backlog."],
    dataUsed: ["Salvamentos", "Formato", "Legenda"],
    hypothesis: "O conteúdo parece guardar valor prático para a audiência.",
    effort: "Médio",
  });

  build(topReach, {
    id: "reach-reel",
    signal: "Alto alcance",
    title: "Entender por que este conteúdo distribuiu acima da média",
    evidence: `${postLabel(topReach)} alcançou ${compact(topReach?.alcance ?? 0)} pessoas.`,
    rule: "Post acima da média de alcance",
    action: "Explorar Melhor",
    classification: "Boa oportunidade",
    baseReasons: ["Alcance acima da média indica distribuição.", "A decisão correta depende de validar se o tema também serve ao ciclo."],
    dataUsed: ["Alcance", "Formato", "Legenda"],
    hypothesis: "Pode existir um gancho de distribuição reutilizável, mas não necessariamente um tema editorial prioritário.",
    effort: reducedAgenda ? "Baixo" : "Médio",
  });

  if (wantsSales) {
    const productPost = filteredPosts.find((post) => /aasi|formacao|curso|aula|obje|inscri|compr/i.test(normalizeText(post.legenda ?? ""))) ?? topReach;
    build(productPost, {
      id: "sales-prep",
      signal: "Aderência a produto",
      title: "Usar tema conectado à Formação AASI no aquecimento",
      evidence: `${postLabel(productPost)} tem relação com produto, curso ou intenção comercial.`,
      rule: "Tema compatível com pré-lançamento/venda",
      action: "Criar Briefing",
      classification: "Alta oportunidade",
      baseReasons: ["O ciclo favorece venda ou pré-lançamento.", "Tema conectado a produto reduz dispersão editorial."],
      dataUsed: ["Legenda", "Contexto", "Objetivo", "Prioridade"],
      hypothesis: "Pode ajudar a aquecer objeções e autoridade antes de uma oferta.",
      effort: "Médio",
    });
  }

  build(topShares, {
    id: "share-topic",
    signal: "Alto compartilhamento",
    title: "Observar tema com potencial de circulação",
    evidence: `${postLabel(topShares)} teve ${topShares?.compartilhamentos ?? 0} compartilhamentos.`,
    rule: "Compartilhamentos acima da média",
    action: wantsEducation || wantsSales ? "Adicionar ao Backlog" : "Explorar Melhor",
    classification: "Observação",
    baseReasons: ["Compartilhamento pode indicar utilidade social.", "Ainda precisa de validação editorial antes de virar prioridade."],
    dataUsed: ["Compartilhamentos", "Legenda", "Formato"],
    hypothesis: "Pode haver um ângulo de conteúdo compartilhável a reaproveitar.",
    effort: "Baixo",
  });

  if (reducedAgenda) {
    const lightPost = filteredPosts.find((post) => post.tipo === "Reels" || isPersonalOrFamily(post, inferEditorialTheme(post, []))) ?? topComments;
    build(lightPost, {
      id: "low-effort-backlog",
      signal: "Baixo esforço",
      title: "Priorizar reaproveitamento leve para agenda reduzida",
      evidence: `${postLabel(lightPost)} pode virar pauta simples sem exigir produção pesada.`,
      rule: "Contexto de agenda reduzida",
      action: "Adicionar ao Backlog",
      classification: "Boa oportunidade",
      baseReasons: ["O contexto reduz capacidade de produção.", "Conteúdos leves ou reaproveitáveis protegem consistência."],
      dataUsed: ["Contexto", "Formato", "Legenda"],
      hypothesis: "Pode manter presença sem criar carga operacional alta.",
      effort: "Baixo",
    });
  }

  filteredPosts
    .filter((post) => isPersonalOrFamily(post, inferEditorialTheme(post, commentsByPost.get(post.post_id ?? "") ?? [])))
    .slice(0, 2)
    .forEach((post, index) => {
      const action: RecommendedAction = wantsRelationship ? "Explorar Melhor" : "Adicionar ao Backlog";
      build(post, {
        id: `personal-${index}`,
        signal: "Conexão pessoal",
        title: wantsRelationship ? "Explorar conversa qualificada com a audiência" : "Guardar no backlog sem transformar em pauta técnica",
        evidence: `${postLabel(post)} tem característica pessoal, familiar ou de bastidor.`,
        rule: "Post familiar/pessoal identificado",
        action,
        classification: wantsRelationship ? "Boa oportunidade" : "Baixa aderência ao ciclo",
        baseReasons: [wantsRelationship ? "O ciclo permite relacionamento e comunidade." : "O ciclo atual não pede pauta pessoal como prioridade técnica."],
        dataUsed: ["Legenda", "Contexto", "Prioridade"],
        hypothesis: "Pode fortalecer vínculo se o contexto permitir, mas não deve virar série educativa técnica automaticamente.",
        effort: "Baixo",
      });
    });

  const scoredCandidates = consolidateRecommendationsByTheme(candidates).sort((left, right) => right.confidenceScore - left.confidenceScore);
  const capacity = Math.max(1, Math.min(6, Number(config.capacity) || 3));
  const relevantThemes = scoredCandidates.filter((item) => item.action !== "Arquivar" && item.classification !== "Baixa aderência ao ciclo");
  const diversityLimit = Math.max(1, Math.min(capacity, relevantThemes.length));
  const recommendations = scoredCandidates
    .filter((item) => item.action !== "Arquivar" && item.classification !== "Baixa aderência ao ciclo")
    .slice(0, diversityLimit);
  const observationBacklog = scoredCandidates
    .filter((item) => !recommendations.some((selected) => selected.id === item.id))
    .slice(0, 8);
  const opportunities = scoredCandidates.slice(0, Math.max(capacity + 4, 6)).map((item) => ({
    id: `op-${item.id}`,
    theme: item.theme,
    signal: item.signal,
    rule: item.rule,
    type: candidateOpportunityType(item),
    evidence: item.evidence,
    potential: item.priority === "Alta" ? "Alto" : "Médio",
    confidence: item.confidence,
    relatedPosts: item.relatedPosts,
    postReasons: Object.fromEntries(item.relatedPosts.map((post) => [post.id, `${item.signal}: ${item.rule}. ${item.evidence}`])),
  } satisfies Opportunity));

  const briefings = recommendations
    .filter((item) => item.nextAction === "Criar Briefing")
    .slice(0, 3)
    .map((item) => ({
      id: `briefing-${item.id}`,
      title: item.title,
      format: item.relatedPosts[0]?.tipo ?? "A definir",
      theme: item.theme,
      objective: config.objective,
      evidence: item.evidence,
      restrictions: config.restrictions || "Revisão humana obrigatória antes de produção.",
      cta: wantsSales ? "Conduzir para próximo passo comercial sem publicar automaticamente." : "Estimular comentário ou salvamento sem prometer conteúdo final.",
      origin: item.rule,
      createdAt: new Date().toISOString(),
    }));

  const engagementValues = filteredPosts
    .map((post) => normalizeEngagementScore(post.engajamento_score))
    .filter((value): value is number => value !== null);

  const gaps: Gap[] = [];
  if (!filteredPosts.length) gaps.push({ title: "Sem posts no período", impact: "Não há base para recomendação editorial.", action: "Ampliar o período ou importar posts." });
  if (filteredPosts.length > 0 && relevantThemes.length < capacity) gaps.push({ title: "Baixa diversidade de posts no período", impact: `Foram encontradas apenas ${relevantThemes.length} oportunidades com evidência suficiente.`, action: "A análise reduziu a quantidade de recomendações para evitar repetir o mesmo post ou tema." });
  if (!filteredComments.length) gaps.push({ title: "Interações textuais limitadas", impact: "A leitura de linguagem da audiência fica incompleta.", action: "Interações ainda não possuem dados textuais confiáveis para enriquecer esta análise." });
  if (!filteredPosts.some((post) => post.salvos !== null)) gaps.push({ title: "Salvamentos ausentes", impact: "O potencial de utilidade educativa fica incompleto.", action: "Validar a importação das métricas de salvamentos." });
  if (!engagementValues.length) gaps.push({ title: "Engajamento indisponível", impact: "A média de engajamento não será exibida para evitar leitura artificial como 0,0%.", action: "Validar se a importação está trazendo engajamento_score para os posts do período." });
  if (scoredCandidates.some((item) => themeNeedsValidation(item.theme))) gaps.push({ title: "Tema editorial a validar", impact: "Alguns sinais fortes não têm tema editorial seguro.", action: "Validar manualmente antes de transformar em briefing." });
  gaps.push({ title: "Stories e DMs não considerados", impact: "A leitura cobre apenas posts, métricas e comentários públicos válidos.", action: "Interpretar o resultado dentro deste escopo." });

  return {
    posts: filteredPosts,
    comments: filteredComments,
    sanitizedComments,
    totalReach,
    totalLikes,
    metricComments,
    totalSaved,
    totalShares,
    averageEngagement: engagementValues.length ? average(engagementValues) : null,
    formats,
    mostPublished,
    bestReach,
    bestSaved,
    topReach,
    topSaved,
    topComments,
    opportunities,
    recommendations,
    observationBacklog,
    briefings,
    gaps,
    interactionsStatus: {
      checked: true,
      validComments: filteredComments.length,
      usable: filteredComments.length > 0,
      message: filteredComments.length > 0
        ? `${filteredComments.length} comentários públicos confiáveis foram usados com anonimização.`
        : "Interações ainda não possuem dados textuais confiáveis para enriquecer esta análise.",
    },
  };
}

export const RulesDecisionEngine: EditorialDecisionEngine = {
  name: "Editorial Intelligence Essentials",
  evaluate: buildAnalysis,
};

export function executiveSummary(analysis: Analysis) {
  const primary = analysis.recommendations[0];
  if (!analysis.posts.length) return "Não foram encontrados posts para responder ao ciclo editorial selecionado.";
  if (!primary) return `Neste ciclo, ${analysis.posts.length} posts foram analisados, mas ainda não há evidência suficiente para priorizar uma decisão editorial. O melhor caminho é ampliar o período ou validar manualmente os sinais que apareceram.`;
  const validation = primary.gaps.length ? `Antes de transformar em conteúdo, vale validar: ${primary.gaps[0].toLowerCase()}` : "A revisão humana ainda deve confirmar o enquadramento antes de produzir.";
  return `Neste ciclo, os dados indicam que vale olhar para “${primary.theme}”. O principal sinal foi ${primary.signal.toLowerCase()}, com ${primary.evidence.toLowerCase()} A decisão sugerida é ${primary.nextAction.toLowerCase()}. ${validation}`;
}
