export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      agenda_eventos: {
        Row: {
          id: string;
          tenant_id: string;
          titulo: string;
          descricao: string | null;
          tipo: "palestra" | "paciente" | "aula" | "interno";
          status: "agendado" | "confirmado" | "concluido" | "cancelado";
          inicio: string;
          fim: string;
          local: string | null;
          responsavel_id: string | null;
          google_event_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          titulo: string;
          descricao?: string | null;
          tipo: "palestra" | "paciente" | "aula" | "interno";
          status?: "agendado" | "confirmado" | "concluido" | "cancelado";
          inicio: string;
          fim: string;
          local?: string | null;
          responsavel_id?: string | null;
          google_event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agenda_eventos"]["Insert"]>;
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: "ADMIN" | "MARKETING_PARTNER" | "CLINICA" | "USER";
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: "ADMIN" | "MARKETING_PARTNER" | "CLINICA" | "USER";
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_members"]["Insert"]>;
      };
      tenants: {
        Row: {
          id: string;
          nome: string;
          tipo: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          tipo?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      google_calendar_connections: {
        Row: {
          id: string;
          tenant_id: string;
          account_email: string;
          refresh_token: string;
          scopes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          account_email: string;
          refresh_token: string;
          scopes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["google_calendar_connections"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
