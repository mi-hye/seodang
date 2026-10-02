// Route metadata only: importing the bar must not eagerly load tab screens.
export const MAIN_TABS = [
  { path: "/", key: "home", icon: "home-outline", activeIcon: "home" },
  { path: "/learn", key: "learn", icon: "grid-outline", activeIcon: "grid" },
  { path: "/review", key: "review", icon: "refresh-outline", activeIcon: "refresh" },
  { path: "/writing-history", key: "history", icon: "stats-chart-outline", activeIcon: "stats-chart" },
] as const;

export function getMainTab(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return MAIN_TABS.find((tab) => tab.path === path);
}
