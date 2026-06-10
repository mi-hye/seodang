import type { CharacterProgress } from "../../types/app-state";

const CONQUERED_SCORE_THRESHOLD = 60;
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

export function buildMistakeNote(
  progressByCharacter: Record<string, CharacterProgress>,
): MistakeNote {
  const mistakeItems = Object.values(progressByCharacter).filter(
    (progress) => progress.failures > 0,
  );
  const activeMistakeItems = mistakeItems.filter(
    (progress) => progress.lastScore < CONQUERED_SCORE_THRESHOLD,
  );
  const conqueredMistakeItems = mistakeItems.filter(
    (progress) => progress.lastScore >= CONQUERED_SCORE_THRESHOLD,
  );
  const repeatedMistakeItems = mistakeItems.filter(
    (progress) => progress.failures >= REPEATED_MISTAKE_THRESHOLD,
  );
  const practiceItems =
    activeMistakeItems.length > 0 ? activeMistakeItems : mistakeItems;

  return {
    activeMistakeCharacterIds: activeMistakeItems.map(
      (progress) => progress.characterId,
    ),
    conqueredMistakeCharacterIds: conqueredMistakeItems.map(
      (progress) => progress.characterId,
    ),
    conqueredMistakeCharacters: conqueredMistakeItems.length,
    mistakeCharacterIds: mistakeItems.map((progress) => progress.characterId),
    mistakeCharacters: mistakeItems.length,
    practiceCharacterIds: practiceItems.map((progress) => progress.characterId),
    repeatedMistakeCharacterIds: repeatedMistakeItems.map(
      (progress) => progress.characterId,
    ),
    repeatedMistakeCharacters: repeatedMistakeItems.length,
  };
}
