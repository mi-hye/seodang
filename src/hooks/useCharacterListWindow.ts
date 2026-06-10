import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

import {
  DEFAULT_CHARACTER_LIST_LIMIT,
  getDefaultCharacterListWindow,
  getNextCharacterListLimit,
} from "../domain/characters/listWindow";

const SCROLL_LOAD_MORE_THRESHOLD = 180;

export function useCharacterListWindow(characterIds: string[]) {
  const characterIdsKey = useMemo(() => characterIds.join("\u0000"), [characterIds]);
  const [visibleLimit, setVisibleLimit] = useState(
    DEFAULT_CHARACTER_LIST_LIMIT,
  );
  useEffect(() => {
    setVisibleLimit(DEFAULT_CHARACTER_LIST_LIMIT);
  }, [characterIdsKey]);
  const visibleCharacterIds = useMemo(
    () => getDefaultCharacterListWindow(characterIds, visibleLimit),
    [characterIds, visibleLimit],
  );
  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const isNearBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - SCROLL_LOAD_MORE_THRESHOLD;

      if (!isNearBottom) {
        return;
      }

      setVisibleLimit((currentLimit) =>
        getNextCharacterListLimit(currentLimit, characterIds.length),
      );
    },
    [characterIds.length],
  );

  return {
    handleListScroll,
    visibleCharacterIds,
  };
}
