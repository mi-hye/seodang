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
  syncPracticeReminders,
} from "../src/lib/notifications";
import { useAppState } from "../src/state/AppStateProvider";
import { NotificationReminder } from "../src/types/app-state";

export default function SettingsNotificationsScreen() {
  const { t } = useI18n();
  const {
    notificationReminders,
    addNotificationReminder,
    updateNotificationReminder,
    removeNotificationReminder,
  } = useAppState();
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
  const [pickerReminderId, setPickerReminderId] = useState<string | null>(null);
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>("undetermined");

  useEffect(() => {
    void getNotificationPermissionState().then(setPermissionState);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void (async () => {
        if (notificationReminders.some((reminder) => reminder.enabled)) {
          await syncPracticeReminders(notificationReminders);
        } else {
          await disablePracticeReminder();
        }
      })();
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [notificationReminders]);

  const ensurePermissionGranted = async () => {
    const nextPermission = await requestNotificationPermission();
    setPermissionState(nextPermission);
    return nextPermission === "granted";
  };

  const handleAddReminder = async () => {
    if (!(await ensurePermissionGranted())) {
      return;
    }

    addNotificationReminder();
  };

  const handleToggleReminder = async (reminder: NotificationReminder) => {
    if (reminder.enabled) {
      if (pickerReminderId === reminder.id) {
        setPickerReminderId(null);
      }
      updateNotificationReminder(reminder.id, { enabled: false });
      return;
    }

    if (!(await ensurePermissionGranted())) {
      return;
    }

    updateNotificationReminder(reminder.id, { enabled: true });
  };

  const handleDeleteReminder = (reminderId: string) => {
    if (pickerReminderId === reminderId) {
      setPickerReminderId(null);
    }
    removeNotificationReminder(reminderId);
  };

  return (
    <Screen>
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t("settings.notificationsTitle")}</Text>
          <Pressable style={styles.addButton} onPress={() => void handleAddReminder()}>
            <Ionicons name="add" size={16} color={colors.inkOnDark} />
            <Text style={styles.addButtonText}>{t("settings.notificationsAdd")}</Text>
          </Pressable>
        </View>

        {permissionState === "denied" ? (
          <View style={[styles.infoCard, styles.shadow]}>
            <Text style={styles.permissionWarning}>
              {t("settings.notificationsPermissionDenied")}
            </Text>
          </View>
        ) : null}

        <View style={styles.reminderList}>
          {notificationReminders.length === 0 ? (
            <View style={[styles.infoCard, styles.shadow]}>
              <Text style={styles.emptyText}>
                {t("settings.notificationsEmpty")}
              </Text>
            </View>
          ) : (
            notificationReminders.map((reminder, index) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                index={index}
                showTimePicker={pickerReminderId === reminder.id}
                onToggle={() => {
                  void handleToggleReminder(reminder);
                }}
                onToggleTimePicker={() =>
                  setPickerReminderId((current) =>
                    current === reminder.id ? null : reminder.id,
                  )
                }
                onTitleChange={(title) =>
                  updateNotificationReminder(reminder.id, { title })
                }
                onTimeChange={(time) =>
                  updateNotificationReminder(reminder.id, { time })
                }
                onRepeatChange={(repeat) =>
                  updateNotificationReminder(reminder.id, { repeat })
                }
                onMessageChange={(message) =>
                  updateNotificationReminder(reminder.id, { message })
                }
                onDelete={() => handleDeleteReminder(reminder.id)}
              />
            ))
          )}
        </View>

      </View>
    </Screen>
  );
}

function ReminderCard({
  reminder,
  index,
  showTimePicker,
  onToggle,
  onToggleTimePicker,
  onTitleChange,
  onTimeChange,
  onRepeatChange,
  onMessageChange,
  onDelete,
}: {
  reminder: NotificationReminder;
  index: number;
  showTimePicker: boolean;
  onToggle: () => void;
  onToggleTimePicker: () => void;
  onTitleChange: (title: string) => void;
  onTimeChange: (time: string) => void;
  onRepeatChange: (repeat: NotificationReminder["repeat"]) => void;
  onMessageChange: (message: string) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
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
  const notificationTimeDate = createTimeDate(reminder.time);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(reminder.title);
  const lastTitlePressAt = useRef(0);
  const defaultTitle = t("settings.notificationsItemTitle", { index: index + 1 });

  useEffect(() => {
    setTitleDraft(reminder.title);
  }, [reminder.title]);

  const handleTitlePress = () => {
    const now = Date.now();
    if (now - lastTitlePressAt.current < 280) {
      setIsEditingTitle(true);
    }
    lastTitlePressAt.current = now;
  };

  const handleTitleSubmit = () => {
    const nextTitle = titleDraft.trim() || defaultTitle;
    onTitleChange(nextTitle);
    setTitleDraft(nextTitle);
    setIsEditingTitle(false);
  };

  return (
    <View style={[styles.infoCard, styles.shadow]}>
      <View style={styles.infoCardHeader}>
        <View style={styles.infoCardTitleRow}>
          <Ionicons
            name="notifications-outline"
            size={18}
            color={colors.accentWarmMuted}
          />
          {isEditingTitle ? (
            <TextInput
              value={titleDraft}
              onChangeText={setTitleDraft}
              onBlur={handleTitleSubmit}
              onSubmitEditing={handleTitleSubmit}
              autoFocus
              maxLength={24}
              returnKeyType="done"
              placeholder={defaultTitle}
              placeholderTextColor={colors.inkMuted}
              style={styles.titleInput}
            />
          ) : (
            <Pressable onPress={handleTitlePress} hitSlop={8}>
              <Text style={styles.infoCardTitle}>
                {reminder.title || defaultTitle}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.rowActions}>
          <NotificationToggle enabled={reminder.enabled} onPress={onToggle} />
        </View>
      </View>

      {reminder.enabled ? (
        <View style={styles.notificationFields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("settings.notificationsTime")}</Text>
            <Pressable style={styles.timeFieldButton} onPress={onToggleTimePicker}>
              <Text style={styles.timeFieldValue}>{reminder.time}</Text>
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
                  onChange={(_, nextDate) => {
                    if (!nextDate) {
                      return;
                    }
                    onTimeChange(formatTimeFromDate(nextDate));
                  }}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("settings.notificationsRepeat")}</Text>
            <View style={styles.repeatRow}>
              <RepeatChip
                label={t("settings.repeatDaily")}
                active={reminder.repeat === "daily"}
                onPress={() => onRepeatChange("daily")}
              />
              <RepeatChip
                label={t("settings.repeatWeekdays")}
                active={reminder.repeat === "weekdays"}
                onPress={() => onRepeatChange("weekdays")}
              />
              <RepeatChip
                label={t("settings.repeatWeekends")}
                active={reminder.repeat === "weekends"}
                onPress={() => onRepeatChange("weekends")}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t("settings.notificationsMessage")}
            </Text>
            <TextInput
              value={reminder.message}
              onChangeText={onMessageChange}
              placeholder={t("settings.notificationsMessagePlaceholder")}
              placeholderTextColor={colors.inkMuted}
              multiline
              maxLength={80}
              style={[styles.textInput, styles.messageInput]}
            />
          </View>
        </View>
      ) : null}

      <Pressable style={styles.deleteRow} onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={styles.deleteText}>{t("common.delete")}</Text>
      </Pressable>
    </View>
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

function createTimeDate(time: string) {
  const [hour = "20", minute = "00"] = time.split(":");
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
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[3],
    },
    sectionTitle: textStyles.sectionTitle,
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[1],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: 999,
      backgroundColor: colors.inkStrongAlt,
    },
    addButtonText: {
      ...textStyles.meta,
      color: colors.inkOnDark,
    },
    reminderList: {
      gap: spacing[3],
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
      flex: 1,
    },
    infoCardTitle: textStyles.titleMd,
    titleInput: {
      ...textStyles.titleMd,
      color: colors.inkStrong,
      flex: 1,
      minWidth: 120,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    rowActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
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
    messageInput: {
      minHeight: 96,
      textAlignVertical: "top",
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
    repeatRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
    },
    permissionWarning: {
      ...textStyles.bodySm,
      color: colors.danger,
    },
    emptyText: textStyles.bodySm,
    deleteRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing[1],
      paddingTop: spacing[1],
    },
    deleteText: {
      ...textStyles.meta,
      color: colors.danger,
    },
    toggleButton: {
      width: 52,
      height: 34,
      borderRadius: 999,
      backgroundColor:
        themeMode === "dark" ? colors.bgMutedStrong : colors.bgMuted,
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    toggleButtonActive: {
      backgroundColor:
        themeMode === "dark" ? colors.accentWarm : colors.inkStrongAlt,
      borderWidth: 1,
      borderColor:
        themeMode === "dark" ? colors.accentWarm : colors.inkStrongAlt,
    },
    toggleKnob: {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor:
        themeMode === "dark" ? colors.inkStrong : colors.bgSurface,
    },
    toggleKnobActive: {
      backgroundColor: colors.inkOnDark,
    },
    shadow: shadows.card,
  });
}
