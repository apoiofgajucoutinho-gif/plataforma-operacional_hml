import type { LandingMediaAsset } from "@/modules/landing-pages/types";

export function mediaNeedsReview(asset: LandingMediaAsset | undefined) {
  return Boolean(asset && asset.status !== "ready");
}
