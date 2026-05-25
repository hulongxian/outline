import { debounce } from "es-toolkit/compat";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  CheckboxIcon,
  CollectionIcon,
  CommentIcon,
  DocumentIcon,
  DoneIcon,
  EditIcon,
  EmailIcon,
  PublishIcon,
  SmileyIcon,
  StarredIcon,
  UserIcon,
  GroupIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import {
  NotificationChannelType,
  NotificationEventType,
} from "@shared/types";
import { notificationEventSupportsEmail } from "@shared/utils/notificationSettings";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import { client } from "~/utils/ApiClient";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

type NotificationOption = {
  event: NotificationEventType;
  icon: React.ReactNode;
  title: string;
  description: string;
  visible?: boolean;
  appOnly?: boolean;
  emailOnly?: boolean;
};

function Notifications() {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const emailEnabled = env.EMAIL_ENABLED;

  const options: NotificationOption[] = [
    {
      event: NotificationEventType.PublishDocument,
      icon: <PublishIcon />,
      title: t("Document published"),
      description: t(
        "Receive a notification whenever a new document is published"
      ),
    },
    {
      event: NotificationEventType.UpdateDocument,
      icon: <EditIcon />,
      title: t("Document updated"),
      description: t(
        "Receive a notification when a document you are subscribed to is edited"
      ),
    },
    {
      event: NotificationEventType.CreateComment,
      icon: <CommentIcon />,
      title: t("Comment posted"),
      description: t(
        "Receive a notification when a document you are subscribed to or a thread you participated in receives a comment"
      ),
    },
    {
      event: NotificationEventType.MentionedInComment,
      icon: <EmailIcon />,
      title: t("Mentioned"),
      description: t(
        "Receive a notification when someone mentions you in a document or comment"
      ),
    },
    {
      event: NotificationEventType.GroupMentionedInDocument,
      icon: <GroupIcon />,
      title: t("Group mentions"),
      description: t(
        "Receive a notification when someone mentions a group you are a member of in a document or comment"
      ),
    },
    {
      event: NotificationEventType.ResolveComment,
      icon: <DoneIcon />,
      title: t("Resolved"),
      description: t(
        "Receive a notification when a comment thread you were involved in is resolved"
      ),
    },
    {
      event: NotificationEventType.ReactionsCreate,
      icon: <SmileyIcon />,
      title: t("Reaction added"),
      description: t(
        "Receive a notification when someone reacts to your comment"
      ),
      appOnly: true,
    },
    {
      event: NotificationEventType.CreateCollection,
      icon: <CollectionIcon />,
      title: t("Collection created"),
      description: t(
        "Receive a notification whenever a new collection is created"
      ),
    },
    {
      event: NotificationEventType.InviteAccepted,
      icon: <UserIcon />,
      title: t("Invite accepted"),
      description: t(
        "Receive a notification when someone you invited creates an account"
      ),
      emailOnly: true,
    },
    {
      event: NotificationEventType.AddUserToDocument,
      icon: <DocumentIcon />,
      title: t("Invited to document"),
      description: t(
        "Receive a notification when a document is shared with you"
      ),
    },
    {
      event: NotificationEventType.AddUserToCollection,
      icon: <CollectionIcon />,
      title: t("Invited to collection"),
      description: t(
        "Receive a notification when you are given access to a collection"
      ),
    },
    {
      event: NotificationEventType.ExportCompleted,
      icon: <CheckboxIcon checked />,
      title: t("Export completed"),
      description: t(
        "Receive a notification when an export you requested has been completed"
      ),
    },
    {
      event: NotificationEventType.RequestDocumentAccess,
      icon: <CheckboxIcon checked />,
      title: t("Document access requested"),
      description: t(
        "Receive a notification when a user requests access to a document you manage"
      ),
    },
    {
      visible: isCloudHosted,
      icon: <AcademicCapIcon />,
      event: NotificationEventType.Onboarding,
      title: t("Getting started"),
      description: t("Tips on getting started with features and functionality"),
      emailOnly: true,
    },
    {
      visible: isCloudHosted,
      icon: <StarredIcon />,
      event: NotificationEventType.Features,
      title: t("New features"),
      description: t("Receive an email when new features of note are added"),
      emailOnly: true,
    },
  ];

  const visibleOptions = options.filter((o) => o.visible !== false);

  const showSuccessMessage = debounce(() => {
    toast.success(t("Notifications saved"));
  }, 500);

  const handleChange = React.useCallback(
    (eventType: NotificationEventType, channel: NotificationChannelType) =>
      async (checked: boolean) => {
        await user.setNotificationEventType(eventType, checked, channel);
        showSuccessMessage();
      },
    [user, showSuccessMessage]
  );

  const handleToggleAll = React.useCallback(
    async (checked: boolean) => {
      runInAction(() => {
        const updated = { ...user.notificationSettings };
        for (const option of visibleOptions) {
          updated[option.event] = checked;
        }
        user.notificationSettings = updated;
      });
      await client.post(
        checked
          ? `/users.notificationsSubscribe`
          : `/users.notificationsUnsubscribe`
      );
      showSuccessMessage();
    },
    [user, visibleOptions, showSuccessMessage]
  );

  const allEnabled = visibleOptions.every((o) =>
    user.subscribedToEventType(o.event)
  );

  const showSuccessNotice = window.location.search === "?success";

  const renderChannelSwitches = (option: NotificationOption) => {
    const supportsEmail =
      emailEnabled &&
      !option.appOnly &&
      notificationEventSupportsEmail(option.event);
    const showApp = !option.emailOnly;
    const showEmail = supportsEmail || (option.emailOnly && emailEnabled);

    if (!emailEnabled) {
      return (
        <Switch
          id={option.event}
          name={option.event}
          checked={user.subscribedToEventType(
            option.event,
            NotificationChannelType.App
          )}
          onChange={handleChange(option.event, NotificationChannelType.App)}
        />
      );
    }

    return (
      <ChannelGrid>
        <ChannelCell>
          {showApp ? (
            <Switch
              id={`${option.event}-app`}
              name={`${option.event}-app`}
              checked={user.subscribedToEventType(
                option.event,
                NotificationChannelType.App
              )}
              onChange={handleChange(
                option.event,
                NotificationChannelType.App
              )}
              aria-label={`${option.title} ${t("In-app")}`}
            />
          ) : null}
        </ChannelCell>
        <ChannelCell>
          {showEmail ? (
            <Switch
              id={`${option.event}-email`}
              name={`${option.event}-email`}
              checked={user.subscribedToEventType(
                option.event,
                NotificationChannelType.Email
              )}
              onChange={handleChange(
                option.event,
                NotificationChannelType.Email
              )}
              aria-label={`${option.title} ${t("Email")}`}
            />
          ) : null}
        </ChannelCell>
      </ChannelGrid>
    );
  };

  return (
    <Scene title={t("Notifications")} icon={<EmailIcon />}>
      <Heading>{t("Notifications")}</Heading>

      {showSuccessNotice && (
        <Notice>
          <Trans>
            Unsubscription successful. Your notification settings were updated
          </Trans>
        </Notice>
      )}
      <Text as="p" type="secondary">
        <Trans>
          Choose which events send in-app notifications and email when SMTP is
          configured.
        </Trans>
      </Text>

      {!emailEnabled && (
        <Notice>
          <Trans>
            Email delivery is disabled on this server. Configure SMTP to enable
            email notifications.
          </Trans>
        </Notice>
      )}

      {emailEnabled && (
        <SettingRow
          name="channelHeaders"
          label={
            <VisuallyHidden.Root>
              {t("Notification channels")}
            </VisuallyHidden.Root>
          }
          compact
          border={false}
        >
          <ChannelGrid>
            <ChannelHeader>{t("In-app")}</ChannelHeader>
            <ChannelHeader>{t("Email")}</ChannelHeader>
          </ChannelGrid>
        </SettingRow>
      )}

      <SettingRow
        name="allNotifications"
        label={t("All notifications")}
        compact
        border={false}
      >
        {emailEnabled ? (
          <ChannelGrid>
            <AllNotificationsCell>
              <Switch
                id="allNotifications"
                checked={allEnabled}
                onChange={handleToggleAll}
                aria-label={t("All notifications")}
              />
            </AllNotificationsCell>
          </ChannelGrid>
        ) : (
          <Switch
            id="allNotifications"
            checked={allEnabled}
            onChange={handleToggleAll}
          />
        )}
      </SettingRow>

      {options.map((option) => (
        <SettingRow
          key={option.event}
          visible={option.visible}
          label={option.title}
          name={option.event}
          description={
            <Text size="small" type="secondary">
              {option.description}
            </Text>
          }
          compact
        >
          {renderChannelSwitches(option)}
        </SettingRow>
      ))}
    </Scene>
  );
}

const CHANNEL_COLUMN_WIDTH = 52;

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, ${CHANNEL_COLUMN_WIDTH}px);
  column-gap: 24px;
  justify-items: center;
  width: fit-content;
  margin-left: auto;
`;

const ChannelCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${CHANNEL_COLUMN_WIDTH}px;
  min-height: 24px;
`;

const ChannelHeader = styled(Text).attrs({
  size: "small",
  type: "secondary",
})`
  text-align: center;
`;

const AllNotificationsCell = styled(ChannelCell)`
  grid-column: 1 / -1;
`;

export default observer(Notifications);
