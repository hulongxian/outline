import {
  NotificationChannelType,
  NotificationEventDefaults,
  NotificationEventType,
  type NotificationSettings,
} from "../types";

/** Notification events that can trigger an email from EmailsProcessor or dedicated email tasks. */
export const notificationEventsWithEmail = new Set<NotificationEventType>([
  NotificationEventType.PublishDocument,
  NotificationEventType.UpdateDocument,
  NotificationEventType.AddUserToDocument,
  NotificationEventType.AddUserToCollection,
  NotificationEventType.CreateCollection,
  NotificationEventType.CreateComment,
  NotificationEventType.ResolveComment,
  NotificationEventType.MentionedInDocument,
  NotificationEventType.MentionedInComment,
  NotificationEventType.GroupMentionedInDocument,
  NotificationEventType.GroupMentionedInComment,
  NotificationEventType.RequestDocumentAccess,
  NotificationEventType.ExportCompleted,
  NotificationEventType.InviteAccepted,
  NotificationEventType.Onboarding,
  NotificationEventType.Features,
]);

/**
 * Returns whether an event type supports email delivery in Outline.
 *
 * @param eventType - Notification event type.
 * @return True when email can be sent for this event.
 */
export function notificationEventSupportsEmail(
  eventType: NotificationEventType
): boolean {
  return notificationEventsWithEmail.has(eventType);
}

/**
 * Normalizes a stored notification preference to per-channel booleans.
 *
 * @param setting - Stored preference value.
 * @param defaultEnabled - Default when the event has no explicit setting.
 * @return Channel preferences for the event.
 */
export function normalizeNotificationChannels(
  setting: NotificationSettings[NotificationEventType],
  defaultEnabled: boolean
): Record<NotificationChannelType, boolean> {
  if (typeof setting === "boolean") {
    return {
      [NotificationChannelType.App]: setting,
      [NotificationChannelType.Email]: setting,
      [NotificationChannelType.Chat]: setting,
    };
  }

  if (setting && typeof setting === "object") {
    return {
      [NotificationChannelType.App]:
        setting[NotificationChannelType.App] ?? defaultEnabled,
      [NotificationChannelType.Email]:
        setting[NotificationChannelType.Email] ?? defaultEnabled,
      [NotificationChannelType.Chat]:
        setting[NotificationChannelType.Chat] ?? defaultEnabled,
    };
  }

  return {
    [NotificationChannelType.App]: defaultEnabled,
    [NotificationChannelType.Email]: defaultEnabled,
    [NotificationChannelType.Chat]: defaultEnabled,
  };
}

/**
 * Returns whether a notification channel is enabled for an event type.
 *
 * @param settings - User notification settings.
 * @param eventType - Notification event type.
 * @param channel - Delivery channel to check.
 * @return True when the channel is enabled.
 */
export function isNotificationChannelEnabled(
  settings: NotificationSettings,
  eventType: NotificationEventType,
  channel: NotificationChannelType
): boolean {
  const defaultEnabled = NotificationEventDefaults[eventType] ?? false;
  const channels = normalizeNotificationChannels(
    settings[eventType],
    defaultEnabled
  );

  return channels[channel];
}

/**
 * Returns whether any notification channel is enabled for an event type.
 *
 * @param settings - User notification settings.
 * @param eventType - Notification event type.
 * @return True when at least one channel is enabled.
 */
export function isAnyNotificationChannelEnabled(
  settings: NotificationSettings,
  eventType: NotificationEventType
): boolean {
  return (
    isNotificationChannelEnabled(
      settings,
      eventType,
      NotificationChannelType.App
    ) ||
    isNotificationChannelEnabled(
      settings,
      eventType,
      NotificationChannelType.Email
    ) ||
    isNotificationChannelEnabled(
      settings,
      eventType,
      NotificationChannelType.Chat
    )
  );
}

/**
 * Updates a single channel preference for an event type.
 *
 * @param settings - Existing notification settings.
 * @param eventType - Notification event type.
 * @param channel - Channel to update.
 * @param enabled - Whether the channel should be enabled.
 * @return Updated notification settings.
 */
export function setNotificationChannelEnabled(
  settings: NotificationSettings,
  eventType: NotificationEventType,
  channel: NotificationChannelType,
  enabled: boolean
): NotificationSettings {
  const defaultEnabled = NotificationEventDefaults[eventType] ?? false;
  const channels = normalizeNotificationChannels(
    settings[eventType],
    defaultEnabled
  );

  return {
    ...settings,
    [eventType]: {
      ...channels,
      [channel]: enabled,
    },
  };
}

/**
 * Sets all channels for an event type to the same value (legacy bulk API).
 *
 * @param settings - Existing notification settings.
 * @param eventType - Notification event type.
 * @param enabled - Whether all channels should be enabled.
 * @return Updated notification settings.
 */
export function setAllNotificationChannelsEnabled(
  settings: NotificationSettings,
  eventType: NotificationEventType,
  enabled: boolean
): NotificationSettings {
  return {
    ...settings,
    [eventType]: enabled,
  };
}
