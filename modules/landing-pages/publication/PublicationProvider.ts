import type { LandingDefinition, LandingEnvironment } from "@/modules/landing-pages/types";

export type PublicationResult = {
  ok: boolean;
  environment: LandingEnvironment;
  url?: string;
  deploymentId?: string;
  error?: string;
};

export interface PublicationProvider {
  name: string;
  publish(landing: LandingDefinition, environment: Exclude<LandingEnvironment, "PROD">): Promise<PublicationResult>;
  prepareProduction?(landing: LandingDefinition): Promise<PublicationResult>;
}

export const productionPublicationBlocked = {
  ok: false,
  environment: "PROD" as const,
  error: "PROD real permanece bloqueado nesta fase.",
};
