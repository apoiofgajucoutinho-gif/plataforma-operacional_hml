import {
  BadgeCheck,
  ClipboardCheck,
  Ear,
  FileCheck2,
  GraduationCap,
  HeartPulse,
  LineChart,
  Microscope,
  Route,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { LandingConfig } from "@/lib/norwyn/landing-types";

export const aasiPremiumConfig: LandingConfig = {
  slug: "aasi-premium",
  productId: "formacao-aasi-premium",
  environment: "hml",
  hero: {
    productName: "Formação AASI Premium",
    eyebrow: "HML recuperada v1",
    headline:
      "Domine a adaptação de aparelhos auditivos com mais segurança técnica, científica e clínica.",
    subheadline:
      "Uma reconstrução da estrutura comercial recuperada da Formação AASI Premium, organizada para conduzir a fonoaudióloga da insegurança na adaptação a um raciocínio clínico mais estruturado e verificável.",
    primaryCta: {
      id: "hero_primary",
      label: "Conhecer a formação",
      href: "#oferta",
      sectionId: "hero",
      variant: "primary",
    },
    secondaryCta: {
      id: "hero_method",
      label: "Ver o método",
      href: "#metodo",
      sectionId: "hero",
      variant: "secondary",
    },
    proofs: [
      { label: "Foco em adaptação de AASI", status: "validado" },
      { label: "Método em 3 fases recuperado", status: "validado" },
      { label: "Oferta e checkout a confirmar", status: "a_confirmar" },
    ],
    imageStatus: "placeholder",
  },
  transformation: {
    beforeTitle: "Quando a adaptação depende de tentativa e erro",
    afterTitle: "Quando a decisão clínica ganha método",
    beforeItems: [
      "Insegurança para ajustar e justificar condutas.",
      "Dúvida diante da queixa do paciente.",
      "Decisões apoiadas em achismo ou protocolo pouco claro.",
      "Dificuldade para acompanhar evolução e resposta ao uso.",
    ],
    afterItems: [
      "Raciocínio estruturado para conduzir a adaptação.",
      "Mais segurança clínica em cada etapa do processo.",
      "Domínio técnico para interpretar necessidades e ajustes.",
      "Acompanhamento mais consciente da experiência do paciente.",
    ],
    closing:
      "A transformação central recuperada é a passagem de uma adaptação insegura para uma prática clínica mais técnica, científica e confiante.",
  },
  method: {
    headline: "O método recuperado em três fases",
    intro:
      "A estrutura identificada publicamente organiza a formação em três grandes momentos. As descrições abaixo são reconstruídas a partir dessa lógica e devem ser validadas antes da publicação final.",
    phases: [
      {
        id: "pre-preparacao",
        order: 1,
        name: "Pré-preparação",
        eyebrow: "Base antes do ajuste",
        description:
          "Organiza a preparação clínica e técnica necessária para chegar à adaptação com mais clareza sobre paciente, objetivos e variáveis do processo.",
      },
      {
        id: "mapeamento-inteligente",
        order: 2,
        name: "Mapeamento inteligente",
        eyebrow: "Leitura do caso",
        description:
          "Estrutura a análise do paciente e das respostas auditivas para orientar decisões com menos improviso e mais critério clínico.",
      },
      {
        id: "um-passo-alem",
        order: 3,
        name: "Um passo além",
        eyebrow: "Refinamento e acompanhamento",
        description:
          "Aprofunda a tomada de decisão, o acompanhamento do paciente e o posicionamento profissional na adaptação de AASI.",
      },
    ],
  },
  modules: {
    headline: "Conteúdo modular preparado para validação",
    intro:
      "O bloco de módulos está pronto para receber a grade definitiva. Enquanto carga horária, número de aulas e nomes oficiais não forem confirmados, os módulos permanecem marcados como a confirmar.",
    items: [
      {
        id: "mod-base",
        title: "Fundamentos da adaptação de AASI",
        description:
          "Base técnica e clínica para sustentar decisões na adaptação. Tópicos específicos a confirmar.",
        status: "a_confirmar",
        items: ["Critérios iniciais", "Leitura do caso", "Objetivos clínicos"],
      },
      {
        id: "mod-mapeamento",
        title: "Mapeamento e raciocínio aplicado",
        description:
          "Organização do raciocínio profissional para sair do achismo e conduzir ajustes com método.",
        status: "a_confirmar",
        items: ["Mapeamento do paciente", "Hipóteses clínicas", "Tomada de decisão"],
      },
      {
        id: "mod-verificacao",
        title: "Verificação objetiva e acompanhamento",
        description:
          "Espaço preparado para conteúdos sobre verificação, acompanhamento e evolução do paciente.",
        status: "a_confirmar",
        items: ["Verificação objetiva", "Acompanhamento", "Ajustes e refinamento"],
      },
    ],
  },
  differentials: [
    {
      id: "aasi",
      title: "Formação focada em AASI",
      description:
        "A promessa recuperada é específica: melhorar a segurança na adaptação de aparelhos auditivos.",
      icon: Ear,
    },
    {
      id: "clinica",
      title: "Aplicação clínica",
      description:
        "Conteúdo orientado para decisões reais de consultório e acompanhamento do paciente.",
      icon: Stethoscope,
    },
    {
      id: "verificacao",
      title: "Verificação objetiva",
      description:
        "Referência recuperada à prática verificável, incluindo microfone-sonda quando aplicável à oferta final.",
      icon: Microscope,
    },
    {
      id: "raciocinio",
      title: "Raciocínio profissional",
      description:
        "A formação posiciona a adaptação como processo clínico estruturado, não como sequência mecânica de ajustes.",
      icon: Route,
    },
  ],
  benefits: [
    {
      id: "seguranca-clinica",
      title: "Segurança clínica",
      description: "Mais clareza para decidir, ajustar e explicar condutas.",
      icon: ShieldCheck,
    },
    {
      id: "autonomia",
      title: "Autonomia",
      description: "Menos dependência de tentativa e erro na rotina de adaptação.",
      icon: Sparkles,
    },
    {
      id: "confianca",
      title: "Confiança na adaptação",
      description: "Condução mais segura do paciente em cada etapa da jornada.",
      icon: HeartPulse,
    },
    {
      id: "posicionamento",
      title: "Posicionamento profissional",
      description: "Uma prática mais consistente reforça autoridade e percepção de valor.",
      icon: BadgeCheck,
    },
    {
      id: "raciocinio-estruturado",
      title: "Raciocínio estruturado",
      description: "Critérios mais claros para interpretar casos e priorizar decisões.",
      icon: LineChart,
    },
    {
      id: "acompanhamento",
      title: "Acompanhamento do paciente",
      description: "Olhar mais atento à evolução, resposta ao uso e próximos passos.",
      icon: ClipboardCheck,
    },
  ],
  testimonials: [
    {
      id: "testimonial-text-placeholder-1",
      type: "text",
      quote:
        "Placeholder de depoimento. Substituir por texto real autorizado antes de publicação.",
      name: "Aluna a confirmar",
      meta: "Profissão/localização a confirmar",
      status: "placeholder",
    },
    {
      id: "testimonial-video-placeholder-1",
      type: "video",
      quote:
        "Espaço reservado para depoimento em vídeo recuperado ou autorizado.",
      name: "Depoimento em vídeo a confirmar",
      meta: "Asset e autorização pendentes",
      status: "placeholder",
      videoLabel: "Vídeo a confirmar",
    },
  ],
  offer: {
    title: "Oferta da Formação AASI Premium",
    statusLabel: "Oferta a confirmar",
    price: "Preço a confirmar",
    installment: "Parcelamento a confirmar",
    checkoutUrl: null,
    access: "Duração do acesso a confirmar",
    support: "Suporte/acompanhamento a confirmar",
    bonus: [
      "Bônus e materiais complementares a confirmar",
      "Certificação a confirmar, se aplicável à oferta vigente",
      "Condição promocional a confirmar",
    ],
    cta: {
      id: "offer_primary",
      label: "Quero participar",
      href: "#oferta",
      sectionId: "oferta",
      variant: "primary",
      isCheckout: true,
    },
  },
  guarantee: {
    title: "Garantia",
    description:
      "A condição de garantia da oferta vigente ainda precisa ser confirmada com Juliana antes de publicação final.",
    status: "a_confirmar",
  },
  expert: {
    name: "Juliana Coutinho",
    title: "Autoridade da formação",
    bio:
      "Bio oficial a confirmar. Este bloco está reservado para apresentar Juliana, sua atuação clínica, experiência e missão profissional sem inventar títulos ou formações não validadas.",
    authority: [
      "Atuação ligada à adaptação de aparelhos auditivos.",
      "Experiência, formação e credenciais oficiais a confirmar.",
      "Fotos profissionais e assets originais pendentes.",
    ],
    imageStatus: "placeholder",
  },
  faq: [
    {
      id: "faq-para-quem",
      question: "Para quem é a Formação AASI Premium?",
      answer:
        "Para profissionais que atuam ou desejam atuar com adaptação de aparelhos auditivos e precisam de mais segurança técnica, científica e clínica. Critérios finais de elegibilidade a confirmar.",
      status: "a_confirmar",
    },
    {
      id: "faq-experiencia",
      question: "Preciso ter experiência prévia?",
      answer:
        "Nível de experiência recomendado a confirmar na oferta vigente. A página está preparada para parametrizar essa resposta.",
      status: "a_confirmar",
    },
    {
      id: "faq-acesso",
      question: "Como funciona o acesso?",
      answer:
        "Formato, plataforma, duração e regras de acesso ainda precisam ser validados.",
      status: "a_confirmar",
    },
    {
      id: "faq-certificado",
      question: "Tem certificado?",
      answer:
        "Certificação a confirmar antes de publicação. Não estamos tratando esse ponto como definitivo nesta HML.",
      status: "a_confirmar",
    },
    {
      id: "faq-equipamentos",
      question: "Preciso de equipamentos específicos?",
      answer:
        "Requisitos técnicos e equipamentos necessários devem ser confirmados com a oferta final.",
      status: "a_confirmar",
    },
    {
      id: "faq-suporte",
      question: "Existe suporte durante a formação?",
      answer:
        "Modelo de suporte/acompanhamento a confirmar. O componente já aceita essa informação por configuração.",
      status: "a_confirmar",
    },
    {
      id: "faq-parcelamento",
      question: "Posso parcelar?",
      answer:
        "Parcelamento e meios de pagamento dependem do checkout oficial, ainda não validado.",
      status: "a_confirmar",
    },
    {
      id: "faq-garantia",
      question: "Existe garantia?",
      answer:
        "A garantia precisa ser confirmada antes de publicação em produção.",
      status: "a_confirmar",
    },
  ],
  finalCta: {
    headline: "Leve mais método para a sua adaptação de AASI.",
    subheadline:
      "Esta HML mostra a experiência completa da página recuperada. A publicação final depende da validação de oferta, assets, depoimentos e checkout.",
    cta: {
      id: "final_primary",
      label: "Ir para a oferta",
      href: "#oferta",
      sectionId: "cta-final",
      variant: "primary",
    },
  },
  footer: {
    legalName: "Dados legais a confirmar",
    supportEmail: "suporte a confirmar",
    termsUrl: "#",
    privacyUrl: "/privacy",
    legalNote:
      "HML de reconstrução. Não publicado em produção. Informações comerciais pendentes de validação.",
  },
  tracking: {
    eventEndpoint: "/api/norwyn/lp-events",
    attributionKeys: [
      "sck",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ],
  },
};
