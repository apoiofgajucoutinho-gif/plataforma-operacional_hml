import type { LandingInsight, LandingInsightCriterion, LandingJourneyStep } from "@/modules/landing-pages/types";

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
    name: "Baixo avanço do clique ao checkout",
    explanation: "Observa quando poucas sessões com clique no CTA registram chegada ao checkout.",
    formula: "sessões com checkout / sessões com CTA clicado",
    whyItExists: "Ajuda a separar interesse no botão de avanço efetivo para o checkout.",
    thresholdPercent: 50,
    windowDays: 7,
    minSessions: 30,
    mediumSample: 30,
    highSample: 100,
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

type EventRow = { event_name: string; session_id?: string | null };

function uniqueSessions(rows: EventRow[], names: string[]) {
  return new Set(rows.filter((row) => names.includes(row.event_name) && row.session_id).map((row) => row.session_id as string)).size;
}

function pct(value: number, base: number) {
  return base > 0 ? (value / base) * 100 : null;
}

export function mergeLandingCriteria(stored: unknown): LandingInsightCriterion[] {
  const values = Array.isArray(stored) ? stored : [];
  const byKey = new Map(values.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item) => [String(item.key), item]));
  return defaultLandingCriteria.map((criterion) => ({ ...criterion, ...(byKey.get(criterion.key) ?? {}), key: criterion.key }));
}

export function buildJourney(events: EventRow[], purchases: number | null) {
  const sessions = uniqueSessions(events, ["session_start", "page_view", "landing_view"]);
  const raw = [
    { key: "sessions", label: "Sessão", value: sessions, available: true, note: null },
    { key: "scroll_25", label: "25% da página", value: uniqueSessions(events, ["scroll_25"]), available: true, note: null },
    { key: "offer_view", label: "Oferta vista", value: uniqueSessions(events, ["offer_view"]), available: true, note: null },
    { key: "cta_view", label: "CTA visto", value: uniqueSessions(events, ["cta_view"]), available: true, note: null },
    { key: "cta_click", label: "CTA clicado", value: uniqueSessions(events, ["cta_click"]), available: true, note: null },
    { key: "checkout", label: "Checkout", value: uniqueSessions(events, ["checkout_click"]), available: true, note: null },
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
  const executiveKeys = new Set(["sessions", "offer_view", "checkout", "purchase"]);
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
}): LandingInsight[] {
  const { journey, previousJourney, criteria } = args;
  const sessions = journey.detailed[0]?.value ?? 0;
  const previousSessions = previousJourney.detailed[0]?.value ?? 0;
  const byKey = new Map(criteria.map((item) => [item.key, item]));
  const insights: LandingInsight[] = [];
  const minimum = byKey.get("minimum_sample");
  if (minimum?.active && sessions < minimum.minSessions) {
    insights.push({ id: "minimum_sample", title: "Amostra ainda pequena", whatHappened: `${sessions.toLocaleString("pt-BR")} sessões foram registradas no período.`, whyAttention: `O critério pede pelo menos ${minimum.minSessions.toLocaleString("pt-BR")} sessões antes de uma leitura mais estável.`, evidence: [`Sessões atuais: ${sessions.toLocaleString("pt-BR")}`, `Amostra mínima configurada: ${minimum.minSessions.toLocaleString("pt-BR")}`], hypothesis: "As taxas ainda podem variar bastante com poucas novas visitas.", confidence: "Baixa", nextStep: "Acompanhar mais dados antes de alterar a página com base apenas neste período.", criterionKey: minimum.key });
  }
  const relevant = byKey.get("relevant_step_drop");
  if (relevant?.active && sessions >= relevant.minSessions) {
    const candidates = journey.detailed.slice(1).map((step, index) => ({ step, previous: journey.detailed[index] }))
      .filter(({ step }) => step.fromPreviousPercent !== null && step.lossFromPrevious !== null)
      .map(({ step, previous }) => ({ step, previous, lossPercent: 100 - (step.fromPreviousPercent ?? 100) }));
    const largest = candidates.sort((a, b) => b.lossPercent - a.lossPercent)[0];
    const previousMatch = previousJourney.detailed.find((step) => step.key === largest?.step.key);
    if (largest && largest.lossPercent >= relevant.thresholdPercent) insights.push({ id: "relevant_step_drop", title: "Maior perda do período", whatHappened: `${largest.previous.value?.toLocaleString("pt-BR")} sessões chegaram a ${largest.previous.label.toLowerCase()}, e ${largest.step.value?.toLocaleString("pt-BR")} avançaram para ${largest.step.label.toLowerCase()}.`, whyAttention: `A perda de ${largest.lossPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ultrapassou o critério configurado de ${relevant.thresholdPercent.toLocaleString("pt-BR") }%.`, evidence: [`${largest.step.lossFromPrevious?.toLocaleString("pt-BR")} sessões não avançaram`, `${largest.step.fromPreviousPercent?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% avançaram para a etapa seguinte`], hypothesis: "Algum elemento antes dessa etapa pode estar reduzindo o avanço, mas os dados não identificam a causa sozinhos.", confidence: confidence(sessions, relevant, previousSessions >= relevant.minSessions && previousMatch !== undefined && (previousMatch.fromPreviousPercent ?? 100) <= 100 - relevant.thresholdPercent), nextStep: "Examinar as seções e origens dessas sessões antes de propor uma mudança na página.", criterionKey: relevant.key });
  }
  const cta = byKey.get("low_cta_exposure");
  const ctaStep = journey.detailed.find((step) => step.key === "cta_view");
  const previousCta = previousJourney.detailed.find((step) => step.key === "cta_view");
  if (cta?.active && sessions >= cta.minSessions && (ctaStep?.fromSessionsPercent ?? 100) < cta.thresholdPercent) insights.push({ id: "low_cta_exposure", title: "Baixa exposição ao CTA", whatHappened: `${ctaStep?.value?.toLocaleString("pt-BR")} de ${sessions.toLocaleString("pt-BR")} sessões chegaram a ver o CTA.`, whyAttention: `A exposição de ${(ctaStep?.fromSessionsPercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ficou abaixo do critério de ${cta.thresholdPercent.toLocaleString("pt-BR") }%.`, evidence: [`CTA visto em ${ctaStep?.value?.toLocaleString("pt-BR")} sessões`, `${Math.max(0, sessions - (ctaStep?.value ?? 0)).toLocaleString("pt-BR")} sessões sem visualização registrada do CTA`], hypothesis: "A posição do CTA ou o abandono em seções anteriores podem estar contribuindo para a baixa exposição.", confidence: confidence(sessions, cta, previousSessions >= cta.minSessions && (previousCta?.fromSessionsPercent ?? 100) < cta.thresholdPercent), nextStep: "Verificar onde as sessões param antes de testar uma nova posição ou apresentação do CTA.", criterionKey: cta.key });
  const checkout = byKey.get("low_checkout_progress");
  const clickStep = journey.detailed.find((step) => step.key === "cta_click");
  const checkoutStep = journey.detailed.find((step) => step.key === "checkout");
  const clickCount = clickStep?.value ?? 0;
  const clickToCheckout = clickCount ? ((checkoutStep?.value ?? 0) / clickCount) * 100 : null;
  const previousClick = previousJourney.detailed.find((step) => step.key === "cta_click")?.value ?? 0;
  const previousCheckout = previousJourney.detailed.find((step) => step.key === "checkout")?.value ?? 0;
  if (checkout?.active && clickCount >= checkout.minSessions && clickToCheckout !== null && clickToCheckout < checkout.thresholdPercent) insights.push({ id: "low_checkout_progress", title: "Avanço reduzido após o clique", whatHappened: `${clickCount.toLocaleString("pt-BR")} sessões clicaram no CTA e ${(checkoutStep?.value ?? 0).toLocaleString("pt-BR")} registraram checkout.`, whyAttention: `O avanço de ${clickToCheckout.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ficou abaixo do critério de ${checkout.thresholdPercent.toLocaleString("pt-BR") }%.`, evidence: [`Cliques no CTA: ${clickCount.toLocaleString("pt-BR")}`, `Checkouts: ${(checkoutStep?.value ?? 0).toLocaleString("pt-BR")}`], hypothesis: "Pode existir desistência, bloqueio de navegação ou diferença de instrumentação entre o clique e a chegada ao checkout.", confidence: confidence(clickCount, checkout, previousClick >= checkout.minSessions && previousClick > 0 && (previousCheckout / previousClick) * 100 < checkout.thresholdPercent), nextStep: "Validar o caminho do CTA ao checkout e comparar o comportamento por origem.", criterionKey: checkout.key });
  return insights;
}
