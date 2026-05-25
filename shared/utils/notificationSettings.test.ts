import { describe, expect, it } from "vitest";
import {
  NotificationChannelType,
  NotificationEventType,
} from "../types";
import {
  isNotificationChannelEnabled,
  notificationEventSupportsEmail,
  setNotificationChannelEnabled,
} from "./notificationSettings";

describe("notificationSettings", () => {
  it("supports email for document update events", () => {
    expect(
      notificationEventSupportsEmail(NotificationEventType.UpdateDocument)
    ).toBe(true);
    expect(
      notificationEventSupportsEmail(NotificationEventType.ReactionsCreate)
    ).toBe(false);
  });

  it("reads legacy boolean settings for all channels", () => {
    const settings = {
      [NotificationEventType.UpdateDocument]: true,
    };

    expect(
      isNotificationChannelEnabled(
        settings,
        NotificationEventType.UpdateDocument,
        NotificationChannelType.App
      )
    ).toBe(true);
    expect(
      isNotificationChannelEnabled(
        settings,
        NotificationEventType.UpdateDocument,
        NotificationChannelType.Email
      )
    ).toBe(true);
  });

  it("updates a single channel without affecting others", () => {
    const settings = setNotificationChannelEnabled(
      { [NotificationEventType.CreateComment]: true },
      NotificationEventType.CreateComment,
      NotificationChannelType.Email,
      false
    );

    expect(
      isNotificationChannelEnabled(
        settings,
        NotificationEventType.CreateComment,
        NotificationChannelType.App
      )
    ).toBe(true);
    expect(
      isNotificationChannelEnabled(
        settings,
        NotificationEventType.CreateComment,
        NotificationChannelType.Email
      )
    ).toBe(false);
  });
});
