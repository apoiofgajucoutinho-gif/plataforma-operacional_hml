import { julianaDefaultTheme, landingThemes } from "@/modules/landing-pages/themes";
import type { LandingDefinition } from "@/modules/landing-pages/types";

export const aasiPremiumV2Definition: LandingDefinition = {
  landingKey: "aasi-premium-v2",
  name: "Formação AASI Premium V2",
  productKey: "formacao-aasi-premium",
  campaignKey: "aasi-premium-v2-hml",
  version: "v0.2",
  environment: "HML",
  status: "AWAITING_APPROVAL",
  previewPath: "/hml/lp/aasi-premium-v2",
  productionLocked: true,
  changeSummary: "Nova estrutura visual, novo Hero e ajustes de oferta para homologação.",
  theme: julianaDefaultTheme,
  themes: landingThemes,
  tracking: { endpoint: "/api/norwyn/lp-events" },
  blocks: [
    { id: "hero", type: "HERO", enabled: true, eyebrow: "Formação AASI Premium", title: "Domine a adaptação de AASI com método, segurança clínica e condução prática.", subtitle: "Uma formação para fonoaudiólogas que querem atender casos de amplificação com clareza, raciocínio e confiança.", body: "A nova página organiza a promessa, o método, a oferta e as evidências em uma narrativa mais direta para decisão.", cta: { id: "hero-primary", label: "Quero conhecer a formação", href: "#oferta", secondaryLabel: "Ver módulos", secondaryHref: "#modulos" }, media: { id: "hero-aasi", type: "image", src: "/brand/logo-horizontal-fundo-escuro.png", alt: "Formação AASI Premium", status: "review", category: "hero", orientation: "landscape" } },
    { id: "problema", type: "PROBLEM", enabled: true, eyebrow: "O problema", title: "A adaptação não pode depender de tentativa e erro.", body: "Muitos atendimentos travam porque faltam processo, leitura clínica e segurança para ajustar cada etapa da jornada do paciente.", items: [{ title: "Insegurança técnica", body: "Dúvidas sobre regulagem, validação e condução." }, { title: "Pouca previsibilidade", body: "Casos avançam sem um roteiro claro de decisão." }, { title: "Paciente sem adesão", body: "A experiência de uso precisa ser acompanhada com método." }] },
    { id: "transformacao", type: "TRANSFORMATION", enabled: true, eyebrow: "Transformação", title: "Da dúvida clínica para uma condução estruturada.", body: "A formação conecta base, prática e tomada de decisão para que a profissional tenha mais controle sobre o processo de adaptação." },
    { id: "metodo", type: "METHOD", enabled: true, eyebrow: "Método", title: "Um caminho aplicável do primeiro contato ao acompanhamento.", items: [{ title: "Avaliar", body: "Entender o caso e organizar prioridades." }, { title: "Adaptar", body: "Conduzir seleção, regulagem e orientação." }, { title: "Acompanhar", body: "Usar evidências para evoluir o plano." }] },
    { id: "modulos", type: "MODULES", enabled: true, eyebrow: "Módulos", title: "Conteúdo organizado para aplicação real", items: [{ title: "Fundamentos de amplificação", body: "Base técnica e clínica para escolhas seguras." }, { title: "Processo de adaptação", body: "Etapas, critérios e decisões." }, { title: "Validação e acompanhamento", body: "Como medir, ajustar e orientar." }, { title: "Casos e prática", body: "Discussão aplicada para ganhar repertório." }] },
    { id: "beneficios", type: "BENEFITS", enabled: true, eyebrow: "Benefícios", title: "O que melhora na prática", items: [{ title: "Mais clareza", body: "Você sabe o que observar e por quê." }, { title: "Mais confiança", body: "Decisões deixam de depender de improviso." }, { title: "Mais consistência", body: "O atendimento ganha processo e acompanhamento." }] },
    { id: "depoimentos", type: "TESTIMONIALS", enabled: true, eyebrow: "Depoimentos", title: "Evidências e relatos serão conectados à versão final", body: "Este bloco está pronto para receber depoimentos validados sem alterar a arquitetura da página.", metadata: { qaWarning: "Imagem/depoimentos finais ainda marcados para substituição." } },
    { id: "autoridade", type: "AUTHORITY", enabled: true, eyebrow: "Juliana Coutinho", title: "Experiência clínica traduzida em método de ensino.", body: "A página preserva a autoridade da Juliana sem transformar a experiência em painel técnico." },
    { id: "oferta", type: "OFFER", enabled: true, eyebrow: "Oferta", title: "Formação AASI Premium", subtitle: "Condições e checkout devem ser validados antes de produção.", body: "A oferta fica versionada para que alterações materiais passem por QA e aprovação da Especialista.", cta: { id: "offer-primary", label: "Ver condição de matrícula", href: "#cta-final" } },
    { id: "garantia", type: "GUARANTEE", enabled: true, eyebrow: "Garantia", title: "Compra com segurança e clareza.", body: "A versão aprovada deve apresentar as condições comerciais finais em linguagem simples." },
    { id: "faq", type: "FAQ", enabled: true, eyebrow: "Dúvidas frequentes", title: "Perguntas que ajudam a decisão", items: [{ title: "Para quem é a formação?", body: "Para profissionais que desejam estruturar a prática em AASI." }, { title: "Tenho acesso às aulas?", body: "As condições de acesso devem seguir a oferta vigente validada." }, { title: "A página já está em produção?", body: "Não. Esta versão está em homologação HML." }] },
    { id: "cta-final", type: "CTA", enabled: true, title: "Pronta para validar a nova página?", body: "Esta V2 prova renderização, tracking, versionamento, QA e aprovação sem publicar produção real.", cta: { id: "final-primary", label: "Revisar oferta", href: "#oferta" } }
  ],
};
