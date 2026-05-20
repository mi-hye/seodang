import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { NotificationSettings } from "../types/app-state";

const REMINDER_IDS_KEY = "seodang-practice-reminder-ids-v1";
const CHANNEL_ID = "practice-reminders";
let reminderSyncQueue: Promise<void> = Promise.resolve();

export type NotificationPermissionState =
  | "unsupported"
  | "undetermined"
  | "denied"
  | "granted";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function initializeNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "학습 알림",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === "web") {
    return "unsupported";
  }

  const permissions = await Notifications.getPermissionsAsync();
  return normalizePermissionStatus(permissions.status);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === "web") {
    return "unsupported";
  }

  const permissions = await Notifications.requestPermissionsAsync();
  return normalizePermissionStatus(permissions.status);
}

export async function syncPracticeReminder(settings: NotificationSettings) {
  const snapshot = {
    ...settings,
    message: settings.message,
    time: settings.time,
    repeat: settings.repeat,
    enabled: settings.enabled,
  };

  reminderSyncQueue = reminderSyncQueue
    .catch(() => {})
    .then(() => performPracticeReminderSync(snapshot));

  return reminderSyncQueue;
}

export async function disablePracticeReminder() {
  if (Platform.OS === "web") {
    return;
  }

  reminderSyncQueue = reminderSyncQueue
    .catch(() => {})
    .then(() => cancelStoredPracticeReminders());

  return reminderSyncQueue;
}

async function performPracticeReminderSync(settings: NotificationSettings) {
  if (Platform.OS === "web") {
    return;
  }

  const permission = await getNotificationPermissionState();
  if (permission !== "granted") {
    return;
  }

  await cancelStoredPracticeReminders();

  if (!settings.enabled) {
    return;
  }

  await initializeNotifications();

  const triggers = buildReminderTriggers(settings);
  const nextIds: string[] = [];

  for (const trigger of triggers) {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Seodang",
        body: settings.message.trim() || "오늘도 한 글자 써볼까요?",
        sound: false,
        data: {
          kind: "practice-reminder",
        },
      },
      trigger,
    });
    nextIds.push(identifier);
  }

  await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(nextIds));
}

async function cancelStoredPracticeReminders() {
  const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
  const reminderIds = storedIds ? (JSON.parse(storedIds) as string[]) : [];

  for (const identifier of reminderIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }

  await AsyncStorage.removeItem(REMINDER_IDS_KEY);
}

function buildReminderTriggers(settings: NotificationSettings) {
  const [hour, minute] = settings.time.split(":").map((value) => Number.parseInt(value, 10));

  if (settings.repeat === "daily") {
    return [
      {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      } as Notifications.DailyTriggerInput,
    ];
  }

  const weekdays = settings.repeat === "weekdays" ? [2, 3, 4, 5, 6] : [1, 7];

  return weekdays.map(
    (weekday) =>
      ({
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      }) as Notifications.WeeklyTriggerInput,
  );
}

function normalizePermissionStatus(
  status: Notifications.PermissionStatus,
): NotificationPermissionState {
  if (status === Notifications.PermissionStatus.GRANTED) {
    return "granted";
  }

  if (status === Notifications.PermissionStatus.DENIED) {
    return "denied";
  }

  return "undetermined";
}
