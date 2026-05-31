import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const unauthorized = params?.error === "unauthorized";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-white/80 bg-white/90 p-6 shadow-soft">
        <Image
          src="/brand/logo-horizontal-fundo-escuro.png"
          alt="Juliana Coutinho"
          width={220}
          height={122}
          className="mx-auto h-24 w-auto rounded-md bg-brand-teal object-contain p-3"
        />
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-semibold text-brand-teal">Acesso operacional</h1>
          <p className="mt-2 text-sm text-brand-teal/70">
            Entre com e-mail e codigo de validacao para acessar a plataforma.
          </p>
        </div>
        <LoginForm />
        {unauthorized ? (
          <p className="mt-3 rounded-md bg-brand-cream px-3 py-2 text-sm text-brand-teal/75">
            Usuario sem permissao de acesso. Solicite o cadastro a um administrador.
          </p>
        ) : null}
      </section>
    </main>
  );
}
