import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";

const notices = [
  {
    name: "KANJIDIC2",
    license: "Creative Commons Attribution-ShareAlike 4.0",
    sourceUrl: "https://www.edrdg.org/wiki/KANJIDIC_Project.html",
    licenseUrl: "https://www.edrdg.org/edrdg/licence.html",
  },
  {
    name: "KanjiVG",
    license: "Creative Commons Attribution-ShareAlike 3.0",
    sourceUrl: "https://kanjivg.tagaini.net/index.html",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    name: "AnimCJK",
    license: "Arphic Public License",
    sourceUrl: "https://github.com/parsimonhi/animCJK",
    licenseUrl: "https://www.freedesktop.org/wiki/Arphic_Public_License/",
  },
  {
    name: "JLPT kanji category data",
    license: "Open-source JLPT kanji JSON",
    sourceUrl: "https://kanjiapi.dev/",
    licenseUrl: "https://github.com/onlyskin/kanjiapi.dev",
  },
];

export default function ThirdPartyNoticesScreen() {
  const { t } = useI18n();
  const { colors, surfaceStyles, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles, textStyles });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t("notices.title")}</Text>
        <Text style={styles.body}>{t("notices.body")}</Text>
      </View>

      <View style={styles.card}>
        {notices.map((notice) => (
          <View key={notice.name} style={styles.notice}>
            <Text style={styles.noticeTitle}>{notice.name}</Text>
            <Text style={styles.noticeBody}>{notice.license}</Text>
            <View style={styles.linkList}>
              <NoticeLink label={t("notices.source")} url={notice.sourceUrl} />
              <NoticeLink label={t("notices.license")} url={notice.licenseUrl} />
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function NoticeLink({ label, url }: { label: string; url: string }) {
  const { colors, textStyles } = useTheme();
  const styles = createStyles({ colors, surfaceStyles: {}, textStyles });

  return (
    <Pressable onPress={() => void Linking.openURL(url)}>
      <Text style={styles.link}>
        {label}: {url}
      </Text>
    </Pressable>
  );
}

function createStyles({ colors, surfaceStyles, textStyles }: any) {
  return StyleSheet.create({
    header: {
      marginBottom: spacing[5],
      gap: spacing[2],
    },
    title: textStyles.displayMd,
    body: {
      ...textStyles.bodySm,
      color: colors.inkBody,
    },
    card: {
      ...surfaceStyles.card,
      padding: spacing[6],
      gap: spacing[5],
    },
    notice: {
      gap: spacing[2],
    },
    noticeTitle: textStyles.titleSm,
    noticeBody: {
      ...textStyles.bodySm,
      color: colors.inkBody,
    },
    linkList: {
      gap: spacing[1],
    },
    link: {
      ...textStyles.meta,
      color: colors.accentWarmMuted,
      textDecorationLine: "underline",
    },
  });
}
