"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timeoutId = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      if (step === "email") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });

        if (error) throw error;

        setStep("code");
        setResendCooldown(60);
        setMessage("Codigo enviado. Confira seu e-mail e informe o codigo recebido.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) throw error;

      const response = await fetch("/api/auth/landing");
      const result = (await response.json()) as { path?: string };
      router.replace(result.path ?? "/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Nao foi possivel entrar.";
      if (errorMessage.toLowerCase().includes("rate limit")) {
        setResendCooldown(60);
        setMessage(
          "Muitas tentativas de envio em pouco tempo. Aguarde um pouco antes de solicitar outro codigo.",
        );
      } else {
        setMessage(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold text-brand-teal" htmlFor="email">
        E-mail
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="h-11 w-full rounded-md border border-brand-sand bg-white px-3 text-brand-teal outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
        placeholder="voce@empresa.com"
      />
      {step === "code" ? (
        <>
          <label className="block text-sm font-semibold text-brand-teal" htmlFor="token">
            Codigo de validacao
          </label>
          <input
            id="token"
            type="text"
            inputMode="numeric"
            required
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 8))}
            className="h-11 w-full rounded-md border border-brand-sand bg-white px-3 text-center text-lg font-bold tracking-[0.35em] text-brand-teal outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
            placeholder="000000"
          />
        </>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting || (step === "email" && resendCooldown > 0)}>
        {step === "email" ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
        {isSubmitting
          ? "Validando..."
          : step === "email" && resendCooldown > 0
            ? `Aguarde ${resendCooldown}s`
            : step === "email"
              ? "Enviar codigo"
              : "Validar codigo"}
      </Button>
      {step === "code" ? (
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setToken("");
            setMessage(null);
          }}
          className="w-full text-sm font-semibold text-brand-teal/70 hover:text-brand-teal"
        >
          Trocar e-mail
        </button>
      ) : null}
      {message ? (
        <p className="rounded-md bg-brand-cream px-3 py-2 text-sm text-brand-teal/75">
          {message}
        </p>
      ) : null}
    </form>
  );
}
