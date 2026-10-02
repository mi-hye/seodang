// Keep the primary home action in sync with the existing due-review queue.
export function getHomeLearningAction(hydrated: boolean, reviewCount: number) {
  if (!hydrated) return { kind: "loading", route: null } as const;
  if (reviewCount > 0) return { kind: "review", route: "/review" } as const;
  return { kind: "learn", route: "/categories" } as const;
}
