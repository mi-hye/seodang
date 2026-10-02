// A successful fetch and the effect that persists the plan occur in separate
// renders. Keep showing loading between them instead of a false fetch error.
export function getDailyLessonView(input: {
  hydrated: boolean;
  hasLesson: boolean;
  finished: boolean;
  categoryPending: boolean;
  categoryFetching: boolean;
  categoryError: boolean;
  needsMore: boolean;
  candidateCount: number;
  hasItem: boolean;
  characterLoading: boolean;
  hasCharacter: boolean;
}): "loading" | "complete" | "ready" | "error" {
  if (!input.hydrated) return "loading";
  if (input.finished) return "complete";
  if (!input.hasLesson) {
    if (input.categoryError) return "error";
    if (input.categoryPending || input.categoryFetching || input.needsMore || input.candidateCount > 0) return "loading";
    return "error";
  }
  if (input.hasItem && input.characterLoading) return "loading";
  return input.hasItem && input.hasCharacter ? "ready" : "error";
}
