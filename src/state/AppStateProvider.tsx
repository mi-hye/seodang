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

import {
  AppLocale,
  CharacterProgress,
  LastCompletedPractice,
  NotificationSettings,
  PersistedAppState,
  ThemeMode,
  UserType,
} from "../types/app-state";

const STORAGE_KEY = "seodang-app-state-v1";
const MAX_RECORDED_ATTEMPTS = 50;
const DEVICE_LOCALE = resolveInitialLocale();

type AppStateContextValue = {
  hydrated: boolean;
  locale: AppLocale;
  theme: ThemeMode;
  userType: UserType;
  homeOnboardingDismissed: boolean;
  categoryOnboardingDismissed: boolean;
  notifications: NotificationSettings;
  recentCategoryKeys: string[];
  progressByCharacter: Record<string, CharacterProgress>;
  favoriteCount: number;
  lastCompletedPractice?: LastCompletedPractice;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: ThemeMode) => void;
  setUserType: (userType: UserType) => void;
  dismissHomeOnboarding: () => void;
  dismissCategoryOnboarding: () => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  recordAttempt: (input: {
    attemptId: string;
    characterId: string;
    categoryKey?: string;
    score: number;
    passed: boolean;
    practicedAt: string;
  }) => void;
  resetCategoryProgress: (input: {
    categoryKey: string;
    characterIds: string[];
  }) => void;
  getProgress: (characterId: string) => CharacterProgress | undefined;
  getFavoriteCharacterIds: () => string[];
  isFavorite: (characterId: string) => boolean;
  toggleFavorite: (characterId: string) => void;
};

const defaultState: PersistedAppState = {
  locale: DEVICE_LOCALE,
  theme: "light",
  userType: "korean_learner",
  homeOnboardingDismissed: false,
  categoryOnboardingDismissed: false,
  notifications: {
    enabled: false,
    time: "20:00",
    repeat: "daily",
    message: "오늘도 한 글자 써볼까요?",
  },
  recentCategoryKeys: [],
  progressByCharacter: {},
  recordedAttemptIds: [],
  favoriteCharacterIds: {},
  lastCompletedPractice: undefined,
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

    const dismissHomeOnboarding = () => {
      setState((current) => ({ ...current, homeOnboardingDismissed: true }));
    };

    const dismissCategoryOnboarding = () => {
      setState((current) => ({
        ...current,
        categoryOnboardingDismissed: true,
      }));
    };

    const updateNotifications = (patch: Partial<NotificationSettings>) => {
      setState((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          ...patch,
        },
      }));
    };

    const recordAttempt: AppStateContextValue["recordAttempt"] = ({
      attemptId,
      characterId,
      categoryKey,
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
          recentCategoryKeys: categoryKey
            ? [
                categoryKey,
                ...current.recentCategoryKeys.filter((key) => key !== categoryKey),
              ].slice(0, 10)
            : current.recentCategoryKeys,
          lastCompletedPractice: {
            characterId,
            categoryKey,
            practicedAt,
          },
          recordedAttemptIds: [attemptId, ...current.recordedAttemptIds].slice(
            0,
            MAX_RECORDED_ATTEMPTS
          ),
        };
      });
    };

    const resetCategoryProgress: AppStateContextValue["resetCategoryProgress"] = ({
      categoryKey,
      characterIds,
    }) => {
      setState((current) => {
        const nextProgressByCharacter = { ...current.progressByCharacter };

        for (const characterId of characterIds) {
          delete nextProgressByCharacter[characterId];
        }

        return {
          ...current,
          progressByCharacter: nextProgressByCharacter,
          recentCategoryKeys: current.recentCategoryKeys.filter(
            (key) => key !== categoryKey,
          ),
          lastCompletedPractice:
            current.lastCompletedPractice?.categoryKey === categoryKey
              ? undefined
              : current.lastCompletedPractice,
        };
      });
    };

    const getProgress = (characterId: string) => state.progressByCharacter[characterId];
    const getFavoriteCharacterIds = () => Object.keys(state.favoriteCharacterIds);
    const isFavorite = (characterId: string) => Boolean(state.favoriteCharacterIds[characterId]);
    const toggleFavorite = (characterId: string) => {
      setState((current) => {
        if (current.favoriteCharacterIds[characterId]) {
          const nextFavorites = { ...current.favoriteCharacterIds };
          delete nextFavorites[characterId];

          return {
            ...current,
            favoriteCharacterIds: nextFavorites,
          };
        }

        return {
          ...current,
          favoriteCharacterIds: {
            ...current.favoriteCharacterIds,
            [characterId]: true,
          },
        };
      });
    };

    const favoriteCount = getFavoriteCharacterIds().length;

    return {
      hydrated,
      locale: state.locale,
      theme: state.theme,
      userType: state.userType,
      homeOnboardingDismissed: state.homeOnboardingDismissed,
      categoryOnboardingDismissed: state.categoryOnboardingDismissed,
      notifications: state.notifications,
      recentCategoryKeys: state.recentCategoryKeys,
      progressByCharacter: state.progressByCharacter,
      favoriteCount,
      lastCompletedPractice: state.lastCompletedPractice,
      setLocale,
      setTheme,
      setUserType,
      dismissHomeOnboarding,
      dismissCategoryOnboarding,
      updateNotifications,
      recordAttempt,
      resetCategoryProgress,
      getProgress,
      getFavoriteCharacterIds,
      isFavorite,
      toggleFavorite,
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
