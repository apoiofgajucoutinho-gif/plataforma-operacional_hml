import { canonicalProductIdForSaleWithIdentities, normalizeProductIdentity } from "@/modules/norwyn/services/product-identity";
import type { NorwynCommercialSale, NorwynContext } from "@/modules/norwyn/types";

export type LifecycleStatus = "ELIGIBLE" | "EXCLUDED" | "NEEDS_REVIEW";

export type LifecycleProductRef = {
  key: string;
  label: string;
  productId: string | null;
  hotmartIds: string[];
  vertical: "AASI" | "ZUMBIDO" | "DIAGNOSTICO" | "TOOLS" | "UNKNOWN";
  strategicRole: string;
};

export type LifecyclePerson = {
  personKey: string;
  customerHash: string;
  products: string[];
  productIds: string[];
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  ltvCommercial: number;
  purchases: number;
};

export type LifecycleEconomics = {
  buyers: number;
  revenue: number;
  averageTicket: number | null;
  averageLtv: number | null;
  medianLtv: number | null;
  oneProductCustomers: number;
  twoProductCustomers: number;
  threeProductCustomers: number;
  fourPlusProductCustomers: number;
  secondPurchaseRate: number | null;
  averageDaysToSecondPurchase: number | null;
  medianDaysToSecondPurchase: number | null;
  refunds: number;
};

export type LifecycleCohort = {
  key: string;
  label: string;
  total: number;
  eligible: number;
  excluded: number;
  needsReview: number;
  averageLtv: number | null;
  medianLtv: number | null;
};

export type EligibilityMember = {
  customerHash: string;
  status: LifecycleStatus;
  ownedProducts: string[];
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  ltvCommercial: number;
  hasFormation: boolean;
  eligibilityReasons: string[];
  exclusionReasons: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
};

export type EligibilityDryRun = {
  journeyKey: string;
  label: string;
  total: number;
  eligible: number;
  excluded: number;
  needsReview: number;
  eligibleWithFormation: number;
  eligibleWithoutFormation: number;
  averageLtvEligible: number | null;
  medianLtvEligible: number | null;
  sample: EligibilityMember[];
  missingFields: string[];
};

export type Mission1ValidationStatus = "OK" | "REVIEW" | "POTENTIAL_CONFLICT" | "EXCLUDED";
export type Mission1NorwynRecommendation = "PODE_OFERTAR" | "VALIDAR_OFERTA" | "POSSIVEL_CONFLITO" | "NAO_OFERTAR";
export type Mission1ReviewReasonCode = "ONLY_ZUMBIDO" | "HAS_FORMACAO_AASI" | "HAS_MRC" | "MULTIPRODUCT" | "HAS_RELATED_AJUSTES_PRODUCT" | "HAS_BUNDLE" | "REFUND_OR_CANCELLATION_HISTORY" | "COMMERCIAL_SPECIAL_CASE" | "ALREADY_HAS_OFFER_PRODUCT" | "UNKNOWN_PRODUCT_MAPPING" | "NON_BRL_HISTORY" | "OTHER" | "NONE";
export type Mission1DataQualityReason = "NON_BRL_HISTORY" | "UNKNOWN_PRODUCT_MAPPING" | "MULTIPLE_DATA_QUALITY_FLAGS" | "NONE";
export type Mission1ReviewCategory = "COMMERCIAL" | "CLINICAL" | "PRODUCT_CONFLICT" | "DATA_QUALITY" | "NONE";
export type Mission1HumanReviewDecision = "APPROVE_OFFER" | "DO_NOT_OFFER" | "KEEP_REVIEW" | "NOT_REVIEWED";

export type Mission1ValidationJourneyEvent = {
  date: string | null;
  productName: string;
  hotmartProductId: string | null;
  value: number;
  status: string | null;
};

export type Mission1ValidationPerson = {
  customerHash: string;
  name: string | null;
  email: string;
  phone: string | null;
  status: Mission1ValidationStatus;
  norwynRecommendation: Mission1NorwynRecommendation;
  norwynRecommendationLabel: string;
  reviewReasonPrimary: Mission1ReviewReasonCode;
  reviewReasonPrimaryLabel: string;
  reviewReasonAll: Mission1ReviewReasonCode[];
  reviewReasonAllLabels: string[];
  reviewCategory: Mission1ReviewCategory;
  reviewCategoryLabel: string;
  dataQualityReviewRequired: boolean;
  dataQualityReason: Mission1DataQualityReason;
  dataQualityReasonLabel: string;
  dataQualityPending: string;
  suggestedReviewer: string;
  unknownProductNames: string[];
  humanReviewDecision: Mission1HumanReviewDecision;
  humanReviewNotes: string;
  reviewedBy: string;
  reviewedAt: string;
  segmentKeys: string[];
  firstProduct: string | null;
  products: string[];
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  purchases: number;
  ltvCommercial: number;
  boughtZumbido: boolean;
  zumbidoProductId: string | null;
  originEvidenceStatus: "ZUMBIDO_CONFIRMED" | "ZUMBIDO_CONFIRMED_VIA_ALIAS" | "ZUMBIDO_CONFIRMED_VIA_RELATED_PRODUCT" | "ZUMBIDO_NOT_FOUND" | "ZUMBIDO_CONFLICT";
  originHotmartProductId: string | null;
  originPurchaseAt: string | null;
  originTransactionStatus: string | null;
  dataQualityStatus: "OK" | "NON_BRL_REQUIRES_CONVERSION" | "REVIEW";
  boughtFormationAasi: boolean;
  boughtMrc: boolean;
  boughtAjustesFinos: boolean;
  boughtPerdaRampa: boolean;
  otherRelevantProducts: string[];
  lastKnownInteraction: string | null;
  recentSupport: string | null;
  activeCampaignStatus: string;
  eligibilityReason: string;
  exclusionReason: string | null;
  reviewReasons: string[];
  journey: Mission1ValidationJourneyEvent[];
};

export type Mission1ValidationPackVariant = "final" | "review";

export type Mission1ValidationPack = {
  summary: {
    total: number;
    eligible: number;
    excluded: number;
    clearlyOk: number;
    potentialConflict: number;
    needsHumanReview: number;
    withFormationAasi: number;
    withMrc: number;
    withAjustesRelated: number;
    multiproduct: number;
    zumbidoOnly: number;
    humanCanOffer: number;
    dataQualityReviewRequired: number;
    needsDataOpsReview: number;
    needsJulianaReview: number;
  };
  segments: Array<{ key: string; label: string; count: number; description: string }>;
  people: Mission1ValidationPerson[];
  representativeAmbiguities: Mission1ValidationPerson[];
  exportRows: Array<Record<string, string | number | boolean | null>>;
  reviewStorage: { status: "EXISTING_STRUCTURE_AVAILABLE" | "NEEDS_STRUCTURE"; evidence: string };
};
export type LifecycleExecutionClosure = {
  offerKey: string;
  activeCampaign: {
    status: "CONFIGURED" | "NOT CONFIGURED";
    evidence: string[];
  };
  emailFirstReadiness: {
    status: "READY" | "NOT READY";
    total: number;
    eligible: number;
    readyToSend: number;
    activeSubscribed: number;
    unsubscribed: number;
    bouncedSuppressed: number;
    notFound: number;
    notSynced: number;
    reviewRequired: number;
    allowedByPolicy: number;
    blockedByPolicy: number;
    optedOut: number;
    commercialBlocked: number;
    alreadyExposed: number;
    unknownConsent: number;
    blockedByUnknownConsent: number;
    copyStatus: string;
    approvalStatus: string;
    risks: string[];
  };
  exposureRule: {
    cooldownDays: number | null;
    maxExposures: number | null;
    exitOnPurchase: boolean;
    exitOnOptout: boolean;
    exitOnBlock: boolean;
    status: string;
    requiresHumanApproval: boolean;
  } | null;
  eventDashboard: Array<{ label: string; value: number; note: string }>;
  internalTest: {
    status: "READY" | "NOT READY";
    total: number;
    authorized: number;
    exitOnPurchaseTest: "PASS" | "NOT RUN";
    evidence: string[];
  };
  segments: {
    withFormation: { eligible: number; readyToSend: number; purchases: number; revenue: number };
    withoutFormation: { eligible: number; readyToSend: number; purchases: number; revenue: number };
  };
  qaGates: Array<{ label: string; status: "PASS" | "BLOCKED" | "MISSING"; evidence: string }>;
  sequenceDrafts: Array<{ day: string; role: string; status: "DRAFT_REQUIRED" | "READY_FOR_REVIEW" | "APPROVED"; note: string }>;
  validationPack: Mission1ValidationPack;
};

export type ProductJourneyObservation = {
  from: string;
  to: string;
  buyers: number;
  averageDays: number | null;
  medianDays: number | null;
  revenueAfter: number;
  status: "OBSERVED" | "HYPOTHESIS" | "APPROVED_STRATEGY";
};

export type LifecycleExperimentPlan = {
  key: string;
  name: string;
  status: string;
  hypothesis: string;
  cohort: string;
  offer: string;
  sampleSize: number;
  variants: string[];
  executableAfterApproval: boolean;
  blockers: string[];
};

export type LifecycleSnapshot = {
  mission: {
    name: string;
    period: string;
    phases: Array<{ label: string; focus: string; months: string }>;
  };
  products: LifecycleProductRef[];
  economics: LifecycleEconomics;
  cohorts: LifecycleCohort[];
  eligibility: EligibilityDryRun[];
  journeyGraph: ProductJourneyObservation[];
  experiments: LifecycleExperimentPlan[];
  channelContract: Array<{ channel: string; status: string; contract: string }>;
  executionClosure: LifecycleExecutionClosure;
};

const FORMATION_KEY = "aasi";

const missionProductMatchers: Array<Omit<LifecycleProductRef, "productId" | "hotmartIds"> & { patterns: RegExp[] }> = [
  { key: "aasi", label: "Formacao AASI", vertical: "AASI", strategicRole: "ascension / flagship", patterns: [/aasi/] },
  { key: "mentoria_aasi", label: "Mentoria AASI sem Segredo", vertical: "AASI", strategicRole: "legacy / related formation", patterns: [/mentoria.*aasi/] },
  { key: "zumbido", label: "Imersao Zumbido", vertical: "ZUMBIDO", strategicRole: "entry product / cohort source", patterns: [/zumbido/] },
  { key: "ajustes_finos", label: "Ajustes Finos", vertical: "AASI", strategicRole: "intermediate offer", patterns: [/ajustes? finos?/] },
  { key: "perda_rampa", label: "Perda em Rampa", vertical: "AASI", strategicRole: "intermediate offer variant", patterns: [/perda em rampa/, /rampa/] },
  { key: "mrc", label: "Mapa do Raciocinio Clinico", vertical: "DIAGNOSTICO", strategicRole: "diagnostic vertical; do not move to AASI without approval", patterns: [/mapa do raciocinio/, /\bmrc\b/, /crosscheck/, /mascaramento/] },
  { key: "planner_protocolo", label: "Planner/Protocolo Fono Premium", vertical: "TOOLS", strategicRole: "tool cohort for experiment 02", patterns: [/planner/, /protocolo fono/] },
  { key: "adi", label: "Audiologia Diagnostica Pediatrica", vertical: "DIAGNOSTICO", strategicRole: "learning-first cohort", patterns: [/audiologia diagnostica pediatrica/, /\badi\b/] },
  { key: "tecnologias_auditivas", label: "Tecnologias Auditivas", vertical: "UNKNOWN", strategicRole: "legacy/related product", patterns: [/tecnologias auditivas/] },
];

export function buildLifecycleSnapshot(context: NorwynContext): LifecycleSnapshot {
  const productRefs = buildMissionProductRefs(context);
  const commercialPurchases = context.commercialSales.filter(isLifecycleCommercialPurchase);
  const people = buildPeople({ ...context, commercialSales: commercialPurchases }, productRefs);
  const economics = buildEconomics(people, commercialPurchases);
  const zumbidoToAjustes = buildEligibility("zumbido_to_ajustes_finos", "Zumbido -> Ajustes Finos", people, productRefs, "zumbido", "ajustes_finos");
  const plannerToAjustes = buildEligibility("planner_protocolo_to_ajustes_or_rampa", "Planner/Protocolo -> Ajustes Finos x Perda em Rampa", people, productRefs, "planner_protocolo", "ajustes_finos");
  const executionClosure = buildExecutionClosure(context, zumbidoToAjustes);

  return {
    mission: {
      name: "Maquina de recompra, ascensao e retencao - Set/Nov 2026",
      period: "Setembro a Novembro/2026",
      phases: [
        { label: "SETEMBRO", focus: "BUILD & VALIDATE: identidade, coortes, elegibilidade, Teste 1 e Teste 2", months: "2026-09" },
        { label: "OUTUBRO", focus: "SYSTEMATIZE: evergreen, regras automaticas, lista Formacao, renovacao", months: "2026-10" },
        { label: "NOVEMBRO", focus: "SCALE: Instagram/ManyChat, trafego progressivo, CAC, learning 2027", months: "2026-11" },
      ],
    },
    products: productRefs,
    economics,
    cohorts: buildCohorts(people, productRefs, zumbidoToAjustes, plannerToAjustes),
    eligibility: [zumbidoToAjustes, plannerToAjustes],
    journeyGraph: buildObservedJourneyGraph({ ...context, commercialSales: commercialPurchases }, productRefs),
    experiments: [
      {
        key: "experiment_01_zumbido_to_ajustes",
        name: "Experimento 01 - Zumbido -> Ajustes Finos",
        status: "planned",
        hypothesis: "Ajustes Finos pode funcionar como produto intermediario para compradores de Zumbido.",
        cohort: "Zumbido buyers without Ajustes Finos",
        offer: "Ajustes Finos",
        sampleSize: zumbidoToAjustes.eligible,
        variants: ["sem disparo", "oferta Ajustes Finos"],
        executableAfterApproval: zumbidoToAjustes.eligible > 0,
        blockers: zumbidoToAjustes.missingFields,
      },
      {
        key: "experiment_02_planner_to_ajustes_vs_rampa",
        name: "Experimento 02 - Planner/Protocolo -> Ajustes Finos x Perda em Rampa",
        status: "planned",
        hypothesis: "Populacoes equivalentes de Planner/Protocolo podem responder de forma diferente a Ajustes Finos versus Perda em Rampa.",
        cohort: "Planner/Protocolo-only",
        offer: "A/B: Ajustes Finos x Perda em Rampa",
        sampleSize: plannerToAjustes.eligible,
        variants: ["Ajustes Finos", "Perda em Rampa"],
        executableAfterApproval: plannerToAjustes.eligible >= 2,
        blockers: plannerToAjustes.eligible < 2 ? ["Amostra elegivel insuficiente para randomizacao A/B minimamente util."] : plannerToAjustes.missingFields,
      },
    ],
    channelContract: [
      { channel: "ActiveCampaign", status: "NOT INSTRUMENTED", contract: "Norwyn determina populacao elegivel; canal executa; eventos retornam como Customer Offer Events." },
      { channel: "ManyChat", status: "NOT INSTRUMENTED", contract: "Sem disparo nesta etapa; preparar tags/eventos de volta antes de aprovar." },
      { channel: "WhatsApp/SellFlux", status: "NOT INSTRUMENTED", contract: "Uso futuro exige retorno de WHATSAPP_SENT, LINK_CLICK e MANUAL_CONTACT." },
    ],
    executionClosure,
  };
}

function isLifecycleCommercialPurchase(sale: NorwynCommercialSale) {
  const status = String(sale.status_normalizado ?? sale.status_original ?? "").toUpperCase();
  const value = Number(sale.valor_bruto ?? 0);
  return value > 0 && ["APPROVED", "COMPLETE", "COMPLETED"].includes(status);
}

function buildMissionProductRefs(context: NorwynContext): LifecycleProductRef[] {
  return missionProductMatchers.map((matcher) => {
    const identities = context.productExternalIdentities.filter((identity) => {
      const haystack = normalizeProductIdentity([identity.product_key, identity.external_name, identity.external_id].join(" "));
      return matcher.patterns.some((pattern) => pattern.test(haystack));
    });
    const product = context.products.find((item) => {
      const haystack = normalizeProductIdentity([item.nome_oficial, item.produto_base, item.metadata ? JSON.stringify(item.metadata) : ""].join(" "));
      return matcher.patterns.some((pattern) => pattern.test(haystack));
    });
    const saleIds = context.commercialSales
      .filter((sale) => matcher.patterns.some((pattern) => pattern.test(normalizeProductIdentity([sale.produto_nome, sale.hotmart_product_id].join(" ")))))
      .map((sale) => sale.hotmart_product_id)
      .filter(Boolean) as string[];
    return {
      key: matcher.key,
      label: product?.nome_oficial ?? identities[0]?.external_name ?? matcher.label,
      productId: product?.id ?? identities.find((identity) => identity.product_id)?.product_id ?? null,
      hotmartIds: [...new Set([...identities.map((identity) => identity.external_id).filter(Boolean), ...saleIds])] as string[],
      vertical: matcher.vertical,
      strategicRole: matcher.strategicRole,
    };
  });
}

function productKeyForSale(sale: NorwynCommercialSale, refs: LifecycleProductRef[], context: NorwynContext) {
  const canonicalId = canonicalProductIdForSaleWithIdentities(sale, context.products, context.productExternalIdentities);
  const byId = refs.find((ref) => ref.productId && ref.productId === canonicalId);
  if (byId) return byId.key;
  const haystack = normalizeProductIdentity([sale.produto_nome, sale.hotmart_product_id].join(" "));
  return refs.find((ref) => ref.hotmartIds.includes(String(sale.hotmart_product_id)) || missionProductMatchers.find((matcher) => matcher.key === ref.key)?.patterns.some((pattern) => pattern.test(haystack)))?.key ?? "unknown";
}

function buildPeople(context: NorwynContext, refs: LifecycleProductRef[]): LifecyclePerson[] {
  const grouped = new Map<string, NorwynCommercialSale[]>();
  for (const sale of context.commercialSales) {
    const email = String(sale.comprador_email ?? "").trim().toLowerCase();
    if (!email) continue;
    grouped.set(email, [...(grouped.get(email) ?? []), sale]);
  }
  return [...grouped.entries()].map(([email, sales]) => {
    const sorted = [...sales].sort((a, b) => String(a.data_aprovacao ?? a.data_compra ?? "").localeCompare(String(b.data_aprovacao ?? b.data_compra ?? "")));
    const products = [...new Set(sorted.map((sale) => productKeyForSale(sale, refs, context)))];
    const productIds = [...new Set(sorted.map((sale) => canonicalProductIdForSaleWithIdentities(sale, context.products, context.productExternalIdentities)).filter(Boolean))];
    return {
      personKey: email,
      customerHash: hash(email),
      products,
      productIds,
      firstPurchaseAt: sorted[0]?.data_aprovacao ?? sorted[0]?.data_compra ?? null,
      lastPurchaseAt: sorted.at(-1)?.data_aprovacao ?? sorted.at(-1)?.data_compra ?? null,
      ltvCommercial: sorted.reduce((sum, sale) => sum + commercialValueBrl(sale), 0),
      purchases: sorted.length,
    };
  });
}

function buildEconomics(people: LifecyclePerson[], sales: NorwynCommercialSale[]): LifecycleEconomics {
  const ltvs = people.map((person) => person.ltvCommercial).sort((a, b) => a - b);
  const productCounts = people.map((person) => person.products.filter((product) => product !== "unknown").length);
  const secondPurchaseDays = people
    .map((person) => daysBetweenFirstTwoPurchases(person.personKey, sales))
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  const revenue = sales.reduce((sum, sale) => sum + commercialValueBrl(sale), 0);
  return {
    buyers: people.length,
    revenue,
    averageTicket: sales.length ? revenue / sales.length : null,
    averageLtv: average(ltvs),
    medianLtv: median(ltvs),
    oneProductCustomers: productCounts.filter((count) => count === 1).length,
    twoProductCustomers: productCounts.filter((count) => count === 2).length,
    threeProductCustomers: productCounts.filter((count) => count === 3).length,
    fourPlusProductCustomers: productCounts.filter((count) => count >= 4).length,
    secondPurchaseRate: people.length ? people.filter((person) => person.purchases >= 2).length / people.length : null,
    averageDaysToSecondPurchase: average(secondPurchaseDays),
    medianDaysToSecondPurchase: median(secondPurchaseDays),
    refunds: sales.filter((sale) => normalizeProductIdentity(sale.status_normalizado ?? sale.status_original).includes("refund")).length,
  };
}

function buildEligibility(journeyKey: string, label: string, people: LifecyclePerson[], refs: LifecycleProductRef[], sourceKey: string, targetKey: string): EligibilityDryRun {
  const source = refs.find((ref) => ref.key === sourceKey);
  const target = refs.find((ref) => ref.key === targetKey);
  const candidates = people.filter((person) => person.products.includes(sourceKey));
  const members = candidates.map((person): EligibilityMember => {
    const exclusionReasons: string[] = [];
    const eligibilityReasons = [`Comprou ${source?.label ?? sourceKey}.`];
    if (person.products.includes(targetKey)) exclusionReasons.push(`Ja possui ${target?.label ?? targetKey}.`);
    if (!person.lastPurchaseAt) exclusionReasons.push("Sem data de compra confiavel.");
    const status: LifecycleStatus = exclusionReasons.length ? "EXCLUDED" : "ELIGIBLE";
    return {
      customerHash: person.customerHash,
      status,
      ownedProducts: person.products,
      firstPurchaseAt: person.firstPurchaseAt,
      lastPurchaseAt: person.lastPurchaseAt,
      ltvCommercial: person.ltvCommercial,
      hasFormation: person.products.includes(FORMATION_KEY),
      eligibilityReasons,
      exclusionReasons,
      confidence: "HIGH",
    };
  });
  const eligibleMembers = members.filter((member) => member.status === "ELIGIBLE");
  return {
    journeyKey,
    label,
    total: members.length,
    eligible: eligibleMembers.length,
    excluded: members.filter((member) => member.status === "EXCLUDED").length,
    needsReview: members.filter((member) => member.status === "NEEDS_REVIEW").length,
    eligibleWithFormation: eligibleMembers.filter((member) => member.hasFormation).length,
    eligibleWithoutFormation: eligibleMembers.filter((member) => !member.hasFormation).length,
    averageLtvEligible: average(eligibleMembers.map((member) => member.ltvCommercial)),
    medianLtvEligible: median(eligibleMembers.map((member) => member.ltvCommercial)),
    sample: eligibleMembers.slice(0, 8),
    missingFields: ["Eventos ActiveCampaign/ManyChat/WhatsApp ainda NOT INSTRUMENTED.", "Bloqueio comercial/opt-out ainda nao instrumentado.", "Ultima oferta equivalente depende de Customer Offer Events retornando dos canais."],
  };
}

function buildExecutionClosure(context: NorwynContext, eligibility: EligibilityDryRun): LifecycleExecutionClosure {
  const offerKey = "zumbido_to_ajustes_finos_set26";
  const primaryRun = context.lifecycleEligibilityRuns.find((run) => run.run_key === "mission1_zumbido_to_ajustes_2026_08_25");
  const approval = context.lifecycleExecutionApprovals.find((item) => item.approval_key === "approval_zumbido_to_ajustes_finos_set26_email");
  const exposureRule = context.lifecycleExposureRules.find((rule) => rule.rule_key === "zumbido_to_ajustes_finos_set26_exposure") ?? null;
  const runMembers = primaryRun ? context.lifecycleEligibilityMembers.filter((member) => member.run_id === primaryRun.id) : [];
  const statusByPerson = new Map(context.customerChannelStatuses.map((status) => [status.person_key, status]));
  const offerEvents = context.customerOfferEvents.filter((event) => event.journey_key === "zumbido_to_ajustes_finos" && event.offer_key === offerKey);
  const eventCount = (types: string[]) => offerEvents.filter((event) => types.includes(event.event_type)).length;
  const eligibleMembers = runMembers.filter((member) => member.status === "ELIGIBLE");
  const channelStatuses = eligibleMembers.map((member) => statusByPerson.get(member.person_key));
  const countActiveCampaign = (statuses: string[]) => channelStatuses.filter((status) => status && statuses.includes(status.activecampaign_status)).length;
  const countPolicy = (decisions: string[]) => channelStatuses.filter((status) => status && decisions.includes(status.email_policy_decision)).length;
  const drafts = context.lifecycleMessageDrafts.filter((draft) => draft.journey_key === "zumbido_to_ajustes_finos" && draft.offer_key === offerKey);
  const internalTestContacts = context.lifecycleInternalTestContacts.filter((contact) => contact.list_key === "MISSION1_INTERNAL_TEST");
  const exitOnPurchaseTest = offerEvents.some((event) => event.event_type === "PURCHASE" && event.metadata?.environment === "test")
    && offerEvents.some((event) => event.event_type === "EXITED" && event.metadata?.environment === "test")
    ? "PASS"
    : "NOT RUN";
  const readyMembers = runMembers.filter((member) => {
    if (member.status !== "ELIGIBLE") return false;
    const status = statusByPerson.get(member.person_key);
    if (!status || status.email_status !== "OPTED_IN" || status.commercial_block || status.email_policy_decision !== "ALLOWED") return false;
    return !offerEvents.some((event) => event.person_key === member.person_key && ["APPROVED", "SENT", "EMAIL_SENT"].includes(event.event_type));
  });
  const purchases = offerEvents.filter((event) => event.event_type === "PURCHASE");
  const revenueFor = (hasFormation: boolean) => purchases.reduce((sum, event) => {
    const member = runMembers.find((item) => item.person_key === event.person_key);
    if (!member || member.has_formation !== hasFormation) return sum;
    const revenue = typeof event.metadata?.revenue === "number" ? event.metadata.revenue : 0;
    return sum + revenue;
  }, 0);
  const readyFor = (hasFormation: boolean) => readyMembers.filter((member) => member.has_formation === hasFormation).length;
  const eligibleFor = (hasFormation: boolean) => runMembers.filter((member) => member.status === "ELIGIBLE" && member.has_formation === hasFormation).length;

    const validationPack = buildMission1ValidationPack(context, runMembers);
const activeCampaignConfigured = context.customerChannelStatuses.some((status) => status.sync_status === "OK" && status.activecampaign_status !== "NOT_SYNCED");
  const readyToSend = approval?.ready_to_send ?? readyMembers.length;
  const unknownConsent = approval?.unknown_consent ?? runMembers.filter((member) => member.status === "ELIGIBLE" && (statusByPerson.get(member.person_key)?.email_status ?? "UNKNOWN") === "UNKNOWN").length;
  const risks = (approval?.risks?.length ? approval.risks : [
    "ActiveCampaign nao configurado no projeto.",
    "Opt-in de email desconhecido para a coorte real.",
    "Copy ainda exige aprovacao da Juliana.",
    "Teste interno de retorno de evento ainda nao executado.",
  ]).map(String);

  return {
    offerKey,
    activeCampaign: {
      status: activeCampaignConfigured ? "CONFIGURED" : "NOT CONFIGURED",
      evidence: activeCampaignConfigured
        ? ["Variaveis ActiveCampaign encontradas no ambiente server-side."]
        : ["Busca no codigo encontrou apenas mencoes como ferramenta externa; nenhuma API/list/tag/webhook configurado."],
    },
    emailFirstReadiness: {
      status: activeCampaignConfigured && readyToSend > 0 && approval?.copy_status === "juliana_approved" ? "READY" : "NOT READY",
      total: approval?.total ?? eligibility.total,
      eligible: approval?.eligible ?? eligibility.eligible,
      readyToSend,
      activeSubscribed: countActiveCampaign(["ACTIVE_SUBSCRIBED"]),
      unsubscribed: countActiveCampaign(["UNSUBSCRIBED"]),
      bouncedSuppressed: countActiveCampaign(["BOUNCED", "SUPPRESSED"]),
      notFound: countActiveCampaign(["NOT_FOUND"]),
      notSynced: countActiveCampaign(["NOT_SYNCED"]),
      reviewRequired: countPolicy(["REVIEW_REQUIRED"]),
      allowedByPolicy: countPolicy(["ALLOWED"]),
      blockedByPolicy: countPolicy(["BLOCKED"]),
      optedOut: approval?.opted_out ?? runMembers.filter((member) => statusByPerson.get(member.person_key)?.email_status === "OPTED_OUT").length,
      commercialBlocked: approval?.commercial_blocked ?? runMembers.filter((member) => statusByPerson.get(member.person_key)?.commercial_block).length,
      alreadyExposed: approval?.already_exposed ?? eventCount(["APPROVED", "SENT", "EMAIL_SENT"]),
      unknownConsent,
      blockedByUnknownConsent: eventCount(["BLOCKED"]),
      copyStatus: approval?.copy_status ?? "draft_required",
      approvalStatus: approval?.status ?? "review_required",
      risks,
    },
    exposureRule: exposureRule ? {
      cooldownDays: exposureRule.cooldown_days,
      maxExposures: exposureRule.max_exposures,
      exitOnPurchase: exposureRule.exit_on_purchase,
      exitOnOptout: exposureRule.exit_on_optout,
      exitOnBlock: exposureRule.exit_on_block,
      status: exposureRule.status,
      requiresHumanApproval: exposureRule.requires_human_approval,
    } : null,
    eventDashboard: [
      { label: "Eligible", value: eventCount(["ELIGIBLE"]), note: "Dry-run Norwyn; nao e envio." },
      { label: "Ready", value: readyToSend, note: "Exige opt-in, sem block, sem exposicao previa." },
      { label: "Sent", value: eventCount(["SENT", "EMAIL_SENT"]), note: "Retorno ActiveCampaign ainda nao configurado." },
      { label: "Delivered", value: eventCount(["DELIVERED", "EMAIL_DELIVERED"]), note: "Retorno ActiveCampaign ainda nao configurado." },
      { label: "Opened", value: eventCount(["OPENED", "EMAIL_OPEN"]), note: "Retorno ActiveCampaign ainda nao configurado." },
      { label: "Clicked", value: eventCount(["CLICKED", "LINK_CLICK"]), note: "Retorno ActiveCampaign ainda nao configurado." },
      { label: "Opt-out", value: eventCount(["UNSUBSCRIBED"]), note: "Retorno deve bloquear proximos disparos." },
      { label: "Bounce", value: eventCount(["BOUNCED"]), note: "Retorno deve bloquear canal email." },
      { label: "Landing", value: eventCount(["LANDING_VIEW"]), note: "Reutiliza Tracking Hardening/Funnel Observability." },
      { label: "Checkout", value: eventCount(["CHECKOUT"]), note: "Sem checkout real executado nesta rodada." },
      { label: "Purchases", value: eventCount(["PURCHASE"]), note: "Compra futura deve encerrar jornada." },
      { label: "Exited", value: eventCount(["EXITED"]), note: "Saida de jornada apos compra/opt-out/block." },
    ],
    internalTest: {
      status: internalTestContacts.some((contact) => contact.authorized && !Boolean(contact.evidence?.do_not_send)) ? "READY" : "NOT READY",
      total: internalTestContacts.length,
      authorized: internalTestContacts.filter((contact) => contact.authorized && !Boolean(contact.evidence?.do_not_send)).length,
      exitOnPurchaseTest,
      evidence: [
        `${internalTestContacts.length} contato(s) na lista MISSION1_INTERNAL_TEST.`,
        `${drafts.length} draft(s) de mensagem cadastrado(s).`,
        exitOnPurchaseTest === "PASS" ? "PURCHASE TEST gerou EXITED TEST em Customer Offer Events." : "Exit on purchase ainda sem teste registrado.",
      ],
    },
    segments: {
      withFormation: { eligible: eligibleFor(true), readyToSend: readyFor(true), purchases: purchases.filter((event) => runMembers.find((member) => member.person_key === event.person_key)?.has_formation).length, revenue: revenueFor(true) },
      withoutFormation: { eligible: eligibleFor(false), readyToSend: readyFor(false), purchases: purchases.filter((event) => runMembers.find((member) => member.person_key === event.person_key)?.has_formation === false).length, revenue: revenueFor(false) },
    },
    qaGates: [
      { label: "Produto correto", status: "PASS", evidence: "Ajustes Finos mapeado por identidade Hotmart/canonical product." },
      { label: "Landing correta", status: "MISSING", evidence: "Landing final da sequencia email first ainda precisa ser validada por Ryan." },
      { label: "Checkout correto", status: "MISSING", evidence: "Checkout deve ser validado sem compra real antes de aprovar." },
      { label: "Tracking", status: "MISSING", evidence: "Event return ActiveCampaign ainda nao configurado; Funnel Observability sera reutilizado." },
      { label: "Opt-out", status: unknownConsent > 0 ? "BLOCKED" : "PASS", evidence: `${unknownConsent} elegiveis com consentimento de email UNKNOWN.` },
      { label: "Commercial block", status: approval?.commercial_blocked ? "BLOCKED" : "PASS", evidence: `${approval?.commercial_blocked ?? 0} bloqueios comerciais registrados.` },
      { label: "Offer history", status: "PASS", evidence: "norwyn_customer_offer_events registra ELIGIBLE/EXCLUDED/BLOCKED em modo read-only." },
      { label: "Copy approved", status: approval?.copy_status === "juliana_approved" ? "PASS" : "BLOCKED", evidence: `copy_status=${approval?.copy_status ?? "draft_required"}.` },
      { label: "Experiment configured", status: approval ? "PASS" : "MISSING", evidence: approval ? `approval_key=${approval.approval_key}.` : "Approval gate ainda nao carregado." },
    ],
    sequenceDrafts: drafts.length
      ? drafts.map((draft) => ({
        day: draft.day_label,
        role: draft.objective,
        status: draft.approval_status === "JULIANA_APPROVED" ? "APPROVED" : draft.approval_status === "READY_FOR_REVIEW" ? "READY_FOR_REVIEW" : "DRAFT_REQUIRED",
        note: `${draft.channel} - ${draft.subject ?? "sem assunto"} - CTA: ${draft.cta ?? "sem CTA"}`,
      }))
      : [
        { day: "Dia 0", role: "conteudo clinico", status: "DRAFT_REQUIRED", note: "Draft estrutural; promessa e copy precisam da Juliana." },
        { day: "Dia 2", role: "caso/problema", status: "DRAFT_REQUIRED", note: "Sem inventar caso, prova ou resultado clinico." },
        { day: "Dia 5", role: "oferta", status: "DRAFT_REQUIRED", note: "Oferta Ajustes Finos exige revisao de produto/checkout." },
        { day: "Dia 7", role: "encerramento condicionado", status: "DRAFT_REQUIRED", note: "So usar se condicao real de prazo/encerramento existir." },
      ],
    validationPack,
  };
}

function buildMission1ValidationPack(context: NorwynContext, runMembers: NorwynContext["lifecycleEligibilityMembers"]): Mission1ValidationPack {
  const refs = buildMissionProductRefs(context);
  const salesByEmail = new Map<string, NorwynCommercialSale[]>();
  for (const sale of context.commercialSales) {
    const email = String(sale.comprador_email ?? "").trim().toLowerCase();
    if (!email) continue;
    salesByEmail.set(email, [...(salesByEmail.get(email) ?? []), sale]);
  }
  const people = runMembers.map((member) => {
    const email = member.person_key.trim().toLowerCase();
    const sales = [...(salesByEmail.get(email) ?? [])].sort((a, b) => String(a.data_compra ?? a.data_aprovacao ?? "").localeCompare(String(b.data_compra ?? b.data_aprovacao ?? "")));
    const productKeys = [...new Set(sales.map((sale) => productKeyForSale(sale, refs, context)))];
    const productNames = [...new Set(sales.map((sale) => sale.produto_nome).filter(Boolean) as string[])];
    const hotmartIds = [...new Set(sales.map((sale) => sale.hotmart_product_id).filter(Boolean) as string[])];
    const haystack = normalizeProductIdentity([productNames.join(" "), hotmartIds.join(" ")].join(" "));
    const zumbidoRelatedHotmartIds = new Set(["5548267", "5555696", "8221278", "8221336"]);
    const directZumbidoSale = sales.find((sale) => sale.hotmart_product_id === "1266044" || sale.produto_id === member.source_product_id);
    const relatedZumbidoSale = sales.find((sale) => zumbidoRelatedHotmartIds.has(String(sale.hotmart_product_id ?? "")));
    const aliasZumbidoSale = sales.find((sale) => productKeyForSale(sale, refs, context) === "zumbido" || normalizeProductIdentity(sale.produto_nome ?? "").includes("zumbido"));
    const zumbidoSale = directZumbidoSale ?? relatedZumbidoSale ?? aliasZumbidoSale;
    const boughtZumbido = Boolean(zumbidoSale);
    const boughtFormationAasi = member.has_formation || productKeys.includes("aasi") || /formacao aasi|formacao|\baasi\b/.test(haystack);
    const boughtMrc = productKeys.includes("mrc") || /mapa do raciocinio|mascaramento|\bmrc\b/.test(haystack);
    const boughtAjustesFinos = productKeys.includes("ajustes_finos") || /ajustes finos/.test(haystack) || hotmartIds.some((id) => ["8026798", "7862053", "8117615", "8014065"].includes(id));
    const boughtPerdaRampa = productKeys.includes("perda_rampa") || /perda em rampa|rampa/.test(haystack) || hotmartIds.some((id) => ["8026798", "7862065", "8117615", "8014065"].includes(id));
    const hasBundle = /bundle|combo|pacote/.test(haystack);
    const hasRefundOrCancel = sales.some((sale) => isRefundOrCancelled(sale));
    const distinctProductCount = productKeys.filter((key) => key !== "unknown").length || hotmartIds.length;
    const hasNonBrl = sales.some((sale) => sale.moeda && sale.moeda !== "BRL");
    const ltvBrl = sales.reduce((sum, sale) => sum + commercialValueBrl(sale), 0);
    const originEvidenceStatus: Mission1ValidationPerson["originEvidenceStatus"] = zumbidoSale?.hotmart_product_id === "1266044" || zumbidoSale?.produto_id === member.source_product_id ? "ZUMBIDO_CONFIRMED" : zumbidoSale && zumbidoRelatedHotmartIds.has(String(zumbidoSale.hotmart_product_id ?? "")) ? "ZUMBIDO_CONFIRMED_VIA_RELATED_PRODUCT" : zumbidoSale ? "ZUMBIDO_CONFIRMED_VIA_ALIAS" : "ZUMBIDO_NOT_FOUND";
    const unknownProductNames = sales.filter((sale) => productKeyForSale(sale, refs, context) === "unknown").map((sale) => sale.produto_nome).filter(Boolean) as string[];
    const unknownProductMapping = productNames.length > 1 && unknownProductNames.length > 0;
    const dataQualityReason = mission1DataQualityReason(hasNonBrl, unknownProductMapping);
    const hasDataQualityIssue = dataQualityReason !== "NONE";
    const dataQualityStatus: Mission1ValidationPerson["dataQualityStatus"] = hasNonBrl ? "NON_BRL_REQUIRES_CONVERSION" : hasDataQualityIssue ? "REVIEW" : "OK";
    const segmentKeys: string[] = [];
    const zumbidoOnly = member.status === "ELIGIBLE" && boughtZumbido && !boughtFormationAasi && !boughtMrc && !boughtAjustesFinos && !boughtPerdaRampa && distinctProductCount <= 1 && !hasRefundOrCancel;
    if (zumbidoOnly) segmentKeys.push("A_ZUMBIDO_ONLY");
    if (member.status === "ELIGIBLE" && boughtFormationAasi) segmentKeys.push("B_ZUMBIDO_FORMACAO_AASI");
    if (member.status === "ELIGIBLE" && !boughtFormationAasi && productKeys.some((key) => ["mentoria_aasi", "ajustes_finos", "perda_rampa"].includes(key))) segmentKeys.push("C_ZUMBIDO_OUTROS_AASI");
    if (member.status === "ELIGIBLE" && boughtMrc) segmentKeys.push("D_ZUMBIDO_MRC_DIAGNOSTICO");
    if (member.status === "ELIGIBLE" && distinctProductCount >= 2) segmentKeys.push("E_MULTIPRODUTO_ALTO_LTV");
    if (member.status === "ELIGIBLE" && (boughtAjustesFinos || boughtPerdaRampa)) segmentKeys.push("F_POSSIVEL_CONFLITO_AJUSTES");
    if (member.status === "ELIGIBLE" && (boughtFormationAasi || boughtMrc || distinctProductCount >= 2 || hasRefundOrCancel || !boughtZumbido)) segmentKeys.push("G_REVISAO_MANUAL");
    if (member.status !== "ELIGIBLE") segmentKeys.push("H_EXCLUIDOS_REGRA_ATUAL");
    const reviewReasons = [
      boughtFormationAasi ? "Possui Formacao AASI ou bundle com AASI; validar se oferta ainda faz sentido." : null,
      boughtMrc ? "Possui MRC/Diagnostico; validar contexto comercial antes da oferta." : null,
      boughtAjustesFinos || boughtPerdaRampa ? "Possui Ajustes Finos/Perda em Rampa ou produto relacionado; possivel conflito de oferta." : null,
      distinctProductCount >= 2 ? "Cliente multiproduto; revisar jornada individual." : null,
      hasRefundOrCancel ? "Historico contem reembolso/cancelamento/teste; revisar antes de ofertar." : null,
      !boughtZumbido ? "Run marcou elegibilidade, mas a venda de Zumbido nao foi localizada no contexto carregado." : null,
      member.status !== "ELIGIBLE" ? "Excluido pela regra atual." : null,
    ].filter(Boolean) as string[];
    const status: Mission1ValidationStatus = member.status !== "ELIGIBLE" ? "EXCLUDED" : segmentKeys.includes("F_POSSIVEL_CONFLITO_AJUSTES") ? "POTENTIAL_CONFLICT" : reviewReasons.length ? "REVIEW" : "OK";
    const dataQualityReviewRequired = status === "OK" && hasDataQualityIssue;
    const reviewReasonAll = mission1ReviewReasonCodes({ status, zumbidoOnly, boughtFormationAasi, boughtMrc, boughtAjustesFinos, boughtPerdaRampa, hasBundle, hasRefundOrCancel, distinctProductCount, dataQualityReason: dataQualityReviewRequired ? dataQualityReason : "NONE" });
    const reviewReasonPrimary = primaryMission1ReviewReason(reviewReasonAll);
    const reviewCategory = reviewCategoryFor(status, reviewReasonPrimary, dataQualityReviewRequired);
    const norwynRecommendation = norwynRecommendationForStatus(status, dataQualityReviewRequired);
    const latestSale = sales.at(-1);
    const channelStatus = context.customerChannelStatuses.find((item) => item.person_key === member.person_key);
    return {
      customerHash: member.customer_hash,
      name: latestSale?.comprador_nome ?? null,
      email,
      phone: phoneFromSales(sales),
      status,
      norwynRecommendation,
      norwynRecommendationLabel: norwynRecommendationLabel(norwynRecommendation),
      reviewReasonPrimary,
      reviewReasonPrimaryLabel: mission1ReviewReasonLabel(reviewReasonPrimary),
      reviewReasonAll,
      reviewReasonAllLabels: reviewReasonAll.map(mission1ReviewReasonLabel),
      reviewCategory,
      reviewCategoryLabel: reviewCategoryLabel(reviewCategory),
      dataQualityReviewRequired,
      dataQualityReason,
      dataQualityReasonLabel: dataQualityReasonLabel(dataQualityReason),
      dataQualityPending: dataQualityPendingText(dataQualityReason, unknownProductNames),
      suggestedReviewer: suggestedReviewerFor(reviewCategory),
      unknownProductNames: [...new Set(unknownProductNames)],
      humanReviewDecision: "NOT_REVIEWED" as const,
      humanReviewNotes: "",
      reviewedBy: "",
      reviewedAt: "",
      segmentKeys,
      firstProduct: sales[0]?.produto_nome ?? null,
      products: productNames,
      firstPurchaseAt: member.first_purchase_at ?? sales[0]?.data_compra ?? sales[0]?.data_aprovacao ?? null,
      lastPurchaseAt: member.last_purchase_at ?? latestSale?.data_compra ?? latestSale?.data_aprovacao ?? null,
      purchases: sales.length || member.owned_product_ids.length,
      ltvCommercial: ltvBrl,
      boughtZumbido,
      zumbidoProductId: zumbidoSale?.hotmart_product_id ?? null,
      originEvidenceStatus,
      originHotmartProductId: zumbidoSale?.hotmart_product_id ?? null,
      originPurchaseAt: zumbidoSale?.data_compra ?? zumbidoSale?.data_aprovacao ?? null,
      originTransactionStatus: zumbidoSale?.status_normalizado ?? zumbidoSale?.status_original ?? null,
      dataQualityStatus,
      boughtFormationAasi,
      boughtMrc,
      boughtAjustesFinos,
      boughtPerdaRampa,
      otherRelevantProducts: productNames.filter((name) => !normalizeProductIdentity(name).includes("zumbido")),
      lastKnownInteraction: null,
      recentSupport: null,
      activeCampaignStatus: channelStatus?.activecampaign_status ?? "NOT_SYNCED",
      eligibilityReason: stringifyReasons(member.eligibility_reasons) || "Comprou Zumbido e nao possui target segundo a regra atual.",
      exclusionReason: stringifyReasons(member.exclusion_reasons) || null,
      reviewReasons,
      journey: sales.map((sale) => ({ date: sale.data_compra ?? sale.data_aprovacao ?? null, productName: sale.produto_nome ?? "Produto sem nome", hotmartProductId: sale.hotmart_product_id, value: commercialValueBrl(sale), status: sale.status_normalizado ?? sale.status_original })),
    };
  }).sort((a, b) => statusPriority(a.status) - statusPriority(b.status) || b.ltvCommercial - a.ltvCommercial);
  const count = (predicate: (person: Mission1ValidationPerson) => boolean) => people.filter(predicate).length;
  return {
    summary: {
      total: people.length,
      eligible: count((person) => person.status !== "EXCLUDED"),
      excluded: count((person) => person.status === "EXCLUDED"),
      clearlyOk: count((person) => person.norwynRecommendation === "PODE_OFERTAR"),
      potentialConflict: count((person) => person.status === "POTENTIAL_CONFLICT"),
      needsHumanReview: count((person) => person.norwynRecommendation === "VALIDAR_OFERTA" || person.norwynRecommendation === "POSSIVEL_CONFLITO"),
      withFormationAasi: count((person) => person.status !== "EXCLUDED" && person.boughtFormationAasi),
      withMrc: count((person) => person.status !== "EXCLUDED" && person.boughtMrc),
      withAjustesRelated: count((person) => person.status !== "EXCLUDED" && (person.boughtAjustesFinos || person.boughtPerdaRampa)),
      multiproduct: count((person) => person.status !== "EXCLUDED" && person.products.length >= 2),
      zumbidoOnly: count((person) => person.segmentKeys.includes("A_ZUMBIDO_ONLY")),
      humanCanOffer: count((person) => person.norwynRecommendation === "PODE_OFERTAR"),
      dataQualityReviewRequired: count((person) => person.dataQualityReviewRequired),
      needsDataOpsReview: count((person) => person.reviewCategory === "DATA_QUALITY"),
      needsJulianaReview: count((person) => person.reviewCategory === "CLINICAL" || person.reviewCategory === "PRODUCT_CONFLICT"),
    },
    segments: [
      { key: "A", label: "Zumbido e nunca comprou Formacao/Ajustes", count: count((person) => person.segmentKeys.includes("A_ZUMBIDO_ONLY")), description: "Candidatos mais simples para revisao; nao implica autorizacao de envio." },
      { key: "B", label: "Zumbido + Formacao AASI", count: count((person) => person.segmentKeys.includes("B_ZUMBIDO_FORMACAO_AASI")), description: "Validar se Ajustes Finos agrega ou se ja esta incluso/relacionado." },
      { key: "C", label: "Zumbido + outros produtos AASI", count: count((person) => person.segmentKeys.includes("C_ZUMBIDO_OUTROS_AASI")), description: "Pode haver relacao de oferta, bundle ou ascensao." },
      { key: "D", label: "Zumbido + MRC/Diagnostico", count: count((person) => person.segmentKeys.includes("D_ZUMBIDO_MRC_DIAGNOSTICO")), description: "Contexto diagnostico; revisar mensagem e timing." },
      { key: "E", label: "Multiproduto / alto LTV", count: count((person) => person.segmentKeys.includes("E_MULTIPRODUTO_ALTO_LTV")), description: "Clientes com jornada mais rica; priorizar leitura individual." },
      { key: "F", label: "Possivel conflito Ajustes/Bundle", count: count((person) => person.segmentKeys.includes("F_POSSIVEL_CONFLITO_AJUSTES")), description: "Pode ja possuir produto relacionado ao que seria ofertado." },
      { key: "G", label: "Revisao manual recomendada", count: count((person) => person.segmentKeys.includes("G_REVISAO_MANUAL")), description: "Casos com AASI, MRC, multiproduto, reembolso/cancelamento ou lacuna de evidencia." },
      { key: "H", label: "Excluidos pela regra atual", count: count((person) => person.segmentKeys.includes("H_EXCLUIDOS_REGRA_ATUAL")), description: "Preservado como evidencia; nao altera elegibilidade automaticamente." },
    ],
    people,
    representativeAmbiguities: people.filter((person) => person.norwynRecommendation !== "PODE_OFERTAR").slice(0, 10),
    exportRows: people.map((person) => ({ review_decision: person.humanReviewDecision, review_notes: person.humanReviewNotes, reviewed_by: person.reviewedBy, reviewed_at: person.reviewedAt, customer_hash: person.customerHash, technical_status: person.status, status: person.status, norwyn_recommendation: person.norwynRecommendation, review_reason_primary: person.reviewReasonPrimary, review_reason_all: person.reviewReasonAll.join(" | "), review_category: person.reviewCategory, data_quality_review_required: person.dataQualityReviewRequired, data_quality_reason: person.dataQualityReason, data_quality_pending: person.dataQualityPending, suggested_reviewer: person.suggestedReviewer, unknown_product_names: person.unknownProductNames.join("; "), segment_keys: person.segmentKeys.join(";"), name: person.name, email: person.email, phone: person.phone, first_product: person.firstProduct, products: person.products.join("; "), first_purchase_at: person.firstPurchaseAt, last_purchase_at: person.lastPurchaseAt, purchase_count: person.purchases, purchases: person.purchases, ltv_commercial: person.ltvCommercial, bought_zumbido: person.boughtZumbido, zumbido_product_id: person.zumbidoProductId, bought_formation_aasi: person.boughtFormationAasi, bought_mrc: person.boughtMrc, bought_ajustes_finos: person.boughtAjustesFinos, bought_perda_rampa: person.boughtPerdaRampa, activecampaign_status: person.activeCampaignStatus, eligibility_reason: person.eligibilityReason, exclusion_reason: person.exclusionReason, origin_evidence_status: person.originEvidenceStatus, origin_hotmart_product_id: person.originHotmartProductId, origin_purchase_at: person.originPurchaseAt, origin_transaction_status: person.originTransactionStatus, data_quality_status: person.dataQualityStatus, review_reasons: person.reviewReasons.join(" | ") })),
    reviewStorage: { status: "NEEDS_STRUCTURE", evidence: "A estrutura atual permite exportar a revisao, mas nao ha reviewer/reviewed_at/decision/notes por pessoa sem criar tabela/campos novos." },
  };
}


function norwynRecommendationForStatus(status: Mission1ValidationStatus, dataQualityReviewRequired = false): Mission1NorwynRecommendation {
  if (dataQualityReviewRequired && status === "OK") return "VALIDAR_OFERTA";
  if (status === "OK") return "PODE_OFERTAR";
  if (status === "REVIEW") return "VALIDAR_OFERTA";
  if (status === "POTENTIAL_CONFLICT") return "POSSIVEL_CONFLITO";
  return "NAO_OFERTAR";
}

export function norwynRecommendationLabel(recommendation: Mission1NorwynRecommendation) {
  const labels: Record<Mission1NorwynRecommendation, string> = {
    PODE_OFERTAR: "Pode ofertar",
    VALIDAR_OFERTA: "Validar oferta",
    POSSIVEL_CONFLITO: "Possivel conflito",
    NAO_OFERTAR: "Nao ofertar",
  };
  return labels[recommendation];
}

export function mission1ReviewReasonLabel(reason: Mission1ReviewReasonCode) {
  const labels: Record<Mission1ReviewReasonCode, string> = {
    ONLY_ZUMBIDO: "Somente Zumbido",
    HAS_FORMACAO_AASI: "Possui Formacao AASI",
    HAS_MRC: "Possui MRC",
    MULTIPRODUCT: "Cliente multiproduto",
    HAS_RELATED_AJUSTES_PRODUCT: "Possui produto relacionado a Ajustes Finos",
    HAS_BUNDLE: "Possui bundle relacionado",
    REFUND_OR_CANCELLATION_HISTORY: "Possui historico de reembolso/cancelamento",
    COMMERCIAL_SPECIAL_CASE: "Caso comercial especial",
    ALREADY_HAS_OFFER_PRODUCT: "Ja possui o produto ofertado",
    UNKNOWN_PRODUCT_MAPPING: "Produto ainda nao mapeado",
    NON_BRL_HISTORY: "Historico em moeda nao-BRL",
    OTHER: "Outro",
    NONE: "Sem alerta",
  };
  return labels[reason];
}

function mission1ReviewReasonCodes(input: {
  status: Mission1ValidationStatus;
  zumbidoOnly: boolean;
  boughtFormationAasi: boolean;
  boughtMrc: boolean;
  boughtAjustesFinos: boolean;
  boughtPerdaRampa: boolean;
  hasBundle: boolean;
  hasRefundOrCancel: boolean;
  distinctProductCount: number;
  dataQualityReason: Mission1DataQualityReason;
}): Mission1ReviewReasonCode[] {
  const reasons = new Set<Mission1ReviewReasonCode>();
  if (input.boughtAjustesFinos) reasons.add("ALREADY_HAS_OFFER_PRODUCT");
  if (input.boughtAjustesFinos || input.boughtPerdaRampa) reasons.add("HAS_RELATED_AJUSTES_PRODUCT");
  if (input.hasBundle) reasons.add("HAS_BUNDLE");
  if (input.hasRefundOrCancel) reasons.add("REFUND_OR_CANCELLATION_HISTORY");
  if (input.boughtFormationAasi) reasons.add("HAS_FORMACAO_AASI");
  if (input.boughtMrc) reasons.add("HAS_MRC");
  if (input.distinctProductCount >= 2) reasons.add("MULTIPRODUCT");
  if (input.dataQualityReason === "NON_BRL_HISTORY" || input.dataQualityReason === "MULTIPLE_DATA_QUALITY_FLAGS") reasons.add("NON_BRL_HISTORY");
  if (input.dataQualityReason === "UNKNOWN_PRODUCT_MAPPING" || input.dataQualityReason === "MULTIPLE_DATA_QUALITY_FLAGS") reasons.add("UNKNOWN_PRODUCT_MAPPING");
  if (input.zumbidoOnly && input.dataQualityReason === "NONE") reasons.add("ONLY_ZUMBIDO");
  if (!reasons.size && input.status === "EXCLUDED") reasons.add("OTHER");
  return reasons.size ? [...reasons] : ["NONE"];
}

function primaryMission1ReviewReason(reasons: Mission1ReviewReasonCode[]): Mission1ReviewReasonCode {
  const priority: Mission1ReviewReasonCode[] = ["ALREADY_HAS_OFFER_PRODUCT", "HAS_RELATED_AJUSTES_PRODUCT", "HAS_BUNDLE", "REFUND_OR_CANCELLATION_HISTORY", "COMMERCIAL_SPECIAL_CASE", "UNKNOWN_PRODUCT_MAPPING", "NON_BRL_HISTORY", "HAS_FORMACAO_AASI", "HAS_MRC", "MULTIPRODUCT", "ONLY_ZUMBIDO", "OTHER", "NONE"];
  return priority.find((reason) => reasons.includes(reason)) ?? "NONE";
}


function mission1DataQualityReason(hasNonBrl: boolean, unknownProductMapping: boolean): Mission1DataQualityReason {
  if (hasNonBrl && unknownProductMapping) return "MULTIPLE_DATA_QUALITY_FLAGS";
  if (hasNonBrl) return "NON_BRL_HISTORY";
  if (unknownProductMapping) return "UNKNOWN_PRODUCT_MAPPING";
  return "NONE";
}

function dataQualityReasonLabel(reason: Mission1DataQualityReason) {
  const labels: Record<Mission1DataQualityReason, string> = {
    NON_BRL_HISTORY: "Historico em moeda nao-BRL",
    UNKNOWN_PRODUCT_MAPPING: "Produto ainda nao mapeado",
    MULTIPLE_DATA_QUALITY_FLAGS: "Multiplas pendencias de dados",
    NONE: "Sem pendencia",
  };
  return labels[reason];
}

function dataQualityPendingText(reason: Mission1DataQualityReason, unknownProductNames: string[]) {
  const names = [...new Set(unknownProductNames)].join("; ");
  if (reason === "MULTIPLE_DATA_QUALITY_FLAGS") return names ? `Historico em moeda nao-BRL e produtos ainda sem product_key canonico: ${names}.` : "Historico em moeda nao-BRL e produto ainda sem product_key canonico.";
  if (reason === "NON_BRL_HISTORY") return "Historico contem transacao em moeda nao-BRL; LTV BRL permanece sem conversao ate regra explicita.";
  if (reason === "UNKNOWN_PRODUCT_MAPPING") return names ? `Produto ainda sem product_key canonico: ${names}.` : "Produto adicional ainda sem product_key canonico.";
  return "Sem pendencia";
}

function reviewCategoryFor(status: Mission1ValidationStatus, primaryReason: Mission1ReviewReasonCode, dataQualityReviewRequired: boolean): Mission1ReviewCategory {
  if (dataQualityReviewRequired) return "DATA_QUALITY";
  if (status === "POTENTIAL_CONFLICT" || ["ALREADY_HAS_OFFER_PRODUCT", "HAS_RELATED_AJUSTES_PRODUCT", "HAS_BUNDLE"].includes(primaryReason)) return "PRODUCT_CONFLICT";
  if (primaryReason === "HAS_MRC") return "CLINICAL";
  if (["HAS_FORMACAO_AASI", "MULTIPRODUCT", "REFUND_OR_CANCELLATION_HISTORY", "COMMERCIAL_SPECIAL_CASE"].includes(primaryReason)) return "COMMERCIAL";
  return "NONE";
}

function reviewCategoryLabel(category: Mission1ReviewCategory) {
  const labels: Record<Mission1ReviewCategory, string> = {
    COMMERCIAL: "Comercial",
    CLINICAL: "Clinica",
    PRODUCT_CONFLICT: "Conflito de produto",
    DATA_QUALITY: "Qualidade de dados",
    NONE: "Sem revisao",
  };
  return labels[category];
}

function suggestedReviewerFor(category: Mission1ReviewCategory) {
  if (category === "DATA_QUALITY") return "Jefferson / Operacao de Dados";
  if (category === "CLINICAL") return "Juliana";
  if (category === "PRODUCT_CONFLICT") return "Juliana / Ryan";
  if (category === "COMMERCIAL") return "Ryan / Juliana";
  return "Nao aplicavel";
}
function mission1ReviewPriority(person: Mission1ValidationPerson) {
  const recommendationPriority: Record<Mission1NorwynRecommendation, number> = {
    POSSIVEL_CONFLITO: 0,
    VALIDAR_OFERTA: 1,
    PODE_OFERTAR: 2,
    NAO_OFERTAR: 3,
  };
  const reasonPriority: Record<Mission1ReviewReasonCode, number> = {
    ALREADY_HAS_OFFER_PRODUCT: 0,
    HAS_RELATED_AJUSTES_PRODUCT: 1,
    HAS_BUNDLE: 2,
    REFUND_OR_CANCELLATION_HISTORY: 3,
    COMMERCIAL_SPECIAL_CASE: 4,
    UNKNOWN_PRODUCT_MAPPING: 5,
    NON_BRL_HISTORY: 6,
    HAS_FORMACAO_AASI: 7,
    HAS_MRC: 8,
    MULTIPRODUCT: 9,
    ONLY_ZUMBIDO: 10,
    OTHER: 11,
    NONE: 12,
  };
  return recommendationPriority[person.norwynRecommendation] * 100 + reasonPriority[person.reviewReasonPrimary];
}

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function stringifyReasons(value: unknown[]) {
  return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean).join(" | ");
}

function statusPriority(status: Mission1ValidationStatus) {
  if (status === "POTENTIAL_CONFLICT") return 0;
  if (status === "REVIEW") return 1;
  if (status === "EXCLUDED") return 2;
  return 3;
}

function isRefundOrCancelled(sale: NorwynCommercialSale) {
  const status = normalizeProductIdentity([sale.status_normalizado, sale.status_original].join(" "));
  return Boolean(sale.data_reembolso) || status.includes("refund") || status.includes("reembolso") || status.includes("cancel");
}

function phoneFromSales(sales: NorwynCommercialSale[]) {
  for (const sale of sales) {
    const metadata = sale.metadata ?? {};
    for (const key of ["phone", "telefone", "comprador_telefone", "buyer_phone", "buyerPhone"]) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}
function buildCohorts(people: LifecyclePerson[], refs: LifecycleProductRef[], ...eligibilities: EligibilityDryRun[]): LifecycleCohort[] {
  const cohortFor = (key: string, label: string, filter: (person: LifecyclePerson) => boolean): LifecycleCohort => {
    const members = people.filter(filter);
    const eligibility = eligibilities.find((item) => item.journeyKey.includes(key));
    return {
      key,
      label,
      total: members.length,
      eligible: eligibility?.eligible ?? 0,
      excluded: eligibility?.excluded ?? 0,
      needsReview: eligibility?.needsReview ?? 0,
      averageLtv: average(members.map((person) => person.ltvCommercial)),
      medianLtv: median(members.map((person) => person.ltvCommercial)),
    };
  };
  return [
    cohortFor("zumbido", "Zumbido-only / Zumbido source", (person) => person.products.includes("zumbido")),
    cohortFor("planner_protocolo", "Planner/Protocolo-only", (person) => person.products.includes("planner_protocolo")),
    cohortFor("aasi", "Formacao ativa/historica", (person) => person.products.includes("aasi")),
    cohortFor("mrc", "MRC-only / Diagnostico", (person) => person.products.includes("mrc")),
    cohortFor("adi", "ADI learning-first", (person) => person.products.includes("adi")),
    cohortFor("multi_produto", "Multi-produto", (person) => person.products.filter((product) => product !== "unknown").length >= 2),
    cohortFor("sem_segunda_compra", "Sem segunda compra", (person) => person.purchases === 1),
  ].filter((cohort) => cohort.total || refs.length);
}

function buildObservedJourneyGraph(context: NorwynContext, refs: LifecycleProductRef[]): ProductJourneyObservation[] {
  const byPerson = new Map<string, NorwynCommercialSale[]>();
  for (const sale of context.commercialSales) {
    const email = String(sale.comprador_email ?? "").trim().toLowerCase();
    if (!email) continue;
    byPerson.set(email, [...(byPerson.get(email) ?? []), sale]);
  }
  const edges = new Map<string, { from: string; to: string; buyers: Set<string>; days: number[]; revenueAfter: number }>();
  for (const [email, sales] of byPerson) {
    const sorted = [...sales].sort((a, b) => String(a.data_aprovacao ?? a.data_compra ?? "").localeCompare(String(b.data_aprovacao ?? b.data_compra ?? "")));
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const from = productKeyForSale(sorted[index], refs, context);
      const to = productKeyForSale(sorted[index + 1], refs, context);
      if (from === to || from === "unknown" || to === "unknown") continue;
      const key = `${from}->${to}`;
      const current = edges.get(key) ?? { from, to, buyers: new Set<string>(), days: [], revenueAfter: 0 };
      current.buyers.add(email);
      const days = daysBetween(sorted[index].data_aprovacao ?? sorted[index].data_compra, sorted[index + 1].data_aprovacao ?? sorted[index + 1].data_compra);
      if (days != null) current.days.push(days);
      current.revenueAfter += Number(sorted[index + 1].valor_bruto ?? 0);
      edges.set(key, current);
    }
  }
  return [...edges.values()].map((edge) => ({
    from: labelFor(edge.from, refs),
    to: labelFor(edge.to, refs),
    buyers: edge.buyers.size,
    averageDays: average(edge.days),
    medianDays: median(edge.days),
    revenueAfter: edge.revenueAfter,
    status: "OBSERVED" as const,
  })).sort((a, b) => b.buyers - a.buyers).slice(0, 12);
}

function daysBetweenFirstTwoPurchases(email: string, sales: NorwynCommercialSale[]) {
  const dates = sales
    .filter((sale) => String(sale.comprador_email ?? "").trim().toLowerCase() === email)
    .map((sale) => sale.data_aprovacao ?? sale.data_compra)
    .filter(Boolean)
    .sort() as string[];
  return dates.length >= 2 ? daysBetween(dates[0], dates[1]) : null;
}

function daysBetween(first?: string | null, second?: string | null) {
  if (!first || !second) return null;
  const delta = new Date(second).getTime() - new Date(first).getTime();
  if (!Number.isFinite(delta) || delta < 0) return null;
  return Math.round(delta / 86400000);
}

function labelFor(key: string, refs: LifecycleProductRef[]) {
  return refs.find((ref) => ref.key === key)?.label ?? key;
}

function commercialValueBrl(sale: NorwynCommercialSale) {
  const currency = String(sale.moeda ?? "BRL").toUpperCase();
  if (currency && currency !== "BRL") return 0;
  return Number(sale.valor_bruto ?? 0);
}
function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function hash(value: string) {
  let h = 0;
  for (let index = 0; index < value.length; index += 1) h = Math.imul(31, h) + value.charCodeAt(index) | 0;
  return `cust_${Math.abs(h).toString(16).padStart(8, "0")}`;
}





export function mission1ValidationPackCsv(pack: Mission1ValidationPack, variant: Mission1ValidationPackVariant = "final") {
  const rows = variant === "review" ? mission1ValidationReviewRows(pack) : pack.exportRows;
  return rowsToCsv(rows);
}

export function mission1ValidationPackFilename(variant: Mission1ValidationPackVariant = "final") {
  return variant === "review"
    ? "mission1-zumbido-ajustes-validation-pack-REVIEW-v3.csv"
    : "mission1-zumbido-ajustes-validation-pack-FINAL-v3.csv";
}

function mission1ValidationReviewRows(pack: Mission1ValidationPack): Array<Record<string, string | number | boolean | null>> {
  return [...pack.people]
    .sort((a, b) => mission1ReviewPriority(a) - mission1ReviewPriority(b) || b.ltvCommercial - a.ltvCommercial)
    .map((person) => ({
      "Nome": person.name,
      "E-mail": person.email,
      "Produtos comprados": person.products.join("; "),
      "Primeira compra": person.firstPurchaseAt,
      "Ultima compra": person.lastPurchaseAt,
      "Quantidade de compras": person.purchases,
      "LTV comercial": formatBrl(person.ltvCommercial),
      "Possui Formacao AASI?": person.boughtFormationAasi ? "SIM" : "NAO",
      "Possui MRC?": person.boughtMrc ? "SIM" : "NAO",
      "Possui Ajustes Finos/relacionado?": person.boughtAjustesFinos || person.boughtPerdaRampa ? "SIM" : "NAO",
      "Norwyn recomenda": person.norwynRecommendationLabel,
      "Motivo principal": person.reviewReasonPrimaryLabel,
      "Categoria da revisao": person.reviewCategoryLabel,
      "Pendencia de dados": person.dataQualityPending,
      "Revisao sugerida": person.suggestedReviewer,
      "Outros motivos": person.reviewReasonAllLabels.join("; "),
      "Detalhe da analise": person.reviewReasons.join(" | ") || person.eligibilityReason,
      "Decisao": "Nao revisado",
      "Observacao": person.humanReviewNotes,
      "Revisado por": person.reviewedBy,
      "Revisado em": person.reviewedAt,
      "customer_hash": person.customerHash,
      "technical_status": person.status,
    }));
}

function rowsToCsv(rows: Array<Record<string, string | number | boolean | null>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number | boolean | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
}











