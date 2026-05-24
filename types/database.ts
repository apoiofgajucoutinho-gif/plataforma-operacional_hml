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
      tenant_module_permissions: {
        Row: {
          id: string;
          tenant_id: string;
          role: "ADMIN" | "MARKETING_PARTNER" | "CLINICA" | "USER";
          module: "instagram" | "financeiro" | "atividades" | "agenda" | "relatorios" | "admin" | "adocao";
          can_read: boolean;
          can_write: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          role: "ADMIN" | "MARKETING_PARTNER" | "CLINICA" | "USER";
          module: "instagram" | "financeiro" | "atividades" | "agenda" | "relatorios" | "admin" | "adocao";
          can_read?: boolean;
          can_write?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["tenant_module_permissions"]["Insert"]
        >;
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
      instagram_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          username: string | null;
          instagram_user_id: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          username?: string | null;
          instagram_user_id?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["instagram_accounts"]["Insert"]>;
      };
      instagram_posts: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          post_id: string | null;
          data_coleta: string | null;
          data_postagem: string;
          hora_postagem: string | null;
          tipo_original: string | null;
          tipo: "Reels" | "Carrossel" | "Estatico" | "Outro";
          legenda: string | null;
          permalink: string | null;
          raw_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          account_id: string;
          post_id?: string | null;
          data_coleta?: string | null;
          data_postagem: string;
          hora_postagem?: string | null;
          tipo_original?: string | null;
          tipo?: "Reels" | "Carrossel" | "Estatico" | "Outro";
          legenda?: string | null;
          permalink?: string | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["instagram_posts"]["Insert"]>;
      };
      instagram_metrics: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          post_id: string;
          likes: number;
          comentarios: number;
          alcance: number | null;
          salvos: number | null;
          compartilhamentos: number | null;
          engajamento_score: number | null;
          engajamento_classificacao: "Bom" | "Medio" | "Ruim" | "N/A";
          origem: string;
          imported_at: string;
          raw_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          account_id: string;
          post_id: string;
          likes?: number;
          comentarios?: number;
          alcance?: number | null;
          salvos?: number | null;
          compartilhamentos?: number | null;
          engajamento_score?: number | null;
          engajamento_classificacao?: "Bom" | "Medio" | "Ruim" | "N/A";
          origem?: string;
          imported_at?: string;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["instagram_metrics"]["Insert"]>;
      };
      instagram_import_runs: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string | null;
          source: string;
          status: string;
          total_rows: number;
          inserted_rows: number;
          updated_rows: number;
          failed_rows: number;
          error_message: string | null;
          started_at: string;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          account_id?: string | null;
          source: string;
          status: string;
          total_rows?: number;
          inserted_rows?: number;
          updated_rows?: number;
          failed_rows?: number;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["instagram_import_runs"]["Insert"]
        >;
      };
    };
    Views: {
      instagram_n8n_import_rows: {
        Row: {
          tenant_name: string | null;
          account_name: string | null;
          username: string | null;
          source: string | null;
          data_coleta: string | null;
          post_id: string | null;
          tipo_postagem: string | null;
          likes: number | null;
          comentarios: number | null;
          data_postagem: string | null;
          hora_postagem: string | null;
          legenda: string | null;
          permalink: string | null;
          reach: number | null;
          saved: number | null;
          shares: number | null;
          raw_payload: Json | null;
        };
        Insert: {
          tenant_name?: string | null;
          account_name?: string | null;
          username?: string | null;
          source?: string | null;
          data_coleta?: string | null;
          post_id?: string | null;
          tipo_postagem?: string | null;
          likes?: number | null;
          comentarios?: number | null;
          data_postagem?: string | null;
          hora_postagem?: string | null;
          legenda?: string | null;
          permalink?: string | null;
          reach?: number | null;
          saved?: number | null;
          shares?: number | null;
          raw_payload?: Json | null;
        };
        Update: never;
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
