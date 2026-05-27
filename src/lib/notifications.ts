import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { NotificationReminder } from "../types/app-state";

const REMINDER_IDS_KEY = "seodang-practice-reminder-ids-v1";
const CHANNEL_ID = "practice-reminders";
let reminderSyncQueue: Promise<void> = Promise.resolve();

export type NotificationPermissionState =
  | "unsupported"
  | "undetermined"
  | "denied"
  | "granted";

export type ScheduledPracticeReminder = {
  id: string;
  ids: string[];
  reminderIds: string[];
  title: string;
  body: string;
  hour: number | null;
  minute: number | null;
  weekdays: number[];
  repeats: "daily" | "weekdays" | "weekends" | "weekly" | "unknown";
};

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

export async function syncPracticeReminders(reminders: NotificationReminder[]) {
  const snapshot = reminders.map((reminder) => ({ ...reminder }));

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

export async function cancelPracticeReminderGroup(ids: string[]) {
  if (Platform.OS === "web") {
    return;
  }

  for (const identifier of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }

  const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
  const reminderIds = storedIds ? (JSON.parse(storedIds) as string[]) : [];
  const nextReminderIds = reminderIds.filter((id) => !ids.includes(id));

  if (nextReminderIds.length === 0) {
    await AsyncStorage.removeItem(REMINDER_IDS_KEY);
    return;
  }

  await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(nextReminderIds));
}

export async function getScheduledPracticeReminders(): Promise<
  ScheduledPracticeReminder[]
> {
  if (Platform.OS === "web") {
    return [];
  }

  const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
  const reminderIds = storedIds ? (JSON.parse(storedIds) as string[]) : [];
  if (reminderIds.length === 0) {
    return [];
  }

  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();
  const reminderIdSet = new Set(reminderIds);

  const parsedReminders = scheduledNotifications
    .filter((notification) => reminderIdSet.has(notification.identifier))
    .map((notification) =>
      parseScheduledPracticeReminder(
        notification.identifier,
        notification.content.title,
        notification.content.body,
        typeof notification.content.data?.reminderId === "string"
          ? notification.content.data.reminderId
          : null,
        notification.trigger,
      ),
    );

  return groupScheduledPracticeReminders(parsedReminders).sort(
    compareScheduledPracticeReminders,
  );
}

async function performPracticeReminderSync(reminders: NotificationReminder[]) {
  if (Platform.OS === "web") {
    return;
  }

  const permission = await getNotificationPermissionState();
  if (permission !== "granted") {
    return;
  }

  await cancelStoredPracticeReminders();

  const enabledReminders = reminders.filter((reminder) => reminder.enabled);
  if (!enabledReminders.length) {
    return;
  }

  await initializeNotifications();

  const nextIds: string[] = [];

  for (const reminder of enabledReminders) {
    const triggers = buildReminderTriggers(reminder);

    for (const trigger of triggers) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Seodang",
          body: reminder.message.trim() || "오늘도 한 글자 써볼까요?",
          sound: false,
          data: {
            kind: "practice-reminder",
            reminderId: reminder.id,
          },
        },
        trigger,
      });
      nextIds.push(identifier);
    }
  }

  await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(nextIds));
}

async function cancelStoredPracticeReminders() {
  const storedIds = await AsyncStorage.getItem(REMINDER_IDS_KEY);
  const reminderIds = storedIds ? (JSON.parse(storedIds) as string[]) : [];
  const scheduledNotifications =
    Platform.OS === "web"
      ? []
      : await Notifications.getAllScheduledNotificationsAsync();
  const practiceReminderIds = scheduledNotifications
    .filter((notification) => notification.content.data?.kind === "practice-reminder")
    .map((notification) => notification.identifier);
  const allReminderIds = [...new Set([...reminderIds, ...practiceReminderIds])];

  for (const identifier of allReminderIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }

  await AsyncStorage.removeItem(REMINDER_IDS_KEY);
}

function buildReminderTriggers(reminder: NotificationReminder) {
  const [hour, minute] = reminder.time
    .split(":")
    .map((value) => Number.parseInt(value, 10));

  if (reminder.repeat === "daily") {
    return [
      {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      } as Notifications.DailyTriggerInput,
    ];
  }

  const weekdays = reminder.repeat === "weekdays" ? [2, 3, 4, 5, 6] : [1, 7];

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

function parseScheduledPracticeReminder(
  id: string,
  title: string | null,
  body: string | null,
  reminderId: string | null,
  trigger: Notifications.NotificationTriggerInput | Notifications.NotificationTrigger,
): ScheduledPracticeReminder {
  if (isDailyTrigger(trigger)) {
    return {
      id,
      ids: [id],
      reminderIds: reminderId ? [reminderId] : [],
      title: title ?? "Seodang",
      body: body ?? "",
      hour: trigger.hour,
      minute: trigger.minute,
      weekdays: [],
      repeats: "daily",
    };
  }

  if (isWeeklyTrigger(trigger)) {
    return {
      id,
      ids: [id],
      reminderIds: reminderId ? [reminderId] : [],
      title: title ?? "Seodang",
      body: body ?? "",
      hour: trigger.hour,
      minute: trigger.minute,
      weekdays: [trigger.weekday],
      repeats: "weekly",
    };
  }

  if (isCalendarTrigger(trigger)) {
    const dateComponents =
      "dateComponents" in trigger &&
      trigger.dateComponents &&
      typeof trigger.dateComponents === "object"
        ? trigger.dateComponents
        : null;
    const hour =
      typeof trigger.hour === "number"
        ? trigger.hour
        : dateComponents && "hour" in dateComponents && typeof dateComponents.hour === "number"
          ? dateComponents.hour
          : null;
    const minute =
      typeof trigger.minute === "number"
        ? trigger.minute
        : dateComponents && "minute" in dateComponents && typeof dateComponents.minute === "number"
          ? dateComponents.minute
          : null;
    const weekday =
      typeof trigger.weekday === "number"
        ? trigger.weekday
        : dateComponents && "weekday" in dateComponents && typeof dateComponents.weekday === "number"
          ? dateComponents.weekday
          : null;

    return {
      id,
      ids: [id],
      reminderIds: reminderId ? [reminderId] : [],
      title: title ?? "Seodang",
      body: body ?? "",
      hour,
      minute,
      weekdays: weekday !== null ? [weekday] : [],
      repeats:
        weekday !== null
          ? "weekly"
          : hour !== null && minute !== null
            ? "daily"
            : "unknown",
    };
  }

  return {
    id,
    ids: [id],
    reminderIds: reminderId ? [reminderId] : [],
    title: title ?? "Seodang",
    body: body ?? "",
    hour: null,
    minute: null,
    weekdays: [],
    repeats: "unknown",
  };
}

function isDailyTrigger(
  trigger: Notifications.NotificationTriggerInput | Notifications.NotificationTrigger,
): trigger is Notifications.DailyTriggerInput {
  return Boolean(
    trigger &&
      "type" in trigger &&
      trigger.type === Notifications.SchedulableTriggerInputTypes.DAILY &&
      "hour" in trigger &&
      "minute" in trigger,
  );
}

function isWeeklyTrigger(
  trigger: Notifications.NotificationTriggerInput | Notifications.NotificationTrigger,
): trigger is Notifications.WeeklyTriggerInput {
  return Boolean(
    trigger &&
      "type" in trigger &&
      trigger.type === Notifications.SchedulableTriggerInputTypes.WEEKLY &&
      "hour" in trigger &&
      "minute" in trigger &&
      "weekday" in trigger,
  );
}

function isCalendarTrigger(
  trigger: Notifications.NotificationTriggerInput | Notifications.NotificationTrigger,
): trigger is Notifications.CalendarTriggerInput & {
  dateComponents?: {
    hour?: number;
    minute?: number;
    weekday?: number;
  };
} {
  return Boolean(
    trigger &&
      "type" in trigger &&
      trigger.type === Notifications.SchedulableTriggerInputTypes.CALENDAR,
  );
}

function compareScheduledPracticeReminders(
  left: ScheduledPracticeReminder,
  right: ScheduledPracticeReminder,
) {
  const leftOrder =
    left.repeats === "daily"
      ? 0
      : left.repeats === "weekdays"
        ? 1
        : left.repeats === "weekends"
          ? 2
          : left.weekdays[0] ?? 8;
  const rightOrder =
    right.repeats === "daily"
      ? 0
      : right.repeats === "weekdays"
        ? 1
        : right.repeats === "weekends"
          ? 2
          : right.weekdays[0] ?? 8;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const leftHour = left.hour ?? 99;
  const rightHour = right.hour ?? 99;
  if (leftHour !== rightHour) {
    return leftHour - rightHour;
  }

  const leftMinute = left.minute ?? 99;
  const rightMinute = right.minute ?? 99;
  return leftMinute - rightMinute;
}

function groupScheduledPracticeReminders(
  reminders: ScheduledPracticeReminder[],
): ScheduledPracticeReminder[] {
  const grouped = new Map<string, ScheduledPracticeReminder>();

  for (const reminder of reminders) {
    const key = [
      reminder.title,
      reminder.body,
      reminder.hour ?? "x",
      reminder.minute ?? "x",
    ].join("|");
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        ...reminder,
        ids: [...reminder.ids],
        reminderIds: [...reminder.reminderIds],
        weekdays: [...reminder.weekdays].sort((a, b) => a - b),
      });
      continue;
    }

    existing.ids = [...new Set([...existing.ids, ...reminder.ids])];
    existing.reminderIds = [
      ...new Set([...existing.reminderIds, ...reminder.reminderIds]),
    ];
    existing.weekdays = [...new Set([...existing.weekdays, ...reminder.weekdays])].sort(
      (a, b) => a - b,
    );
  }

  return Array.from(grouped.values()).map((reminder): ScheduledPracticeReminder => ({
    ...reminder,
    repeats: resolveReminderRepeat(reminder),
  }));
}

function resolveReminderRepeat(
  reminder: ScheduledPracticeReminder,
): ScheduledPracticeReminder["repeats"] {
  if (reminder.repeats === "daily") {
    return "daily";
  }

  const weekdaysKey = reminder.weekdays.join(",");
  if (weekdaysKey === "2,3,4,5,6") {
    return "weekdays";
  }
  if (weekdaysKey === "1,7") {
    return "weekends";
  }
  if (reminder.weekdays.length > 0) {
    return "weekly";
  }

  return "unknown";
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
