// Appearance milestones are independent of the uncapped numerical level.
export const PET_APPEARANCES = [
  { stage: 1, level: 1, resolution: 24 },
  { stage: 2, level: 10, resolution: 32 },
  { stage: 3, level: 20, resolution: 48 },
  { stage: 4, level: 30, resolution: 64 },
  { stage: 5, level: 40, resolution: 96 },
] as const;

export function getPetAppearance(level: number) {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return [...PET_APPEARANCES].reverse().find((appearance) => safeLevel >= appearance.level)!;
}

export function getNextPetAppearance(level: number) {
  const current = getPetAppearance(level);
  return PET_APPEARANCES.find((appearance) => appearance.stage > current.stage);
}
