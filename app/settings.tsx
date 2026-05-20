import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "../src/components/common/Screen";
import { spacing, useTheme } from "../src/design/theme";
import { useI18n } from "../src/i18n/useI18n";
import {
  disablePracticeReminder,
  getNotificationPermissionState,
  NotificationPermissionState,
  requestNotificationPermission,
  syncPracticeReminder,
} from "../src/lib/notifications";
import { useAppState } from "../src/state/AppStateProvider";

export default function SettingsScreen() {
  const { locale, setLocale, t } = useI18n();
  const { notifications, setTheme, updateNotifications } = useAppState();
  const { themeMode, colors, chipStyles, surfaceStyles, textStyles, shadows } =
    useTheme();
  const styles = createStyles({
    themeMode,
    colors,
    chipStyles,
    surfaceStyles,
    textStyles,
    shadows,
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>("undetermined");
  const notificationTimeDate = createTimeDate(notifications.time);

  useEffect(() => {
    void getNotificationPermissionState().then(setPermissionState);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (notifications.enabled) {
        void syncPracticeReminder(notifications);
        return;
      }

      void disablePracticeReminder();
    }, 300);

    return () => clearTimeout(timeout);
  }, [notifications]);

  const handleNotificationToggle = async () => {
    if (notifications.enabled) {
      setShowTimePicker(false);
      updateNotifications({ enabled: false });
      return;
    }

    const nextPermission = await requestNotificationPermission();
    setPermissionState(nextPermission);

    if (nextPermission !== "granted") {
      return;
    }

    const nextSettings = {
      ...notifications,
      enabled: true,
    };

    updateNotifications(nextSettings);
  };

  return (
    <Screen>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        </View>

        <View style={styles.optionList}>
          <SettingOptionCard
            icon="language-outline"
            title={t("settings.koreanTitle")}
            active={locale === "ko"}
            activeLabel={t("settings.selected")}
            onPress={() => setLocale("ko")}
          />
          <SettingOptionCard
            icon="language-outline"
            title={t("settings.japaneseTitle")}
            active={locale === "ja"}
            activeLabel={t("settings.selected")}
            onPress={() => setLocale("ja")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.theme")}</Text>
        </View>

        <View style={styles.optionList}>
          <SettingOptionCard
            icon="sunny-outline"
            title={t("settings.themeLightTitle")}
            active={themeMode === "light"}
            activeLabel={t("settings.selected")}
            onPress={() => setTheme("light")}
          />
          <SettingOptionCard
            icon="moon-outline"
            title={t("settings.themeDarkTitle")}
            active={themeMode === "dark"}
            activeLabel={t("settings.selected")}
            onPress={() => setTheme("dark")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("settings.notifications")}</Text>
        </View>

        <View style={[styles.infoCard, styles.shadow]}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardTitleRow}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={colors.accentWarmMuted}
              />
              <Text style={styles.infoCardTitle}>
                {t("settings.notificationsTitle")}
              </Text>
            </View>
            <NotificationToggle
              enabled={notifications.enabled}
              onPress={() => {
                void handleNotificationToggle();
              }}
            />
          </View>
          {permissionState === "denied" ? (
            <Text style={styles.permissionWarning}>
              {t("settings.notificationsPermissionDenied")}
            </Text>
          ) : null}

          {notifications.enabled ? (
            <View style={styles.notificationFields}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {t("settings.notificationsTime")}
                </Text>
                <Pressable
                  style={styles.timeFieldButton}
                  onPress={() => setShowTimePicker((current) => !current)}
                >
                  <Text style={styles.timeFieldValue}>{notifications.time}</Text>
                  <Ionicons
                    name={showTimePicker ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.inkMuted}
                  />
                </Pressable>
                {showTimePicker ? (
                  <View style={styles.timePickerCard}>
                    <DateTimePicker
                      mode="time"
                      value={notificationTimeDate}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, nextDate) => {
                        if (Platform.OS === "android") {
                          setShowTimePicker(false);
                        }

                        if (!nextDate) {
                          return;
                        }

                        updateNotifications({
                          time: formatTimeFromDate(nextDate),
                        });
                      }}
                    />
                  </View>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {t("settings.notificationsRepeat")}
                </Text>
                <View style={styles.repeatRow}>
                  <RepeatChip
                    label={t("settings.repeatDaily")}
                    active={notifications.repeat === "daily"}
                    onPress={() => updateNotifications({ repeat: "daily" })}
                  />
                  <RepeatChip
                    label={t("settings.repeatWeekdays")}
                    active={notifications.repeat === "weekdays"}
                    onPress={() => updateNotifications({ repeat: "weekdays" })}
                  />
                  <RepeatChip
                    label={t("settings.repeatWeekends")}
                    active={notifications.repeat === "weekends"}
                    onPress={() => updateNotifications({ repeat: "weekends" })}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {t("settings.notificationsMessage")}
                </Text>
                <TextInput
                  value={notifications.message}
                  onChangeText={(value) =>
                    updateNotifications({ message: value })
                  }
                  placeholder={t("settings.notificationsMessagePlaceholder")}
                  placeholderTextColor={colors.inkMuted}
                  multiline
                  maxLength={80}
                  style={[styles.textInput, styles.messageInput]}
                />
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>
                  {t("settings.notificationsPreview")}
                </Text>
                <Text style={styles.previewTitle}>
                  {notifications.message ||
                    t("settings.notificationsMessageFallback")}
                </Text>
                <Text style={styles.previewMeta}>
                  {t(`settings.repeat.${notifications.repeat}`)} ·{" "}
                  {notifications.time}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

type SettingOptionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  active: boolean;
  activeLabel: string;
  onPress: () => void;
};

function SettingOptionCard({
  icon,
  title,
  active,
  activeLabel,
  onPress,
}: SettingOptionCardProps) {
  const { colors, chipStyles, surfaceStyles, textStyles, themeMode, shadows } =
    useTheme();
  const styles = createStyles({
    themeMode,
    colors,
    chipStyles,
    surfaceStyles,
    textStyles,
    shadows,
  });

  return (
    <Pressable
      style={[
        styles.optionCard,
        styles.shadow,
        active && styles.optionCardActive,
      ]}
      onPress={onPress}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionTitleRow}>
          <Ionicons name={icon} size={18} color={colors.accentWarmMuted} />
          <Text style={styles.optionTitle}>{title}</Text>
        </View>
        {active ? (
          <View style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>{activeLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function RepeatChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, chipStyles, textStyles, themeMode } = useTheme();
  const styles = StyleSheet.create({
    chip: {
      ...chipStyles.base,
      borderWidth: 1,
      borderColor: active ? colors.inkStrongAlt : colors.borderSoft,
      backgroundColor: active ? colors.inkStrongAlt : colors.bgSurface,
    },
    chipText: {
      ...textStyles.meta,
      color: active
        ? colors.inkOnDark
        : themeMode === "dark"
          ? colors.inkStrong
          : colors.inkBody,
    },
  });

  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function NotificationToggle({
  enabled,
  onPress,
}: {
  enabled: boolean;
  onPress: () => void;
}) {
  const { themeMode, colors, chipStyles, surfaceStyles, textStyles, shadows } =
    useTheme();
  const styles = createStyles({
    themeMode,
    colors,
    chipStyles,
    surfaceStyles,
    textStyles,
    shadows,
  });
  const progress = useRef(new Animated.Value(enabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: enabled ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [enabled, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  return (
    <Pressable
      style={[styles.toggleButton, enabled && styles.toggleButtonActive]}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.toggleKnob,
          enabled && styles.toggleKnobActive,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </Pressable>
  );
}

function splitNotificationTime(time: string) {
  const [hour = "20", minute = "00"] = time.split(":");
  return [
    hour.padStart(2, "0").slice(0, 2),
    minute.padStart(2, "0").slice(0, 2),
  ] as const;
}

function createTimeDate(time: string) {
  const [hour, minute] = splitNotificationTime(time);
  const date = new Date();
  date.setHours(Number.parseInt(hour, 10), Number.parseInt(minute, 10), 0, 0);
  return date;
}

function formatTimeFromDate(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function createStyles({
  themeMode,
  colors,
  chipStyles,
  surfaceStyles,
  textStyles,
  shadows,
}: any) {
  return StyleSheet.create({
    section: {
      marginBottom: spacing[7],
      gap: spacing[3],
    },
    sectionHeader: {
      gap: 0,
    },
    sectionTitle: textStyles.sectionTitle,
    optionList: {
      gap: spacing[3],
    },
    optionCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      borderWidth: 1,
      borderColor: colors.borderSoft,
      minHeight: 76,
      justifyContent: "center",
    },
    optionCardActive: {
      backgroundColor: colors.bgMutedStrong,
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    optionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    optionTitle: textStyles.titleMd,
    selectedChip: {
      ...chipStyles.base,
      backgroundColor:
        themeMode === "dark" ? colors.accentWarm : colors.inkStrongAlt,
    },
    selectedChipText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    infoCard: {
      ...surfaceStyles.card,
      padding: spacing[6],
      borderWidth: 1,
      borderColor: colors.borderSoft,
      gap: spacing[3],
    },
    infoCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    infoCardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    infoCardTitle: textStyles.titleMd,
    infoCardBody: textStyles.bodySm,
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    settingLabel: textStyles.titleSm,
    toggleButton: {
      width: 52,
      height: 34,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    toggleButtonActive: {
      backgroundColor: colors.inkStrongAlt,
      borderColor: colors.inkStrongAlt,
    },
    toggleKnob: {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: colors.bgSurface,
    },
    toggleKnobActive: {
      backgroundColor: colors.bgCanvas,
    },
    notificationFields: {
      gap: spacing[4],
    },
    fieldGroup: {
      gap: spacing[2],
    },
    fieldLabel: textStyles.meta,
    textInput: {
      ...textStyles.bodyMd,
      backgroundColor: colors.bgCanvas,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      color: colors.inkStrong,
    },
    timeFieldButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
      backgroundColor: colors.bgCanvas,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
    },
    timeFieldValue: {
      ...textStyles.bodyMd,
      color: colors.inkStrong,
    },
    timePickerCard: {
      backgroundColor: colors.bgCanvas,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[2],
    },
    messageInput: {
      minHeight: 96,
      textAlignVertical: "top",
    },
    repeatRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
    },
    previewCard: {
      backgroundColor: colors.bgCanvas,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      padding: spacing[4],
      gap: spacing[1],
    },
    previewLabel: textStyles.meta,
    previewTitle: textStyles.titleSm,
    previewMeta: textStyles.bodySm,
    permissionWarning: {
      ...textStyles.bodySm,
      color: colors.danger,
    },
    shadow: shadows.card,
  });
}
