import type { LearningPet } from "../../types/app-state";
import { localDateKey } from "../review/writingActivity.ts";
import { getPetAppearance } from "./petAppearance.ts";

export const DAILY_FOOD_LIMIT = 3;
export const FEEDS_PER_LEVEL = 3;

export function createLearningPet(): LearningPet {
  return { species: "dog", food: 1, totalFed: 0, rewardsByDay: {} };
}

type PreviousLearningPet = Omit<LearningPet, "species"> & {
  species?: "cat" | "shiba" | "dog" | null;
};

export function migrateLearningPet(pet?: PreviousLearningPet): LearningPet {
  if (!pet) return createLearningPet();
  // Change only the character, never reset earned food, growth or reward receipts.
  return pet.species === "dog" ? pet as LearningPet : { ...pet, species: "dog" };
}

export function rewardLearningPet(pet: LearningPet, input: {
  characterId: string; attemptId: string; passed: boolean; practicedAt: string;
}, now = new Date()): LearningPet {
  const date = new Date(input.practicedAt);
  if (!input.passed || !input.characterId || !input.attemptId || !Number.isFinite(date.getTime())) return pet;
  const day = localDateKey(date);
  // Old result links cannot generate new rewards on another day.
  if (day !== localDateKey(now) || date.getTime() > now.getTime()) return pet;
  const rewards = pet.rewardsByDay[day] ?? { characterIds: [], attemptIds: [] };
  if (rewards.characterIds.length >= DAILY_FOOD_LIMIT || rewards.characterIds.includes(input.characterId) || rewards.attemptIds.includes(input.attemptId)) return pet;
  return {
    ...pet,
    food: pet.food + 1,
    rewardsByDay: {
      ...pet.rewardsByDay,
      [day]: {
        characterIds: [...rewards.characterIds, input.characterId],
        attemptIds: [...rewards.attemptIds, input.attemptId],
      },
    },
  };
}

export function feedLearningPet(pet: LearningPet): LearningPet {
  return pet.food > 0 ? { ...pet, food: pet.food - 1, totalFed: pet.totalFed + 1 } : pet;
}

export function getPetGrowth(pet: LearningPet) {
  const level = Math.floor(pet.totalFed / FEEDS_PER_LEVEL) + 1;
  return { level, progress: pet.totalFed % FEEDS_PER_LEVEL, stage: getPetAppearance(level).stage };
}

export function getTodayPetRewards(pet: LearningPet, now: Date) {
  return pet.rewardsByDay[localDateKey(now)]?.characterIds.length ?? 0;
}

export function hasPetReward(pet: LearningPet, attemptId: string, practicedAt: string) {
  const date = new Date(practicedAt);
  return Number.isFinite(date.getTime()) && Boolean(pet.rewardsByDay[localDateKey(date)]?.attemptIds.includes(attemptId));
}
