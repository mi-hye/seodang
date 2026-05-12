import { I18n } from "i18n-js";
import { useMemo } from "react";

import { useAppState } from "../state/AppStateProvider";
import ja from "./ja.json";
import ko from "./ko.json";

const i18n = new I18n({ ko, ja });
i18n.enableFallback = true;
i18n.defaultLocale = "ko";
i18n.defaultSeparator = "::";

export function useI18n() {
  const { locale, setLocale } = useAppState();

  const instance = useMemo(() => {
    i18n.locale = locale;
    return i18n;
  }, [locale]);

  return {
    locale,
    setLocale,
    t: instance.t.bind(instance),
  };
}
