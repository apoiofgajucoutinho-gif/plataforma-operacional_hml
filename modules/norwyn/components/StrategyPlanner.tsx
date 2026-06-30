"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  HelpCircle,
  Lightbulb,
  LineChart,
  Megaphone,
  RefreshCcw,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { InstagramInteraction, InstagramPostMetric } from "@/modules/instagram/types";
import type {
  NorwynAdsRow,
  NorwynCommercialSale,
  NorwynEvidenceRecommendation,
  StrategyAgendaEvent,
  StrategyAtividadeTask,
  StrategyObjetivo,
  StrategyOcorrencia,
} from "@/modules/norwyn/types";

type Pillar = "Instagram" | "Comercial" | "Recuperacao" | "Ads";
type ChecklistStatus = "pendente" | "feito" | "ignorado";
type LearningStatus = "nao_executado" | "executado" | "parcial";
type LearningResult = "sem_resultado" | "positivo" | "neutro" | "negativo";

type PlannerAction = {
  id: string;
  pillar: Pillar;
  title: string;
  priority: "Alta" | "Media" | "Baixa";
  confidence: number;
  why: string;
  evidence: string[];
  nextStep: string;
  briefing: {
    objective: string;
    format: string;
    angle: string;
    evidence: string;
  };
};

export type StrategyBriefingSeed = {
  title: string;
  type?: "Carrossel" | "Stories" | "Reels" | "Anuncio" | "Landing Page" | "E-mail" | "Mensagem de recuperacao" | "FAQ / Resposta publica" | "WhatsApp / Suporte";
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
};

type EditorialSlot = {
  day: string;
  format: string;
  theme: string;
  objective: string;
  source: string;
};

type StrategicPriority = {
  operationalContext: string;
  primaryProduct: string;
  reason: string;
  objective: string;
  lastSales: string[];
  confidence: number;
  hasActiveCommercialMoment: boolean;
};

type StoredChecklist = Record<string, ChecklistStatus>;
type StoredLearning = Record<string, { status: LearningStatus; result: LearningResult }>;

const CHECKLIST_KEY = "norwyn-strategy-planner-checklist-v1";
const LEARNING_KEY = "norwyn-strategy-planner-learning-v1";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numberFormat = new Intl.NumberFormat("pt-BR");

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function inLastDays(value: string | null | undefined, days: number) {
  const parsed = parseDate(value);
  return parsed ? parsed >= daysAgo(days) : false;
}

function compact(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".", ",")}k`;
  return numberFormat.format(Math.round(value));
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function groupCount<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item)?.trim() || "Sem classificacao";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function topPost(posts: InstagramPostMetric[]) {
  return [...posts].sort((a, b) => (b.alcance ?? 0) - (a.alcance ?? 0))[0] ?? null;
}

function actionConfidence(evidenceCount: number, dataFreshness: number) {
  return Math.min(95, Math.max(45, 45 + evidenceCount * 12 + dataFreshness));
}

function saleDate(sale: NorwynCommercialSale) {
  return sale.data_aprovacao ?? sale.data_compra;
}

function detectOperationalContext(
  agendaEvents: StrategyAgendaEvent[],
  confirmedSales: NorwynCommercialSale[],
  pendingSales: NorwynCommercialSale[],
  adsRows: NorwynAdsRow[],
  objetivos: StrategyObjetivo[],
) {
  const commercialKeywords = [
    "lancamento",
    "lançamento",
    "campanha",
    "turma",
    "live",
    "aula",
    "inscricao",
    "inscrição",
    "venda",
    "evento",
  ];
  const now = new Date();
  const recentWindow = daysAgo(7);
  const nextWindow = new Date();
  nextWindow.setDate(nextWindow.getDate() + 10);

  const commercialEvents = agendaEvents.filter((event) => {
    const start = parseDate(event.inicio);
    const haystack = normalizeText(`${event.titulo} ${event.tipo}`);
    return Boolean(
      start &&
        start >= recentWindow &&
        start <= nextWindow &&
        commercialKeywords.some((keyword) => haystack.includes(normalizeText(keyword))),
    );
  });
  const activeAds = adsRows.filter((row) => Number(row.valor_gasto ?? 0) > 0 && inLastDays(row.data_referencia, 7));
  const commercialGoals = objetivos.filter((goal) => {
    const haystack = normalizeText(`${goal.titulo} ${goal.indicador_key}`);
    return ["faturamento", "venda", "receita", "lancamento", "lançamento", "hotmart"].some((keyword) =>
      haystack.includes(normalizeText(keyword)),
    );
  });

  const hasActiveCommercialMoment =
    commercialEvents.length > 0 ||
    confirmedSales.some((sale) => inLastDays(saleDate(sale), 7)) ||
    pendingSales.some((sale) => inLastDays(saleDate(sale), 7)) ||
    activeAds.length > 0 ||
    commercialGoals.length > 0;

  const context = commercialEvents[0]
    ? `Evento comercial ativo: ${commercialEvents[0].titulo}`
    : confirmedSales.some((sale) => inLastDays(saleDate(sale), 7))
      ? "Momento comercial ativo: vendas recentes em andamento"
      : activeAds.length
        ? "Campanha ativa: Ads com gasto nos ultimos 7 dias"
        : commercialGoals.length
          ? `Objetivo comercial em acompanhamento: ${commercialGoals[0].titulo}`
          : "Rotina editorial sem evento comercial dominante";

  return { hasActiveCommercialMoment, context, commercialEvents, activeAds, commercialGoals };
}

function buildPlanner(
  posts: InstagramPostMetric[],
  interactions: InstagramInteraction[],
  sales: NorwynCommercialSale[],
  adsRows: NorwynAdsRow[],
  agendaEvents: StrategyAgendaEvent[],
  atividades: StrategyAtividadeTask[],
  ocorrencias: StrategyOcorrencia[],
  objetivos: StrategyObjetivo[],
) {
  const recentPosts = posts.filter((post) => inLastDays(post.data_postagem, 30));
  const recentInteractions = interactions.filter((item) => inLastDays(item.interaction_at, 30));
  const recentSales = sales.filter((sale) => inLastDays(saleDate(sale), 30));
  const recentAds = adsRows.filter((row) => inLastDays(row.data_referencia, 30));
  const daySales = sales.filter((sale) => inLastDays(saleDate(sale), 1));
  const weekSales = sales.filter((sale) => inLastDays(saleDate(sale), 7));
  const fifteenDaySales = sales.filter((sale) => inLastDays(saleDate(sale), 15));
  const weekInteractions = interactions.filter((item) => inLastDays(item.interaction_at, 7));
  const upcomingEvents = agendaEvents.filter((event) => {
    const start = parseDate(event.inicio);
    if (!start) return false;
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return start >= now && start <= nextWeek;
  });
  const openTasks = atividades.filter((task) => !["concluida", "ignorada", "cancelada"].includes(String(task.status)));
  const urgentTasks = openTasks.filter((task) => ["alta", "urgente"].includes(String(task.prioridade)));
  const openIncidents = ocorrencias.filter((item) => !["resolvido", "cancelado", "ignorado"].includes(String(item.status)));
  const criticalIncidents = openIncidents.filter((item) => ["alto", "critico", "urgente", "alta"].includes(String(item.impacto_cliente)) || ["alta", "urgente"].includes(String(item.prioridade)));
  const offTrackGoals = objetivos.filter((goal) => Number(goal.percentual_atingido ?? 100) < 80 || ["fora", "risco", "atencao"].includes(String(goal.status).toLowerCase()));

  const confirmedSales = recentSales.filter((sale) => sale.grupo_comercial === "confirmed");
  const pendingSales = recentSales.filter((sale) => sale.grupo_comercial === "pending");
  const lostSales = recentSales.filter((sale) => ["lost", "refunded", "chargeback"].includes(String(sale.grupo_comercial)));
  const revenue = confirmedSales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const confirmedDaySales = daySales.filter((sale) => sale.grupo_comercial === "confirmed");
  const confirmedWeekSales = weekSales.filter((sale) => sale.grupo_comercial === "confirmed");
  const confirmedFifteenDaySales = fifteenDaySales.filter((sale) => sale.grupo_comercial === "confirmed");
  const topTheme = groupCount(recentInteractions, (item) => item.product_topic)[0];
  const topProduct24h = groupCount(confirmedDaySales, (sale) => sale.produto_nome)[0];
  const topProduct7d = groupCount(confirmedWeekSales, (sale) => sale.produto_nome)[0];
  const topProduct15d = groupCount(confirmedFifteenDaySales, (sale) => sale.produto_nome)[0];
  const topProduct30d = groupCount(confirmedSales, (sale) => sale.produto_nome)[0];
  const topProduct = topProduct24h ?? topProduct7d ?? topProduct15d ?? topProduct30d;
  const topSource = groupCount(confirmedSales, (sale) => sale.source_sck)[0];
  const bestPost = topPost(recentPosts);
  const unanswered = recentInteractions.filter((item) => item.status !== "respondido" && item.status !== "arquivado");
  const highPotential = unanswered.filter((item) => item.potential === "alto");
  const adsWithSpend = recentAds.filter((row) => Number(row.valor_gasto ?? 0) > 0);
  const adsAlerts = adsWithSpend.filter((row) =>
    String(row.performance_status ?? "").toUpperCase() !== "OK" ||
    Number(row.frequencia ?? 0) >= 3 ||
    (Number(row.ctr ?? 0) > 0 && Number(row.ctr ?? 0) < 1),
  );
  const averageCtr = average(adsWithSpend.map((row) => Number(row.ctr ?? 0)));
  const averageCpc = average(adsWithSpend.map((row) => Number(row.cpc ?? 0)));
  const operationalContext = detectOperationalContext(agendaEvents, confirmedSales, pendingSales, recentAds, objetivos);
  const recentSoldProducts = [...confirmedSales]
    .sort((a, b) => (parseDate(saleDate(b))?.getTime() ?? 0) - (parseDate(saleDate(a))?.getTime() ?? 0))
    .map((sale) => sale.produto_nome?.trim())
    .filter(Boolean)
    .slice(0, 6) as string[];
  const strategicPriority: StrategicPriority = {
    operationalContext: operationalContext.context,
    primaryProduct: topProduct?.[0] ?? "Produto prioritario ainda nao identificado",
    reason: topProduct
      ? operationalContext.hasActiveCommercialMoment
        ? "Produto com maior sinal de conversao recente dentro de um momento comercial ativo."
        : "Produto com maior concentracao de vendas confirmadas no recorte recente."
      : operationalContext.hasActiveCommercialMoment
        ? "Ha contexto comercial ativo, mas ainda sem produto dominante suficiente para conclusao forte."
        : "Nao ha evento comercial dominante nem produto com conversao recente suficiente.",
    objective: topProduct
      ? operationalContext.hasActiveCommercialMoment
        ? "Concentrar a comunicacao no produto que esta puxando vendas ate o encerramento do momento comercial."
        : "Usar o produto com melhor resposta comercial como eixo da comunicacao da semana."
      : "Coletar novas perguntas por Stories ou caixa de perguntas para elevar a confianca da analise.",
    lastSales: recentSoldProducts,
    confidence: actionConfidence(
      (topProduct ? 2 : 0) +
        (operationalContext.hasActiveCommercialMoment ? 2 : 0) +
        (confirmedWeekSales.length ? 1 : 0) +
        (adsWithSpend.length ? 1 : 0),
      confirmedWeekSales.length ? 12 : 4,
    ),
    hasActiveCommercialMoment: operationalContext.hasActiveCommercialMoment,
  };

  const actions: PlannerAction[] = [];

  if (operationalContext.hasActiveCommercialMoment || topProduct) {
    actions.push({
      id: "strategic-commercial-priority",
      pillar: "Comercial",
      title: topProduct
        ? `Concentrar comunicacao em ${topProduct[0]}`
        : "Usar o contexto comercial ativo para coletar objecoes agora",
      priority: operationalContext.hasActiveCommercialMoment ? "Alta" : "Media",
      confidence: strategicPriority.confidence,
      why: topProduct
        ? "O Strategy priorizou primeiro o momento operacional e as vendas recentes. O tema editorial entra como complemento, nao como ponto de partida."
        : "Existe um momento comercial ativo, mas o sistema ainda precisa de mais sinais para apontar um produto dominante com seguranca.",
      evidence: [
        strategicPriority.operationalContext,
        topProduct24h ? `Produto campeao em 24h: ${topProduct24h[0]} (${topProduct24h[1]} vendas).` : "Sem campeao claro nas ultimas 24h.",
        topProduct7d ? `Produto campeao em 7 dias: ${topProduct7d[0]} (${topProduct7d[1]} vendas).` : "Sem campeao claro nos ultimos 7 dias.",
        topTheme
          ? `Editorial complementar: ${topTheme[0]} apareceu em ${topTheme[1]} interacoes.`
          : "Ate o momento nao foi identificado um tema dominante nas interacoes. Recomenda-se coletar novas perguntas por Stories para aumentar a confianca da analise.",
      ],
      nextStep: topProduct
        ? "Criar uma sequencia de Stories reforcando valor, prova e objecoes do produto prioritario."
        : "Abrir caixa de perguntas sobre duvidas de compra, acesso, prazo e indicacao do produto correto.",
      briefing: {
        objective: topProduct
          ? "Aumentar a probabilidade de novas vendas usando o produto que ja esta convertendo."
          : "Gerar evidencia comercial suficiente para orientar a proxima comunicacao.",
        format: "Stories em sequencia + chamada para duvidas",
        angle: topProduct
          ? `Por que ${topProduct[0]} e a escolha certa para este momento.`
          : "Quais duvidas ainda impedem a decisao de compra.",
        evidence: strategicPriority.reason,
      },
    });
  }

  if (!operationalContext.hasActiveCommercialMoment && topTheme) {
    actions.push({
      id: "instagram-top-theme",
      pillar: "Instagram",
      title: `Transformar "${topTheme[0]}" em pauta principal da semana`,
      priority: topTheme[1] >= 8 ? "Alta" : "Media",
      confidence: actionConfidence(3, recentPosts.length ? 12 : 0),
      why: "Sem evento comercial dominante no momento, o tema mais recorrente nas interacoes pode orientar conteudo com menor achismo.",
      evidence: [
        `${topTheme[1]} interacoes classificadas nesse tema nos ultimos 30 dias.`,
        `${recentPosts.length} posts recentes disponiveis para leitura editorial.`,
        bestPost ? `Post de maior alcance recente: ${compact(bestPost.alcance ?? 0)} de alcance.` : "Sem post de maior alcance identificado.",
      ],
      nextStep: "Criar um conteudo educativo curto e um CTA de pergunta para validar se a audiencia quer aprofundamento.",
      briefing: {
        objective: "Converter interesse recorrente em conteudo de autoridade.",
        format: "Reels curto + stories de pergunta",
        angle: `Responder a principal duvida percebida sobre ${topTheme[0]}.`,
        evidence: `${topTheme[1]} sinais recentes nas interacoes.`,
      },
    });
  }

  if (pendingSales.length || lostSales.length) {
    actions.push({
      id: "recovery-commercial",
      pillar: "Recuperacao",
      title: "Priorizar recuperacao comercial antes de criar nova demanda",
      priority: pendingSales.length + lostSales.length >= 5 ? "Alta" : "Media",
      confidence: actionConfidence(2, 10),
      why: "Ha vendas pendentes/perdidas no periodo. Antes de aumentar trafego, vale recuperar oportunidades ja iniciadas.",
      evidence: [
        `${pendingSales.length} vendas pendentes no periodo.`,
        `${lostSales.length} perdas, reembolsos ou chargebacks no periodo.`,
        topProduct ? `Produto mais associado a vendas confirmadas: ${topProduct[0]}.` : "Sem produto dominante identificado.",
      ],
      nextStep: "Separar pendentes por forma de pagamento e revisar mensagens de recuperacao por PIX, boleto e cartao.",
      briefing: {
        objective: "Recuperar compradores com intencao ja demonstrada.",
        format: "Roteiro de contato + FAQ de objecoes",
        angle: "Remover friccao de pagamento/acesso sem parecer cobranca agressiva.",
        evidence: `${pendingSales.length + lostSales.length} oportunidades comerciais no periodo.`,
      },
    });
  }

  if (confirmedSales.length) {
    actions.push({
      id: "commercial-proof",
      pillar: "Comercial",
      title: "Usar prova operacional do que vendeu para orientar a proxima comunicacao",
      priority: "Media",
      confidence: actionConfidence(3, 10),
      why: "O modulo Comercial mostra compras reais. Isso ajuda a escolher qual produto/angulo sustentar na semana.",
      evidence: [
        `${confirmedSales.length} vendas confirmadas nos ultimos 30 dias.`,
        `Receita bruta confirmada no periodo: ${currency.format(revenue)}.`,
        topSource ? `Origem mais frequente: ${topSource[0]} (${topSource[1]} vendas).` : "Origem/source_sck ausente ou pouco preenchida.",
      ],
      nextStep: "Conferir se o produto mais vendido tambem aparece nas duvidas do Instagram antes de reforcar campanha.",
      briefing: {
        objective: "Alinhar comunicacao organica com sinal comercial real.",
        format: "Carrossel de prova + story com bastidor",
        angle: `Conectar duvida frequente com ${topProduct?.[0] ?? "produto principal"}.`,
        evidence: `${confirmedSales.length} vendas confirmadas e ${recentInteractions.length} interacoes recentes.`,
      },
    });
  }

  if (adsAlerts.length || adsWithSpend.length) {
    actions.push({
      id: "ads-quality-check",
      pillar: "Ads",
      title: adsAlerts.length ? "Revisar campanhas com alerta antes de escalar investimento" : "Manter leitura diaria de Ads com foco em qualidade",
      priority: adsAlerts.length ? "Alta" : "Baixa",
      confidence: actionConfidence(adsAlerts.length ? 3 : 1, adsWithSpend.length ? 10 : 0),
      why: adsAlerts.length
        ? "Existem linhas de Ads com status de performance diferente de OK, frequencia alta ou CTR baixo."
        : "Ha dados de Ads com gasto, mas sem alerta forte no recorte atual.",
      evidence: [
        `${adsWithSpend.length} registros de Ads com gasto nos ultimos 30 dias.`,
        `${adsAlerts.length} registros com alerta operacional.`,
        `CTR medio: ${averageCtr.toFixed(2).replace(".", ",")}% | CPC medio: ${currency.format(averageCpc)}.`,
      ],
      nextStep: adsAlerts.length
        ? "Listar campanhas com alerta e validar link, oferta, preco e criativo antes de nova ativacao."
        : "Acompanhar CTR, CPC e frequencia antes de qualquer mudanca maior.",
      briefing: {
        objective: "Evitar desperdicio de midia e erro operacional.",
        format: "Checklist de campanha",
        angle: "Validar link, preco, promessa, publico e saturacao.",
        evidence: `${adsAlerts.length} alertas de performance no periodo.`,
      },
    });
  }

  if (highPotential.length) {
    actions.push({
      id: "interaction-priority",
      pillar: "Recuperacao",
      title: "Responder interacoes de alto potencial antes de novas publicacoes",
      priority: "Alta",
      confidence: actionConfidence(2, 12),
      why: "Ha pessoas com potencial alto ainda sem status de resposta final. Isso e fila de relacionamento, nao apenas comentario.",
      evidence: [
        `${highPotential.length} interacoes de potencial alto sem resposta/arquivamento.`,
        `${unanswered.length} interacoes ainda pedem revisao operacional.`,
        `Tema dominante: ${topTheme?.[0] ?? "Coletar sinais da audiencia"}.`,
      ],
      nextStep: "Responder primeiro quem fez pergunta objetiva, demonstrou interesse comercial ou relatou problema.",
      briefing: {
        objective: "Reduzir perda de relacionamento e oportunidade comercial.",
        format: "Fila de resposta priorizada",
        angle: "Responder com acolhimento, proximo passo e link apenas quando fizer sentido.",
        evidence: `${highPotential.length} interacoes de alto potencial.`,
      },
    });
  }

  if (upcomingEvents.length || urgentTasks.length || criticalIncidents.length || offTrackGoals.length) {
    actions.push({
      id: "operational-focus",
      pillar: "Comercial",
      title: "Montar foco operacional do dia antes de abrir novas frentes",
      priority: criticalIncidents.length || urgentTasks.length ? "Alta" : "Media",
      confidence: actionConfidence(3, 12),
      why: "Agenda, atividades, ocorrencias e objetivos indicam itens que podem disputar atencao com publicacoes e campanhas.",
      evidence: [
        `${upcomingEvents.length} eventos nos proximos 7 dias.`,
        `${urgentTasks.length} tarefas urgentes/altas em aberto.`,
        `${criticalIncidents.length} ocorrencias criticas ou altas abertas.`,
        `${offTrackGoals.length} metas/OKRs em risco ou abaixo de 80%.`,
      ],
      nextStep: "Priorizar o que remove risco operacional hoje e transformar o restante em backlog claro.",
      briefing: {
        objective: "Alinhar agenda, execucao e estrategia antes de criar demanda.",
        format: "Checklist de decisao diaria",
        angle: "O que precisa ser resolvido hoje para a estrategia nao perder tracao.",
        evidence: `${upcomingEvents.length + urgentTasks.length + criticalIncidents.length + offTrackGoals.length} sinais operacionais relevantes.`,
      },
    });
  }

  const editorialSlots: EditorialSlot[] = [
    {
      day: "Segunda",
      format: "Stories",
      theme: topProduct ? `Produto prioritario: ${topProduct[0]}` : "Pergunta aberta da audiencia",
      objective: topProduct
        ? "Reforcar valor percebido do produto que esta convertendo"
        : "Coletar objecoes e linguagem real",
      source: topProduct
        ? `Base comercial: ${topProduct[1]} vendas no melhor recorte recente`
        : "Coletar sinais da audiencia",
    },
    {
      day: "Terca",
      format: topTheme ? "Carrossel" : "Stories",
      theme: topTheme?.[0] ?? "Principais duvidas de compra",
      objective: operationalContext.hasActiveCommercialMoment
        ? "Reduzir objecoes antes de perder o timing comercial"
        : "Gerar alcance e autoridade",
      source: topTheme
        ? `${recentInteractions.length} interacoes recentes`
        : "Usar perguntas diretas para aumentar confianca da analise",
    },
    {
      day: "Quarta",
      format: "Reels",
      theme: topProduct ? `Caso aplicado de ${topProduct[0]}` : "Caso clinico ou bastidor tecnico",
      objective: topProduct ? "Gerar autoridade para sustentar o produto prioritario" : "Aumentar autoridade percebida",
      source: `${confirmedSales.length} vendas confirmadas no periodo`,
    },
    {
      day: "Quinta",
      format: "Stories + caixa",
      theme: "Objeções e bastidores",
      objective: "Aumentar relacionamento e resposta",
      source: `${unanswered.length} interacoes pendentes`,
    },
    {
      day: "Sexta",
      format: "Checklist",
      theme: adsAlerts.length ? "Validacao de campanha" : "Resumo da semana",
      objective: "Evitar erro operacional",
      source: `${adsAlerts.length} alertas de Ads`,
    },
  ];

  const checklist = [
    { id: "check-interactions", text: `Responder ${Math.min(unanswered.length, 20)} interacoes pendentes priorizadas.`, pillar: "Recuperacao" },
    { id: "check-pending-sales", text: `Revisar ${pendingSales.length} vendas pendentes antes de nova acao comercial.`, pillar: "Comercial" },
    { id: "check-ads", text: `Validar ${adsAlerts.length} alertas de Ads: link, preco, oferta e criativo.`, pillar: "Ads" },
    { id: "check-content", text: `Criar 1 pauta sobre ${topTheme?.[0] ?? "tema dominante da semana"}.`, pillar: "Instagram" },
    { id: "check-operations", text: `Revisar ${urgentTasks.length + criticalIncidents.length} riscos operacionais antes de executar o plano.`, pillar: "Comercial" },
  ];

  return {
    recentPosts,
    recentInteractions,
    recentSales,
    recentAds,
    weekSales,
    weekInteractions,
    confirmedSales,
    pendingSales,
    lostSales,
    revenue,
    topTheme,
    topProduct,
    topProduct24h,
    topProduct7d,
    topProduct15d,
    topProduct30d,
    topSource,
    strategicPriority,
    unanswered,
    highPotential,
    adsWithSpend,
    adsAlerts,
    upcomingEvents,
    urgentTasks,
    criticalIncidents,
    offTrackGoals,
    actions,
    editorialSlots,
    checklist,
  };
}

export function StrategyPlanner({
  posts,
  interactions,
  commercialSales,
  adsRows,
  agendaEvents = [],
  atividades = [],
  ocorrencias = [],
  objetivos = [],
  activeMission = null,
  evidenceRecommendations = [],
  onCreateBriefing,
}: {
  posts: InstagramPostMetric[];
  interactions: InstagramInteraction[];
  commercialSales: NorwynCommercialSale[];
  adsRows: NorwynAdsRow[];
  agendaEvents?: StrategyAgendaEvent[];
  atividades?: StrategyAtividadeTask[];
  ocorrencias?: StrategyOcorrencia[];
  objetivos?: StrategyObjetivo[];
  activeMission?: { name: string; priority: string } | null;
  evidenceRecommendations?: NorwynEvidenceRecommendation[];
  onCreateBriefing?: (seed: StrategyBriefingSeed) => void;
}) {
  const planner = useMemo(
    () => buildPlanner(posts, interactions, commercialSales, adsRows, agendaEvents, atividades, ocorrencias, objetivos),
    [posts, interactions, commercialSales, adsRows, agendaEvents, atividades, ocorrencias, objetivos],
  );
  const [checklist, setChecklist] = useState<StoredChecklist>({});
  const [learning, setLearning] = useState<StoredLearning>({});
  const [briefing, setBriefing] = useState<PlannerAction | null>(null);
  const [explain, setExplain] = useState<PlannerAction | null>(null);

  useEffect(() => {
    try {
      setChecklist(JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) || "{}") as StoredChecklist);
      setLearning(JSON.parse(window.localStorage.getItem(LEARNING_KEY) || "{}") as StoredLearning);
    } catch {
      setChecklist({});
      setLearning({});
    }
  }, []);

  function updateChecklist(id: string, status: ChecklistStatus) {
    setChecklist((current) => {
      const next = { ...current, [id]: status };
      window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      return next;
    });
  }

  function updateLearning(id: string, patch: Partial<{ status: LearningStatus; result: LearningResult }>) {
    setLearning((current) => {
      const next = {
        ...current,
        [id]: {
          status: current[id]?.status ?? "nao_executado",
          result: current[id]?.result ?? "sem_resultado",
          ...patch,
        },
      };
      window.localStorage.setItem(LEARNING_KEY, JSON.stringify(next));
      return next;
    });
  }

  const leadAction = planner.actions[0];

  return (
    <section className="space-y-4">
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-brand-clay">Norwyn Strategy</p>
            <h2 className="mt-1 text-xl font-semibold text-brand-teal">Strategy Planner</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-brand-teal/70">
              Plano operacional deterministico para decidir o que fazer hoje e nesta semana, usando Instagram,
              Comercial/Hotmart, Ads, Agenda, Atividades, Objetivos, Ocorrencias e interacoes ja existentes no sistema.
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase text-emerald-800">
            Dados reais • Sem IA
          </span>
        </div>

        <div className="mt-4 rounded-md border border-brand-sand bg-white/80 p-3 text-sm text-brand-teal/75">
          <span className="font-black uppercase text-brand-clay">Missao em foco: </span>
          {activeMission ? `${activeMission.name} (${activeMission.priority})` : "nenhuma missao principal ativa definida."}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ContextMetric label="Contexto operacional" value={planner.pendingSales.length || planner.adsAlerts.length ? "Atenção" : "Estavel"} helper="leitura dos ultimos 30 dias" />
          <ContextMetric label="Vendas confirmadas" value={numberFormat.format(planner.confirmedSales.length)} helper={currency.format(planner.revenue)} />
          <ContextMetric label="Interacoes a revisar" value={numberFormat.format(planner.unanswered.length)} helper={`${planner.highPotential.length} de alto potencial`} />
          <ContextMetric label="Alertas de Ads" value={numberFormat.format(planner.adsAlerts.length)} helper={`${planner.adsWithSpend.length} registros com gasto`} />
          <ContextMetric label="Riscos operacionais" value={numberFormat.format(planner.urgentTasks.length + planner.criticalIncidents.length)} helper={`${planner.upcomingEvents.length} eventos em 7 dias`} />
        </div>

        <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/45 p-4 text-sm leading-6 text-brand-teal/75">
          <strong>Direcao sugerida:</strong>{" "}
          {leadAction
            ? `${leadAction.title}. Proximo passo: ${leadAction.nextStep}`
            : "Ainda nao ha sinais suficientes para uma recomendacao operacional com confianca."}
        </div>

        {evidenceRecommendations.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {evidenceRecommendations.slice(0, 2).map((recommendation) => (
              <div key={recommendation.id} className="rounded-md border border-brand-sand bg-white/80 p-3">
                <p className="text-[10px] font-black uppercase text-brand-clay">Evidence Engine - confianca {recommendation.confidence}%</p>
                <p className="mt-1 text-sm font-semibold text-brand-teal">{recommendation.title}</p>
                <p className="mt-1 text-xs leading-5 text-brand-teal/60">{recommendation.expectedImpact}</p>
                <p className="mt-2 text-[11px] font-semibold text-brand-teal/55">
                  {recommendation.evidenceCards[0]?.description ?? "Recomendacao baseada em padroes historicos e influencia potencial."}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionHeader icon={<Target className="h-5 w-5" />} title="Plano da semana por pilar" />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {planner.actions.length ? (
              planner.actions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  learning={learning[action.id]}
                  activeMission={activeMission}
                  onCreateBriefing={onCreateBriefing}
                  setBriefing={() => setBriefing(action)}
                  setExplain={() => setExplain(action)}
                  updateLearning={(patch) => updateLearning(action.id, patch)}
                />
              ))
            ) : (
              <EmptyState>Sem recomendacoes suficientes com os dados atuais.</EmptyState>
            )}
          </div>
        </Card>

        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionHeader icon={<ClipboardList className="h-5 w-5" />} title="Checklist operacional" />
          <div className="mt-4 space-y-3">
            {planner.checklist.map((item) => (
              <div key={item.id} className="rounded-md border border-brand-sand p-3">
                <p className="text-sm font-semibold text-brand-teal">{item.text}</p>
                <p className="mt-1 text-xs uppercase text-brand-clay">{item.pillar}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["pendente", "feito", "ignorado"] as ChecklistStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateChecklist(item.id, status)}
                      className={`h-8 rounded-md border px-3 text-xs font-bold ${
                        checklist[item.id] === status
                          ? "border-brand-teal bg-brand-teal text-white"
                          : "border-brand-sand bg-white text-brand-teal"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionHeader icon={<Lightbulb className="h-5 w-5" />} title="Prioridade Estrategica da Semana" />
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-brand-sand bg-white/85 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Produto prioritario</p>
            <h3 className="mt-2 text-lg font-semibold text-brand-teal">
              {planner.strategicPriority.primaryProduct}
            </h3>
            <p className="mt-3 text-sm leading-6 text-brand-teal/70">{planner.strategicPriority.reason}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniEvidence label="Contexto" value={planner.strategicPriority.operationalContext} />
              <MiniEvidence label="Confianca" value={`${planner.strategicPriority.confidence}%`} />
              <MiniEvidence label="24h" value={planner.topProduct24h ? `${planner.topProduct24h[0]} (${planner.topProduct24h[1]})` : "Sem campeao claro"} />
              <MiniEvidence label="7 dias" value={planner.topProduct7d ? `${planner.topProduct7d[0]} (${planner.topProduct7d[1]})` : "Sem campeao claro"} />
            </div>
          </div>
          <div className="rounded-md border border-brand-sand bg-brand-cream/45 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Objetivo da semana</p>
            <p className="mt-2 text-sm leading-6 text-brand-teal/75">{planner.strategicPriority.objective}</p>
            <p className="mt-4 text-[11px] font-black uppercase text-brand-clay">Ultimas vendas reais</p>
            {planner.strategicPriority.lastSales.length ? (
              <ul className="mt-2 grid gap-1 text-sm text-brand-teal/70">
                {planner.strategicPriority.lastSales.map((product, index) => (
                  <li key={`${product}-${index}`}>- {product}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-brand-teal/60">
                Ainda nao ha vendas recentes suficientes. Coletar perguntas e objecoes por Stories antes de concluir a pauta.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionHeader icon={<CalendarDays className="h-5 w-5" />} title="Plano editorial da semana" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {planner.editorialSlots.map((slot) => (
            <article key={slot.day} className="rounded-md border border-brand-sand bg-white/80 p-3">
              <p className="text-[11px] font-black uppercase text-brand-clay">{slot.day}</p>
              <h3 className="mt-2 text-sm font-semibold text-brand-teal">{slot.theme}</h3>
              <p className="mt-2 text-xs text-brand-teal/65">{slot.format} • {slot.objective}</p>
              <p className="mt-3 text-[11px] text-brand-teal/50">Evidencia: {slot.source}</p>
            </article>
          ))}
        </div>
      </Card>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionHeader icon={<BookOpenCheck className="h-5 w-5" />} title="Playbooks acionaveis" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Playbook title="Aquecimento" when="Tema com alto volume de interacoes, mas baixa conversao comercial." action="Abrir perguntas, coletar objecoes e transformar as respostas em pauta." />
          <Playbook title="Recuperacao" when="Pendentes, boletos, PIX ou vendas perdidas aparecem no Comercial." action="Priorizar follow-up e revisar friccoes antes de escalar trafego." />
          <Playbook title="Validacao de campanha" when="Ads mostra CTR baixo, CPC alto, frequencia alta ou erro operacional." action="Conferir link, preco, promessa, criativo e publico antes de reativar." />
          <Playbook title="Autoridade" when="Um post concentra alcance, salvamentos ou comentarios acima da media." action="Reaproveitar o angulo em formato educativo mais profundo." />
          <Playbook title="Pós-lançamento" when="Vendas confirmadas e perguntas recorrentes aparecem juntas." action="Separar prova social, duvidas e objecoes para uma semana de conteudo." />
          <Playbook title="Baixo sinal" when="Ha poucos posts, poucos comentarios ou Ads sem gasto." action="Nao forcar conclusao. Registrar lacuna e coletar mais sinais." />
        </div>
      </Card>

      {briefing ? <BriefingPanel action={briefing} close={() => setBriefing(null)} /> : null}
      {explain ? <ExplainPanel action={explain} close={() => setExplain(null)} /> : null}
    </section>
  );
}

function ContextMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-md border border-brand-sand bg-white/80 p-3">
      <p className="text-[11px] font-black uppercase text-brand-clay">{label}</p>
      <p className="mt-2 text-xl font-semibold text-brand-teal">{value}</p>
      <p className="mt-1 text-xs text-brand-teal/55">{helper}</p>
    </div>
  );
}

function MiniEvidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-brand-cream/60 p-3">
      <p className="text-[10px] font-black uppercase text-brand-clay">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-teal">{value}</p>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-brand-teal">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
}

function ActionCard({
  action,
  learning,
  activeMission,
  onCreateBriefing,
  setBriefing,
  setExplain,
  updateLearning,
}: {
  action: PlannerAction;
  learning?: { status: LearningStatus; result: LearningResult };
  activeMission?: { name: string; priority: string } | null;
  onCreateBriefing?: (seed: StrategyBriefingSeed) => void;
  setBriefing: () => void;
  setExplain: () => void;
  updateLearning: (patch: Partial<{ status: LearningStatus; result: LearningResult }>) => void;
}) {
  function generateBriefing() {
    if (!onCreateBriefing) {
      setBriefing();
      return;
    }
    const type =
      action.pillar === "Recuperacao"
        ? "Mensagem de recuperacao"
        : action.pillar === "Ads"
          ? "Anuncio"
          : action.pillar === "Instagram"
            ? "Carrossel"
            : "Stories";
    onCreateBriefing({
      title: action.title,
      type,
      recommendationOrigin: action.id,
      objective: action.briefing.objective,
      context: action.why,
      evidence: action.evidence,
      product: action.pillar === "Comercial" ? action.briefing.angle : "",
      objection: action.briefing.angle,
      centralMessage: action.briefing.angle,
      cta: action.nextStep,
      priority: action.priority,
      confidence: action.confidence,
      sourceModule: `Strategy / ${action.pillar}`,
      rule: action.briefing.evidence,
    });
  }
  return (
    <article className="rounded-md border border-brand-sand bg-white/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PillarBadge pillar={action.pillar} />
        <span className="rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-black uppercase text-brand-clay">
          {action.priority} • {action.confidence}% confianca
        </span>
      </div>
      <p className="mt-3 rounded-md bg-brand-cream/60 px-3 py-2 text-xs font-semibold text-brand-teal/70">
        {activeMission
          ? `Vinculada a missao: ${activeMission.name}`
          : "Recomendacao sem missao vinculada."}
      </p>
      <h4 className="mt-3 text-base font-semibold text-brand-teal">{action.title}</h4>
      <p className="mt-2 text-sm leading-6 text-brand-teal/70">{action.why}</p>
      <ul className="mt-3 grid gap-1 text-xs text-brand-teal/60">
        {action.evidence.map((item) => <li key={item}>• {item}</li>)}
      </ul>
      <p className="mt-3 text-sm font-semibold text-brand-teal">Proximo passo: {action.nextStep}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={setExplain}><HelpCircle className="h-4 w-4" />Por que?</Button>
        <Button variant="secondary" onClick={generateBriefing}><FilePenLine className="h-4 w-4" />Gerar briefing</Button>
      </div>
      <div className="mt-4 rounded-md bg-brand-cream/50 p-3">
        <p className="text-[11px] font-black uppercase text-brand-clay">Aprendizado local</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["nao_executado", "executado", "parcial"] as LearningStatus[]).map((status) => (
            <SmallChoice key={status} active={(learning?.status ?? "nao_executado") === status} onClick={() => updateLearning({ status })}>
              {status.replace("_", " ")}
            </SmallChoice>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["sem_resultado", "positivo", "neutro", "negativo"] as LearningResult[]).map((result) => (
            <SmallChoice key={result} active={(learning?.result ?? "sem_resultado") === result} onClick={() => updateLearning({ result })}>
              {result.replace("_", " ")}
            </SmallChoice>
          ))}
        </div>
      </div>
    </article>
  );
}

function PillarBadge({ pillar }: { pillar: Pillar }) {
  const Icon = pillar === "Instagram" ? Megaphone : pillar === "Comercial" ? LineChart : pillar === "Ads" ? Target : RefreshCcw;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-clay/15 px-2.5 py-1 text-[11px] font-black uppercase text-brand-clay">
      <Icon className="h-3.5 w-3.5" /> {pillar}
    </span>
  );
}

function SmallChoice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${active ? "border-brand-teal bg-brand-teal text-white" : "border-brand-sand bg-white text-brand-teal"}`}>
      {children}
    </button>
  );
}

function Playbook({ title, when, action }: { title: string; when: string; action: string }) {
  return (
    <article className="rounded-md border border-brand-sand bg-white/85 p-4">
      <div className="flex items-center gap-2 text-brand-teal">
        <ShieldCheck className="h-4 w-4" />
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="mt-3 text-xs font-black uppercase text-brand-clay">Quando usar</p>
      <p className="mt-1 text-sm leading-6 text-brand-teal/70">{when}</p>
      <p className="mt-3 text-xs font-black uppercase text-brand-clay">Acao padrao</p>
      <p className="mt-1 text-sm leading-6 text-brand-teal/70">{action}</p>
    </article>
  );
}

function BriefingPanel({ action, close }: { action: PlannerAction; close: () => void }) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-emerald-800">Briefing proposto</p>
          <h3 className="mt-1 text-lg font-semibold text-brand-teal">{action.title}</h3>
        </div>
        <button type="button" onClick={close} className="text-sm font-bold text-brand-teal">Fechar</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <BriefingItem label="Objetivo" value={action.briefing.objective} />
        <BriefingItem label="Formato" value={action.briefing.format} />
        <BriefingItem label="Angulo" value={action.briefing.angle} />
        <BriefingItem label="Evidencia" value={action.briefing.evidence} />
      </div>
    </Card>
  );
}

function ExplainPanel({ action, close }: { action: PlannerAction; close: () => void }) {
  const confidenceLabel = action.confidence >= 75 ? "Confianca Alta" : action.confidence >= 58 ? "Confianca Media" : "Confianca Baixa";
  const limitations = [
    "Esta leitura e deterministica e nao usa IA.",
    "As evidencias indicam influencia potencial, nao atribuicao direta.",
    "Quando houver poucos sinais recentes, valide com pergunta aberta ou caixa de Stories antes de executar em escala.",
  ];
  return (
    <Card className="border-amber-200 bg-amber-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-amber-800">Como chegamos nisso</p>
          <h3 className="mt-1 text-lg font-semibold text-brand-teal">{action.title}</h3>
        </div>
        <button type="button" onClick={close} className="text-sm font-bold text-brand-teal">Fechar</button>
      </div>
      <p className="mt-3 text-sm leading-6 text-brand-teal/75">{action.why}</p>
      <ul className="mt-3 grid gap-1 text-sm text-brand-teal/70">
        {action.evidence.map((item) => <li key={item}>• {item}</li>)}
      </ul>
      <p className="mt-3 text-xs text-brand-teal/55">Indice de confianca deterministico: {action.confidence}%. Ele combina quantidade de evidencias, frescor dos dados e lacunas conhecidas.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-amber-200 bg-white/70 p-3">
          <p className="text-[11px] font-black uppercase text-amber-800">{confidenceLabel}</p>
          <p className="mt-2 text-sm text-brand-teal/70">
            A leitura considera evidencias do pilar {action.pillar}, prioridade {action.priority}, missao ativa e proximo passo sugerido.
          </p>
        </div>
        <div className="rounded-md border border-amber-200 bg-white/70 p-3">
          <p className="text-[11px] font-black uppercase text-amber-800">Limitacoes da evidencia</p>
          <ul className="mt-2 grid gap-1 text-xs leading-5 text-brand-teal/60">
            {limitations.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function BriefingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-white/75 p-3">
      <p className="text-[11px] font-black uppercase text-emerald-800">{label}</p>
      <p className="mt-1 text-sm leading-6 text-brand-teal">{value}</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-brand-sand p-4 text-sm text-brand-teal/60">{children}</p>;
}
