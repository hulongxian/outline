import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { transparentize } from "polished";
import { Backticks } from "@shared/components/Backticks";
import { IssueStatusIcon } from "@shared/components/IssueStatusIcon";
import { JiraPriority } from "@shared/components/JiraPriority";
import { richExtensions } from "@shared/editor/nodes";
import type { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { IntegrationService } from "@shared/types";
import { getIssueTrackerServiceFromUrl } from "@shared/utils/issueTracker";
import { s } from "@shared/styles";
import { Avatar } from "~/components/Avatar";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import Text from "../Text";
import Time from "../Time";
import {
  Preview,
  Title,
  Description,
  Card,
  CardContent,
  Label,
  Info,
} from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Issue], "type">;

const HoverPreviewIssue = React.forwardRef(function HoverPreviewIssue_(
  {
    url,
    id,
    title,
    description,
    author,
    assignee,
    labels,
    state,
    createdAt,
    issueTypeIconUrl,
    priority,
    comments,
  }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  const { t } = useTranslation();
  const authorName = author.name;
  const service = getIssueTrackerServiceFromUrl(url);
  const isJira = service === IntegrationService.Jira;
  const hasScrollableBody =
    isJira && (!!description || (comments && comments.length > 0));

  const scrollBodyRef = React.useRef<HTMLDivElement>(null);

  const handleOpen = React.useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  const handleScrollableWheel = React.useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      const scrollEl = scrollBodyRef.current;

      if (!scrollEl || scrollEl.scrollHeight <= scrollEl.clientHeight) {
        return;
      }

      event.stopPropagation();

      const nextScrollTop = scrollEl.scrollTop + event.deltaY;
      const maxScrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;

      if (nextScrollTop >= 0 && nextScrollTop <= maxScrollTop) {
        event.preventDefault();
        scrollEl.scrollTop = nextScrollTop;
        return;
      }

      if (nextScrollTop < 0) {
        event.preventDefault();
        scrollEl.scrollTop = 0;
        return;
      }

      event.preventDefault();
      scrollEl.scrollTop = maxScrollTop;
    },
    []
  );

  const handleScrollableScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      event.stopPropagation();
    },
    []
  );

  const previewProps = hasScrollableBody
    ? {
        as: "div" as const,
        role: "link" as const,
        tabIndex: 0,
        onClick: handleOpen,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter") {
            handleOpen();
          }
        },
      }
    : {
        as: "a" as const,
        href: url,
        target: "_blank" as const,
        rel: "noopener noreferrer" as const,
      };

  return (
    <Preview {...previewProps}>
      <Flex
        column
        ref={ref}
        onWheel={hasScrollableBody ? handleScrollableWheel : undefined}
      >
        <Card fadeOut={false}>
          <CardContent $scrollable={hasScrollableBody}>
            <Flex gap={8} column>
              <Title>
                <StyledIssueStatusIcon
                  service={service}
                  state={state}
                  size={18}
                  issueTypeIconUrl={issueTypeIconUrl}
                />
                <TitleBlock>
                  <IssueTitle>
                    <Backticks content={title} />
                  </IssueTitle>
                  <IssueKey type="tertiary">{id}</IssueKey>
                </TitleBlock>
              </Title>

              <MetaRow align="center" gap={8} wrap>
                <Flex align="center" gap={6}>
                  <Avatar
                    src={
                      isJira && assignee
                        ? assignee.avatarUrl
                        : author.avatarUrl
                    }
                    size={18}
                  />
                  <Info>
                    {isJira && assignee ? (
                      <Trans>
                        Assigned to {{ assigneeName: assignee.name }}
                      </Trans>
                    ) : (
                      <Trans>
                        {{ authorName }} created{" "}
                        <Time dateTime={createdAt} addSuffix />
                      </Trans>
                    )}
                  </Info>
                </Flex>
                {isJira && priority ? (
                  <JiraPriority
                    name={priority.name}
                    iconUrl={priority.iconUrl}
                  />
                ) : null}
                {isJira ? (
                  <JiraStatusPill $color={state.color}>
                    {state.name}
                  </JiraStatusPill>
                ) : null}
              </MetaRow>

              {hasScrollableBody ? (
                <ScrollableBody
                  ref={scrollBodyRef}
                  onScroll={handleScrollableScroll}
                  onWheel={(event) => event.stopPropagation()}
                >
                  {description ? (
                    <Section>
                      <SectionDivider label={t("Description")} />
                      <BodyText>{description}</BodyText>
                    </Section>
                  ) : null}

                  {comments && comments.length > 0 ? (
                    <Section>
                      <SectionDivider label={t("Comments")} />
                      <Flex column gap={12}>
                        {comments.map((comment) => (
                          <CommentBlock key={comment.id}>
                            <Flex align="center" gap={6}>
                              <Avatar src={comment.author.avatarUrl} size={16} />
                              <CommentMeta>
                                <Text size="xsmall" weight="medium">
                                  {comment.author.name}
                                </Text>
                                <Text size="xsmall" type="tertiary">
                                  <Time dateTime={comment.createdAt} addSuffix />
                                </Text>
                              </CommentMeta>
                            </Flex>
                            <BodyText>{comment.body}</BodyText>
                          </CommentBlock>
                        ))}
                      </Flex>
                    </Section>
                  ) : null}
                </ScrollableBody>
              ) : (
                description && (
                  <Description as="div">
                    <React.Suspense fallback={<div />}>
                      <Editor
                        extensions={richExtensions}
                        defaultValue={description}
                        embedsDisabled
                        readOnly
                      />
                    </React.Suspense>
                  </Description>
                )
              )}

              {labels.length > 0 && (
                <Flex wrap gap={6}>
                  {labels.map((label, index) => (
                    <Label key={index} color={label.color}>
                      {label.name}
                    </Label>
                  ))}
                </Flex>
              )}
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </Preview>
  );
});

function SectionDivider({ label }: { label: string }) {
  return (
    <DividerRow>
      <DividerLine />
      <DividerLabel size="xsmall" type="secondary">
        {label}
      </DividerLabel>
    </DividerRow>
  );
}

const StyledIssueStatusIcon = styled(IssueStatusIcon)`
  flex-shrink: 0;
  margin-top: 2px;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const IssueTitle = styled(Text).attrs({ as: "span", size: "large" })`
  line-height: 1.35;
`;

const IssueKey = styled(Text).attrs({ as: "span", size: "small" })``;

const ScrollableBody = styled.div`
  max-height: 240px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-right: 4px;
  margin-right: -4px;
  pointer-events: auto;
  touch-action: pan-y;
  cursor: default;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${(props) => transparentize(0.85, props.theme.divider)};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => transparentize(0.35, props.theme.textTertiary)};
    border-radius: 4px;
    min-height: 32px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${(props) => transparentize(0.2, props.theme.textTertiary)};
  }
`;

const Section = styled.div`
  &:not(:first-child) {
    margin-top: 4px;
  }
`;

const DividerRow = styled.div`
  position: relative;
  margin: 14px 0 10px;
`;

const DividerLine = styled.div`
  border-top: 1px solid ${(props) => transparentize(0.5, props.theme.divider)};
`;

const DividerLabel = styled(Text)`
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(-50%);
  padding-right: 8px;
  background: ${s("menuBackground")};
`;

const BodyText = styled(Text).attrs({ as: "p", type: "secondary", size: "small" })`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
`;

const CommentBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CommentMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
`;

const MetaRow = styled(Flex)`
  row-gap: 6px;
`;

const JiraStatusPill = styled.span<{ $color: string }>`
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: ${(props) => props.$color};
  background: ${(props) => props.$color}22;
  border: 1px solid ${(props) => props.$color}88;
`;

export default HoverPreviewIssue;
