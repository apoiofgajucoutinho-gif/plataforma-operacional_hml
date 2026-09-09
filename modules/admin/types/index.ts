import type { AppRole } from "@/lib/auth/roles";

export type AdminRole = AppRole;

export type AdminUserRow = {
  id: string;
  email: string;
  nome: string | null;
  role: AdminRole;
  ativo: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
};

export type AdminProfileAccess = {
  role: AdminRole;
  label: string;
  modules: Array<{
    key: string;
    label: string;
    canRead: boolean;
    canWrite: boolean;
    tabs: string[];
  }>;
};

export type AdminContext = {
  role: AdminRole | null;
  allowedModules: string[];
  tenant: { id: string; nome: string } | null;
  users: AdminUserRow[];
  profiles: AdminProfileAccess[];
  diagnostic: string | null;
};



