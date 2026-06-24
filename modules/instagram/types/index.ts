export type InstagramPostType = "Reels" | "Carrossel" | "Estatico" | "Outro";
export type EngagementClassification = "Bom" | "Medio" | "Ruim" | "N/A";
export type InstagramInteractionSource = "story_reply" | "post_comment" | "new_follower" | "direct_message";
export type InstagramInteractionStatus = "novo" | "analisado" | "respondido" | "arquivado";
export type InstagramInteractionPotential = "alto" | "medio" | "baixo" | "nao_classificado";

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

export type InstagramInteraction = {
  id: string;
  source: InstagramInteractionSource;
  marketing_type: string;
  external_id: string | null;
  profile_username: string | null;
  profile_name: string | null;
  message_text: string | null;
  media_id: string | null;
  post_permalink: string | null;
  interaction_at: string;
  status: InstagramInteractionStatus;
  potential: InstagramInteractionPotential;
  product_topic: string | null;
  next_action: string | null;
};

export type InstagramFollowerSnapshot = {
  snapshot_date: string;
  followers_total: number;
};

export type InstagramContext = {
  role?: string | null;
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
  interactions: InstagramInteraction[];
  followerSnapshots: InstagramFollowerSnapshot[];
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
