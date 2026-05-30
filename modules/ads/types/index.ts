export type AdsPerformanceStatus = "OK" | "CTR BAIXO" | "SATURADO" | "PUBLICO RUIM" | "UNKNOWN";

export type AdsDailyRow = {
  id: string;
  data_referencia: string;
  campanha: string;
  conjunto: string | null;
  anuncio: string;
  status: string;
  objetivo: string | null;
  alcance: number;
  impressoes: number;
  cliques: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequencia: number;
  valor_gasto: number;
  conversoes: number;
  leads: number;
  performance_status: AdsPerformanceStatus;
  performance_score: number;
  imported_at: string;
};

export type AdsContext = {
  tenant: {
    id: string;
    nome: string;
  } | null;
  rows: AdsDailyRow[];
  updatedAt: string | null;
  diagnostic: string | null;
  allowedModules: string[];
};
