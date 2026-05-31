"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Edit3, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AdminContext, AdminRole, AdminUserRow } from "@/modules/admin/types";

const roles: Array<{ value: AdminRole; label: string }> = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPORTE", label: "Suporte" },
  { value: "MARKETING_PARTNER", label: "Marketing" },
  { value: "CLINICA", label: "Clínica" },
  { value: "USER", label: "User" },
];

function dateLabel(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function emptyForm() {
  return {
    userId: "",
    nome: "",
    email: "",
    role: "USER" as AdminRole,
    ativo: true,
  };
}

export function AdminDashboard({ context }: { context: AdminContext }) {
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "perfil">("users");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(form.userId);

  useEffect(() => {
    void fetch("/api/adoption/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "admin",
        pagePath: "/admin",
        pageLabel: tab === "users" ? "Admin: Users" : "Admin: Perfil",
      }),
      keepalive: true,
    });
  }, [tab]);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4500);
  }

  function editUser(user: AdminUserRow) {
    setForm({
      userId: user.id,
      nome: user.nome ?? "",
      email: user.email,
      role: user.role,
      ativo: user.ativo,
    });
    setTab("users");
  }

  function saveUser() {
    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEditing ? "update" : "create",
          ...form,
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        notify(result.error ?? "Não foi possível salvar o usuário.");
        return;
      }

      setForm(emptyForm());
      notify(isEditing ? "Usuário atualizado." : "Usuário cadastrado.");
      router.refresh();
    });
  }

  function deleteUser(user: AdminUserRow) {
    if (!window.confirm(`Excluir o cadastro de ${user.email}? Esta ação remove o acesso do usuário.`)) return;

    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", userId: user.id }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        notify(result.error ?? "Não foi possível excluir o usuário.");
        return;
      }

      notify("Usuário excluído.");
      if (form.userId === user.id) setForm(emptyForm());
      router.refresh();
    });
  }

  if (context.diagnostic) {
    return (
      <Card className="mx-auto max-w-3xl p-6">
        <p className="text-sm font-bold uppercase text-brand-clay">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-teal">Acesso restrito</h1>
        <p className="mt-3 text-sm leading-6 text-brand-teal/70">{context.diagnostic}</p>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-[1480px] space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-brand-clay">Admin</p>
        <h1 className="mt-2 text-4xl font-semibold text-brand-teal">Administração</h1>
        <p className="mt-2 text-base text-brand-teal/70">
          Usuários, perfis e acessos da plataforma {context.tenant?.nome ? `- ${context.tenant.nome}` : ""}.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-white/70 bg-white/70 p-2 shadow-soft">
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          <Users className="h-4 w-4" />
          Users
        </TabButton>
        <TabButton active={tab === "perfil"} onClick={() => setTab("perfil")}>
          <ShieldCheck className="h-4 w-4" />
          Perfil
        </TabButton>
      </nav>

      {message ? (
        <div className="rounded-md border border-brand-sand bg-white/80 px-4 py-3 text-sm font-semibold text-brand-teal shadow-soft">
          {message}
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="h-fit p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-teal text-white">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-brand-teal">{isEditing ? "Editar usuário" : "Novo usuário"}</h2>
                <p className="text-sm text-brand-teal/60">Cadastro e perfil de acesso.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Field label="Nome">
                <input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  className="h-10 w-full rounded-md border border-brand-sand bg-white px-3 text-sm font-semibold text-brand-teal outline-none"
                  placeholder="Nome completo"
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-10 w-full rounded-md border border-brand-sand bg-white px-3 text-sm font-semibold text-brand-teal outline-none"
                  placeholder="usuario@email.com"
                />
              </Field>
              <Field label="Perfil">
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AdminRole }))}
                  className="h-10 w-full rounded-md border border-brand-sand bg-white px-3 text-sm font-semibold text-brand-teal outline-none"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm font-bold text-brand-teal">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                />
                Usuário ativo
              </label>
              <div className="flex gap-2">
                <Button type="button" onClick={saveUser} disabled={isPending} className="flex-1">
                  {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar"}
                </Button>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm())}
                    className="rounded-md border border-brand-sand bg-white px-3 text-sm font-bold text-brand-teal"
                  >
                    Limpar
                  </button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-brand-sand/60 px-5 py-4">
              <h2 className="text-lg font-bold text-brand-teal">Usuários cadastrados</h2>
              <p className="text-sm text-brand-teal/60">{context.users.length} cadastro(s) com acesso ao tenant.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-[#F4DCE0] text-xs uppercase tracking-wide text-brand-clay">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Último acesso</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0DDE1]">
                  {context.users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#FFF7F8]">
                      <td className="px-4 py-3 font-semibold text-brand-teal">{user.nome || "-"}</td>
                      <td className="px-4 py-3 text-brand-teal/75">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-teal">
                          {roles.find((role) => role.value === user.role)?.label ?? user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-teal/75">{user.ativo ? "Ativo" : "Inativo"}</td>
                      <td className="px-4 py-3 text-brand-teal/60">{dateLabel(user.last_sign_in_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => editUser(user)}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-sand bg-white px-3 text-xs font-bold text-brand-teal"
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(user)}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {context.profiles.map((profile) => (
            <Card key={profile.role} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-clay">Perfil</p>
                  <h2 className="mt-1 text-xl font-bold text-brand-teal">{profile.label}</h2>
                </div>
                <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-teal">
                  {profile.modules.length} módulo(s)
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {profile.modules.length === 0 ? (
                  <p className="text-sm text-brand-teal/65">Sem módulos liberados.</p>
                ) : null}
                {profile.modules.map((module) => (
                  <div key={module.key} className="rounded-md border border-brand-sand/70 bg-white/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-brand-teal">{module.label}</p>
                      <p className="text-xs font-bold text-brand-teal/55">
                        {module.canWrite ? "Leitura e escrita" : "Somente leitura"}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {module.tabs.map((tabName) => (
                        <span key={tabName} className="rounded-full bg-brand-cream px-2.5 py-1 text-xs font-semibold text-brand-teal">
                          {tabName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>
      )}
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition",
        active ? "bg-brand-clay text-white shadow-sm" : "border border-brand-sand/70 bg-white/60 text-brand-teal hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-brand-teal">{label}</span>
      {children}
    </label>
  );
}
