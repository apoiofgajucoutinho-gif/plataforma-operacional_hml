import Image from "next/image";

export const metadata = {
  title: "Exclusao de Dados | Plataforma Operacional",
  description:
    "Instrucoes para solicitacao de exclusao de dados da Plataforma Operacional Juliana Coutinho.",
};

export default function DataDeletionPage() {
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
        <h1 className="mb-5 text-4xl font-bold">
          Instrucoes de Exclusao de Dados
        </h1>

        <div className="space-y-5 text-base leading-7 text-[#31576A]">
          <p>
            Para solicitar a exclusao de dados relacionados as interacoes com a
            Fga Juliana Coutinho, envie um e-mail para{" "}
            <a
              className="font-semibold text-[#0D3A4E] underline"
              href="mailto:apoio.fgajucoutinho@gmail.com"
            >
              apoio.fgajucoutinho@gmail.com
            </a>{" "}
            com o assunto "Solicitacao de exclusao de dados".
          </p>

          <p>
            No corpo do e-mail, informe o canal de origem da interacao, o nome
            de usuario ou identificador publico relacionado e uma breve
            descricao da solicitacao. A equipe avaliara o pedido e fara a
            remocao dos dados aplicaveis conforme as obrigacoes legais e
            operacionais.
          </p>

          <p>
            A exclusao pode nao abranger registros que precisem ser mantidos
            por obrigacao legal, seguranca, auditoria ou integridade
            operacional, mas qualquer retencao sera limitada ao necessario.
          </p>

          <p className="text-sm text-[#6B8795]">
            Ultima atualizacao: 13/06/2026.
          </p>
        </div>
      </section>
    </main>
  );
}
