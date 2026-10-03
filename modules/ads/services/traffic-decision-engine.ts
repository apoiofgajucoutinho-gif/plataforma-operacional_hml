import type { AdsDecisionConfig, AdsReconciliationSummary } from "@/modules/ads/types";

export type DecisionAd = {
  key: string;
  name: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  lpv: number;
  checkouts: number;
  metaPurchases: number;
  linkCtr: number | null;
  linkCpc: number | null;
  days: number;
};

export type DecisionState =
  | "Evidência comercial forte"
  | "Sinal comercial inicial"
  | "Bom tráfego, conversão ainda não comprovada"
  | "Sinal promissor, amostra pequena"
  | "Sinal de atenção"
  | "Resultado contraditório"
  | "Amostra insuficiente"
  | "Divergência de mensuração";

export type RecommendedAction = {
  adKey: string;
  adName: string;
  state: DecisionState;
  action: "manter" | "manter e ganhar amostra" | "observar" | "investigar pós-clique" | "revisar criativo" | "revisar público" | "revisar tracking" | "considerar reduzir" | "considerar pausar" | "priorizar" | "considerar teste de incremento" | "nenhuma ação ainda";
  why: string;
  evidence: string;
  confidence: "Baixa" | "Média" | "Alta";
  confidenceReason: string;
  impact: string;
  review: string;
  priority: number;
};

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function reviewFor(ad: DecisionAd, config: AdsDecisionConfig, commercialSignal = false, nextMetaCollection?: string | null) {
  const collection = nextMetaCollection ? `após a coleta das ${nextMetaCollection}` : `em ${config.reviewHours}h`;
  if (commercialSignal) return `Após reconciliar a próxima venda Hotmart ou ${collection}.`;
  const missing = Math.max(1, config.reviewLinkClicksIncrement - (ad.linkClicks % config.reviewLinkClicksIncrement));
  return `Após +${missing} link clicks ou ${collection}, o que ocorrer primeiro.`;
}

function confidenceFor(ad: DecisionAd, measurement: AdsReconciliationSummary["measurement"]) {
  if (ad.linkClicks < 5) return { confidence: "Baixa" as const, reason: `Apenas ${ad.linkClicks} link clicks e R$ ${ad.spend.toFixed(2).replace(".", ",")} investidos.` };
  if (measurement.quality === "Fraca") return { confidence: "Baixa" as const, reason: `Mensuração fraca: ${measurement.reasons[0] ?? "cobertura insuficiente"}.` };
  if (ad.linkClicks >= 20 && measurement.quality === "Boa") return { confidence: "Alta" as const, reason: "Amostra mínima atingida e fontes com boa concordância." };
  return { confidence: "Média" as const, reason: `Há ${ad.linkClicks} link clicks, mas a mensuração ainda é ${measurement.quality.toLowerCase()}.` };
}

export function buildTrafficDecisions(
  ads: DecisionAd[],
  config: AdsDecisionConfig,
  reconciliation: AdsReconciliationSummary,
  nextMetaCollection?: string | null,
  operational?: { status: "Saudável" | "Atenção" | "Crítico" | "Aguardando dados" },
) {
  const maturePeers = ads.filter((ad) => ad.linkClicks >= config.minLinkClicksDecision);
  const comparable = maturePeers.length ? maturePeers : ads.filter((ad) => ad.linkClicks >= config.minLinkClicksSignal);
  const medianCtr = median(comparable.map((ad) => ad.linkCtr ?? 0));
  const medianCpc = median(comparable.map((ad) => ad.linkCpc ?? 0).filter((value) => value > 0));

  const decisions = ads.map((ad): RecommendedAction => {
    const confidence = confidenceFor(ad, reconciliation.measurement);
    const goodTraffic = ad.linkClicks >= config.minLinkClicksSignal && ((ad.linkCtr ?? 0) >= medianCtr || (medianCpc > 0 && (ad.linkCpc ?? Infinity) <= medianCpc));
    const enough = ad.linkClicks >= config.minLinkClicksDecision;
    const commercial = ad.metaPurchases > 0;
    const progressed = ad.checkouts > 0 || ad.lpv > 0;
    const trackingDivergence = ad.linkClicks >= config.minLinkClicksSignal && ad.lpv < ad.linkClicks * 0.25;
    const meaningfulSpend = config.meaningfulSpend != null ? ad.spend >= config.meaningfulSpend : enough;

    if (operational?.status === "Crítico") {
      return {
        adKey: ad.key,
        adName: ad.name,
        state: "Sinal de atenção",
        action: "investigar pós-clique",
        why: "LP ou checkout apresenta indisponibilidade operacional. O resultado comercial não deve ser atribuído ao anúncio antes de normalizar a jornada.",
        evidence: `${ad.linkClicks} link clicks · ${ad.lpv} LPVs · ${ad.checkouts} checkout.`,
        confidence: "Baixa",
        confidenceReason: "A indisponibilidade operacional limita a interpretação do desempenho comercial.",
        impact: "Separar falha da jornada de uma hipótese de mídia antes de alterar criativo, público ou orçamento.",
        review: "Após nova verificação saudável da LP e do checkout.",
        priority: 0,
      };
    }

    if (commercial && !reconciliation.hotmart.adAttributionAvailable) {
      return { adKey: ad.key, adName: ad.name, state: goodTraffic || ad.checkouts > 0 ? "Sinal comercial inicial" : "Resultado contraditório", action: "observar", why: "A Meta atribuiu compra, mas a Hotmart ainda não determina o anúncio.", evidence: `${ad.metaPurchases} Meta Purchase · ${ad.checkouts} checkout · ${ad.linkClicks} link clicks · R$ ${ad.spend.toFixed(2).replace(".", ",")}.`, confidence: confidence.confidence, confidenceReason: confidence.reason, impact: "Preservar o sinal comercial sem confundi-lo com venda confirmada.", review: reviewFor(ad, config, true, nextMetaCollection), priority: 1 };
    }
    if (goodTraffic && !commercial && ad.checkouts === 0) {
      return { adKey: ad.key, adName: ad.name, state: enough ? "Bom tráfego, conversão ainda não comprovada" : "Sinal promissor, amostra pequena", action: enough ? "investigar pós-clique" : "manter e ganhar amostra", why: trackingDivergence ? "O topo do funil está saudável em relação aos pares, mas a passagem de clique para LPV precisa ser investigada antes de alterar o anúncio." : "O topo do funil está saudável em relação aos pares, sem resultado comercial comprovado.", evidence: `${ad.linkClicks} link clicks · CTR de link ${(ad.linkCtr ?? 0).toFixed(1).replace(".", ",")}% · CPC de link R$ ${(ad.linkCpc ?? 0).toFixed(2).replace(".", ",")}.`, confidence: confidence.confidence, confidenceReason: confidence.reason, impact: enough ? "Localizar a perda depois do clique antes de mexer no anúncio." : "Ganhar base comparável sem encerrar cedo um sinal inicial.", review: reviewFor(ad, config, false, nextMetaCollection), priority: enough ? 2 : 4 };
    }
    if (trackingDivergence && reconciliation.measurement.quality !== "Boa") {
      return { adKey: ad.key, adName: ad.name, state: "Divergência de mensuração", action: "revisar tracking", why: "Cliques e LPVs contam histórias diferentes, reduzindo a segurança da decisão.", evidence: `${ad.linkClicks} link clicks · ${ad.lpv} LPVs Meta.`, confidence: "Média", confidenceReason: "A divergência é objetiva, mas pode vir de consentimento, semântica ou carregamento.", impact: "Evitar ajuste de mídia baseado em uma passagem pós-clique incompleta.", review: `Em ${config.reviewHours}h ou após uma nova coleta V9.`, priority: 0 };
    }
    if (enough && meaningfulSpend && !commercial && !progressed && !goodTraffic) {
      return { adKey: ad.key, adName: ad.name, state: "Sinal de atenção", action: "considerar reduzir", why: "Há gasto e amostra suficientes, desempenho inferior aos pares e pouca progressão pós-clique.", evidence: `${ad.linkClicks} link clicks · ${ad.lpv} LPVs · ${ad.checkouts} checkout · R$ ${ad.spend.toFixed(2).replace(".", ",")}.`, confidence: confidence.confidence, confidenceReason: confidence.reason, impact: "Reduzir exposição a uma hipótese fraca sem executar pausa automática.", review: reviewFor(ad, config, false, nextMetaCollection), priority: 3 };
    }
    if (ad.linkClicks < config.minLinkClicksSignal) {
      return { adKey: ad.key, adName: ad.name, state: "Amostra insuficiente", action: "manter e ganhar amostra", why: "O volume ainda muda demais com poucos eventos.", evidence: `${ad.linkClicks} link clicks · ${ad.impressions} impressões · R$ ${ad.spend.toFixed(2).replace(".", ",")}.`, confidence: "Baixa", confidenceReason: confidence.reason, impact: "Evitar decisão prematura.", review: `Ao atingir ${config.minLinkClicksSignal} link clicks ou em ${config.reviewHours}h.`, priority: 5 };
    }
    return { adKey: ad.key, adName: ad.name, state: progressed ? "Sinal promissor, amostra pequena" : "Amostra insuficiente", action: progressed ? "observar" : "nenhuma ação ainda", why: progressed ? "Existe progressão pós-clique, mas ainda não há evidência comercial suficiente." : "Nenhum conjunto de sinais atingiu os critérios de decisão.", evidence: `${ad.linkClicks} link clicks · ${ad.lpv} LPVs · ${ad.checkouts} checkout.`, confidence: confidence.confidence, confidenceReason: confidence.reason, impact: "Continuar observando sem alterar mídia.", review: reviewFor(ad, config, false, nextMetaCollection), priority: 4 };
  });

  return {
    decisions: decisions.sort((a, b) => a.priority - b.priority),
    actions: decisions.filter((item) => item.action !== "nenhuma ação ainda").sort((a, b) => a.priority - b.priority).slice(0, 3),
    waiting: decisions.filter((item) => item.confidence === "Baixa" || item.state === "Resultado contraditório" || item.state === "Divergência de mensuração").slice(0, 4),
    benchmarks: { medianCtr, medianCpc },
  };
}
