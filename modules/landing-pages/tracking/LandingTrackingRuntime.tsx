"use client";

import { useEffect } from "react";
import type { LandingDefinition } from "@/modules/landing-pages/types";
import { postLandingEvent } from "@/modules/landing-pages/tracking/client";

export function LandingTrackingRuntime({ landing }: { landing: LandingDefinition }) {
  useEffect(() => {
    void postLandingEvent(landing, { name: "landing_view" });
  }, [landing.landingKey, landing.version, landing.environment]);

  return null;
}
