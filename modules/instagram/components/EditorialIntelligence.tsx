"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Database,
  Download,
  FilePenLine,
  FlaskConical,
  Inbox,
  Info,
  Lightbulb,
  ListPlus,
  MessageSquareText,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { InstagramInteraction, InstagramPostMetric } from "@/modules/instagram/types";
import {
  RulesDecisionEngine,
  EDITORIAL_ENGINE_NAME,
  EDITORIAL_ENGINE_TYPE,
  EDITORIAL_ENGINE_VERSION,
  average,
  compact,
  executiveSummary,
  filterLabel,
  formatDate,
  initialConfig,
  localDateKey,
  periodOptions,
  periodRange,
  postLabel,
} from "@/modules/instagram/services/editorial-intelligence";
import type {
  Analysis,
  Briefing,
  CycleConfig,
  Gap,
  Opportunity,
  Recommendation,
  RecommendedAction,
} from "@/modules/instagram/services/editorial-intelligence";

type Screen = "home" | "form" | "result";
type ActionStatus = "Briefing criado" | "No backlog" | "Arquivado";
type UserRole = "ADMIN" | "SUPORTE" | string | null | undefined;
type ExpertUsefulness = "Sim" | "Parcialmente" | "Não";
type ExpertDecision = "Criar briefing" | "Adicionar ao backlog" | "Explorar melhor" | "Arquivar" | "Apenas analisar" | "Ainda não decidi";
type LaterOutcome = "Produzi o conteúdo" | "Ficou para depois" | "Alterei o tema" | "Não utilizei" | "Em andamento" | "Ainda não sei";
type PerceivedConfidence = "Baixa" | "Média" | "Alta";
type CycleSameDecision = "Sim" | "Parcialmente" | "Não" | "";
type CycleTimeSaved = "Nenhum" | "Até 10 minutos" | "10 a 30 minutos" | "Mais de 30 minutos" | "";
type CycleReuse = "Sim" | "Talvez" | "Não" | "";

type RecommendationValidation = {
  id: string;
  cycleId: string;
  recommendationId: string;
  theme: string;
  cycleContext: string;
  objective: string;
  editorialPriority: string;
  capacity: string;
  engineName: string;
  engineType: string;
  engineVersion: string;
  primaryRule: string;
  secondaryRules: string[];
  engineConfidenceScore: number;
  recommendedDecision: RecommendedAction;
  usefulness: ExpertUsefulness;
  reasons: string[];
  observation: string;
  expertDecision: ExpertDecision;
  laterOutcome: LaterOutcome | "";
  perceivedConfidence: PerceivedConfidence | "";
  userRole: string;
  shownAt: string | null;
  evaluatedAt: string;
  timeToDecisionMs: number | null;
};

type CycleFeedback = {
  sameDecisions: CycleSameDecision;
  timeSaved: CycleTimeSaved;
  wouldUseAgain: CycleReuse;
  comment: string;
  updatedAt: string | null;
};

type PersistedEditorialState = {
  version: 1 | 2;
  config: CycleConfig;
  generatedAt: string | null;
  statuses: Record<string, ActionStatus>;
  backlog: Recommendation[];
  backlogDates: Record<string, string>;
  createdBriefings: Briefing[];
  archivedReasons: Record<string, string>;
  validations?: Record<string, RecommendationValidation>;
  cycleFeedback?: CycleFeedback;
  savedAt: string | null;
};

const STORAGE_KEY = "instagram-editorial-cycle-v1";
const VALIDATION_REASONS = ["Tema incorreto", "Prioridade incorreta", "Contexto inadequado", "Evidência insuficiente", "Esforço muito alto", "Tema já explorado", "Não faz sentido neste momento", "Recomendação genérica demais", "Falta dado/comentário", "Outro"];
const EXPERT_DECISIONS: ExpertDecision[] = ["Criar briefing", "Adicionar ao backlog", "Explorar melhor", "Arquivar", "Apenas analisar", "Ainda não decidi"];
const LATER_OUTCOMES: Array<LaterOutcome | ""> = ["", "Produzi o conteúdo", "Ficou para depois", "Alterei o tema", "Não utilizei", "Em andamento", "Ainda não sei"];
const PERCEIVED_CONFIDENCE: Array<PerceivedConfidence | ""> = ["", "Baixa", "Média", "Alta"];
const EMPTY_CYCLE_FEEDBACK: CycleFeedback = { sameDecisions: "", timeSaved: "", wouldUseAgain: "", comment: "", updatedAt: null };

function cycleIdFrom(generatedAt: string | null, config: CycleConfig) {
  return `${generatedAt ?? "draft"}-${config.period}-${config.context || "sem-contexto"}`;
}

function statusDecision(status?: ActionStatus): ExpertDecision {
  if (status === "Briefing criado") return "Criar briefing";
  if (status === "No backlog") return "Adicionar ao backlog";
  if (status === "Arquivado") return "Arquivar";
  return "Ainda não decidi";
}

function decisionScore(validation: RecommendationValidation) {
  if (validation.usefulness === "Não") return 0;
  const byDecision: Record<ExpertDecision, number> = {
    "Criar briefing": 1,
    "Adicionar ao backlog": 0.7,
    "Explorar melhor": 0.5,
    "Arquivar": 0,
    "Apenas analisar": 0.2,
    "Ainda não decidi": 0,
  };
  const baseline = validation.usefulness === "Sim" ? 0.8 : validation.usefulness === "Parcialmente" ? 0.3 : 0;
  return Math.max(baseline, byDecision[validation.expertDecision]);
}

function confidenceScore(value: RecommendationValidation["perceivedConfidence"]) {
  if (value === "Alta") return 1;
  if (value === "Média") return 0.66;
  if (value === "Baixa") return 0.33;
  return 0;
}

function msToHuman(value: number | null) {
  if (!value) return "-";
  const minutes = Math.round(value / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}

function buildValidation(item: Recommendation, config: CycleConfig, generatedAt: string | null, status: ActionStatus | undefined, role: UserRole, usefulness: ExpertUsefulness, reasons: string[], observation: string, expertDecision: ExpertDecision, laterOutcome: LaterOutcome | "", perceivedConfidence: PerceivedConfidence | "") {
  const evaluatedAt = new Date().toISOString();
  const shownAt = generatedAt;
  return {
    id: `${cycleIdFrom(generatedAt, config)}-${item.id}`,
    cycleId: cycleIdFrom(generatedAt, config),
    recommendationId: item.id,
    theme: item.theme,
    cycleContext: config.context,
    objective: config.objective,
    editorialPriority: config.priority,
    capacity: config.capacity,
    engineName: EDITORIAL_ENGINE_NAME,
    engineType: EDITORIAL_ENGINE_TYPE,
    engineVersion: EDITORIAL_ENGINE_VERSION,
    primaryRule: item.rule,
    secondaryRules: item.rulesTriggered,
    engineConfidenceScore: item.confidenceScore,
    recommendedDecision: item.nextAction,
    usefulness,
    reasons,
    observation,
    expertDecision: expertDecision === "Ainda não decidi" ? statusDecision(status) : expertDecision,
    laterOutcome,
    perceivedConfidence,
    userRole: role || "desconhecido",
    shownAt,
    evaluatedAt,
    timeToDecisionMs: shownAt ? new Date(evaluatedAt).getTime() - new Date(shownAt).getTime() : null,
  } satisfies RecommendationValidation;
}

function summarizeValidation(analysis: Analysis, validations: Record<string, RecommendationValidation>, cycleFeedback: CycleFeedback) {
  const records = Object.values(validations);
  const generated = analysis.recommendations.length;
  const evaluated = records.length;
  const useful = records.filter((item) => item.usefulness === "Sim").length;
  const partial = records.filter((item) => item.usefulness === "Parcialmente").length;
  const notUseful = records.filter((item) => item.usefulness === "Não").length;
  const briefings = records.filter((item) => item.expertDecision === "Criar briefing").length;
  const backlog = records.filter((item) => item.expertDecision === "Adicionar ao backlog").length;
  const archived = records.filter((item) => item.expertDecision === "Arquivar").length;
  const undecided = Math.max(0, generated - records.filter((item) => item.expertDecision !== "Ainda não decidi").length);
  const confidenceValues = records.map((item) => confidenceScore(item.perceivedConfidence)).filter(Boolean);
  const iur = evaluated ? Math.round(average(records.map((item) => decisionScore(item))) * 100) : 0;
  const decisionRate = generated ? records.filter((item) => item.expertDecision !== "Ainda não decidi").length / generated : 0;
  const usefulnessRate = evaluated ? (useful + partial * 0.5) / evaluated : 0;
  const perceived = confidenceValues.length ? average(confidenceValues) : 0;
  const productConfidence = evaluated ? Math.round(average([usefulnessRate, perceived, decisionRate]) * 100) : 0;
  const timeValues = records.map((item) => item.timeToDecisionMs).filter((item): item is number => Boolean(item));
  return { records, generated, evaluated, useful, partial, notUseful, briefings, backlog, archived, undecided, iur, productConfidence, perceivedConfidence: confidenceValues.length ? Math.round(perceived * 100) : 0, averageTimeMs: timeValues.length ? Math.round(average(timeValues)) : null, cycleFeedback };
}

function ruleHealth(records: RecommendationValidation[]) {
  const grouped = new Map<string, RecommendationValidation[]>();
  records.forEach((item) => grouped.set(item.primaryRule, [...(grouped.get(item.primaryRule) ?? []), item]));
  return [...grouped.entries()].map(([rule, items]) => {
    const iur = Math.round(average(items.map((item) => decisionScore(item))) * 100);
    const accepted = items.filter((item) => item.usefulness === "Sim").length;
    const partial = items.filter((item) => item.usefulness === "Parcialmente").length;
    const rejected = items.filter((item) => item.usefulness === "Não").length;
    const status = items.length < 5 ? "Sem dados suficientes" : iur >= 75 && rejected <= partial ? "Saudável" : iur >= 50 ? "Atenção" : "Necessita revisão";
    return { rule, items, iur, accepted, partial, rejected, status, lastUsed: items.sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))[0]?.evaluatedAt ?? null };
  });
}

function reviewSuggestions(records: RecommendationValidation[]) {
  const suggestions: Array<{ area: string; reason: string; evidence: string; impact: string }> = [];
  const reasons = new Map<string, number>();
  records.flatMap((item) => item.reasons).forEach((reason) => reasons.set(reason, (reasons.get(reason) ?? 0) + 1));
  [...reasons.entries()].filter(([, count]) => count >= 2).forEach(([reason, count]) => suggestions.push({ area: reason.includes("Tema") ? "Classificação de tema" : reason.includes("Contexto") ? "Uso de contexto" : "Regra editorial", reason, evidence: `${count} ocorrência(s) em validações`, impact: "Pode reduzir avaliações parciais ou negativas." }));
  ruleHealth(records).filter((item) => item.status === "Atenção" || item.status === "Necessita revisão").forEach((item) => suggestions.push({ area: item.rule, reason: item.status, evidence: `IUR ${item.iur}% com ${item.items.length} avaliação(ões)`, impact: "Revisão manual sugerida antes de qualquer mudança no motor." }));
  return suggestions;
}

function dateTimeLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-";
}

function formatEngagementValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Indisponível";
  const percentage = Math.abs(value) <= 1 ? value * 100 : value;
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(percentage)}%`;
}

function recommendationSentence(item: Recommendation) {
  if (item.nextAction === "Criar Briefing") return `Transformar este tema em briefing se houver aderência ao objetivo do ciclo.`;
  if (item.nextAction === "Explorar Melhor") return "Validar se esse assunto merece virar conteúdo ou apenas ficar em observação.";
  if (item.nextAction === "Adicionar ao Backlog") return "Guardar este tema no backlog por enquanto, sem tratar como prioridade imediata.";
  return "Arquivar este tema neste ciclo, pois a evidência atual não sustenta uma ação editorial.";
}

function markdownExport(config: CycleConfig, analysis: Analysis, generatedAt: string | null, briefings: Briefing[], backlog: Recommendation[], statuses: Record<string, ActionStatus>, archivedReasons: Record<string, string>, validations: Record<string, RecommendationValidation>, cycleFeedback: CycleFeedback) {
  const range = periodRange(config);
  const lines = [
    "# Inteligência Editorial - Ciclo Editorial",
    "",
    "## Contexto do ciclo",
    "",
    `- Período: ${formatDate(range.start)} a ${formatDate(range.end)}`,
    `- Filtro: ${filterLabel(config.period)}`,
    `- Gerado em: ${dateTimeLabel(generatedAt)}`,
    `- Contexto: ${config.context}`,
    `- Objetivo: ${config.objective}`,
    `- Prioridade: ${config.priority}`,
    `- Capacidade: ${config.capacity} conteúdos`,
    `- Posts analisados: ${analysis.posts.length}`,
    `- Comentários válidos: ${analysis.comments.length}`,
    "- Coleta: Dados do Instagram",
    "- Análise: Editorial Intelligence Essentials",
    "",
    "## Resumo executivo",
    "",
    executiveSummary(analysis),
    "",
    "## Oportunidades do ciclo",
    "",
    ...analysis.opportunities.flatMap((item) => [
      `### ${item.theme}`,
      "",
      `- Sinal: ${item.signal}`,
      `- Regra: ${item.rule}`,
      `- Tipo: ${item.type}`,
      `- Potencial: ${item.potential}`,
      `- Confiança: ${item.confidence}`,
      `- Evidência: ${item.evidence}`,
      `- Posts relacionados: ${item.relatedPosts.length}`,
      "",
    ]),
    "## Recomendações",
    "",
    ...analysis.recommendations.flatMap((item, index) => [
      `### ${index + 1}. ${item.title}`,
      "",
      `- Tema: ${item.theme}`,
      `- Sinal: ${item.signal}`,
      `- Regra: ${item.rule}`,
      `- Confiança: ${item.confidenceScore}% - ${item.confidence}`,
      `- Por que recomendamos: ${item.reasons.join(" ")}`,
      `- Evidência: ${item.evidence}`,
      `- Próxima ação: ${item.nextAction}`,
      `- Status: ${statuses[item.id] ?? "Pendente"}`,
      "",
    ]),
    "## Temas em Observação",
    "",
    ...(analysis.observationBacklog.length ? analysis.observationBacklog.flatMap((item) => [`- ${item.theme}: ${item.evidence}`]) : ["Nenhum tema em observação."]),
    "",
    "## Briefings criados",
    "",
    ...(briefings.length ? briefings.flatMap((item) => [`### ${item.title}`, `- Tema: ${item.theme}`, `- Formato: ${item.format}`, `- Objetivo: ${item.objective}`, ""]) : ["Nenhum briefing criado.", ""]),
    "## Backlog Editorial",
    "",
    ...(backlog.length ? backlog.flatMap((item) => [`- ${item.theme}: ${item.title}`, `  - Motivo: ${item.evidence}`]) : ["Nenhum item no backlog."]),
    "",
    "## Arquivados",
    "",
    ...analysis.recommendations.filter((item) => statuses[item.id] === "Arquivado").flatMap((item) => [`- ${item.theme}: ${item.title}`, `  - Motivo: ${archivedReasons[item.id] || "Não informado"}`]),
    "",
    "## Lacunas de dados",
    "",
    ...analysis.gaps.flatMap((gap) => [`### ${gap.title}`, `- Impacto: ${gap.impact}`, `- O que fazer: ${gap.action}`, ""]),
    "## Validação da especialista",
    "",
    ...Object.values(validations).flatMap((item) => [`### ${item.theme}`, `- Motor: ${item.engineName} ${item.engineVersion}`, `- Avaliação: ${item.usefulness}`, `- Motivos: ${item.reasons.join(", ") || "Não informado"}`, `- Decisão: ${item.expertDecision}`, `- Resultado posterior: ${item.laterOutcome || "Não informado"}`, `- Confiança percebida: ${item.perceivedConfidence || "Não informada"}`, `- Observação: ${item.observation || "-"}`, ""]),
    "## Diário do Ciclo",
    "",
    `- Tomaria as mesmas decisões sem a ferramenta: ${cycleFeedback.sameDecisions || "Não informado"}`,
    `- Tempo economizado: ${cycleFeedback.timeSaved || "Não informado"}`,
    `- Usaria novamente: ${cycleFeedback.wouldUseAgain || "Não informado"}`,
    `- Comentário geral: ${cycleFeedback.comment || "-"}`,
  ];
  return lines.join("\n");
}

function downloadMarkdown(content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `inteligencia-editorial-${localDateKey()}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function EditorialIntelligence({ authorized, role, posts, interactions }: { authorized: boolean; role?: UserRole; posts: InstagramPostMetric[]; interactions: InstagramInteraction[] }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [config, setConfig] = useState(initialConfig);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [backlog, setBacklog] = useState<Recommendation[]>([]);
  const [backlogDates, setBacklogDates] = useState<Record<string, string>>({});
  const [createdBriefings, setCreatedBriefings] = useState<Briefing[]>([]);
  const [exploreTarget, setExploreTarget] = useState<Recommendation | null>(null);
  const [explainTarget, setExplainTarget] = useState<Recommendation | null>(null);
  const [postsTarget, setPostsTarget] = useState<Opportunity | null>(null);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Recommendation | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archivedReasons, setArchivedReasons] = useState<Record<string, string>>({});
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [validations, setValidations] = useState<Record<string, RecommendationValidation>>({});
  const [validationTarget, setValidationTarget] = useState<Recommendation | null>(null);
  const [validationDraft, setValidationDraft] = useState<{
    usefulness: ExpertUsefulness;
    reasons: string[];
    observation: string;
    expertDecision: ExpertDecision;
    laterOutcome: LaterOutcome | "";
    perceivedConfidence: PerceivedConfidence | "";
  }>({ usefulness: "Sim", reasons: [], observation: "", expertDecision: "Ainda não decidi", laterOutcome: "", perceivedConfidence: "" });
  const [cycleFeedback, setCycleFeedback] = useState<CycleFeedback>(EMPTY_CYCLE_FEEDBACK);
  const canValidate = role === "ADMIN";

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedEditorialState;
        if (saved.version === 1 && saved.generatedAt) {
          setConfig(saved.config);
          setAnalysis(RulesDecisionEngine.evaluate(posts, interactions, saved.config));
          setScreen("result");
          setGeneratedAt(saved.generatedAt);
          setStatuses(saved.statuses ?? {});
          setBacklog(saved.backlog ?? []);
          setBacklogDates(saved.backlogDates ?? {});
          setCreatedBriefings(saved.createdBriefings ?? []);
          setArchivedReasons(saved.archivedReasons ?? {});
          setValidations(saved.validations ?? {});
          setCycleFeedback(saved.cycleFeedback ?? EMPTY_CYCLE_FEEDBACK);
          setSavedAt(saved.savedAt ?? null);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [interactions, posts]);

  useEffect(() => {
    if (!hydrated || !generatedAt || !analysis) return;
    const state: PersistedEditorialState = { version: 2, config, generatedAt, statuses, backlog, backlogDates, createdBriefings, archivedReasons, validations, cycleFeedback, savedAt };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [analysis, archivedReasons, backlog, backlogDates, config, createdBriefings, cycleFeedback, generatedAt, hydrated, savedAt, statuses, validations]);

  if (!authorized) return <AccessDenied />;

  function update(key: keyof CycleConfig, value: string) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function generate() {
    const missing: string[] = [];
    if (!config.context) missing.push("Contexto");
    if (!config.objective) missing.push("Objetivo");
    if (!config.priority) missing.push("Prioridade");
    if (config.period === "custom") {
      if (!config.startDate || !config.endDate) missing.push("Datas do período personalizado");
      else if (config.startDate > config.endDate) missing.push("A data inicial não pode ser posterior à final");
      else if (config.endDate > localDateKey()) missing.push("A data final não pode estar no futuro");
    }
    setErrors(missing);
    if (missing.length) return;
    setAnalysis(RulesDecisionEngine.evaluate(posts, interactions, config));
    setGeneratedAt(new Date().toISOString());
    setSavedAt(null);
    setStatuses({});
    setBacklog([]);
    setBacklogDates({});
    setCreatedBriefings([]);
    setArchivedReasons({});
    setValidations({});
    setCycleFeedback(EMPTY_CYCLE_FEEDBACK);
    setScreen("result");
  }

  function syncValidationDecision(item: Recommendation, expertDecision: ExpertDecision) {
    setValidations((current) => {
      const existing = current[item.id];
      if (!existing) return current;
      return { ...current, [item.id]: { ...existing, expertDecision, evaluatedAt: new Date().toISOString() } };
    });
  }

  function openValidation(item: Recommendation, usefulness: ExpertUsefulness) {
    const existing = validations[item.id];
    setValidationTarget(item);
    setValidationDraft({
      usefulness,
      reasons: existing?.reasons ?? [],
      observation: existing?.observation ?? "",
      expertDecision: existing?.expertDecision ?? statusDecision(statuses[item.id]),
      laterOutcome: existing?.laterOutcome ?? "",
      perceivedConfidence: existing?.perceivedConfidence ?? "",
    });
  }

  function saveValidationFromDraft() {
    if (!validationTarget) return;
    if ((validationDraft.usefulness === "Parcialmente" || validationDraft.usefulness === "Não") && !validationDraft.reasons.length) {
      setNotice("Selecione pelo menos um motivo para avaliações parciais ou negativas.");
      return;
    }
    const record = buildValidation(validationTarget, config, generatedAt, statuses[validationTarget.id], role, validationDraft.usefulness, validationDraft.reasons, validationDraft.observation, validationDraft.expertDecision, validationDraft.laterOutcome, validationDraft.perceivedConfidence);
    setValidations((current) => ({ ...current, [validationTarget.id]: record }));
    setValidationTarget(null);
    setNotice("Validação registrada localmente para este ciclo.");
  }

  function quickValidate(item: Recommendation, usefulness: ExpertUsefulness) {
    if (usefulness !== "Sim") {
      openValidation(item, usefulness);
      return;
    }
    const record = buildValidation(item, config, generatedAt, statuses[item.id], role, usefulness, [], "", statusDecision(statuses[item.id]), "", "");
    setValidations((current) => ({ ...current, [item.id]: record }));
    setNotice("Validação registrada. Você pode editar os detalhes no card.");
  }

  function createBriefing(item: Recommendation) {
    const existing = analysis?.briefings.find((briefing) => briefing.origin === item.rule);
    const briefing = existing ?? {
      id: `created-${item.id}`,
      title: item.title,
      format: item.relatedPosts[0]?.tipo ?? "A definir",
      theme: item.theme,
      objective: item.hypothesis,
      evidence: item.evidence,
      restrictions: config.restrictions || "Não usar dados pessoais.",
      cta: "CTA a definir na revisão humana.",
      origin: item.rule,
      createdAt: new Date().toISOString(),
    };
    setCreatedBriefings((current) => current.some((entry) => entry.id === briefing.id) ? current : [...current, briefing]);
    setStatuses((current) => ({ ...current, [item.id]: "Briefing criado" }));
    syncValidationDecision(item, "Criar briefing");
  }

  function addBacklog(item: Recommendation) {
    setBacklog((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);
    setBacklogDates((current) => ({ ...current, [item.id]: current[item.id] ?? new Date().toISOString() }));
    setStatuses((current) => ({ ...current, [item.id]: "No backlog" }));
    syncValidationDecision(item, "Adicionar ao backlog");
  }

  function saveAnalysis() {
    setSavedAt(new Date().toISOString());
    setNotice("Análise salva neste navegador durante a fase Essentials.");
  }

  async function copySummary() {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(executiveSummary(analysis));
      setNotice("Resumo executivo copiado.");
    } catch {
      setNotice("Não foi possível copiar automaticamente. Use a exportação em Markdown.");
    }
  }

  function exportAnalysis() {
    if (!analysis) return;
    downloadMarkdown(markdownExport(config, analysis, generatedAt, createdBriefings, backlog, statuses, archivedReasons, validations, cycleFeedback));
    setNotice("Análise exportada em Markdown.");
  }

  function startNewCycle() {
    if (generatedAt && !window.confirm("Existe um ciclo editorial em andamento. Deseja iniciar um novo ciclo?")) return;
    setConfig(initialConfig);
    setAnalysis(null);
    setGeneratedAt(null);
    setSavedAt(null);
    setStatuses({});
    setBacklog([]);
    setBacklogDates({});
    setCreatedBriefings([]);
    setArchivedReasons({});
    setValidations({});
    setCycleFeedback(EMPTY_CYCLE_FEEDBACK);
    window.localStorage.removeItem(STORAGE_KEY);
    setScreen("form");
  }

  if (screen === "home") return <Home posts={posts} start={() => setScreen("form")} />;
  if (screen === "form") return <CycleForm config={config} update={update} errors={errors} cancel={() => setScreen("home")} generate={generate} />;
  if (!analysis) return null;

  const noMetrics = analysis.posts.length > 0 && !analysis.posts.some((post) => post.alcance !== null || post.salvos !== null || post.engajamento_score !== null);
  const archived = analysis.recommendations.filter((item) => statuses[item.id] === "Arquivado");

  return (
    <div className="space-y-5">
      <EditorialHeader />
      {notice ? <Notice message={notice} close={() => setNotice(null)} /> : null}
      <CycleHeader config={config} analysis={analysis} generatedAt={generatedAt} savedAt={savedAt} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal" onClick={() => setScreen("form")}><ArrowLeft className="h-4 w-4" />Revisar ciclo</button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={saveAnalysis}><Save className="h-4 w-4" />Salvar análise</Button>
          <Button variant="secondary" onClick={exportAnalysis}><Download className="h-4 w-4" />Exportar análise</Button>
          <Button variant="secondary" onClick={() => void copySummary()}><Clipboard className="h-4 w-4" />Copiar resumo</Button>
          <Button variant="secondary" onClick={() => setShowSourceInfo(true)}><Info className="h-4 w-4" />Como foi construída?</Button>
          <Button variant="secondary" onClick={startNewCycle}><Sparkles className="h-4 w-4" />Novo ciclo</Button>
        </div>
      </div>

      {!analysis.posts.length ? <StateAlert title="Não encontramos posts no período selecionado." description="Altere o período para gerar uma análise com dados reais." /> : null}
      {analysis.posts.length > 0 && analysis.posts.length < 3 ? <StateAlert title="Há poucos posts no período." description="A análise será limitada e os níveis de confiança foram reduzidos." /> : null}
      {noMetrics ? <StateAlert title="Encontramos posts, mas não métricas suficientes." description="Não foi possível gerar sinais confiáveis com as métricas disponíveis." /> : null}
      {!analysis.comments.length ? <StateAlert title="Comentários válidos não foram encontrados neste período." description={analysis.interactionsStatus.message} /> : null}

      {analysis.posts.length ? (
        <>
          <ResultSection title="Resumo para Juliana" icon={<BookOpenCheck className="h-5 w-5" />}>
            <p className="max-w-5xl text-base leading-7 text-brand-teal">{executiveSummary(analysis)}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <Metric label="Alcance total" value={compact(analysis.totalReach)} />
              <Metric label="Curtidas" value={compact(analysis.totalLikes)} />
              <Metric label="Salvamentos" value={compact(analysis.totalSaved)} />
              <Metric label="Compartilhamentos" value={compact(analysis.totalShares)} />
              <Metric label="Engajamento médio" value={formatEngagementValue(analysis.averageEngagement)} />
              <Metric label="Formato mais publicado" value={analysis.mostPublished?.type ?? "-"} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PostHighlight label="Maior alcance" post={analysis.topReach} metric={compact(analysis.topReach?.alcance ?? 0)} />
              <PostHighlight label="Mais salvamentos" post={analysis.topSaved} metric={compact(analysis.topSaved?.salvos ?? 0)} />
              <PostHighlight label="Mais comentários" post={analysis.topComments} metric={compact(analysis.topComments?.comentarios ?? 0)} />
            </div>
          </ResultSection>

          <ResultSection title="Oportunidades do Ciclo" icon={<Lightbulb className="h-5 w-5" />}>
            <p className="mb-4 text-sm text-brand-teal/65">Sobre o que vale falar agora?</p>
            {analysis.opportunities.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{analysis.opportunities.map((item) => <OpportunityCard key={item.id} item={item} onOpenPosts={() => setPostsTarget(item)} />)}</div> : <EmptyText>Nenhuma oportunidade atingiu os critérios mínimos neste período.</EmptyText>}
          </ResultSection>

          <PrioritizedThemes recommendations={analysis.recommendations} />
          {!noMetrics ? <RulesSignals analysis={analysis} /> : null}

          <ResultSection title="Recomendações Editoriais" icon={<Target className="h-5 w-5" />}>
            {analysis.recommendations.length ? <div className={analysis.recommendations.length >= 4 ? "flex snap-x gap-4 overflow-x-auto pb-3" : "grid gap-4 xl:grid-cols-3"}>{analysis.recommendations.map((item) => (
              <RecommendationCard
                key={item.id}
                carousel={analysis.recommendations.length >= 4}
                item={item}
                status={statuses[item.id]}
                validation={validations[item.id]}
                canValidate={canValidate}
                createBriefing={() => createBriefing(item)}
                addBacklog={() => addBacklog(item)}
                explain={() => setExplainTarget(item)}
                explore={() => setExploreTarget(item)}
                archive={() => { setArchiveTarget(item); setArchiveReason(""); }}
                quickValidate={(usefulness) => quickValidate(item, usefulness)}
                openValidation={(usefulness) => openValidation(item, usefulness)}
              />
            ))}</div> : <EmptyText>Nenhuma recomendação foi ativada pelas regras neste período.</EmptyText>}
          </ResultSection>

          <BriefingSection briefings={createdBriefings} />

          <ResultSection title="Backlog Editorial" icon={<Inbox className="h-5 w-5" />}>
            {backlog.length ? <div className="grid gap-3 md:grid-cols-2">{backlog.map((item) => <BacklogCard key={item.id} item={item} addedAt={backlogDates[item.id]} />)}</div> : <EmptyText>Nenhum item foi guardado para depois.</EmptyText>}
          </ResultSection>

          <ResultSection title="Temas em Observação" icon={<Inbox className="h-5 w-5" />}>
            {analysis.observationBacklog.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{analysis.observationBacklog.map((item) => <ObservationCard key={item.id} item={item} addBacklog={() => addBacklog(item)} explore={() => setExploreTarget(item)} />)}</div> : <EmptyText>Nenhum tema excedente ficou em observação para a capacidade definida.</EmptyText>}
          </ResultSection>

          {archived.length ? <ResultSection title="Arquivados" icon={<Archive className="h-5 w-5" />}><div className="grid gap-3 md:grid-cols-2">{archived.map((item) => <ArchivedCard key={item.id} item={item} reason={archivedReasons[item.id]} />)}</div></ResultSection> : null}

          <ResultSection title="Comentários textuais considerados" icon={<MessageSquareText className="h-5 w-5" />}>
            {analysis.sanitizedComments.length ? <div className="grid gap-3 md:grid-cols-2">{analysis.sanitizedComments.map((comment, index) => <div key={`${comment}-${index}`} className="rounded-md border border-brand-sand p-4 text-sm italic text-brand-teal">“{comment}”</div>)}</div> : <EmptyText>{analysis.interactionsStatus.message}</EmptyText>}
            <p className="mt-4 text-xs text-brand-teal/55">Nomes, usernames, contatos, links pessoais, DMs, Stories, seguidores e payload bruto não são exibidos nem salvos localmente.</p>
          </ResultSection>

          <ResultSection title="Lacunas de dados" icon={<AlertCircle className="h-5 w-5" />}>
            <div className="grid gap-3 md:grid-cols-2">{analysis.gaps.map((gap) => <GapCard key={gap.title} gap={gap} />)}</div>
          </ResultSection>

          <CycleDiary
            analysis={analysis}
            validations={validations}
            cycleFeedback={cycleFeedback}
            setCycleFeedback={setCycleFeedback}
            canValidate={canValidate}
          />

          <ValidationCenter analysis={analysis} validations={validations} cycleFeedback={cycleFeedback} />
        </>
      ) : null}

      {showSourceInfo ? <SourceInfoModal analysis={analysis} close={() => setShowSourceInfo(false)} /> : null}
      {postsTarget ? <RelatedPostsModal item={postsTarget} close={() => setPostsTarget(null)} /> : null}
      {explainTarget ? <ExplainRecommendationModal item={explainTarget} config={config} close={() => setExplainTarget(null)} /> : null}
      {exploreTarget ? <ExploreModal item={exploreTarget} comments={analysis.sanitizedComments} averages={{ reach: average(analysis.posts.map((post) => post.alcance ?? 0)), saved: average(analysis.posts.map((post) => post.salvos ?? 0)), comments: average(analysis.posts.map((post) => post.comentarios)) }} close={() => setExploreTarget(null)} createBriefing={() => { createBriefing(exploreTarget); setExploreTarget(null); }} addBacklog={() => { addBacklog(exploreTarget); setExploreTarget(null); }} archive={() => { setExploreTarget(null); setArchiveTarget(exploreTarget); }} /> : null}
      {archiveTarget ? <ArchiveModal reason={archiveReason} setReason={setArchiveReason} close={() => setArchiveTarget(null)} confirm={() => { setStatuses((current) => ({ ...current, [archiveTarget.id]: "Arquivado" })); setArchivedReasons((current) => ({ ...current, [archiveTarget.id]: archiveReason || "Não informado" })); setBacklog((current) => current.filter((item) => item.id !== archiveTarget.id)); syncValidationDecision(archiveTarget, "Arquivar"); setArchiveTarget(null); }} /> : null}
      {validationTarget ? <ValidationModal item={validationTarget} draft={validationDraft} setDraft={setValidationDraft} close={() => setValidationTarget(null)} save={saveValidationFromDraft} /> : null}
    </div>
  );
}

function Home({ posts, start }: { posts: InstagramPostMetric[]; start: () => void }) {
  return <div className="space-y-5"><EditorialHeader /><Card className="border-[#E9CBD1] p-6"><div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-center"><div><p className="text-xs font-black uppercase tracking-wide text-brand-clay">Ciclo Editorial</p><h2 className="mt-2 text-2xl font-semibold text-brand-teal">Direção editorial a partir dos dados já consolidados.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-brand-teal/70">Selecione o período e o contexto. A camada Editorial Intelligence Essentials cruza posts, métricas e comentários públicos por regras transparentes, sem IA.</p><Button className="mt-6" onClick={start}><Sparkles className="h-4 w-4" />Novo Ciclo Editorial</Button></div><div className="rounded-lg border border-brand-sand bg-brand-cream/60 p-5"><SourceBadges /><p className="mt-4 text-sm text-brand-teal/70"><strong>{posts.length}</strong> posts disponíveis na base para seleção por período.</p></div></div></Card></div>;
}

function CycleForm({ config, update, errors, cancel, generate }: { config: CycleConfig; update: (key: keyof CycleConfig, value: string) => void; errors: string[]; cancel: () => void; generate: () => void }) {
  return <div className="space-y-5"><EditorialHeader /><Card className="border-[#E9CBD1] p-5 sm:p-6"><button className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal" onClick={cancel}><ArrowLeft className="h-4 w-4" />Voltar</button><div className="grid gap-5 lg:grid-cols-2"><Field label="Período"><div className="flex flex-wrap gap-2">{periodOptions.map(([value,label]) => <button key={value} onClick={() => update("period", value)} className={`h-10 rounded-md border px-4 text-sm font-semibold ${config.period === value ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white/80 text-brand-teal"}`}>{label}</button>)}</div></Field>{config.period === "custom" ? <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2"><Field label="Data inicial" required><DateInput value={config.startDate} onChange={(value) => update("startDate", value)} /></Field><Field label="Data final" required><DateInput value={config.endDate} max={localDateKey()} onChange={(value) => update("endDate", value)} /></Field></div> : null}<Field label="Contexto do momento" required><Select value={config.context} onChange={(value) => update("context", value)} options={["","Nenhum contexto especial","Pré-lançamento","Lançamento","Pós-lançamento","Campanha Meta","Evento","Congresso","Semana especial","Agenda reduzida","Férias/agenda reduzida","Teste de posicionamento"]} /></Field><Field label="Objetivo da análise" required><Select value={config.objective} onChange={(value) => update("objective", value)} options={["","Fortalecer autoridade","Preparar lançamento","Aquecer Formação AASI Premium","Entender temas com maior resposta","Identificar dúvidas recorrentes","Encontrar oportunidades para Reels","Encontrar oportunidades para carrossel","Apoiar planejamento editorial","Planejamento de férias"]} /></Field><Field label="Prioridade editorial" required><Select value={config.priority} onChange={(value) => update("priority", value)} options={["","Autoridade","Educação","Venda","Relacionamento","Comunidade","Objeções","Prova social"]} /></Field><Field label="Capacidade de produção"><Select value={config.capacity} onChange={(value) => update("capacity", value)} options={["1","2","3","4","5","6"]} /></Field><div className="lg:col-span-2"><Field label="Restrições do ciclo"><textarea value={config.restrictions} onChange={(event) => update("restrictions", event.target.value)} placeholder="Ex: não vender diretamente, priorizar conteúdo educativo, não usar casos clínicos." className="min-h-28 w-full rounded-md border border-brand-sand bg-white/80 p-3 text-sm text-brand-teal outline-none focus:ring-2 focus:ring-brand-sky" /></Field></div></div><div className="mt-5 rounded-md border border-brand-sand bg-brand-cream/50 p-4 text-sm leading-6 text-brand-teal/75">A análise usa dados reais já existentes na plataforma e o Editorial Intelligence Essentials. Não cria conteúdo final, não publica e não envia nada ao marketing.</div>{errors.length ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">Revise: {errors.join("; ")}.</div> : null}<div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button onClick={generate}><Search className="h-4 w-4" />Gerar Análise Editorial</Button><Button variant="secondary" onClick={cancel}>Cancelar</Button></div></Card></div>;
}

function CycleHeader({ config, analysis, generatedAt, savedAt }: { config: CycleConfig; analysis: Analysis; generatedAt: string | null; savedAt: string | null }) {
  const range = periodRange(config);
  return <Card className="sticky top-3 z-20 border-[#E9CBD1] bg-white/95 p-5 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-brand-clay">Ciclo Editorial</p><h2 className="mt-1 text-xl font-semibold text-brand-teal">Qual direção editorial faz sentido agora?</h2></div><SourceBadges /></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><CycleItem label="Período" value={`${formatDate(range.start)} a ${formatDate(range.end)}`} /><CycleItem label="Filtro" value={filterLabel(config.period)} /><CycleItem label="Gerado em" value={dateTimeLabel(generatedAt)} /><CycleItem label="Contexto" value={config.context} /><CycleItem label="Objetivo" value={config.objective} /><CycleItem label="Prioridade" value={config.priority} /><CycleItem label="Capacidade" value={`${config.capacity} conteúdos`} /><CycleItem label="Posts analisados" value={String(analysis.posts.length)} /><CycleItem label="Comentários válidos" value={String(analysis.comments.length)} /></div><p className="mt-3 text-xs text-brand-teal/55">{savedAt ? `Análise salva neste navegador em ${dateTimeLabel(savedAt)}.` : "O ciclo é preservado localmente neste navegador durante a fase Essentials."}</p></Card>;
}

function RecommendationCard({ item, status, validation, canValidate, createBriefing, addBacklog, explain, explore, archive, quickValidate, openValidation, carousel }: { item: Recommendation; status?: ActionStatus; validation?: RecommendationValidation; canValidate: boolean; createBriefing: () => void; addBacklog: () => void; explain: () => void; explore: () => void; archive: () => void; quickValidate: (usefulness: ExpertUsefulness) => void; openValidation: (usefulness: ExpertUsefulness) => void; carousel?: boolean }) {
  const reasons = item.reasons.slice(0, 3);
  const actionText = recommendationSentence(item);
  return (
    <article className={`flex min-h-[30rem] flex-col rounded-md border border-brand-sand bg-white/90 p-4 shadow-sm ${carousel ? "min-w-[min(86vw,25rem)] snap-start" : ""}`}>
      <div className="flex items-start justify-between gap-3 border-b border-brand-sand/70 pb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-brand-clay">Tema editorial</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-brand-teal">{item.theme}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={status ?? "Pendente"} />
          <span className="rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-black uppercase text-brand-teal/75">{item.confidenceScore}% - {item.confidence}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col py-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-brand-clay">Decisão recomendada</p>
        <p className="mt-1 text-xl font-semibold text-brand-teal">{item.nextAction}</p>

        <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-brand-clay">Recomendação</p>
        <p className="mt-1 line-clamp-3 text-sm leading-6 text-brand-teal/75">{actionText}</p>

        <div className="mt-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-brand-clay">Por que recomendamos</p>
          <ul className="mt-2 space-y-2 text-sm leading-5 text-brand-teal/75">
            {reasons.map((reason) => <li key={reason} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span className="line-clamp-2">{reason}</span></li>)}
            {item.gaps.slice(0, 1).map((gap) => <li key={gap} className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span className="line-clamp-2">{gap}</span></li>)}
          </ul>
        </div>
      </div>

      <div className="mt-auto border-t border-brand-sand/70 pt-3">
        <dl className="grid grid-cols-2 gap-2 text-xs text-brand-teal/70">
          <div><dt className="font-black uppercase text-brand-clay">Prioridade</dt><dd className="mt-1 font-semibold text-brand-teal">{item.priority}</dd></div>
          <div><dt className="font-black uppercase text-brand-clay">Esforço</dt><dd className="mt-1 font-semibold text-brand-teal">{item.effort}</dd></div>
          <div><dt className="font-black uppercase text-brand-clay">Ação principal</dt><dd className="mt-1 font-semibold text-brand-teal">{item.nextAction}</dd></div>
          <div><dt className="font-black uppercase text-brand-clay">Ações secundárias</dt><dd className="mt-1 font-semibold text-brand-teal">Explorar / Backlog</dd></div>
        </dl>
        <ValidationPanel validation={validation} canValidate={canValidate} quickValidate={quickValidate} openValidation={openValidation} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ActionButton icon={<Info />} onClick={explain}>Como chegamos</ActionButton>
          <ActionButton icon={<Search />} onClick={explore}>Explorar Melhor</ActionButton>
          <ActionButton icon={<FilePenLine />} onClick={createBriefing}>Criar Briefing</ActionButton>
          <ActionButton icon={<ListPlus />} onClick={addBacklog}>Backlog</ActionButton>
          <ActionButton icon={<Archive />} onClick={archive}>Arquivar</ActionButton>
        </div>
      </div>
    </article>
  );
}


function ValidationPanel({ validation, canValidate, quickValidate, openValidation }: { validation?: RecommendationValidation; canValidate: boolean; quickValidate: (usefulness: ExpertUsefulness) => void; openValidation: (usefulness: ExpertUsefulness) => void }) {
  return <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/35 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-brand-clay">Validação da especialista</p>
      {validation ? <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black uppercase text-brand-teal">{validation.usefulness}</span> : <span className="text-xs text-brand-teal/55">Pendente</span>}
    </div>
    <p className="mt-2 text-xs leading-5 text-brand-teal/65">Esta recomendação foi útil para tomar uma decisão?</p>
    {validation ? <div className="mt-2 grid gap-1 text-xs text-brand-teal/70"><p><strong>Decisão:</strong> {validation.expertDecision}</p><p><strong>Confiança:</strong> {validation.perceivedConfidence || "Não informada"}</p>{validation.reasons.length ? <p><strong>Motivos:</strong> {validation.reasons.join(", ")}</p> : null}</div> : null}
    <div className="mt-3 flex flex-wrap gap-2">
      {(["Sim", "Parcialmente", "Não"] as ExpertUsefulness[]).map((option) => <button key={option} type="button" disabled={!canValidate} onClick={() => option === "Sim" ? quickValidate(option) : openValidation(option)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${validation?.usefulness === option ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"} ${canValidate ? "hover:bg-brand-cream" : "cursor-not-allowed opacity-60"}`}>{option}</button>)}
      <button type="button" disabled={!canValidate} onClick={() => openValidation(validation?.usefulness ?? "Sim")} className="rounded-full border border-brand-sand bg-white px-3 py-1.5 text-xs font-bold text-brand-clay disabled:cursor-not-allowed disabled:opacity-60">Detalhar</button>
    </div>
    {!canValidate ? <p className="mt-2 text-[11px] text-brand-teal/50">Perfil Suporte visualiza a validação, mas não edita.</p> : null}
  </div>;
}

function CycleDiary({ analysis, validations, cycleFeedback, setCycleFeedback, canValidate }: { analysis: Analysis; validations: Record<string, RecommendationValidation>; cycleFeedback: CycleFeedback; setCycleFeedback: (value: CycleFeedback) => void; canValidate: boolean }) {
  const summary = summarizeValidation(analysis, validations, cycleFeedback);
  function updateFeedback(key: keyof CycleFeedback, value: string) {
    if (!canValidate) return;
    setCycleFeedback({ ...cycleFeedback, [key]: value, updatedAt: new Date().toISOString() });
  }
  return <ResultSection title="Diário do Ciclo" icon={<Clipboard className="h-5 w-5" />}>
    <p className="mb-4 text-sm leading-6 text-brand-teal/70">Registro leve para validar se a ferramenta ajudou a decidir, priorizar e economizar tempo. Nesta Beta, tudo fica salvo localmente neste navegador.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <Metric label="Recomendações" value={String(summary.generated)} />
      <Metric label="Avaliadas" value={String(summary.evaluated)} />
      <Metric label="Úteis" value={String(summary.useful)} />
      <Metric label="Parciais" value={String(summary.partial)} />
      <Metric label="Não úteis" value={String(summary.notUseful)} />
      <Metric label="Tempo médio" value={msToHuman(summary.averageTimeMs)} />
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <Field label="Sem a ferramenta, tomaria as mesmas decisões?">
        <Select value={cycleFeedback.sameDecisions} onChange={(value) => updateFeedback("sameDecisions", value)} options={["", "Sim", "Parcialmente", "Não"]} />
      </Field>
      <Field label="Quanto tempo economizou neste ciclo?">
        <Select value={cycleFeedback.timeSaved} onChange={(value) => updateFeedback("timeSaved", value)} options={["", "Nenhum", "Até 10 minutos", "10 a 30 minutos", "Mais de 30 minutos"]} />
      </Field>
      <Field label="Usaria novamente no próximo ciclo?">
        <Select value={cycleFeedback.wouldUseAgain} onChange={(value) => updateFeedback("wouldUseAgain", value)} options={["", "Sim", "Talvez", "Não"]} />
      </Field>
      <label className="grid gap-2 text-sm font-semibold text-brand-teal lg:col-span-3">Comentário geral
        <textarea disabled={!canValidate} value={cycleFeedback.comment} onChange={(event) => updateFeedback("comment", event.target.value)} className="min-h-24 w-full rounded-md border border-brand-sand bg-white/80 p-3 text-sm text-brand-teal outline-none focus:ring-2 focus:ring-brand-sky disabled:opacity-70" placeholder="O que fez sentido, o que confundiu ou o que precisa ser revisto?" />
      </label>
    </div>
  </ResultSection>;
}

function ValidationCenter({ analysis, validations, cycleFeedback }: { analysis: Analysis; validations: Record<string, RecommendationValidation>; cycleFeedback: CycleFeedback }) {
  const summary = summarizeValidation(analysis, validations, cycleFeedback);
  const health = ruleHealth(summary.records);
  const suggestions = reviewSuggestions(summary.records);
  return <ResultSection title="Centro de Validação" icon={<FlaskConical className="h-5 w-5" />}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="IUR" value={`${summary.iur}%`} />
      <Metric label="Confiança de produto" value={`${summary.productConfidence}%`} />
      <Metric label="Briefings" value={String(summary.briefings)} />
      <Metric label="Sem decisão" value={String(summary.undecided)} />
    </div>
    <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/40 p-4 text-sm leading-6 text-brand-teal/75">
      <p><strong>Engine Insights Lite:</strong> {EDITORIAL_ENGINE_NAME} ({EDITORIAL_ENGINE_TYPE}) v{EDITORIAL_ENGINE_VERSION}.</p>
      <p>IUR mede utilidade percebida das recomendações já avaliadas. Confiança de produto combina utilidade, confiança percebida e taxa de decisão do ciclo.</p>
    </div>
    <div className="mt-5 overflow-x-auto rounded-md border border-brand-sand">
      <table className="min-w-full text-left text-sm text-brand-teal">
        <thead className="bg-[#F3DDE2] text-[11px] uppercase text-brand-clay"><tr><th className="px-3 py-2">Regra</th><th className="px-3 py-2">Uso</th><th className="px-3 py-2">IUR</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Última avaliação</th></tr></thead>
        <tbody>{health.length ? health.map((item) => <tr key={item.rule} className="border-t border-brand-sand"><td className="px-3 py-2 font-semibold">{item.rule}</td><td className="px-3 py-2">{item.items.length}</td><td className="px-3 py-2">{item.iur}%</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{dateTimeLabel(item.lastUsed)}</td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-brand-teal/60">Nenhuma regra validada ainda.</td></tr>}</tbody>
      </table>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {suggestions.length ? suggestions.map((item) => <article key={`${item.area}-${item.reason}`} className="rounded-md border border-brand-sand p-4"><p className="text-[11px] font-black uppercase text-brand-clay">Sugestão de revisão</p><h3 className="mt-1 font-semibold text-brand-teal">{item.area}</h3><p className="mt-2 text-sm text-brand-teal/70"><strong>Motivo:</strong> {item.reason}</p><p className="mt-1 text-sm text-brand-teal/70"><strong>Evidência:</strong> {item.evidence}</p><p className="mt-1 text-sm text-brand-teal/70"><strong>Impacto:</strong> {item.impact}</p></article>) : <EmptyText>As validações ainda não geraram sugestões de revisão. Isso é esperado no início da Beta.</EmptyText>}
    </div>
  </ResultSection>;
}

function ValidationModal({ item, draft, setDraft, close, save }: { item: Recommendation; draft: { usefulness: ExpertUsefulness; reasons: string[]; observation: string; expertDecision: ExpertDecision; laterOutcome: LaterOutcome | ""; perceivedConfidence: PerceivedConfidence | "" }; setDraft: (value: { usefulness: ExpertUsefulness; reasons: string[]; observation: string; expertDecision: ExpertDecision; laterOutcome: LaterOutcome | ""; perceivedConfidence: PerceivedConfidence | "" }) => void; close: () => void; save: () => void }) {
  function toggleReason(reason: string) {
    const reasons = draft.reasons.includes(reason) ? draft.reasons.filter((item) => item !== reason) : [...draft.reasons, reason];
    setDraft({ ...draft, reasons });
  }
  return <Modal title="Validar recomendação" close={close}>
    <div className="space-y-4 text-sm text-brand-teal/75">
      <div className="rounded-md border border-brand-sand bg-brand-cream/45 p-3"><p className="text-[11px] font-black uppercase text-brand-clay">Tema</p><h3 className="mt-1 font-semibold text-brand-teal">{item.theme}</h3><p className="mt-1">{item.title}</p></div>
      <Field label="Esta recomendação foi útil?">
        <Select value={draft.usefulness} onChange={(value) => setDraft({ ...draft, usefulness: value as ExpertUsefulness })} options={["Sim", "Parcialmente", "Não"]} />
      </Field>
      <div><p className="mb-2 font-semibold text-brand-teal">Motivos</p><div className="grid gap-2 sm:grid-cols-2">{VALIDATION_REASONS.map((reason) => <label key={reason} className="flex items-center gap-2 rounded-md border border-brand-sand bg-white/80 px-3 py-2 text-xs font-semibold text-brand-teal"><input type="checkbox" checked={draft.reasons.includes(reason)} onChange={() => toggleReason(reason)} />{reason}</label>)}</div></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Decisão tomada"><Select value={draft.expertDecision} onChange={(value) => setDraft({ ...draft, expertDecision: value as ExpertDecision })} options={EXPERT_DECISIONS} /></Field>
        <Field label="Resultado posterior"><Select value={draft.laterOutcome} onChange={(value) => setDraft({ ...draft, laterOutcome: value as LaterOutcome | "" })} options={LATER_OUTCOMES} /></Field>
        <Field label="Confiança percebida"><Select value={draft.perceivedConfidence} onChange={(value) => setDraft({ ...draft, perceivedConfidence: value as PerceivedConfidence | "" })} options={PERCEIVED_CONFIDENCE} /></Field>
      </div>
      <label className="grid gap-2 font-semibold text-brand-teal">Observação
        <textarea value={draft.observation} onChange={(event) => setDraft({ ...draft, observation: event.target.value })} className="min-h-24 rounded-md border border-brand-sand bg-white/80 p-3 text-sm outline-none focus:ring-2 focus:ring-brand-sky" placeholder="Explique o que ajudou ou o que não fez sentido." />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row"><Button onClick={save}>Salvar validação</Button><Button variant="secondary" onClick={close}>Cancelar</Button></div>
    </div>
  </Modal>;
}

function OpportunityCard({ item, onOpenPosts }: { item: Opportunity; onOpenPosts: () => void }) {
  return <article className="rounded-md border border-brand-sand p-4"><div className="flex flex-wrap items-start justify-between gap-2"><Badge>{item.type}</Badge><button type="button" onClick={onOpenPosts} className="text-xs font-semibold text-brand-clay underline-offset-4 hover:underline">{item.relatedPosts.length} post(s)</button></div><p className="mt-3 text-[11px] font-black uppercase text-brand-clay">Tema editorial</p><h3 className="mt-1 text-lg font-semibold text-brand-teal">{item.theme}</h3><div className="mt-3 grid gap-2 text-sm leading-6 text-brand-teal/70"><p><strong>Sinal:</strong> {item.signal}</p><p><strong>Regra:</strong> {item.rule}</p><p>{item.evidence}</p></div><div className="mt-3 flex flex-wrap gap-4 text-xs text-brand-teal/60"><span><strong>Potencial:</strong> {item.potential}</span><span><strong>Confiança:</strong> {item.confidence}</span></div><button type="button" onClick={onOpenPosts} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-clay hover:underline">Ver posts <ChevronRight className="h-3 w-3" /></button></article>;
}

function PrioritizedThemes({ recommendations }: { recommendations: Recommendation[] }) {
  return <ResultSection title="Temas Priorizados" icon={<Target className="h-5 w-5" />}>{recommendations.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{recommendations.map((item) => <article key={`theme-${item.id}`} className="rounded-md border border-brand-sand p-4"><p className="text-[11px] font-black uppercase text-brand-clay">Tema editorial</p><h3 className="mt-1 font-semibold text-brand-teal">{item.theme}</h3><div className="mt-3 space-y-1 text-sm text-brand-teal/70"><p><strong>Sinal:</strong> {item.signal}</p><p><strong>Aderência:</strong> {item.classification}</p><p><strong>Evidência:</strong> {item.evidence}</p><p><strong>Decisão sugerida:</strong> {item.action}</p></div></article>)}</div> : <EmptyText>Nenhum tema foi priorizado neste ciclo.</EmptyText>}</ResultSection>;
}

function RulesSignals({ analysis }: { analysis: Analysis }) {
  const signals = [
    analysis.bestReach ? [`Formato com maior alcance no período`, `${analysis.bestReach.type}: média de ${compact(analysis.bestReach.averageReach)} de alcance.`, "Distribuição"] : null,
    analysis.bestSaved ? [`Formato com maior potencial educativo`, `${analysis.bestSaved.type}: média de ${analysis.bestSaved.averageSaved.toFixed(1)} salvamentos.`, "Utilidade"] : null,
    analysis.topReach ? [`Post com distribuição acima da média`, `${postLabel(analysis.topReach)} alcançou ${compact(analysis.topReach.alcance ?? 0)}.`, "Oportunidade"] : null,
    analysis.topSaved ? [`Post com alta utilidade percebida`, `${postLabel(analysis.topSaved)} teve ${analysis.topSaved.salvos ?? 0} salvamentos.`, "Padrão"] : null,
    analysis.topComments ? [`Post com maior resposta pública`, `${postLabel(analysis.topComments)} recebeu ${analysis.topComments.comentarios} comentários.`, "Atenção"] : null,
  ].filter(Boolean) as string[][];
  return <ResultSection title="Sinais por regras" icon={<Lightbulb className="h-5 w-5" />}><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{signals.map(([title,evidence,type]) => <article key={title} className="rounded-md border border-brand-sand p-4"><Badge>{type}</Badge><h3 className="mt-3 font-semibold text-brand-teal">{title}</h3><p className="mt-2 text-sm leading-6 text-brand-teal/70">{evidence}</p></article>)}</div></ResultSection>;
}

function BriefingSection({ briefings }: { briefings: Briefing[] }) {
  return <ResultSection title="Briefings Criados e Propostos" icon={<FilePenLine className="h-5 w-5" />}><p className="mb-4 text-sm text-brand-teal/65">Direções de produção, sem legenda, slides ou roteiro final.</p>{briefings.length ? <div className="grid gap-4 lg:grid-cols-2">{briefings.map((item) => <article key={item.id} className="rounded-md border border-brand-sand p-4"><div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status="Briefing criado" /><span className="text-xs text-brand-teal/55">Criado em {dateTimeLabel(item.createdAt)}</span></div><p className="mt-3 text-[11px] font-black uppercase text-brand-clay">Tema</p><h3 className="mt-1 font-semibold text-brand-teal">{item.theme}</h3><div className="mt-3 space-y-2 text-sm leading-6 text-brand-teal/70"><p><strong>Título:</strong> {item.title}</p><p><strong>Formato sugerido:</strong> {item.format}</p><p><strong>Objetivo:</strong> {item.objective}</p><p><strong>Mensagem central:</strong> direção a validar na revisão humana.</p><p><strong>Evidência:</strong> {item.evidence}</p><p><strong>CTA sugerida:</strong> {item.cta}</p><p className="text-xs"><strong>Origem:</strong> {item.origin}</p></div></article>)}</div> : <EmptyText>Nenhum briefing foi criado neste ciclo.</EmptyText>}</ResultSection>;
}

function RelatedPostsModal({ item, close }: { item: Opportunity; close: () => void }) {
  return <Modal title={`Posts relacionados: ${item.theme}`} close={close}><div className="space-y-4"><div className="rounded-md border border-brand-sand bg-brand-cream/50 p-4 text-sm leading-6 text-brand-teal/75"><p><strong>Sinal:</strong> {item.signal}</p><p><strong>Regra:</strong> {item.rule}</p><p><strong>Motivo da oportunidade:</strong> {item.evidence}</p></div>{item.relatedPosts.length ? item.relatedPosts.map((post) => <article key={post.id} className="rounded-md border border-brand-sand p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase text-brand-clay">Publicação</p><h3 className="mt-1 font-semibold text-brand-teal">{postLabel(post)}</h3></div>{post.permalink ? <a href={post.permalink} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-clay hover:underline">Ver publicação</a> : null}</div><div className="mt-3 grid gap-2 text-sm text-brand-teal/70 sm:grid-cols-2"><p><strong>Data:</strong> {formatDate(post.data_postagem)}</p><p><strong>Formato:</strong> {post.tipo}</p><p><strong>Alcance:</strong> {compact(post.alcance ?? 0)}</p><p><strong>Curtidas:</strong> {compact(post.likes ?? 0)}</p><p><strong>Comentários:</strong> {compact(post.comentarios ?? 0)}</p><p><strong>Salvos:</strong> {compact(post.salvos ?? 0)}</p><p><strong>Compartilhamentos:</strong> {compact(post.compartilhamentos ?? 0)}</p><p><strong>Engajamento:</strong> {formatEngagementValue(post.engajamento_score)} {post.engajamento_classificacao ? `(${post.engajamento_classificacao})` : ""}</p></div><p className="mt-3 rounded-md bg-brand-cream/60 p-3 text-xs leading-5 text-brand-teal/65"><strong>Por que entrou:</strong> {item.postReasons[post.id] ?? item.evidence}</p></article>) : <EmptyText>Nenhum post relacionado para exibir.</EmptyText>}</div></Modal>;
}

function ExploreModal({ item, comments, averages, close, createBriefing, addBacklog, archive }: { item: Recommendation; comments: string[]; averages: { reach: number; saved: number; comments: number }; close: () => void; createBriefing: () => void; addBacklog: () => void; archive: () => void }) {
  const totals = item.relatedPosts.reduce((acc, post) => ({ reach: acc.reach + (post.alcance ?? 0), saved: acc.saved + (post.salvos ?? 0), comments: acc.comments + post.comentarios }), { reach: 0, saved: 0, comments: 0 });
  return <Modal title={`Explorar Tema: ${item.theme}`} close={close}><SourceBadges /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Posts relacionados" value={String(item.relatedPosts.length)} /><Metric label="Alcance" value={compact(totals.reach)} /><Metric label="Salvamentos" value={String(totals.saved)} /><Metric label="Comentários" value={String(totals.comments)} /></div><div className="mt-5 space-y-4 text-sm leading-6 text-brand-teal/70"><div><strong>Recomendação de origem:</strong> {item.title}</div><div><strong>Sinal:</strong> {item.signal}</div><div><strong>Regra:</strong> {item.rule}</div><div><strong>Comparativo do período:</strong> média de alcance {compact(averages.reach)}, {averages.saved.toFixed(1)} salvamentos e {averages.comments.toFixed(1)} comentários por post.</div><div><strong>Hipótese:</strong> {item.hypothesis}</div><div><strong>Comentários válidos anonimizados:</strong>{comments.length ? comments.slice(0,3).map((comment,index) => <p key={`${comment}-${index}`} className="mt-2 italic">“{comment}”</p>) : <p className="mt-1">Não disponíveis neste ciclo.</p>}</div><div className="rounded-md border border-brand-sand p-3">Esta versão usa Editorial Intelligence Essentials, com regras transparentes. Não usa IA nem chamadas externas.</div></div><div className="mt-5 grid gap-2 sm:grid-cols-3"><Button onClick={createBriefing}><FilePenLine className="h-4 w-4" />Criar briefing</Button><Button variant="secondary" onClick={addBacklog}><ListPlus className="h-4 w-4" />Backlog</Button><Button variant="secondary" onClick={archive}><Archive className="h-4 w-4" />Arquivar</Button></div></Modal>;
}

function SourceInfoModal({ analysis, close }: { analysis: Analysis; close: () => void }) {
  return <Modal title="Como esta análise foi construída?" close={close}><div className="grid gap-3 sm:grid-cols-2"><InfoBox title="Coleta" tone="green" body="Posts, métricas e comentários públicos reais já existentes no sistema." /><InfoBox title="Análise" tone="amber" body={`${EDITORIAL_ENGINE_NAME} (${EDITORIAL_ENGINE_TYPE}) v${EDITORIAL_ENGINE_VERSION}: motor de regras transparente, determinístico e sem IA.`} /></div><div className="mt-5 space-y-4 text-sm leading-6 text-brand-teal/75"><div><strong>Dados usados:</strong> {analysis.posts.length} posts, {analysis.comments.length} comentários válidos, alcance, salvamentos, compartilhamentos, comentários e formato.</div><div><strong>Interações:</strong> {analysis.interactionsStatus.message}</div><div><strong>Critério de segurança:</strong> usa somente comentários públicos de post, com origem confiável, texto não vazio e vínculo com publicação do período. Não usa DMs, Stories, seguidores, nomes, usernames ou payload bruto.</div><div><strong>Regras avaliadas:</strong> resposta pública acima da média, utilidade educativa por salvamentos, alcance acima da média, aderência ao contexto, objetivo, prioridade e capacidade de produção.</div><div><strong>Regras acionadas:</strong> {analysis.recommendations.flatMap((item) => item.rulesTriggered).join("; ") || "Nenhuma regra priorizada."}</div><div><strong>Limitações:</strong> não usa IA, não cria conteúdo final, não publica e não envia nada ao marketing.</div></div></Modal>;
}

function ExplainRecommendationModal({ item, config, close }: { item: Recommendation; config: CycleConfig; close: () => void }) {
  const penalties = [...item.rulesReduced, ...item.gaps];
  return <Modal title="Como chegamos nesta recomendação?" close={close}><div className="space-y-4 text-sm leading-6 text-brand-teal/75"><div><strong>Tema editorial:</strong> {item.theme}</div><div><strong>Sinal detectado:</strong> {item.signal}</div><div><strong>Motor:</strong> {EDITORIAL_ENGINE_NAME} ({EDITORIAL_ENGINE_TYPE}) v{EDITORIAL_ENGINE_VERSION}</div><div><strong>Regra acionada:</strong> {item.rule}</div><div><strong>Dados avaliados:</strong> {item.dataUsed.join(", ") || "Sem dados suficientes"}.</div><div><strong>Contexto:</strong> {config.context || "-"}</div><div><strong>Objetivo:</strong> {config.objective || "-"}</div><div><strong>Prioridade:</strong> {config.priority || "-"}</div><div><strong>Capacidade:</strong> {config.capacity} conteúdos.</div><div><strong>Score:</strong> {item.confidenceScore}% - confiança {item.confidence}.</div><div><strong>Decisão:</strong> {item.action}. Próximo passo: {item.nextAction}.</div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-950"><p className="text-[11px] font-black uppercase">Pontos positivos</p><ul className="mt-2 space-y-1">{item.confidenceReasons.map((reason) => <li key={reason}>OK {reason}</li>)}</ul></div><div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950"><p className="text-[11px] font-black uppercase">Penalidades e lacunas</p><ul className="mt-2 space-y-1">{penalties.length ? penalties.map((gap) => <li key={gap}>Atenção: {gap}</li>) : <li>Nenhum redutor relevante.</li>}</ul></div></div><div><strong>Validação necessária:</strong> {item.gaps.join("; ") || "Revisão humana de contexto e linguagem antes de transformar em briefing."}</div></div></Modal>;
}

function ObservationCard({ item, addBacklog, explore }: { item: Recommendation; addBacklog: () => void; explore: () => void }) {
  return <article className="rounded-md border border-brand-sand p-4"><Badge>Observação</Badge><p className="mt-3 text-[11px] font-black uppercase text-brand-clay">Tema editorial</p><h3 className="mt-1 font-semibold text-brand-teal">{item.theme}</h3><p className="mt-2 text-sm leading-6 text-brand-teal/70">{item.evidence}</p><dl className="mt-3 grid gap-2 text-xs text-brand-teal/60"><div><strong>Sinal:</strong> {item.signal}</div><div><strong>Regra:</strong> {item.rule}</div><div><strong>Confiança:</strong> {item.confidenceScore}% - {item.confidence}</div></dl><div className="mt-4 grid grid-cols-2 gap-2"><ActionButton icon={<Search />} onClick={explore}>Explorar</ActionButton><ActionButton icon={<ListPlus />} onClick={addBacklog}>Backlog</ActionButton></div></article>;
}

function BacklogCard({ item, addedAt }: { item: Recommendation; addedAt?: string }) { return <article className="rounded-md border border-brand-sand p-4"><div className="flex items-center justify-between gap-2"><StatusBadge status="No backlog" /><span className="text-xs text-brand-teal/55">Adicionado em {dateTimeLabel(addedAt ?? null)}</span></div><p className="mt-3 text-[11px] font-black uppercase text-brand-clay">Tema</p><h3 className="mt-1 font-semibold text-brand-teal">{item.theme}</h3><p className="mt-2 text-sm text-brand-teal/70">{item.title}</p><p className="mt-3 text-xs text-brand-teal/55"><strong>Motivo:</strong> {item.evidence}</p><p className="mt-1 text-xs text-brand-teal/45">Origem: {item.rule}</p></article>; }
function ArchivedCard({ item, reason }: { item: Recommendation; reason?: string }) { return <article className="rounded-md border border-brand-sand p-4"><Badge>Arquivado</Badge><h3 className="mt-2 font-semibold text-brand-teal">{item.theme}</h3><p className="mt-1 text-sm text-brand-teal/70">{item.title}</p><p className="mt-3 text-xs text-brand-teal/55"><strong>Motivo:</strong> {reason || "Não informado"}</p></article>; }
function GapCard({ gap }: { gap: Gap }) { return <article className="rounded-md border border-brand-sand p-4"><h3 className="font-semibold text-brand-teal">{gap.title}</h3><p className="mt-2 text-sm text-brand-teal/70"><strong>Impacto:</strong> {gap.impact}</p><p className="mt-2 text-sm text-brand-teal/70"><strong>O que fazer:</strong> {gap.action}</p></article>; }
function InfoCell({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-black uppercase text-brand-clay">{label}</p><p className="mt-1 font-semibold text-brand-teal">{value || "-"}</p></div>; }
function InfoBox({ title, body, tone }: { title: string; body: string; tone: "green" | "amber" }) { const classes = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"; return <div className={`rounded-md border p-4 ${classes}`}><p className="text-xs font-black uppercase">{title}</p><p className="mt-2 text-sm leading-6">{body}</p></div>; }
function ArchiveModal({ reason, setReason, close, confirm }: { reason: string; setReason: (value: string) => void; close: () => void; confirm: () => void }) { return <Modal title="Arquivar recomendação" close={close}><p className="text-sm text-brand-teal/70">O motivo é opcional e permanece apenas no estado local desta versão.</p><Select value={reason} onChange={setReason} options={["","Não faz sentido agora","Tema já trabalhado","Baixa prioridade","Falta evidência","Desalinhado com momento","Outro"]} /><Button className="mt-4 w-full" onClick={confirm}>Arquivar</Button></Modal>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-teal/55 p-4 sm:items-center" role="dialog" aria-modal="true"><Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-brand-sand p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-brand-teal">{title}</h2><button aria-label="Fechar" onClick={close}><X className="h-5 w-5 text-brand-teal" /></button></div>{children}</Card></div>; }
function EditorialHeader() { return <Card className="border-[#E9CBD1] p-5"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold text-brand-teal">Inteligência Editorial</h2><Badge>BETA • Editorial Intelligence Essentials</Badge></div><p className="mt-2 text-sm leading-6 text-brand-teal/70">Transforme dados recentes do Instagram em direção editorial para o próximo ciclo.</p><div className="mt-4 flex items-start gap-2 rounded-md border border-brand-sand bg-brand-cream/50 p-3 text-sm text-brand-teal/75"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-clay" /><span>Esta funcionalidade está em validação. As recomendações usam regras determinísticas, exigem revisão humana e nenhuma IA é chamada nesta versão.</span></div></Card>; }
function AccessDenied() { return <Card className="border-[#E9CBD1] p-6"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 text-brand-clay" /><div><h2 className="text-lg font-semibold text-brand-teal">Acesso restrito</h2><p className="mt-2 text-sm text-brand-teal/70">Esta funcionalidade está disponível apenas para perfis autorizados durante a fase Essentials.</p></div></div></Card>; }
function CycleItem({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-black uppercase text-brand-clay">{label}</p><p className="mt-1 text-sm font-semibold text-brand-teal">{value || "-"}</p></div>; }
function StatusBadge({ status }: { status: string }) { const className = status === "Briefing criado" ? "bg-emerald-100 text-emerald-800" : status === "No backlog" ? "bg-blue-100 text-blue-800" : status === "Arquivado" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${className}`}>{status}</span>; }
function Notice({ message, close }: { message: string; close: () => void }) { return <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><span>{message}</span><button aria-label="Fechar aviso" onClick={close}><X className="h-4 w-4" /></button></div>; }
function SourceBadges() { return <div className="flex flex-wrap gap-2"><span title="Posts, métricas e comentários reais já existentes no sistema." className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800"><Database className="h-3.5 w-3.5" />Coleta: Dados do Instagram</span><span title={`Motor determinístico, transparente e sem IA. ${EDITORIAL_ENGINE_TYPE} v${EDITORIAL_ENGINE_VERSION}.`} className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase text-amber-800"><FlaskConical className="h-3.5 w-3.5" />Análise: {EDITORIAL_ENGINE_NAME} v{EDITORIAL_ENGINE_VERSION}</span></div>; }
function Badge({ children }: { children: ReactNode }) { return <span className="inline-flex rounded-full bg-brand-clay/15 px-2.5 py-1 text-[11px] font-black uppercase text-brand-clay">{children}</span>; }
function ResultSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <Card className="border-[#E9CBD1] p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-brand-teal">{icon}<h2 className="text-lg font-semibold">{title}</h2></div><SourceBadges /></div>{children}</Card>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-brand-cream/55 p-3"><p className="text-[11px] font-black uppercase text-brand-clay">{label}</p><p className="mt-2 text-lg font-semibold text-brand-teal">{value}</p></div>; }
function PostHighlight({ label, post, metric }: { label: string; post?: InstagramPostMetric; metric: string }) { return <div className="rounded-md border border-brand-sand p-4"><p className="text-xs font-black uppercase text-brand-clay">{label}</p><p className="mt-2 font-semibold text-brand-teal">{metric}</p><p className="mt-1 text-sm text-brand-teal/65">{post ? postLabel(post) : "Sem dados"}</p>{post?.permalink ? <a href={post.permalink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-clay">Ver publicação <ChevronRight className="h-3 w-3" /></a> : null}</div>; }
function StateAlert({ title, description }: { title: string; description: string }) { return <Card className="border-amber-300 bg-amber-50/85 p-4"><div className="flex gap-3 text-amber-950"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm">{description}</p></div></div></Card>; }
function EmptyText({ children }: { children: ReactNode }) { return <p className="rounded-md border border-dashed border-brand-sand p-5 text-sm text-brand-teal/60">{children}</p>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <label className="grid gap-2 text-sm font-semibold text-brand-teal">{label}{required ? <span className="sr-only">obrigatório</span> : null}{children}</label>; }
function Select({ value, onChange, options }: { value?: string; onChange?: (value: string) => void; options: string[] }) { return <select value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className="h-11 w-full rounded-md border border-brand-sand bg-white/80 px-3 text-sm text-brand-teal outline-none focus:ring-2 focus:ring-brand-sky">{options.map((option) => <option key={option || "empty"} value={option}>{option || "Selecione"}</option>)}</select>; }
function DateInput({ value, max, onChange }: { value: string; max?: string; onChange: (value: string) => void }) { return <input type="date" value={value} max={max} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-md border border-brand-sand bg-white/80 px-3 text-sm text-brand-teal outline-none focus:ring-2 focus:ring-brand-sky" />; }
function ActionButton({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-brand-sand px-2 py-2 text-xs font-semibold text-brand-teal hover:bg-brand-cream">{icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}{children}</button>; }
