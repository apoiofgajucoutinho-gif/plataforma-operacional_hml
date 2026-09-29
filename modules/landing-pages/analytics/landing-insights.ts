import type { LandingInsight, LandingInsightCriterion, LandingInsightMaturity, LandingJourneyStep } from "@/modules/landing-pages/types";

export const defaultLandingMaturity: LandingInsightMaturity = {
  previewMinSessions: 20,
  observationMinSessions: 50,
  insightMinSessions: 100,
  updatedAt: null,
  updatedBy: null,
};

export const defaultLandingCriteria: LandingInsightCriterion[] = [
  {
    key: "relevant_step_drop",
    name: "Queda relevante entre etapas",
    explanation: "Destaca quando muitas sessões chegam a uma etapa, mas uma parcela relevante não avança para a seguinte.",
    formula: "perda entre etapas / total da etapa anterior",
    whyItExists: "Ajuda a localizar a maior mudança da jornada sem afirmar que ela é um problema.",
    thresholdPercent: 40,
    windowDays: 7,
    minSessions: 100,
    mediumSample: 100,
    highSample: 300,
    active: true,
    updatedAt: null,
    updatedBy: null,
  },
  {
    key: "low_cta_exposure",
    name: "Baixa exposição ao CTA",
    explanation: "Observa se poucas sessões chegaram a visualizar o botão principal.",
    formula: "sessões com CTA visto / sessões",
    whyItExists: "Se o botão não é visto, o clique não pode acontecer; a causa precisa ser investigada separadamente.",
    thresholdPercent: 45,
    windowDays: 7,
    minSessions: 100,
    mediumSample: 100,
    highSample: 300,
    active: true,
    updatedAt: null,
    updatedBy: null,
  },
  {
    key: "low_checkout_progress",
    name: "Baixa intenção de checkout",
    explanation: "Observa qual parcela das sessões registrou clique para abrir o checkout.",
    formula: "sessões com checkout / sessões da página",
    whyItExists: "Usa a ação de checkout sem presumir que eventos de exposição anteriores sempre foram capturados.",
    thresholdPercent: 10,
    windowDays: 7,
    minSessions: 100,
    mediumSample: 100,
    highSample: 300,
    active: true,
    updatedAt: null,
    updatedBy: null,
  },
  {
    key: "minimum_sample",
    name: "Pouca amostra",
    explanation: "Sinaliza quando ainda existem poucas sessões para uma leitura estável.",
    formula: "sessões do período < amostra mínima",
    whyItExists: "Evita transformar oscilações iniciais em conclusões de negócio.",
    thresholdPercent: 0,
    windowDays: 7,
    minSessions: 100,
    mediumSample: 100,
    highSample: 300,
    active: true,
    updatedAt: null,
    updatedBy: null,
  },
];

type EventRow = { event_name: string; session_id?: string | null; cta_id?: string | null };

function uniqueSessions(rows: EventRow[], names: string[]) {
  return new Set(rows.filter((row) => names.includes(row.event_name) && row.session_id).map((row) => row.session_id as string)).size;
}

function pct(value: number, base: number) {
  return base > 0 ? (value / base) * 100 : null;
}

export function mergeLandingCriteria(stored: unknown): LandingInsightCriterion[] {
  const values = Array.isArray(stored) ? stored : [];
  const byKey = new Map(values.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item) => [String(item.key), item]));
  return defaultLandingCriteria.map((criterion) => ({
    ...criterion,
    ...(byKey.get(criterion.key) ?? {}),
    key: criterion.key,
    name: criterion.name,
    explanation: criterion.explanation,
    formula: criterion.formula,
    whyItExists: criterion.whyItExists,
  }));
}

export function mergeLandingMaturity(stored: unknown): LandingInsightMaturity {
  const value = stored && typeof stored === "object" ? stored as Partial<LandingInsightMaturity> : {};
  return { ...defaultLandingMaturity, ...value };
}

export function maturityForSample(sample: number, config: LandingInsightMaturity): LandingInsight["maturity"] {
  if (sample < config.previewMinSessions) return null;
  if (sample < config.observationMinSessions) return "Prévia";
  if (sample < config.insightMinSessions) return "Em observação";
  return "Insight";
}

export function buildJourney(events: EventRow[], purchases: number | null) {
  const baseNames = ["session_start", "page_view", "landing_view"];
  const baseSessionIds = new Set(events.filter((row) => baseNames.includes(row.event_name) && row.session_id).map((row) => row.session_id as string));
  const scopedEvents = events.filter((row) => row.session_id && baseSessionIds.has(row.session_id));
  const sessions = baseSessionIds.size;
  const raw = [
    { key: "sessions", label: "Sessão", value: sessions, available: true, note: null },
    { key: "checkout", label: "Checkout", value: uniqueSessions(scopedEvents, ["checkout_click"]), available: true, note: null },
    { key: "purchase", label: "Compra confirmada", value: purchases, available: purchases !== null, note: purchases === null ? "Aguardando primeira reconciliação confiável via source_sck." : null },
  ];
  const detailed: LandingJourneyStep[] = raw.map((step, index) => {
    const previous = index > 0 ? raw[index - 1].value : null;
    const ordered = step.value === null || previous === null || step.value <= previous;
    return {
      ...step,
      fromPreviousPercent: ordered && step.value !== null && previous !== null ? pct(step.value, previous) : null,
      fromSessionsPercent: step.value === null ? null : pct(step.value, sessions),
      lossFromPrevious: ordered && step.value !== null && previous !== null ? previous - step.value : null,
      note: !ordered ? "Esta etapa teve mais sessões que a anterior. Os eventos podem ocorrer fora da sequência ou a sessão pode ter começado antes do período." : step.note,
    };
  });
  const executiveKeys = new Set(["sessions", "checkout", "purchase"]);
  const executiveRaw = raw.filter((step) => executiveKeys.has(step.key));
  const executive: LandingJourneyStep[] = executiveRaw.map((step, index) => {
    const previous = index > 0 ? executiveRaw[index - 1].value : null;
    const ordered = step.value === null || previous === null || step.value <= previous;
    return { ...step, fromPreviousPercent: ordered && step.value !== null && previous !== null ? pct(step.value, previous) : null, fromSessionsPercent: step.value === null ? null : pct(step.value, sessions), lossFromPrevious: ordered && step.value !== null && previous !== null ? previous - step.value : null, note: !ordered ? "Esta etapa não forma uma sequência monotônica no recorte." : step.note };
  });
  const transitions = detailed.slice(1).map((step, index) => ({ step, previous: detailed[index] }))
    .filter(({ step }) => step.available && step.fromPreviousPercent !== null)
    .map(({ step, previous }) => ({
      label: `${previous.label} → ${step.label}`,
      loss: step.lossFromPrevious ?? 0,
      lossPercent: 100 - (step.fromPreviousPercent ?? 100),
      progress: step.fromPreviousPercent ?? 0,
    }));
  return {
    detailed,
    executive,
    behavioral: [
      { key: "scroll_25", label: "Chegou a 25% da página", sessions: uniqueSessions(scopedEvents, ["scroll_25"]), events: scopedEvents.filter((row) => row.event_name === "scroll_25").length, note: "Mede profundidade de navegação, sem presumir que seja pré-requisito técnico para outras ações." },
      { key: "offer_view", label: "Oferta vista", sessions: uniqueSessions(scopedEvents, ["offer_view"]), events: scopedEvents.filter((row) => row.event_name === "offer_view").length, note: "O observer pode não registrar a oferta em sessões que ainda clicam no checkout; por isso fica fora da sequência principal." },
      { key: "cta_view", label: "CTA visto", sessions: uniqueSessions(scopedEvents, ["cta_view"]), events: scopedEvents.filter((row) => row.event_name === "cta_view").length, note: "Pode ocorrer em até cinco CTAs diferentes e antes ou depois da oferta; por isso não é uma etapa sequencial." },
      { key: "cta_click", label: "CTA clicado", sessions: uniqueSessions(scopedEvents, ["cta_click"]), events: scopedEvents.filter((row) => row.event_name === "cta_click").length, note: "Inclui cliques de navegação interna e de checkout. É um sinal de interação, não uma etapa única do funil." },
    ],
    highlights: {
      biggestAbsoluteLoss: [...transitions].sort((a, b) => b.loss - a.loss)[0]?.label ?? null,
      biggestPercentageLoss: [...transitions].sort((a, b) => b.lossPercent - a.lossPercent)[0]?.label ?? null,
      bestProgress: [...transitions].sort((a, b) => b.progress - a.progress)[0]?.label ?? null,
      lowestProgress: [...transitions].sort((a, b) => a.progress - b.progress)[0]?.label ?? null,
    },
  };
}

function confidence(sample: number, criterion: LandingInsightCriterion, repeated: boolean) {
  if (sample < criterion.mediumSample) return "Baixa" as const;
  if (sample >= criterion.highSample && repeated) return "Alta" as const;
  return "Média" as const;
}

export function buildInsights(args: {
  journey: ReturnType<typeof buildJourney>;
  previousJourney: ReturnType<typeof buildJourney>;
  criteria: LandingInsightCriterion[];
  maturity: LandingInsightMaturity;
}): LandingInsight[] {
  const { journey, previousJourney, criteria, maturity } = args;
  const sessions = journey.detailed[0]?.value ?? 0;
  const previousSessions = previousJourney.detailed[0]?.value ?? 0;
  const byKey = new Map(criteria.map((item) => [item.key, item]));
  const insights: LandingInsight[] = [];
  const minimum = byKey.get("minimum_sample");
  const pageMaturity = maturityForSample(sessions, maturity);
  if (minimum?.active && pageMaturity !== "Insight") {
    const title = pageMaturity === "Em observação" ? "Comportamento em observação" : pageMaturity === "Prévia" ? "Prévia disponível" : "Dados começando a chegar";
    const nextThreshold = pageMaturity === "Em observação" ? maturity.insightMinSessions : pageMaturity === "Prévia" ? maturity.observationMinSessions : maturity.previewMinSessions;
    insights.push({ id: "minimum_sample", title, whatHappened: `${sessions.toLocaleString("pt-BR")} sessões foram registradas no período.`, whyAttention: pageMaturity === null ? `A prévia começa em ${nextThreshold.toLocaleString("pt-BR")} sessões.` : `O próximo nível começa em ${nextThreshold.toLocaleString("pt-BR")} sessões.`, evidence: [`Sessões analisadas: ${sessions.toLocaleString("pt-BR")}`, `Insight oficial a partir de: ${maturity.insightMinSessions.toLocaleString("pt-BR")}`], hypothesis: pageMaturity === null ? "Ainda há poucos acessos para considerar esse comportamento um padrão." : "O comportamento está se formando, mas ainda pode variar com novas sessões.", maturity: pageMaturity, analyzedSessions: sessions, confidence: null, allowedAction: pageMaturity === "Em observação" ? "Comparar" : "Acompanhar", nextStep: pageMaturity === "Em observação" ? "Comparar por origem e continuar acompanhando; ainda não alterar a LP com base apenas nesta leitura." : "Acompanhar mais sessões. Nesta fase a Norwyn não recomenda alteração na LP.", criterionKey: minimum.key });
  }
  const relevant = byKey.get("relevant_step_drop");
  if (relevant?.active) {
    const candidates = journey.detailed.slice(1).map((step, index) => ({ step, previous: journey.detailed[index] }))
      .filter(({ step }) => step.fromPreviousPercent !== null && step.lossFromPrevious !== null)
      .map(({ step, previous }) => ({ step, previous, lossPercent: 100 - (step.fromPreviousPercent ?? 100) }));
    const largest = candidates.sort((a, b) => b.lossPercent - a.lossPercent)[0];
    const previousMatch = previousJourney.detailed.find((step) => step.key === largest?.step.key);
    const sample = largest?.previous.value ?? 0;
    const stage = maturityForSample(sample, maturity);
    const triggered = Boolean(largest && largest.lossPercent >= relevant.thresholdPercent);
    if (largest && stage && (stage !== "Insight" || triggered)) insights.push({ id: "relevant_step_drop", title: stage === "Insight" ? "Maior perda do período" : stage === "Em observação" ? "Mudança em observação" : "Prévia da jornada", whatHappened: `${largest.previous.value?.toLocaleString("pt-BR")} sessões chegaram a ${largest.previous.label.toLowerCase()}, e ${largest.step.value?.toLocaleString("pt-BR")} avançaram para ${largest.step.label.toLowerCase()}.`, whyAttention: triggered ? `A perda de ${largest.lossPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ultrapassou o critério configurado de ${relevant.thresholdPercent.toLocaleString("pt-BR") }%.` : `A leitura está sendo acompanhada enquanto a amostra cresce; o limiar configurado é ${relevant.thresholdPercent.toLocaleString("pt-BR") }%.`, evidence: [`${largest.step.lossFromPrevious?.toLocaleString("pt-BR")} sessões não avançaram`, `${largest.step.fromPreviousPercent?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% avançaram para a etapa seguinte`], hypothesis: stage === "Insight" ? "Algum elemento antes dessa etapa pode estar reduzindo o avanço, mas os dados não identificam a causa sozinhos." : "Ainda é cedo para interpretar a causa desse movimento.", maturity: stage, analyzedSessions: sample, confidence: stage === "Insight" ? confidence(sample, relevant, previousSessions >= relevant.minSessions && previousMatch !== undefined && (previousMatch.fromPreviousPercent ?? 100) <= 100 - relevant.thresholdPercent) : null, allowedAction: stage === "Insight" ? "Investigar" : stage === "Em observação" ? "Comparar" : "Acompanhar", nextStep: stage === "Insight" ? "Examinar as seções e origens dessas sessões antes de propor uma mudança na página." : stage === "Em observação" ? "Comparar por origem e verificar se a mudança se repete; ainda não recomendar alteração na LP." : "Acompanhar novas sessões sem alterar a LP com base nesta prévia.", criterionKey: relevant.key });
  }
  const cta = byKey.get("low_cta_exposure");
  const ctaBehavior = journey.behavioral.find((item) => item.key === "cta_view");
  const previousCta = previousJourney.behavioral.find((item) => item.key === "cta_view");
  const ctaPercent = pct(ctaBehavior?.sessions ?? 0, sessions);
  const ctaStage = maturityForSample(sessions, maturity);
  const ctaTriggered = ctaPercent !== null && ctaPercent < (cta?.thresholdPercent ?? 0);
  if (cta?.active && ctaStage && (ctaStage !== "Insight" || ctaTriggered)) insights.push({ id: "low_cta_exposure", title: ctaStage === "Insight" ? "Exposição aos CTAs" : ctaStage === "Em observação" ? "Exposição aos CTAs em observação" : "Prévia de exposição aos CTAs", whatHappened: `${ctaBehavior?.sessions.toLocaleString("pt-BR")} de ${sessions.toLocaleString("pt-BR")} sessões visualizaram pelo menos um CTA.`, whyAttention: ctaTriggered ? `A exposição de ${(ctaPercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ficou abaixo do critério de ${cta.thresholdPercent.toLocaleString("pt-BR") }%.` : `A proporção está sendo acompanhada enquanto a amostra cresce; o limiar configurado é ${cta.thresholdPercent.toLocaleString("pt-BR") }%.`, evidence: [`Sessões com CTA visto: ${ctaBehavior?.sessions.toLocaleString("pt-BR")}`, `Visualizações registradas em todos os CTAs: ${ctaBehavior?.events.toLocaleString("pt-BR")}`], hypothesis: ctaStage === "Insight" ? "A exposição indica alcance de algum CTA, mas não identifica qual posição causou ou impediu o avanço." : "Ainda há poucos dados para considerar esse comportamento um padrão.", maturity: ctaStage, analyzedSessions: sessions, confidence: ctaStage === "Insight" ? confidence(sessions, cta, previousSessions >= cta.minSessions && pct(previousCta?.sessions ?? 0, previousSessions) !== null && (pct(previousCta?.sessions ?? 0, previousSessions) ?? 100) < cta.thresholdPercent) : null, allowedAction: ctaStage === "Insight" ? "Investigar" : ctaStage === "Em observação" ? "Comparar" : "Verificar", nextStep: ctaStage === "Insight" ? "Separar os CTAs por posição e origem antes de propor qualquer mudança." : "Verificar quais CTAs foram vistos e continuar acompanhando; não alterar a LP nesta fase.", criterionKey: cta.key });
  const checkout = byKey.get("low_checkout_progress");
  const checkoutStep = journey.detailed.find((step) => step.key === "checkout");
  const sessionToCheckout = sessions ? ((checkoutStep?.value ?? 0) / sessions) * 100 : null;
  const previousCheckout = previousJourney.detailed.find((step) => step.key === "checkout")?.value ?? 0;
  const checkoutStage = maturityForSample(sessions, maturity);
  const checkoutTriggered = sessionToCheckout !== null && sessionToCheckout < (checkout?.thresholdPercent ?? 0);
  if (checkout?.active && checkoutStage && sessionToCheckout !== null && (checkoutStage !== "Insight" || checkoutTriggered)) insights.push({ id: "low_checkout_progress", title: checkoutStage === "Insight" ? "Intenção de checkout" : checkoutStage === "Em observação" ? "Checkout em observação" : "Prévia de checkout", whatHappened: `${(checkoutStep?.value ?? 0).toLocaleString("pt-BR")} de ${sessions.toLocaleString("pt-BR")} sessões registraram intenção de checkout.`, whyAttention: checkoutTriggered ? `A proporção de ${sessionToCheckout.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ficou abaixo do critério de ${checkout.thresholdPercent.toLocaleString("pt-BR") }%.` : `A leitura ainda está amadurecendo; o limiar configurado é ${checkout.thresholdPercent.toLocaleString("pt-BR") }%.`, evidence: [`Sessões analisadas: ${sessions.toLocaleString("pt-BR")}`, `Checkout: ${(checkoutStep?.value ?? 0).toLocaleString("pt-BR")} sessões`], hypothesis: checkoutStage === "Insight" ? "A proporção mostra intenção de checkout, mas não determina a causa nem comprova que o checkout carregou." : "Ainda há poucos dados para considerar esse comportamento um padrão.", maturity: checkoutStage, analyzedSessions: sessions, confidence: checkoutStage === "Insight" ? confidence(sessions, checkout, previousSessions >= checkout.minSessions && previousSessions > 0 && (previousCheckout / previousSessions) * 100 < checkout.thresholdPercent) : null, allowedAction: checkoutStage === "Insight" ? "Investigar" : checkoutStage === "Em observação" ? "Comparar" : "Acompanhar", nextStep: checkoutStage === "Insight" ? "Comparar por origem e validar o caminho técnico antes de sugerir um teste." : "Acompanhar novas sessões sem alterar a LP nesta fase.", criterionKey: checkout.key });
  return insights;
}
