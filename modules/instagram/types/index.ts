export type InstagramPostType = "Reels" | "Carrossel" | "Estatico" | "Outro";
export type EngagementClassification = "Bom" | "Medio" | "Ruim" | "N/A";

export type InstagramPostMetric = {
  id: string;
  post_id: string | null;
  data_postagem: string;
  hora_postagem: string | null;
  tipo: InstagramPostType;
  legenda: string | null;
  permalink: string | null;
  likes: number;
  comentarios: number;
  alcance: number | null;
  salvos: number | null;
  compartilhamentos: number | null;
  engajamento_score: number | null;
  engajamento_classificacao: EngagementClassification;
};

export type InstagramContext = {
  tenant: {
    id: string;
    nome: string;
  } | null;
  account: {
    id: string;
    nome: string;
    username: string | null;
  } | null;
  posts: InstagramPostMetric[];
  importRun: {
    source: string;
    status: string;
    total_rows: number;
    finished_at: string | null;
  } | null;
  updatedAt: string | null;
  diagnostic: string | null;
  allowedModules: string[];
};
