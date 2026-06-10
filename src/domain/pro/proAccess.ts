export type ProFeature = "focused_review" | "mistake_note" | "review_stats";

export function canAccessProFeature({
  feature,
  isPro,
}: {
  feature: ProFeature;
  isPro: boolean;
}) {
  switch (feature) {
    case "focused_review":
    case "mistake_note":
    case "review_stats":
      return isPro;
  }
}
