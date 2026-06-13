import Image from "next/image";

export const metadata = {
  title: "Politica de Privacidade | Plataforma Operacional",
  description:
    "Politica de privacidade da Plataforma Operacional Juliana Coutinho.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F4F1EA] px-6 py-10 text-[#0D3A4E]">
      <section className="mx-auto max-w-3xl rounded-[8px] border border-[#E2D0B8] bg-white/90 p-8 shadow-sm">
        <Image
          src="/brand/logo-horizontal-fundo-escuro.png"
          alt="Fga Juliana Coutinho"
          width={240}
          height={120}
          className="mb-8 rounded-[8px] bg-[#0D3A4E] p-4"
          priority
        />

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-[#9D6F4E]">
          Plataforma Operacional Juliana Coutinho
        </p>
        <h1 className="mb-5 text-4xl font-bold">Politica de Privacidade</h1>

        <div className="space-y-5 text-base leading-7 text-[#31576A]">
          <p>
            A Plataforma Operacional Juliana Coutinho coleta e processa dados
            de interacoes recebidas nos canais digitais da Fga Juliana
            Coutinho, incluindo mensagens, comentarios, identificadores
            publicos de perfil, datas de interacao e conteudo enviado
            voluntariamente pelos usuarios.
          </p>

          <p>
            Esses dados sao utilizados exclusivamente para organizacao
            operacional, priorizacao de atendimento, acompanhamento de
            metricas, identificacao de riscos, reclamacoes e oportunidades
            comerciais.
          </p>

          <p>
            O acesso as informacoes e restrito a usuarios autorizados da
            operacao. Os dados nao sao vendidos, compartilhados comercialmente
            ou utilizados para publicidade de terceiros.
          </p>

          <p>
            Dados operacionais podem ser armazenados em fornecedores de
            infraestrutura e automacao usados pela plataforma, como Supabase,
            Vercel e n8n, sempre com finalidade operacional e acesso restrito.
          </p>

          <p>
            O usuario pode solicitar revisao, atualizacao ou remocao de dados
            entrando em contato pelo e-mail{" "}
            <a
              className="font-semibold text-[#0D3A4E] underline"
              href="mailto:apoio.fgajucoutinho@gmail.com"
            >
              apoio.fgajucoutinho@gmail.com
            </a>
            .
          </p>

          <p className="text-sm text-[#6B8795]">
            Ultima atualizacao: 13/06/2026.
          </p>
        </div>
      </section>
    </main>
  );
}
