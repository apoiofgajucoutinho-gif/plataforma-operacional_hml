"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  Bot,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Compass,
  Copy,
  Eye,
  Flag,
  Home,
  Layers3,
  Pencil,
  Plus,
  Repeat,
  Sparkles,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StrategyPlanner } from "@/modules/norwyn/components/StrategyPlanner";
import { buildEvidenceEngine, evidenceRecommendationToBriefingSeed } from "@/modules/norwyn/services/evidence-engine";
import type { InstagramPostMetric } from "@/modules/instagram/types";
import type { NorwynContext, NorwynEvidenceRecommendation, NorwynLaunchPattern, NorwynSignal, NorwynSignalPriority, NorwynSignalProvider, NorwynSignalStatus } from "@/modules/norwyn/types";

type NorwynTab = "home" | "business" | "mission" | "intelligence" | "evidence" | "strategy" | "briefing" | "studio" | "shadow" | "knowledge" | "guide";
type MissionPriority = "Principal" | "Estrategica" | "Continua";
type MissionStatus = "Planejada" | "Ativa" | "Pausada" | "Encerrada" | "Arquivada";
type BusinessObjectiveHorizon = "Trimestral" | "Semestral" | "Anual" | "Continuo";
type BusinessObjectiveCategory = "Receita" | "Produto" | "Marketing" | "Comercial" | "Operacao" | "Autoridade" | "Educacao";
type BusinessObjectiveStatus = "Draft" | "Planejado" | "Ativo" | "Em risco" | "Concluido" | "Arquivado";
type BriefingType =
  | "Carrossel"
  | "Stories"
  | "Reels"
  | "Anuncio"
  | "Landing Page"
  | "E-mail"
  | "Mensagem de recuperacao"
  | "FAQ / Resposta publica"
  | "WhatsApp / Suporte"
  | "Checklist";
type BriefingStatus =
  | "rascunho"
  | "rascunho automatico"
  | "em revisao"
  | "aprovado"
  | "enviado ao marketing"
  | "produzido pela Norwyn"
  | "usado"
  | "nao usado"
  | "arquivado";
type DraftStatus = "rascunho" | "rascunho automatico" | "em revisao" | "aprovado" | "enviado" | "usado" | "nao usado" | "arquivado";
type ExecutionStatus = "executado" | "parcial" | "nao executado" | "ignorado";
type ExecutionResult = "positivo" | "neutro" | "negativo" | "inconclusivo";
type MissionType =
  | "Lancamento"
  | "Evergreen"
  | "Crescimento Instagram"
  | "Recuperacao Comercial"
  | "Retencao / Alunos"
  | "Organizacao Operacional"
  | "Autoridade"
  | "Campanha Ads"
  | "Produto";

type MissionChecklistItem = {
  id: string;
  text: string;
  status: "pendente" | "feito" | "ignorado" | "parcial";
};

type MissionLearning = {
  id: string;
  title: string;
  result: string;
};

type NorwynMission = {
  id: string;
  strategicObjectiveId?: string;
  name: string;
  type: MissionType;
  status: MissionStatus;
  startDate: string;
  endDate: string;
  priority: MissionPriority;
  objective: string;
  mainGoal: string;
  goalUnit: string;
  products: string;
  sources: string[];
  owner: string;
  notes: string;
  checklist: MissionChecklistItem[];
  learnings: MissionLearning[];
  createdAt: string;
};

type BriefingSeed = {
  title: string;
  type?: BriefingType;
  missionId?: string;
  recommendationOrigin?: string;
  objective: string;
  context: string;
  evidence: string[];
  product?: string;
  objection?: string;
  centralMessage?: string;
  cta?: string;
  priority?: string;
  confidence?: number;
  sourceModule?: string;
  rule?: string;
  engineKey?: string;
};

type NorwynBriefing = {
  id: string;
  title: string;
  type: BriefingType;
  missionId: string;
  recommendationOrigin: string;
  objective: string;
  audience: string;
  context: string;
  evidence: string[];
  product: string;
  objection: string;
  centralMessage: string;
  cta: string;
  tone: string;
  format: string;
  restrictions: string;
  priority: string;
  confidence: number;
  status: BriefingStatus;
  sourceModule: string;
  analyzedPeriod: string;
  rule: string;
  execution: ExecutionStatus;
  result: ExecutionResult;
  comment: string;
  learning: string;
  engineKey?: string;
  generatedBy?: "manual" | "mission-engine-v0";
  createdAt: string;
  updatedAt: string;
};

type NorwynDraft = {
  id: string;
  briefingId: string;
  title: string;
  type: BriefingType;
  missionId: string;
  status: DraftStatus;
  owner: string;
  generationMode: "template" | "ia" | "manual";
  content: string[];
  execution: ExecutionStatus;
  result: ExecutionResult;
  comment: string;
  learning: string;
  engineKey?: string;
  generatedBy?: "template" | "mission-engine-v0" | "manual";
  createdAt: string;
  updatedAt: string;
};

type ShadowAction = {
  id: string;
  date: string;
  type: string;
  channel: string;
  theme: string;
  product: string;
  perceivedObjective: string;
  cta: string;
  link: string;
  missionId: string;
  status: string;
  relatedBriefingId: string;
  relatedDraftId: string;
  reach: string;
  comments: string;
  saves: string;
  shares: string;
  clicks: string;
  relatedSales: string;
  notes: string;
  manualRating: string;
  origin: "Marketing" | "Norwyn" | "Juliana" | "Suporte" | "Outro";
  postId: string;
  execution: ExecutionStatus;
  result: ExecutionResult;
  learning: string;
  createdAt: string;
};

type KnowledgeEvent = {
  id: string;
  type: "mission_engine_run" | "briefing_saved" | "draft_generated" | "shadow_action" | "learning";
  title: string;
  status: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
};

type BusinessObjective = {
  id: string;
  name: string;
  description: string;
  horizon: BusinessObjectiveHorizon;
  category: BusinessObjectiveCategory;
  priority: MissionPriority;
  status: BusinessObjectiveStatus;
  startDate: string;
  endDate: string;
  kpis: string[];
  target: string;
  progress: number;
  owner: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const MISSIONS_KEY = "norwyn-mission-os-missions-v1";
const ACTIVE_MISSION_KEY = "norwyn-mission-os-active-v1";
const BUSINESS_OBJECTIVES_KEY = "norwyn-business-strategy-objectives-v1";
const BRIEFINGS_KEY = "norwyn-execution-briefings-v1";
const DRAFTS_KEY = "norwyn-execution-drafts-v1";
const SHADOW_KEY = "norwyn-execution-shadow-v1";
const KNOWLEDGE_KEY = "norwyn-knowledge-events-v1";

const missionTypes: MissionType[] = [
  "Lancamento",
  "Evergreen",
  "Crescimento Instagram",
  "Recuperacao Comercial",
  "Retencao / Alunos",
  "Organizacao Operacional",
  "Autoridade",
  "Campanha Ads",
  "Produto",
];

const missionStatuses: MissionStatus[] = ["Planejada", "Ativa", "Pausada", "Encerrada", "Arquivada"];
const missionPriorities: MissionPriority[] = ["Principal", "Estrategica", "Continua"];
const briefingTypes: BriefingType[] = [
  "Carrossel",
  "Stories",
  "Reels",
  "Anuncio",
  "Landing Page",
  "E-mail",
  "Mensagem de recuperacao",
  "FAQ / Resposta publica",
  "WhatsApp / Suporte",
  "Checklist",
];
const briefingStatuses: BriefingStatus[] = [
  "rascunho",
  "rascunho automatico",
  "em revisao",
  "aprovado",
  "enviado ao marketing",
  "produzido pela Norwyn",
  "usado",
  "nao usado",
  "arquivado",
];
const draftStatuses: DraftStatus[] = ["rascunho", "rascunho automatico", "em revisao", "aprovado", "enviado", "usado", "nao usado", "arquivado"];
const executionStatuses: ExecutionStatus[] = ["executado", "parcial", "nao executado", "ignorado"];
const executionResults: ExecutionResult[] = ["positivo", "neutro", "negativo", "inconclusivo"];
const sourceOptions = ["Instagram", "Ads", "Comercial", "Agenda", "Objetivos", "Ocorrencias", "Atividades", "Financeiro"];
const businessHorizons: BusinessObjectiveHorizon[] = ["Trimestral", "Semestral", "Anual", "Continuo"];
const businessCategories: BusinessObjectiveCategory[] = ["Receita", "Produto", "Marketing", "Comercial", "Operacao", "Autoridade", "Educacao"];
const businessStatuses: BusinessObjectiveStatus[] = ["Draft", "Planejado", "Ativo", "Em risco", "Concluido", "Arquivado"];
const signalProviders: NorwynSignalProvider[] = ["manual", "calendar", "instagram", "hotmart", "ads", "shadow", "news", "google_trends", "youtube", "tiktok", "system"];
const signalCategories = ["calendar", "trend", "event", "opportunity", "alert", "market", "platform_update", "commercial", "editorial", "audience", "product", "ads", "learning"];
const signalSubcategories = [
  "national_event",
  "commercial_date",
  "health_date",
  "education_event",
  "market_event",
  "platform_event",
  "product_event",
  "seasonal_campaign",
  "sports_event",
  "institutional_date",
];
const signalStatuses: NorwynSignalStatus[] = ["draft", "active", "upcoming", "expired", "ignored", "used", "archived"];
const signalPriorities: NorwynSignalPriority[] = ["low", "medium", "high", "critical"];

function formatUpdatedAt(value: string | null) {
  if (!value) return "Base ainda sem atualizacao consolidada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Base ainda sem atualizacao consolidada";
  return `Base atualizada em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatSignalDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function calculateSignalScore(signal: Pick<NorwynSignal, "impact_score" | "compatibility_score" | "urgency_score" | "confidence_score">) {
  return Math.round(signal.impact_score * 0.3 + signal.compatibility_score * 0.3 + signal.urgency_score * 0.25 + signal.confidence_score * 0.15);
}

function emptySignal(seed?: Partial<NorwynSignal>): NorwynSignal {
  const now = new Date().toISOString();
  return {
    id: makeId("signal"),
    tenant_id: "",
    provider: "manual",
    category: "opportunity",
    subcategory: null,
    title: "",
    description: "",
    starts_at: null,
    ends_at: null,
    priority: "medium",
    impact_score: 50,
    compatibility_score: 50,
    urgency_score: 50,
    confidence_score: 50,
    final_score: 50,
    status: "active",
    suggested_angle: "",
    suggested_action: "",
    recommended_tone: "",
    avoid_tone: "",
    mission_tags: [],
    product_tags: [],
    audience_tags: [],
    content_format_suggestions: [],
    source_name: "",
    source_url: "",
    metadata: {},
    created_by: null,
    created_at: now,
    updated_at: now,
    ...seed,
  };
}

function arrayToInput(value: string[] | null | undefined) {
  return (value ?? []).join(", ");
}

function inputToArray(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inLastDays(value: string | null | undefined, days: number) {
  const parsed = parseDate(value);
  if (!parsed) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return parsed >= start;
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function futureInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeId(prefix = "mission") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultBusinessObjectives(): BusinessObjective[] {
  const now = new Date().toISOString();
  return [
    {
      id: "bo-aasi-premium-principal-2026",
      name: "Transformar a Formacao AASI Premium no principal produto da empresa",
      description: "Elevar a Formacao AASI Premium ao papel de produto central da estrategia comercial e editorial.",
      horizon: "Semestral",
      category: "Receita",
      priority: "Principal",
      status: "Ativo",
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      kpis: ["Receita anual", "Participacao por produto", "Vendas confirmadas", "Conversao comercial"],
      target: "70% da receita anual",
      progress: 35,
      owner: "Juliana",
      notes: "Objetivo estrategico cadastrado para orientar missoes, conteudos, lancamento e leitura comercial no 2o semestre de 2026.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "bo-ajustes-finos-funil-perpetuo-2026",
      name: "Construir funil perpetuo para Ajustes Finos",
      description: "Criar uma rotina de aquisicao, nutricao e venda recorrente para Ajustes Finos.",
      horizon: "Anual",
      category: "Comercial",
      priority: "Estrategica",
      status: "Planejado",
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      kpis: ["Vendas mensais", "Leads", "CPL", "Taxa de conversao"],
      target: "40 vendas/mes ate 31/12/2026",
      progress: 15,
      owner: "Juliana",
      notes: "Deve orientar missoes de funil, Ads, interacoes e recuperacao comercial.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "bo-produto-intermediario-q4-2026",
      name: "Criar produto intermediario de R$ 1.000",
      description: "Desenhar e validar um produto intermediario para preencher o espaco entre entrada, cursos e ofertas premium.",
      horizon: "Trimestral",
      category: "Produto",
      priority: "Estrategica",
      status: "Planejado",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      kpis: ["Produto estruturado", "Oferta validada", "Primeiras vendas", "Sinais de audiencia"],
      target: "Produto intermediario validado no Q4 2026",
      progress: 5,
      owner: "Juliana",
      notes: "Objetivo de descoberta e validacao. Nao deve competir com a estrategia principal sem evidencias.",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function ensureDefaultBusinessObjectives(stored: BusinessObjective[]) {
  const defaults = defaultBusinessObjectives();
  const ids = new Set(stored.map((item) => item.id));
  return [...stored, ...defaults.filter((item) => !ids.has(item.id))];
}

function firstNumber(value: string | null | undefined) {
  const match = String(value ?? "").replace(/\./g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function daysUntil(value: string) {
  const end = parseDate(value);
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
}

function emptyMission(seed?: Partial<NorwynMission>): NorwynMission {
  return {
    id: makeId(),
    strategicObjectiveId: "",
    name: "",
    type: "Lancamento",
    status: "Planejada",
    startDate: todayInput(),
    endDate: futureInput(10),
    priority: "Continua",
    objective: "",
    mainGoal: "",
    goalUnit: "vendas",
    products: "",
    sources: ["Comercial", "Instagram"],
    owner: "",
    notes: "",
    checklist: [
      { id: makeId("check"), text: "Validar evidencias da missao", status: "pendente" },
      { id: makeId("check"), text: "Definir proxima acao operacional", status: "pendente" },
    ],
    learnings: [],
    createdAt: new Date().toISOString(),
    ...seed,
  };
}

function emptyBriefing(seed?: BriefingSeed | Partial<NorwynBriefing>): NorwynBriefing {
  const now = new Date().toISOString();
  const sourceSeed = seed as BriefingSeed | undefined;
  return {
    id: makeId("briefing"),
    title: sourceSeed?.title ?? "",
    type: sourceSeed?.type ?? "Carrossel",
    missionId: sourceSeed?.missionId ?? "",
    recommendationOrigin: sourceSeed?.recommendationOrigin ?? "",
    objective: sourceSeed?.objective ?? "",
    audience: "Especialistas, alunas e potenciais compradores com duvidas ativas.",
    context: sourceSeed?.context ?? "",
    evidence: sourceSeed?.evidence ?? [],
    product: sourceSeed?.product ?? "",
    objection: sourceSeed?.objection ?? "",
    centralMessage: sourceSeed?.centralMessage ?? "",
    cta: sourceSeed?.cta ?? "Responder, comentar ou acessar o link indicado.",
    tone: "Autoridade acolhedora, claro e sem promessa exagerada.",
    format: "Texto orientador para producao.",
    restrictions: "Nao publicar automaticamente. Validar dados sensiveis antes de enviar ao marketing.",
    priority: sourceSeed?.priority ?? "Media",
    confidence: sourceSeed?.confidence ?? 60,
    status: "rascunho",
    sourceModule: sourceSeed?.sourceModule ?? "Norwyn Strategy",
    analyzedPeriod: "ultimos 30 dias",
    rule: sourceSeed?.rule ?? "template deterministico sem IA",
    execution: "nao executado",
    result: "inconclusivo",
    comment: "",
    learning: "",
    createdAt: now,
    updatedAt: now,
    ...(seed as Partial<NorwynBriefing>),
  };
}

function emptyShadowAction(seed?: Partial<ShadowAction>): ShadowAction {
  return {
    id: makeId("shadow"),
    date: todayInput(),
    type: "carrossel publicado",
    channel: "Instagram",
    theme: "",
    product: "",
    perceivedObjective: "",
    cta: "",
    link: "",
    missionId: "",
    status: "registrado",
    origin: "Marketing",
    postId: "",
    relatedBriefingId: "",
    relatedDraftId: "",
    reach: "",
    comments: "",
    saves: "",
    shares: "",
    clicks: "",
    relatedSales: "",
    notes: "",
    manualRating: "",
    execution: "executado",
    result: "inconclusivo",
    learning: "",
    createdAt: new Date().toISOString(),
    ...seed,
  };
}

function buildDraftFromBriefing(briefing: NorwynBriefing): NorwynDraft {
  const now = new Date().toISOString();
  const product = briefing.product || "a formacao";
  const objection = briefing.objection || "a principal duvida antes da decisao";
  const message = briefing.centralMessage || briefing.context || `Existe uma oportunidade de orientar melhor sobre ${product}.`;
  const cta = briefing.cta || "me conte nos comentarios qual e sua maior duvida.";
  const audience = briefing.audience || "especialistas, alunas e potenciais compradoras";
  const common = [
    `Origem: briefing "${briefing.title}".`,
    `Publico: ${audience}.`,
    `Objetivo: ${briefing.objective || "orientar uma acao clara."}`,
    `Mensagem central: ${message}`,
    `CTA sugerido: ${cta}`,
    `Observacao: rascunho gerado por template deterministico, sem publicacao automatica.`,
  ];
  const templates: Record<BriefingType, string[]> = {
    Carrossel: [
      `Titulo do carrossel: ${briefing.title}`,
      `Promessa operacional: responder "${objection}" para ${audience}.`,
      `Legenda pronta: ${message} Salve para revisar e ${cta}`,
      `Promessa: responder ${briefing.objection || "a principal duvida identificada"} de forma objetiva.`,
      "Slide 1: gancho com a duvida principal.",
      "Slide 2: explicar o contexto com linguagem simples.",
      "Slide 3: mostrar criterio ou exemplo pratico.",
      "Slide 4: remover objeção sem pressão de venda.",
      "Slide 5: CTA para comentar ou enviar direct.",
      "Legenda: resumir a promessa e convidar para conversa.",
      ...common,
    ],
    Stories: [
      `Story 1: enquete - "${objection}" e uma duvida sua hoje?`,
      `Story 2: resposta curta - ${message}`,
      `Story 3: caixa de perguntas - qual ponto sobre ${product} ainda nao ficou claro?`,
      `Story 4: CTA - ${cta}`,
      "Story 1: pergunta direta sobre a duvida detectada.",
      "Story 2: resposta curta com exemplo.",
      "Story 3: caixa de perguntas para coletar novas objecoes.",
      "Story 4: CTA para link, direct ou proximo conteudo.",
      ...common,
    ],
    Reels: [
      `Roteiro pronto: "Se voce ainda tem duvida sobre ${objection}, veja isso antes de decidir."`,
      `Corpo: ${message}`,
      `Fechamento: ${cta}`,
      `Gancho: ${briefing.objection || briefing.title}`,
      "Cena 1: apresentar a duvida em linguagem cotidiana.",
      "Cena 2: explicar o ponto tecnico com clareza.",
      "Cena 3: mostrar o proximo passo recomendado.",
      "Legenda: reforcar a mensagem central e CTA.",
      ...common,
    ],
    Anuncio: [
      `Headline alternativa: ${message}`,
      `Texto principal: Se ${objection} esta impedindo seu proximo passo, este conteudo foi pensado para orientar sua decisao com clareza.`,
      `CTA revisado: ${cta}`,
      `Headline: ${briefing.centralMessage || briefing.title}`,
      `Primary text: ${briefing.context || briefing.objective}`,
      "Descricao: destacar beneficio e reduzir friccao.",
      `CTA: ${briefing.cta}`,
      "Angulo criativo: autoridade + resolucao de duvida concreta.",
      ...common,
    ],
    "Landing Page": [
      `Hero: ${message}`,
      `Subheadline: Uma orientacao direta para quem quer entender ${product} antes de tomar a proxima decisao.`,
      `FAQ principal: ${objection}`,
      `Headline: ${briefing.centralMessage || briefing.title}`,
      "Subheadline: conectar promessa, publico e produto.",
      "Secao 1: problema e contexto.",
      "Secao 2: proposta de valor.",
      "Secao 3: evidencias e FAQ.",
      `CTA principal: ${briefing.cta}`,
      ...common,
    ],
    "E-mail": [
      `Assunto: ${briefing.title}`,
      `Abertura: tenho visto esta duvida aparecer com frequencia: ${objection}.`,
      `Corpo: ${message}`,
      `Fechamento pratico: ${cta}`,
      "Abertura: reconhecer contexto da audiencia.",
      "Corpo: explicar evidencia e proposta.",
      `Fechamento: ${briefing.cta}`,
      ...common,
    ],
    "Mensagem de recuperacao": [
      `Texto pronto: vi que voce demonstrou interesse em ${product} e talvez tenha ficado alguma duvida.`,
      `Resposta curta: sobre "${objection}", o ponto principal e: ${message}`,
      `Fechamento: ${cta}`,
      "Texto curto: vi que voce demonstrou interesse e talvez tenha ficado alguma duvida.",
      `Variacao 1: ${briefing.objection || "posso te ajudar com uma orientacao rapida?"}`,
      `Variacao 2: ${briefing.centralMessage || "o proximo passo pode ser mais simples do que parece."}`,
      ...common,
    ],
    "FAQ / Resposta publica": [
      `Pergunta publica: ${objection}`,
      `Resposta pronta: ${message}`,
      `Complemento: para ${product}, a resposta pode variar conforme contexto, prazo e objetivo da pessoa.`,
      `Pergunta: ${briefing.objection || briefing.title}`,
      "Resposta curta: explicar sem jargao.",
      "Complemento: indicar contexto e limite da resposta.",
      `CTA: ${briefing.cta}`,
      ...common,
    ],
    "WhatsApp / Suporte": [
      `Mensagem pronta: oi, vi sua duvida sobre ${product}. Posso te ajudar.`,
      `Orientacao: sobre "${objection}", o ponto principal e: ${message}`,
      `Proximo passo: ${cta}`,
      "Mensagem inicial: acolher e confirmar a duvida.",
      "Resposta objetiva: orientar com link, prazo ou proximo passo.",
      "Fechamento: deixar canal aberto para retorno.",
      ...common,
    ],
    Checklist: [
      `Checklist: ${briefing.title}`,
      "1. Conferir evidencia usada na recomendacao.",
      "2. Validar produto, link, promessa e CTA.",
      "3. Definir responsavel pela execucao.",
      "4. Registrar se foi usado, parcial ou descartado.",
      "5. Voltar no Learning com resultado observado.",
      ...common,
    ],
  };
  return {
    id: makeId("draft"),
    briefingId: briefing.id,
    title: `Rascunho - ${briefing.title}`,
    type: briefing.type,
    missionId: briefing.missionId,
    status: "rascunho",
    owner: "Norwyn Studio",
    generationMode: "template",
    content: templates[briefing.type],
    execution: "nao executado",
    result: "inconclusivo",
    comment: "",
    learning: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeKey(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const productAliases = [
  { label: "Formacao AASI", keys: ["formacao-aasi", "formacao-em-aasi", "aasi", "perda-em-rampa"] },
  { label: "Mentoria AASI", keys: ["mentoria-formacao-aasi-premium", "mentoria-aasi", "premium"] },
  { label: "Ajustes Finos", keys: ["ajustes-finos"] },
  { label: "Imersao Zumbido", keys: ["imersao-zumbido", "zumbido"] },
];

function friendlyProductName(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  const key = normalizeKey(raw);
  if (!key) return "";
  if (key.includes("zumbido")) return "Imersao Zumbido";
  if (key.includes("mentoria") && key.includes("aasi")) return "Mentoria AASI";
  if (key.includes("ajustes-finos")) return "Ajustes Finos";
  const alias = productAliases.find((item) => item.keys.some((aliasKey) => key.includes(aliasKey)));
  return alias?.label ?? raw.replace(/\s+/g, " ").slice(0, 56);
}

function productMatchesAlias(value: string | null | undefined, alias: string) {
  if (alias === "all") return true;
  const valueKey = normalizeKey(value);
  const aliasKey = normalizeKey(alias);
  const group = productAliases.find((item) => normalizeKey(item.label) === aliasKey);
  const keys = group?.keys ?? [aliasKey];
  return keys.some((key) => valueKey.includes(key)) || friendlyProductName(value) === alias;
}

function missionProductLabels(mission: NorwynMission | null) {
  if (!mission?.products.trim()) return [];
  return [...new Set(mission.products.split(/[,\n;]/).map((item) => friendlyProductName(item)).filter(Boolean))];
}

function productFitsMission(value: string | null | undefined, mission: NorwynMission | null) {
  const labels = missionProductLabels(mission);
  if (!labels.length) return true;
  return labels.some((label) => productMatchesAlias(value, label));
}

function missionIsCommercial(mission: NorwynMission | null) {
  const text = normalizeKey(`${mission?.type ?? ""} ${mission?.name ?? ""} ${mission?.mainGoal ?? ""}`);
  return ["lancamento", "evergreen", "recuperacao", "produto", "venda", "receita", "faturamento"].some((item) => text.includes(item));
}

function missionIsAudience(mission: NorwynMission | null) {
  const text = normalizeKey(`${mission?.type ?? ""} ${mission?.name ?? ""} ${mission?.mainGoal ?? ""}`);
  return ["crescimento", "autoridade", "seguidor", "alcance", "interacao", "audiencia"].some((item) => text.includes(item));
}

function strategicObjectiveLabels(objective: BusinessObjective | null) {
  if (!objective) return [];
  const text = normalizeKey([
    objective.name,
    objective.description,
    objective.target,
    objective.notes,
    ...objective.kpis,
  ].join(" "));
  return productAliases
    .filter((alias) => alias.keys.some((key) => text.includes(key)) || text.includes(normalizeKey(alias.label)))
    .map((alias) => alias.label);
}

function patternSearchText(pattern: NorwynLaunchPattern) {
  return normalizeKey([
    pattern.contentTitle,
    pattern.contentCaption,
    pattern.format,
    pattern.productName,
    ...pattern.associatedProducts,
  ].join(" "));
}

function patternMatchesProductLabels(pattern: NorwynLaunchPattern, labels: string[]) {
  if (!labels.length) return false;
  const text = patternSearchText(pattern);
  return labels.some((label) => {
    const alias = productAliases.find((item) => normalizeKey(item.label) === normalizeKey(label));
    const keys = alias?.keys ?? [normalizeKey(label)];
    return keys.some((key) => text.includes(key)) || productMatchesAlias(pattern.productName, label) || pattern.associatedProducts.some((product) => productMatchesAlias(product, label));
  });
}

function performanceMetric(pattern: NorwynLaunchPattern, keys: string[]) {
  for (const key of keys) {
    const value = Number(pattern.performanceSnapshot?.[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function daysSince(value: string) {
  const date = parseDate(value);
  if (!date) return 9999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function formatShortDate(value: string) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "-";
}

function playbookBriefingSeed(pattern: NorwynLaunchPattern, missionId?: string | null): BriefingSeed {
  return {
    title: `Nova versao - ${pattern.contentTitle}`,
    objective: `Revisitar um conteudo historico em formato ${pattern.format} com evidencias de impacto para ${friendlyProductName(pattern.productName) || "produto prioritario"}.`,
    context: `Conteudo publicado em ${formatShortDate(pattern.publishedAt)}. Teve ${pattern.salesInWindow} venda(s) na janela e ${pattern.revenueInWindow.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de receita bruta associada.`,
    evidence: [
      `Product Match Score: ${pattern.productMatchScore}%.`,
      `Influence Score: ${pattern.influenceScore}%.`,
      `${pattern.salesInWindow} venda(s) na janela analisada.`,
      `Receita bruta na janela: ${pattern.revenueInWindow.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    ],
    priority: pattern.influenceScore >= 65 ? "Alta" : "Media",
    type: pattern.format.includes("Stories") ? "Stories" : pattern.format.includes("Reel") ? "Reels" : "Carrossel",
    product: friendlyProductName(pattern.productName),
    rule: "Playbook Recomendado contextual",
    sourceModule: "Norwyn",
    recommendationOrigin: `Evidence Pattern ${pattern.id}`,
    confidence: pattern.influenceScore,
    missionId: missionId ?? pattern.missionId ?? undefined,
  };
}

function buildRecommendedPlaybook({
  patterns,
  objective,
  mission,
}: {
  patterns: NorwynLaunchPattern[];
  objective: BusinessObjective | null;
  mission: NorwynMission | null;
}) {
  const objectiveLabels = strategicObjectiveLabels(objective);
  const missionLabels = missionProductLabels(mission);
  const missionText = normalizeKey(`${mission?.type ?? ""} ${mission?.name ?? ""} ${mission?.objective ?? ""} ${mission?.mainGoal ?? ""}`);
  const objectiveText = normalizeKey(`${objective?.name ?? ""} ${objective?.description ?? ""} ${objective?.target ?? ""} ${objective?.notes ?? ""}`);
  const audienceMission = missionIsAudience(mission) || ["crescimento", "autoridade", "instagram", "organico"].some((term) => missionText.includes(term) || objectiveText.includes(term));
  const launchMission = missionIsCommercial(mission) || ["lancamento", "funil", "venda", "receita", "aasi"].some((term) => missionText.includes(term) || objectiveText.includes(term));

  const scored = patterns.map((pattern) => {
    const objectiveMatch = patternMatchesProductLabels(pattern, objectiveLabels) || Boolean(objectiveText && patternSearchText(pattern).includes(objectiveText.split("-")[0] ?? ""));
    const missionProductMatch = patternMatchesProductLabels(pattern, missionLabels);
    const productMatch = objectiveMatch || missionProductMatch || pattern.productMatchScore >= 65;
    const reach = performanceMetric(pattern, ["alcance", "reach", "impressoes", "views", "visualizacoes"]);
    const saves = performanceMetric(pattern, ["salvos", "saves"]);
    const shares = performanceMetric(pattern, ["compartilhamentos", "shares"]);
    const comments = performanceMetric(pattern, ["comentarios", "comments"]);
    const engagementScore = Math.min(100, Math.log10(Math.max(reach + saves * 30 + shares * 35 + comments * 20, 1)) * 28);
    const revenueScore = Math.min(100, Math.log10(Math.max(pattern.revenueInWindow, 1)) * 22);
    const salesScore = Math.min(100, pattern.salesInWindow * 16);
    const recencyScore = Math.max(0, 100 - daysSince(pattern.publishedAt) / 12);
    const evidenceScore = audienceMission
      ? pattern.productMatchScore * 0.2 + pattern.influenceScore * 0.2 + engagementScore * 0.45 + recencyScore * 0.15
      : pattern.productMatchScore * 0.25 + pattern.influenceScore * 0.25 + revenueScore * 0.2 + salesScore * 0.2 + engagementScore * 0.1;
    const missionMatch = missionProductMatch || (pattern.missionId && pattern.missionId === mission?.id) || (launchMission && pattern.salesInWindow > 0);
    const score =
      (objectiveMatch ? 35 : 0) +
      (missionMatch ? 25 : 0) +
      (productMatch ? 15 : 0) +
      evidenceScore * 0.2 +
      recencyScore * 0.05;
    const reasons = [
      objectiveMatch ? "Relacionado ao objetivo estrategico atual." : null,
      missionMatch ? "Alinhado a missao ativa e ao contexto operacional." : null,
      productMatch ? "Produto compativel por alias, tags ou score de match." : null,
      pattern.productMatchScore >= 65 ? "Alto Product Match Score." : null,
      pattern.influenceScore >= 65 ? "Alto Influence Score." : null,
      pattern.salesInWindow > 0 ? "Antecedeu venda(s) na janela analisada." : null,
      audienceMission && engagementScore >= 45 ? "Bom sinal de alcance, salvamentos, compartilhamentos ou comentarios." : null,
      recencyScore >= 70 ? "Conteudo relativamente recente dentro do historico analisado." : null,
    ].filter(Boolean) as string[];

    return { pattern, score, reasons, diversityKey: `${friendlyProductName(pattern.productName) || "sem-produto"}-${angleForSeed({ title: pattern.contentTitle }, pattern.contentCaption ?? "")}-${pattern.format}` };
  }).sort((a, b) => b.score - a.score || daysSince(a.pattern.publishedAt) - daysSince(b.pattern.publishedAt));

  const picked: typeof scored = [];
  const titleKeys = new Set<string>();
  const diversityCount = new Map<string, number>();

  for (const item of scored) {
    const titleKey = normalizeKey(item.pattern.contentTitle).slice(0, 50);
    if (titleKeys.has(titleKey)) continue;
    const count = diversityCount.get(item.diversityKey) ?? 0;
    if (count >= 1 && picked.length < 3) continue;
    if (count >= 2) continue;
    picked.push(item);
    titleKeys.add(titleKey);
    diversityCount.set(item.diversityKey, count + 1);
    if (picked.length >= 5) break;
  }

  if (picked.length < 3) {
    for (const item of scored) {
      const titleKey = normalizeKey(item.pattern.contentTitle).slice(0, 50);
      if (titleKeys.has(titleKey)) continue;
      picked.push(item);
      titleKeys.add(titleKey);
      if (picked.length >= Math.min(5, scored.length)) break;
    }
  }

  return picked;
}

function angleForSeed(seed: Partial<BriefingSeed>, contextText = "") {
  const text = normalizeKey(`${seed.title ?? ""} ${seed.objective ?? ""} ${seed.context ?? ""} ${seed.rule ?? ""} ${contextText}`);
  if (text.includes("obje") || text.includes("duvida") || text.includes("faq")) return "Quebra de objecao";
  if (text.includes("caso") || text.includes("clin")) return "Caso clinico";
  if (text.includes("bastidor")) return "Bastidores";
  if (text.includes("erro") || text.includes("falha")) return "Erro comum";
  if (text.includes("antes") && text.includes("depois")) return "Antes e depois";
  if (text.includes("prova") || text.includes("venda") || text.includes("depoimento")) return "Prova social";
  if (text.includes("micro") || text.includes("aprendiz")) return "Micro aprendizagem";
  return "Autoridade tecnica";
}

function sourceId(prefix: string, value: string | number | null | undefined, fallback = "atual") {
  const raw = String(value ?? fallback);
  return `${prefix} #${raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || fallback}`;
}

function briefingEngineKey(seed: BriefingSeed, missionId: string, date = todayInput()) {
  return [
    "mission-engine-v0",
    date,
    missionId,
    seed.type ?? "Carrossel",
    seed.product ?? "",
    seed.objective,
  ]
    .map(normalizeKey)
    .join("|");
}

function buildMissionSignals(context: NorwynContext, mission: NorwynMission | null = null) {
  const confirmedSales = context.commercialSales.filter(
    (sale) => sale.grupo_comercial === "confirmed" && inLastDays(sale.data_aprovacao ?? sale.data_compra, 7),
  ).filter((sale) => productFitsMission(sale.produto_nome, mission));
  const activeAds = context.adsRows.filter((row) => Number(row.valor_gasto ?? 0) > 0 && inLastDays(row.data_referencia, 7));
  const pendingInteractions = context.interactions.filter((item) => item.status !== "respondido" && item.status !== "arquivado");
  const upcomingEvents = context.agendaEvents.filter((event) => {
    const start = parseDate(event.inicio);
    if (!start) return false;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return start >= new Date() && start <= nextWeek;
  });
  const urgentTasks = context.atividades.filter(
    (task) =>
      !["concluida", "ignorada", "cancelada"].includes(String(task.status)) &&
      ["alta", "urgente"].includes(String(task.prioridade)),
  );
  const openIncidents = context.ocorrencias.filter((item) => !["resolvido", "cancelado", "ignorado"].includes(String(item.status)));
  const products = [...new Set(confirmedSales.map((sale) => friendlyProductName(sale.produto_nome)).filter(Boolean))].slice(0, 3);

  return { confirmedSales, activeAds, pendingInteractions, upcomingEvents, urgentTasks, openIncidents, products };
}

function buildSuggestedMissions(context: NorwynContext): NorwynMission[] {
  const signals = buildMissionSignals(context);
  const suggestions: NorwynMission[] = [];

  if (signals.confirmedSales.length || signals.activeAds.length) {
    suggestions.push(
      emptyMission({
        id: "suggested-launch",
        name: "Executar Mini Lancamento",
        type: "Lancamento",
        status: "Ativa",
        priority: "Principal",
        objective: "Concentrar comunicacao e operacao nos produtos com venda recente.",
        mainGoal: "Aumentar vendas confirmadas",
        goalUnit: "vendas",
        products: signals.products.join(", "),
        sources: ["Comercial", "Ads", "Instagram", "Agenda"],
        owner: "Gestao",
        notes: `${signals.confirmedSales.length} vendas recentes e ${signals.activeAds.length} sinais de Ads com gasto.`,
      }),
    );
  }

  if (signals.pendingInteractions.length) {
    suggestions.push(
      emptyMission({
        id: "suggested-audience",
        name: "Organizar Respostas e Objecoes",
        type: "Crescimento Instagram",
        status: "Planejada",
        priority: "Estrategica",
        objective: "Transformar interacoes pendentes em pauta, resposta e oportunidade comercial.",
        mainGoal: "Responder interacoes prioritarias",
        goalUnit: "interacoes",
        sources: ["Instagram"],
        notes: `${signals.pendingInteractions.length} interacoes pendentes.`,
      }),
    );
  }

  if (signals.urgentTasks.length || signals.openIncidents.length) {
    suggestions.push(
      emptyMission({
        id: "suggested-ops",
        name: "Reduzir Risco Operacional",
        type: "Organizacao Operacional",
        status: "Planejada",
        priority: "Estrategica",
        objective: "Resolver tarefas urgentes e ocorrencias abertas antes de ampliar demanda.",
        mainGoal: "Reduzir riscos abertos",
        goalUnit: "itens",
        sources: ["Atividades", "Ocorrencias"],
        notes: `${signals.urgentTasks.length} tarefas urgentes e ${signals.openIncidents.length} ocorrencias abertas.`,
      }),
    );
  }

  return suggestions.length
    ? suggestions
    : [
        emptyMission({
          id: "suggested-monitoring",
          name: "Coletar Sinais para Proxima Decisao",
          type: "Autoridade",
          status: "Planejada",
          priority: "Continua",
          objective: "Aumentar evidencias antes de definir uma direcao comercial forte.",
          mainGoal: "Coletar sinais",
          goalUnit: "sinais",
          sources: ["Instagram", "Agenda", "Objetivos"],
          notes: "Modo monitoramento: sem missao comercial dominante.",
        }),
      ];
}

function missionProgress(mission: NorwynMission) {
  const start = parseDate(mission.startDate);
  const end = parseDate(mission.endDate);
  if (!start || !end || end <= start) return 0;
  const now = new Date().getTime();
  const total = end.getTime() - start.getTime();
  const elapsed = now - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function missionKpis(mission: NorwynMission, context: NorwynContext) {
  const start = parseDate(mission.startDate);
  const end = parseDate(mission.endDate);
  const inPeriod = (value: string | null | undefined) => {
    const date = parseDate(value);
    if (!date || !start || !end) return false;
    return date >= start && date <= end;
  };
  const sales = context.commercialSales.filter((sale) => inPeriod(sale.data_aprovacao ?? sale.data_compra) && productFitsMission(sale.produto_nome, mission));
  const confirmed = sales.filter((sale) => sale.grupo_comercial === "confirmed");
  const pending = sales.filter((sale) => sale.grupo_comercial === "pending");
  const lost = sales.filter((sale) => ["lost", "refunded", "chargeback"].includes(String(sale.grupo_comercial)));
  const revenue = confirmed.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const interactions = context.interactions.filter((item) => inPeriod(item.interaction_at));
  const ads = context.adsRows.filter((row) => inPeriod(row.data_referencia));
  const spend = ads.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);

  if (mission.type === "Crescimento Instagram" || mission.type === "Autoridade") {
    const reach = context.posts
      .filter((post) => inPeriod(post.data_postagem))
      .reduce((sum, post) => sum + Number(post.alcance ?? 0), 0);
    return [
      { label: "Alcance", value: reach.toLocaleString("pt-BR") },
      { label: "Interacoes", value: interactions.length.toLocaleString("pt-BR") },
      { label: "Posts", value: context.posts.filter((post) => inPeriod(post.data_postagem)).length.toLocaleString("pt-BR") },
    ];
  }

  if (mission.type === "Campanha Ads") {
    const clicks = ads.reduce((sum, row) => sum + Number(row.cliques ?? 0), 0);
    return [
      { label: "Gasto", value: spend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
      { label: "Cliques", value: clicks.toLocaleString("pt-BR") },
      { label: "Registros Ads", value: ads.length.toLocaleString("pt-BR") },
    ];
  }

  return [
    { label: "Vendas confirmadas", value: confirmed.length.toLocaleString("pt-BR") },
    { label: "Receita bruta", value: revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
    { label: "Pendentes/perdidas", value: `${pending.length}/${lost.length}` },
  ];
}

function missionActualValue(mission: NorwynMission, context: NorwynContext) {
  const start = parseDate(mission.startDate);
  const end = parseDate(mission.endDate);
  const inPeriod = (value: string | null | undefined) => {
    const date = parseDate(value);
    if (!date || !start || !end) return false;
    return date >= start && date <= end;
  };
  const unit = normalizeKey(`${mission.goalUnit} ${mission.mainGoal}`);
  if (unit.includes("receita") || unit.includes("faturamento")) {
    return context.commercialSales
      .filter((sale) => sale.grupo_comercial === "confirmed" && inPeriod(sale.data_aprovacao ?? sale.data_compra) && productFitsMission(sale.produto_nome, mission))
      .reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  }
  if (unit.includes("venda")) {
    return context.commercialSales.filter((sale) => sale.grupo_comercial === "confirmed" && inPeriod(sale.data_aprovacao ?? sale.data_compra) && productFitsMission(sale.produto_nome, mission)).length;
  }
  if (unit.includes("interacao") || unit.includes("sinal")) {
    return context.interactions.filter((item) => inPeriod(item.interaction_at)).length;
  }
  if (unit.includes("alcance")) {
    return context.posts.filter((post) => inPeriod(post.data_postagem)).reduce((sum, post) => sum + Number(post.alcance ?? 0), 0);
  }
  if (unit.includes("acao")) return mission.checklist.filter((item) => item.status === "feito").length;
  return null;
}

function missionProgressByGoal(mission: NorwynMission, context: NorwynContext) {
  const target = firstNumber(mission.mainGoal);
  const actual = missionActualValue(mission, context);
  if (!target || actual === null) return null;
  return {
    target,
    actual,
    remaining: Math.max(0, target - actual),
    progress: Math.min(100, Math.round((actual / target) * 100)),
  };
}

function missionGoalDetails(mission: NorwynMission | null, context: NorwynContext) {
  if (!mission) {
    return {
      targetText: "Definir missao principal",
      actualText: "-",
      remainingText: "-",
      progressText: "0%",
      progress: 0,
      daysText: "-",
      forecastText: "Sem missao ativa",
      statusText: "Sem contexto",
      deviationText: "-",
    };
  }
  const goal = missionProgressByGoal(mission, context);
  const remainingDays = daysUntil(mission.endDate);
  if (!goal) {
    const temporal = missionProgress(mission);
    return {
      targetText: `${mission.mainGoal} (${mission.goalUnit || "meta"})`,
      actualText: `${temporal}% temporal`,
      remainingText: "meta numerica nao definida",
      progressText: `${temporal}%`,
      progress: temporal,
      daysText: remainingDays === null ? "-" : remainingDays.toLocaleString("pt-BR"),
      forecastText: temporal >= 70 ? "Dentro do ritmo temporal" : "Exige leitura manual",
      statusText: mission.status,
      deviationText: "Sem desvio numerico",
    };
  }
  const dailyNeed = remainingDays && remainingDays > 0 ? Math.ceil(goal.remaining / remainingDays) : goal.remaining;
  const statusText = goal.progress >= 100 ? "Meta atingida" : goal.progress >= 70 ? "Em bom ritmo" : goal.progress >= 40 ? "Acompanhar" : "Abaixo do esperado";
  return {
    targetText: `${goal.target.toLocaleString("pt-BR")} ${mission.goalUnit || ""}`.trim(),
    actualText: goal.actual.toLocaleString("pt-BR"),
    remainingText: goal.remaining.toLocaleString("pt-BR"),
    progressText: `${goal.progress}%`,
    progress: goal.progress,
    daysText: remainingDays === null ? "-" : remainingDays.toLocaleString("pt-BR"),
    forecastText: goal.remaining <= 0 ? "Sem restante" : `${dailyNeed.toLocaleString("pt-BR")} ${mission.goalUnit || "un."}/dia`,
    statusText,
    deviationText: goal.remaining <= 0 ? "acima ou dentro da meta" : `faltam ${goal.remaining.toLocaleString("pt-BR")}`,
  };
}

function buildOperationalRisks(context: NorwynContext, mission: NorwynMission | null = null) {
  const risks = [
    {
      label: "Campanhas com CTR baixo",
      count: context.adsRows.filter((row) => Number(row.valor_gasto ?? 0) > 0 && Number(row.ctr ?? 0) < 1 && inLastDays(row.data_referencia, 14)).length,
      priority: 3,
    },
    {
      label: "Comentarios/interacoes sem resposta",
      count: context.interactions.filter((item) => item.status !== "respondido" && item.status !== "arquivado").length,
      priority: missionIsAudience(mission) ? 4 : 2,
    },
    {
      label: "Vendas pendentes",
      count: context.commercialSales.filter((sale) => sale.grupo_comercial === "pending" && productFitsMission(sale.produto_nome, mission)).length,
      priority: missionIsCommercial(mission) ? 4 : 2,
    },
    {
      label: "PIX/boletos expirados ou perdidos",
      count: context.commercialSales.filter((sale) => ["lost", "chargeback", "refunded"].includes(String(sale.grupo_comercial)) && productFitsMission(sale.produto_nome, mission)).length,
      priority: missionIsCommercial(mission) ? 3 : 1,
    },
    {
      label: "Tarefas urgentes abertas",
      count: context.atividades.filter((task) => !["concluida", "ignorada", "cancelada"].includes(String(task.status)) && ["alta", "urgente"].includes(String(task.prioridade))).length,
      priority: 3,
    },
    {
      label: "Ocorrencias abertas",
      count: context.ocorrencias.filter((item) => !["resolvido", "cancelado", "ignorado"].includes(String(item.status))).length,
      priority: 3,
    },
  ];
  return risks.filter((risk) => risk.count > 0).sort((a, b) => b.priority - a.priority || b.count - a.count);
}

function operationalContextFor(context: NorwynContext, mission: NorwynMission | null) {
  const signals = buildMissionSignals(context, mission);
  const risks = buildOperationalRisks(context, mission);
  if (!signals.confirmedSales.length && !signals.activeAds.length && !signals.pendingInteractions.length && !risks.length) {
    return { label: "Baixo Sinal", reason: "Os sinais recentes ainda estao dispersos; a melhor decisao e coletar novas perguntas ou aguardar mais dados." };
  }
  if (mission?.type === "Recuperacao Comercial" || risks.some((risk) => risk.label.includes("Vendas") || risk.label.includes("PIX"))) {
    return { label: "Momento de Recuperacao", reason: "Ha oportunidades comerciais pendentes ou perdidas que devem ser tratadas antes de ampliar demanda." };
  }
  if (missionIsCommercial(mission) && (signals.confirmedSales.length || signals.activeAds.length)) {
    return { label: "Momento Comercial Forte", reason: "Existe venda recente, investimento ativo ou produto com sinal suficiente para concentrar a execucao." };
  }
  if (missionIsAudience(mission) || signals.pendingInteractions.length) {
    return { label: "Momento de Aquecimento", reason: "As interacoes indicam necessidade de gerar perguntas, relacionamento e clareza antes de vender mais forte." };
  }
  return { label: "Momento de Consolidacao", reason: "Ha sinais suficientes para organizar execucao e preservar aprendizados sem mudar a direcao principal." };
}

function confidenceExplanation(context: NorwynContext, mission: NorwynMission | null, opportunities: BriefingSeed[]) {
  const signals = buildMissionSignals(context, mission);
  const points = [
    `${context.contentEvents.length} conteudos/eventos historicos`,
    `${signals.confirmedSales.length} vendas confirmadas no contexto recente`,
    `${context.adsRows.filter((row) => Number(row.valor_gasto ?? 0) > 0).length} registros de Ads com gasto`,
    `${context.interactions.length} interacoes disponiveis`,
    `${opportunities.length} recomendacoes rastreaveis`,
  ];
  const gaps = [
    context.interactions.length ? null : "interacoes insuficientes",
    signals.confirmedSales.length ? null : "sem venda recente no contexto da missao",
    context.adsRows.length ? null : "sem sinal de Ads no recorte",
  ].filter(Boolean) as string[];
  const score = Math.min(94, Math.max(42, 35 + points.filter((item) => !item.startsWith("0 ")).length * 10 + opportunities.length * 2 - gaps.length * 6));
  return {
    label: score >= 75 ? "Confianca Alta" : score >= 58 ? "Confianca Media" : "Confianca Baixa",
    score,
    reasons: points,
    limits: gaps.length ? gaps : ["sem lacuna relevante para esta leitura deterministica"],
  };
}

function buildExecutiveSummary(context: NorwynContext, mission: NorwynMission | null, opportunities: BriefingSeed[]) {
  const signals = buildMissionSignals(context, mission);
  const goal = missionGoalDetails(mission, context);
  const risks = buildOperationalRisks(context, mission);
  const contextLabel = operationalContextFor(context, mission);
  const confidence = confidenceExplanation(context, mission, opportunities);
  const mainOpportunity = opportunities[0]?.title ?? "Coletar sinais da audiencia";
  const action = opportunities[0]
    ? `Transformar "${opportunities[0].title}" em briefing ou draft revisavel.`
    : "Coletar novas perguntas em Stories para aumentar confianca antes de decidir.";
  const dataLimits = [
    context.interactions.length ? null : "interacoes recentes ainda insuficientes",
    context.commercialSales.length ? "liquido Hotmart nao faz parte desta leitura consolidada da Norwyn" : null,
  ].filter(Boolean) as string[];

  return {
    title: mission?.name ?? "Nenhuma missao principal ativa",
    goalText: goal.targetText,
    actualText: goal.actualText,
    remainingText: goal.remainingText,
    progressText: goal.progressText,
    deviationText: goal.deviationText,
    contextLabel: contextLabel.label,
    contextReason: contextLabel.reason,
    risk: risks[0] ? `${risks[0].count} ${risks[0].label.toLowerCase()}` : "nenhum risco critico dominante",
    risks,
    opportunity: mainOpportunity,
    action,
    confidence,
    productContext: missionProductLabels(mission).join(", ") || signals.products.join(", ") || "sem produto dominante",
    dataLimits: dataLimits.length ? dataLimits.join("; ") : "sem lacuna critica detectada para esta leitura",
  };
}

function buildOpportunityRadar(context: NorwynContext, mission: NorwynMission | null): BriefingSeed[] {
  const signals = buildMissionSignals(context, mission);
  const topProduct = signals.products[0] ?? "";
  const topPost = [...context.posts].sort((a, b) => Number(b.alcance ?? 0) - Number(a.alcance ?? 0))[0];
  const pendingCommercial = context.commercialSales.filter((sale) => sale.grupo_comercial === "pending" && productFitsMission(sale.produto_nome, mission)).length;
  const riskyCommercial = context.commercialSales.filter((sale) =>
    ["pending", "lost", "refunded", "chargeback"].includes(String(sale.grupo_comercial)) &&
    productFitsMission(sale.produto_nome, mission) &&
    inLastDays(sale.last_event_at ?? sale.data_compra, 30),
  ).length;
  const adAlert = context.adsRows.find((row) => Number(row.valor_gasto ?? 0) > 0 && (Number(row.ctr ?? 0) < 1 || Number(row.frequencia ?? 0) > 3));
  const seeds: BriefingSeed[] = [];
  const canUseCommercial = !mission || missionIsCommercial(mission) || mission.type === "Campanha Ads";
  const canUseAudience = !mission || missionIsAudience(mission) || mission.type === "Organizacao Operacional";

  if (topProduct && canUseCommercial) {
    const angle = angleForSeed({ title: topProduct, rule: "produto vendido recentemente pode virar prova social" });
    seeds.push({
      title: `${angle}: prova social e objecoes de ${topProduct}`,
      type: "Stories",
      missionId: mission?.id,
      recommendationOrigin: `${sourceId("Comercial", signals.confirmedSales[0]?.transaction_id ?? signals.confirmedSales[0]?.id)} / Mission ${mission?.id ?? "sem-missao"}`,
      objective: "Transformar venda recente em conversa comercial sem publicar automaticamente.",
      context: `${topProduct} apareceu entre os produtos vendidos recentemente.`,
      evidence: [`Angulo recomendado: ${angle}.`, `Produto recente: ${topProduct}`, `${signals.confirmedSales.length} vendas confirmadas nos ultimos 7 dias.`, operationalContextFor(context, mission).reason],
      product: topProduct,
      centralMessage: `Existe sinal comercial recente para reforcar ${topProduct}.`,
      cta: "Abrir caixa de perguntas sobre o produto.",
      priority: "Alta",
      confidence: 78,
      sourceModule: "Comercial / Hotmart",
      rule: `${angle}: produto vendido recentemente pode virar prova social sem afirmar atribuicao direta.`,
    });
  }

  if (signals.pendingInteractions.length && canUseAudience) {
    const angle = angleForSeed({ title: "FAQ publico", rule: "pergunta recorrente pode virar carrossel ou FAQ" });
    seeds.push({
      title: `${angle}: perguntas recorrentes podem virar FAQ publico`,
      type: "FAQ / Resposta publica",
      missionId: mission?.id,
      recommendationOrigin: `${sourceId("Instagram", signals.pendingInteractions[0]?.id)} / Signals ${signals.pendingInteractions.length}`,
      objective: "Reduzir tempo de resposta e transformar duvidas em conteudo.",
      context: "Ha interacoes pendentes ou nao respondidas no Instagram.",
      evidence: [`Angulo recomendado: ${angle}.`, `${signals.pendingInteractions.length} interacoes pendentes.`, "Tema dominante ainda deve ser validado nas respostas antes de virar promessa comercial."],
      objection: "duvida ainda sem resposta",
      centralMessage: "As perguntas da audiencia podem orientar conteudo util.",
      cta: "Responder nos comentarios e direcionar para conteudo complementar.",
      priority: "Media",
      confidence: 70,
      sourceModule: "Instagram",
      rule: `${angle}: pergunta recorrente pode virar carrossel ou FAQ`,
    });
  }

  if ((pendingCommercial || riskyCommercial) && canUseCommercial) {
    const angle = angleForSeed({ title: "Mensagem de recuperacao", rule: "perda comercial pode virar mensagem de recuperacao" });
    seeds.push({
      title: `${angle}: mensagem de recuperacao para pagamentos pendentes`,
      type: "Mensagem de recuperacao",
      missionId: mission?.id,
      recommendationOrigin: `${sourceId("Comercial", "risco")} / Mission ${mission?.id ?? "sem-missao"}`,
      objective: "Apoiar recuperacao comercial sem disparo automatico.",
      context: "Existem vendas pendentes, perdidas, reembolsadas ou com risco comercial no Comercial.",
      evidence: [`Angulo recomendado: ${angle}.`, `${pendingCommercial} registros pendentes no Comercial.`, `${riskyCommercial} registros de risco comercial nos ultimos 30 dias.`],
      objection: "pagamento nao concluido",
      centralMessage: "Uma orientacao curta pode remover friccao de compra.",
      cta: "Conferir duvida e orientar proximo passo.",
      priority: "Alta",
      confidence: 72,
      sourceModule: "Comercial",
      rule: `${angle}: perda comercial pode virar mensagem de recuperacao`,
    });
  }

  if (adAlert && (!mission || mission.type === "Campanha Ads" || missionIsCommercial(mission))) {
    const angle = angleForSeed({ title: "Revisar criativo", rule: "campanha com alerta pode virar briefing de anuncio" });
    seeds.push({
      title: `${angle}: revisar criativo ou promessa de campanha`,
      type: "Anuncio",
      missionId: mission?.id,
      recommendationOrigin: `${sourceId("Ads", adAlert.id ?? adAlert.campanha)} / Mission ${mission?.id ?? "sem-missao"}`,
      objective: "Criar alternativa de anuncio para validar sem alterar campanha atual.",
      context: "Ha sinal de Ads com gasto e possivel alerta de performance.",
      evidence: [`Angulo recomendado: ${angle}.`, `Campanha: ${adAlert.campanha ?? "sem nome"}`, `Gasto: ${Number(adAlert.valor_gasto ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`],
      centralMessage: "Antes de escalar, validar promessa, link, publico e criativo.",
      cta: "Criar rascunho alternativo para revisao.",
      priority: "Media",
      confidence: 65,
      sourceModule: "Ads",
      rule: `${angle}: campanha com alerta pode virar briefing de anuncio`,
    });
  }

  if (topPost && canUseAudience) {
    const angle = angleForSeed({ title: "Reaproveitar post com maior alcance", rule: "post com alcance pode virar carrossel" });
    seeds.push({
      title: `${angle}: reaproveitar post com maior alcance`,
      type: "Carrossel",
      missionId: mission?.id,
      recommendationOrigin: `${sourceId("Instagram", topPost.id)} / Mission ${mission?.id ?? "sem-missao"}`,
      objective: "Transformar conteudo com alcance em ativo reutilizavel.",
      context: "Um post recente concentra alcance acima dos demais.",
      evidence: [`Angulo recomendado: ${angle}.`, `Alcance: ${Number(topPost.alcance ?? 0).toLocaleString("pt-BR")}`, `Formato: ${String(topPost.tipo ?? "post")}`],
      centralMessage: "Conteudos com resposta organica podem virar sequencias mais didaticas.",
      cta: "Salvar, comentar ou enviar duvida.",
      priority: "Baixa",
      confidence: 62,
      sourceModule: "Editorial Intelligence",
      rule: `${angle}: post com alcance pode virar carrossel`,
    });
  }

  return seeds.length ? seeds : [{
    title: "Coletar novas perguntas antes de produzir",
    type: "Stories",
    missionId: mission?.id,
    recommendationOrigin: "Opportunity Radar",
    objective: "Aumentar confianca antes de decidir pauta.",
    context: "Nao ha oportunidade dominante com evidencias suficientes.",
    evidence: ["Sinais atuais ainda dispersos."],
    centralMessage: "Quando nao ha tema dominante, a melhor acao e coletar novas perguntas.",
    cta: "Abrir caixa de perguntas nos Stories.",
    priority: "Baixa",
    confidence: 45,
    sourceModule: "Norwyn",
    rule: "baixo sinal exige coleta de evidencia",
  }];
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
        active
          ? "border-brand-clay bg-brand-clay text-white shadow-sm"
          : "border-brand-sand bg-white/75 text-brand-teal hover:border-brand-clay/50"
      }`}
    >
      {children}
    </button>
  );
}

export function NorwynDashboard({ context }: { context: NorwynContext }) {
  const [activeTab, setActiveTab] = useState<NorwynTab>("home");
  const [businessObjectives, setBusinessObjectives] = useState<BusinessObjective[]>([]);
  const [missions, setMissions] = useState<NorwynMission[]>([]);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<NorwynMission | null>(null);
  const [editingBriefing, setEditingBriefing] = useState<NorwynBriefing | null>(null);
  const [editingShadow, setEditingShadow] = useState<ShadowAction | null>(null);
  const [editingSignal, setEditingSignal] = useState<NorwynSignal | null>(null);
  const [detailMissionId, setDetailMissionId] = useState<string | null>(null);
  const [ignoredSuggestions, setIgnoredSuggestions] = useState<string[]>([]);
  const [briefings, setBriefings] = useState<NorwynBriefing[]>([]);
  const [drafts, setDrafts] = useState<NorwynDraft[]>([]);
  const [shadowActions, setShadowActions] = useState<ShadowAction[]>([]);
  const [knowledgeEvents, setKnowledgeEvents] = useState<KnowledgeEvent[]>([]);
  const [signals, setSignals] = useState<NorwynSignal[]>(context.signals ?? []);
  const [engineMessage, setEngineMessage] = useState<string>("");

  const suggestions = useMemo(() => buildSuggestedMissions(context), [context]);
  const activeObjectives = businessObjectives.filter((objective) => objective.status !== "Arquivado");
  const primaryObjective =
    activeObjectives.find((objective) => objective.priority === "Principal" && objective.status === "Ativo") ??
    activeObjectives.find((objective) => objective.status === "Ativo") ??
    activeObjectives[0] ??
    null;
  const activeMission = missions.find((mission) => mission.id === activeMissionId) ?? missions.find((mission) => mission.priority === "Principal" && mission.status !== "Arquivada") ?? null;
  const detailMission = missions.find((mission) => mission.id === detailMissionId) ?? activeMission;
  const evidenceEngine = useMemo(
    () =>
      buildEvidenceEngine({
        contentEvents: context.contentEvents,
        commercialSales: context.commercialSales,
        signals,
        adsRows: context.adsRows,
        interactions: context.interactions,
        activeMissionName: activeMission?.name ?? null,
      }),
    [context, signals, activeMission],
  );
  const evidenceOpportunities = useMemo(
    () =>
      evidenceEngine.recommendations
        .filter((recommendation) => {
          if (!activeMission) return true;
          if (missionIsAudience(activeMission) && !missionIsCommercial(activeMission)) return !recommendation.productName;
          return productFitsMission(recommendation.productName, activeMission) || !missionProductLabels(activeMission).length;
        })
        .map((recommendation) => {
          const seed = evidenceRecommendationToBriefingSeed(recommendation, activeMission?.id) as BriefingSeed;
          const angle = angleForSeed(seed, recommendation.title);
          return {
            ...seed,
            title: seed.title.includes(":") ? seed.title : `${angle}: ${seed.title}`,
            product: friendlyProductName(seed.product ?? recommendation.productName),
            recommendationOrigin: `${sourceId("Evidence", recommendation.id)} / ${seed.recommendationOrigin ?? "Evidence Engine"}`,
            evidence: [`Angulo recomendado: ${angle}.`, ...seed.evidence],
            rule: `${angle}: ${seed.rule ?? recommendation.expectedImpact}`,
          };
        }),
    [evidenceEngine, activeMission],
  );
  const opportunities = useMemo(() => [...evidenceOpportunities, ...buildOpportunityRadar(context, activeMission)].slice(0, 9), [context, activeMission, evidenceOpportunities]);

  useEffect(() => {
    try {
      const storedObjectives = ensureDefaultBusinessObjectives(JSON.parse(window.localStorage.getItem(BUSINESS_OBJECTIVES_KEY) || "[]") as BusinessObjective[]);
      setBusinessObjectives(storedObjectives);
      window.localStorage.setItem(BUSINESS_OBJECTIVES_KEY, JSON.stringify(storedObjectives));
      const stored = JSON.parse(window.localStorage.getItem(MISSIONS_KEY) || "[]") as NorwynMission[];
      setMissions(stored);
      setActiveMissionId(window.localStorage.getItem(ACTIVE_MISSION_KEY));
      setBriefings(JSON.parse(window.localStorage.getItem(BRIEFINGS_KEY) || "[]") as NorwynBriefing[]);
      setDrafts(JSON.parse(window.localStorage.getItem(DRAFTS_KEY) || "[]") as NorwynDraft[]);
      setShadowActions(JSON.parse(window.localStorage.getItem(SHADOW_KEY) || "[]") as ShadowAction[]);
      setKnowledgeEvents(JSON.parse(window.localStorage.getItem(KNOWLEDGE_KEY) || "[]") as KnowledgeEvent[]);
    } catch {
      const defaults = defaultBusinessObjectives();
      setBusinessObjectives(defaults);
      window.localStorage.setItem(BUSINESS_OBJECTIVES_KEY, JSON.stringify(defaults));
      setMissions([]);
      setBriefings([]);
      setDrafts([]);
      setShadowActions([]);
      setKnowledgeEvents([]);
    }
  }, []);

  useEffect(() => {
    setSignals(context.signals ?? []);
  }, [context.signals]);

  function persist(next: NorwynMission[]) {
    setMissions(next);
    window.localStorage.setItem(MISSIONS_KEY, JSON.stringify(next));
  }

  function persistBusinessObjectives(next: BusinessObjective[]) {
    setBusinessObjectives(next);
    window.localStorage.setItem(BUSINESS_OBJECTIVES_KEY, JSON.stringify(next));
  }

  function saveMission(mission: NorwynMission) {
    if (mission.priority === "Principal") {
      const currentPrincipal = missions.find(
        (item) => item.priority === "Principal" && item.id !== mission.id && item.status !== "Arquivada",
      );
      if (currentPrincipal && !window.confirm(`Substituir a missao principal atual: ${currentPrincipal.name}?`)) {
        return;
      }
    }
    if (
      mission.priority === "Estrategica" &&
      missions.filter((item) => item.priority === "Estrategica" && item.id !== mission.id && item.status !== "Arquivada").length >= 3
    ) {
      window.alert("Limite de 3 missoes estrategicas ativas atingido.");
      return;
    }

    const normalizedMission = { ...mission, name: mission.name.trim() || "Missao sem nome" };
    const next = missions.some((item) => item.id === mission.id)
      ? missions.map((item) =>
          item.id === mission.id
            ? normalizedMission
            : normalizedMission.priority === "Principal"
              ? { ...item, priority: item.priority === "Principal" ? "Estrategica" : item.priority }
              : item,
        )
      : [
          ...missions.map((item) =>
            normalizedMission.priority === "Principal"
              ? { ...item, priority: item.priority === "Principal" ? "Estrategica" : item.priority }
              : item,
          ),
          normalizedMission,
        ];
    persist(next);
    setActiveMissionId(normalizedMission.priority === "Principal" ? normalizedMission.id : activeMissionId ?? normalizedMission.id);
    window.localStorage.setItem(ACTIVE_MISSION_KEY, normalizedMission.priority === "Principal" ? normalizedMission.id : activeMissionId ?? normalizedMission.id);
    setEditingMission(null);
    setDetailMissionId(normalizedMission.id);
  }

  function updateMission(id: string, patch: Partial<NorwynMission>) {
    persist(missions.map((mission) => (mission.id === id ? { ...mission, ...patch } : mission)));
  }

  function createFromSuggestion(suggestion: NorwynMission) {
    setEditingMission(emptyMission({ ...suggestion, id: makeId(), createdAt: new Date().toISOString() }));
  }

  function persistBriefings(next: NorwynBriefing[]) {
    setBriefings(next);
    window.localStorage.setItem(BRIEFINGS_KEY, JSON.stringify(next));
  }

  function persistDrafts(next: NorwynDraft[]) {
    setDrafts(next);
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
  }

  function persistShadow(next: ShadowAction[]) {
    setShadowActions(next);
    window.localStorage.setItem(SHADOW_KEY, JSON.stringify(next));
  }

  function persistKnowledge(next: KnowledgeEvent[]) {
    setKnowledgeEvents(next.slice(0, 80));
    window.localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(next.slice(0, 80)));
  }

  function addKnowledgeEvent(event: Omit<KnowledgeEvent, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    persistKnowledge([{ ...event, id: makeId("knowledge"), createdAt: now, updatedAt: now }, ...knowledgeEvents]);
  }

  function openBriefing(seed: BriefingSeed) {
    setEditingBriefing(emptyBriefing({ ...seed, missionId: seed.missionId ?? activeMission?.id ?? "" }));
    setActiveTab("briefing");
  }

  function saveBriefing(briefing: NorwynBriefing) {
    const nextBriefing = { ...briefing, updatedAt: new Date().toISOString(), title: briefing.title.trim() || "Briefing sem titulo" };
    persistBriefings(
      briefings.some((item) => item.id === briefing.id)
        ? briefings.map((item) => (item.id === briefing.id ? nextBriefing : item))
        : [nextBriefing, ...briefings],
    );
    addKnowledgeEvent({
      type: "briefing_saved",
      title: nextBriefing.title,
      status: nextBriefing.status,
      evidence: nextBriefing.evidence.slice(0, 4),
    });
    setEditingBriefing(null);
    setActiveTab("briefing");
  }

  function generateDraft(briefing: NorwynBriefing) {
    const draft = buildDraftFromBriefing(briefing);
    persistDrafts([draft, ...drafts]);
    addKnowledgeEvent({
      type: "draft_generated",
      title: draft.title,
      status: draft.status,
      evidence: [`Briefing: ${briefing.title}`, `Tipo: ${draft.type}`],
    });
    setActiveTab("studio");
  }

  function updateBriefing(id: string, patch: Partial<NorwynBriefing>) {
    persistBriefings(briefings.map((briefing) => (briefing.id === id ? { ...briefing, ...patch, updatedAt: new Date().toISOString() } : briefing)));
  }

  function updateDraft(id: string, patch: Partial<NorwynDraft>) {
    persistDrafts(drafts.map((draft) => (draft.id === id ? { ...draft, ...patch, updatedAt: new Date().toISOString() } : draft)));
  }

  function saveShadow(action: ShadowAction) {
    const next = shadowActions.some((item) => item.id === action.id)
      ? shadowActions.map((item) => (item.id === action.id ? action : item))
      : [action, ...shadowActions];
    persistShadow(next);
    addKnowledgeEvent({
      type: "shadow_action",
      title: `${action.origin}: ${action.theme || action.type}`,
      status: action.status,
      evidence: [`Canal: ${action.channel}`, `Alcance: ${action.reach || "-"}`, `Comentarios: ${action.comments || "-"}`],
    });
    setEditingShadow(null);
    setActiveTab("shadow");
  }

  async function saveSignal(signal: NorwynSignal) {
    const payload = {
      ...signal,
      title: signal.title.trim() || "Signal sem titulo",
      final_score: undefined,
      created_at: undefined,
      updated_at: undefined,
      tenant_id: undefined,
      created_by: undefined,
    };
    const persisted = signals.some((item) => item.id === signal.id);
    const response = await fetch("/api/norwyn/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: persisted ? "update" : "create", id: signal.id, payload }),
    });
    const result = await response.json();
    if (!response.ok) {
      window.alert(result.error ?? "Nao foi possivel salvar o signal.");
      return;
    }
    const savedSignal = result.data as NorwynSignal;
    setSignals((current) =>
      current.some((item) => item.id === savedSignal.id)
        ? current.map((item) => (item.id === savedSignal.id ? savedSignal : item))
        : [savedSignal, ...current],
    );
    setEditingSignal(null);
    setActiveTab("knowledge");
  }

  async function updateSignalStatus(signal: NorwynSignal, status: NorwynSignalStatus) {
    const response = await fetch("/api/norwyn/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", id: signal.id, payload: { status } }),
    });
    const result = await response.json();
    if (!response.ok) {
      window.alert(result.error ?? "Nao foi possivel atualizar o signal.");
      return;
    }
    setSignals((current) => current.map((item) => (item.id === signal.id ? (result.data as NorwynSignal) : item)));
  }

  async function archiveSignal(signal: NorwynSignal) {
    if (!window.confirm(`Arquivar o signal "${signal.title}"?`)) return;
    const response = await fetch("/api/norwyn/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", id: signal.id }),
    });
    const result = await response.json();
    if (!response.ok) {
      window.alert(result.error ?? "Nao foi possivel arquivar o signal.");
      return;
    }
    setSignals((current) => current.filter((item) => item.id !== signal.id));
  }

  function runMissionEngine() {
    const signals = buildMissionSignals(context);
    const hasCommercialMoment = signals.confirmedSales.length || signals.activeAds.length || signals.products.length;
    const missionName = hasCommercialMoment ? "Executar momento comercial ativo" : "Coletar sinais da audiencia";
    const now = new Date().toISOString();
    const existingMission = missions.find(
      (mission) => mission.name === missionName && mission.status !== "Arquivada",
    );
    const engineMission =
      existingMission ??
      emptyMission({
        id: makeId("mission-engine"),
        name: missionName,
        type: hasCommercialMoment ? "Lancamento" : "Autoridade",
        status: "Ativa",
        priority: hasCommercialMoment ? "Principal" : "Continua",
        objective: hasCommercialMoment
          ? "Transformar sinais comerciais recentes em acoes de comunicacao, recuperacao e revisao."
          : "Criar perguntas e conteudos para aumentar o nivel de evidencia da audiencia.",
        mainGoal: hasCommercialMoment ? "Priorizar acoes de hoje" : "Coletar sinais",
        goalUnit: hasCommercialMoment ? "acoes" : "sinais",
        products: signals.products.join(", "),
        sources: ["Comercial", "Instagram", "Ads", "Agenda", "Atividades"],
        owner: "Norwyn",
        notes: hasCommercialMoment
          ? `${signals.confirmedSales.length} vendas recentes, ${signals.activeAds.length} sinais de Ads e ${signals.pendingInteractions.length} interacoes pendentes.`
          : "Nao ha tema dominante. A missao prioriza coleta de sinais da audiencia.",
        createdAt: now,
      });

    const normalizedMission = {
      ...engineMission,
      priority: hasCommercialMoment ? ("Principal" as MissionPriority) : engineMission.priority,
      status: "Ativa" as MissionStatus,
      notes: hasCommercialMoment
        ? `${signals.confirmedSales.length} vendas recentes, ${signals.activeAds.length} sinais de Ads e ${signals.pendingInteractions.length} interacoes pendentes.`
        : engineMission.notes,
    };
    const nextMissions = existingMission
      ? missions.map((mission) => (mission.id === normalizedMission.id ? normalizedMission : mission))
      : [
          ...missions.map((mission) =>
            normalizedMission.priority === "Principal" && mission.priority === "Principal"
              ? { ...mission, priority: "Estrategica" as MissionPriority }
              : mission,
          ),
          normalizedMission,
        ];
    persist(nextMissions);
    setActiveMissionId(normalizedMission.id);
    setDetailMissionId(normalizedMission.id);
    window.localStorage.setItem(ACTIVE_MISSION_KEY, normalizedMission.id);

    const evidenceSeeds = evidenceEngine.recommendations.map((recommendation) =>
      evidenceRecommendationToBriefingSeed(recommendation, normalizedMission.id) as BriefingSeed,
    );
    const seeds = [...evidenceSeeds, ...buildOpportunityRadar(context, normalizedMission)].slice(0, 6);
    let createdBriefings = 0;
    let skippedBriefings = 0;
    let createdDrafts = 0;
    const nextBriefings = [...briefings];
    const nextDrafts = [...drafts];
    const checklistItems: MissionChecklistItem[] = [];

    for (const seed of seeds) {
      const engineKey = briefingEngineKey(seed, normalizedMission.id);
      const existingBriefing = nextBriefings.find((briefing) => briefing.engineKey === engineKey);
      const briefing =
        existingBriefing ??
        emptyBriefing({
          ...seed,
          missionId: normalizedMission.id,
          recommendationOrigin: "Mission Engine V0",
          status: "rascunho automatico",
          sourceModule: seed.sourceModule ?? "Mission Engine",
          engineKey,
          generatedBy: "mission-engine-v0",
        });

      checklistItems.push({
        id: makeId("check-engine"),
        text: briefing.title,
        status: existingBriefing ? "parcial" : "pendente",
      });

      if (!existingBriefing) {
        nextBriefings.unshift(briefing);
        createdBriefings += 1;
      } else {
        skippedBriefings += 1;
      }

      const existingDraft = nextDrafts.find((draft) => draft.engineKey === engineKey);
      if (!existingDraft) {
        const draft = {
          ...buildDraftFromBriefing(briefing),
          status: "rascunho automatico" as DraftStatus,
          title: `Mission Engine - ${briefing.title}`,
          engineKey,
          generatedBy: "mission-engine-v0" as const,
        };
        nextDrafts.unshift(draft);
        createdDrafts += 1;
      }
    }

    const existingChecklistTexts = new Set(normalizedMission.checklist.map((item) => item.text));
    const nextChecklist = [
      ...normalizedMission.checklist,
      ...checklistItems.filter((item) => !existingChecklistTexts.has(item.text)),
    ].slice(-12);
    persist(nextMissions.map((mission) => (mission.id === normalizedMission.id ? { ...mission, checklist: nextChecklist } : mission)));
    persistBriefings(nextBriefings);
    persistDrafts(nextDrafts);
    addKnowledgeEvent({
      type: "mission_engine_run",
      title: `Mission Engine: ${normalizedMission.name}`,
      status: "executado",
      evidence: [
        `${createdBriefings} briefing(s) criado(s)`,
        `${createdDrafts} draft(s) criado(s)`,
        `${skippedBriefings} item(ns) ja existente(s)`,
        `Missao: ${normalizedMission.name}`,
      ],
    });
    setEngineMessage(
      `Mission Engine rodou: ${createdBriefings} briefing(s), ${createdDrafts} draft(s) e ${skippedBriefings} item(ns) ja existentes hoje.`,
    );
    setActiveTab("studio");
  }

  if (context.diagnostic) {
    return (
      <Card className="border-[#E9CBD1] p-6">
        <p className="text-xs font-black uppercase text-brand-clay">Norwyn</p>
        <h1 className="mt-2 text-2xl font-semibold text-brand-teal">Mission OS indisponivel</h1>
        <p className="mt-2 text-sm text-brand-teal/70">{context.diagnostic}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-clay">Norwyn OS V1</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-teal sm:text-4xl">Executive Home</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-teal/70">
            Business Strategy orienta as missoes, os dados operacionais viram evidencias e a Norwyn transforma sinais em decisoes claras para o dia.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm font-semibold text-brand-teal/55">{formatUpdatedAt(context.updatedAt)}</p>
          <button
            type="button"
            onClick={runMissionEngine}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-teal px-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-teal/90"
          >
            <Sparkles className="h-4 w-4" /> Rodar Mission Engine
          </button>
        </div>
      </header>

      {engineMessage ? (
        <Card className="border-[#D6EBDD] bg-[#F1FBF4] p-3 text-sm font-semibold text-brand-teal">
          {engineMessage}
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === "home"} onClick={() => setActiveTab("home")}>
          <Home className="h-4 w-4" /> Executive Home
        </TabButton>
        <TabButton active={activeTab === "business"} onClick={() => setActiveTab("business")}>
          <BriefcaseBusiness className="h-4 w-4" /> Business Strategy
        </TabButton>
        <TabButton active={activeTab === "mission"} onClick={() => setActiveTab("mission")}>
          <Flag className="h-4 w-4" /> Mission Center
        </TabButton>
        <TabButton active={activeTab === "intelligence"} onClick={() => setActiveTab("intelligence")}>
          <Layers3 className="h-4 w-4" /> Intelligence
        </TabButton>
        <TabButton active={activeTab === "evidence"} onClick={() => setActiveTab("evidence")}>
          <CheckCircle2 className="h-4 w-4" /> Evidence
        </TabButton>
        <TabButton active={activeTab === "strategy"} onClick={() => setActiveTab("strategy")}>
          <Compass className="h-4 w-4" /> Strategy
        </TabButton>
        <TabButton active={activeTab === "briefing"} onClick={() => setActiveTab("briefing")}>
          <ClipboardList className="h-4 w-4" /> Briefing Center
        </TabButton>
        <TabButton active={activeTab === "studio"} onClick={() => setActiveTab("studio")}>
          <Sparkles className="h-4 w-4" /> Studio Draft
        </TabButton>
        <TabButton active={activeTab === "shadow"} onClick={() => setActiveTab("shadow")}>
          <Eye className="h-4 w-4" /> Shadow Mode
        </TabButton>
        <TabButton active={activeTab === "knowledge"} onClick={() => setActiveTab("knowledge")}>
          <BookOpen className="h-4 w-4" /> Knowledge
        </TabButton>
        <TabButton active={activeTab === "guide"} onClick={() => setActiveTab("guide")}>
          <Bot className="h-4 w-4" /> Como funciona
        </TabButton>
      </div>

      {activeTab === "home" ? (
        <ExecutiveHomeView
          context={context}
          businessObjectives={businessObjectives}
          primaryObjective={primaryObjective}
          missions={missions}
          activeMission={activeMission}
          opportunities={opportunities}
          evidenceEngine={evidenceEngine}
          knowledgeEvents={knowledgeEvents}
          openMission={(id) => {
            setDetailMissionId(id);
            setActiveTab("mission");
          }}
          openBriefing={(seed) => openBriefing(seed)}
          goTo={(tab) => setActiveTab(tab)}
        />
      ) : null}

      {activeTab === "business" ? (
        <BusinessStrategyView
          objectives={businessObjectives}
          missions={missions}
          saveObjectives={persistBusinessObjectives}
          openMission={(id) => {
            setDetailMissionId(id);
            setActiveTab("mission");
          }}
        />
      ) : null}

      {activeTab === "mission" ? (
        <MissionCenterView
          context={context}
          businessObjectives={businessObjectives}
          missions={missions}
          activeMission={activeMission}
          detailMission={detailMission}
          suggestions={suggestions.filter((suggestion) => !ignoredSuggestions.includes(suggestion.id))}
          opportunities={opportunities}
          knowledgeEvents={knowledgeEvents}
          editMission={setEditingMission}
          newMission={() => setEditingMission(emptyMission())}
          createFromSuggestion={createFromSuggestion}
          ignoreSuggestion={(id) => setIgnoredSuggestions((current) => [...current, id])}
          setActiveMission={(id) => {
            setActiveMissionId(id);
            window.localStorage.setItem(ACTIVE_MISSION_KEY, id);
          }}
          setDetailMission={setDetailMissionId}
          updateMission={updateMission}
          duplicateMission={(mission) => setEditingMission(emptyMission({ ...mission, id: makeId(), name: `${mission.name} - copia`, status: "Planejada" }))}
          runMissionEngine={runMissionEngine}
        />
      ) : null}

      {activeTab === "strategy" ? (
        <StrategyPlanner
          posts={context.posts}
          interactions={context.interactions}
          commercialSales={context.commercialSales}
          adsRows={context.adsRows}
          agendaEvents={context.agendaEvents}
          atividades={context.atividades}
          ocorrencias={context.ocorrencias}
          objetivos={context.objetivos}
          activeMission={activeMission ? { name: activeMission.name, priority: activeMission.priority } : null}
          evidenceRecommendations={evidenceEngine.recommendations}
          onCreateBriefing={(seed) => openBriefing({ ...seed, missionId: activeMission?.id })}
        />
      ) : null}

      {activeTab === "briefing" ? (
        <BriefingCenterView
          briefings={briefings}
          drafts={drafts}
          missions={missions}
          opportunities={opportunities}
          openBriefing={openBriefing}
          editBriefing={setEditingBriefing}
          updateBriefing={updateBriefing}
          generateDraft={generateDraft}
        />
      ) : null}

      {activeTab === "studio" ? (
        <StudioDraftView
          drafts={drafts}
          briefings={briefings}
          missions={missions}
          updateDraft={updateDraft}
          duplicateDraft={(draft) => persistDrafts([{ ...draft, id: makeId("draft"), title: `${draft.title} - copia`, status: "rascunho", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...drafts])}
          sendToShadow={(draft) => {
            setEditingShadow(emptyShadowAction({
              missionId: draft.missionId,
              relatedDraftId: draft.id,
              relatedBriefingId: draft.briefingId,
              origin: "Norwyn",
              type: draft.type,
              theme: draft.title,
              perceivedObjective: draft.content.slice(0, 3).join("\n"),
            }));
            setActiveTab("shadow");
          }}
        />
      ) : null}

      {activeTab === "shadow" ? (
        <ShadowModeView
          actions={shadowActions}
          briefings={briefings}
          drafts={drafts}
          missions={missions}
          editAction={setEditingShadow}
          newAction={() => setEditingShadow(emptyShadowAction({ missionId: activeMission?.id ?? "" }))}
          updateAction={(id, patch) => persistShadow(shadowActions.map((action) => (action.id === id ? { ...action, ...patch } : action)))}
        />
      ) : null}

      {activeTab === "intelligence" ? <IntelligenceView missions={missions} /> : null}
      {activeTab === "evidence" ? (
        <EvidenceEngineView
          evidenceEngine={evidenceEngine}
          openBriefing={(recommendation) => openBriefing(evidenceRecommendationToBriefingSeed(recommendation, activeMission?.id) as BriefingSeed)}
        />
      ) : null}
      {activeTab === "knowledge" ? <KnowledgeBaseView knowledgeEvents={knowledgeEvents} signals={signals} /> : null}
      {activeTab === "guide" ? <ArchitectureGuideView /> : null}

      {editingMission ? (
        <MissionForm mission={editingMission} businessObjectives={businessObjectives} close={() => setEditingMission(null)} save={saveMission} />
      ) : null}
      {editingBriefing ? (
        <BriefingForm briefing={editingBriefing} missions={missions} close={() => setEditingBriefing(null)} save={saveBriefing} />
      ) : null}
      {editingShadow ? (
        <ShadowActionForm action={editingShadow} posts={context.posts} missions={missions} briefings={briefings} drafts={drafts} close={() => setEditingShadow(null)} save={saveShadow} />
      ) : null}
      {editingSignal ? (
        <SignalForm signal={editingSignal} close={() => setEditingSignal(null)} save={saveSignal} />
      ) : null}
    </div>
  );
}

function ExecutiveHomeView({
  context,
  businessObjectives,
  primaryObjective,
  missions,
  activeMission,
  opportunities,
  evidenceEngine,
  knowledgeEvents,
  openMission,
  openBriefing,
  goTo,
}: {
  context: NorwynContext;
  businessObjectives: BusinessObjective[];
  primaryObjective: BusinessObjective | null;
  missions: NorwynMission[];
  activeMission: NorwynMission | null;
  opportunities: BriefingSeed[];
  evidenceEngine: ReturnType<typeof buildEvidenceEngine>;
  knowledgeEvents: KnowledgeEvent[];
  openMission: (id: string) => void;
  openBriefing: (seed: BriefingSeed) => void;
  goTo: (tab: NorwynTab) => void;
}) {
  const activeMissions = missions.filter((mission) => mission.status !== "Arquivada" && mission.status !== "Encerrada");
  const summary = buildExecutiveSummary(context, activeMission, opportunities);
  const upcomingEvents = context.agendaEvents.filter((event) => inLastDays(event.inicio, -30) || parseDate(event.inicio));
  const criticalTasks = context.atividades.filter((task) => ["Alta", "Urgente"].includes(String(task.prioridade ?? "")) && task.status !== "concluida");
  const openIncidents = context.ocorrencias.filter((item) => !["Resolvido", "Cancelado", "Ignorado"].includes(String(item.status ?? "")));
  const playbookItems = buildRecommendedPlaybook({
    patterns: evidenceEngine.launchPatterns,
    objective: primaryObjective,
    mission: activeMission,
  });

  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase text-brand-clay">Estrategia da empresa</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-teal">{primaryObjective?.name ?? "Nenhum objetivo estrategico ativo"}</h2>
            <p className="mt-2 text-sm leading-6 text-brand-teal/70">{primaryObjective?.description ?? "Cadastre um objetivo em Business Strategy para orientar a Norwyn."}</p>
          </div>
          <div className="grid min-w-[220px] gap-2">
            <MissionMeta label="Meta" value={primaryObjective?.target ?? "-"} />
            <MissionMeta label="Status" value={primaryObjective?.status ?? "-"} />
            <MissionMeta label="Progresso" value={primaryObjective ? `${primaryObjective.progress}%` : "-"} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MiniCounter label="Objetivos ativos" value={businessObjectives.filter((item) => item.status === "Ativo").length} />
          <MiniCounter label="Missoes ativas" value={activeMissions.length} />
          <MiniCounter label="Oportunidades" value={opportunities.length} />
          <MiniCounter label="Alertas" value={criticalTasks.length + openIncidents.length} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ExecutiveSummaryCard summary={summary} knowledgeEvents={knowledgeEvents} />
        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionTitle icon={<Target className="h-5 w-5" />} title="O que fazer agora" />
          <div className="mt-4 space-y-3">
            {opportunities.slice(0, 4).map((item) => (
              <article key={`${item.title}-${item.rule}`} className="rounded-md border border-brand-sand bg-white/85 p-3">
                <p className="text-[11px] font-black uppercase text-brand-clay">{item.priority ?? "Prioridade"}</p>
                <h3 className="mt-1 text-sm font-semibold text-brand-teal">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-brand-teal/65">{item.objective}</p>
                <p className="mt-2 text-xs font-bold text-brand-teal/55">Por que: {item.evidence?.[0] ?? item.rule ?? "Sinal operacional detectado."}</p>
                <button type="button" onClick={() => openBriefing(item)} className="mt-3 h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">Criar briefing</button>
              </article>
            ))}
            {!opportunities.length ? <EmptyState>Nenhuma recomendacao priorizada no recorte atual.</EmptyState> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionTitle icon={<Flag className="h-5 w-5" />} title="Missoes ativas" />
          <div className="mt-4 space-y-3">
            {activeMissions.slice(0, 5).map((mission) => (
              <button key={mission.id} type="button" onClick={() => openMission(mission.id)} className="w-full rounded-md border border-brand-sand bg-white/85 p-3 text-left">
                <p className="text-sm font-semibold text-brand-teal">{mission.name}</p>
                <p className="mt-1 text-xs text-brand-teal/60">{mission.status} - {mission.priority} - prazo {mission.endDate || "-"}</p>
              </button>
            ))}
            {!activeMissions.length ? <EmptyState>Nenhuma missao ativa criada.</EmptyState> : null}
          </div>
        </Card>

        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="Playbook Recomendado" />
          <p className="mt-2 text-xs leading-5 text-brand-teal/60">
            Conteudos historicos priorizados pelo objetivo estrategico, missao ativa, match de produto, evidencias e recencia. Nao e um ranking global.
          </p>
          <div className="mt-4 space-y-3">
            {playbookItems.length ? playbookItems.map((item, index) => {
              const pattern = item.pattern;
              const briefingSeed = playbookBriefingSeed(pattern, activeMission?.id);
              return (
                <article key={pattern.id} className="rounded-md border border-brand-sand bg-white/85 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-brand-clay">#{index + 1} - {pattern.format}</p>
                      <h3 className="mt-1 text-sm font-semibold text-brand-teal">{pattern.contentTitle}</h3>
                      <p className="mt-1 text-xs text-brand-teal/60">Publicado: {formatShortDate(pattern.publishedAt)} - Score contextual {Math.round(item.score)}</p>
                    </div>
                    <span className="rounded-full bg-brand-cream px-2 py-1 text-[11px] font-black text-brand-teal">{pattern.influenceLevel}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-brand-teal/70">
                    <p className="font-black uppercase text-brand-clay">Por que foi selecionado?</p>
                    {item.reasons.slice(0, 6).map((reason) => (
                      <p key={reason}>✓ {reason}</p>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <MissionMeta label="Resultado observado" value={`${pattern.salesInWindow} venda(s)`} />
                    <MissionMeta label="Receita bruta" value={pattern.revenueInWindow.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <MissionMeta label="Match Score" value={`${pattern.productMatchScore}%`} />
                    <MissionMeta label="Influence Score" value={`${pattern.influenceScore}%`} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pattern.permalink ? (
                      <a href={pattern.permalink} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">
                        Ver post
                      </a>
                    ) : (
                      <button type="button" disabled className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal/40">Ver post</button>
                    )}
                    <button type="button" onClick={() => goTo("evidence")} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Ver evidencias</button>
                    <button type="button" onClick={() => openBriefing(briefingSeed)} className="h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">Criar nova versao</button>
                  </div>
                </article>
              );
            }) : (
              <EmptyState>Sem evidencias suficientes para montar um playbook contextual agora.</EmptyState>
            )}
          </div>
        </Card>

        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionTitle icon={<ClipboardList className="h-5 w-5" />} title="Agenda e alertas" />
          <div className="mt-4 space-y-3">
            <MissionMeta label="Eventos proximos" value={`${upcomingEvents.slice(0, 7).length}`} />
            <MissionMeta label="Tarefas criticas" value={`${criticalTasks.length}`} />
            <MissionMeta label="Ocorrencias abertas" value={`${openIncidents.length}`} />
            <p className="text-xs leading-5 text-brand-teal/60">Use Agenda, Atividades e Ocorrencias como sensores. A decisao consolidada fica nesta home.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BusinessStrategyView({
  objectives,
  missions,
  saveObjectives,
  openMission,
}: {
  objectives: BusinessObjective[];
  missions: NorwynMission[];
  saveObjectives: (objectives: BusinessObjective[]) => void;
  openMission: (id: string) => void;
}) {
  function patchObjective(id: string, patch: Partial<BusinessObjective>) {
    saveObjectives(objectives.map((objective) => (objective.id === id ? { ...objective, ...patch, updatedAt: new Date().toISOString() } : objective)));
  }

  function restoreDefaults() {
    saveObjectives(ensureDefaultBusinessObjectives(objectives));
  }

  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle icon={<BriefcaseBusiness className="h-5 w-5" />} title="Business Strategy" />
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/70">
              Objetivos deixam de ser apenas OKRs e passam a orientar missoes, recomendacoes, briefings e leituras dos sensores operacionais.
            </p>
          </div>
          <button type="button" onClick={restoreDefaults} className="h-9 rounded-md border border-brand-sand px-3 text-sm font-bold text-brand-teal">Garantir objetivos base</button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {objectives.map((objective) => {
          const relatedMissions = missions.filter((mission) => mission.strategicObjectiveId === objective.id && mission.status !== "Arquivada");
          return (
            <Card key={objective.id} className="border-[#E9CBD1] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase text-brand-clay">{objective.category} - {objective.horizon}</p>
                  <h3 className="mt-2 text-lg font-semibold text-brand-teal">{objective.name}</h3>
                </div>
                <span className="rounded-full bg-brand-cream px-2 py-1 text-[11px] font-black text-brand-teal">{objective.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-brand-teal/70">{objective.description}</p>
              <div className="mt-4 grid gap-2">
                <MissionMeta label="Meta" value={objective.target} />
                <MissionMeta label="Prazo" value={`${objective.startDate} - ${objective.endDate}`} />
                <MissionMeta label="Progresso" value={`${objective.progress}%`} />
                <MissionMeta label="KPIs" value={objective.kpis.join(", ")} />
              </div>
              <div className="mt-4 h-2 rounded-full bg-brand-sand/45">
                <div className="h-2 rounded-full bg-brand-clay" style={{ width: `${Math.min(100, Math.max(0, objective.progress))}%` }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {businessStatuses.map((status) => (
                  <button key={status} type="button" onClick={() => patchObjective(objective.id, { status })} className={`h-8 rounded-md border px-2 text-[11px] font-bold ${objective.status === status ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
                    {status}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-brand-sand bg-white/70 p-3">
                <p className="text-[11px] font-black uppercase text-brand-clay">Missoes relacionadas</p>
                {relatedMissions.length ? relatedMissions.slice(0, 4).map((mission) => (
                  <button key={mission.id} type="button" onClick={() => openMission(mission.id)} className="mt-2 block text-left text-sm font-semibold text-brand-teal underline-offset-4 hover:underline">
                    {mission.name}
                  </button>
                )) : <p className="mt-2 text-sm text-brand-teal/60">Nenhuma missao vinculada ainda.</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function KnowledgeBaseView({ knowledgeEvents, signals }: { knowledgeEvents: KnowledgeEvent[]; signals: NorwynSignal[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="Knowledge Base" />
        <p className="mt-2 text-sm leading-6 text-brand-teal/70">Aprendizados locais gerados por missoes, briefings, drafts, Shadow Mode e execucoes registradas.</p>
        <div className="mt-4 space-y-3">
          {knowledgeEvents.length ? knowledgeEvents.map((event) => (
            <article key={event.id} className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-sm font-semibold text-brand-teal">{event.title}</p>
              <p className="mt-1 text-xs text-brand-teal/60">{event.type} - {event.status} - {new Date(event.createdAt).toLocaleString("pt-BR")}</p>
              <p className="mt-2 text-xs text-brand-teal/55">{event.evidence.join("; ")}</p>
            </article>
          )) : <EmptyState>Nenhum aprendizado persistido ainda.</EmptyState>}
        </div>
      </Card>
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Target className="h-5 w-5" />} title="Signals ativos" />
        <div className="mt-4 space-y-3">
          {signals.slice(0, 10).map((signal) => (
            <article key={signal.id} className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-sm font-semibold text-brand-teal">{signal.title}</p>
              <p className="mt-1 text-xs text-brand-teal/60">{signal.category} - score {signal.final_score}</p>
            </article>
          ))}
          {!signals.length ? <EmptyState>Nenhum signal ativo registrado.</EmptyState> : null}
        </div>
      </Card>
    </div>
  );
}

function ArchitectureGuideView() {
  const layers = [
    ["Dados Operacionais", "Instagram, Ads, Comercial, Agenda, Atividades, Ocorrencias e Financeiro alimentam a Norwyn."],
    ["Business Strategy", "Define a direcao da empresa e os objetivos que devem orientar qualquer decisao."],
    ["Mission Engine", "Transforma objetivos em missoes operacionais com meta, prazo, KPIs e proximo passo."],
    ["Intelligence", "Interpreta sinais sem assumir que o foco sempre sera o mesmo produto."],
    ["Evidence Engine", "Mostra as evidencias que justificam recomendacoes e reduz decisoes genericas."],
    ["Strategy Planner", "Organiza a decisao: o que fazer agora, por que e com qual confianca."],
    ["Briefing Center", "Converte uma decisao em especificacao revisavel antes da execucao."],
    ["Studio e Shadow", "Prepara rascunhos e compara a execucao real com a estrategia esperada."],
    ["Knowledge Base", "Preserva aprendizados para orientar proximas missoes."],
  ];
  const faq = [
    ["Quero saber qual conteudo repetir.", "Use Evidence ou Winning Plays na Executive Home."],
    ["Quero organizar minha empresa.", "Comece por Business Strategy."],
    ["Quero saber o que fazer hoje.", "Abra a Executive Home."],
    ["Quero produzir conteudo.", "Use Briefing Center e Studio."],
    ["Quero entender por que a Norwyn recomendou isso.", "Abra Evidence e leia as evidencias da recomendacao."],
  ];
  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Bot className="h-5 w-5" />} title="Como a Norwyn funciona" />
        <p className="mt-2 max-w-4xl text-sm leading-6 text-brand-teal/70">
          A Norwyn nao substitui os modulos operacionais. Ela usa esses modulos como sensores para responder o que aconteceu, o que merece atencao e qual decisao faz sentido agora.
        </p>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {layers.map(([title, description], index) => (
          <article key={title} className="rounded-md border border-brand-sand bg-white/85 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Camada {index + 1}</p>
            <h3 className="mt-2 text-base font-semibold text-brand-teal">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-brand-teal/65">{description}</p>
          </article>
        ))}
      </div>
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="Perguntas frequentes" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {faq.map(([question, answer]) => (
            <div key={question} className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-sm font-semibold text-brand-teal">{question}</p>
              <p className="mt-1 text-sm text-brand-teal/65">{answer}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MissionCenterView({
  context,
  businessObjectives,
  missions,
  activeMission,
  detailMission,
  suggestions,
  opportunities,
  knowledgeEvents,
  editMission,
  newMission,
  createFromSuggestion,
  ignoreSuggestion,
  setActiveMission,
  setDetailMission,
  updateMission,
  duplicateMission,
  runMissionEngine,
}: {
  context: NorwynContext;
  businessObjectives: BusinessObjective[];
  missions: NorwynMission[];
  activeMission: NorwynMission | null;
  detailMission: NorwynMission | null;
  suggestions: NorwynMission[];
  opportunities: BriefingSeed[];
  knowledgeEvents: KnowledgeEvent[];
  editMission: (mission: NorwynMission) => void;
  newMission: () => void;
  createFromSuggestion: (mission: NorwynMission) => void;
  ignoreSuggestion: (id: string) => void;
  setActiveMission: (id: string) => void;
  setDetailMission: (id: string) => void;
  updateMission: (id: string, patch: Partial<NorwynMission>) => void;
  duplicateMission: (mission: NorwynMission) => void;
  runMissionEngine: () => void;
}) {
  const visibleMissions = missions.filter((mission) => mission.status !== "Arquivada");
  const executiveSummary = buildExecutiveSummary(context, activeMission, opportunities);
  const activeObjective = activeMission?.strategicObjectiveId
    ? businessObjectives.find((objective) => objective.id === activeMission.strategicObjectiveId)
    : null;

  return (
    <div className="space-y-4">
      <ExecutiveSummaryCard summary={executiveSummary} knowledgeEvents={knowledgeEvents} />

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Mission Center</p>
            <h2 className="mt-1 text-xl font-semibold text-brand-teal">Missoes ativas e sugeridas</h2>
            <p className="mt-2 text-sm text-brand-teal/65">
              As metas e KPIs passam a existir dentro de uma missao. O modulo Objetivos continua funcionando, mas a direcao da operacao fica aqui.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={runMissionEngine} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-teal px-3 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4" /> Rodar Mission Engine
            </button>
            <button type="button" onClick={newMission} className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal">
              <Plus className="h-4 w-4" /> Nova missao
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <MissionSummary mission={activeMission} objective={activeObjective} context={context} />
          <div className="grid gap-3 md:grid-cols-3">
            <MiniCounter label="Principal" value={missions.filter((mission) => mission.priority === "Principal" && mission.status !== "Arquivada").length} />
            <MiniCounter label="Estrategicas" value={missions.filter((mission) => mission.priority === "Estrategica" && mission.status !== "Arquivada").length} />
            <MiniCounter label="Continuas" value={missions.filter((mission) => mission.priority === "Continua" && mission.status !== "Arquivada").length} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionTitle icon={<Flag className="h-5 w-5" />} title="Missoes" />
          <div className="mt-4 space-y-3">
            {visibleMissions.length ? (
              visibleMissions.map((mission) => (
                <MissionListItem
                  key={mission.id}
                  mission={mission}
                  active={activeMission?.id === mission.id}
                  select={() => {
                    setDetailMission(mission.id);
                    if (mission.priority === "Principal") setActiveMission(mission.id);
                  }}
                  edit={() => editMission(mission)}
                  duplicate={() => duplicateMission(mission)}
                  archive={() => updateMission(mission.id, { status: "Arquivada" })}
                  close={() => updateMission(mission.id, { status: "Encerrada" })}
                />
              ))
            ) : (
              <EmptyState>Nenhuma missao criada ainda. Use uma sugestao ou crie manualmente.</EmptyState>
            )}
          </div>
        </Card>

        <MissionDetail mission={detailMission} context={context} updateMission={updateMission} editMission={editMission} />
      </div>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="Missoes sugeridas" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className="rounded-md border border-brand-sand bg-white/85 p-4">
              <p className="text-[11px] font-black uppercase text-brand-clay">{suggestion.type}</p>
              <h3 className="mt-2 text-base font-semibold text-brand-teal">{suggestion.name}</h3>
              <p className="mt-2 text-sm leading-6 text-brand-teal/65">{suggestion.objective}</p>
              <p className="mt-3 text-xs font-bold text-brand-teal/55">Evidencias: {suggestion.notes}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => createFromSuggestion(suggestion)} className="h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">Criar missao</button>
                <button type="button" onClick={() => ignoreSuggestion(suggestion.id)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Ignorar</button>
                <button type="button" onClick={() => window.alert(suggestion.notes)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Ver evidencias</button>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ExecutiveSummaryCard({
  summary,
  knowledgeEvents,
}: {
  summary: ReturnType<typeof buildExecutiveSummary>;
  knowledgeEvents: KnowledgeEvent[];
}) {
  return (
    <Card className="border-[#E9CBD1] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase text-brand-clay">Resumo executivo</p>
          <h2 className="mt-1 text-xl font-semibold text-brand-teal">{summary.title}</h2>
          <p className="mt-2 text-sm leading-6 text-brand-teal/70">
            {summary.contextLabel}: {summary.contextReason} Meta: {summary.goalText}. Atual: {summary.actualText}. Restante:
            {" "}{summary.remainingText}. Desvio: {summary.deviationText}. Oportunidade atual: {summary.opportunity}.
          </p>
        </div>
        <div className="grid min-w-[220px] gap-2">
          <MissionMeta label="Proximo passo" value={summary.action} />
          <MissionMeta label="Produto/contexto" value={summary.productContext} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MissionMeta label="Meta" value={summary.goalText} />
        <MissionMeta label="Atual" value={summary.actualText} />
        <MissionMeta label="Progresso" value={summary.progressText} />
        <MissionMeta label="Contexto operacional" value={summary.contextLabel} />
        <MissionMeta label="Confianca" value={`${summary.confidence.label} (${summary.confidence.score}%)`} />
        <MissionMeta label="Limites dos dados" value={summary.dataLimits} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-brand-sand bg-white/75 p-3">
          <p className="text-[11px] font-black uppercase text-brand-clay">Riscos priorizados</p>
          {summary.risks.length ? (
            <ul className="mt-2 space-y-1 text-sm text-brand-teal/70">
              {summary.risks.slice(0, 5).map((risk) => (
                <li key={risk.label}>- {risk.count} {risk.label.toLowerCase()}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-brand-teal/60">Nenhum risco operacional dominante no recorte.</p>
          )}
        </div>
        <div className="rounded-md border border-brand-sand bg-white/75 p-3">
          <p className="text-[11px] font-black uppercase text-brand-clay">Por que confiamos</p>
          <ul className="mt-2 space-y-1 text-sm text-brand-teal/70">
            {summary.confidence.reasons.slice(0, 5).map((reason) => <li key={reason}>- {reason}</li>)}
          </ul>
          <p className="mt-2 text-xs text-brand-teal/55">Limitacoes: {summary.confidence.limits.join("; ")}.</p>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/35 p-3">
        <p className="text-[11px] font-black uppercase text-brand-clay">Knowledge Base</p>
        {knowledgeEvents.length ? (
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {knowledgeEvents.slice(0, 3).map((event) => (
              <article key={event.id} className="rounded-md bg-white/75 p-3">
                <p className="text-sm font-semibold text-brand-teal">{event.title}</p>
                <p className="mt-1 text-xs text-brand-teal/60">{event.status} - {new Date(event.createdAt).toLocaleString("pt-BR")}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-brand-teal/60">
            Nenhum aprendizado persistido ainda. Rode o Mission Engine ou salve briefings para iniciar o historico local.
          </p>
        )}
      </div>
    </Card>
  );
}

function MissionSummary({
  mission,
  objective,
  context,
}: {
  mission: NorwynMission | null;
  objective?: BusinessObjective | null;
  context: NorwynContext;
}) {
  if (!mission) {
    return (
      <article className="rounded-md border border-brand-sand bg-white/90 p-4">
        <p className="text-[11px] font-black uppercase text-brand-clay">Missao Principal</p>
        <h3 className="mt-2 text-lg font-semibold text-brand-teal">Nenhuma missao principal definida</h3>
        <p className="mt-2 text-sm text-brand-teal/65">Crie uma missao Principal para orientar o Strategy.</p>
      </article>
    );
  }
  const goal = missionGoalDetails(mission, context);
  return (
    <article className="rounded-md border border-brand-sand bg-white/90 p-4">
      <p className="text-[11px] font-black uppercase text-brand-clay">Missao Principal</p>
      <h3 className="mt-2 text-xl font-semibold text-brand-teal">{mission.name}</h3>
      <p className="mt-2 text-sm leading-6 text-brand-teal/70">{mission.objective}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MissionMeta label="Status" value={mission.status} />
        <MissionMeta label="Objetivo estrategico" value={objective?.name ?? "Sem vinculo"} />
        <MissionMeta label="Periodo" value={`${mission.startDate} - ${mission.endDate}`} />
        <MissionMeta label="Meta" value={`${mission.mainGoal} (${mission.goalUnit})`} />
        <MissionMeta label="Atual" value={goal.actualText} />
        <MissionMeta label="Restante" value={goal.remainingText} />
        <MissionMeta label="Desvio" value={goal.deviationText} />
      </div>
    </article>
  );
}

function MissionDetail({
  mission,
  context,
  updateMission,
  editMission,
}: {
  mission: NorwynMission | null;
  context: NorwynContext;
  updateMission: (id: string, patch: Partial<NorwynMission>) => void;
  editMission: (mission: NorwynMission) => void;
}) {
  const [tab, setTab] = useState("Resumo");
  const [learningTitle, setLearningTitle] = useState("");
  const [learningResult, setLearningResult] = useState("");
  if (!mission) {
    return (
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <EmptyState>Selecione uma missao para abrir os detalhes.</EmptyState>
      </Card>
    );
  }
  const kpis = missionKpis(mission, context);
  const goalDetails = missionGoalDetails(mission, context);
  const contextLabel = operationalContextFor(context, mission);
  const risks = buildOperationalRisks(context, mission);
  const confidence = confidenceExplanation(context, mission, buildOpportunityRadar(context, mission));
  const tabs = ["Resumo", "KPIs", "Plano", "Recomendacoes", "Timeline", "Checklist", "Aprendizados"];

  function updateChecklist(itemId: string, status: MissionChecklistItem["status"]) {
    updateMission(mission!.id, {
      checklist: mission!.checklist.map((item) => (item.id === itemId ? { ...item, status } : item)),
    });
  }

  function addLearning() {
    const title = learningTitle.trim();
    const result = learningResult.trim();
    if (!title && !result) return;
    updateMission(mission!.id, {
      learnings: [
        ...mission!.learnings,
        {
          id: makeId("learning"),
          title: title || "Aprendizado da missao",
          result: result || "Sem resultado detalhado.",
        },
      ],
    });
    setLearningTitle("");
    setLearningResult("");
  }

  return (
    <Card className="border-[#E9CBD1] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase text-brand-clay">Detalhe da missao</p>
          <h2 className="mt-1 text-xl font-semibold text-brand-teal">{mission.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => editMission(mission)} className="inline-flex h-8 items-center gap-2 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">
            <Pencil className="h-4 w-4" /> Editar
          </button>
          <button type="button" onClick={() => editMission(mission)} className="inline-flex h-8 items-center gap-2 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">
            <Target className="h-4 w-4" /> Editar meta
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <MissionMeta label="Meta" value={goalDetails.targetText} />
        <MissionMeta label="Atual" value={goalDetails.actualText} />
        <MissionMeta label="Restante" value={goalDetails.remainingText} />
        <MissionMeta label="Progresso" value={goalDetails.progressText} />
        <MissionMeta label="Dias restantes" value={goalDetails.daysText} />
        <MissionMeta label="Previsao" value={goalDetails.forecastText} />
        <MissionMeta label="Status" value={goalDetails.statusText} />
        <MissionMeta label="Desvio" value={goalDetails.deviationText} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`h-8 rounded-md border px-3 text-xs font-bold ${tab === item ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Resumo" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MissionMeta label="Tipo" value={mission.type} />
          <MissionMeta label="Status" value={mission.status} />
          <MissionMeta label="Progresso temporal" value={`${missionProgress(mission)}%`} />
          <MissionMeta label="Responsavel" value={mission.owner || "Nao definido"} />
          <div className="md:col-span-2 rounded-md border border-brand-sand p-3">
            <p className="text-[11px] font-black uppercase text-brand-clay">Objetivo</p>
            <p className="mt-1 text-sm leading-6 text-brand-teal/75">{mission.objective}</p>
          </div>
        </div>
      ) : null}

      {tab === "KPIs" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {kpis.map((kpi) => <MissionMeta key={kpi.label} label={kpi.label} value={kpi.value} />)}
        </div>
      ) : null}

      {tab === "Plano" || tab === "Checklist" ? (
        <div className="mt-4 space-y-3">
          {mission.checklist.map((item) => (
            <div key={item.id} className="rounded-md border border-brand-sand p-3">
              <p className="text-sm font-semibold text-brand-teal">{item.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["pendente", "feito", "ignorado", "parcial"] as MissionChecklistItem["status"][]).map((status) => (
                  <button key={status} type="button" onClick={() => updateChecklist(item.id, status)} className={`h-8 rounded-md border px-3 text-xs font-bold ${item.status === status ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "Recomendacoes" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-brand-sand bg-brand-cream/35 p-4 text-sm leading-6 text-brand-teal/75">
            <p className="font-semibold text-brand-teal">{contextLabel.label}</p>
            <p className="mt-1">{contextLabel.reason}</p>
            <p className="mt-2">A Mission Engine limita as evidencias ao contexto da missao e ao produto: {missionProductLabels(mission).join(", ") || "sem produto definido"}.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-[11px] font-black uppercase text-brand-clay">Riscos ordenados</p>
              {risks.length ? risks.slice(0, 6).map((risk) => (
                <p key={risk.label} className="mt-2 text-sm text-brand-teal/70">{risk.count} {risk.label.toLowerCase()}</p>
              )) : <p className="mt-2 text-sm text-brand-teal/60">Sem risco dominante.</p>}
            </div>
            <div className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-[11px] font-black uppercase text-brand-clay">Confianca</p>
              <p className="mt-2 text-sm font-semibold text-brand-teal">{confidence.label} ({confidence.score}%)</p>
              <ul className="mt-2 space-y-1 text-sm text-brand-teal/70">
                {confidence.reasons.map((reason) => <li key={reason}>- {reason}</li>)}
              </ul>
              <p className="mt-2 text-xs text-brand-teal/55">Limitacoes: {confidence.limits.join("; ")}.</p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <div className="mt-4 grid gap-2 text-sm text-brand-teal/70">
          <p>- Criada em {new Date(mission.createdAt).toLocaleString("pt-BR")}</p>
          <p>- Inicio previsto em {mission.startDate}</p>
          <p>- Fim previsto em {mission.endDate}</p>
          <p>- Status atual: {mission.status}</p>
        </div>
      ) : null}

      {tab === "Aprendizados" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-brand-sand bg-white/80 p-4">
            <p className="text-sm font-semibold text-brand-teal">Registrar aprendizado</p>
            <div className="mt-3 grid gap-3">
              <input
                value={learningTitle}
                onChange={(event) => setLearningTitle(event.target.value)}
                placeholder="O que funcionou ou nao funcionou?"
                className="form-input"
              />
              <textarea
                value={learningResult}
                onChange={(event) => setLearningResult(event.target.value)}
                placeholder="Hipotese, resultado, comentario ou proximo ajuste."
                className="form-input min-h-20"
              />
              <button type="button" onClick={addLearning} className="h-9 w-fit rounded-md bg-brand-teal px-4 text-sm font-bold text-white">
                Adicionar aprendizado
              </button>
            </div>
          </div>
          {mission.learnings.length ? (
            mission.learnings.map((learning) => (
              <article key={learning.id} className="rounded-md border border-brand-sand bg-brand-cream/35 p-3">
                <p className="text-sm font-semibold text-brand-teal">{learning.title}</p>
                <p className="mt-1 text-sm leading-6 text-brand-teal/70">{learning.result}</p>
              </article>
            ))
          ) : (
            <EmptyState>Nenhum aprendizado registrado para esta missao.</EmptyState>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function MissionListItem({
  mission,
  active,
  select,
  edit,
  duplicate,
  archive,
  close,
}: {
  mission: NorwynMission;
  active: boolean;
  select: () => void;
  edit: () => void;
  duplicate: () => void;
  archive: () => void;
  close: () => void;
}) {
  return (
    <article className={`rounded-md border p-3 ${active ? "border-brand-teal bg-brand-cream/70" : "border-brand-sand bg-white/85"}`}>
      <button type="button" onClick={select} className="block w-full text-left">
        <p className="text-[11px] font-black uppercase text-brand-clay">{mission.priority} - {mission.status}</p>
        <h3 className="mt-1 text-sm font-semibold text-brand-teal">{mission.name}</h3>
        <p className="mt-1 text-xs text-brand-teal/60">{mission.type} | {mission.startDate} a {mission.endDate}</p>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <IconButton title="Editar" onClick={edit}><Pencil className="h-4 w-4" /></IconButton>
        <IconButton title="Duplicar" onClick={duplicate}><Copy className="h-4 w-4" /></IconButton>
        <IconButton title="Encerrar" onClick={close}><CheckCircle2 className="h-4 w-4" /></IconButton>
        <IconButton title="Arquivar" onClick={archive}><Archive className="h-4 w-4" /></IconButton>
      </div>
    </article>
  );
}

function MissionForm({
  mission,
  businessObjectives,
  close,
  save,
}: {
  mission: NorwynMission;
  businessObjectives: BusinessObjective[];
  close: () => void;
  save: (mission: NorwynMission) => void;
}) {
  const [draft, setDraft] = useState<NorwynMission>(mission);
  const toggleSource = (source: string) => {
    setDraft((current) => ({
      ...current,
      sources: current.sources.includes(source)
        ? current.sources.filter((item) => item !== source)
        : [...current.sources, source],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4">
      <Card className="my-6 w-full max-w-4xl border-[#E9CBD1] bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Mission OS</p>
            <h2 className="mt-1 text-xl font-semibold text-brand-teal">{mission.name ? "Editar missao" : "Nova missao"}</h2>
          </div>
          <button type="button" onClick={close} className="text-sm font-bold text-brand-teal">Fechar</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Nome da missao"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="form-input" /></Field>
          <Field label="Objetivo estrategico">
            <select value={draft.strategicObjectiveId ?? ""} onChange={(event) => setDraft({ ...draft, strategicObjectiveId: event.target.value })} className="form-input">
              <option value="">Sem objetivo vinculado</option>
              {businessObjectives.filter((objective) => objective.status !== "Arquivado").map((objective) => (
                <option key={objective.id} value={objective.id}>{objective.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Responsavel"><input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} className="form-input" /></Field>
          <Field label="Tipo"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as MissionType })} className="form-input">{missionTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as MissionStatus })} className="form-input">{missionStatuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Inicio"><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className="form-input" /></Field>
          <Field label="Fim"><input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className="form-input" /></Field>
          <Field label="Prioridade"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as MissionPriority })} className="form-input">{missionPriorities.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Unidade da meta"><input value={draft.goalUnit} onChange={(event) => setDraft({ ...draft, goalUnit: event.target.value })} className="form-input" /></Field>
          <Field label="Objetivo principal"><textarea value={draft.objective} onChange={(event) => setDraft({ ...draft, objective: event.target.value })} className="form-input min-h-24" /></Field>
          <Field label="Meta principal"><textarea value={draft.mainGoal} onChange={(event) => setDraft({ ...draft, mainGoal: event.target.value })} className="form-input min-h-24" /></Field>
          <Field label="Produtos relacionados"><textarea value={draft.products} onChange={(event) => setDraft({ ...draft, products: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Observacoes"><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="form-input min-h-20" /></Field>
        </div>
        <div className="mt-4">
          <p className="text-xs font-black uppercase text-brand-clay">Modulos / fontes relacionados</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sourceOptions.map((source) => (
              <button key={source} type="button" onClick={() => toggleSource(source)} className={`h-8 rounded-md border px-3 text-xs font-bold ${draft.sources.includes(source) ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
                {source}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-md border border-brand-sand px-4 text-sm font-bold text-brand-teal">Cancelar</button>
          <button type="button" onClick={() => save(draft)} className="h-9 rounded-md bg-brand-teal px-4 text-sm font-bold text-white">Salvar missao</button>
        </div>
      </Card>
    </div>
  );
}

function BriefingCenterView({
  briefings,
  drafts,
  missions,
  opportunities,
  openBriefing,
  editBriefing,
  updateBriefing,
  generateDraft,
}: {
  briefings: NorwynBriefing[];
  drafts: NorwynDraft[];
  missions: NorwynMission[];
  opportunities: BriefingSeed[];
  openBriefing: (seed: BriefingSeed) => void;
  editBriefing: (briefing: NorwynBriefing) => void;
  updateBriefing: (id: string, patch: Partial<NorwynBriefing>) => void;
  generateDraft: (briefing: NorwynBriefing) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle icon={<ClipboardList className="h-5 w-5" />} title="Briefing Center" />
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/70">
              Briefings transformam recomendacoes em especificacoes estrategicas. Nada e publicado ou enviado automaticamente.
            </p>
          </div>
          <button type="button" onClick={() => openBriefing({ title: "Novo briefing", objective: "", context: "", evidence: [] })} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-teal px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Novo briefing
          </button>
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="Opportunity Radar" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opportunity) => (
            <article key={`${opportunity.title}-${opportunity.rule}`} className="rounded-md border border-brand-sand bg-white/85 p-4">
              <p className="text-[11px] font-black uppercase text-brand-clay">{opportunity.sourceModule} - {opportunity.priority}</p>
              <h3 className="mt-2 text-base font-semibold text-brand-teal">{opportunity.title}</h3>
              <p className="mt-2 text-sm leading-6 text-brand-teal/65">{opportunity.objective}</p>
              <p className="mt-2 text-xs text-brand-teal/55">Regra: {opportunity.rule}</p>
              <button type="button" onClick={() => openBriefing(opportunity)} className="mt-4 h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">Gerar briefing</button>
            </article>
          ))}
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Flag className="h-5 w-5" />} title="Briefings salvos" />
        <div className="mt-4 grid gap-3">
          {briefings.length ? briefings.map((briefing) => {
            const mission = missions.find((item) => item.id === briefing.missionId);
            const hasDraft = drafts.some((draft) => draft.briefingId === briefing.id && draft.status !== "arquivado");
            return (
              <article key={briefing.id} className="rounded-md border border-brand-sand bg-white/90 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase text-brand-clay">{briefing.type} - {briefing.status}</p>
                    <h3 className="mt-1 text-base font-semibold text-brand-teal">{briefing.title}</h3>
                    <p className="mt-1 text-sm text-brand-teal/60">Missao: {mission?.name ?? "sem missao vinculada"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => editBriefing(briefing)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Editar</button>
                    <button type="button" onClick={() => generateDraft(briefing)} className="h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">{hasDraft ? "Gerar outro draft" : "Gerar draft"}</button>
                    <button type="button" onClick={() => updateBriefing(briefing.id, { status: "arquivado" })} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Arquivar</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MissionMeta label="Fonte" value={briefing.sourceModule} />
                  <MissionMeta label="Confianca" value={`${briefing.confidence}%`} />
                  <MissionMeta label="Regra" value={briefing.rule} />
                </div>
                <p className="mt-3 text-sm leading-6 text-brand-teal/70">{briefing.objective}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MissionMeta label="Produto" value={briefing.product || "nao definido"} />
                  <MissionMeta label="Mensagem central" value={briefing.centralMessage || briefing.context || "nao definida"} />
                  <MissionMeta label="CTA" value={briefing.cta || "nao definido"} />
                </div>
                {briefing.evidence.length ? (
                  <p className="mt-3 text-xs font-semibold text-brand-teal/55">
                    Evidencias: {briefing.evidence.slice(0, 3).join(" | ")}
                  </p>
                ) : null}
              </article>
            );
          }) : <EmptyState>Nenhum briefing salvo ainda.</EmptyState>}
        </div>
      </Card>
    </div>
  );
}

function StudioDraftView({
  drafts,
  briefings,
  missions,
  updateDraft,
  duplicateDraft,
  sendToShadow,
}: {
  drafts: NorwynDraft[];
  briefings: NorwynBriefing[];
  missions: NorwynMission[];
  updateDraft: (id: string, patch: Partial<NorwynDraft>) => void;
  duplicateDraft: (draft: NorwynDraft) => void;
  sendToShadow: (draft: NorwynDraft) => void;
}) {
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="Studio Draft" />
        <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/70">
          Rascunhos textuais gerados por template. A Norwyn organiza alternativas em Shadow Mode, sem publicar nada.
        </p>
      </Card>
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<ClipboardList className="h-5 w-5" />} title="Draft Queue" />
        <div className="mt-4 grid gap-3">
          {drafts.length ? drafts.map((draft) => {
            const briefing = briefings.find((item) => item.id === draft.briefingId);
            const mission = missions.find((item) => item.id === draft.missionId);
            const expanded = expandedDraftId === draft.id;
            return (
              <article key={draft.id} className="rounded-md border border-brand-sand bg-white/90 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase text-brand-clay">{draft.type} - {draft.status} - gerado por {draft.generationMode}</p>
                    <h3 className="mt-1 text-base font-semibold text-brand-teal">{draft.title}</h3>
                    <p className="mt-1 text-sm text-brand-teal/60">Briefing: {briefing?.title ?? "sem briefing"} | Missao: {mission?.name ?? "sem missao"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select value={draft.status} onChange={(event) => updateDraft(draft.id, { status: event.target.value as DraftStatus })} className="form-input h-8 py-0 text-xs">
                      {draftStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                    <button type="button" onClick={() => setExpandedDraftId(expanded ? null : draft.id)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">{expanded ? "Ocultar copy" : "Ver copy"}</button>
                    <button type="button" onClick={() => duplicateDraft(draft)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Duplicar</button>
                    <button type="button" onClick={() => sendToShadow(draft)} className="h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">Enviar ao Shadow</button>
                    <button type="button" onClick={() => updateDraft(draft.id, { status: "arquivado" })} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Arquivar</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <MissionMeta label="Produto" value={briefing?.product || "nao definido"} />
                  <MissionMeta label="Origem" value={briefing?.sourceModule || "Norwyn"} />
                  <MissionMeta label="Confianca" value={briefing ? `${briefing.confidence}%` : "-"} />
                </div>
                <ol className="mt-3 grid gap-2 text-sm leading-6 text-brand-teal/70">
                  {(expanded ? draft.content : draft.content.slice(0, 4)).map((line, index) => <li key={`${draft.id}-${index}`}>{index + 1}. {line}</li>)}
                </ol>
                {!expanded && draft.content.length > 4 ? (
                  <p className="mt-2 text-xs font-semibold text-brand-teal/50">+ {draft.content.length - 4} linha(s) de copy ocultas. Clique em Ver copy.</p>
                ) : null}
                <LearningControls execution={draft.execution} result={draft.result} onChange={(patch) => updateDraft(draft.id, patch)} />
              </article>
            );
          }) : <EmptyState>Nenhum rascunho gerado. Crie um briefing e clique em Gerar draft.</EmptyState>}
        </div>
      </Card>
      <TrendWatchPreview />
    </div>
  );
}

function ShadowModeView({
  actions,
  briefings,
  drafts,
  missions,
  editAction,
  newAction,
  updateAction,
}: {
  actions: ShadowAction[];
  briefings: NorwynBriefing[];
  drafts: NorwynDraft[];
  missions: NorwynMission[];
  editAction: (action: ShadowAction) => void;
  newAction: () => void;
  updateAction: (id: string, patch: Partial<ShadowAction>) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle icon={<Eye className="h-5 w-5" />} title="Shadow Mode" />
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/70">
              Registro paralelo para comparar o que o marketing executou com o que a Norwyn recomendou. Nao confronta nem publica nada.
            </p>
          </div>
          <button type="button" onClick={newAction} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-teal px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Registrar acao externa
          </button>
        </div>
      </Card>
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Repeat className="h-5 w-5" />} title="Comparativo Norwyn x Marketing" />
        <div className="mt-4 grid gap-3">
          {actions.length ? actions.map((action) => {
            const mission = missions.find((item) => item.id === action.missionId);
            const briefing = briefings.find((item) => item.id === action.relatedBriefingId);
            const draft = drafts.find((item) => item.id === action.relatedDraftId);
            return (
              <article key={action.id} className="rounded-md border border-brand-sand bg-white/90 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase text-brand-clay">{action.date} - {action.channel} - {action.origin} - {action.status}</p>
                    <h3 className="mt-1 text-base font-semibold text-brand-teal">{action.type}: {action.theme || "Coletar sinais da audiencia"}</h3>
                    <p className="mt-1 text-sm text-brand-teal/60">Missao: {mission?.name ?? "sem missao"} | Briefing: {briefing?.title ?? "sem briefing"} | Draft: {draft?.title ?? "sem draft"}</p>
                  </div>
                  <button type="button" onClick={() => editAction(action)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Editar</button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <MissionMeta label="Origem" value={action.origin} />
                  <MissionMeta label="Alcance" value={action.reach} />
                  <MissionMeta label="Comentarios" value={action.comments} />
                  <MissionMeta label="Vendas relacionadas" value={action.relatedSales} />
                </div>
                <div className="mt-3 rounded-md border border-brand-sand bg-brand-cream/35 p-3 text-sm leading-6 text-brand-teal/70">
                  <strong>Comparativo:</strong> {action.origin} executou {action.type}.{" "}
                  {draft ? `A Norwyn sugeria "${draft.title}".` : "Ainda nao ha draft Norwyn vinculado para comparar."}
                </div>
                <p className="mt-3 text-sm leading-6 text-brand-teal/70">{action.notes || action.perceivedObjective || "Sem observacao registrada."}</p>
                <LearningControls execution={action.execution} result={action.result} onChange={(patch) => updateAction(action.id, patch)} />
              </article>
            );
          }) : <EmptyState>Nenhuma acao externa registrada ainda.</EmptyState>}
        </div>
      </Card>
    </div>
  );
}

function LearningControls({
  execution,
  result,
  onChange,
}: {
  execution: ExecutionStatus;
  result: ExecutionResult;
  onChange: (patch: { execution?: ExecutionStatus; result?: ExecutionResult }) => void;
}) {
  return (
    <div className="mt-4 rounded-md bg-brand-cream/45 p-3">
      <p className="text-[11px] font-black uppercase text-brand-clay">Learning</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {executionStatuses.map((status) => (
          <button key={status} type="button" onClick={() => onChange({ execution: status })} className={`h-8 rounded-md border px-3 text-xs font-bold ${execution === status ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
            {status}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {executionResults.map((item) => (
          <button key={item} type="button" onClick={() => onChange({ result: item })} className={`h-8 rounded-md border px-3 text-xs font-bold ${result === item ? "border-brand-clay bg-brand-clay text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrendWatchPreview() {
  return (
    <Card className="border-[#E9CBD1] p-4 sm:p-5">
      <SectionTitle icon={<Eye className="h-5 w-5" />} title="Trend Watch - em preparacao" />
      <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-teal/70">
        Futuramente esta area identificara tendencias compativeis com missao, tom de voz e contexto da especialista.
        A Norwyn nao deve copiar trends aleatorias: apenas adaptar sinais coerentes com autoridade, saude, educacao,
        produto e missao ativa.
      </p>
    </Card>
  );
}

function EvidenceEngineView({
  evidenceEngine,
  openBriefing,
}: {
  evidenceEngine: ReturnType<typeof buildEvidenceEngine>;
  openBriefing: (recommendation: NorwynEvidenceRecommendation) => void;
}) {
  const [soldProductFilter, setSoldProductFilter] = useState("all");
  const [contentFilter, setContentFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [missionFilter, setMissionFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("30");
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const products = useMemo(
    () =>
      [...new Set(evidenceEngine.launchPatterns.flatMap((pattern) => [pattern.productName, ...pattern.associatedProducts]).map((product) => friendlyProductName(product)).filter(Boolean))].sort(),
    [evidenceEngine.launchPatterns],
  );
  const contentOptions = useMemo(
    () => [...new Set(evidenceEngine.launchPatterns.map((pattern) => pattern.format).filter(Boolean))].sort(),
    [evidenceEngine.launchPatterns],
  );
  const campaigns = useMemo(
    () => [...new Set(evidenceEngine.launchPatterns.map((pattern) => pattern.campaignId).filter(Boolean) as string[])].sort(),
    [evidenceEngine.launchPatterns],
  );
  const missions = useMemo(
    () => [...new Set(evidenceEngine.launchPatterns.map((pattern) => pattern.missionId).filter(Boolean) as string[])].sort(),
    [evidenceEngine.launchPatterns],
  );
  const filteredPatterns = useMemo(() => {
    const now = new Date();
    return evidenceEngine.launchPatterns.filter((pattern) => {
      const publishedAt = new Date(pattern.publishedAt);
      const age = Number.isNaN(publishedAt.getTime()) ? Infinity : (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
      const inPeriod =
        periodFilter === "all" ||
        (periodFilter === "last-launch" && pattern.influenceScore >= 65) ||
        (periodFilter === "current-launch" && age <= 10) ||
        age <= Number(periodFilter);
      const productOk = soldProductFilter === "all" || productMatchesAlias(pattern.productName, soldProductFilter) || pattern.associatedProducts.some((product) => productMatchesAlias(product, soldProductFilter));
      const contentOk = contentFilter === "all" || pattern.format === contentFilter;
      const campaignOk = campaignFilter === "all" || pattern.campaignId === campaignFilter;
      const missionOk = missionFilter === "all" || pattern.missionId === missionFilter;
      return inPeriod && productOk && contentOk && campaignOk && missionOk;
    });
  }, [evidenceEngine.launchPatterns, soldProductFilter, contentFilter, campaignFilter, missionFilter, periodFilter]);

  const summary = evidenceEngine.summary;
  const selectedPattern = evidenceEngine.launchPatterns.find((pattern) => pattern.id === selectedPatternId) ?? null;
  const selectedPatternEvidence = selectedEvidenceId?.startsWith("pattern-")
    ? evidenceEngine.launchPatterns.find((pattern) => `pattern-${pattern.id}` === selectedEvidenceId) ?? null
    : null;
  const selectedEvidence =
    evidenceEngine.insights.find((insight) => insight.id === selectedEvidenceId) ??
    evidenceEngine.recommendations.find((recommendation) => recommendation.id === selectedEvidenceId) ??
    (selectedPatternEvidence
      ? {
          title: selectedPatternEvidence.contentTitle,
          interpretation:
            "Este conteudo foi selecionado por concentrar sinais historicos de publicacao, interacao e vendas confirmadas dentro da janela analisada. A leitura indica influencia potencial, nao atribuicao direta.",
          evidenceCards: selectedPatternEvidence.evidenceCards,
        }
      : null) ??
    null;
  const totalRevenue = filteredPatterns.reduce((sum, pattern) => sum + pattern.revenueInWindow, 0);
  const totalSales = filteredPatterns.reduce((sum, pattern) => sum + pattern.salesInWindow, 0);
  const uniqueTransactions = new Map<string, number>();
  filteredPatterns.forEach((pattern) => {
    pattern.transactionRevenue.forEach((item) => uniqueTransactions.set(item.id, item.value));
  });
  const uniqueRevenue = [...uniqueTransactions.values()].reduce((sum, value) => sum + value, 0);
  const topRecommendation = evidenceEngine.recommendations[0];
  const visualizing = [
    periodFilter === "all" ? "Historico completo" : periodFilter === "last-launch" ? "Ultimo lancamento" : periodFilter === "current-launch" ? "Lancamento atual" : `Ultimos ${periodFilter} dias`,
    soldProductFilter === "all" ? "Todos os produtos vendidos" : friendlyProductName(soldProductFilter),
    contentFilter === "all" ? "Todos os conteudos" : contentFilter,
    campaignFilter === "all" ? "Todas as campanhas" : `Campanha ${campaignFilter}`,
    missionFilter === "all" ? "Todas as missoes" : `Missao ${missionFilter}`,
  ].join(" • ");

  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle icon={<CheckCircle2 className="h-5 w-5" />} title="Evidence Engine" />
            <p className="mt-2 max-w-4xl text-sm leading-6 text-brand-teal/70">
              Esta analise identifica padroes historicos e influencia potencial. Ela nao representa atribuicao direta de vendas.
            </p>
          </div>
          <span className="rounded-full bg-[#FFF4CF] px-3 py-1 text-xs font-black uppercase text-brand-clay">
            Fonte: Evidence Engine
          </span>
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Produto analisado">
            <select value={soldProductFilter} onChange={(event) => setSoldProductFilter(event.target.value)} className="h-9 w-full rounded-md border border-brand-sand bg-white px-3 text-sm">
              <option value="all">Todos os produtos</option>
              {products.map((product) => <option key={product} value={product}>{product}</option>)}
            </select>
          </Field>
          <Field label="Conteudo relacionado">
            <select value={contentFilter} onChange={(event) => setContentFilter(event.target.value)} className="h-9 w-full rounded-md border border-brand-sand bg-white px-3 text-sm">
              <option value="all">Todos os conteudos</option>
              {contentOptions.map((format) => <option key={format} value={format}>{format}</option>)}
            </select>
          </Field>
          <Field label="Campanha">
            <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className="h-9 w-full rounded-md border border-brand-sand bg-white px-3 text-sm">
              <option value="all">Todas as campanhas</option>
              {campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
            </select>
          </Field>
          <Field label="Missao">
            <select value={missionFilter} onChange={(event) => setMissionFilter(event.target.value)} className="h-9 w-full rounded-md border border-brand-sand bg-white px-3 text-sm">
              <option value="all">Todas as missoes</option>
              {missions.map((mission) => <option key={mission} value={mission}>{mission}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {[
            ["last-launch", "Ultimo lancamento"],
            ["current-launch", "Lancamento atual"],
            ["30", "Ultimos 30 dias"],
            ["all", "Historico completo"],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setPeriodFilter(value)} className={`h-8 rounded-md border px-3 text-xs font-bold ${periodFilter === value ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
              {label}
            </button>
          ))}
          <Field label="Periodo">
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className="h-9 w-full rounded-md border border-brand-sand bg-white px-3 text-sm">
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
              <option value="all">Tudo</option>
            </select>
          </Field>
        </div>
        <p className="mt-3 text-xs font-bold text-brand-teal/60">Visualizando: {visualizing}</p>
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <p className="text-xs font-black uppercase text-brand-clay">Resumo Executivo</p>
        <h2 className="mt-1 text-xl font-semibold text-brand-teal">O que repetir, testar e observar agora</h2>
        <p className="mt-2 text-sm leading-6 text-brand-teal/70">
          {filteredPatterns.length
            ? `Foram encontrados ${filteredPatterns.length} conteudo(s) com padrao de influencia potencial no recorte. ${summary.topProduct ? `O produto com maior sinal e ${summary.topProduct}.` : "Ainda nao ha produto dominante."} ${topRecommendation ? `Proximo passo: ${topRecommendation.nextStep}` : "A recomendacao principal ainda depende de mais sinais."}`
            : "Nao ha evidencias suficientes nos filtros atuais. Recomenda-se ampliar o periodo ou coletar novas perguntas via Stories antes de decidir a proxima pauta."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MissionMeta label="Conteudos com sinal" value={filteredPatterns.length.toLocaleString("pt-BR")} />
          <MissionMeta label="Vendas acumuladas nas janelas" value={totalSales.toLocaleString("pt-BR")} />
          <MissionMeta label="Receita acumulada nas janelas" value={totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          <MissionMeta label="Receita unica do recorte" value={uniqueRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          <MissionMeta label="Melhor formato" value={summary.bestFormat ?? "-"} />
          <MissionMeta label="Confianca media" value={`${filteredPatterns.length ? Math.round(filteredPatterns.reduce((sum, pattern) => sum + pattern.influenceScore, 0) / filteredPatterns.length) : 0}%`} />
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Target className="h-5 w-5" />} title="Launch Pattern Intelligence" />
        <p className="mt-2 text-sm leading-6 text-brand-teal/65">
          Responde quais formatos, horarios, temas e produtos apareceram associados a janelas de venda. Use como sinal para decidir o proximo teste, nao como prova de origem.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailBlock label="Melhor horario para publicar (Instagram)" value={summary.bestPublishingHour ?? "-"} />
          <DetailBlock label="Horario de maior conversao (Hotmart)" value={summary.bestConversionHour ?? "-"} />
          <DetailBlock label="Melhor dia para publicar (Instagram)" value={summary.bestPublishingWeekday ?? "-"} />
          <DetailBlock label="Melhor dia de vendas (Hotmart)" value={summary.bestSalesWeekday ?? "-"} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {evidenceEngine.comparisons.map((item) => (
            <article key={item.label} className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-[11px] font-black uppercase text-brand-clay">{item.label}</p>
              <p className="mt-2 text-xl font-semibold text-brand-teal">{item.uniqueSales.toLocaleString("pt-BR")} vendas</p>
              <p className="mt-1 text-xs text-brand-teal/60">{item.uniqueRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} unicos - score {item.avgInfluence}%</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPatterns.slice(0, 24).map((pattern) => (
            <article key={pattern.id} className="rounded-md border border-brand-sand bg-white/90 p-3 shadow-sm">
              <div className="flex gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-cream text-xs font-bold text-brand-teal/55">
                  {pattern.imageUrl ? <img src={pattern.imageUrl} alt="" className="h-full w-full object-cover" /> : pattern.format}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase text-brand-clay">{pattern.format} - {new Date(pattern.publishedAt).toLocaleDateString("pt-BR")}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-brand-teal">{pattern.contentTitle}</h3>
                  <p className="mt-1 text-xs text-brand-teal/60">{friendlyProductName(pattern.productName) || "Produto nao identificado"}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MissionMeta label="Vendas" value={pattern.salesInWindow.toLocaleString("pt-BR")} />
                <MissionMeta label="Receita" value={pattern.revenueInWindow.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <MissionMeta label="Match Score" value={`${pattern.productMatchScore}%`} />
                <MissionMeta label="Influence Score" value={`${pattern.influenceScore}%`} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-cream px-2 py-1 text-xs font-black text-brand-clay">{pattern.influenceLevel}</span>
                <span className="rounded-full bg-[#E7F4EF] px-2 py-1 text-xs font-black text-brand-teal">confianca {pattern.influenceScore}%</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedEvidenceId(`pattern-${pattern.id}`)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Ver evidencias</button>
                <button type="button" onClick={() => setSelectedPatternId(pattern.id)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Ver post</button>
              </div>
            </article>
          ))}
        </div>
        {!filteredPatterns.length ? <EmptyState>Nenhum padrao encontrado nos filtros atuais. Isso pode indicar ausencia de eventos sincronizados ou vendas fora das janelas configuradas.</EmptyState> : null}
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="Insights" />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {evidenceEngine.insights.map((insight) => (
            <article key={insight.id} className="rounded-md border border-brand-sand bg-white/85 p-4">
              <p className="text-[11px] font-black uppercase text-brand-clay">confianca {insight.confidence}% - {insight.sourceCount} fonte(s)</p>
              <h3 className="mt-2 text-base font-semibold text-brand-teal">{insight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-brand-teal/65">{insight.interpretation}</p>
              <p className="mt-3 text-sm font-semibold text-brand-teal">Acao sugerida: {insight.action}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedEvidenceId(insight.id)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Ver evidencias</button>
                <button
                  type="button"
                  onClick={() => {
                    const recommendation = evidenceEngine.recommendations.find((item) => item.id === insight.relatedRecommendationId) ?? evidenceEngine.recommendations[0];
                    if (recommendation) openBriefing(recommendation);
                  }}
                  className="h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white"
                >
                  Criar briefing
                </button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="Recomendacoes com evidencia" />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {evidenceEngine.recommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-md border border-brand-sand bg-white/85 p-4">
              <p className="text-[11px] font-black uppercase text-brand-clay">{recommendation.priority} - confianca {recommendation.confidence}%</p>
              <h3 className="mt-2 text-base font-semibold text-brand-teal">{recommendation.title}</h3>
              <p className="mt-2 text-sm leading-6 text-brand-teal/65">{recommendation.expectedImpact}</p>
              <div className="mt-3 grid gap-2">
                {recommendation.evidenceCards.slice(0, 2).map((card) => (
                  <div key={card.id} className="rounded-md bg-brand-cream/60 p-3">
                    <p className="text-xs font-black uppercase text-brand-clay">{card.source} - {card.metricLabel ?? "evidencia"} {card.metricValue ?? ""}</p>
                    <p className="mt-1 text-sm font-semibold text-brand-teal">{card.title}</p>
                    <p className="mt-1 text-xs leading-5 text-brand-teal/60">{card.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedEvidenceId(recommendation.id)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Por que?</button>
                <button type="button" onClick={() => openBriefing(recommendation)} className="h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white">
                  Criar briefing
                </button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      {selectedPattern ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4">
          <Card className="my-6 w-full max-w-4xl border-[#E9CBD1] bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-brand-clay">Post analisado</p>
                <h2 className="mt-1 text-xl font-semibold text-brand-teal">{selectedPattern.contentTitle}</h2>
              </div>
              <button type="button" onClick={() => setSelectedPatternId(null)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Fechar</button>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="overflow-hidden rounded-md border border-brand-sand bg-brand-cream/40">
                {selectedPattern.imageUrl ? <img src={selectedPattern.imageUrl} alt="" className="h-full min-h-64 w-full object-cover" /> : <div className="flex min-h-64 items-center justify-center p-6 text-sm font-bold text-brand-teal/55">Imagem nao disponivel</div>}
              </div>
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MissionMeta label="Data" value={new Date(selectedPattern.publishedAt).toLocaleString("pt-BR")} />
                  <MissionMeta label="Formato" value={selectedPattern.format} />
                  <MissionMeta label="Produto" value={friendlyProductName(selectedPattern.productName) || "-"} />
                  <MissionMeta label="Janela" value={`${selectedPattern.influenceHours}h`} />
                </div>
                <p className="rounded-md border border-brand-sand bg-white/80 p-3 text-sm leading-6 text-brand-teal/70">
                  {selectedPattern.contentCaption ?? "Sem legenda sincronizada."}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {["alcance", "likes", "comentarios", "salvos", "compartilhamentos", "engajamento_score"].map((key) => (
                    <MissionMeta key={key} label={key.replace("_", " ")} value={String(selectedPattern.performanceSnapshot?.[key] ?? "-")} />
                  ))}
                </div>
                {selectedPattern.permalink ? (
                  <a href={selectedPattern.permalink} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md bg-brand-teal px-3 text-sm font-bold text-white">
                    Abrir post
                  </a>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {selectedEvidence ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4">
          <Card className="my-6 w-full max-w-3xl border-[#E9CBD1] bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-brand-clay">Evidencias utilizadas</p>
                <h2 className="mt-1 text-xl font-semibold text-brand-teal">{selectedEvidence.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedEvidenceId(null)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Fechar</button>
            </div>
            <p className="mt-3 text-sm leading-6 text-brand-teal/70">
              {"interpretation" in selectedEvidence ? selectedEvidence.interpretation : selectedEvidence.expectedImpact}
            </p>
            <div className="mt-4 space-y-3">
              {selectedEvidence.evidenceCards.map((card) => (
                <article key={card.id} className="rounded-md border border-brand-sand bg-brand-cream/40 p-3">
                  <p className="text-[11px] font-black uppercase text-brand-clay">{card.source} - confianca {card.confidence}%</p>
                  <h3 className="mt-1 text-sm font-semibold text-brand-teal">{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-brand-teal/65">{card.description}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-brand-teal/60">
                    {card.details.map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function SignalsView({
  signals,
  editSignal,
  newSignal,
  archiveSignal,
  updateSignalStatus,
}: {
  signals: NorwynSignal[];
  editSignal: (signal: NorwynSignal) => void;
  newSignal: () => void;
  archiveSignal: (signal: NorwynSignal) => void;
  updateSignalStatus: (signal: NorwynSignal, status: NorwynSignalStatus) => void;
}) {
  const [provider, setProvider] = useState("all");
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState("score");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next30 = new Date(today);
    next30.setDate(next30.getDate() + 30);
    const next90 = new Date(today);
    next90.setDate(next90.getDate() + 90);

    return signals
      .filter((signal) => signal.status !== "archived")
      .filter((signal) => provider === "all" || signal.provider === provider)
      .filter((signal) => category === "all" || signal.category === category)
      .filter((signal) => subcategory === "all" || signal.subcategory === subcategory)
      .filter((signal) => status === "all" || signal.status === status)
      .filter((signal) => {
        if (period === "all") return true;
        const start = parseDate(signal.starts_at);
        if (!start) return period === "no_date";
        if (period === "upcoming") return start >= today;
        if (period === "30d") return start >= today && start <= next30;
        if (period === "90d") return start >= today && start <= next90;
        return true;
      })
      .sort((a, b) => {
        if (sort === "date") return (parseDate(a.starts_at)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(b.starts_at)?.getTime() ?? Number.MAX_SAFE_INTEGER);
        if (sort === "title") return a.title.localeCompare(b.title);
        return b.final_score - a.final_score;
      });
  }, [signals, provider, category, subcategory, status, period, sort]);

  const summary = {
    total: filtered.length,
    high: filtered.filter((signal) => signal.priority === "high" || signal.priority === "critical").length,
    calendar: filtered.filter((signal) => signal.provider === "calendar").length,
    avgScore: filtered.length ? Math.round(filtered.reduce((sum, signal) => sum + signal.final_score, 0) / filtered.length) : 0,
  };

  return (
    <div className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle icon={<Target className="h-5 w-5" />} title="Context Intelligence / Signals" />
            <p className="mt-2 max-w-4xl text-sm leading-6 text-brand-teal/70">
              Base editavel de sinais externos e internos para alimentar futuras decisoes da Norwyn. Nada e publicado
              automaticamente; os exemplos de calendario servem como ponto de partida.
            </p>
          </div>
          <button type="button" onClick={newSignal} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-teal px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> Novo signal
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MissionMeta label="Signals filtrados" value={String(summary.total)} />
          <MissionMeta label="Alta prioridade" value={String(summary.high)} />
          <MissionMeta label="Calendario" value={String(summary.calendar)} />
          <MissionMeta label="Score medio" value={String(summary.avgScore)} />
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Fonte">
            <select value={provider} onChange={(event) => setProvider(event.target.value)} className="form-input">
              <option value="all">Todas</option>
              {signalProviders.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="form-input">
              <option value="all">Todas</option>
              {signalCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Subcategoria">
            <select value={subcategory} onChange={(event) => setSubcategory(event.target.value)} className="form-input">
              <option value="all">Todas</option>
              {signalSubcategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="form-input">
              <option value="all">Todos</option>
              {signalStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Periodo">
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="form-input">
              <option value="all">Todos</option>
              <option value="upcoming">Proximos</option>
              <option value="30d">30 dias</option>
              <option value="90d">90 dias</option>
              <option value="no_date">Sem data</option>
            </select>
          </Field>
          <Field label="Ordenar">
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="form-input">
              <option value="score">Score final</option>
              <option value="date">Data</option>
              <option value="title">Titulo</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden border-[#E9CBD1]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand p-4">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Signals ativos</p>
            <h3 className="text-lg font-semibold text-brand-teal">Lista operacional</h3>
          </div>
          <p className="text-sm font-semibold text-brand-teal/60">{filtered.length} item(ns)</p>
        </div>
        <div className="divide-y divide-brand-sand">
          {filtered.length ? filtered.map((signal) => {
            const expanded = expandedId === signal.id;
            return (
              <article key={signal.id} className="p-4">
                <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.5fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-cream px-2 py-1 text-[11px] font-black uppercase text-brand-clay">{signal.provider}</span>
                      <span className="rounded-full bg-[#E8F4F4] px-2 py-1 text-[11px] font-black uppercase text-brand-teal">{signal.category}</span>
                      {signal.subcategory ? <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-brand-teal/70">{signal.subcategory}</span> : null}
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-brand-teal">{signal.title}</h4>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-brand-teal/65">{signal.description || "Sem descricao cadastrada."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm lg:block">
                    <MissionMeta label="Inicio" value={formatSignalDate(signal.starts_at)} />
                    <MissionMeta label="Fim" value={formatSignalDate(signal.ends_at)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm lg:block">
                    <MissionMeta label="Prioridade" value={signal.priority} />
                    <MissionMeta label="Status" value={signal.status} />
                  </div>
                  <div className="rounded-md bg-brand-teal p-3 text-center text-white">
                    <p className="text-[10px] font-black uppercase opacity-75">Score</p>
                    <p className="text-2xl font-semibold">{signal.final_score}</p>
                  </div>
                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    <IconButton title="Detalhes" onClick={() => setExpandedId(expanded ? null : signal.id)}><Eye className="h-4 w-4" /></IconButton>
                    <IconButton title="Editar" onClick={() => editSignal(signal)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton title="Arquivar" onClick={() => archiveSignal(signal)}><Archive className="h-4 w-4" /></IconButton>
                  </div>
                </div>
                {expanded ? (
                  <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/35 p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <MissionMeta label="Impacto" value={String(signal.impact_score)} />
                      <MissionMeta label="Compatibilidade" value={String(signal.compatibility_score)} />
                      <MissionMeta label="Urgencia" value={String(signal.urgency_score)} />
                      <MissionMeta label="Confianca" value={String(signal.confidence_score)} />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DetailBlock label="Angulo sugerido" value={signal.suggested_angle} />
                      <DetailBlock label="Acao sugerida" value={signal.suggested_action} />
                      <DetailBlock label="Tom recomendado" value={signal.recommended_tone} />
                      <DetailBlock label="Evitar" value={signal.avoid_tone} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {signalStatuses.filter((item) => item !== "archived").map((item) => (
                        <button key={item} type="button" onClick={() => updateSignalStatus(signal, item)} className={`h-8 rounded-md border px-3 text-xs font-bold ${signal.status === item ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <MissionMeta label="Missoes" value={signal.mission_tags.join(", ") || "-"} />
                      <MissionMeta label="Produtos" value={signal.product_tags.join(", ") || "-"} />
                      <MissionMeta label="Formatos" value={signal.content_format_suggestions.join(", ") || "-"} />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          }) : <div className="p-4"><EmptyState>Nenhum signal encontrado para os filtros atuais.</EmptyState></div>}
        </div>
      </Card>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md bg-white/80 p-3">
      <p className="text-[10px] font-black uppercase text-brand-clay">{label}</p>
      <p className="mt-1 text-sm leading-6 text-brand-teal/75">{value || "-"}</p>
    </div>
  );
}

function SignalForm({ signal, close, save }: { signal: NorwynSignal; close: () => void; save: (signal: NorwynSignal) => void }) {
  const [draft, setDraft] = useState<NorwynSignal>(signal);
  const [metadataText, setMetadataText] = useState(JSON.stringify(signal.metadata ?? {}, null, 2));
  const score = calculateSignalScore(draft);

  function updateScore(field: "impact_score" | "compatibility_score" | "urgency_score" | "confidence_score", value: string) {
    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    setDraft((current) => ({ ...current, [field]: numeric, final_score: calculateSignalScore({ ...current, [field]: numeric }) }));
  }

  function saveDraft() {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = metadataText.trim() ? JSON.parse(metadataText) : {};
    } catch {
      window.alert("Metadata precisa ser um JSON valido.");
      return;
    }
    save({ ...draft, metadata, final_score: score });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4">
      <Card className="my-6 w-full max-w-6xl border-[#E9CBD1] bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Context Intelligence</p>
            <h2 className="mt-1 text-xl font-semibold text-brand-teal">Editar signal</h2>
            <p className="mt-1 text-sm text-brand-teal/60">Cadastro manual ou edicao de sinal importado. Nada e publicado automaticamente.</p>
          </div>
          <button type="button" onClick={close} className="text-sm font-bold text-brand-teal">Fechar</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Fonte">
            <select value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value as NorwynSignalProvider })} className="form-input">
              {signalProviders.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="form-input">
              {signalCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Subcategoria">
            <select value={draft.subcategory ?? ""} onChange={(event) => setDraft({ ...draft, subcategory: event.target.value || null })} className="form-input">
              <option value="">Sem subcategoria</option>
              {signalSubcategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as NorwynSignalStatus })} className="form-input">
              {signalStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Titulo"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="form-input" /></Field>
          <Field label="Prioridade">
            <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as NorwynSignalPriority })} className="form-input">
              {signalPriorities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Inicio"><input type="datetime-local" value={draft.starts_at ? draft.starts_at.slice(0, 16) : ""} onChange={(event) => setDraft({ ...draft, starts_at: event.target.value ? new Date(event.target.value).toISOString() : null })} className="form-input" /></Field>
          <Field label="Fim"><input type="datetime-local" value={draft.ends_at ? draft.ends_at.slice(0, 16) : ""} onChange={(event) => setDraft({ ...draft, ends_at: event.target.value ? new Date(event.target.value).toISOString() : null })} className="form-input" /></Field>
          <Field label="Descricao"><textarea value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="form-input min-h-24" /></Field>
          <Field label="Angulo sugerido"><textarea value={draft.suggested_angle ?? ""} onChange={(event) => setDraft({ ...draft, suggested_angle: event.target.value })} className="form-input min-h-24" /></Field>
          <Field label="Acao sugerida"><textarea value={draft.suggested_action ?? ""} onChange={(event) => setDraft({ ...draft, suggested_action: event.target.value })} className="form-input min-h-24" /></Field>
          <Field label="Tom recomendado"><textarea value={draft.recommended_tone ?? ""} onChange={(event) => setDraft({ ...draft, recommended_tone: event.target.value })} className="form-input min-h-24" /></Field>
          <Field label="Evitar tom"><textarea value={draft.avoid_tone ?? ""} onChange={(event) => setDraft({ ...draft, avoid_tone: event.target.value })} className="form-input min-h-24" /></Field>
          <Field label="Formatos sugeridos"><input value={arrayToInput(draft.content_format_suggestions)} onChange={(event) => setDraft({ ...draft, content_format_suggestions: inputToArray(event.target.value) })} className="form-input" /></Field>
          <Field label="Tags de missao"><input value={arrayToInput(draft.mission_tags)} onChange={(event) => setDraft({ ...draft, mission_tags: inputToArray(event.target.value) })} className="form-input" /></Field>
          <Field label="Tags de produto"><input value={arrayToInput(draft.product_tags)} onChange={(event) => setDraft({ ...draft, product_tags: inputToArray(event.target.value) })} className="form-input" /></Field>
          <Field label="Tags de audiencia"><input value={arrayToInput(draft.audience_tags)} onChange={(event) => setDraft({ ...draft, audience_tags: inputToArray(event.target.value) })} className="form-input" /></Field>
          <Field label="Fonte externa"><input value={draft.source_name ?? ""} onChange={(event) => setDraft({ ...draft, source_name: event.target.value })} className="form-input" /></Field>
          <Field label="URL da fonte"><input value={draft.source_url ?? ""} onChange={(event) => setDraft({ ...draft, source_url: event.target.value })} className="form-input" /></Field>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Field label="Impacto"><input type="number" min="0" max="100" value={draft.impact_score} onChange={(event) => updateScore("impact_score", event.target.value)} className="form-input" /></Field>
          <Field label="Compatibilidade"><input type="number" min="0" max="100" value={draft.compatibility_score} onChange={(event) => updateScore("compatibility_score", event.target.value)} className="form-input" /></Field>
          <Field label="Urgencia"><input type="number" min="0" max="100" value={draft.urgency_score} onChange={(event) => updateScore("urgency_score", event.target.value)} className="form-input" /></Field>
          <Field label="Confianca"><input type="number" min="0" max="100" value={draft.confidence_score} onChange={(event) => updateScore("confidence_score", event.target.value)} className="form-input" /></Field>
          <MissionMeta label="Score final" value={String(score)} />
        </div>

        <div className="mt-4">
          <Field label="Metadata JSON (avancado)">
            <textarea value={metadataText} onChange={(event) => setMetadataText(event.target.value)} className="form-input min-h-24 font-mono text-xs" />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-md border border-brand-sand px-4 text-sm font-bold text-brand-teal">Cancelar</button>
          <button type="button" onClick={saveDraft} className="h-9 rounded-md bg-brand-teal px-4 text-sm font-bold text-white">Salvar signal</button>
        </div>
      </Card>
    </div>
  );
}

function BriefingForm({
  briefing,
  missions,
  close,
  save,
}: {
  briefing: NorwynBriefing;
  missions: NorwynMission[];
  close: () => void;
  save: (briefing: NorwynBriefing) => void;
}) {
  const [draft, setDraft] = useState<NorwynBriefing>(briefing);
  const evidenceText = draft.evidence.join("\n");
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4">
      <Card className="my-6 w-full max-w-5xl border-[#E9CBD1] bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Briefing Center</p>
            <h2 className="mt-1 text-xl font-semibold text-brand-teal">Editar briefing</h2>
            <p className="mt-1 text-sm text-brand-teal/60">Especificacao estrategica. Nao e um post e nao publica nada automaticamente.</p>
          </div>
          <button type="button" onClick={close} className="text-sm font-bold text-brand-teal">Fechar</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Titulo"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="form-input" /></Field>
          <Field label="Tipo"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as BriefingType })} className="form-input">{briefingTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Missao relacionada"><select value={draft.missionId} onChange={(event) => setDraft({ ...draft, missionId: event.target.value })} className="form-input"><option value="">Sem missao</option>{missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.name}</option>)}</select></Field>
          <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as BriefingStatus })} className="form-input">{briefingStatuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Produto relacionado"><input value={draft.product} onChange={(event) => setDraft({ ...draft, product: event.target.value })} className="form-input" /></Field>
          <Field label="Prioridade"><input value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} className="form-input" /></Field>
          <Field label="Objetivo"><textarea value={draft.objective} onChange={(event) => setDraft({ ...draft, objective: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Publico"><textarea value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Contexto"><textarea value={draft.context} onChange={(event) => setDraft({ ...draft, context: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Evidencias utilizadas"><textarea value={evidenceText} onChange={(event) => setDraft({ ...draft, evidence: event.target.value.split("\n").filter(Boolean) })} className="form-input min-h-20" /></Field>
          <Field label="Objecao principal"><textarea value={draft.objection} onChange={(event) => setDraft({ ...draft, objection: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Mensagem central"><textarea value={draft.centralMessage} onChange={(event) => setDraft({ ...draft, centralMessage: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="CTA sugerido"><input value={draft.cta} onChange={(event) => setDraft({ ...draft, cta: event.target.value })} className="form-input" /></Field>
          <Field label="Tom de voz"><input value={draft.tone} onChange={(event) => setDraft({ ...draft, tone: event.target.value })} className="form-input" /></Field>
          <Field label="Formato"><input value={draft.format} onChange={(event) => setDraft({ ...draft, format: event.target.value })} className="form-input" /></Field>
          <Field label="Restricoes"><input value={draft.restrictions} onChange={(event) => setDraft({ ...draft, restrictions: event.target.value })} className="form-input" /></Field>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MissionMeta label="Fonte" value={draft.sourceModule} />
          <MissionMeta label="Periodo" value={draft.analyzedPeriod} />
          <MissionMeta label="Regra" value={draft.rule} />
          <MissionMeta label="Confianca" value={`${draft.confidence}%`} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-md border border-brand-sand px-4 text-sm font-bold text-brand-teal">Cancelar</button>
          <button type="button" onClick={() => save(draft)} className="h-9 rounded-md bg-brand-teal px-4 text-sm font-bold text-white">Salvar briefing</button>
        </div>
      </Card>
    </div>
  );
}

function ShadowActionForm({
  action,
  posts,
  missions,
  briefings,
  drafts,
  close,
  save,
}: {
  action: ShadowAction;
  posts: InstagramPostMetric[];
  missions: NorwynMission[];
  briefings: NorwynBriefing[];
  drafts: NorwynDraft[];
  close: () => void;
  save: (action: ShadowAction) => void;
}) {
  const [draft, setDraft] = useState<ShadowAction>(action);
  const selectPost = (postKey: string) => {
    const post = posts.find((item) => item.id === postKey || item.post_id === postKey);
    if (!post) {
      setDraft((current) => ({ ...current, postId: "" }));
      return;
    }
    setDraft((current) => ({
      ...current,
      postId: post.id,
      date: post.data_postagem,
      type: post.tipo,
      channel: "Instagram",
      theme: post.legenda?.slice(0, 90) || post.tipo,
      link: post.permalink || "",
      reach: String(post.alcance ?? ""),
      comments: String(post.comentarios ?? ""),
      saves: String(post.salvos ?? ""),
      shares: String(post.compartilhamentos ?? ""),
      notes: post.legenda || current.notes,
    }));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4">
      <Card className="my-6 w-full max-w-5xl border-[#E9CBD1] bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Shadow Mode</p>
            <h2 className="mt-1 text-xl font-semibold text-brand-teal">Registrar acao externa</h2>
          </div>
          <button type="button" onClick={close} className="text-sm font-bold text-brand-teal">Fechar</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Post do Instagram">
            <select value={draft.postId} onChange={(event) => selectPost(event.target.value)} className="form-input">
              <option value="">Selecionar post para carregar dados automaticamente</option>
              {posts.slice(0, 80).map((post) => (
                <option key={post.id} value={post.id}>
                  {post.data_postagem} - {post.tipo} - {(post.legenda || post.permalink || "sem legenda").slice(0, 70)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Origem da acao">
            <select value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value as ShadowAction["origin"] })} className="form-input">
              {["Marketing", "Norwyn", "Juliana", "Suporte", "Outro"].map((origin) => <option key={origin}>{origin}</option>)}
            </select>
          </Field>
          <Field label="Data"><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="form-input" /></Field>
          <Field label="Tipo"><input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} className="form-input" /></Field>
          <Field label="Canal"><input value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })} className="form-input" /></Field>
          <Field label="Tema"><input value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value })} className="form-input" /></Field>
          <Field label="Produto"><input value={draft.product} onChange={(event) => setDraft({ ...draft, product: event.target.value })} className="form-input" /></Field>
          <Field label="CTA"><input value={draft.cta} onChange={(event) => setDraft({ ...draft, cta: event.target.value })} className="form-input" /></Field>
          <Field label="Missao"><select value={draft.missionId} onChange={(event) => setDraft({ ...draft, missionId: event.target.value })} className="form-input"><option value="">Sem missao</option>{missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.name}</option>)}</select></Field>
          <Field label="Briefing Norwyn"><select value={draft.relatedBriefingId} onChange={(event) => setDraft({ ...draft, relatedBriefingId: event.target.value })} className="form-input"><option value="">Sem briefing</option>{briefings.map((briefing) => <option key={briefing.id} value={briefing.id}>{briefing.title}</option>)}</select></Field>
          <Field label="Draft Norwyn"><select value={draft.relatedDraftId} onChange={(event) => setDraft({ ...draft, relatedDraftId: event.target.value })} className="form-input"><option value="">Sem draft</option>{drafts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
          <Field label="Status"><input value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="form-input" /></Field>
          <Field label="Objetivo percebido"><textarea value={draft.perceivedObjective} onChange={(event) => setDraft({ ...draft, perceivedObjective: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Link / observacao"><textarea value={draft.link} onChange={(event) => setDraft({ ...draft, link: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Alcance"><input value={draft.reach} onChange={(event) => setDraft({ ...draft, reach: event.target.value })} className="form-input" /></Field>
          <Field label="Comentarios"><input value={draft.comments} onChange={(event) => setDraft({ ...draft, comments: event.target.value })} className="form-input" /></Field>
          <Field label="Salvamentos"><input value={draft.saves} onChange={(event) => setDraft({ ...draft, saves: event.target.value })} className="form-input" /></Field>
          <Field label="Compartilhamentos"><input value={draft.shares} onChange={(event) => setDraft({ ...draft, shares: event.target.value })} className="form-input" /></Field>
          <Field label="Cliques"><input value={draft.clicks} onChange={(event) => setDraft({ ...draft, clicks: event.target.value })} className="form-input" /></Field>
          <Field label="Vendas relacionadas"><input value={draft.relatedSales} onChange={(event) => setDraft({ ...draft, relatedSales: event.target.value })} className="form-input" /></Field>
          <Field label="Observacoes"><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="form-input min-h-20" /></Field>
          <Field label="Aprendizado"><textarea value={draft.learning} onChange={(event) => setDraft({ ...draft, learning: event.target.value })} className="form-input min-h-20" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-md border border-brand-sand px-4 text-sm font-bold text-brand-teal">Cancelar</button>
          <button type="button" onClick={() => save(draft)} className="h-9 rounded-md bg-brand-teal px-4 text-sm font-bold text-white">Salvar registro</button>
        </div>
      </Card>
    </div>
  );
}

function IntelligenceView({ missions }: { missions: NorwynMission[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const cards = [
    { title: "Editorial Intelligence", sources: "Instagram", output: "Temas, linguagem, clusters e oportunidades editoriais.", reliability: "Media: depende do volume recente de posts e comentarios." },
    { title: "Launch Intelligence", sources: "Comercial + Agenda + Ads", output: "Momento de lancamento, produtos que convertem e riscos do funil.", reliability: "Alta quando ha vendas recentes e campanha ativa." },
    { title: "Revenue Intelligence", sources: "Comercial + Financeiro", output: "Receita, recuperacao, pendencias e lacunas financeiras.", reliability: "Media: receita bruta e confiavel; liquido depende do payload da origem." },
    { title: "Audience Intelligence", sources: "Interacoes + seguidores", output: "Sinais de audiencia, duvidas, objecoes e comportamento.", reliability: "Media: melhora conforme Directs e comentarios ficam mais completos." },
  ];
  const selectedCard = cards.find((card) => card.title === selected);
  return (
    <Card className="border-[#E9CBD1] p-4 sm:p-5">
      <SectionTitle icon={<Layers3 className="h-5 w-5" />} title="Intelligence" />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button key={card.title} type="button" onClick={() => setSelected(card.title)} className="rounded-md border border-brand-sand bg-white/85 p-4 text-left transition hover:border-brand-clay">
            <p className="text-sm font-semibold text-brand-teal">{card.title}</p>
            <p className="mt-2 text-xs font-black uppercase text-brand-clay">Fontes: {card.sources}</p>
            <p className="mt-2 text-sm leading-6 text-brand-teal/65">{card.output}</p>
            <p className="mt-3 text-xs text-brand-teal/55">Alimenta {missions.length || "nenhuma"} missao criada.</p>
            <span className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal"><Eye className="h-4 w-4" /> Ver detalhes</span>
          </button>
        ))}
      </div>
      {selectedCard ? (
        <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/45 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase text-brand-clay">Detalhe da intelligence</p>
              <h3 className="mt-1 text-lg font-semibold text-brand-teal">{selectedCard.title}</h3>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="h-8 rounded-md border border-brand-sand px-3 text-xs font-bold text-brand-teal">Fechar</button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MissionMeta label="Fontes" value={selectedCard.sources} />
            <MissionMeta label="Confiabilidade" value={selectedCard.reliability} />
            <MissionMeta label="Missoes alimentadas" value={String(missions.length)} />
          </div>
          <p className="mt-3 text-sm leading-6 text-brand-teal/70">{selectedCard.output}</p>
        </div>
      ) : null}
    </Card>
  );
}

function PreviewView({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <Card className="border-[#E9CBD1] p-4 sm:p-5">
      <SectionTitle icon={icon} title={title} />
      <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-teal/70">
        Preview conceitual. Esta sprint prepara navegacao e papel do modulo, sem executar automacoes reais.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item} className="rounded-md border border-brand-sand bg-white/85 p-3">
            <p className="text-sm font-semibold text-brand-teal">{item}</p>
            <p className="mt-2 text-xs text-brand-teal/60">Preparado para evolucao futura.</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="flex items-center gap-2 text-brand-teal">{icon}<h2 className="text-lg font-semibold">{title}</h2></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm font-bold text-brand-teal">{label}{children}</label>;
}

function MissionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-brand-cream/60 p-3">
      <p className="text-[10px] font-black uppercase text-brand-clay">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-teal">{value || "-"}</p>
    </div>
  );
}

function MiniCounter({ label, value }: { label: string; value: number }) {
  return <MissionMeta label={label} value={value.toLocaleString("pt-BR")} />;
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-sand text-brand-teal hover:border-brand-clay">
      {children}
    </button>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-brand-sand p-4 text-sm text-brand-teal/60">{children}</p>;
}
