import * as React from "react";
import styled from "styled-components";
import { sanitizeUrl } from "../../utils/urls";
import type { BaseIconProps } from ".";

type Props = BaseIconProps & {
  issueTypeIconUrl?: string;
};

export function JiraIssueStatusIcon({
  state,
  issueTypeIconUrl,
  className,
  size = 16,
}: Props) {
  if (issueTypeIconUrl) {
    const src = sanitizeUrl(issueTypeIconUrl);
    if (src) {
      return (
        <IssueTypeIcon
          src={src}
          alt=""
          className={className}
          width={size}
          height={size}
        />
      );
    }
  }

  return (
    <StatusDot
      className={className}
      $color={state.color}
      $size={size}
      aria-label={state.name}
    />
  );
}

const IssueTypeIcon = styled.img`
  flex-shrink: 0;
  object-fit: contain;
`;

const StatusDot = styled.span<{ $color: string; $size: number }>`
  display: inline-block;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 2px;
  background: ${(props) => props.$color};
  flex-shrink: 0;
`;
