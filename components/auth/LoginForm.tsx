"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      setMessage(
        error
          ? error.message
          : "Link enviado. Confira seu e-mail para entrar na plataforma.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel entrar.");
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
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        <Mail className="h-4 w-4" />
        {isSubmitting ? "Enviando..." : "Enviar link seguro"}
      </Button>
      {message ? (
        <p className="rounded-md bg-brand-cream px-3 py-2 text-sm text-brand-teal/75">
          {message}
        </p>
      ) : null}
    </form>
  );
}
