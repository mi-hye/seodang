export type DetailOnboardingLayout = {
  hintBottom: number | null;
  scrollBottomPadding: number;
};

const DEFAULT_SCREEN_BOTTOM_PADDING = 32;

export function getDetailOnboardingLayout(
  showOnboarding: boolean,
): DetailOnboardingLayout {
  if (!showOnboarding) {
    return {
      hintBottom: null,
      scrollBottomPadding: DEFAULT_SCREEN_BOTTOM_PADDING,
    };
  }

  return {
    hintBottom: 100,
    scrollBottomPadding: DEFAULT_SCREEN_BOTTOM_PADDING,
  };
}
