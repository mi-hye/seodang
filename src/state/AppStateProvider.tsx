import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { sampleCharacters } from "../data/characters";
import {
  AppLocale,
  CharacterProgress,
  PersistedAppState,
  ThemeMode,
  UserType,
} from "../types/app-state";

const STORAGE_KEY = "kanzi-app-state-v1";
const MAX_RECORDED_ATTEMPTS = 50;
const DEVICE_LOCALE = resolveInitialLocale();

type AppStateContextValue = {
  hydrated: boolean;
  locale: AppLocale;
  theme: ThemeMode;
  userType: UserType;
  progressByCharacter: Record<string, CharacterProgress>;
  reviewCount: number;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: ThemeMode) => void;
  setUserType: (userType: UserType) => void;
  recordAttempt: (input: {
    attemptId: string;
    characterId: string;
    score: number;
    passed: boolean;
    practicedAt: string;
  }) => void;
  getProgress: (characterId: string) => CharacterProgress | undefined;
  getReviewCharacters: () => typeof sampleCharacters;
};

const defaultState: PersistedAppState = {
  locale: DEVICE_LOCALE,
  theme: "light",
  userType: "korean_learner",
  progressByCharacter: {},
  recordedAttemptIds: [],
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PersistedAppState>(defaultState);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedAppState;
          setState({
            ...defaultState,
            ...parsed,
          });
        }
      } catch {
        if (mounted) {
          setState(defaultState);
        }
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [hydrated, state]);

  const value = useMemo<AppStateContextValue>(() => {
    const setLocale = (locale: AppLocale) => {
      setState((current) => ({ ...current, locale }));
    };

    const setTheme = (theme: ThemeMode) => {
      setState((current) => ({ ...current, theme }));
    };

    const setUserType = (userType: UserType) => {
      setState((current) => ({ ...current, userType }));
    };

    const recordAttempt: AppStateContextValue["recordAttempt"] = ({
      attemptId,
      characterId,
      score,
      passed,
      practicedAt,
    }) => {
      setState((current) => {
        if (current.recordedAttemptIds.includes(attemptId)) {
          return current;
        }

        const previous = current.progressByCharacter[characterId];
        const attempts = (previous?.attempts ?? 0) + 1;
        const successes = (previous?.successes ?? 0) + (passed ? 1 : 0);
        const failures = (previous?.failures ?? 0) + (passed ? 0 : 1);
        const totalScore = (previous?.averageScore ?? 0) * (previous?.attempts ?? 0) + score;

        const nextProgress: CharacterProgress = {
          characterId,
          attempts,
          successes,
          failures,
          averageScore: Math.round(totalScore / attempts),
          lastScore: score,
          lastPracticedAt: practicedAt,
        };

        return {
          ...current,
          progressByCharacter: {
            ...current.progressByCharacter,
            [characterId]: nextProgress,
          },
          recordedAttemptIds: [attemptId, ...current.recordedAttemptIds].slice(
            0,
            MAX_RECORDED_ATTEMPTS
          ),
        };
      });
    };

    const getProgress = (characterId: string) => state.progressByCharacter[characterId];

    const getReviewCharacters = () =>
      [...sampleCharacters]
        .filter((character) => {
          const progress = state.progressByCharacter[character.id];
          return progress ? progress.failures > 0 || progress.lastScore < 80 : false;
        })
        .sort((left, right) => {
          const leftProgress = state.progressByCharacter[left.id];
          const rightProgress = state.progressByCharacter[right.id];

          const leftWeight = (leftProgress?.failures ?? 0) * 100 - (leftProgress?.lastScore ?? 0);
          const rightWeight =
            (rightProgress?.failures ?? 0) * 100 - (rightProgress?.lastScore ?? 0);

          return rightWeight - leftWeight;
        });

    const reviewCount = getReviewCharacters().length;

    return {
      hydrated,
      locale: state.locale,
      theme: state.theme,
      userType: state.userType,
      progressByCharacter: state.progressByCharacter,
      reviewCount,
      setLocale,
      setTheme,
      setUserType,
      recordAttempt,
      getProgress,
      getReviewCharacters,
    };
  }, [hydrated, state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}

function resolveInitialLocale(): AppLocale {
  const [locale] = getLocales();
  return locale?.languageCode === "ja" ? "ja" : "ko";
}
