export type ReviewSession = {
  characterIds: string[];
  currentIndex: number;
  isReviewSession: boolean;
  nextCharacterId?: string;
  position: number;
  total: number;
};

export function buildReviewSession({
  currentCharacterId,
  encodedReviewIds,
}: {
  currentCharacterId?: string;
  encodedReviewIds?: string;
}): ReviewSession {
  const characterIds = parseReviewIds(encodedReviewIds);
  const currentIndex = currentCharacterId
    ? characterIds.findIndex((characterId) => characterId === currentCharacterId)
    : -1;

  return {
    characterIds,
    currentIndex,
    isReviewSession: characterIds.length > 0,
    nextCharacterId:
      currentIndex >= 0 ? characterIds[currentIndex + 1] : undefined,
    position: currentIndex >= 0 ? currentIndex + 1 : 0,
    total: characterIds.length,
  };
}

export function encodeReviewIds(characterIds: string[]) {
  return dedupeIds(characterIds).join(",");
}

export function buildFocusedReviewStart(characterIds: string[]) {
  const reviewIds = encodeReviewIds(characterIds);
  const [firstCharacterId] = parseReviewIds(reviewIds);

  return {
    canStart: Boolean(firstCharacterId),
    firstCharacterId,
    reviewIds,
  };
}

function parseReviewIds(encodedReviewIds: string | undefined) {
  if (!encodedReviewIds) {
    return [];
  }

  return dedupeIds(encodedReviewIds.split(","));
}

function dedupeIds(characterIds: string[]) {
  return [
    ...new Set(
      characterIds
        .map((characterId) => characterId.trim())
        .filter((characterId) => characterId.length > 0),
    ),
  ];
}
