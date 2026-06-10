export type ProFeature = "review_stats";

export function canAccessProFeature({
  feature,
  isPro,
}: {
  feature: ProFeature;
  isPro: boolean;
}) {
  switch (feature) {
    case "review_stats":
      return isPro;
  }
}
