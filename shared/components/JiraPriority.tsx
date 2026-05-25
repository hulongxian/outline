import styled from "styled-components";
import Text from "./Text";
import { sanitizeUrl } from "../utils/urls";

type Props = {
  name: string;
  iconUrl?: string;
  size?: number;
};

/**
 * Displays a Jira priority with its icon and label.
 *
 * @param props - Priority display props.
 * @return Priority label element.
 */
export function JiraPriority({ name, iconUrl, size = 14 }: Props) {
  return (
    <Wrap>
      {iconUrl ? (
        <Icon
          src={sanitizeUrl(iconUrl)}
          alt=""
          width={size}
          height={size}
        />
      ) : null}
      <Text type="secondary" size="small">
        {name}
      </Text>
    </Wrap>
  );
}

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const Icon = styled.img`
  flex-shrink: 0;
`;
