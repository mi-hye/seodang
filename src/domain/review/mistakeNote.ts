import type { CharacterProgress } from "../../types/app-state";

export const MISTAKE_CONQUERED_SCORE_THRESHOLD = 70;
const REPEATED_MISTAKE_THRESHOLD = 2;

export type MistakeNote = {
  activeMistakeCharacterIds: string[];
  conqueredMistakeCharacterIds: string[];
  conqueredMistakeCharacters: number;
  mistakeCharacterIds: string[];
  mistakeCharacters: number;
  practiceCharacterIds: string[];
  repeatedMistakeCharacterIds: string[];
  repeatedMistakeCharacters: number;
};

export type MistakeNoteTab = "all" | "conquered" | "repeated";

export type MistakeNoteBadge = {
  achieved: boolean;
  bodyKey: string;
  current: number;
  id:
    | "conquest_master"
    | "first_conquest"
    | "flawless_conqueror"
    | "mistake_hunter";
  progressPercent: number;
  remaining: number;
  threshold: number;
  titleKey: string;
};

export type MistakeNoteRank = {
  current: number;
  id: "beginner" | "conqueror" | "master" | "practitioner";
  nextThreshold?: number;
  nextTitleKey?: string;
  remainingToNext: number;
  titleKey: string;
};

type MistakeNoteBadgeDefinition = Omit<
  MistakeNoteBadge,
  "achieved" | "current" | "progressPercent" | "remaining"
>;

type MistakeNoteRankDefinition = Pick<
  MistakeNoteRank,
  "id" | "titleKey"
> & {
  threshold: number;
};

const MISTAKE_NOTE_BADGES: MistakeNoteBadgeDefinition[] = [
  {
    id: "first_conquest",
    threshold: 10,
    titleKey: "mistakeNote.badge.firstConquest.title",
    bodyKey: "mistakeNote.badge.firstConquest.body",
  },
  {
    id: "mistake_hunter",
    threshold: 50,
    titleKey: "mistakeNote.badge.mistakeHunter.title",
    bodyKey: "mistakeNote.badge.mistakeHunter.body",
  },
  {
    id: "conquest_master",
    threshold: 100,
    titleKey: "mistakeNote.badge.conquestMaster.title",
    bodyKey: "mistakeNote.badge.conquestMaster.body",
  },
  {
    id: "flawless_conqueror",
    threshold: 200,
    titleKey: "mistakeNote.badge.flawlessConqueror.title",
    bodyKey: "mistakeNote.badge.flawlessConqueror.body",
  },
];

const MISTAKE_NOTE_RANKS: MistakeNoteRankDefinition[] = [
  {
    id: "beginner",
    threshold: 0,
    titleKey: "mistakeNote.rank.beginner",
  },
  {
    id: "practitioner",
    threshold: 1,
    titleKey: "mistakeNote.rank.practitioner",
  },
  {
    id: "conqueror",
    threshold: 50,
    titleKey: "mistakeNote.rank.conqueror",
  },
  {
    id: "master",
    threshold: 100,
    titleKey: "mistakeNote.rank.master",
  },
];

export function buildMistakeNote(
  progressByCharacter: Record<string, CharacterProgress>,
): MistakeNote {
  const mistakeItems = Object.values(progressByCharacter).filter(
    (progress) => progress.failures > 0,
  );
  const activeMistakeItems = mistakeItems.filter(
    (progress) => progress.lastScore < MISTAKE_CONQUERED_SCORE_THRESHOLD,
  );
  const conqueredMistakeItems = mistakeItems.filter(
    (progress) => progress.lastScore >= MISTAKE_CONQUERED_SCORE_THRESHOLD,
  );
  const repeatedMistakeItems = mistakeItems.filter(
    (progress) => progress.failures >= REPEATED_MISTAKE_THRESHOLD,
  );
  const sortedActiveMistakeItems = [...activeMistakeItems].sort(
    compareActiveMistakes,
  );
  const sortedConqueredMistakeItems = [...conqueredMistakeItems].sort(
    compareConqueredMistakes,
  );
  const sortedRepeatedMistakeItems = [...repeatedMistakeItems].sort(
    compareRepeatedMistakes,
  );
  const sortedMistakeItems = [
    ...sortedActiveMistakeItems,
    ...sortedConqueredMistakeItems,
  ];
  const practiceItems =
    sortedActiveMistakeItems.length > 0
      ? sortedActiveMistakeItems
      : sortedMistakeItems;

  return {
    activeMistakeCharacterIds: sortedActiveMistakeItems.map(
      (progress) => progress.characterId,
    ),
    conqueredMistakeCharacterIds: sortedConqueredMistakeItems.map(
      (progress) => progress.characterId,
    ),
    conqueredMistakeCharacters: conqueredMistakeItems.length,
    mistakeCharacterIds: sortedMistakeItems.map((progress) => progress.characterId),
    mistakeCharacters: mistakeItems.length,
    practiceCharacterIds: practiceItems.map((progress) => progress.characterId),
    repeatedMistakeCharacterIds: sortedRepeatedMistakeItems.map(
      (progress) => progress.characterId,
    ),
    repeatedMistakeCharacters: repeatedMistakeItems.length,
  };
}

function compareActiveMistakes(
  first: CharacterProgress,
  second: CharacterProgress,
) {
  return (
    second.failures - first.failures ||
    first.lastScore - second.lastScore ||
    compareRecentPractice(first, second)
  );
}

function compareRepeatedMistakes(
  first: CharacterProgress,
  second: CharacterProgress,
) {
  return (
    second.failures - first.failures ||
    first.lastScore - second.lastScore ||
    compareRecentPractice(first, second)
  );
}

function compareConqueredMistakes(
  first: CharacterProgress,
  second: CharacterProgress,
) {
  return (
    compareRecentPractice(first, second) ||
    second.lastScore - first.lastScore ||
    second.failures - first.failures
  );
}

function compareRecentPractice(
  first: CharacterProgress,
  second: CharacterProgress,
) {
  return (
    getPracticeTime(second.lastPracticedAt) -
    getPracticeTime(first.lastPracticedAt)
  );
}

function getPracticeTime(practicedAt: string | undefined) {
  if (!practicedAt) {
    return 0;
  }

  const time = new Date(practicedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function getMistakeNoteTabCharacterIds(
  note: MistakeNote,
  tab: MistakeNoteTab,
) {
  switch (tab) {
    case "conquered":
      return note.conqueredMistakeCharacterIds;
    case "repeated":
      return note.repeatedMistakeCharacterIds;
    case "all":
      return note.mistakeCharacterIds;
  }
}

export function getMistakeNoteEmptyStateKeys(tab: MistakeNoteTab) {
  switch (tab) {
    case "conquered":
      return {
        bodyKey: "mistakeNote.emptyConqueredBody",
        titleKey: "mistakeNote.emptyConqueredTitle",
      };
    case "repeated":
      return {
        bodyKey: "mistakeNote.emptyRepeatedBody",
        titleKey: "mistakeNote.emptyRepeatedTitle",
      };
    case "all":
      return {
        bodyKey: "mistakeNote.emptyBody",
        titleKey: "mistakeNote.emptyTitle",
      };
  }
}

export function getMistakeNotePracticeActionKeys(tab: MistakeNoteTab) {
  switch (tab) {
    case "conquered":
      return {
        bodyKey: "mistakeNote.practiceConqueredBody",
        titleKey: "mistakeNote.practiceConqueredTitle",
      };
    case "repeated":
      return {
        bodyKey: "mistakeNote.practiceRepeatedBody",
        titleKey: "mistakeNote.practiceRepeatedTitle",
      };
    case "all":
      return {
        bodyKey: "mistakeNote.practiceBody",
        titleKey: "mistakeNote.practiceTitle",
      };
  }
}

export function getMistakeNoteSortHintKey(tab: MistakeNoteTab) {
  switch (tab) {
    case "conquered":
      return "mistakeNote.sortHint.conquered";
    case "repeated":
      return "mistakeNote.sortHint.repeated";
    case "all":
      return "mistakeNote.sortHint.all";
  }
}

export function getMistakeNoteCardCopyKeys(
  tab: MistakeNoteTab,
  conquered: boolean,
) {
  if (tab === "conquered") {
    return {
      metaKey: "mistakeNote.cardConqueredMeta",
      subMetaKey: "mistakeNote.cardConqueredListHint",
    };
  }

  if (tab === "repeated") {
    return {
      metaKey: "mistakeNote.cardRepeatedMeta",
      subMetaKey: "mistakeNote.cardRepeatedHint",
    };
  }

  if (conquered) {
    return {
      metaKey: "mistakeNote.cardConqueredMeta",
      subMetaKey: "mistakeNote.cardConqueredHint",
    };
  }

  return {
    metaKey: "mistakeNote.cardMeta",
    subMetaKey: "mistakeNote.cardActiveHint",
  };
}

export function buildMistakeNoteBadges(
  conqueredMistakeCharacters: number,
): MistakeNoteBadge[] {
  return MISTAKE_NOTE_BADGES.map((badge) => ({
    ...badge,
    achieved: conqueredMistakeCharacters >= badge.threshold,
    current: Math.min(conqueredMistakeCharacters, badge.threshold),
    progressPercent: Math.min(
      100,
      Math.round((conqueredMistakeCharacters / badge.threshold) * 100),
    ),
    remaining: Math.max(0, badge.threshold - conqueredMistakeCharacters),
  }));
}

export function buildMistakeNoteRank(
  conqueredMistakeCharacters: number,
): MistakeNoteRank {
  const currentRank =
    MISTAKE_NOTE_RANKS.findLast(
      (rank) => conqueredMistakeCharacters >= rank.threshold,
    ) ?? MISTAKE_NOTE_RANKS[0];
  const currentRankIndex = MISTAKE_NOTE_RANKS.findIndex(
    (rank) => rank.id === currentRank.id,
  );
  const nextRank = MISTAKE_NOTE_RANKS[currentRankIndex + 1];

  return {
    current: conqueredMistakeCharacters,
    id: currentRank.id,
    nextThreshold: nextRank?.threshold,
    nextTitleKey: nextRank?.titleKey,
    remainingToNext: nextRank
      ? Math.max(0, nextRank.threshold - conqueredMistakeCharacters)
      : 0,
    titleKey: currentRank.titleKey,
  };
}
