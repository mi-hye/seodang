import { KanjiCategoryGroup } from "../data/fetchKanjiCategories";

type CharacterCategoryMapping = {
  character_id: string;
  category_id: string;
};

type CategoryIdRow = {
  category_id: string;
};

export type CategoryProgress = {
  categoryId: string;
  categoryKey: string;
  label: string;
  completed: number;
  total: number;
  ratio: number;
};

export function buildCategoryProgressMap(
  groups: KanjiCategoryGroup[],
  mappings: CharacterCategoryMapping[],
  totalsByCategoryId: Map<string, number> = new Map(),
) {
  const completedIdsByCategory = new Map<string, Set<string>>();

  for (const mapping of mappings) {
    const existing =
      completedIdsByCategory.get(mapping.category_id) ?? new Set<string>();
    existing.add(mapping.character_id);
    completedIdsByCategory.set(mapping.category_id, existing);
  }

  return new Map(
    groups
      .filter((group) => isTrackableProgressGroup(group.groupKey))
      .flatMap((group) => group.categories)
      .map((category) => {
        const completed = completedIdsByCategory.get(category.id)?.size ?? 0;
        const total =
          totalsByCategoryId.get(category.id) ?? category.totalCharacters ?? 0;

        return [
          category.categoryKey,
          {
            categoryId: category.id,
            categoryKey: category.categoryKey,
            label: category.label,
            completed,
            total,
            ratio: total > 0 ? completed / total : 0,
          } satisfies CategoryProgress,
        ] as const;
      }),
  );
}

export function buildCategoryTotalsMap(rows: CategoryIdRow[]) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    totals.set(row.category_id, (totals.get(row.category_id) ?? 0) + 1);
  }

  return totals;
}

export function listActiveCategoryProgress(
  groups: KanjiCategoryGroup[],
  progressMap: Map<string, CategoryProgress>,
) {
  return groups
    .filter((group) => isTrackableProgressGroup(group.groupKey))
    .flatMap((group) => group.categories)
    .map(
      (category) =>
        progressMap.get(category.categoryKey) ?? {
          categoryId: category.id,
          categoryKey: category.categoryKey,
          label: category.label,
          completed: 0,
          total: category.totalCharacters ?? 0,
          ratio: 0,
        },
    )
    .filter((category) => category.completed > 0 && category.total > 0)
    .sort((left, right) => {
      if (right.completed !== left.completed) {
        return right.completed - left.completed;
      }

      return right.total - left.total;
    });
}

function isTrackableProgressGroup(groupKey: string) {
  return groupKey !== "radical" && groupKey !== "stroke_count";
}
